import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getParams } from "../helpers/getParams";
const API_URL = import.meta.env.VITE_API_ENDPOINT;

const mapService = createApi({
  reducerPath: "map",
  baseQuery: fetchBaseQuery({ baseUrl: API_URL }),
  endpoints: (builder) => ({
    getRouteInformation: builder.query({
      query: ({ page, limit, searchParams }) => ({
        url: `/api/auth/getTrips?page=${page}&limit=${limit}&${getParams(
          searchParams
        )}`,
      }),
    }),
  }),
  keepUnusedDataFor: 0, // Disable caching
});

export const { useLazyGetRouteInformationQuery } = mapService;
export default mapService;
