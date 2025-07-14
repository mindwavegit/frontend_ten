import React, { useCallback } from 'react';
import {
    AdvancedMarker,
    AdvancedMarkerAnchorPoint,
    useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { CastleSvg } from '../../icons/Castle-svg';

type TreeMarkerProps = {
    position: google.maps.LatLngLiteral;
    featureId: string;
    onMarkerClick?: (
        marker: google.maps.marker.AdvancedMarkerElement,
        featureId: string
    ) => void;
};

const FeatureMarker = ({
    position,
    featureId,
    onMarkerClick
}: TreeMarkerProps) => {
    const [markerRef, marker] = useAdvancedMarkerRef();
    const handleClick = useCallback(
        () => onMarkerClick && onMarkerClick(marker!, featureId),
        [onMarkerClick, marker, featureId]
    );

    return (
        <AdvancedMarker
            ref={markerRef}
            position={position}
            onClick={handleClick}
            anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
            className={'marker feature'}>
            <CastleSvg />
        </AdvancedMarker>
    );
};

export default FeatureMarker
