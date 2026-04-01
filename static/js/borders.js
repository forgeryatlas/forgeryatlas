// Ottoman Crime Network Map - Borders Module

/**
 * Initialize Ottoman borders functionality
 * @param {L.Map} map - Leaflet map instance
 * @param {string} toggleButtonId - Optional ID of the toggle button
 */
function initBorders(map, toggleButtonId) {
    // Load the borders GeoJSON data
    fetch('/static/borders.geojson')
        .then(response => response.json())
        .then(data => {
            const borders = L.geoJSON(data, {
                style: {
                    color: '#8B4513',
                    weight: 2,
                    opacity: 0.7,
                    fillOpacity: 0.1,
                    fillColor: '#DEB887'
                }
            }).addTo(map);

            // Toggle borders button (if provided)
            if (toggleButtonId) {
                const toggleButton = document.getElementById(toggleButtonId);
                if (toggleButton) {
                    let bordersVisible = true;

                    toggleButton.addEventListener('click', function() {
                        if (bordersVisible) {
                            map.removeLayer(borders);
                            toggleButton.textContent = 'Show Ottoman Borders';
                        } else {
                            borders.addTo(map);
                            toggleButton.textContent = 'Hide Ottoman Borders';
                        }
                        bordersVisible = !bordersVisible;
                    });
                }
            }
        });
}

// Export function if module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initBorders
    };
}
