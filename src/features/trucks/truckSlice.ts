import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

type Truck = {
  isHovered: boolean;
};

// Define the shape of the payload
type StoreRoutePayload = {
  routeName: string;
  truckState: Truck;
};

export interface RouteState {
  routes: object;
}

const initialState: RouteState = {
  routes: {},
};

export const truckSlice = createSlice({
  name: "truck",
  initialState,
  reducers: {
    storeTruckMetrics: (state, action: PayloadAction<StoreRoutePayload>) => {
      const { routeName, truckState } = action.payload;
      return {
        routes: {
          ...state.routes,
          [routeName]: truckState,
        },
      };
    },
  },
});

// Action creators are generated for each case reducer function
export const { storeTruckMetrics } = truckSlice.actions;

export default truckSlice.reducer;
