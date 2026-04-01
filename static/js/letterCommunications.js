
console.log("letterCommunications.js loaded");

function openPortraitLightbox(src, name) {
    const lb  = document.getElementById('portrait-lightbox');
    const img = document.getElementById('portrait-lightbox-img');
    const cap = document.getElementById('portrait-lightbox-caption');
    if (!lb || !img) return;
    img.src = src;
    cap.textContent = name || '';
    lb.style.display = '';   // clear any leftover inline style
    lb.classList.add('open');
}

function closePortraitLightbox() {
    const lb = document.getElementById('portrait-lightbox');
    if (lb) lb.classList.remove('open');
}

// Make sure communicationLayer is initialized
let communicationLayer = null;
let allDiplomats = [];
let selectedDiplomatId = null;

// Flow view: store edges and nodes for city click filtering
let flowEdges = [];   // { layer, from, to }
let flowNodes = [];   // { layer, name }
let focusedFlowCity = null;
let flowViewMeta = null;  // { commsCount, cityCount, routeCount } for description updates

// Route drill-down state
let currentFlowComms = [];   // currently rendered comms (used for route letter lookup)
let currentFlowRoutes = {};  // routes object keyed by "from|to"
let focusedRoute = null;     // { from, to } | null

// Cumulative time slider: cached data for fast filtering
let flowAllComms = [];      // all communications
let flowDateRange = null;   // { minTs, maxTs, minStr, maxStr }
let flowCoordMap = {};      // cityName -> { lat, lng } (pre-resolved)

function setFlowTimeSliderVisible(visible) {
    var el = document.getElementById('flow-time-slider-container');
    if (el) el.classList.toggle('hidden', !visible);
}

/**
 * Fetch diplomats for the communications map
 * @param {Object} db - Not used anymore, kept for compatibility
 * @param {L.Map} map - Leaflet map instance
 */
function fetchDiplomats(db, map) {
    console.log("Fetching diplomats for communications map");

    // Get the diplomat selector dropdown
    const diplomatSelector = document.getElementById('diplomat-selector');

    if (!diplomatSelector) {
        console.error("Diplomat selector not found");
        return;
    }

    // Clear any existing options except the first one
    while (diplomatSelector.options.length > 1) {
        diplomatSelector.remove(1);
    }

    // Fetch all diplomats from static JSON
    fetch('/data/diplomats.json')
        .then(response => response.json())
        .then(diplomats => {
            console.log(`Found ${diplomats.length} diplomats from API`);

            allDiplomats = diplomats;

            // Sort diplomats by name
            allDiplomats.sort((a, b) => a.name.localeCompare(b.name));

            // Populate the diplomat selector dropdown
            allDiplomats.forEach(diplomat => {
                const option = document.createElement('option');
                option.value = diplomat.id;
                option.textContent = diplomat.name;
                diplomatSelector.appendChild(option);
            });

            // Add event listener to the diplomat selector
            diplomatSelector.addEventListener('change', function() {
                const diplomatId = this.value;

                // Immediately blur the select element to collapse the dropdown
                this.blur();

                if (diplomatId) {
                    setFlowTimeSliderVisible(false);
                    fetchDiplomatLetters(diplomatId, db, map);
                } else {
                    setFlowTimeSliderVisible(true);
                    showAllCommunicationsFlow(db, map);
                }
            });

            // Show the aggregated flow view on initial load
            setFlowTimeSliderVisible(true);
            showAllCommunicationsFlow(db, map);

            var scrollCloseDropdown = function () {
                if (document.activeElement === diplomatSelector) {
                    diplomatSelector.blur();
                }
            };
            window.addEventListener('scroll', scrollCloseDropdown, { passive: true, capture: true });
        })
        .catch(error => {
            console.error("Error fetching diplomats:", error);
            alert("Error loading diplomat data. Please try again later.");
        });
}
/**
 * Fetch letters for a specific diplomat
 * @param {string} diplomatId - ID of the diplomat
 * @param {Object} db - Not used anymore, kept for compatibility
 * @param {L.Map} map - Leaflet map instance
 */
function fetchDiplomatLetters(diplomatId, db, map) {
    console.log("Fetching letters for diplomat:", diplomatId);

    if (communicationLayer) {
        map.removeLayer(communicationLayer);
    }

    communicationLayer = L.layerGroup().addTo(map);

    const communicationsClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 20,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 14,
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

    communicationLayer.addLayer(communicationsClusterGroup);

    // Get the selected diplomat's information
    const diplomat = allDiplomats.find(d => d.id === diplomatId);
    if (!diplomat) {
        console.error("Selected diplomat not found in allDiplomats array");
        return;
    }

    console.log("Selected diplomat:", diplomat);

    // Fetch all communications from static JSON and filter
    fetch('/data/communications.json')
        .then(response => response.json())
        .then(communications => {
            console.log(`Found ${communications.length} total communications`);

            // Filter communications where diplomat is sender OR receiver
            const letters = communications.filter(comm => {
                // Convert names to IDs for comparison (lowercase with underscores)
                const senderId = comm.sender ? comm.sender.replace(/\s+/g, '_').toLowerCase().replace(/[.,]/g, '') : '';
                const receiverId = comm.receiver ? comm.receiver.replace(/\s+/g, '_').toLowerCase().replace(/[.,]/g, '') : '';

                return senderId === diplomat.id || receiverId === diplomat.id;
            });

            console.log(`Found ${letters.length} letters for diplomat ${diplomat.name}`);

            displayLettersOnMap(letters, diplomatId, map, communicationsClusterGroup);
        })
        .catch(error => {
            console.error("Error fetching letters:", error);
            alert("Error loading letter data. Please try again later.");
        });
}

/**
 * Display letters on the map with arrows between sender and receiver
 * @param {Array} letters - Array of letter data
 * @param {string} diplomatId - ID of the selected diplomat
 * @param {L.Map} map - Leaflet map instance
 * @param {L.MarkerClusterGroup} clusterGroup - Marker cluster group
 */
