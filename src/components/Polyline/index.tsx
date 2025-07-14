import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import React, { useState, useEffect } from "react";
import { useDispatch, } from "react-redux";

type PolylineCustomProps = {
  encodedPath?: string;
  routeName?: string | undefined
};

export type PolylineProps = google.maps.PolylineOptions & PolylineCustomProps;

export const Polyline = (props: PolylineProps) => {
  const { encodedPath, routeName, ...polylineOptions } = props;

  const map = useMap();
  const geometryLibrary = useMapsLibrary("geometry");
  const mapsLibrary = useMapsLibrary("maps");

  const dispatch = useDispatch()

  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!polyline) return;
  }, [polyline, routeName, dispatch]);

  // create poyline once available
  useEffect(() => {
    if (!mapsLibrary) return;
    setPolyline(new mapsLibrary.Polyline());
  }, [mapsLibrary]);

  // update options when changed
  useEffect(() => {
    if (!polyline) return;

    polyline.setOptions(polylineOptions);
  }, [polyline, polylineOptions]);

  // decode and update polyline with encodedPath
  useEffect(() => {
    if (!encodedPath || !geometryLibrary || !polyline) return;

    polyline.setPath(geometryLibrary.encoding.decodePath(encodedPath));
  }, [polyline, encodedPath, geometryLibrary]);

  // add polyline to map
  useEffect(() => {
    if (!map || !polyline) return;

    // console.log("adding polyline to map");
    polyline.setMap(map);

    return () => polyline.setMap(null);
  }, [map, polyline]);

  return <></>;
};
