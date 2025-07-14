import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import toast from "react-hot-toast";

// Warehouse polygon coordinates
const WAREHOUSE_COORDINATES = [
  { lat: 42.49592559039506, lng: -83.18349727702586 },
  { lat: 42.49649073892419, lng: -83.16593192748287 },
  { lat: 42.48937891438472, lng: -83.15922515765739 },
  { lat: 42.48895500526641, lng: -83.17468266525519 },
  { lat: 42.49211070423443, lng: -83.17474653925353 },
  { lat: 42.491922308764934, lng: -83.18349727702586 },
];

type WarehouseTruck = {
  id: string;
  position: { lat: number; lng: number };
  isMoving: boolean;
  isOutside: boolean;
  targetPosition?: { lat: number; lng: number };
};

const WarehouseContent = () => {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const [warehouseTrucks, setWarehouseTrucks] = useState<WarehouseTruck[]>([]);
  const alertedTrucksRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Function to check if a point is inside the warehouse polygon
  const isPointInPolygon = (point: { lat: number; lng: number }) => {
    const x = point.lng;
    const y = point.lat;
    let inside = false;

    for (
      let i = 0, j = WAREHOUSE_COORDINATES.length - 1;
      i < WAREHOUSE_COORDINATES.length;
      j = i++
    ) {
      const xi = WAREHOUSE_COORDINATES[i].lng;
      const yi = WAREHOUSE_COORDINATES[i].lat;
      const xj = WAREHOUSE_COORDINATES[j].lng;
      const yj = WAREHOUSE_COORDINATES[j].lat;

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  };

  // Animation function for smooth truck movement
  const animateTruckMovement = useCallback(() => {
    setWarehouseTrucks((prevTrucks) => {
      let hasMovingTrucks = false;

      const updatedTrucks = prevTrucks.map((truck) => {
        if (truck.isMoving && truck.targetPosition) {
          hasMovingTrucks = true;
          const currentLat = truck.position.lat;
          const currentLng = truck.position.lng;
          const targetLat = truck.targetPosition.lat;
          const targetLng = truck.targetPosition.lng;

          // Calculate distance remaining
          const latDiff = targetLat - currentLat;
          const lngDiff = targetLng - currentLng;
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

          // If very close to target, snap to target and stop animation
          if (distance < 0.0001) {
            return {
              ...truck,
              position: truck.targetPosition,
              isMoving: false,
              isOutside: true,
              targetPosition: undefined,
            };
          }

          // Move towards target (adjust speed by changing the multiplier)
          const speed = 0.005; // Very slow movement for clearly visible animation
          const newLat = currentLat + latDiff * speed;
          const newLng = currentLng + lngDiff * speed;
          const newPosition = { lat: newLat, lng: newLng };

          // Check if truck just left the warehouse
          const wasInside = isPointInPolygon(truck.position);
          const nowOutside = !isPointInPolygon(newPosition);

          // If truck just crossed the boundary, show immediate notification
          if (
            wasInside &&
            nowOutside &&
            !alertedTrucksRef.current.has(truck.id)
          ) {
            toast.error(`⚠️ Alert: ${truck.id} has left the warehouse area!`, {
              duration: 5000,
              position: "top-right",
            });
            alertedTrucksRef.current.add(truck.id);
          }

          return {
            ...truck,
            position: newPosition,
            isOutside: nowOutside,
          };
        }
        return truck;
      });

      // Continue animation if there are still moving trucks
      if (hasMovingTrucks) {
        animationFrameRef.current = requestAnimationFrame(animateTruckMovement);
      }

      return updatedTrucks;
    });
  }, []);

  // Generate trucks positioned in a single line, moved 15 units up
  const generateTrucksInPolygon = useMemo(() => {
    const trucks: WarehouseTruck[] = [];

    // Center point of warehouse moved 15 units up (north)
    const centerLat = 42.49211070423443 + 0.0015; // Move 15 units up in latitude
    const centerLng = -83.17474653925353;

    // Generate trucks in a single horizontal line
    const totalTrucks = 15;
    const spacing = 0.0003; // Spacing between trucks in the line

    for (let i = 0; i < totalTrucks; i++) {
      const position = {
        lat: centerLat, // Same latitude for all trucks (single line)
        lng: centerLng + (i - totalTrucks / 2) * spacing, // Spread horizontally
      };

      trucks.push({
        id: `warehouse-truck-${i + 1}`,
        position,
        isMoving: false,
        isOutside: false,
      });
    }

    return trucks;
  }, []);

  // Create warehouse polygon on map
  useEffect(() => {
    if (!map) return;

    // Create polygon with default styling
    const polygon = new google.maps.Polygon({
      paths: WAREHOUSE_COORDINATES,
      editable: false,
      draggable: false,
    });

    polygon.setMap(map);
    polygonRef.current = polygon;

    // Center map on polygon
    const bounds = new google.maps.LatLngBounds();
    WAREHOUSE_COORDINATES.forEach((coord) => {
      bounds.extend(coord);
    });
    map.fitBounds(bounds);

    // Initialize trucks
    setWarehouseTrucks(generateTrucksInPolygon);

    return () => {
      polygon.setMap(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [map, generateTrucksInPolygon]);

  // After 10 seconds, start moving one truck out of the warehouse
  useEffect(() => {
    const timer = setTimeout(() => {
      setWarehouseTrucks((prevTrucks) => {
        // Find the first stationary truck to move
        const truckToMove = prevTrucks.find((truck) => !truck.isMoving);
        if (!truckToMove) return prevTrucks;

        // Show toast notification
        toast.success(
          `🚛 Truck ${truckToMove.id} is leaving the warehouse area!`,
          {
            duration: 4000,
            position: "top-right",
          }
        );

        const updatedTrucks = prevTrucks.map((truck) => {
          if (truck.id === truckToMove.id) {
            // Set target position outside the warehouse area
            const exitPosition = {
              lat: 42.488, // Outside the warehouse polygon
              lng: -83.155,
            };

            return {
              ...truck,
              isMoving: true,
              targetPosition: exitPosition,
            };
          }
          return truck;
        });

        // Start the animation
        setTimeout(() => {
          animationFrameRef.current =
            requestAnimationFrame(animateTruckMovement);
        }, 100);

        return updatedTrucks;
      });
    }, 1000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  const renderTruckMarker = (truck: WarehouseTruck) => (
    <AdvancedMarker
      key={truck.id}
      position={truck.position}
      title={`${truck.id} - ${truck.isMoving ? "Moving" : "Stationary"} - ${
        truck.isOutside ? "Outside" : "Inside"
      } warehouse`}
    >
      <div
        className="custom-pin"
        style={{
          transform: "rotate(0deg)", // No rotation for stationary trucks
          transition: "transform 0.2s ease-in-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          position: "relative",
          top: 15,
          border: `3px solid ${
            truck.isMoving
              ? truck.isOutside
                ? "#FF0000" // Red border for outside
                : "#FFA500" // Orange border for moving inside
              : "#00FF00" // Green border for stationary
          }`,
          borderRadius: "50%",
          backgroundColor: "white",
        }}
      >
        <img
          width="32"
          src="/box-truck.png"
          alt="truck"
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        />
      </div>
    </AdvancedMarker>
  );

  return <>{warehouseTrucks.map(renderTruckMarker)}</>;
};

export default WarehouseContent;
