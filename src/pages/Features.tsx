import React, { useCallback, useEffect, useRef, useState } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { useLazyGetRouteInformationQuery } from "../services/map";
import type { Truck } from "../types/truck";
import TruckFilter from "../components/TruckFilter";
import WarehouseContent from "../components/WarehouseContent";
import MyMapContent from "../components/MyMapContent";
import { ClusteredTruckMarkers } from "../components/ClusterTruckMarkers";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface FilterState {
  originCity?: string;
  originState?: string;
  trailerType?: string;
  status?: string;
}

interface ApiResponseItem {
  id: string;
  name: string;
  status: string;
  originLat: number;
  originLng: number;
}

const Features = () => {
  const countRef = useRef(1);
  const fetchedRecordsCount = useRef(0);
  const [availableRecordsCount, setAvailableRecordsCount] = useState(0);
  const [filtersData, setFiltersData] = useState<FilterState>({});
  const timeoutRef = useRef<number | null>(null);
  const [isTrackLiveEnabled, setIsTrackLiveEnabled] = useState(false);
  const [isWarehouseMode, setIsWarehouseMode] = useState(false);

  const [getRouteInformation] = useLazyGetRouteInformationQuery();

  const [routeData, setRouteData] = useState<Truck[]>([]);

  const mapOptions = {
    mapId: "49ae42fed52588c3",
    defaultCenter: { lat: 43.64, lng: -79.41 },
    defaultZoom: 4,
    gestureHandling: "greedy",
    disableDefaultUI: true,
  };

  const fetchLocationData = useCallback(
    async ({
      filters,
      isNewSearch = false,
    }: {
      filters: FilterState;
      isNewSearch?: boolean;
    }) => {
      try {
        const response = await getRouteInformation({
          page: countRef.current,
          limit: 1500,
          searchParams: filters,
        });
        if (response.error) {
          return;
        } else if (response.data) {
          const transformedData: Truck[] = response.data.data.map(
            (item: ApiResponseItem) => {
              return {
                key: item.id,
                name: item.name,
                category: item.status,
                position: {
                  lat: item.originLat,
                  lng: item.originLng,
                },
              };
            }
          );

          // For new searches (Submit), replace data. For pagination, append data.
          if (isNewSearch) {
            setRouteData(transformedData);
          } else {
            setRouteData((prev) => [...prev, ...transformedData]);
          }

          setAvailableRecordsCount(response.data.total);
          fetchedRecordsCount.current += 1500;
          countRef.current += 1;
        }
      } catch (err) {
        console.log(err);
      }
    },
    [getRouteInformation]
  );

  useEffect(() => {
    // Only schedule if we haven't fetched everything AND tracking is not enabled
    console.log({
      fetchedRecordsCount,
      availableRecordsCount,
      isTrackLiveEnabled,
    });

    if (
      fetchedRecordsCount.current < 10000 &&
      Object.keys(filtersData).length &&
      !isTrackLiveEnabled // Don't schedule if tracking is enabled
    ) {
      timeoutRef.current = window.setTimeout(() => {
        fetchLocationData({ filters: filtersData });
      }, 2000);
    }

    // Cleanup previous timeout
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    routeData,
    availableRecordsCount,
    fetchLocationData,
    filtersData,
    isTrackLiveEnabled,
  ]);

  const onSubmit = useCallback(
    (state: FilterState, isFetchStopped: boolean) => {
      // Clear any existing timeout first
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Reset warehouse mode when doing other operations
      if (isWarehouseMode) {
        setIsWarehouseMode(false);
      }

      if (!isFetchStopped) {
        setIsTrackLiveEnabled(false);
        // For normal submit/clear, reset counters and fetch new data
        setAvailableRecordsCount(0);
        fetchedRecordsCount.current = 0;
        countRef.current = 1;
        setFiltersData(state);
        fetchLocationData({ filters: state, isNewSearch: true });
      }

      if (isFetchStopped) {
        // For live tracking, clear everything and enable tracking
        setRouteData([]);
        setAvailableRecordsCount(0);
        fetchedRecordsCount.current = 0;
        countRef.current = 1;
        setFiltersData({});
        setTimeout(() => {
          setIsTrackLiveEnabled(true);
        }, 2000);
      }
    },
    [fetchLocationData, isWarehouseMode]
  );

  const handleWarehouseMode = useCallback(() => {
    // Clear any existing timeout first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Clear all existing marker data
    setRouteData([]);
    setAvailableRecordsCount(0);
    fetchedRecordsCount.current = 0;
    countRef.current = 1;
    setFiltersData({});

    // Disable live tracking and enable warehouse mode
    setIsTrackLiveEnabled(false);
    setIsWarehouseMode(true);
  }, []);

  return (
    <div style={{ height: "700px" }}>
      <APIProvider apiKey={API_KEY} libraries={["marker"]}>
        <TruckFilter
          onSubmit={onSubmit}
          isTrackingActive={isTrackLiveEnabled}
          onWarehouseMode={handleWarehouseMode}
        />
        <Map {...mapOptions} className={"custom-marker-clustering-map"}>
          {isTrackLiveEnabled && !isWarehouseMode ? <MyMapContent /> : ""}
          {isWarehouseMode ? <WarehouseContent /> : ""}
          {!isTrackLiveEnabled && !isWarehouseMode ? (
            <ClusteredTruckMarkers trucks={routeData} />
          ) : (
            ""
          )}
        </Map>
      </APIProvider>
    </div>
  );
};

export default Features;
