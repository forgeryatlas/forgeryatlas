// Global variables for map functionality
// Check if map is already defined
if (typeof map === 'undefined') {
    let map;
}
let initialView;
let allMarkers = [];
let visibleMarkers = [];
let markerData = {};
let markerClusterGroup; // Cluster group for markers

// Initialize the map
function initMap() {
    // Set initial zoom level based on screen size
    let initialZoom = 6; // Closer zoom for desktop
    if (window.innerWidth <= 768) {
        initialZoom = 5; // Slightly zoomed out for tablets
    }
    if (window.innerWidth <= 480) {
        initialZoom = 4; // More zoomed out for phones
    }

    // Initialize the map - centered closer to Istanbul while still showing a large area
    const istanbulArea = [41.0, 29.0]; // Istanbul coordinates
    map = L.map('map', {
        zoomControl: false, // We'll add zoom control in a better position for mobile
        attributionControl: false // We'll add attribution in a better way
    }).setView(istanbulArea, initialZoom);

    initialView = {center: istanbulArea, zoom: initialZoom};

    // Add a more historical-looking base layer - using OpenStreetMap with custom styling
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: 'historical-map-tiles' // We'll add a CSS filter to this
    }).addTo(map);

    // Add zoom control to top-right (better for mobile)
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Add attribution control to bottom-right
    L.control.attribution({
        position: 'bottomright'
    }).addTo(map);

    // Initialize the marker cluster group with custom options
    markerClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false, // Don't show the area covered by the cluster
        maxClusterRadius: 30, // Further reduced radius for less aggressive clustering
        spiderfyOnMaxZoom: true, // Allow clicking on a cluster at max zoom to spread out its markers
        zoomToBoundsOnClick: false, // We'll handle zoom behavior ourselves
        disableClusteringAtZoom: 14, // Disable clustering at lower zoom levels to show individual markers sooner
        spiderfyDistanceMultiplier: 3, // Spread markers much further when spiderfying
        spiderfyOnMaxZoom: true, // Always spiderfy at max zoom
        animate: false, // Disable animation for more immediate response
        iconCreateFunction: createClusterIcon,
        // Animate clusters when zooming
        animate: true,
        animateAddingMarkers: true
    });

    // Add the cluster group to the map
    map.addLayer(markerClusterGroup);

    // Add custom event handler for cluster clicks to enhance zoom behavior
    markerClusterGroup.on('clusterclick', function(event) {
        // Get the cluster that was clicked
        const cluster = event.layer;
        const markers = cluster.getAllChildMarkers();
        const clusterBounds = cluster.getBounds();

        console.log(`Cluster clicked with ${markers.length} markers`);

        // For all clusters, we'll handle the zoom ourselves to ensure markers are shown
        const zoom = map.getBoundsZoom(clusterBounds);

        // Calculate appropriate zoom level based on cluster size - using more conservative zoom
        let targetZoom;
        if (markers.length <= 3) {
            // For very small clusters, zoom in moderately
            targetZoom = Math.min(zoom + 1, map.getMaxZoom());
        } else if (markers.length <= 10) {
            // For medium clusters, zoom in slightly
            targetZoom = Math.min(zoom + 1, map.getMaxZoom());
        } else {
            // For large clusters, zoom in minimally
            targetZoom = Math.min(zoom + 1, map.getMaxZoom());
        }

        // If we're already at or beyond the target zoom, force spiderfy
        if (map.getZoom() >= targetZoom) {
            // Force spiderfy immediately
            cluster.spiderfy();
            return true; // Allow default behavior
        }

        // If the cluster has few markers, consider spiderfying directly instead of zooming
        if (markers.length <= 5) {
            // For small clusters, just spiderfy directly without zooming
            cluster.spiderfy();
            return true; // Allow default behavior
        }

        // Otherwise zoom to the appropriate level
        const center = clusterBounds.getCenter();

        // After zooming, check if we need to spiderfy
        map.once('zoomend', function() {
            // If the cluster is still visible after zooming (hasn't been broken up)
            // and we're at max zoom, spiderfy it
            if (map.getZoom() === map.getMaxZoom() || map.getZoom() >= 18) {
                setTimeout(function() {
                    // This timeout gives the clustering algorithm time to update
                    if (cluster._icon && cluster._icon.parentNode) {
                        cluster.spiderfy();
                    }
                }, 300);
            }
        });

        // Perform the zoom
        map.setView(center, targetZoom, {animate: true});

        // Prevent default behavior as we're handling it ourselves
        return false;
    });

    // Reset view button functionality
    document.getElementById('reset-view').addEventListener('click', function() {
        map.setView(initialView.center, initialView.zoom);
        if (typeof timeSlider !== 'undefined' && timeSlider.noUiSlider) {
            timeSlider.noUiSlider.set(START_YEAR);
        }
    });
}


// Update markers based on current year
function updateMarkers() {
    // Clear the cluster group
    markerClusterGroup.clearLayers();
    visibleMarkers = [];

    // Add markers for the current year to the cluster group
    allMarkers.forEach(marker => {
        const data = marker.documentData;
        if (data.date && data.date.year === currentYear) {
            // Store marker type for clustering
            if (data.type) {
                marker.markerType = data.type;
            }

            markerClusterGroup.addLayer(marker);
            visibleMarkers.push(marker);
        }
    });

    // Check if we have overlapping markers at the same location
    const locationGroups = {};
    visibleMarkers.forEach(marker => {
        const key = `${marker.getLatLng().lat.toFixed(5)},${marker.getLatLng().lng.toFixed(5)}`;
        if (!locationGroups[key]) {
            locationGroups[key] = [];
        }
        locationGroups[key].push(marker);
    });

    // Log clustering information
    let clusteredLocations = 0;
    for (const key in locationGroups) {
        if (locationGroups[key].length > 1) {
            clusteredLocations++;
            console.log(`Found ${locationGroups[key].length} markers at location ${key}`);
        }
    }

    // Log the number of visible markers for the current year
    console.log(`Showing ${visibleMarkers.length} markers for year ${currentYear} with ${clusteredLocations} clustered locations`);
}
