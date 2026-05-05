// Ottoman Crime Network Map - Criminals Map Module

// Variables for the criminals map
// Check if selectedCriminalId is already defined
if (typeof selectedCriminalId === 'undefined') {
    let selectedCriminalId = null;
}
let criminalJourneyLayer = null;
let allCriminals = [];
let criminalEvents = [];

// Ensure formatDate function is available
if (typeof formatDate !== 'function') {
    // Define formatDate if it's not already defined (for standalone page)
    function formatDate(dateObj) {
        if (!dateObj) return '';

        const year = dateObj.year;
        const month = dateObj.month;
        const day = dateObj.day;

        if (!year) return '';

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
}

// Ensure extractLocationFromDescription function is available
if (typeof extractLocationFromDescription !== 'function') {
    // Define extractLocationFromDescription if it's not already defined (for standalone page)
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
}

/**
 * Build HTML content for "all entries" marker popup (timeline-style UI + view journey button)
 * @param {Object} opts - { index, dateStr, eventTypeClass, typeLabel, criminalName, locationName, description, criminalId }
 * @returns {string} HTML string for Leaflet popup
 */
function buildAllEntriesPopupContent(opts) {
    const criminalId = (opts.criminalId || '').replace(/"/g, '&quot;');
    const dateHtml = opts.dateStr ? '    <span class="event-date">' + opts.dateStr + '</span>' : '';
    const locationHtml = opts.locationName && opts.locationName !== 'Unknown' && opts.locationName !== 'Unknown Location'
        ? '  <div class="event-location">' + opts.locationName + '</div>'
        : '';
    return (
        '<div class="marker-popup mobility-popup-content" data-criminal-id="' + criminalId + '">' +
        '  <div class="popup-event-number">' + (opts.index || 1) + '</div>' +
        '  <div class="event-header">' +
        dateHtml +
        '    <span class="' + (opts.eventTypeClass || 'event-type') + '">' + (opts.typeLabel || 'Event') + '</span>' +
        '  </div>' +
        '  <div class="event-criminal popup-criminal-name">' + (opts.criminalName || '') + '</div>' +
        locationHtml +
        '  <div class="popup-actions">' +
        '    <button type="button" class="popup-view-journey-btn">View this criminal\'s journey</button>' +
        '  </div>' +
        '</div>'
    );
}

/**
 * Add heat map toggle button into the map container.
 * Uses window.criminalsMapInstance so the reference is always current.
 */
function initHeatMapToggle() {
    if (document.getElementById('heat-map-toggle-btn')) return;

    var container = document.getElementById('map-container') || document.getElementById('criminals-map');
    if (!container) return;

    var btn = document.createElement('button');
    btn.id = 'heat-map-toggle-btn';
    btn.type = 'button';
    btn.textContent = 'Heat map';
    btn.title = 'Toggle heat map overlay';
    container.appendChild(btn);

    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var mapRef = window.criminalsMapInstance;
        if (!mapRef) { console.warn('Heat map: no map instance found'); return; }

        // --- Turn OFF ---
        if (window.heatLayer && mapRef.hasLayer(window.heatLayer)) {
            mapRef.removeLayer(window.heatLayer);
            btn.classList.remove('heat-on');
            btn.textContent = 'Heat map';
            _setHeatMapUIHidden(false);
            return;
        }

        // --- Turn ON ---
        if (window.heatMapPoints && window.heatMapPoints.length > 0) {
            _applyHeatLayer(mapRef, btn);
            return;
        }

        fetch('../data/events.json')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                window.heatMapPoints = (data || [])
                    .filter(function(d) {
                        return d.location && d.location.latitude != null && d.location.longitude != null;
                    })
                    .map(function(d) {
                        return [d.location.latitude, d.location.longitude, 1];
                    });
                _applyHeatLayer(mapRef, btn);
            })
            .catch(function(err) { console.error('Heat map data error:', err); });
    });
}

/**
 * Hide (true) or restore (false) markers, popups and the timeline panel
 * when toggling the heat map view.
 */
