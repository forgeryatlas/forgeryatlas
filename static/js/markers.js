// Fetch all marker data from Flask API
function fetchMarkers() {
    console.log("Fetching markers from API...");
    return new Promise((resolve, reject) => {
        fetch('/data/events.json')
            .then(response => response.json())
            .then(eventsData => {
                console.log(`Found ${eventsData.length} events from API`);

                // Track the maximum year in the data
                let maxYearInData = window.START_YEAR || 1854; // Default to a start year

                eventsData.forEach((data) => {
                    const marker = createMarker(data);

                    // Only add valid markers (with coordinates)
                    if (marker) {
                        allMarkers.push(marker);
                        markerData[data.id] = data;

                        // Update max year if this event has a later year
                        if (data.date && data.date.year && data.date.year > maxYearInData) {
                            maxYearInData = data.date.year;
                        }
                    }
                });

                console.log(`Added ${allMarkers.length} valid markers to the map`);
                console.log(`Maximum year in data: ${maxYearInData}`);

                // Update the time slider's end year based on the data if the function exists
                if (typeof updateTimeSliderRange === 'function') {
                    updateTimeSliderRange(maxYearInData);
                }

                // Initial update after all markers are loaded if the function exists
                if (typeof updateMarkers === 'function') {
                    updateMarkers();
                }

                resolve();
            }).catch(error => {
                console.error("Error fetching markers:", error);
                alert("Error loading map data. Please try again later.");
                reject(error);
            });
    });
}

// Function to create a marker with appropriate popup
function createMarker(data, showPopup = false) {
    const id = data.id;

    // Handle coordinates whether they're stored as Geopoint or lat/lng object
    let lat, lng;
    if (data.location && data.location.latitude !== undefined) {
        // Handling API/Excel format
        lat = data.location.latitude;
        lng = data.location.longitude;
    } else if (data.coordinates && data.coordinates.latitude !== undefined) {
        // Handling Geopoint format
        lat = data.coordinates.latitude;
        lng = data.coordinates.longitude;
    } else if (data.coordinates) {
        // Handling object format {lat, lng}
        lat = data.coordinates.lat;
        lng = data.coordinates.lng;
    } else {
        console.error("Invalid coordinates for marker:", id);
        return null; // Skip this marker
    }

    const markerType = data.type || 'default'; // 'forgery', 'escape', or 'arrest'
    const locationName = data.location || 'Unknown';

    // Responsive marker size based on screen width
    let markerSize = 24; // Default size
    if (window.innerWidth <= 768) {
        markerSize = 20; // Medium screens
    }
    if (window.innerWidth <= 480) {
        markerSize = 18; // Small screens
    }

    // Create the marker using the utility function
    const marker = createLocationMarker(lat, lng, locationName, markerType, {
        size: markerSize,
        showLabel: true
    });

    // Create popup content
    const popupContent = document.createElement('div');
    popupContent.className = 'marker-popup';

    const title = document.createElement('div');
    title.className = 'marker-title';
    title.innerText = data.location || 'Untitled Location';
    popupContent.appendChild(title);

    if (data.description && data.description.trim() !== '') {
        const description = document.createElement('div');
        description.className = 'marker-description';
        description.innerText = data.description;
        popupContent.appendChild(description);
    }

    const typeText = document.createElement('div');
    typeText.innerText = `Type: ${markerType.charAt(0).toUpperCase() + markerType.slice(1)}`;
    popupContent.appendChild(typeText);

    const dateText = document.createElement('div');
    let dateString = "Date: ";
    if (data.date) {
        // Format the month name based on numeric value
        const monthNames = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"];

        if (data.date.month && data.date.day) {
            // Full date with month name, day and year
            const monthName = monthNames[data.date.month - 1] || `Month ${data.date.month}`;
            dateString += `${monthName} ${data.date.day}, ${data.date.year}`;
        } else if (data.date.month) {
            // Month and year only
            const monthName = monthNames[data.date.month - 1] || `Month ${data.date.month}`;
            dateString += `${monthName} ${data.date.year}`;
        } else {
            // Year only
            dateString += `${data.date.year}`;
        }
    }
    dateText.innerText = dateString;
    popupContent.appendChild(dateText);

    // Add criminal link if this marker is associated with a criminal
    if (data.criminalId) {
        const criminalLink = document.createElement('div');
        criminalLink.className = 'marker-link';
        criminalLink.innerText = 'Show criminal details';
        criminalLink.addEventListener('click', () => showCriminalDetails(data.criminalId));
        popupContent.appendChild(criminalLink);

        // Add related locations link
        const relatedLink = document.createElement('div');
        relatedLink.className = 'marker-link';
        relatedLink.innerText = 'Show all related locations';
        relatedLink.addEventListener('click', () => showRelatedLocations(data.criminalId));
        popupContent.appendChild(relatedLink);
    }

    marker.bindPopup(popupContent);

    // Add double-click handler to show criminal details
    marker.on('dblclick', function() {
        if (data.criminalId) {
            showCriminalDetails(data.criminalId);
        }
    });

    // Store the data with the marker for reference
    marker.documentData = data;
    marker.documentId = id;

    // Store the location name and type for clustering purposes
    marker.locationName = locationName;
    marker.markerType = markerType;
    marker.markerColor = markerColor;

    return marker;
}

// Show all related locations for a criminal
function showRelatedLocations(criminalId) {
    // Clear the cluster group
    markerClusterGroup.clearLayers();
    visibleMarkers = [];

    // Find all markers related to this criminal
    const relatedMarkers = allMarkers.filter(marker =>
        marker.documentData.criminalId === criminalId
    );

    if (relatedMarkers.length === 0) {
        alert("No locations found for this criminal.");
        return;
    }

    // Add markers to cluster group
    relatedMarkers.forEach(marker => {
        markerClusterGroup.addLayer(marker);
        visibleMarkers.push(marker);
    });

    // We still want to fit the map for related locations (but not for year changes)
    if (relatedMarkers.length > 0) {
        const group = L.featureGroup(relatedMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}
