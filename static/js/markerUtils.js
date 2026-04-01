// Ottoman Crime Network Map - Marker Utilities
// This file contains all marker creation functions to ensure consistent styling

/**
 * Get color for event type
 * @param {string} eventType - The type of event (forgery, escape, arrest)
 * @returns {string} - Hex color code
 */
function getColorForEventType(eventType) {
    // Ensure colorConfig is available
    if (typeof window.colorConfig === 'undefined') {
        console.error("colorConfig is not defined");
        // Fallback colors if colorConfig is not available
        const fallbackColors = {
            forgery: '#9E4B4B',  // Red for forgery
            escape: '#4B6455',   // Green for escape
            arrest: '#2C2C2C',   // Dark for arrest
            mixed: '#6A5D4D'     // Brown for mixed types
        };

        // Determine color based on event type using fallback colors
        let color = fallbackColors.mixed; // Default mixed color

        if (eventType === 'forgery') {
            color = fallbackColors.forgery;
        } else if (eventType === 'escape') {
            color = fallbackColors.escape;
        } else if (eventType === 'arrest') {
            color = fallbackColors.arrest;
        }

        return color;
    }

    // Use colorConfig if available
    let color = window.colorConfig.mixedColor; // Default mixed color

    if (eventType === 'forgery') {
        color = window.colorConfig.forgeryColor; // Red for forgery
    } else if (eventType === 'escape') {
        color = window.colorConfig.escapeColor; // Green for escape
    } else if (eventType === 'arrest') {
        color = window.colorConfig.arrestColor; // Dark for arrest
    }

    return color;
}

/**
 * Create a standard location marker with icon
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} locationName - Name of the location
 * @param {string} eventType - Type of event (forgery, escape, arrest)
 * @param {object} options - Additional options
 * @returns {L.Marker} - Leaflet marker
 */
function createLocationMarker(lat, lng, locationName, eventType, options = {}) {
    const markerColor = getColorForEventType(eventType);
    const markerSize = options.size || 24;
    const showLabel = options.showLabel !== false;

    // Choose icon based on event type
    let iconClass;
    if (eventType === 'forgery') {
        iconClass = 'fa-file-signature'; // Document icon for forgery
    } else if (eventType === 'escape') {
        iconClass = 'fa-person-running'; // Running person for escape
    } else if (eventType === 'arrest') {
        iconClass = 'fa-handcuffs'; // Handcuffs for arrest
    } else {
        iconClass = 'fa-location-dot'; // Default location icon
    }

    // Create HTML for the marker with icon and label
    let markerHtml = `
        <div class="marker-container">
            <div class="marker-location-symbol" style="color: ${markerColor}; font-size: ${markerSize}px;">
                <i class="fa-solid ${iconClass}"></i>
            </div>
    `;

    // Add label if requested
    if (showLabel && locationName) {
        markerHtml += `<div class="marker-label">${locationName}</div>`;
    }

    markerHtml += `</div>`;

    // Create the marker icon
    const markerIcon = L.divIcon({
        html: markerHtml,
        className: 'marker-icon',
        iconSize: [Math.max(markerSize + 20, 120), markerSize + (showLabel ? 50 : 20)],
        iconAnchor: [Math.max(markerSize + 20, 120)/2, markerSize/2]
    });

    // Create the marker
    const marker = L.marker([lat, lng], {
        icon: markerIcon,
        riseOnHover: true,
        title: locationName || 'Location'
    });

    return marker;
}

/**
 * Create a numbered marker icon for journey points
 * @param {number} number - The number to display in the marker
 * @param {string} eventType - The type of event
 * @returns {L.divIcon} - Leaflet div icon
 */