function _setHeatMapUIHidden(hide) {
    // Journey / marker layer
    var mapRef = window.criminalsMapInstance;
    if (mapRef && window.criminalJourneyLayer) {
        if (hide) {
            if (mapRef.hasLayer(window.criminalJourneyLayer)) {
                mapRef.removeLayer(window.criminalJourneyLayer);
                window._heatHidJourneyLayer = true;
            }
        } else {
            if (window._heatHidJourneyLayer) {
                mapRef.addLayer(window.criminalJourneyLayer);
                window._heatHidJourneyLayer = false;
            }
        }
    }

    // Close any open popups
    if (hide && mapRef) mapRef.closePopup();

    // Timeline panel
    var timeline = document.getElementById('timeline-info');
    if (timeline) timeline.style.display = hide ? 'none' : '';

    // Criminal description box
    var desc = document.getElementById('criminal-description');
    if (desc) desc.style.display = hide ? 'none' : '';
}

function _applyHeatLayer(mapRef, btn) {
    function doApply() {
        if (window.heatLayer) {
            try { mapRef.removeLayer(window.heatLayer); } catch(e) {}
        }
        window.heatLayer = L.heatLayer(window.heatMapPoints || [], {
            radius: 35,
            blur: 25,
            maxZoom: 12,
            minOpacity: 0.5,
            max: 1.0,
            gradient: { 0.0: 'blue', 0.4: 'cyan', 0.65: 'lime', 0.8: 'yellow', 1.0: 'red' }
        });
        window.heatLayer.addTo(mapRef);
        _setHeatMapUIHidden(true);
        if (btn) {
            btn.classList.add('heat-on');
            btn.textContent = 'Back to map';
        }
    }

    if (typeof L.heatLayer === 'function') {
        doApply();
        return;
    }

    // Plugin not yet loaded – inject it and retry once
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
    s.onload = function() {
        if (typeof L.heatLayer === 'function') {
            doApply();
        } else {
            console.error('leaflet-heat failed to expose L.heatLayer after dynamic load');
        }
    };
    s.onerror = function() { console.error('Failed to load leaflet-heat.js'); };
    document.head.appendChild(s);
}

/**
 * Fetch criminals for the criminals map
 * @param {Object} db - Not used anymore, kept for compatibility
 * @param {L.Map} map - Leaflet map instance
 */
function fetchCriminals(db, map) {
    console.log("Fetching criminals for criminals map");

    initHeatMapToggle();

    // Get the criminal selector dropdown
    const criminalSelector = document.getElementById('criminal-selector');

    // Fetch all criminals from API
    fetch('../data/criminals.json')
        .then(response => response.json())
        .then(criminals => {
            console.log(`Found ${criminals.length} criminals from API`);

            // Sort criminals by name
            criminals.sort((a, b) => a.name.localeCompare(b.name));

            // Populate the criminal selector dropdown
            criminals.forEach(criminal => {
                // Filter out criminals with no events as requested
                // Specifically: Giuseppe Lopetz and Vincenzo Busi
                if (criminal.name === 'Giuseppe Lopetz' || criminal.name === 'Vincenzo Busi') {
                    return;
                }
                
                const option = document.createElement('option');
                option.value = criminal.id;
                option.textContent = criminal.name;
                criminalSelector.appendChild(option);
            });

            // Add event listener to the criminal selector
            criminalSelector.addEventListener('change', function() {
                const criminalId = this.value;

                // Immediately blur the select element to collapse the dropdown
                this.blur();

                if (criminalId) {
                    showCriminalJourney(criminalId, db, map);
                } else {
                    showAllJourneys(db, map);
                }
            });

            // Initial state: show all entries when no criminal is selected
            showAllJourneys(db, map);
        })
        .catch(error => {
            console.error("Error fetching criminals:", error);
            alert("Error loading criminal data. Please try again later.");
        });
}

/**
 * Show all criminal event entries on the map (when no criminal is selected)
 * @param {Object} db - Not used, kept for compatibility
 * @param {L.Map} map - Leaflet map instance
 */
