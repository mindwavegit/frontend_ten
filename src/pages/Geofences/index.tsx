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
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  LocationOn as LocationOnIcon,
  MyLocation as MyLocationIcon,
} from "@mui/icons-material";
import TextInputField from "../../components/Form/TextField";
import React, { useState, useCallback, useRef } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { useDrawingManager } from "../../components/hooks/useDrawingManager";
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Define the geofence data structure
interface GeofenceData {
  id: string;
  name: string;
  trailerNumber: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  shape: "circle" | "polygon";
  shapeObject: google.maps.Circle | google.maps.Polygon;
  group: string;
  createdAt: Date;
}

// Modal form data
interface GeofenceFormData {
  name: string;
  trailerNumber: string;
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

  // Map instance state
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentShape, setCurrentShape] = useState<{
    shape: google.maps.Circle | google.maps.Polygon;
    type: "circle" | "polygon";
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState<GeofenceFormData>({
    name: "",
    trailerNumber: "",
    location: {
      lat: "",
      lng: "",
      address: "",
    },
    assignEquipment: "single",
    shape: "circle",
    group: "",
  });

  // Form validation
  const [errors, setErrors] = useState<
    Partial<Record<keyof GeofenceFormData | "location", string>>
  >({});

  // Map configuration state
  const [mapConfig, setMapConfig] = useState({
    mapId: "49ae42fed52588c3",
    defaultCenter: { lat: 43.64, lng: -79.41 },
    defaultZoom: 4,
    gestureHandling: "greedy",
    disableDefaultUI: true,
  });

  // Function to get the map instance from Google Maps
  const getMapInstance = (): google.maps.Map | null => {
    // Try to get from our stored reference first
    if (mapRef.current) {
      return mapRef.current;
    }

    // Try to find the map in the DOM
    const mapElement = document.querySelector(
      '[data-testid="map"]'
    ) as HTMLElement;
    if (mapElement && (mapElement as any).map) {
      const foundMap = (mapElement as any).map as google.maps.Map;
      mapRef.current = foundMap;
      return foundMap;
    }

    // Try to find by gm-style class
    const gmStyleElement = document.querySelector(".gm-style");
    if (gmStyleElement && gmStyleElement.parentElement) {
      const mapDiv = gmStyleElement.parentElement;
      if ((mapDiv as any).map) {
        const foundMap = (mapDiv as any).map as google.maps.Map;
        mapRef.current = foundMap;
        return foundMap;
      }
    }

    return null;
  };

  // Callback to capture map instance and re-attach existing geofences
  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      setMapInstance(map);
      setIsMapLoaded(true);

      // Re-attach all existing geofences to the new map instance
      geofences.forEach((geofence) => {
        if (geofence.shapeObject) {
          geofence.shapeObject.setMap(map);
        }
      });

      console.log("Map loaded successfully");
    },
    [geofences]
  );

  // Effect to ensure all geofences are attached to the current map instance
  React.useEffect(() => {
    const map = getMapInstance();
    if (map && geofences.length > 0) {
      geofences.forEach((geofence) => {
        if (geofence.shapeObject) {
          geofence.shapeObject.setMap(map);
        }
      });
    }
  }, [geofences]);

  // Effect to periodically check for map instance
  React.useEffect(() => {
    const checkMapInstance = () => {
      const map = getMapInstance();
      if (map && !isMapLoaded) {
        setMapInstance(map);
        setIsMapLoaded(true);
        console.log("Map instance found via periodic check");
      }
    };

    const interval = setInterval(checkMapInstance, 500);

    // Clear interval after 10 seconds
    setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => clearInterval(interval);
  }, [isMapLoaded]);

  // Custom hook for drawing manager
  const MapWithDrawing = () => {
    const { drawingManager, circlesRef, polygonRef } = useDrawingManager();

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

  // Handle "Locate Me" button
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          setFormData((prev) => ({
            ...prev,
            location: {
              lat,
              lng,
              address: prev.location.address,
            },
          }));

          // Geocode the location
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
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
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
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

    if (!formData.trailerNumber.trim()) {
      newErrors.trailerNumber = "Trailer number is required";
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

    // If no shape is drawn, create a default circle at the specified location
    let shapeObject = currentShape?.shape;
    if (
      !shapeObject &&
      formData.location.lat !== "" &&
      formData.location.lng !== "" &&
      mapInstance
    ) {
      // Create a default circle
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
        map: mapInstance,
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

    // Ensure the shape is attached to the current map instance
    if (mapInstance && shapeObject) {
      shapeObject.setMap(mapInstance);
    }

    const newGeofence: GeofenceData = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      trailerNumber: formData.trailerNumber.trim(),
      location: {
        lat: formData.location.lat as number,
        lng: formData.location.lng as number,
        address: formData.location.address,
      },
      shape: formData.shape,
      shapeObject,
      group: formData.group,
      createdAt: new Date(),
    };

    setGeofences((prev) => [...prev, newGeofence]);
    handleCloseModal();
  }, [formData, currentShape, mapInstance]);

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentShape(null);
    setFormData({
      name: "",
      trailerNumber: "",
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

  // Handle geolocation
  const handleGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Update map configuration for future renders
          setMapConfig((prev) => ({
            ...prev,
            defaultCenter: { lat, lng },
            defaultZoom: 15,
          }));

          // Try to get the map instance
          const map = getMapInstance();
          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(15);
            console.log("Geolocation successful");
          } else {
            console.warn("Map instance not available for geolocation");
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          alert(
            "Unable to retrieve your location. Please check your browser settings."
          );
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  // Handle geofence view/navigation
  const handleGeofenceView = (geofence: GeofenceData) => {
    const { lat, lng } = geofence.location;
    const targetZoom = geofence.shape === "circle" ? 15 : 14;

    // Update map configuration for future renders
    setMapConfig((prev) => ({
      ...prev,
      defaultCenter: { lat, lng },
      defaultZoom: targetZoom,
    }));

    // Try to get the map instance
    const map = getMapInstance();
    if (map) {
      // Use panTo for smooth animation to the location

      map.moveCamera({
        center: {
          lat,
          lng,
        },
      });

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
              fillColor: originalFillColor || "#FF0000",
              strokeColor: originalStrokeColor || "#FF0000",
              strokeWeight: originalStrokeWeight || 2,
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
    } else {
      console.warn("Map instance not available for geofence view");
      // Fallback: Wait a bit and try again
      setTimeout(() => {
        const retryMap = getMapInstance();
        if (retryMap) {
          retryMap.panTo({ lat, lng });
          retryMap.setZoom(targetZoom);
          console.log("Retry successful: Navigated to geofence");
        } else {
          console.error("Map instance still not available after retry");
        }
      }, 1000);
    }
  };

  // Handle geofence card click (navigate to geofence)
  const handleGeofenceClick = (geofence: GeofenceData) => {
    handleGeofenceView(geofence);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography fontSize="1.5rem" fontWeight="500">
            Manage Geofences
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<MyLocationIcon />}
              onClick={handleGeolocation}
            >
              My Location
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddGeofence}
            >
              Add Geofence
            </Button>
          </Box>
        </Box>

        {/* Geofences List */}
        {geofences.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Saved Geofences ({geofences.length})
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {geofences.map((geofence) => (
                <Box
                  key={geofence.id}
                  sx={{
                    p: 2,
                    border: "1px solid #ddd",
                    borderRadius: 1,
                    backgroundColor: "#f5f5f5",
                    minWidth: 250,
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "#e0e0e0",
                      borderColor: "#1976d2",
                    },
                  }}
                  onClick={() => handleGeofenceClick(geofence)}
                >
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    {geofence.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Trailer:</strong> {geofence.trailerNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Type:</strong> {geofence.shape}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Group:</strong> {geofence.group}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    <strong>Location:</strong>{" "}
                    {geofence.location.address ||
                      `${geofence.location.lat}, ${geofence.location.lng}`}
                  </Typography>
                  <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGeofenceView(geofence);
                      }}
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
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Map Container */}
      <Box sx={{ flex: 1, position: "relative" }}>
        <APIProvider apiKey={API_KEY}>
          <Map
            {...mapConfig}
            onLoad={handleMapLoad}
            style={{ width: "100%", height: "100%" }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
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
            {/* Trailer Number */}
            <TextField
              fullWidth
              label="Trailer Number"
              value={formData.trailerNumber}
              onChange={handleInputChange("trailerNumber")}
              error={!!errors.trailerNumber}
              helperText={errors.trailerNumber}
              margin="normal"
              placeholder="Enter Trailer Number"
              required
            />

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
              <Button
                variant="outlined"
                size="small"
                onClick={handleLocateMe}
                startIcon={<LocationOnIcon />}
                sx={{ whiteSpace: "nowrap" }}
              >
                Locate Me
              </Button>
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
