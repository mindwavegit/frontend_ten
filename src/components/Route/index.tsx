import React, { useEffect, useState } from "react";
import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import polyline from "@mapbox/polyline";

import { Polyline } from "../Polyline";
import type { RoutesApi } from "../../helpers/routes-api";
import { useDispatch, useSelector } from "react-redux";
import { storeRoutePoints } from "../../features/routes/routeSlice";
import type { RootState } from "../../redux/store";

const defaultAppearance = {
  walkingPolylineColor: "#000000",
  defaultPolylineColor: "#9a1e45",
  stepMarkerFillColor: "#333333",
  stepMarkerBorderColor: "#000000",
};

type Appearance = typeof defaultAppearance;

export type RouteProps = {
  apiClient: RoutesApi;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  routeOptions?: any;
  appearance?: Partial<Appearance>;
  name: string;
  //waypoints?: { lat: number, lng: number, id: number, location: string }[];
};

const Route = (props: RouteProps) => {
  const { apiClient, origin, destination,
    //waypoints, 
    routeOptions, name } = props;

  const dispatch = useDispatch();
  const truckMetrics = useSelector((state: RootState) => state.truck.routes);

  const isCurrentTruckHovered = truckMetrics[name]?.isHovered;

  const [route, setRoute] = useState<any>(null);

  const map = useMap();

  useEffect(() => {
    if (!map) return;

    apiClient.computeRoutes(origin, destination, routeOptions).then((res) => {
      // we're only interested in the first result for this case
      const [route] = res?.routes;
      // store in state and trigger rerendering
      setRoute(route);
      const polylinePoints = route.legs[0].steps
        .map((step) => {
          const coordinates = polyline.decode(step.polyline.encodedPolyline);
          const coordsArray = coordinates.map(([lat, lng]) => ({ lat, lng }));
          return coordsArray;
        })
        .flat();
      dispatch(
        storeRoutePoints({ routeName: name, routePoints: polylinePoints })
      );

      // fit map to the viewport returned from the API
      const { high, low } = route.viewport;
      const bounds: google.maps.LatLngBoundsLiteral = {
        north: high.latitude,
        south: low.latitude,
        east: high.longitude,
        west: low.longitude,
      };

      map.fitBounds(bounds);
    });
  }, [origin, destination, routeOptions, apiClient, map]);

  if (!route) return null;

  // With only two waypoints, our route will have a single leg.
  // We now want to create a visualization for the steps in that leg.
  const routeSteps: any[] = route.legs[0].steps;

  const appearance = { ...defaultAppearance, ...props.appearance };

  // Every step of the route is visualized using a polyline (see ./polyline.tsx);
  // color and weight depend on the travel mode. For public transit lines
  // with established colors, the official color will be used.
  const polylines = routeSteps.map((step, index) => {
    const isWalking = step.travelMode === "WALK";
    const color = isWalking
      ? appearance.walkingPolylineColor
      : step?.transitDetails?.transitLine?.color ??
      appearance.defaultPolylineColor;

    return (
      <Polyline
        key={`${index}-polyline`}
        encodedPath={step.polyline.encodedPolyline}
        strokeWeight={isWalking ? 2 : 6}
        strokeColor={color}
        routeName={name}
      />
    );
  });

  // At the beginning of every step, an AdvancedMarker with a small circle is placed.
  // The beginning of the first step is omitted for a different marker.
  const stepMarkerStyle = {
    backgroundColor: appearance.stepMarkerFillColor,
    borderColor: appearance.stepMarkerBorderColor,
    width: 8,
    height: 8,
    border: `1px solid`,
    borderRadius: "50%",
  };

  const stepMarkers = routeSteps.slice(1).map((step, index) => {
    const position = {
      lat: step.startLocation.latLng.latitude,
      lng: step.startLocation.latLng.longitude,
    };

    return (
      <AdvancedMarker
        key={`${index}-start`}
        anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
        position={position}
      >
        <div style={stepMarkerStyle} />
      </AdvancedMarker>
    );
  });

  return (
    <>
      <AdvancedMarker position={origin} />
      <AdvancedMarker position={destination} />
      {isCurrentTruckHovered ? polylines : ""}
      {/* {polylines} */}
      {/* {stepMarkers} */}
    </>
  );
};

export default React.memo(Route);