function showAllJourneys(db, map) {
    console.log("Showing all criminal entries");

    if (window.criminalJourneyLayer) {
        map.removeLayer(window.criminalJourneyLayer);
        window.criminalJourneyLayer = null;
    }

    window.criminalJourneyLayer = L.layerGroup().addTo(map);

    const journeyClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 20,
        spiderfyOnMaxZoom: true,
        zoomToBoundsOnClick: false,
        disableClusteringAtZoom: 14,
        spiderfyDistanceMultiplier: 3,
        animate: false,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count > 3) size = 'medium';
            if (count > 6) size = 'large';
            return L.divIcon({
                html: `<div class="cluster-icon cluster-${size} cluster-mixed">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: L.point(50, 50)
            });
        }
    });
    window.criminalJourneyLayer.addLayer(journeyClusterGroup);

    Promise.all([
        fetch('../data/events.json').then(r => r.json()),
        fetch('../data/criminals.json').then(r => r.json())
    ]).then(([eventsData, criminals]) => {
        if (eventsData.error) throw new Error(eventsData.error);

        const nameById = {};
        criminals.forEach(c => { nameById[c.id] = c.name || 'Unknown'; });

        const events = [];
        eventsData.forEach((data) => {
            if (data.location && data.location.latitude !== undefined && data.location.longitude !== undefined) {
                events.push({
                    id: data.id,
                    criminalId: data.criminalId,
                    criminalName: nameById[data.criminalId] || 'Unknown',
                    type: data.type || 'Unknown',
                    date: data.date || { year: null, month: null, day: null },
                    location: data.location,
                    description: data.description || '',
                    locationName: data.locationName || extractLocationFromDescription(data.description, null, null)
                });
            }
        });

        events.sort((a, b) => {
            if (!a.date || !b.date) return 0;
            const aYear = a.date.year || 0, bYear = b.date.year || 0;
            if (aYear !== bYear) return aYear - bYear;
            const aMonth = a.date.month || 0, bMonth = b.date.month || 0;
            if (aMonth !== bMonth) return aMonth - bMonth;
            return (a.date.day || 0) - (b.date.day || 0);
        });

        window.heatMapPoints = events.map(function(e) {
            return [e.location.latitude, e.location.longitude, 0.7];
        });
        if (window.heatLayer && map.hasLayer(window.heatLayer) && window.heatLayer.setLatLngs) {
            window.heatLayer.setLatLngs(window.heatMapPoints);
        }

        const eventMarkers = [];
        events.forEach((event, index) => {
            const lat = event.location.latitude;
            const lng = event.location.longitude;
            const dateStr = formatDate(event.date);
            const locationPart = event.locationName && event.locationName !== 'Unknown' ? ` – ${event.locationName}` : '';
            const title = `${event.criminalName} – ${event.type}${locationPart} (${dateStr})`;
            const eventTypeClass = `event-type event-type-${event.type}`;
            const typeLabel = event.type.charAt(0).toUpperCase() + event.type.slice(1);
            const safeName = (event.criminalName || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const safeLocation = (event.locationName && event.locationName !== 'Unknown' && event.locationName !== 'Unknown Location')
                ? event.locationName.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
            const safeDesc = '';

            const markerIcon = window.markerUtils_createNumberedMarkerIcon
                ? window.markerUtils_createNumberedMarkerIcon(index + 1, event.type)
                : createNumberedMarkerIcon(index + 1, event.type);

            const marker = L.marker([lat, lng], {
                icon: markerIcon,
                riseOnHover: true,
                title: title
            });

            const popupContent = buildAllEntriesPopupContent({
                index: index + 1,
                dateStr: dateStr,
                eventTypeClass: eventTypeClass,
                typeLabel: typeLabel,
                criminalName: safeName,
                locationName: safeLocation,
                description: safeDesc,
                criminalId: event.criminalId || ''
            });
            marker.bindPopup(popupContent, {
                className: 'mobility-map-event-popup',
                minWidth: 260,
                maxWidth: 340
            });
            marker.on('popupopen', function() {
                const popup = marker.getPopup();
                const el = popup.getElement();
                if (!el) return;
                const content = el.querySelector('.mobility-popup-content');
                const criminalId = content && content.getAttribute('data-criminal-id');
                const btn = el.querySelector('.popup-view-journey-btn');
                if (btn && criminalId) {
                    btn.onclick = function() {
                        const sel = document.getElementById('criminal-selector');
                        if (sel) sel.value = criminalId;
                        if (typeof showCriminalJourney === 'function' && window.criminalsMapInstance) {
                            showCriminalJourney(criminalId, null, window.criminalsMapInstance);
                        }
                    };
                }
            });
            journeyClusterGroup.addLayer(marker);
            eventMarkers.push(marker);
        });

        if (eventMarkers.length > 0) {
            const group = L.featureGroup(eventMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
            window.eventMarkersArray = eventMarkers;
        }

        updateTimelineInfoAll(events, eventMarkers);
        setTimelineHeader('');

        const criminalDescription = document.getElementById('criminal-description') || document.getElementById('criminal-info');
        if (criminalDescription) {
            criminalDescription.innerHTML = '<p class="initial-message">Select a criminal to view details</p>';
            criminalDescription.style.display = 'block';
        }
    }).catch(error => {
        console.error("Error loading all events:", error);
        alert("Error loading events. Please try again later.");
    });
}

/**
 * Update timeline panel for "all entries" mode (criminal name + date + type + location per event)
 */
function updateTimelineInfoAll(events, markers) {
    const timelineEvents = document.getElementById('timeline-events');
    if (!timelineEvents) return;
    timelineEvents.innerHTML = '';

    if (events.length === 0) {
        timelineEvents.innerHTML = '<p>No events found.</p>';
        return;
    }

    if (markers && Array.isArray(markers)) {
        window.eventMarkersArray = markers;
    }

    events.forEach((event, index) => {
        const dateStr = formatDate(event.date);
        const eventTypeClass = `event-type event-type-${event.type}`;
        const eventItem = document.createElement('div');
        eventItem.className = 'timeline-event';
        eventItem.dataset.index = index;
        const locationLine = event.locationName && event.locationName !== 'Unknown' && event.locationName !== 'Unknown Location'
            ? `<div class="event-location">${event.locationName}</div>` : '';
        const dateLine = dateStr ? `<span class="event-date">${dateStr}</span>` : '';
        eventItem.innerHTML = `
            <div class="event-number">${index + 1}</div>
            <div class="event-header">
                ${dateLine}
                <span class="${eventTypeClass}">${event.type.charAt(0).toUpperCase() + event.type.slice(1)}</span>
            </div>
            <div class="event-criminal">${event.criminalName || ''}</div>
            ${locationLine}
        `;
        eventItem.addEventListener('click', function() {
            document.querySelectorAll('.timeline-event').forEach(el => el.classList.remove('highlighted'));
            this.classList.add('highlighted');
            if (window.eventMarkersArray && window.eventMarkersArray[index] && window.criminalsMapInstance) {
                const marker = window.eventMarkersArray[index];
                window.criminalsMapInstance.setView(marker.getLatLng(), window.criminalsMapInstance.getZoom());
                if (window.markerUtils_createHighlightedMarkerIcon) {
                    const highlightedIcon = window.markerUtils_createHighlightedMarkerIcon(index + 1, event.type);
                    marker.setIcon(highlightedIcon);
                    setTimeout(() => {
                        const normalIcon = window.markerUtils_createNumberedMarkerIcon
                            ? window.markerUtils_createNumberedMarkerIcon(index + 1, event.type)
                            : createNumberedMarkerIcon(index + 1, event.type);
                        marker.setIcon(normalIcon);
                    }, 2000);
                }
            }
        });
        timelineEvents.appendChild(eventItem);
    });
}

/**
 * Set the timeline panel header text
 */
function setTimelineHeader(text) {
    const panelHeader = document.querySelector('#timeline-info h3');
    if (!panelHeader) return;
    panelHeader.innerText = text;
    panelHeader.style.display = text ? '' : 'none';
}

/**
 * Show a criminal's journey on the map
 * @param {string} criminalId - ID of the criminal
 * @param {Object} db - Not used anymore, kept for compatibility
 * @param {L.Map} map - Leaflet map instance
 */
function showCriminalJourney(criminalId, db, map) {
    console.log("Showing journey for criminal:", criminalId);

    // Clear previous journey if any
    if (window.criminalJourneyLayer) {
        map.removeLayer(window.criminalJourneyLayer);
    }

    // Create a new layer group for the journey
    window.criminalJourneyLayer = L.layerGroup().addTo(map);

    // Create a cluster group specifically for the criminal journey
    const journeyClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 20, // Smaller radius for criminal journey to show more detail
        spiderfyOnMaxZoom: true,
        zoomToBoundsOnClick: false,
        disableClusteringAtZoom: 14,
        spiderfyDistanceMultiplier: 3,
        animate: false,
        iconCreateFunction: function(cluster) {
            // Count markers in the cluster
            const count = cluster.getChildCount();

            // Determine size based on count
            let size = 'small';
            if (count > 3) size = 'medium';
            if (count > 6) size = 'large';

            // Create custom cluster icon with count
            return L.divIcon({
                html: `<div class="cluster-icon cluster-${size} cluster-mixed">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: L.point(50, 50)
            });
        }
    });

    // Add the journey cluster group to the journey layer
    window.criminalJourneyLayer.addLayer(journeyClusterGroup);

    // Fetch all events and filter client-side for this criminal
    fetch('../data/events.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(allEvents => {
            const eventsData = allEvents.filter(e => e.criminalId === criminalId);
            // (no error field in static JSON)
            
            console.log(`Found ${eventsData.length} events for criminal ${criminalId}`);

            const events = [];
            const eventMarkers = [];
            const journeyPoints = [];

            // Process all events
            eventsData.forEach((data) => {
                // Events from API already have location in the correct format
                if (data.location && data.location.latitude !== undefined && data.location.longitude !== undefined) {
                    events.push({
                        id: data.id || `event_${events.length}`,
                        type: data.type || 'Unknown',
                        date: data.date || { year: null, month: null, day: null },
                        location: data.location,
                        description: data.description || '',
                        locationName: data.locationName || extractLocationFromDescription(data.description, null, null)
                    });
                }
            });

            if (events.length === 0) {
                console.log("No events found for this criminal.");
                // Update the timeline info panel to show no events
                updateTimelineInfo([], criminalId);
                // Show the criminal details even if there are no events
                showCriminalDetails(criminalId);
                return;
            }

            // Sort events by date (handle null/undefined dates)
            events.sort((a, b) => {
                if (!a.date || !b.date) return 0;
                const aYear = a.date.year || 0;
                const bYear = b.date.year || 0;
                if (aYear !== bYear) return aYear - bYear;
                const aMonth = a.date.month || 0;
                const bMonth = b.date.month || 0;
                if (aMonth !== bMonth) return aMonth - bMonth;
                return (a.date.day || 0) - (b.date.day || 0);
            });

            // Add points to journey in chronological order
            events.forEach((event, index) => {
                const lat = event.location.latitude;
                const lng = event.location.longitude;
                journeyPoints.push([lat, lng]);

                // Create numbered marker icon based on event type using the utility function
                const markerIcon = window.markerUtils_createNumberedMarkerIcon
                    ? window.markerUtils_createNumberedMarkerIcon(index + 1, event.type)
                    : createNumberedMarkerIcon(index + 1, event.type);

                // Create marker for this event
                const marker = L.marker([lat, lng], {
                    icon: markerIcon,
                    riseOnHover: true,
                    title: event.description || 'Event'
                });

                // Instead of popup, make marker click update the timeline info
                marker.on('click', function() {
                    // Highlight this event in the timeline
                    const timelineEvents = document.querySelectorAll('.timeline-event');
                    timelineEvents.forEach((el, i) => {
                        if (i === index) {
                            el.classList.add('highlighted');
                            // Scroll to this event in the timeline
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                            el.classList.remove('highlighted');
                        }
                    });
                });

                // Add marker to journey cluster group
                journeyClusterGroup.addLayer(marker);
                eventMarkers.push(marker);

                // Draw arrow to next event if not the last one
                if (index < events.length - 1) {
                    const nextEvent = events[index + 1];
                    const nextLat = nextEvent.location.latitude;
                    const nextLng = nextEvent.location.longitude;

                    // Create arrow using the utility function
                    const arrow = window.markerUtils_createArrow
                        ? window.markerUtils_createArrow([lat, lng], [nextLat, nextLng], event.type)
                        : createArrow([lat, lng], [nextLat, nextLng], event.type);
                    window.criminalJourneyLayer.addLayer(arrow);
                }
            });

            // Fit the map to show all events
            if (eventMarkers.length > 0) {
                const group = L.featureGroup(eventMarkers);
                map.fitBounds(group.getBounds().pad(0.1));

                // Store markers for reference in a global variable
                window.eventMarkersArray = eventMarkers;
            }

            // Update the timeline info panel
            updateTimelineInfo(events, criminalId, eventMarkers);

            // Also show the criminal details
            showCriminalDetails(criminalId);
        })
        .catch(error => {
            console.error("Error fetching criminal journey:", error);
            console.error("Error details:", error.message, error.stack);
            alert(`Error loading criminal journey: ${error.message}. Please check the console for more details.`);
        });
}