function displayLettersOnMap(letters, diplomatId, map, clusterGroup) {
    if (letters.length === 0) {
        updateDescriptionBox(`No letters found for this diplomat.`);
        return;
    }

    const diplomat = allDiplomats.find(d => d.id === diplomatId);
    updateDescriptionBox(diplomat);

    const markers = [];

    letters.forEach((letter, index) => {
        if (!letter.sender_location || !letter.receiver_location) return;

        // Get coordinates for sender and receiver
        getLocationCoordinates(letter.sender_location)
            .then(senderCoords => {
                return getLocationCoordinates(letter.receiver_location)
                    .then(receiverCoords => {
                        const sameLocation = (senderCoords.lat === receiverCoords.lat && senderCoords.lng === receiverCoords.lng) ||
                            (Math.abs(senderCoords.lat - receiverCoords.lat) < 0.01 && Math.abs(senderCoords.lng - receiverCoords.lng) < 0.01);

                        const edgeColor = COMM_COLORS[(index + 1) % COMM_COLORS.length];

                        if (sameLocation) {
                            // Determine which end is the selected diplomat to pick portrait & perspective
                            function _nameToId(n) {
                                return (n || '').toLowerCase().replace(/ /g, '_').replace(/\./g, '').replace(/,/g, '');
                            }
                            const slPerspective = _nameToId(letter.sender) === diplomatId ? 'sender' : 'receiver';
                            const slOtherName   = slPerspective === 'sender' ? letter.receiver : letter.sender;
                            const slPortrait    = window.getDiplomatPortrait ? window.getDiplomatPortrait(slOtherName) : null;

                            const singleMarker = L.marker([senderCoords.lat, senderCoords.lng], {
                                icon: createMarkerIcon(slPerspective, index + 1, slPortrait ? slPortrait.image : null),
                                riseOnHover: true,
                                title: letter.sender + ' \u2192 ' + letter.receiver
                            });
                            singleMarker.bindPopup(createPopupContent(letter, slPerspective, true));
                            clusterGroup.addLayer(singleMarker);
                            markers.push(singleMarker);

                            const arrow = createArrow([senderCoords.lat, senderCoords.lng], [senderCoords.lat, senderCoords.lng], letter.type || 'letter', edgeColor);
                            communicationLayer.addLayer(arrow);
                        } else {
                            const pos = _offsetIfSameLocation(
                                senderCoords.lat, senderCoords.lng,
                                receiverCoords.lat, receiverCoords.lng
                            );

                            // Each marker's pin shows the same person as its popup h3
                            const senderPortrait   = window.getDiplomatPortrait ? window.getDiplomatPortrait(letter.sender)   : null;
                            const receiverPortrait = window.getDiplomatPortrait ? window.getDiplomatPortrait(letter.receiver) : null;

                            const senderMarker = L.marker(pos.sender, {
                                icon: createMarkerIcon('sender', index + 1, senderPortrait ? senderPortrait.image : null),
                                riseOnHover: true,
                                title: letter.sender || 'Sender'
                            });
                            const receiverMarker = L.marker(pos.receiver, {
                                icon: createMarkerIcon('receiver', index + 1, receiverPortrait ? receiverPortrait.image : null),
                                riseOnHover: true,
                                title: letter.receiver || 'Receiver'
                            });

                            senderMarker.bindPopup(createPopupContent(letter, 'sender'));
                            receiverMarker.bindPopup(createPopupContent(letter, 'receiver'));

                            clusterGroup.addLayer(senderMarker);
                            clusterGroup.addLayer(receiverMarker);
                            markers.push(senderMarker, receiverMarker);

                            const arrow = createArrow(pos.sender, pos.receiver, letter.type || 'letter', edgeColor);
                            communicationLayer.addLayer(arrow);
                        }

                        // Focus map on markers: center without zooming for single same-location so self-loop is visible
                        if (markers.length > 0) {
                            if (letters.length === 1 && sameLocation) {
                                map.panTo([senderCoords.lat, senderCoords.lng]);
                            } else {
                                const group = L.featureGroup(markers);
                                map.fitBounds(group.getBounds().pad(0.1));
                            }
                        }
                    });
            })
            .catch(error => {
                console.error(`Error getting coordinates for ${letter.sender_location} or ${letter.receiver_location}:`, error);
            });
    });

    // Update communications info panel
    updateCommunicationsInfo(letters);
}

/**
 * Create popup content for a letter
 * @param {Object} letter - Letter data
 * @param {string} perspective - 'sender' or 'receiver'
 * @param {boolean} [useOtherPortrait] - if true, show the other party's portrait (for same-location case)
 * @returns {string} HTML content for popup
 */
function createPopupContent(letter, perspective, useOtherPortrait) {
    const isSender = perspective === 'sender';
    const name = isSender ? letter.sender : letter.receiver;
    const location = isSender ? letter.sender_location : letter.receiver_location;
    const otherName = isSender ? letter.receiver : letter.sender;
    const direction = isSender ? 'To' : 'From';

    const portraitName = useOtherPortrait ? otherName : name;
    const portrait = window.getDiplomatPortrait ? window.getDiplomatPortrait(portraitName) : null;
    const portraitHtml = portrait
        ? `<img class="popup-portrait-img"
               src="${portrait.image}"
               alt="${portrait.name || portraitName || ''}"
               title="Click to enlarge"
               onerror="this.style.display='none'"
               onclick="openPortraitLightbox('${portrait.image.replace(/'/g, "\\'")}', '${(portrait.name || '').replace(/'/g, "\\'")}');">`
        : '';

    // Same-place: h3 + portrait = non-selected diplomat; From/To = selected diplomat's role
    const displayName = useOtherPortrait ? otherName : name;
    const fromToLabel = useOtherPortrait ? (isSender ? 'From' : 'To') : direction;
    const fromToValue = useOtherPortrait ? name : otherName;

    return `
        <div class="marker-popup">
            <h3>${displayName || 'Unknown'}</h3>
            ${portraitHtml}
            <p><strong>Location:</strong> ${location || 'Unknown'}</p>
            <p><strong>${fromToLabel}:</strong> ${fromToValue || 'Unknown'}</p>
            <p><strong>Date:</strong> ${formatDate(letter.date)}</p>
        </div>
    `;
}

/**
 * Update the description box with diplomat information
 * @param {Object|string} content - Diplomat object or message string
 */
function updateDescriptionBox(content) {
    const descriptionElement = document.getElementById('diplomat-description');
    if (!descriptionElement) return;

    if (typeof content === 'string') {
        descriptionElement.innerHTML = `<p>${content}</p>`;
        return;
    }

    // Try to find portrait data for a rich card display
    const portrait = window.getDiplomatPortrait ? window.getDiplomatPortrait(content.name) : null;

    if (portrait) {
        descriptionElement.innerHTML = `
            <div class="diplomat-selected-card">
                <img class="diplomat-selected-portrait"
                     src="${portrait.image}"
                     alt="${portrait.name}"
                     onerror="this.src='static/images/placeholder.jpg'">
                <div class="diplomat-selected-info">
                    <div class="diplomat-selected-name">${portrait.name}</div>
                    <div class="diplomat-selected-title">${portrait.title}</div>
                    <p class="diplomat-selected-bio">${portrait.shortInfo}</p>
                    <small class="diplomat-selected-source">Photo: ${portrait.photoSource}</small>
                </div>
            </div>`;
    } else {
        // Fallback: plain text if no portrait data found
        let description = content.name;
        if (content.title) description += `, ${content.title}`;
        if (content.country) description += ` (${content.country})`;
        descriptionElement.innerHTML = `<p>${description}</p>`;
    }
}

/**
 * Clear the description box
 */
function clearDescriptionBox() {
    const descriptionElement = document.getElementById('diplomat-description');
    if (descriptionElement) {
        descriptionElement.innerHTML = '<p class="initial-message">Select a diplomat to view their communications</p>';
    }
}

