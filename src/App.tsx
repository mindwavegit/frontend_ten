import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { useLazyGetRouteInformationQuery } from "./services/map";
import { ClusteredTruckMarkers } from "./components/ClusterTruckMarkers";
import TruckFilter from "./components/TruckFilter";
import MyMapContent from "./components/MyMapContent";
import WarehouseContent from "./components/WarehouseContent";
import type { Truck } from "./types/truck";
import {
  ThemeProvider,
  createTheme,
  type PaletteMode,
} from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import "./App.css";
import Features from "./pages/Features";
import Geofences from "./pages/Geofences";

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

const App = () => {
  const muiTheme = createTheme({
    palette: {
      mode: "light",
    },
  });

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Features />} />
          <Route path="/geofence" element={<Geofences />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
