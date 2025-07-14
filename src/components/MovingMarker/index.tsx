import React, { useEffect, useState, useRef } from "react";
import { AdvancedMarker, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import { storeTruckMetrics } from "../../features/trucks/truckSlice";

type MovingMarkerProps = {
  name: string;
  onPositionUpdate: (
    name: string,
    position: { lat: number; lng: number }
  ) => void;
};

const MovingMarker = ({ name, onPositionUpdate }: MovingMarkerProps) => {
  const dispatch = useDispatch();

  const geometryLibrary = useMapsLibrary("geometry");
  const routePoints = useSelector((state: RootState) => state.route.routes);

  const markerPoints = routePoints?.[name];

  const [position, setPosition] = useState<google.maps.LatLngLiteral>({
    lat: 0,
    lng: 0,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [rotation, setRotation] = useState(0); // For truck direction
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setPosition({
      lat: markerPoints?.[0]?.lat || 0,
      lng: markerPoints?.[0]?.lng || 0,
    });
    startAnimation();
  }, [markerPoints]);

  // Calculate heading using Google Maps geometry library
  const getHeading = (
    point1: google.maps.LatLngLiteral,
    point2: google.maps.LatLngLiteral
  ) => {
    if (!geometryLibrary) return 0;

    const heading = geometryLibrary.spherical.computeHeading(
      new google.maps.LatLng(point1.lat, point1.lng),
      new google.maps.LatLng(point2.lat, point2.lng)
    );
    return heading;
  };

  // Start animation with proper coordinate validation and heading calculation
  const startAnimation = () => {
    if (!markerPoints || markerPoints.length === 0) {
      console.warn("No path coordinates available");
      return;
    }

    if (!geometryLibrary) {
      console.warn("Geometry library not loaded yet");
      return;
    }

    // Validate coordinates
    const validCoordinates = markerPoints.filter(
      (coord) =>
        coord &&
        typeof coord.lat === "number" &&
        typeof coord.lng === "number" &&
        !isNaN(coord.lat) &&
        !isNaN(coord.lng)
    );

    if (validCoordinates.length === 0) {
      console.warn("No valid coordinates found");
      return;
    }

    // console.log(
    //   `Starting animation with ${validCoordinates.length} coordinates`
    // );
    setIsAnimating(true);
    setCurrentIndex(0);

    // Set initial position
    setPosition({
      lat: validCoordinates[0].lat,
      lng: validCoordinates[0].lng,
    });

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;

        // Check if we've reached the end
        if (nextIndex >= validCoordinates.length) {
          setIsAnimating(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return prevIndex; // Stay at last position
        }

        const currentCoord = validCoordinates[prevIndex];
        const nextCoord = validCoordinates[nextIndex];

        // Calculate heading for truck direction using Google Maps geometry
        if (currentCoord && nextCoord && geometryLibrary) {
          const heading = getHeading(currentCoord, nextCoord);
          setRotation(heading);
        }

        // Update position to next coordinate
        const newPosition = { lat: nextCoord.lat, lng: nextCoord.lng };

        setPosition(newPosition);
        onPositionUpdate(name, newPosition);

        return nextIndex;
      });
    }, 60); // 200ms interval
  };

  // Stop animation
  const stopAnimation = () => {
    setIsAnimating(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Reset to start
  const resetAnimation = () => {
    stopAnimation();
    setCurrentIndex(0);
    setRotation(0);
    if (markerPoints && markerPoints.length > 0) {
      setPosition({
        lat: markerPoints[0].lat,
        lng: markerPoints[0].lng,
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const renderCustomPin = () => {
    return (
      <div
        className="custom-pin"
        style={{
          transform: `rotate(${rotation - 135}deg)`,
          transition: "transform 0.2s ease-in-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          position: "relative",
          top: 15,
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
    );
  };

  return (
    <>
      <AdvancedMarker
        position={position}
        title={`Moving truck - Step ${currentIndex + 1} of ${
          markerPoints?.length || 0
        }`}
        onMouseEnter={(e) => {
          dispatch(
            storeTruckMetrics({
              routeName: name,
              truckState: { isHovered: true },
            })
          );
        }}
        onMouseLeave={(e) => {
          dispatch(
            storeTruckMetrics({
              routeName: name,
              truckState: { isHovered: false },
            })
          );
        }}
      >
        {renderCustomPin()}
      </AdvancedMarker>

      {/* Control buttons */}

      {/* Progress and debug info */}
      {/* <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "8px 16px",
          borderRadius: "20px",
          fontSize: "12px",
          textAlign: "center",
        }}
      >
        <div>
          Progress: {currentIndex + 1} / {pathCoordinates?.length || 0}
        </div>
        <div>
          Current: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </div>
        <div>Rotation: {rotation.toFixed(1)}°</div>
      </div> */}
    </>
  );
};

export default MovingMarker;