/**
 * Fetch all letters and display them on the map
 * @param {Object} db - Not used anymore, kept for compatibility
 * @param {L.Map} map - Leaflet map instance
 */
function fetchAllLetters(db, map) {
    console.log("Fetching all letters for communications map");

    if (communicationLayer) {
        map.removeLayer(communicationLayer);
    }

    communicationLayer = L.layerGroup().addTo(map);

    const communicationsClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 20,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 14,
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

    communicationLayer.addLayer(communicationsClusterGroup);

    // Fetch all letters from static JSON
    fetch('/data/communications.json')
        .then(response => response.json())
        .then(letters => {
            if (letters.length === 0) {
                updateDescriptionBox("No letters found in the database.");
                return;
            }

            updateDescriptionBox("Showing all diplomatic communications");

            const markers = [];

            letters.forEach((letter, index) => {
                if (!letter.sender_location || !letter.receiver_location) return;

                getLocationCoordinates(letter.sender_location)
                    .then(senderCoords => {
                        return getLocationCoordinates(letter.receiver_location)
                            .then(receiverCoords => {
                                const senderLat = senderCoords.lat;
                                const senderLng = senderCoords.lng;
                                const receiverLat = receiverCoords.lat;
                                const receiverLng = receiverCoords.lng;

                                const pos2 = _offsetIfSameLocation(senderLat, senderLng, receiverLat, receiverLng);

                                // Create sender marker
                                const senderMarker = L.marker(pos2.sender, {
                                    icon: createMarkerIcon('sender', index + 1),
                                    riseOnHover: true,
                                    title: letter.sender || 'Sender'
                                });

                                // Create receiver marker
                                const receiverMarker = L.marker(pos2.receiver, {
                                    icon: createMarkerIcon('receiver', index + 1),
                                    riseOnHover: true,
                                    title: letter.receiver || 'Receiver'
                                });

                                // Create popups
                                senderMarker.bindPopup(createPopupContent(letter, 'sender'));
                                receiverMarker.bindPopup(createPopupContent(letter, 'receiver'));

                                // Add markers to cluster group
                                communicationsClusterGroup.addLayer(senderMarker);
                                communicationsClusterGroup.addLayer(receiverMarker);
                                markers.push(senderMarker, receiverMarker);

                                // Create arrow colored to match markers
                                const edgeColor2 = COMM_COLORS[(index + 1) % COMM_COLORS.length];
                                const arrow = createArrow(pos2.sender, pos2.receiver, letter.type || 'letter', edgeColor2);

                                communicationLayer.addLayer(arrow);

                                // Fit map to show all markers
                                if (markers.length > 0) {
                                    const group = L.featureGroup(markers);
                                    map.fitBounds(group.getBounds().pad(0.1));
                                }
                            });
                    });
            });

            // Update communications info panel
            updateCommunicationsInfo(letters);
        })
        .catch(error => {
            console.error("Error fetching all letters:", error);
            alert("Error loading letter data. Please try again later.");
        });
}

/**
 * Fetch all letter communications (alternative to diplomat-specific communications)
 * @param {Object} db - Not used anymore, kept for compatibility
 * @param {L.Map} map - Leaflet map instance
 */
function fetchLetterCommunications(db, map) {
    console.log("Fetching all letter communications");

    // Clear previous communications if any
    if (communicationLayer) {
        map.removeLayer(communicationLayer);
    }

    // Create a new layer group for the communications
    communicationLayer = L.layerGroup().addTo(map);

    // Create a cluster group specifically for the communications
    const communicationsClusterGroup = L.markerClusterGroup({
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

    communicationLayer.addLayer(communicationsClusterGroup);

    // Fetch all communications from static JSON
    fetch('/data/communications.json')
        .then(response => response.json())
        .then(communicationsData => {
            console.log(`Found ${communicationsData.length} communications total`);

            const communications = communicationsData;
            const communicationMarkers = [];
            const communicationMarkersArray = [];

            // Process locations and convert to coordinates
            const locationPromises = [];

            communications.forEach((comm, index) => {
                // Get coordinates for sender location
                const senderPromise = getLocationCoordinates(comm.sender_location)
                    .then(coords => {
                        comm.senderLocation = {
                            latitude: coords.lat,
                            longitude: coords.lng
                        };
                    });

                // Get coordinates for receiver location
                const receiverPromise = getLocationCoordinates(comm.receiver_location)
                    .then(coords => {
                        comm.receiverLocation = {
                            latitude: coords.lat,
                            longitude: coords.lng
                        };
                    });

                locationPromises.push(senderPromise, receiverPromise);
            });

            // Wait for all location conversions to complete
            Promise.all(locationPromises).then(() => {
                // Sort communications by date
                communications.sort((a, b) => {
                    if (!a.date || !b.date) return 0;
                    const aYear = a.date.year || 0, bYear = b.date.year || 0;
                    if (aYear !== bYear) return aYear - bYear;
                    const aMonth = a.date.month || 0, bMonth = b.date.month || 0;
                    if (aMonth !== bMonth) return aMonth - bMonth;
                    return (a.date.day || 0) - (b.date.day || 0);
                });

                // Add markers for each communication
                communications.forEach((comm, index) => {
                    if (!comm.senderLocation || !comm.receiverLocation) return;

                    const senderLat = comm.senderLocation.latitude;
                    const senderLng = comm.senderLocation.longitude;
                    const receiverLat = comm.receiverLocation.latitude;
                    const receiverLng = comm.receiverLocation.longitude;

                    const pos3 = _offsetIfSameLocation(senderLat, senderLng, receiverLat, receiverLng);

                    // Create sender marker
                    const senderMarker = L.marker(pos3.sender, {
                        icon: createMarkerIcon('sender', index + 1),
                        riseOnHover: true,
                        title: comm.sender || 'Sender'
                    });

                    // Create receiver marker
                    const receiverMarker = L.marker(pos3.receiver, {
                        icon: createMarkerIcon('receiver', index + 1),
                        riseOnHover: true,
                        title: comm.receiver || 'Receiver'
                    });

                    // Create popup content
                    const senderPopupContent = createCommunicationPopup(comm, 'sender');
                    senderMarker.bindPopup(senderPopupContent);

                    const receiverPopupContent = createCommunicationPopup(comm, 'receiver');
                    receiverMarker.bindPopup(receiverPopupContent);

                    // Add to cluster group
                    communicationsClusterGroup.addLayer(senderMarker);
                    communicationsClusterGroup.addLayer(receiverMarker);
                    communicationMarkers.push(senderMarker, receiverMarker);
                    communicationMarkersArray.push([senderMarker, receiverMarker]);

                    // Draw arrow between locations
                    const edgeColor3 = COMM_COLORS[(index + 1) % COMM_COLORS.length];
                    const arrow = createArrow(pos3.sender, pos3.receiver, comm.type || 'letter', edgeColor3);

                    communicationLayer.addLayer(arrow);
                });

                // Store markers globally for reference
                window.communicationMarkersArray = communicationMarkersArray;

                // Fit map to show all communications
                if (communicationMarkers.length > 0) {
                    const group = L.featureGroup(communicationMarkers);
                    map.fitBounds(group.getBounds().pad(0.1));
                }

                // Update communications info panel
                updateAllCommunicationsInfo(communications);
            })
            .catch(error => {
                console.error("Error processing locations:", error);
            });
        })
        .catch(error => {
            console.error("Error fetching communications:", error);
            alert("Error loading communications. Please try again later.");
        });
}

/**
 * Create popup content for a communication
 * @param {Object} comm - Communication data
 * @param {string} perspective - 'sender' or 'receiver'
 * @returns {string} HTML content for popup
 */
function createCommunicationPopup(comm, perspective) {
    const isSender = perspective === 'sender';
    const name = isSender ? comm.sender : comm.receiver;
    const location = isSender ? comm.sender_location : comm.receiver_location;
    const otherName = isSender ? comm.receiver : comm.sender;
    const direction = isSender ? 'To' : 'From';

    let dateStr = formatDate(comm.date);

    return `
        <div class="marker-popup">
            <h3>${name || 'Unknown'}</h3>
            <p><strong>Location:</strong> ${location || 'Unknown'}</p>
            <p><strong>${direction}:</strong> ${otherName || 'Unknown'}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
        </div>
    `;
}

/**
 * Update communications info panel with all communications
 * @param {Array} communications - Array of communication objects
 */
function updateAllCommunicationsInfo(communications) {
    const infoElement = document.getElementById('communications-events');
    if (!infoElement) return;

    infoElement.innerHTML = '';

    if (communications.length === 0) {
        infoElement.innerHTML = '<p>No communications found.</p>';
        return;
    }

    // Sort communications by date
    communications.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.seconds - b.date.seconds;
    });

    // Limit to most recent 20 communications
    const recentCommunications = communications.slice(0, 20);

    recentCommunications.forEach(comm => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';

        let dateStr = 'Unknown Date';
        if (comm.date) {
            if (comm.date.toDate) {
                // Firestore Timestamp
                const date = comm.date.toDate();
                dateStr = date.toLocaleDateString();
            } else if (typeof comm.date === 'string') {
                // String date
                dateStr = comm.date;
            }
        }

        eventItem.innerHTML = `
            <div class="event-date">${dateStr}</div>
            <div class="event-content">
                <p><strong>From:</strong> ${comm.sender || 'Unknown'}</p>
                <p><strong>To:</strong> ${comm.receiver || 'Unknown'}</p>
            </div>
        `;

        infoElement.appendChild(eventItem);
    });
}

