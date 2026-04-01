// Ottoman Crime Network Map - Map Utility Functions

// These functions are now imported from markerUtils.js
// Keeping these functions here for backward compatibility
// but they just call the functions from markerUtils.js

/**
 * Get color for event type
 * @param {string} eventType - The type of event (forgery, escape, arrest)
 * @returns {string} - Hex color code
 */
function getColorForEventType(eventType) {
    // Check if the markerUtils version exists but avoid calling this same function
    if (window.markerUtilsLoaded) {
        return window.markerUtils_getColorForEventType(eventType);
    }

    // Fallback implementation
    let color = colorConfig.mixedColor; // Default mixed color

    if (eventType === 'forgery') {
        color = colorConfig.forgeryColor; // Red for forgery
    } else if (eventType === 'escape') {
        color = colorConfig.escapeColor; // Green for escape
    } else if (eventType === 'arrest') {
        color = colorConfig.arrestColor; // Dark for arrest
    }

    return color;
}

/**
 * Create a numbered marker icon based on event type
 * @param {number} number - The number to display in the marker
 * @param {string} eventType - The type of event
 * @returns {L.divIcon} - Leaflet div icon
 */
function createNumberedMarkerIcon(number, eventType) {
    // Check if the markerUtils version exists but avoid calling this same function
    if (window.markerUtilsLoaded) {
        return window.markerUtils_createNumberedMarkerIcon(number, eventType);
    }

    // Fallback implementation
    const color = getColorForEventType(eventType);
    return L.divIcon({
        html: `<div class="numbered-marker" style="background-color: ${color};">${number}</div>`,
        className: 'custom-numbered-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
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
    // Check if the markerUtils version exists but avoid calling this same function
    if (window.markerUtilsLoaded) {
        return window.markerUtils_createArrow(fromPoint, toPoint, eventType);
    }

    // Fallback to legacy implementation
    return createLegacyArrow(fromPoint, toPoint, eventType);
}

// Legacy arrow creation function as fallback
function createLegacyArrow(fromPoint, toPoint, eventType) {
    const color = getColorForEventType(eventType);

    const polyline = L.polyline([fromPoint, toPoint], {
        color: color,
        weight: 2,
        opacity: 0.7
    });

    if (typeof L.polylineDecorator === 'function') {
        const arrowDecorator = L.polylineDecorator(polyline, {
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
        return L.featureGroup([polyline, arrowDecorator]);
    } else {
        console.warn("L.polylineDecorator not available. Arrows won't be displayed.");
        return polyline;
    }
}

/**
 * Format date for display
 * @param {Object} date - Date object with year, month, day properties
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    if (!date) return 'Unknown Date';

    let dateStr = date.year || 'Unknown';
    if (date.month) {
        dateStr += `-${date.month}`;
        if (date.day) {
            dateStr += `-${date.day}`;
        }
    }

    return dateStr;
}

/**
 * Extract location from description
 * @param {string} description - Event description
 * @param {string} locationName1 - Primary location name
 * @param {string} locationName2 - Secondary location name
 * @returns {string} - Extracted location name
 */
function extractLocationFromDescription(description, locationName1, locationName2) {
    // If we already have a location name, use it
    if (locationName1 && locationName1 !== 'Unknown Location') {
        return locationName1;
    }
    if (locationName2 && locationName2 !== 'Unknown Location') {
        return locationName2;
    }

    // If no description, return Unknown Location
    if (!description) {
        return 'Unknown Location';
    }

    // Check for "met at" pattern
    const metAtRegex = /met at\s+([^\.,:;]+)/i;
    const metAtMatch = description.match(metAtRegex);
    if (metAtMatch && metAtMatch[1]) {
        return metAtMatch[1].trim();
    }

    // Check for "at" pattern (more general)
    const atRegex = /\bat\s+([^\.,:;]+)/i;
    const atMatch = description.match(atRegex);
    if (atMatch && atMatch[1]) {
        return atMatch[1].trim();
    }

    // Check for "in" pattern (for cities/neighborhoods)
    const inRegex = /\bin\s+([^\.,:;]+)/i;
    const inMatch = description.match(inRegex);
    if (inMatch && inMatch[1]) {
        return inMatch[1].trim();
    }

    return 'Unknown Location';
}

// Export functions if module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getColorForEventType,
        createNumberedMarkerIcon,
        createArrow,
        formatDate,
        extractLocationFromDescription
    };
}
