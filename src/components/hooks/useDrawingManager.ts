import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";

export function useDrawingManager(
  initialValue: google.maps.drawing.DrawingManager | null = null
) {
  const map = useMap();
  const drawing = useMapsLibrary("drawing");

  const [drawingManager, setDrawingManager] =
    useState<google.maps.drawing.DrawingManager | null>(initialValue);

  // Use a ref instead of state to store circles, avoid re-render
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const polygonRef = useRef<google.maps.Polygon[]>([]);

  // Helper function to geocode and update circle name
  const updateCircleName = (circle: google.maps.Circle) => {
    const center = circle.getCenter();
    const geocoder = new google.maps.Geocoder();

    if (center) {
      geocoder.geocode({ location: center }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const address = results[0].formatted_address;
          (circle as any).customName = address;
        } else {
          (circle as any).customName = "Unknown Location";
        }
      });
    } else {
      (circle as any).customName = "Unknown Location";
    }
  };

  // Helper function to geocode and update polygon name
  const updatePolygonName = (polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const geocoder = new google.maps.Geocoder();

    if (path && path.getLength() > 0) {
      // Get the center point of the polygon by averaging all vertices
      let latSum = 0;
      let lngSum = 0;
      const pathLength = path.getLength();

      for (let i = 0; i < pathLength; i++) {
        const vertex = path.getAt(i);
        latSum += vertex.lat();
        lngSum += vertex.lng();
      }

      const centerLat = latSum / pathLength;
      const centerLng = lngSum / pathLength;
      const center = new google.maps.LatLng(centerLat, centerLng);

      geocoder.geocode({ location: center }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const address = results[0].formatted_address;
          (polygon as any).customName = address;
        } else {
          (polygon as any).customName = "Unknown Location";
        }
      });
    } else {
      (polygon as any).customName = "Unknown Location";
    }
  };

  useEffect(() => {
    if (!map || !drawing) return;

    const newDrawingManager = new drawing.DrawingManager({
      map,
      drawingMode: google.maps.drawing.OverlayType.CIRCLE,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [
          google.maps.drawing.OverlayType.CIRCLE,
          google.maps.drawing.OverlayType.POLYGON,
        ],
      },
      markerOptions: {
        draggable: true,
      },
      circleOptions: {
        editable: true,
        draggable: true,
      },
      polygonOptions: {
        editable: true,
        draggable: true,
      },
    });

    google.maps.event.addListener(
      newDrawingManager,
      "circlecomplete",
      (circle: google.maps.Circle) => {
        // Initial geocoding for the circle
        updateCircleName(circle);
        circlesRef.current.push(circle);

        // Listen for center changes (when circle is dragged)
        google.maps.event.addListener(circle, "center_changed", () => {
          updateCircleName(circle);
        });

        // Listen for radius changes
        google.maps.event.addListener(circle, "radius_changed", () => {
          updateCircleName(circle);
        });
      }
    );

    google.maps.event.addListener(
      newDrawingManager,
      "polygoncomplete",
      (polygon: google.maps.Polygon) => {
        // Initial geocoding for the polygon
        updatePolygonName(polygon);
        polygonRef.current.push(polygon);

        // Listen for path changes (when polygon is edited)
        const path = polygon.getPath();
        if (path) {
          google.maps.event.addListener(path, "set_at", () => {
            updatePolygonName(polygon);
          });

          google.maps.event.addListener(path, "insert_at", () => {
            updatePolygonName(polygon);
          });

          google.maps.event.addListener(path, "remove_at", () => {
            updatePolygonName(polygon);
          });
        }

        // Listen for polygon drag events
        google.maps.event.addListener(polygon, "dragend", () => {
          updatePolygonName(polygon);
        });
      }
    );

    setDrawingManager(newDrawingManager);

    return () => {
      newDrawingManager.setMap(null);
    };
  }, [drawing, map]);

  return { drawingManager, circlesRef, polygonRef };
}
