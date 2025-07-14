import { ControlPosition, MapControl } from "@vis.gl/react-google-maps";
import Route from "../Route";
import { RoutesApi } from "../../helpers/routes-api";
import { useDrawingManager } from "../hooks/useDrawingManager";
import MovingMarker from "../MovingMarker";
import { UndoRedoControl } from "../UndoRedoControl";
import { useRef } from "react";
import toast from "react-hot-toast";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MyMapContent = () => {
  const apiClient = new RoutesApi(API_KEY);

  const enteredTrackerRef = useRef<Map<string, Set<string>>>(new window.Map());

  const { drawingManager, circlesRef, polygonRef } = useDrawingManager();
  console.log("polygonref", polygonRef);

  const circles = circlesRef.current;
  const polygons = polygonRef.current;

  const routeList: Array<{
    name: string;
    origin: { lat: number; lng: number; id: number };
    destination: { lat: number; lng: number; id: number };
  }> = [
    {
      name: "LA-NY",
      origin: { lng: -118.2437, lat: 34.0522, id: 1 }, // Los Angeles
      destination: { lng: -74.006, lat: 40.7128, id: 2 }, // New York City
    },
    {
      name: "CH-NY",
      origin: { lng: -87.6298, lat: 41.8781, id: 3 }, // Chicago
      destination: { lng: -74.006, lat: 40.7128, id: 4 }, // New York City
    },
    {
      name: "HU-NY",
      origin: { lng: -95.3698, lat: 29.7604, id: 5 }, // Houston
      destination: { lng: -74.006, lat: 40.7128, id: 6 }, // New York City
    },
  ];

  // timestamp for tomorrow at 3pm UTC
  const timestamp = Math.ceil(Date.now() / 86_400_000) * 86_400_000 + 900_000;
  const departureTime = new Date(timestamp).toISOString();

  const appearance = {
    walkingPolylineColor: "#000",
    defaultPolylineColor: "#4285F4",
    stepMarkerFillColor: "#333333",
    stepMarkerBorderColor: "#000000",
  };

  // for all options, see https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes#request-body
  const routeOptions = {
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
    },
    units: "METRIC",
    departureTime,
  };

  const checkIfInsideCircle = (truckName: string, lat: number, lng: number) => {
    for (const circle of circles) {
      const center = circle.getCenter();
      const radius = circle.getRadius();
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(lat, lng),
        center
      );

      const circleId = center?.toUrlValue();

      const truckCircles =
        enteredTrackerRef.current.get(truckName) ?? new Set();

      if (distance <= radius && !truckCircles.has(circleId)) {
        toast.success(
          `Truck "${truckName}" has entered a ${circle?.customName}!`
        );
        // Update the tracker directly in the ref
        const updatedSet = new Set(truckCircles);
        updatedSet.add(circleId);
        enteredTrackerRef.current.set(truckName, updatedSet);

        break; // Only alert for one circle at a time
      }
    }
  };

  const checkIfInsidePolygon = (
    truckName: string,
    lat: number,
    lng: number
  ) => {
    for (const polygon of polygons) {
      const path = polygon.getPath();
      const truckLatLng = new google.maps.LatLng(lat, lng);

      // Check if point is inside polygon using containsLocation
      const isInside = google.maps.geometry.poly.containsLocation(
        truckLatLng,
        polygon
      );

      // Create a unique ID for the polygon (using first vertex as identifier)
      const firstVertex = path?.getAt(0);
      const polygonId = firstVertex?.toUrlValue();

      const truckPolygons =
        enteredTrackerRef.current.get(truckName) ?? new Set();

      if (isInside && !truckPolygons.has(polygonId)) {
        toast.success(
          `Truck "${truckName}" has entered polygon area ${
            (polygon as any)?.customName
          }!`
        );
        // Update the tracker directly in the ref
        const updatedSet = new Set(truckPolygons);
        updatedSet.add(polygonId);
        enteredTrackerRef.current.set(truckName, updatedSet);

        break; // Only alert for one polygon at a time
      }
    }
  };

  const handleTruckPositionUpdate = (
    truckName: string,
    position: { lat: number; lng: number }
  ) => {
    if (circles?.length > 0) {
      checkIfInsideCircle(truckName, position.lat, position.lng);
    }

    if (polygons?.length > 0) {
      checkIfInsidePolygon(truckName, position.lat, position.lng);
    }
  };

  return (
    <>
      {routeList.map((route) => {
        return (
          <Route
            apiClient={apiClient}
            origin={route.origin}
            key={route.destination.id}
            destination={route.destination}
            routeOptions={routeOptions}
            appearance={appearance}
            name={route.name}
          />
        );
      })}

      {routeList.map((route) => {
        return (
          <MovingMarker
            key={route.name}
            name={route.name}
            onPositionUpdate={handleTruckPositionUpdate}
          />
        );
      })}

      <MapControl position={ControlPosition.BOTTOM_CENTER}>
        <UndoRedoControl
          drawingManager={drawingManager}
          circlesRef={circlesRef}
          polygonRef={polygonRef}
        />
      </MapControl>
    </>
  );
};

export default MyMapContent;