/**
 * Update the timeline info panel with events
 * @param {Array} events - Array of event objects
 * @param {string} criminalId - ID of the criminal
 * @param {Array} markers - Array of event markers (optional)
 */
function updateTimelineInfo(events, criminalId, markers) {
    const timelineEvents = document.getElementById('timeline-events');
    timelineEvents.innerHTML = '';

    if (events.length === 0) {
        timelineEvents.innerHTML = '<p>No events found for this criminal.</p>';
        return;
    }

    // Store markers for reference if provided
    if (markers && Array.isArray(markers)) {
        window.eventMarkersArray = markers;
    }

    // Get the criminal name if available
    fetch('../data/criminals.json')
        .then(response => response.json())
        .then(criminals => {
            const criminal = criminals.find(c => c.id === criminalId);
            if (criminal) {
                const criminalName = criminal.name || 'Unknown Criminal';

                // Update the panel header
                const panelHeader = document.querySelector('#timeline-info h3');
                if (panelHeader) {
                    panelHeader.innerText = `${criminalName}'s Journey`;
                }
            }
        })
        .catch(error => {
            console.error("Error getting criminal name:", error);
        });

    // Markers are now stored in window.eventMarkersArray for reference by timeline events

    // Add events to timeline in chronological order (already sorted)
    events.forEach((event, index) => {
        const eventItem = document.createElement('div');
        eventItem.className = 'timeline-event';
        eventItem.dataset.index = index;

        // Format date
        const dateStr = formatDate(event.date);

        // Create event type badge
        const eventTypeClass = `event-type event-type-${event.type}`;

        // Create HTML for the event item with numbered markers matching the map
        const evtLocationLine = event.locationName && event.locationName !== 'Unknown' && event.locationName !== 'Unknown Location'
            ? `<div class="event-location">${event.locationName}</div>` : '';
        const evtDateLine = dateStr ? `<span class="event-date">${dateStr}</span>` : '';
        eventItem.innerHTML = `
            <div class="event-number">${index + 1}</div>
            <div class="event-header">
                ${evtDateLine}
                <span class="${eventTypeClass}">${event.type.charAt(0).toUpperCase() + event.type.slice(1)}</span>
            </div>
            ${evtLocationLine}
        `;

        // Make timeline event clickable to highlight the corresponding marker
        eventItem.addEventListener('click', function() {
            // Highlight this event in the timeline
            document.querySelectorAll('.timeline-event').forEach(el => {
                el.classList.remove('highlighted');
            });
            this.classList.add('highlighted');

            // If we have markers stored, highlight the corresponding marker
            if (window.eventMarkersArray && window.eventMarkersArray[index]) {
                const marker = window.eventMarkersArray[index];
                // Center the map on this marker
                if (window.criminalsMapInstance) {
                    window.criminalsMapInstance.setView(marker.getLatLng(), window.criminalsMapInstance.getZoom());
                    // Flash the marker
                    // Create a highlighted version of the icon if possible
                    if (window.markerUtils_createHighlightedMarkerIcon) {
                        const highlightedIcon = window.markerUtils_createHighlightedMarkerIcon(index + 1, event.type);
                        marker.setIcon(highlightedIcon);

                        // Reset after a delay
                        setTimeout(() => {
                            const normalIcon = window.markerUtils_createNumberedMarkerIcon(index + 1, event.type);
                            marker.setIcon(normalIcon);
                        }, 2000);
                    }
                }
            }
        });

        timelineEvents.appendChild(eventItem);
    });
}