/**
 * Format a Firestore timestamp for display
 * @param {Object} timestamp - Firestore timestamp
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';

    try {
        let date;
        if (timestamp.toDate) {
            date = timestamp.toDate();
        } else {
            // Normalize "YYYY-MM-DD HH:MM:SS" (Pandas str output) to ISO "YYYY-MM-DDTHH:MM:SS"
            const normalized = String(timestamp).trim().replace(' ', 'T');
            date = new Date(normalized);
        }
        if (isNaN(date.getTime())) return String(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return String(timestamp);
    }
}

/**
 * Create a marker icon based on type
 * @param {string} type - 'sender' or 'receiver'
 * @param {number} index - Index number for the marker
 * @returns {L.DivIcon} Leaflet div icon
 */
const COMM_COLORS = ['#FF0000', '#0055FF', '#00BB00', '#FF8800', '#AA00DD', '#DD0066', '#008888', '#BB5500'];

function createMarkerIcon(type, index, portraitUrl) {
    const color = COMM_COLORS[index % COMM_COLORS.length];

    if (portraitUrl) {
        return L.divIcon({
            html: `<div class="marker-portrait-icon marker-${type}" style="border-color: ${color};">
                       <img src="${portraitUrl}" alt=""
                            onerror="this.style.display='none'; this.parentElement.classList.add('marker-portrait-fallback');"
                            style="width:100%;height:100%;object-fit:cover;object-position:top;display:block;">
                   </div>`,
            className: 'custom-marker',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
    }

    return L.divIcon({
        html: `<div class="marker-icon marker-${type}" style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: block; box-shadow: 0 0 0 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.5); border: 2px solid #fff;"></div>`,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

/**
 * Build a curved path between two points.
 * When start ≈ end (same city), draws a visible teardrop loop above the point.
 * Otherwise uses a quadratic Bezier with a perpendicular offset.
 */
function _curvedLatLngs(start, end, bendFactor) {
    if (bendFactor === undefined) bendFactor = 0.3;

    var dLat = end[0] - start[0];
    var dLng = end[1] - start[1];
    var dist = Math.sqrt(dLat * dLat + dLng * dLng);

    // Same-location case: draw a teardrop loop
    if (dist < 0.05) {
        var r = 0.8;
        var pts = [];
        var steps = 50;
        var cx = start[1];
        var cy = start[0] + r * 0.5;
        for (var i = 0; i <= steps; i++) {
            var angle = (Math.PI * 2 * i) / steps - Math.PI / 2;
            var rx = r * 0.5;
            var ry = r;
            pts.push([cy + ry * Math.sin(angle), cx + rx * Math.cos(angle)]);
        }
        return pts;
    }

    var midLat = (start[0] + end[0]) / 2;
    var midLng = (start[1] + end[1]) / 2;
    var ctrlLat = midLat + dLng * bendFactor;
    var ctrlLng = midLng - dLat * bendFactor;

    var pts = [];
    var steps = 30;
    for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * ctrlLat + t * t * end[0];
        var lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * ctrlLng + t * t * end[1];
        pts.push([lat, lng]);
    }
    return pts;
}

/**
 * For same-location letters, nudge sender/receiver coords apart so
 * markers don't perfectly overlap. Returns adjusted [lat, lng].
 */
function _offsetIfSameLocation(senderLat, senderLng, receiverLat, receiverLng) {
    var dLat = Math.abs(senderLat - receiverLat);
    var dLng = Math.abs(senderLng - receiverLng);
    if (dLat < 0.01 && dLng < 0.01) {
        return {
            sender:   [senderLat + 0.06,  senderLng - 0.06],
            receiver: [receiverLat - 0.06, receiverLng + 0.06]
        };
    }
    return {
        sender:   [senderLat, senderLng],
        receiver: [receiverLat, receiverLng]
    };
}

/**
 * Create a directed, curved arrow between two points with animated dashes.
 * @param {Array}  start      - Start coordinates [lat, lng]
 * @param {Array}  end        - End coordinates [lat, lng]
 * @param {string} type       - Type of communication ('letter' | 'telegram')
 * @param {string} [edgeColor] - Optional explicit color; falls back to type-based default
 * @returns {L.LayerGroup} Layer group containing the curved line + arrowhead
 */
function createArrow(start, end, type, edgeColor) {
    var arrowLayer = L.layerGroup();
    var color = edgeColor || (type === 'telegram' ? '#9b59b6' : '#c0392b');

    var curvedPts = _curvedLatLngs(start, end, 0.25);

    var line = L.polyline(curvedPts, {
        color: color,
        weight: 3.5,
        opacity: 0.9,
        dashArray: '10 7',
        lineCap: 'round'
    });
    arrowLayer.addLayer(line);

    // Animate the dash offset so dashes "flow" from sender to receiver
    var offset = 0;
    var lineEl = null;
    line.on('add', function () {
        lineEl = line.getElement();
        if (lineEl) {
            lineEl.style.transition = 'none';
            (function tick() {
                if (!lineEl || !lineEl.isConnected) return;
                offset = (offset - 0.6) % 28;
                lineEl.style.strokeDashoffset = offset;
                requestAnimationFrame(tick);
            })();
        }
    });

    // Arrowhead at the destination via polylineDecorator (if available)
    if (L.polylineDecorator) {
        var decorator = L.polylineDecorator(line, {
            patterns: [{
                offset: '95%',
                repeat: 0,
                symbol: L.Symbol.arrowHead({
                    pixelSize: 15,
                    polygon: true,
                    pathOptions: { fillOpacity: 1, weight: 1, color: '#fff', fillColor: color }
                })
            }]
        });
        arrowLayer.addLayer(decorator);
    }

    return arrowLayer;
}

/**
 * Update communications info panel with letters for a specific diplomat
 * @param {Array} letters - Array of letter objects
 */
function updateCommunicationsInfo(letters) {
    const infoElement = document.getElementById('communications-events');
    if (!infoElement) return;

    infoElement.innerHTML = '';

    if (letters.length === 0) {
        infoElement.innerHTML = '<p>No communications found for this diplomat.</p>';
        return;
    }

    // Sort letters by date
    letters.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        if (typeof a.date === 'string' && typeof b.date === 'string') {
            return a.date.localeCompare(b.date);
        }
        return a.date.seconds - b.date.seconds;
    });

    letters.forEach((letter, index) => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';

        // Format date directly here instead of using formatDate function
        let dateStr = 'Unknown Date';
        if (letter.date) {
            if (letter.date.toDate) {
                // Firestore Timestamp
                const date = letter.date.toDate();
                dateStr = date.toLocaleDateString();
            } else if (typeof letter.date === 'string') {
                // String date
                dateStr = letter.date;
            }
        }

        const fromName = letter.sender || 'Unknown';
        const toName = letter.receiver || 'Unknown';

        eventItem.innerHTML = `
            <div class="event-date">${dateStr}</div>
            <div class="event-content">
                <p>${fromName} &rarr; ${toName}</p>
            </div>
        `;

        infoElement.appendChild(eventItem);
    });
}

/**
 * Get coordinates for a location name
 * @param {string} locationName - Name of the location
 * @returns {Promise<Object>} Promise resolving to {lat, lng} object
 */
function getLocationCoordinates(locationName) {
    // Initialize cache if not exists
    if (!window.locationCoordinates) {
        window.locationCoordinates = {};
    }

    // Return from cache if available
    if (window.locationCoordinates[locationName]) {
        return Promise.resolve(window.locationCoordinates[locationName]);
    }

    // Use a geocoding service to get coordinates
    // Expanded mapping of all locations found in Excel files
    const locationMap = {
        'Istanbul': { lat: 41.0082, lng: 28.9784 },
        'Turin': { lat: 45.0703, lng: 7.6869 },
        'Paris': { lat: 48.8566, lng: 2.3522 },
        'London': { lat: 51.5074, lng: -0.1278 },
        'Vienna': { lat: 48.2082, lng: 16.3738 },
        'Rome': { lat: 41.9028, lng: 12.4964 },
        'Berlin': { lat: 52.5200, lng: 13.4050 },
        'Moscow': { lat: 55.7558, lng: 37.6173 },
        'Athens': { lat: 37.9838, lng: 23.7275 },
        'Cairo': { lat: 30.0444, lng: 31.2357 },
        'Genoa': { lat: 44.4056, lng: 8.9463 },
        'Naples': { lat: 40.8518, lng: 14.2681 },
        'Venice': { lat: 45.4408, lng: 12.3155 },
        'Syros': { lat: 37.4500, lng: 24.9167 },
        'Bologna': { lat: 44.4949, lng: 11.3426 },
        'Alexandria': { lat: 31.2001, lng: 29.9187 },
        'Brescia': { lat: 45.5416, lng: 10.2118 },
        'Corfou': { lat: 39.6243, lng: 19.9217 },
        'Corfu': { lat: 39.6243, lng: 19.9217 },
        'Crimea': { lat: 45.3383, lng: 34.2000 },
        'Livorno': { lat: 43.5500, lng: 10.3167 },
        'Malta': { lat: 35.9375, lng: 14.3754 },
        'Mecklenburg': { lat: 53.6288, lng: 12.2925 },
        'Messina': { lat: 38.1938, lng: 15.5540 },
        'Moncalvo': { lat: 45.0533, lng: 8.2667 },
        'Sardinia': { lat: 40.1209, lng: 9.0129 },
        'Sassari': { lat: 40.7259, lng: 8.5557 },
        'Scutari': { lat: 41.0082, lng: 29.0082 },
        'Üsküdar': { lat: 41.0082, lng: 29.0082 },
        'Sweden': { lat: 59.3293, lng: 18.0686 },  // Stockholm
        'Trieste': { lat: 45.6495, lng: 13.7768 },
        'Wurtemberg': { lat: 48.7758, lng: 9.1829 },  // Stuttgart
        'Würtemberg': { lat: 48.7758, lng: 9.1829 },
        'Milan': { lat: 45.4642, lng: 9.1900 },
        'Ithaca Island': { lat: 38.3650, lng: 20.7183 },
        'Schwerin': { lat: 53.6355, lng: 11.4012 },
        'Historical Peninsula': { lat: 41.0082, lng: 28.9784 }  // Istanbul
    };

    // Check if we have the location in our map
    if (locationMap[locationName]) {
        // Cache the result
        window.locationCoordinates[locationName] = locationMap[locationName];
        return Promise.resolve(locationMap[locationName]);
    }

    // If not in our map, return a default location and log a warning
    console.warn(`Location not found in map: ${locationName}. Using default coordinates.`);
    const defaultCoords = { lat: 41.0082, lng: 28.9784 }; // Istanbul as default
    window.locationCoordinates[locationName] = defaultCoords;
    return Promise.resolve(defaultCoords);
}

// ── Proportional flow map (default "all communications" view) ──────────

const CITY_COLORS = {
    'Istanbul':  '#E53935',
    'Turin':     '#1565C0',
    'Paris':     '#8E24AA',
    'Naples':    '#EF6C00',
    'Bologna':   '#2E7D32',
    'Genoa':     '#00838F',
    'Venice':    '#AD1457',
    'Sardinia':  '#4E342E',
    'Syros':     '#00ACC1',
    'Milan':     '#D84315',
    'Messina':   '#0277BD',
    'London':    '#6A1B9A',
    'Vienna':    '#9E9D24',
    'Rome':      '#C62828',
    'Berlin':    '#283593',
    'Athens':    '#00695C',
    'Cairo':     '#FF8F00',
    'Trieste':   '#4527A0',
    'Malta':     '#558B2F',
    'Brescia':   '#BF360C'
};

var _fallbackPalette = [
    '#D81B60', '#5E35B1', '#039BE5', '#00897B', '#C0CA33',
    '#FFB300', '#F4511E', '#3949AB', '#1E88E5', '#43A047'
];
var _fallbackIdx = 0;

function _cityColor(name) {
    if (CITY_COLORS[name]) return CITY_COLORS[name];
    CITY_COLORS[name] = _fallbackPalette[_fallbackIdx % _fallbackPalette.length];
    _fallbackIdx++;
    return CITY_COLORS[name];
}

/**
 * Create a proportional flow arrow between two cities.
 * weight and arrowhead scale with count.
 * @param {Array} start - [lat, lng]
 * @param {Array} end - [lat, lng]
 * @param {number} count - letter count
 * @param {string} color - line color
 * @param {string} fromName - source city name
 * @param {string} toName - destination city name
 */
function createFlowArrow(start, end, count, color, fromName, toName, onClick) {
    var arrowLayer = L.layerGroup();
    var w = Math.min(2 + Math.sqrt(count) * 2.5, 16);

    var curvedPts = _curvedLatLngs(start, end, 0.25);

    var line = L.polyline(curvedPts, {
        color: color,
        weight: w,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
    });
    arrowLayer.addLayer(line);

    // Arrowhead sized with edge
    if (L.polylineDecorator) {
        var headSize = Math.min(8 + count * 0.8, 22);
        var decorator = L.polylineDecorator(line, {
            patterns: [{
                offset: '95%',
                repeat: 0,
                symbol: L.Symbol.arrowHead({
                    pixelSize: headSize,
                    polygon: true,
                    pathOptions: { fillOpacity: 1, weight: 1, color: '#fff', fillColor: color }
                })
            }]
        });
        arrowLayer.addLayer(decorator);
    }

    // Count badge at the midpoint of the curve
    var midIdx = Math.floor(curvedPts.length / 2);
    var badgePos = curvedPts[midIdx];
    var badge = L.marker(badgePos, {
        icon: L.divIcon({
            html: '<span class="flow-count-badge" style="background:' + color + ';">' + count + '</span>',
            className: 'flow-count-badge-wrapper',
            iconSize: [30, 20],
            iconAnchor: [15, 10]
        }),
        interactive: false
    });
    arrowLayer.addLayer(badge);

    // Route label and letter count for tooltip
    var routeLabel = (fromName && toName) ? fromName + ' &rarr; ' + toName : '';
    var letterLabel = count + ' letter' + (count > 1 ? 's' : '');

    if (typeof onClick === 'function') {
        // When a click handler is provided: clicking navigates to the route letters panel
        // (tooltip on hover still works; popup is replaced by panel navigation)
        line.bindTooltip(
            routeLabel + ' (' + letterLabel + ') — click to view',
            { permanent: false, direction: 'center', className: 'flow-edge-tooltip' }
        );
        line.on('click', function (e) {
            L.DomEvent.stopPropagation(e);
            onClick();
        });
        line.getElement && line.on('mouseover', function () {
            line.setStyle({ opacity: 1, weight: w + 2 });
        });
        line.on('mouseout', function () {
            line.setStyle({ opacity: 0.8, weight: w });
        });
    } else {
        var popupContent = '<div class="flow-city-popup">' +
            (routeLabel ? '<h4>' + routeLabel + '</h4>' : '') +
            '<p><strong>' + letterLabel + '</strong></p>' +
        '</div>';
        line.bindPopup(popupContent);
        line.bindTooltip(routeLabel + ' (' + letterLabel + ')', { permanent: false, direction: 'center', className: 'flow-edge-tooltip' });
    }

    return arrowLayer;
}

/**
 * Apply the current focus filter to the flow view.
 * Priority: focusedRoute (single route) > focusedFlowCity (city focus) > all.
 */
function applyFlowViewFilter() {
    if (!communicationLayer || flowEdges.length === 0) return;

    communicationLayer.clearLayers();

    if (focusedRoute !== null) {
        // Show only the single selected route and its two endpoint cities
        flowEdges.forEach(function (e) {
            if (e.from === focusedRoute.from && e.to === focusedRoute.to) {
                communicationLayer.addLayer(e.layer);
            }
        });
        flowNodes.forEach(function (n) {
            if (n.name === focusedRoute.from || n.name === focusedRoute.to) {
                communicationLayer.addLayer(n.layer);
            }
        });
    } else if (focusedFlowCity === null) {
        flowEdges.forEach(function (e) { communicationLayer.addLayer(e.layer); });
        flowNodes.forEach(function (n) { communicationLayer.addLayer(n.layer); });
        if (flowViewMeta) {
            updateDescriptionBox(
                'Showing all <strong>' + flowViewMeta.commsCount + '</strong> communications across <strong>' +
                flowViewMeta.cityCount + '</strong> cities and <strong>' +
                flowViewMeta.routeCount + '</strong> routes. Click a city to focus on its connections.'
            );
        }
    } else {
        var visibleCities = {};
        var visibleEdgeCount = 0;
        flowEdges.forEach(function (e) {
            if (e.from === focusedFlowCity || e.to === focusedFlowCity) {
                communicationLayer.addLayer(e.layer);
                visibleCities[e.from] = true;
                visibleCities[e.to] = true;
                visibleEdgeCount++;
            }
        });
        flowNodes.forEach(function (n) {
            if (visibleCities[n.name]) {
                communicationLayer.addLayer(n.layer);
            }
        });
        var visibleNodeCount = Object.keys(visibleCities).length;
        updateDescriptionBox(
            'Focused on <strong>' + focusedFlowCity + '</strong>: ' +
            visibleNodeCount + ' connected cities, ' + visibleEdgeCount + ' routes. Click ' + focusedFlowCity + ' again to show all.'
        );
    }
}

/**
 * Show letters for a specific route in the panel and highlight that route on the map.
 * @param {string} from - Sender city name
 * @param {string} to   - Receiver city name
 */
function showRouteLetters(from, to) {
    focusedRoute = { from: from, to: to };
    applyFlowViewFilter();

    var backBtn = document.getElementById('panel-back-btn');
    if (backBtn) backBtn.style.display = 'block';

    var infoEl = document.getElementById('communications-events');
    if (!infoEl) return;

    var letters = currentFlowComms.filter(function (c) {
        return (c.sender_location || '').trim() === from &&
               (c.receiver_location || '').trim() === to;
    });

    letters.sort(function (a, b) {
        if (typeof a.date === 'string' && typeof b.date === 'string') {
            return a.date.localeCompare(b.date);
        }
        return 0;
    });

    infoEl.innerHTML = '<div class="route-letters-header">' +
        '<span style="color:' + _cityColor(from) + ';">' + from + '</span>' +
        ' &rarr; ' + to +
        ' <span class="route-letters-count">(' + letters.length + ' letter' + (letters.length !== 1 ? 's' : '') + ')</span>' +
        '</div>';

    if (letters.length === 0) {
        infoEl.innerHTML += '<p style="font-size:12px;color:#888;">No letters found for this route.</p>';
        return;
    }

    letters.forEach(function (letter) {
        var dateStr = 'Unknown date';
        if (letter.date && typeof letter.date === 'string') {
            var d = new Date(letter.date);
            if (!isNaN(d.getTime())) {
                dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            } else {
                dateStr = letter.date;
            }
        }
        var item = document.createElement('div');
        item.className = 'event-item letter-item';
        item.innerHTML =
            '<div class="event-date">' + dateStr + '</div>' +
            '<div class="event-content">' +
                '<p>' + (letter.sender || '—') + ' &rarr; ' + (letter.receiver || '—') + '</p>' +
            '</div>';
        infoEl.appendChild(item);
    });
}

/**
 * Restore the general route list view in the panel and reset the map route highlight.
 */
function showGeneralPanel() {
    focusedRoute = null;
    applyFlowViewFilter();

    var backBtn = document.getElementById('panel-back-btn');
    if (backBtn) backBtn.style.display = 'none';

    var infoEl = document.getElementById('communications-events');
    if (!infoEl) return;

    var routeKeys = Object.keys(currentFlowRoutes).sort(function (a, b) {
        return currentFlowRoutes[b].count - currentFlowRoutes[a].count;
    });

    infoEl.innerHTML = '';
    routeKeys.slice(0, 15).forEach(function (key) {
        var route = currentFlowRoutes[key];
        var item = document.createElement('div');
        item.className = 'event-item route-item';
        item.innerHTML =
            '<div class="event-date" style="color:' + _cityColor(route.from) + ';">' +
                route.count + ' letter' + (route.count > 1 ? 's' : '') +
            '</div>' +
            '<div class="event-content">' +
                '<p>' + route.from + ' &rarr; ' + route.to + '</p>' +
            '</div>';
        (function (from, to) {
            item.addEventListener('click', function () {
                showRouteLetters(from, to);
            });
        }(route.from, route.to));
        infoEl.appendChild(item);
    });
}

/**
 * Parse date string to timestamp. Returns null if invalid.
 * Handles YYYY-MM-DD and DD.MM.YYYY formats.
 */
function _parseDateTs(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    var s = dateStr.trim();
    if (!s) return null;
    var d = new Date(s);
    if (!isNaN(d.getTime())) return d.getTime();
    // Fallback: DD.MM.YYYY
    if (s.indexOf('.') !== -1) {
        var parts = s.split('.');
        if (parts.length === 3) {
            var day = parseInt(parts[0], 10);
            var month = parseInt(parts[1], 10) - 1;
            var year = parseInt(parts[2], 10);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                d = new Date(year, month, day);
                return isNaN(d.getTime()) ? null : d.getTime();
            }
        }
    }
    return null;
}

