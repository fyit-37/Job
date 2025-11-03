// src/app/company/LocationMap.tsx

"use client";
import React, { FC, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L, { LatLngTuple } from 'leaflet';


// Fix for default Leaflet marker icons in React environments
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


// Map component containing the Leaflet logic (extracted from CreateJobPosting)
interface LocationMapProps {
    initialPosition: LatLngTuple; 
    onLocationChange: (lat: number, lng: number) => void;
}

const LocationMap: FC<LocationMapProps> = ({ initialPosition, onLocationChange }) => {
    
    const [position, setPosition] = useState<LatLngTuple>(initialPosition);

    const MapEvents = () => {
        const map = useMapEvents({
            click: (e) => {
                const { lat, lng } = e.latlng;
                const newPos: LatLngTuple = [lat, lng];
                setPosition(newPos);
                onLocationChange(lat, lng);
            },
        });
        
        // Effect to update map view when initialPosition changes
        useEffect(() => {
             map.setView(initialPosition, map.getZoom());
             setPosition(initialPosition);
        }, [initialPosition, map]);

        return null; 
    };

    return (
        <MapContainer 
            center={position} 
            zoom={5} 
            scrollWheelZoom={true}
            style={{ height: '100%', minHeight: '300px', width: '100%' }}
            className="rounded shadow-sm"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEvents /> 
            <Marker 
                position={position} 
                draggable={true} 
                eventHandlers={{
                    dragend: (e: any) => {
                        const { lat, lng } = e.target.getLatLng();
                        const newPos: LatLngTuple = [lat, lng];
                        setPosition(newPos);
                        onLocationChange(lat, lng);
                    },
                }}
            />
        </MapContainer>
    );
};

export default LocationMap;