// Ottoman Crime Network Map - Main Initialization Module for Landing Page

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - initializing landing page");

    try {
        console.log("Initializing landing page");

        // Initialize the criminals map for the mobility map section

        // Initialize the criminals map for the mobility map section
        const criminalsMapContainer = document.querySelector('.criminal-journeys-container');
        if (!criminalsMapContainer) {
            console.error("Criminal journeys container not found");
            return;
        }

        // Ensure the map container is visible before initializing the map
        criminalsMapContainer.style.display = 'block';

        // Check if the map element exists
        const mapElement = document.getElementById('criminals-map');
        if (!mapElement) {
            console.error("Criminals map element not found");
            return;
        }

        console.log("Initializing Leaflet map");
        const criminalsMap = L.map('criminals-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([41.0, 29.0], 6);

        // Store the map in a global variable for access by other scripts
        window.criminalsMapInstance = criminalsMap;
        console.log("Map initialized and stored in global variable");

        // Add tile layer to the criminals map
        const tileLayer = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

        L.tileLayer(tileLayer, {
            attribution: attribution,
            maxZoom: 19,
            className: 'historical-map-tiles'
        }).addTo(criminalsMap);
        console.log("Tile layer added to map");

        // Add zoom control to the criminals map
        L.control.zoom({
            position: 'topright'
        }).addTo(criminalsMap);
        console.log("Zoom control added to map");

        // Initialize Ottoman borders for the criminals map (without toggle button)
        if (typeof initBorders === 'function') {
            initBorders(criminalsMap);
            console.log("Ottoman borders initialized");
        } else {
            console.warn("initBorders function not found");
        }

        // Fetch criminals for the criminals map with a slight delay to ensure everything is initialized
        if (typeof fetchCriminals === 'function') {
            console.log("Scheduling fetchCriminals call");
            setTimeout(function() {
                console.log("Calling fetchCriminals now");
                fetchCriminals(null, criminalsMap);
            }, 1000); // Increased delay to 1 second for better initialization
        } else {
            console.error("fetchCriminals function not found");
        }

        // Initialize letter communications map
        const communicationsMapElement = document.getElementById('communications-map');
        if (communicationsMapElement) {
            console.log("Initializing letter communications map");
            
            // Ensure the container is visible
            document.querySelector('.communications-container').style.display = 'block';
            
            // Initialize the communications map
            const communicationsMap = L.map('communications-map', {
                zoomControl: false,
                attributionControl: false
            }).setView([41.0, 29.0], 6);
            
            // Store in global variable
            window.communicationsMapInstance = communicationsMap;
            
            // Add tile layer
            L.tileLayer(tileLayer, {
                attribution: attribution,
                maxZoom: 19,
                className: 'historical-map-tiles'
            }).addTo(communicationsMap);
            
            // Add zoom control
            L.control.zoom({
                position: 'topright'
            }).addTo(communicationsMap);
            
            // Initialize Ottoman borders for communications map
            if (typeof initBorders === 'function') {
                initBorders(communicationsMap);
                console.log("Ottoman borders initialized for communications map");
            }
            
            // Initialize diplomat selector + aggregated flow view
            if (typeof fetchDiplomats === 'function') {
                console.log("About to call fetchDiplomats function");
                if (typeof fetchDiplomats === 'function') {
                    console.log("fetchDiplomats function exists, calling it now");
                    fetchDiplomats(null, communicationsMap);
                } else {
                    console.error("fetchDiplomats function not found!");
                }
            } else {
                console.warn("fetchLetterCommunications and fetchDiplomats functions not found");
            }
            
            console.log("Letter communications map fully initialized");
        } else {
            console.log("Communications map element not found on this page");
        }

        // Handle window resize for both maps
        window.addEventListener('resize', function() {
            // Criminal map resize
            criminalsMap.invalidateSize();
            console.log("Map size invalidated after resize");

            // Ensure the map container is properly sized
            const criminalsMapContainer = document.querySelector('.criminal-journeys-container');
            if (criminalsMapContainer && criminalsMapContainer.offsetHeight > 0) {
                setTimeout(function() {
                    criminalsMap.invalidateSize();
                    console.log("Map size invalidated again after container resize");
                }, 100);
            }
            
            // Communications map resize
            if (window.communicationsMapInstance) {
                window.communicationsMapInstance.invalidateSize();
                console.log("Communications map size invalidated after resize");
                
                const commContainer = document.querySelector('.communications-container');
                if (commContainer && commContainer.offsetHeight > 0) {
                    setTimeout(function() {
                        window.communicationsMapInstance.invalidateSize();
                    }, 100);
                }
            }
        });

        // Navigation functionality is now handled by navigation.js
        console.log("Navigation handled by navigation.js module");

    } catch (error) {
        console.error("Error initializing landing page:", error);
    }
});

// Helper function to extract location from description
function extractLocationFromDescription(description, locationName1, locationName2) {
    // Use provided location name if available
    if (locationName1) return locationName1;
    if (locationName2) return locationName2;

    // Try to extract from description
    if (description) {
        // Look for "in [Word]" or "In [Word]" pattern - only take the next word
        const inMatch = description.match(/\b(?:in|In)\s+([A-Za-z]+)/);
        if (inMatch && inMatch[1]) {
            return inMatch[1].trim();
        }

        // Look for "met at [Word]" or "Met at [Word]" pattern - only take the next word
        const metAtMatch = description.match(/\b(?:met at|Met at)\s+([A-Za-z]+)/);
        if (metAtMatch && metAtMatch[1]) {
            return metAtMatch[1].trim();
        }

        // Look for location at the beginning of the description - only take the first word
        const startMatch = description.match(/^([A-Z][a-zA-z]+)/);
        if (startMatch && startMatch[1]) {
            return startMatch[1].trim();
        }
    }

    return 'Unknown Location';
}

// Format date object for display
function formatDate(dateObj) {
    if (!dateObj) return 'Unknown Date';

    const year = dateObj.year;
    const month = dateObj.month;
    const day = dateObj.day;

    if (!year) return 'Unknown Date';

    let dateStr = year.toString();

    if (month) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        dateStr = monthNames[month - 1] + ' ' + dateStr;

        if (day) {
            dateStr = day + ' ' + dateStr;
        }
    }

    return dateStr;
}
