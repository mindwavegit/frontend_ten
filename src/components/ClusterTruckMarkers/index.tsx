import { InfoWindow } from "@vis.gl/react-google-maps";
import React, { useCallback, useMemo, useState } from "react";
import { type Truck } from "../../types/truck";
import { TruckMarker } from "../TruckMarker";
import { FeaturesClusterMarker } from "../FeaturesClusterMarker";
import { useSupercluster } from "../hooks/useSupercluster";
import type { FeatureCollection, Point } from "geojson";
import type Supercluster from "supercluster";
import type { ClusterProperties } from "supercluster";

export type ClusteredTruckMarkersProps = {
  trucks: Truck[];
};

const superclusterOptions: Supercluster.Options<
  { truck: Truck },
  ClusterProperties
> = {
  extent: 256,
  radius: 80,
  maxZoom: 12,
};

/**
 * The ClusteredTruckMarkers component is responsible for integrating the
 * markers with the markerclusterer using Supercluster with castle icons.
 */
export const ClusteredTruckMarkers = ({
  trucks,
}: ClusteredTruckMarkersProps) => {
  const [selectedTruckKey, setSelectedTruckKey] = useState<string | null>(null);

  // Convert trucks to GeoJSON format for Supercluster
  const geojson: FeatureCollection<Point, { truck: Truck }> = useMemo(
    () => ({
      type: "FeatureCollection",
      features: trucks.map((truck) => ({
        type: "Feature",
        id: truck.key,
        geometry: {
          type: "Point",
          coordinates: [truck.position.lng, truck.position.lat],
        },
        properties: {
          truck,
        },
      })),
    }),
    [trucks]
  );

  const { clusters } = useSupercluster(geojson, superclusterOptions);

  const selectedTruck = useMemo(
    () =>
      trucks && selectedTruckKey
        ? trucks.find((t) => t.key === selectedTruckKey)!
        : null,
    [trucks, selectedTruckKey]
  );

  const handleInfoWindowClose = useCallback(() => {
    setSelectedTruckKey(null);
  }, []);

  const handleTruckMarkerClick = useCallback((truck: Truck) => {
    setSelectedTruckKey(truck.key);
  }, []);

  const handleClusterClick = useCallback(() => {
    // Optional: Add cluster click behavior if needed
  }, []);

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const clusterProperties = feature.properties as ClusterProperties;
        const isCluster: boolean = clusterProperties?.cluster;

        return isCluster ? (
          <FeaturesClusterMarker
            key={feature.id}
            clusterId={clusterProperties.cluster_id}
            position={{ lat, lng }}
            size={clusterProperties.point_count}
            sizeAsText={String(clusterProperties.point_count_abbreviated)}
            onMarkerClick={handleClusterClick}
          />
        ) : (
          <TruckMarker
            key={feature.id}
            truck={(feature.properties as { truck: Truck }).truck}
            onClick={handleTruckMarkerClick}
            setMarkerRef={() => {}} // Not needed for supercluster approach
          />
        );
      })}

      {selectedTruckKey && selectedTruck && (
        <InfoWindow
          position={selectedTruck.position}
          onCloseClick={handleInfoWindowClose}
        >
          {selectedTruck.name}
        </InfoWindow>
      )}
    </>
  );
};