function createNumberedMarkerIcon(number, eventType) {
    const markerColor = getColorForEventType(eventType);

    return L.divIcon({
        className: 'custom-numbered-marker',
        html: `<div class="marker-number" style="background-color: ${markerColor};">${number}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
}

/**
 * Create a highlighted version of the numbered marker icon
 * @param {number} number - The number to display in the marker
 * @param {string} eventType - The type of event
 * @returns {L.divIcon} - Leaflet div icon
 */
function createHighlightedMarkerIcon(number, eventType) {
    const markerColor = getColorForEventType(eventType);

    return L.divIcon({
        className: 'custom-numbered-marker',
        html: `<div class="marker-number" style="background-color: ${markerColor}; transform: scale(1.3); box-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.6); border: 2px solid white;">${number}</div>`,
        iconSize: [46, 46], // Slightly larger
        iconAnchor: [23, 23]
    });
}

/**
 * Create a cluster icon
 * @param {L.MarkerCluster} cluster - Leaflet marker cluster
 * @returns {L.divIcon} - Leaflet div icon
 */
function createClusterIcon(cluster) {
    // Count markers in the cluster
    const count = cluster.getChildCount();

    // Get marker types in this cluster to determine color
    const markers = cluster.getAllChildMarkers();
    let hasMultipleTypes = false;
    let dominantType = '';

    // Check if cluster has multiple event types
    if (markers.length > 0) {
        const types = {};
        markers.forEach(marker => {
            if (marker.markerType) {
                types[marker.markerType] = (types[marker.markerType] || 0) + 1;
            }
        });

        // Find the dominant type
        let maxCount = 0;
        for (const type in types) {
            if (types[type] > maxCount) {
                maxCount = types[type];
                dominantType = type;
            }
        }

        // Check if there are multiple types
        hasMultipleTypes = Object.keys(types).length > 1;
    }

    // Determine size based on count
    let size = 'small';
    if (count > 3) size = 'medium';
    if (count > 6) size = 'large';

    // Determine color based on dominant type or use mixed for multiple types
    let colorClass = 'mixed';
    if (!hasMultipleTypes && dominantType) {
        colorClass = dominantType;
    }

    // Create custom cluster icon with count
    return L.divIcon({
        html: `<div class="cluster-icon cluster-${size} cluster-${colorClass}">${count}</div>`,
        className: 'custom-cluster-icon',
        iconSize: L.point(50, 50)
    });
}

/**
 * Create an arrow between two points
 * @param {Array} fromPoint - Starting point [lat, lng]
 * @param {Array} toPoint - Ending point [lat, lng]
 * @param {string} eventType - The type of event
 * @returns {L.featureGroup} - Leaflet feature group containing the arrow
 */
function createArrow(fromPoint, toPoint, eventType) {
    // Get color based on event type
    const color = getColorForEventType(eventType);

    // Create a polyline with arrow decorations
    const polyline = L.polyline([fromPoint, toPoint], {
        color: color,
        weight: 2,
        opacity: 0.7
    });

    // Check if polylineDecorator is available
    let arrowDecorator;
    if (typeof L.polylineDecorator === 'function') {
        // Add arrow decorations if the plugin is available
        arrowDecorator = L.polylineDecorator(polyline, {
            patterns: [
                {
                    offset: '50%',
                    repeat: 0,
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 10,
                        polygon: true,
                        pathOptions: {
                            color: color,
                            fillOpacity: 0.8,
                            weight: 0
                        }
                    })
                }
            ]
        });
    } else {
        console.warn("L.polylineDecorator not available. Arrows won't be displayed.");
        // Return just the polyline if the decorator isn't available
        return polyline;
    }

    // Create a feature group to hold both the line and the arrow
    const arrowGroup = L.featureGroup([polyline, arrowDecorator]);

    return arrowGroup;
}

// Export functions if module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getColorForEventType,
        createLocationMarker,
        createNumberedMarkerIcon,
        createHighlightedMarkerIcon,
        createClusterIcon,
        createArrow
    };
}

// Make functions globally available for backward compatibility
// but use different names to avoid circular references
window.markerUtils_getColorForEventType = getColorForEventType;
window.markerUtils_createLocationMarker = createLocationMarker;
window.markerUtils_createNumberedMarkerIcon = createNumberedMarkerIcon;
window.markerUtils_createHighlightedMarkerIcon = createHighlightedMarkerIcon;
window.markerUtils_createClusterIcon = createClusterIcon;
window.markerUtils_createArrow = createArrow;

// Set a flag to indicate that markerUtils is loaded
window.markerUtilsLoaded = true;
