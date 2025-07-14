import React, { useMemo, memo, useReducer } from "react";
import { Autocomplete, TextField, Button, Box, Tooltip } from "@mui/material";
import StatesAndCities from "../../data/US_States_and_Cities.json";
import CircleIcon from "@mui/icons-material/Circle";

import "./styles.css";

interface FilterState {
  originCity: string;
  originState: string;
  trailerType: string;
  status: string;
}

type ReducerAction =
  | {
      type: "originState" | "originCity" | "trailerType" | "status";
      value: string;
    }
  | { type: "clear" };

interface TruckFilterProps {
  onSubmit: (state: FilterState, isFetchStopped: boolean) => void;
  isTrackingActive: boolean;
  onThemeChange?: (value: boolean) => void;
  onWarehouseMode: () => void;
}

const TruckFilter = memo<TruckFilterProps>(
  ({ onSubmit, isTrackingActive, onWarehouseMode }) => {
    function reducer(state: FilterState, action: ReducerAction): FilterState {
      switch (action.type) {
        case "originState":
          return {
            ...state,
            [action.type]: action.value,
            // Clear city when state changes
            originCity:
              action.value !== state.originState ? "" : state.originCity,
          };
        case "originCity":
          return {
            ...state,
            [action.type]: action.value,
          };
        case "trailerType":
          return {
            ...state,
            [action.type]: action.value,
          };
        case "status":
          return {
            ...state,
            [action.type]: action.value,
          };
        case "clear":
          return {
            originCity: "",
            originState: "",
            trailerType: "",
            status: "",
          };
        default:
          return state;
      }
    }

    const [state, dispatch] = useReducer(reducer, {
      originCity: "",
      originState: "",
      trailerType: "",
      status: "",
    });

    const states = useMemo(() => {
      return Object.keys(StatesAndCities);
    }, []);

    const trailerTypes = useMemo(() => {
      return ["Tractor", "Chassis", "Trailer"];
    }, []);

    const statusOptions = useMemo(() => {
      return ["Active", "Not Moving"];
    }, []);

    const citiesList = useMemo(() => {
      return state.originState
        ? (StatesAndCities as Record<string, string[]>)[state.originState] || []
        : [];
    }, [state.originState]);

    const handleAutocompleteChange =
      (name: string) =>
      (_event: React.SyntheticEvent, value: string | null) => {
        dispatch({ type: name as keyof FilterState, value: value || "" });
      };

    const handleSubmit = () => {
      onSubmit(state, false);
    };

    const handleClear = (isFetchStopped = false) => {
      const clearedState = {
        originCity: "",
        originState: "",
        trailerType: "",
        status: "",
      };
      dispatch({ type: "clear" });
      // Submit the cleared state immediately
      onSubmit(clearedState, isFetchStopped);
    };

    return (
      <Box
        component="section"
        sx={{ display: "flex", flexDirection: "row", gap: 2, p: 2 }}
      >
        <Autocomplete
          value={state.trailerType || null}
          inputValue={state.trailerType || ""}
          onChange={handleAutocompleteChange("trailerType")}
          options={trailerTypes}
          renderInput={(params) => (
            <TextField {...params} label="Select Trailer Type" />
          )}
          clearOnEscape
          clearOnBlur={false}
          sx={{ minWidth: 200 }}
        />

        <Autocomplete
          value={state.originState || null}
          inputValue={state.originState || ""}
          onChange={handleAutocompleteChange("originState")}
          options={states}
          renderInput={(params) => (
            <TextField {...params} label="Select State" />
          )}
          clearOnEscape
          clearOnBlur={false}
          sx={{ minWidth: 200 }}
        />

        <Autocomplete
          value={state.originCity || null}
          inputValue={state.originCity || ""}
          onChange={handleAutocompleteChange("originCity")}
          options={citiesList}
          disabled={!state.originState}
          renderInput={(params) => (
            <TextField {...params} label="Select City" />
          )}
          clearOnEscape
          clearOnBlur={false}
          sx={{ minWidth: 200 }}
        />

        <Autocomplete
          value={state.status || null}
          inputValue={state.status || ""}
          onChange={handleAutocompleteChange("status")}
          options={statusOptions}
          renderInput={(params) => (
            <TextField {...params} label="Select Trailer Status" />
          )}
          clearOnEscape
          clearOnBlur={false}
          sx={{ minWidth: 200 }}
        />

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ height: "100%", padding: "1rem 2rem" }}
          >
            Submit
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              handleClear(false);
            }}
            sx={{ height: "100%", padding: "1rem 2rem" }}
          >
            Clear
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              if (isTrackingActive) {
                handleClear(false);
              } else {
                handleClear(true);
              }
            }}
            sx={{ height: "100%", padding: "1rem 2rem" }}
            startIcon={
              <CircleIcon className="truck-filter__circle-icon" color="error" />
            }
          >
            {isTrackingActive ? "Stop Tracking" : "Live Tracking"}
          </Button>
          <Tooltip title="Warehouse Geofence" placement="top">
            <Button
              variant="outlined"
              onClick={onWarehouseMode}
              sx={{ height: "100%", padding: "1rem 2rem" }}
            >
              Warehouse
            </Button>
          </Tooltip>
        </Box>
      </Box>
    );
  }
);

export default TruckFilter;
