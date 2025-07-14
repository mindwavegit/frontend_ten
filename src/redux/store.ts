import { configureStore } from "@reduxjs/toolkit";
import routeReducer from "../features/routes/routeSlice";
import truckReducer from "../features/trucks/truckSlice";
import * as services from "../services";

export const store = configureStore({
  reducer: {
    route: routeReducer,
    truck: truckReducer,
    [services.mapService.reducerPath]: services.mapService.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat([services.mapService.middleware]),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
