import { InfoWindow, useMap } from "@vis.gl/react-google-maps";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { type Marker, MarkerClusterer } from "@googlemaps/markerclusterer";
import { type Truck } from "../../types/truck";
import { TruckMarker } from "../TruckMarker";

export type ClusteredTruckMarkersProps = {
  trucks: Truck[];
};

/**
 * The ClusteredTruckMarkers component is responsible for integrating the
 * markers with the markerclusterer.
 */
export const ClusteredTruckMarkers = ({
  trucks,
}: ClusteredTruckMarkersProps) => {
  const [markers, setMarkers] = useState<{ [key: string]: Marker }>({});
  const [selectedTreeKey, setSelectedTreeKey] = useState<string | null>(null);
  const [geojson, setGeojson] = useState<CastlesGeojson | null>(null);

  const selectedTree = useMemo(
    () =>
      trucks && selectedTreeKey
        ? trucks.find((t) => t.key === selectedTreeKey)!
        : null,
    [trucks, selectedTreeKey]
  );

  // create the markerClusterer once the map is available and update it when
  // the markers are changed
  const map = useMap();
  const clusterer = useMemo(() => {
    if (!map) return null;

    return new MarkerClusterer({ map });
  }, [map]);

  useEffect(() => {
    if (!clusterer) return;

    clusterer.clearMarkers();
    clusterer.addMarkers(Object.values(markers));
  }, [clusterer, markers]);

  // this callback will effectively get passsed as ref to the markers to keep
  // tracks of markers currently on the map
  const setMarkerRef = useCallback((marker: Marker | null, key: string) => {
    setMarkers((markers) => {
      if ((marker && markers[key]) || (!marker && !markers[key]))
        return markers;

      if (marker) {
        return { ...markers, [key]: marker };
      } else {
        const { [key]: _, ...newMarkers } = markers;

        return newMarkers;
      }
    });
  }, []);

  const handleInfoWindowClose = useCallback(() => {
    setSelectedTreeKey(null);
  }, []);

  const handleMarkerClick = useCallback((truck: Truck) => {
    setSelectedTreeKey(truck.key);
  }, []);

  return (
    <>
      {trucks.map((truck) => (
        <TruckMarker
          key={truck.key}
          truck={truck}
          onClick={handleMarkerClick}
          setMarkerRef={setMarkerRef}
        />
      ))}

      {selectedTreeKey && (
        <InfoWindow
          anchor={markers[selectedTreeKey]}
          onCloseClick={handleInfoWindowClose}
        >
          {selectedTree?.name}
        </InfoWindow>
      )}
    </>
  );
};
