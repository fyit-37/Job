// src/app/components/LeafletInitialization.js

// This file ensures the marker icons are correctly set globally before use.
// It must run only on the client.

if (typeof window !== 'undefined') {
    const L = require('leaflet');
    
    // Import assets using require
    const iconRetinaUrl = require('leaflet/dist/images/marker-icon-2x.png').default;
    const iconUrl = require('leaflet/dist/images/marker-icon.png').default;
    const shadowUrl = require('leaflet/dist/images/marker-shadow.png').default;
    
    const getImageUrl = (assetModule) => {
        if (assetModule && assetModule.src) {
            return assetModule.src;
        }
        return assetModule;
    };

    // Apply Global Icon Override
    const DefaultIcon = L.icon({
        iconRetinaUrl: getImageUrl(iconRetinaUrl),
        iconUrl: getImageUrl(iconUrl),
        shadowUrl: getImageUrl(shadowUrl),
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    // Overriding the default icon prototype globally
    L.Marker.prototype.options.icon = DefaultIcon;
}