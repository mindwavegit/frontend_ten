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
      },
    });

    // google.maps.event.addListener(newDrawingManager, 'circlecomplete', (circle: google.maps.Circle) => {
    //     circlesRef.current.push(circle);
    //     // No setCircles here, so no re-render triggered
    // });

    google.maps.event.addListener(
      newDrawingManager,
      "circlecomplete",
      (circle: google.maps.Circle) => {
        const center = circle.getCenter();
        const geocoder = new google.maps.Geocoder();

        if (center) {
          geocoder.geocode({ location: center }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              const address = results[0].formatted_address;
              // Attach a customName property to the circle
              (circle as any).customName = address;
            } else {
              (circle as any).customName = "Unknown Location";
            }
            // Add circle after geocoding completes
            circlesRef.current.push(circle);
          });
        } else {
          (circle as any).customName = "Unknown Location";
          circlesRef.current.push(circle);
        }
      }
    );

    google.maps.event.addListener(
      newDrawingManager,
      "polygoncomplete",
      (polygon: google.maps.Polygon) => {
        const path = polygon.getPath();
        const geocoder = new google.maps.Geocoder();
        debugger;

        if (path && path.getLength() > 0) {
          // Get the center point of the polygon by averaging all vertices
          let latSum = 0;
          let lngSum = 0;
          const pathLength = path.getLength();

          for (let i = 0; i < pathLength; i++) {
            const vertex = path.getAt(i);
            console.log(
              `l${i + 1} : lat : ${vertex.lat()} lng : ${vertex.lng()}`
            );

            latSum += vertex.lat();
            lngSum += vertex.lng();
          }

          const centerLat = latSum / pathLength;
          const centerLng = lngSum / pathLength;
          const center = new google.maps.LatLng(centerLat, centerLng);

          geocoder.geocode({ location: center }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              const address = results[0].formatted_address;
              // Attach a customName property to the polygon
              (polygon as any).customName = address;
            } else {
              (polygon as any).customName = "Unknown Location";
            }
            // Add polygon after geocoding completes
            polygonRef.current.push(polygon);
          });
        } else {
          (polygon as any).customName = "Unknown Location";
          polygonRef.current.push(polygon);
        }
      }
    );

    setDrawingManager(newDrawingManager);

    return () => {
      newDrawingManager.setMap(null);
    };
  }, [drawing, map]);

  return { drawingManager, circlesRef, polygonRef };
}
