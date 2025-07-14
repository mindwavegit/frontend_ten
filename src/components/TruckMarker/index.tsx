import { type Truck } from "../../types/truck";
import type { Marker } from "@googlemaps/markerclusterer";
import React, { useCallback } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";

export type TruckMarkerProps = {
  truck: Truck;
  onClick: (truck: Truck) => void;
  setMarkerRef: (marker: Marker | null, key: string) => void;
};

/**
 * Wrapper Component for an AdvancedMarker for a single tree.
 */
export const TruckMarker = (props: TruckMarkerProps) => {
  const { truck, onClick, setMarkerRef } = props;

  const handleClick = useCallback(() => onClick(truck), [onClick, truck]);
  const ref = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement) =>
      setMarkerRef(marker, truck.key),
    [setMarkerRef, truck.key]
  );

  return (
    <AdvancedMarker position={truck.position} ref={ref} onClick={handleClick}>
      <img
        width="16"
        src="/box-truck.png"
        alt="truck"
        style={{
          display: "block",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      />
    </AdvancedMarker>
  );
};
