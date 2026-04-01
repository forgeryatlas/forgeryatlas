// Ottoman Crime Network Map - Main Initialization Module

document.addEventListener('DOMContentLoaded', function() {
    // Initialize both maps
    const eventsMap = L.map('events-map', {
        zoomControl: false,
        attributionControl: false
    }).setView([41.0, 29.0], 6);

    const criminalsMap = L.map('criminals-map', {
        zoomControl: false,
        attributionControl: false
    }).setView([41.0, 29.0], 6);

    // Add tile layers to both maps
    const tileLayer = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    L.tileLayer(tileLayer, {
        attribution: attribution,
        maxZoom: 19,
        className: 'historical-map-tiles'
    }).addTo(eventsMap);

    L.tileLayer(tileLayer, {
        attribution: attribution,
        maxZoom: 19,
        className: 'historical-map-tiles'
    }).addTo(criminalsMap);

    // Add zoom controls to both maps
    L.control.zoom({
        position: 'topright'
    }).addTo(eventsMap);

    L.control.zoom({
        position: 'topright'
    }).addTo(criminalsMap);

    // Initialize time slider for events map
    const timeSlider = document.getElementById('time-slider');
    noUiSlider.create(timeSlider, {
        start: 1854,
        connect: 'lower',
        step: 1,
        range: {
            'min': 1854,
            'max': 1900
        },
        format: {
            to: function (value) {
                return Math.round(value);
            },
            from: function (value) {
                return Math.round(value);
            }
        },
        pips: {
            mode: 'positions',
            values: [0, 25, 50, 75, 100],
            density: 4,
            format: {
                to: function (value) {
                    return Math.round(value);
                }
            }
        }
    });

    // Initialize Ottoman borders for both maps
    initBorders(eventsMap, 'toggle-borders-events');
    initBorders(criminalsMap, 'toggle-borders-criminals');

    // Initialize criminal modal
    initCriminalModal();

    // Fetch data for both maps
    fetchMarkers(eventsMap);
    fetchCriminals(criminalsMap);

    // Tab switching functionality
    const mapTabs = document.querySelectorAll('.map-tab');
    const mapViews = document.querySelectorAll('.map-view');

    mapTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and views
            mapTabs.forEach(t => t.classList.remove('active'));
            mapViews.forEach(v => v.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');

            // Show corresponding view
            const mapType = this.getAttribute('data-map');
            document.getElementById(`${mapType}-view`).classList.add('active');

            // Invalidate size to fix rendering issues when switching tabs
            if (mapType === 'events') {
                eventsMap.invalidateSize();
            } else {
                criminalsMap.invalidateSize();
            }
        });
    });

    // Reset view buttons
    document.getElementById('reset-view-events').addEventListener('click', function() {
        eventsMap.setView([41.0, 29.0], 6);
        timeSlider.noUiSlider.set(1854);
    });

    document.getElementById('reset-view-criminals').addEventListener('click', function() {
        criminalsMap.setView([41.0, 29.0], 6);
    });

    // Handle window resize for both maps
    window.addEventListener('resize', function() {
        eventsMap.invalidateSize();
        criminalsMap.invalidateSize();
    });

    // Add keyboard shortcuts for year navigation
    document.addEventListener('keydown', function(event) {
        // Left arrow key - previous year
        if (event.key === 'ArrowLeft') {
            const currentYear = parseInt(document.getElementById('current-year').textContent);
            if (currentYear > 1854) {
                timeSlider.noUiSlider.set(currentYear - 1);
            }
        }
        // Right arrow key - next year
        else if (event.key === 'ArrowRight') {
            const currentYear = parseInt(document.getElementById('current-year').textContent);
            if (currentYear < 1900) {
                timeSlider.noUiSlider.set(currentYear + 1);
            }
        }
        // Space key - toggle play/pause
        else if (event.key === ' ' || event.key === 'Spacebar') {
            const playPauseButton = document.getElementById('play-pause');
            if (playPauseButton) {
                playPauseButton.click();
            }
            event.preventDefault(); // Prevent page scrolling on space
        }
    });
});
