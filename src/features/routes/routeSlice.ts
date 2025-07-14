import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

type RoutePoint = {
  lat: number;
  lng: number;
};

// Define the shape of the payload
type StoreRoutePayload = {
  routeName: string;
  routePoints: RoutePoint[];
};

export interface RouteState {
  routes: object;
}

const initialState: RouteState = {
  routes: {},
};

export const routesSlice = createSlice({
  name: "routes",
  initialState,
  reducers: {
    storeRoutePoints: (state, action: PayloadAction<StoreRoutePayload>) => {
      const { routeName, routePoints } = action.payload;
      return {
        routes: {
          ...state.routes,
          [routeName]: routePoints,
        },
      };
    },
  },
});

// Action creators are generated for each case reducer function
export const { storeRoutePoints } = routesSlice.actions;

export default routesSlice.reducer;