/**
 * Format timestamp to YYYY-MM-DD for date input.
 */
function _tsToDateStr(ts) {
    var d = new Date(ts);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

/**
 * Build flow view from a filtered list of communications.
 * Uses pre-resolved flowCoordMap. Updates flowEdges, flowNodes, flowViewMeta.
 */
function buildFlowFromFilteredComms(comms, map) {
    var routes = {};
    var cities = {};

    comms.forEach(function (c) {
        var from = (c.sender_location || '').trim();
        var to   = (c.receiver_location || '').trim();
        if (!from || !to) return;

        var key = from + '|' + to;
        if (!routes[key]) routes[key] = { from: from, to: to, count: 0 };
        routes[key].count++;

        if (!cities[from]) cities[from] = { sent: 0, received: 0 };
        if (!cities[to])   cities[to]   = { sent: 0, received: 0 };
        cities[from].sent++;
        cities[to].received++;
    });

    var allCityNames = Object.keys(cities);
    var routeKeys = Object.keys(routes);
    routeKeys.sort(function (a, b) { return routes[b].count - routes[a].count; });

    focusedFlowCity = null;
    flowEdges = [];
    flowNodes = [];

    routeKeys.forEach(function (key) {
        var route = routes[key];
        var fromCoord = flowCoordMap[route.from];
        var toCoord   = flowCoordMap[route.to];
        if (!fromCoord || !toCoord) return;

        var color = _cityColor(route.from);
        var arrow = createFlowArrow(
            [fromCoord.lat, fromCoord.lng],
            [toCoord.lat,   toCoord.lng],
            route.count,
            color,
            route.from,
            route.to,
            (function (from, to) {
                return function () {
                    if (focusedRoute && focusedRoute.from === from && focusedRoute.to === to) {
                        showGeneralPanel();
                    } else {
                        showRouteLetters(from, to);
                    }
                };
            }(route.from, route.to))
        );
        flowEdges.push({ layer: arrow, from: route.from, to: route.to });
    });

    var maxVol = 1;
    allCityNames.forEach(function (name) {
        var vol = cities[name].sent + cities[name].received;
        if (vol > maxVol) maxVol = vol;
    });

    allCityNames.forEach(function (name) {
        var c = flowCoordMap[name];
        if (!c) return;
        var vol = cities[name].sent + cities[name].received;
        var radius = Math.sqrt(vol / maxVol) * 22 + 6;

        var marker = L.circleMarker([c.lat, c.lng], {
            radius: radius,
            fillColor: _cityColor(name),
            color: '#fff',
            weight: 2.5,
            fillOpacity: 0.85,
            className: 'flow-city-marker leaflet-interactive'
        });
        marker.bindPopup(
            '<div class="flow-city-popup">' +
                '<h4>' + name + '</h4>' +
                '<p>Sent: <strong>' + cities[name].sent + '</strong></p>' +
                '<p>Received: <strong>' + cities[name].received + '</strong></p>' +
                '<p>Total: <strong>' + vol + '</strong></p>' +
                '<p class="flow-click-hint">Click to focus on this city\'s connections</p>' +
            '</div>'
        );
        marker.bindTooltip(name, { permanent: true, direction: 'top', offset: [0, -radius], className: 'flow-city-label' });

        marker.on('click', function () {
            if (focusedFlowCity === name) {
                focusedFlowCity = null;
            } else {
                focusedFlowCity = name;
            }
            applyFlowViewFilter();
        });

        flowNodes.push({ layer: marker, name: name });
    });

    // Save current state for drill-down
    currentFlowComms = comms;
    currentFlowRoutes = routes;
    focusedRoute = null;

    // Hide back button when rebuilding the general view
    var backBtn = document.getElementById('panel-back-btn');
    if (backBtn) backBtn.style.display = 'none';

    flowViewMeta = { commsCount: comms.length, cityCount: allCityNames.length, routeCount: routeKeys.length };
    applyFlowViewFilter();

    var infoEl = document.getElementById('communications-events');
    if (infoEl) {
        infoEl.innerHTML = '';
        routeKeys.slice(0, 15).forEach(function (key) {
            var route = routes[key];
            var item = document.createElement('div');
            item.className = 'event-item route-item';
            item.innerHTML =
                '<div class="event-date" style="color:' + _cityColor(route.from) + ';">' +
                    route.count + ' letter' + (route.count > 1 ? 's' : '') +
                '</div>' +
                '<div class="event-content">' +
                    '<p>' + route.from + ' &rarr; ' + route.to + '</p>' +
                '</div>';
            (function (from, to) {
                item.addEventListener('click', function () {
                    showRouteLetters(from, to);
                });
            }(route.from, route.to));
            infoEl.appendChild(item);
        });
    }
}

/**
 * Filter comms by cumulative cutoff date.
 * cutoffDateStr: YYYY-MM-DD, or null for "all time".
 * Comms without valid date are included only when showing all.
 */
function getCommsUpToCutoffDate(cutoffDateStr) {
    if (!flowDateRange) return flowAllComms;
    if (!cutoffDateStr || cutoffDateStr >= flowDateRange.maxDateStr) return flowAllComms;

    var cutoffTs = _parseDateTs(cutoffDateStr);
    if (cutoffTs === null) return flowAllComms;

    return flowAllComms.filter(function (c) {
        var ts = _parseDateTs(c.date);
        if (ts === null) return false;
        return ts <= cutoffTs;
    });
}

/**
 * Show an aggregated flow view of all communications.
 * One edge per city-pair, thickness ∝ letter count.
 * City markers sized by total volume.
 * Supports cumulative time slider.
 */
function showAllCommunicationsFlow(db, map) {
    console.log('showAllCommunicationsFlow called');

    if (communicationLayer) {
        map.removeLayer(communicationLayer);
    }
    communicationLayer = L.layerGroup().addTo(map);

    fetch('/data/communications.json')
        .then(function (r) { return r.json(); })
        .then(function (comms) {
            if (!comms || comms.length === 0) {
                updateDescriptionBox('No communications found.');
                return;
            }

            flowAllComms = comms;

            var datesWithTs = comms.map(function (c) { return _parseDateTs(c.date); }).filter(Boolean);
            if (datesWithTs.length === 0) {
                var fallbackTs = Date.now();
                var fallbackStr = _tsToDateStr(fallbackTs);
                flowDateRange = { minTs: fallbackTs, maxTs: fallbackTs, minDateStr: fallbackStr, maxDateStr: fallbackStr, totalDays: 1, minStr: '—', maxStr: '—' };
            } else {
                var minTs = Math.min.apply(null, datesWithTs);
                var maxTs = Math.max.apply(null, datesWithTs);
                var minDateStr = _tsToDateStr(minTs);
                var maxDateStr = _tsToDateStr(maxTs);
                var totalDays = Math.max(1, Math.ceil((maxTs - minTs) / (24 * 60 * 60 * 1000)));
                flowDateRange = {
                    minTs: minTs,
                    maxTs: maxTs,
                    minDateStr: minDateStr,
                    maxDateStr: maxDateStr,
                    totalDays: totalDays,
                    minStr: new Date(minTs).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
                    maxStr: new Date(maxTs).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                };
            }

            var allCities = {};
            comms.forEach(function (c) {
                var from = (c.sender_location || '').trim();
                var to = (c.receiver_location || '').trim();
                if (from) allCities[from] = true;
                if (to) allCities[to] = true;
            });
            var cityNames = Object.keys(allCities);
            var coordPromises = cityNames.map(function (name) {
                return getLocationCoordinates(name).then(function (coords) {
                    return { name: name, coords: coords };
                });
            });

            Promise.all(coordPromises).then(function (resolved) {
                flowCoordMap = {};
                resolved.forEach(function (r) { flowCoordMap[r.name] = r.coords; });

                var initialComms = getCommsUpToCutoffDate(null);
                buildFlowFromFilteredComms(initialComms, map);

                var allPts = resolved.map(function (r) { return [r.coords.lat, r.coords.lng]; });
                if (allPts.length > 0) {
                    map.fitBounds(L.latLngBounds(allPts).pad(0.15));
                }

                var slider = document.getElementById('flow-time-slider');
                var display = document.getElementById('flow-time-display');

                function applyTimeFilterAndUpdateMap(cutoffDateStr) {
                    var filtered = getCommsUpToCutoffDate(cutoffDateStr);
                    buildFlowFromFilteredComms(filtered, map);
                    if (map && map.invalidateSize) map.invalidateSize();
                }

                if (slider && display && flowDateRange.totalDays > 0 && flowDateRange.minDateStr) {
                    slider.min = 0;
                    slider.max = flowDateRange.totalDays;
                    slider.step = 1;
                    slider.value = flowDateRange.totalDays;

                    display.textContent = 'All time (' + flowDateRange.minStr + ' – ' + flowDateRange.maxStr + ')';

                    slider.oninput = slider.onchange = function () {
                        var val = parseInt(slider.value, 10);
                        var cutoffTs = flowDateRange.minTs + (flowDateRange.maxTs - flowDateRange.minTs) * (val / flowDateRange.totalDays);
                        var cutoffDateStr = _tsToDateStr(cutoffTs);

                        display.textContent = val >= flowDateRange.totalDays
                            ? 'All time (' + flowDateRange.minStr + ' – ' + flowDateRange.maxStr + ')'
                            : 'Up to ' + new Date(cutoffTs).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

                        applyTimeFilterAndUpdateMap(cutoffDateStr);
                    };
                }
            });
        })
        .catch(function (err) {
            console.error('Error loading flow view:', err);
        });
}

/**
 * Direct initialization function for testing
 */
function initLetterCommunications() {
    console.log("Manual initialization of letter communications");
    if (window.db && window.communicationsMapInstance) {
        console.log("DB and map instance found, calling fetchDiplomats");
        fetchDiplomats(window.db, window.communicationsMapInstance);
    } else {
        console.error("Missing DB or map instance:", {
            db: !!window.db,
            map: !!window.communicationsMapInstance
        });
    }
}

// Make the function globally available
window.initLetterCommunications = initLetterCommunications;

// Wire up back button once DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    var backBtn = document.getElementById('panel-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            showGeneralPanel();
        });
    }
});