/**
 * Initialize the criminal info panel
 */
function initCriminalModal() {
    console.log("Initializing criminal info panel");
    // No need for modal initialization since we're using a fixed panel
}

/**
 * Show criminal details in the info panel
 * @param {string} criminalId - ID of the criminal
 */
function showCriminalDetails(criminalId) {
    console.log("Showing details for criminal:", criminalId);

    // Get the criminal description element (new location)
    const criminalDescription = document.getElementById('criminal-description');

    // Fallback to the old info panel if the new element doesn't exist
    const criminalInfoPanel = document.getElementById('criminal-info');

    // Determine which element to use (prefer the new description element)
    const targetElement = criminalDescription || criminalInfoPanel;

    // We're always in the standalone page context for criminal_journeys.html
    // No need to check for landing page context anymore

    if (!targetElement) {
        console.error("Criminal description element not found");
        return;
    }

    // Make sure the panel is visible
    targetElement.style.display = 'block';

    // Fetch criminal details from static JSON
    fetch('../data/criminals.json')
        .then(response => response.json())
        .then(criminals => {
            const criminal = criminals.find(c => c.id === criminalId);
            
            if (criminal) {
                // Build the HTML for the criminal info
                let infoHTML = `<h3>${criminal.name || 'Unknown Criminal'}</h3>`;
                infoHTML += '<div class="criminal-details">';

                // Create a table-like structure for better formatting
                const details = [];

                if (criminal.alias) {
                    details.push({label: 'Alias', value: criminal.alias});
                }

                if (criminal.birthdate) {
                    details.push({label: 'Birth Date', value: criminal.birthdate});
                }

                if (criminal.birthplace) {
                    details.push({label: 'Birth Place', value: criminal.birthplace});
                }

                if (criminal.prof) {
                    details.push({label: 'Profession', value: criminal.prof});
                }

                if (criminal.nation) {
                    details.push({label: 'Nationality', value: criminal.nation});
                }

                if (criminal.placeofprof) {
                    details.push({label: 'Place of Profession', value: criminal.placeofprof});
                }

                // Add all details with consistent formatting
                details.forEach(detail => {
                    infoHTML += `<div class="criminal-detail"><strong>${detail.label}:</strong> ${detail.value}</div>`;
                });

                infoHTML += '</div>';

                // Set the panel content
                targetElement.innerHTML = infoHTML;
            } else {
                console.log("No criminal found with ID:", criminalId);
                targetElement.innerHTML = '<p>No details found for this criminal.</p>';
            }
        })
        .catch(error => {
            console.error("Error getting criminal:", error);
            targetElement.innerHTML = '<p>Error retrieving criminal details. Please try again.</p>';
        });
}

// These functions are already defined above, so we're removing the duplicates

// These functions are now imported from markerUtils.js

// Clear the criminal journey from the map
function clearCriminalJourney() {
    if (window.criminalJourneyLayer) {
        map.removeLayer(window.criminalJourneyLayer);
        window.criminalJourneyLayer = null;
    }

    // Clear the timeline info panel
    document.getElementById('timeline-events').innerHTML = '';
}

// This function is already defined above, so we're removing the duplicate
