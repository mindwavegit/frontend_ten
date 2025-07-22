import {
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormLabel,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  LocationOn as LocationOnIcon,
} from "@mui/icons-material";

import React, { useState, useCallback } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useDrawingManager } from "../../components/hooks/useDrawingManager";
import { AutocompleteCustom } from "../../components/AutoComplete";
import AutoCompleteResult from "../../components/AutoCompleteResult";
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Define the geofence data structure
interface GeofenceData {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  shape: "circle" | "polygon";
  shapeObject: google.maps.Circle | google.maps.Polygon;
  group: string;
  createdAt: Date;
  zoomLevel: number;
}

// Modal form data
interface GeofenceFormData {
  name: string;
  location: {
    lat: number | "";
    lng: number | "";
    address?: string;
  };
  shape: "circle" | "polygon";
  group: string;
}

// Predefined groups
const PREDEFINED_GROUPS = [
  "Warehouse",
  "Distribution Center",
  "Customer Location",
  "Maintenance Facility",
  "Fuel Station",
  "Rest Area",
  "Loading Dock",
  "Restricted Area",
];

const Geofences = () => {
  // State for storing saved geofences
  const [geofences, setGeofences] = useState<GeofenceData[]>([]);
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.Place | null>(null);

  // Ref to store map instance for getting zoom level
  const mapRef = React.useRef<google.maps.Map | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentShape, setCurrentShape] = useState<{
    shape: google.maps.Circle | google.maps.Polygon;
    type: "circle" | "polygon";
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState<GeofenceFormData>({
    name: "",
    location: {
      lat: "",
      lng: "",
      address: "",
    },
    shape: "circle",
    group: "",
  });

  // Form validation
  const [errors, setErrors] = useState<
    Partial<Record<keyof GeofenceFormData | "location", string>>
  >({});

  // Map configuration state
  const mapConfig = {
    mapId: "49ae42fed52588c3",
    defaultCenter: { lat: 43.64, lng: -79.41 },
    defaultZoom: 4,
    gestureHandling: "greedy",
    disableDefaultUI: true,
  };

  // Custom hook for drawing manager
  const MapWithDrawing = () => {
    const { drawingManager } = useDrawingManager();
    const map = useMap();

    // Store map reference for getting zoom level
    React.useEffect(() => {
      if (map) {
        mapRef.current = map;
      }
    }, [map]);
    // Handle animation when animationTarget changes
    React.useEffect(() => {
      if (!animationTarget || !map) return;

      const { lat, lng, targetZoom } = animationTarget;

      // Animate camera with TWEEN by updating map config
      map.setCenter({ lat, lng });
      if (targetZoom !== undefined) {
        map.setZoom(targetZoom);
      }
      // Clear the animation target after starting
      setAnimationTarget(null);
    }, [animationTarget, map]);

    // Handle new shapes being drawn
    React.useEffect(() => {
      if (!drawingManager) return;

      const handleCircleComplete = (circle: google.maps.Circle) => {
        const center = circle.getCenter();
        if (center) {
          setCurrentShape({ shape: circle, type: "circle" });
          setFormData((prev) => ({
            ...prev,
            shape: "circle",
            location: {
              ...prev.location,
              lat: center.lat(),
              lng: center.lng(),
            },
          }));

          // Geocode the location
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: center }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              setFormData((prev) => ({
                ...prev,
                location: {
                  ...prev.location,
                  address: results[0].formatted_address,
                },
              }));
            }
          });

          // Open the modal automatically when circle is completed
          setIsModalOpen(true);
        }

        drawingManager.setDrawingMode(null);
      };

      const handlePolygonComplete = (polygon: google.maps.Polygon) => {
        const path = polygon.getPath();
        if (path && path.getLength() > 0) {
          // Calculate center of polygon
          let latSum = 0;
          let lngSum = 0;
          const pathLength = path.getLength();

          for (let i = 0; i < pathLength; i++) {
            const vertex = path.getAt(i);
            latSum += vertex.lat();
            lngSum += vertex.lng();
          }

          const centerLat = latSum / pathLength;
          const centerLng = lngSum / pathLength;

          setCurrentShape({ shape: polygon, type: "polygon" });
          setFormData((prev) => ({
            ...prev,
            shape: "polygon",
            location: {
              ...prev.location,
              lat: centerLat,
              lng: centerLng,
            },
          }));

          // Geocode the center location
          const geocoder = new google.maps.Geocoder();
          const center = new google.maps.LatLng(centerLat, centerLng);
          geocoder.geocode({ location: center }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              setFormData((prev) => ({
                ...prev,
                location: {
                  ...prev.location,
                  address: results[0].formatted_address,
                },
              }));
            }
          });

          // Open the modal automatically when polygon is completed
          setIsModalOpen(true);
        }

        drawingManager.setDrawingMode(null);
      };

      // Add listeners
      google.maps.event.addListener(
        drawingManager,
        "circlecomplete",
        handleCircleComplete
      );
      google.maps.event.addListener(
        drawingManager,
        "polygoncomplete",
        handlePolygonComplete
      );

      return () => {
        google.maps.event.clearListeners(drawingManager, "circlecomplete");
        google.maps.event.clearListeners(drawingManager, "polygoncomplete");
      };
    }, [drawingManager]);

    return null;
  };

  // Handle Add Geofence button click
  const handleAddGeofence = () => {
    setIsModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange =
    (field: keyof GeofenceFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  // Handle location input changes
  const handleLocationChange =
    (field: "lat" | "lng") => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        event.target.value === "" ? "" : parseFloat(event.target.value);
      setFormData((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          [field]: value,
        },
      }));

      // Clear location error
      if (errors.location) {
        setErrors((prev) => ({
          ...prev,
          location: undefined,
        }));
      }
    };

  // Handle shape selection change
  const handleShapeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const selectedShape = event.target.value as "circle" | "polygon";
    setFormData((prev) => ({
      ...prev,
      shape: selectedShape,
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<
      Record<keyof GeofenceFormData | "location", string>
    > = {};

    if (!formData.name.trim()) {
      newErrors.name = "Geofence name is required";
    }

    if (formData.location.lat === "" || formData.location.lng === "") {
      newErrors.location = "Location coordinates are required";
    }

    if (!formData.group) {
      newErrors.group = "Group selection is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSave = useCallback(() => {
    if (!validateForm()) return;

    // Use the current shape or create a default circle
    let shapeObject = currentShape?.shape;
    if (
      !shapeObject &&
      formData.location.lat !== "" &&
      formData.location.lng !== ""
    ) {
      // Create a default circle (note: this won't be displayed without a map instance)
      const defaultCircle = new google.maps.Circle({
        center: {
          lat: formData.location.lat as number,
          lng: formData.location.lng as number,
        },
        radius: 1000, // 1km default radius
        editable: true,
        draggable: true,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
      });
      shapeObject = defaultCircle;
    }

    if (!shapeObject) {
      setErrors((prev) => ({
        ...prev,
        shape: "Please draw a shape on the map or provide valid coordinates",
      }));
      return;
    }

    // Get current zoom level
    const currentZoom = mapRef.current?.getZoom() || 10;

    // Create new geofence
    const newGeofence: GeofenceData = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      location: {
        lat: formData.location.lat as number,
        lng: formData.location.lng as number,
        address: formData.location.address,
      },
      shape: formData.shape,
      shapeObject,
      group: formData.group,
      createdAt: new Date(),
      zoomLevel: currentZoom,
    };

    setGeofences((prev) => [...prev, newGeofence]);
    handleCloseModal();
  }, [formData, currentShape]);

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentShape(null);
    setFormData({
      name: "",
      location: {
        lat: "",
        lng: "",
        address: "",
      },
      shape: "circle",
      group: "",
    });
    setErrors({});
  };

  // Handle cancel (remove the drawn shape)
  const handleCancel = () => {
    if (currentShape) {
      // Remove the shape from the map
      currentShape.shape.setMap(null);
    }
    handleCloseModal();
  };

  // Delete geofence
  const handleDeleteGeofence = (geofenceId: string) => {
    setGeofences((prev) => {
      const geofenceToDelete = prev.find((g) => g.id === geofenceId);
      if (geofenceToDelete) {
        // Remove from map
        geofenceToDelete.shapeObject.setMap(null);
      }
      return prev.filter((g) => g.id !== geofenceId);
    });
  };

  // State for animation trigger
  const [animationTarget, setAnimationTarget] = useState<{
    lat: number;
    lng: number;
    targetZoom?: number;
  } | null>(null);

  // Handle geofence view/navigation
  const handleGeofenceView = (geofence: GeofenceData) => {
    const { lat, lng } = geofence.location;

    // Trigger animation by setting the target - use stored zoom level
    setAnimationTarget({ lat, lng, targetZoom: geofence.zoomLevel });

    // Highlight the geofence shape temporarily
    if (geofence.shapeObject) {
      const originalFillColor = geofence.shapeObject.get("fillColor");
      const originalStrokeColor = geofence.shapeObject.get("strokeColor");
      const originalStrokeWeight = geofence.shapeObject.get("strokeWeight");

      // Highlight with different colors
      geofence.shapeObject.setOptions({
        fillColor: "#00FF00",
        strokeColor: "#00AA00",
        strokeWeight: 4,
      });

      // Reset colors after 3 seconds
      setTimeout(() => {
        if (geofence.shapeObject) {
          geofence.shapeObject.setOptions({
            fillColor: originalFillColor,
            strokeColor: originalStrokeColor,
            strokeWeight: originalStrokeWeight,
          });
        }
      }, 3000);
    }

    console.log(
      "Navigated to geofence:",
      geofence.name,
      "at",
      geofence.location
    );
  };

  // Handle geofence card click (navigate to geofence)
  const handleGeofenceClick = (geofence: GeofenceData) => {
    handleGeofenceView(geofence);
  };

  const handlePlaceSelect = (place: google.maps.places.Place | null) => {
    setSelectedPlace(place);
  };

  return (
    <div style={{ height: "100vh", display: "flex" }}>
      {/* Left Sidebar - Geofences List */}
      <Box
        sx={{
          width: 350,
          borderRight: "1px solid #ddd",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f9f9f9",
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: "1px solid #ddd" }}>
          <Typography fontSize="1.5rem" fontWeight="500" gutterBottom>
            Manage Geofences
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddGeofence}
            fullWidth
          >
            Add Geofence
          </Button>
        </Box>

        {/* Geofences List - Scrollable */}
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          {geofences.length > 0 ? (
            <>
              <Typography variant="h6" gutterBottom>
                Saved Geofences ({geofences.length})
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {geofences.map((geofence) => (
                  <Box
                    key={geofence.id}
                    sx={{
                      p: 2,
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#f0f0f0",
                        borderColor: "#1976d2",
                        transform: "translateY(-1px)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      },
                    }}
                    onClick={() => handleGeofenceClick(geofence)}
                  >
                    <Typography variant="body1" fontWeight="bold" gutterBottom>
                      {geofence.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      <strong>Type:</strong> {geofence.shape}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      <strong>Group:</strong> {geofence.group}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      <strong>Location:</strong>{" "}
                      {geofence.location.address ||
                        `${geofence.location.lat}, ${geofence.location.lng}`}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      gutterBottom
                    >
                      Created: {geofence.createdAt.toLocaleDateString()}
                    </Typography>
                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGeofenceView(geofence);
                        }}
                        sx={{ flex: 1 }}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGeofence(geofence.id);
                        }}
                        sx={{ flex: 1 }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <LocationOnIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                No Geofences Created
              </Typography>
              <Typography variant="body2">
                Click "Add Geofence" to create your first geofence
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Right Side - Map Container */}
      <Box sx={{ flex: 1, position: "relative" }}>
        <APIProvider apiKey={API_KEY}>
          <Map
            {...mapConfig}
            style={{ width: "100%", height: "100%" }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <AutocompleteCustom onPlaceSelect={handlePlaceSelect} />
            <AutoCompleteResult place={selectedPlace} />
            <MapWithDrawing />
          </Map>
        </APIProvider>
      </Box>

      {/* Modal for Geofence Details */}
      <Dialog
        open={isModalOpen}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Create Geofence
          <IconButton onClick={handleCancel} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Geofence Name */}
            <TextField
              fullWidth
              label="Geofence Name"
              value={formData.name}
              onChange={handleInputChange("name")}
              error={!!errors.name}
              helperText={errors.name}
              margin="normal"
              placeholder="Enter Geofence Name"
              required
            />

            {/* Set Location */}
            <FormLabel component="legend" sx={{ mt: 2, mb: 1 }}>
              Set Location <span style={{ color: "red" }}>*</span>
            </FormLabel>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="Latitude"
                type="number"
                value={formData.location.lat}
                onChange={handleLocationChange("lat")}
                error={!!errors.location}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Longitude"
                type="number"
                value={formData.location.lng}
                onChange={handleLocationChange("lng")}
                error={!!errors.location}
                size="small"
                sx={{ flex: 1 }}
              />
            </Box>
            {errors.location && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 1, display: "block" }}
              >
                {errors.location}
              </Typography>
            )}
            {formData.location.address && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                {formData.location.address}
              </Typography>
            )}

            {/* Select Shape */}
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Select Shape</InputLabel>
              <Select
                value={formData.shape}
                onChange={handleShapeChange}
                label="Select Shape"
              >
                <MenuItem value="circle">Circle</MenuItem>
                <MenuItem value="polygon">Polygon</MenuItem>
              </Select>
            </FormControl>

            {/* Select Group */}
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Select Group / Tag</InputLabel>
              <Select
                value={formData.group}
                onChange={handleInputChange("group")}
                label="Select Group / Tag"
                error={!!errors.group}
              >
                {PREDEFINED_GROUPS.map((group) => (
                  <MenuItem key={group} value={group}>
                    {group}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {errors.group && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 1, display: "block" }}
              >
                {errors.group}
              </Typography>
            )}

            {/* Shape Drawing Instructions */}
            <Box
              sx={{ mt: 2, p: 2, backgroundColor: "#e3f2fd", borderRadius: 1 }}
            >
              <Typography variant="body2" color="primary">
                <strong>Drawing Instructions:</strong> Use the drawing tools on
                the map to draw your {formData.shape}.
                {formData.shape === "circle" &&
                  " Click and drag to create a circle."}
                {formData.shape === "polygon" &&
                  " Click to add points, double-click to finish."}
                {
                  " The coordinates will be automatically updated when you draw."
                }
              </Typography>
            </Box>

            {/* Current Shape Info */}
            {currentShape && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  <strong>Shape Drawn:</strong> {currentShape.type} at{" "}
                  {formData.location.lat}, {formData.location.lng}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Geofences;
