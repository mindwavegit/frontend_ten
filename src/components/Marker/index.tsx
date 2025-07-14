import { AdvancedMarker } from "@vis.gl/react-google-maps";

const Marker = ({
  position,
}: {
  position: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined;
}) => {
  const renderCustomPin = () => {
    return (
      <div
        className="custom-pin"
        style={{
          transition: "transform 0.2s ease-in-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          position: "relative",
          top: 15,
        }}
      >
        <img
          width="32"
          src="/box-truck.png"
          alt="truck"
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        />
      </div>
    );
  };

  return (
    <>
      <AdvancedMarker position={position}></AdvancedMarker>
    </>
  );
};

export default Marker;
