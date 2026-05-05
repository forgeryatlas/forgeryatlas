// Beyoglu Interactive Map – Leaflet + OpenStreetMap
// Three marker categories: Important Places, Lived/Worked, Meeting Points

(function () {
    'use strict';

    var IMPORTANT_PLACES = [
        {
            name: 'Selimiye Barracks',
            year: 1800,
            lat: 41.036975,
            lng: 28.985257,
            address: 'Taksim',
            desc: 'Military barracks built in 1800, later expanded during the Crimean War.'
        },
        {
            name: 'Taksim Fountain',
            year: 1732,
            lat: 41.036975,
            lng: 28.985257,
            address: 'Taksim',
            desc: 'Ottoman water distribution structure built in 1732.'
        },
        {
            name: 'French Consulate General',
            year: 1847,
            lat: 41.036179,
            lng: 28.983810,
            address: 'İstiklal',
            desc: 'Consulate General of France, established 1847.'
        },
        {
            name: 'Sardinian Hospital',
            year: 1856,
            lat: 41.029261,
            lng: 28.982005,
            address: 'Defterdar Yokuşu',
            desc: 'Now Istanbul Italian Hospital. Founded 1856.'
        },
        {
            name: 'Naum Theatre',
            year: 1844,
            lat: 41.029261,
            lng: 28.982005,
            address: 'Hüseyin Ağa',
            desc: 'Opera house opened in 1844. Located where today\'s Çiçek Pasajı stands (Bugünün Çiçek Pasajı\'nın içinde kalıyor).'
        },
        {
            name: 'Hotel de l\'Europe',
            year: 1860,
            lat: 41.028350,
            lng: 28.977001,
            address: 'Kumbaracı Yokuşu',
            desc: 'Prominent European-style hotel, opened 1860.'
        },
        {
            name: 'Hotel d\'Angleterre',
            year: 1854,
            lat: 41.028642,
            lng: 28.975573,
            address: 'İstiklal',
            desc: 'One of Pera\'s grand hotels, established 1854.'
        },
        {
            name: 'Russian Consulate General',
            year: 1845,
            lat: 41.029948,
            lng: 28.975627,
            address: 'İstiklal',
            desc: 'Consulate General of Russia, established 1845.'
        },
        {
            name: 'Municipality (Altıncı Daire-yi Belediye)',
            year: 1857,
            lat: 41.028220,
            lng: 28.973519,
            address: 'Meşrutiyet',
            desc: 'The Sixth Municipal District, the first modern municipality of Istanbul, founded 1857.'
        },
        {
            name: 'Galata Tower',
            year: 1348,
            lat: 41.025625,
            lng: 28.974194,
            address: 'Büyük Hendek',
            desc: 'Medieval Genoese tower built in 1348, landmark of the Galata district.'
        },
        {
            name: 'Lebon Patisserie',
            year: 1810,
            lat: 41.029449,
            lng: 28.975393,
            address: 'Tomtom',
            desc: 'Famous French patisserie, established 1810.'
        },
        {
            name: 'Journal de Constantinople',
            year: 1846,
            lat: 41.023996,
            lng: 28.973426,
            address: 'Bankalar Caddesi',
            desc: 'French-language newspaper of Istanbul, founded 1846.'
        },
        {
            name: 'Hotel de Byzance',
            year: 1849,
            lat: 41.028350,
            lng: 28.977001,
            address: 'Kumbaracı Yokuşu',
            desc: 'A notable Pera hotel, opened 1849.'
        },
        {
            name: 'Hotel de Pera',
            year: 1849,
            lat: 41.031000,
            lng: 28.973588,
            address: 'Meşrutiyet',
            desc: 'One of the grand hotels of Pera, opened 1849.'
        },
        {
            name: 'British Consulate General',
            year: 1831,
            lat: 41.034149,
            lng: 28.975933,
            address: 'Meşrutiyet',
            desc: 'Consulate General of Great Britain, established 1831.'
        },
        {
            name: 'Abdullah Freres Photo Studio',
            year: 1858,
            lat: 41.028333,
            lng: 28.973889,
            address: 'Tünel',
            desc: 'Photography studio of the Abdullah Frères, established 1858. Their portraits documented Ottoman statesmen and diplomats of the era.'
        }
    ];

    var LIVED_WORKED = [
        {
            criminals: 'Roberto Diamanti',
            place: 'Shop',
            lat: 41.032145,
            lng: 28.978250,
            rue: 'Rue 23: Yeniçarşı \u2013 Pera',
            desc: 'Works at a shop'
        },
        {
            criminals: 'Margarita \u2013 Francisco Petris',
            place: 'Residence',
            lat: 41.037301,
            lng: 28.976830,
            rue: 'Rue 200: Kalyoncu Kulluk',
            desc: 'They live here'
        },
        {
            criminals: 'Gaetano Manzo',
            place: 'Café Prado',
            lat: 41.036975,
            lng: 28.985257,
            rue: 'Rue 4: Taksim',
            desc: 'Works at Café Prado across the Selimiye Barracks'
        },
        {
            criminals: 'Cesare Venzi \u2013 Andonaki Draganikos',
            place: 'Residence',
            lat: 41.031009,
            lng: 28.987925,
            rue: 'Rue 1: Grand Rue de Pera',
            desc: 'They live close to Tekke'
        },
        {
            criminals: 'Cesare Venzi \u2013 Andonaki Draganikos',
            place: 'Shop',
            lat: 41.031982,
            lng: 28.971530,
            rue: 'Rue 206: Tepebaşı',
            desc: 'They work at a shop'
        },
    ];

    var MET_HERE = [
        {
            criminals: 'Gaetano Manzo \u2013 Clitzi Cole',
            place: 'Café Charalanpas',
            lat: 41.037301,
            lng: 28.976830,
            rue: 'Rue 200: Kalyoncu Kulluk',
            desc: 'Café Charalanpas'
        },
        {
            criminals: 'Ludovico Boschi \u2013 Gaetano Manzo \u2013 Tommasso Facchini',
            place: 'Bülbül Café',
            lat: 41.039097,
            lng: 28.979840,
            rue: 'Rue 157: Bülbül',
            desc: 'Bülbül Café'
        },
        {
            criminals: 'Ludovico Boschi \u2013 Gaetano Manzo \u2013 Cesare Venzi \u2013 Andonaki Draganikos',
            place: 'Café Tekke',
            lat: 41.034179,
            lng: 28.979004,
            rue: 'Rue 1: Grand Rue de Pera',
            desc: 'Café Tekke'
        },
        {
            criminals: 'Ludovico Boschi \u2013 Gaetano Manzo \u2013 Cesare Venzi \u2013 Andonaki Draganikos',
            place: 'Liquor Factory',
            lat: 41.036975,
            lng: 28.985257,
            rue: 'Rue 4: Taksim',
            desc: 'Liquor Factory nearby Taksim Fountain'
        },
        {
            criminals: 'Clitzi Cole \u2013 Gaetano Manzo \u2013 Francisco Petris',
            place: 'English Casino',
            lat: 41.029261,
            lng: 28.982005,
            rue: 'Defterdar Yokuşu',
            desc: 'English Casino across the Sardinian Hospital'
        },
        {
            criminals: 'Ludovico Boschi \u2013 Andonaki Draganikos',
            place: 'Theatre Café',
            lat: 41.029261,
            lng: 28.982005,
            rue: 'Rue 18: Theatre',
            desc: 'Theatre Café close to Naum Theatre and opposite to Hungarian Casino'
        }
    ];

    var MARKER_SIZE = 32;
    var ICON_CLASS = {
        important: 'fa-solid fa-landmark',
        lived: 'fa-solid fa-house',
        met: 'fa-solid fa-users'
    };

    // ---- Historical raster overlay -------------------------------------
    // David Rumsey "Plan von Constantinopel" by Josef Ritter von Scheda,
    // Vienna: Artaria, 1869. The 1869 plate is hand-drawn and slightly
    // rotated/skewed relative to modern Mercator, so a rectangular
    // L.imageOverlay can't align it cleanly. We use leaflet-distortableimage
    // to give the overlay 4 independently-draggable corners (NW, NE, SW, SE)
    // and bake the calibrated values back into HISTORICAL_MAP.corners below.
    //
    // Calibration workflow (one-time, when the corners need adjusting):
    //   1. Open  criminal-network/?calibrate=1  in a browser.
    //   2. Click the historical map; drag the small white markers on each
    //      of the four corners until landmarks line up with OSM:
    //        - Galata Tower:      41.0256, 28.9742
    //        - Hagia Sophia:      41.0086, 28.9802
    //        - Topkapi Palace:    41.0115, 28.9833
    //        - Selimiye Barracks: 41.0080, 29.0080  (Asian side, the
    //                                                Crimean War hospital,
    //                                                not Taksim Kışlası)
    //   3. Watch the browser console: every drag prints the four corners
    //      as a copy-pasteable JSON snippet.
    //   4. Paste the values into HISTORICAL_MAP.corners and reload normally
    //      (without ?calibrate=1). End users see a locked overlay, no
    //      handles or toolbar.
    var HISTORICAL_MAP = {
        url: '../static/maps/scheda-1869-constantinople.jpg',
        // NW, NE, SW, SE — the order required by leaflet-distortableimage.
        // Calibrated against modern OSM landmarks (Galata Tower, Hagia
        // Sophia, Topkapi, Selimiye Barracks). Re-run the calibration
        // workflow above if these need to be nudged.
        corners: {
            nw: [41.094909, 28.877692],
            ne: [41.116365, 29.048409],
            sw: [40.961752, 28.907089],
            se: [40.985211, 29.074116]
        },
        attribution:
            'Historical layer: Scheda, "Plan von Constantinopel" (Vienna: ' +
            'Artaria, 1869). Courtesy of the David Rumsey Map Collection ' +
            '(List No. 11517.024).',
        defaultOpacity: 0.55
    };

    function isCalibrateMode() {
        try {
            if (new URLSearchParams(window.location.search).get('calibrate') === '1') {
                return true;
            }
        } catch (e) { /* old browser, ignore */ }
        try {
            return !!(window.localStorage &&
                window.localStorage.getItem('beyogluCalibrate') === '1');
        } catch (e) {
            return false;
        }
    }

    // Encapsulated so a future swap to @allmaps/leaflet (for full TPS
    // warping) only touches this one function – the layers control, the
    // opacity slider, and call sites stay identical.
    function createHistoricalLayer() {
        if (typeof L.distortableImageOverlay !== 'function') {
            console.error(
                '[beyoglu] L.distortableImageOverlay is not loaded. Did the ' +
                'leaflet-distortableimage script include fail? Falling back ' +
                'to a plain L.imageOverlay so the page still works.'
            );
            return L.imageOverlay(HISTORICAL_MAP.url, [
                [HISTORICAL_MAP.corners.sw[0], HISTORICAL_MAP.corners.sw[1]],
                [HISTORICAL_MAP.corners.ne[0], HISTORICAL_MAP.corners.ne[1]]
            ], {
                opacity: HISTORICAL_MAP.defaultOpacity,
                interactive: false,
                attribution: HISTORICAL_MAP.attribution
            });
        }

        var calibrate = isCalibrateMode();
        var c = HISTORICAL_MAP.corners;
        var corners = [
            L.latLng(c.nw[0], c.nw[1]),
            L.latLng(c.ne[0], c.ne[1]),
            L.latLng(c.sw[0], c.sw[1]),
            L.latLng(c.se[0], c.se[1])
        ];

        var layer = L.distortableImageOverlay(HISTORICAL_MAP.url, {
            corners: corners,
            editable: calibrate,
            mode: calibrate ? 'distort' : 'lock',
            suppressToolbar: !calibrate,
            selected: calibrate,
            actions: calibrate
                ? [L.DragAction, L.DistortAction, L.RotateAction,
                   L.FreeRotateAction, L.OpacityAction, L.LockAction,
                   L.BorderAction]
                : [],
            attribution: HISTORICAL_MAP.attribution,
            alt: 'Plan von Constantinopel, Scheda 1869',
            opacity: HISTORICAL_MAP.defaultOpacity
        });

        layer.on('load', function () {
            // The plugin's load handler can reset opacity to 1; force ours
            // back in once the image is in the DOM.
            layer.setOpacity(HISTORICAL_MAP.defaultOpacity);
        });

        if (calibrate) {
            console.info(
                '%c[beyoglu calibrate] click the historical map, then drag corners. ' +
                'Corner values print here whenever they change. ' +
                'You can also run beyogluDumpCorners() any time.',
                'color:#a67b5b;font-weight:600'
            );

            window.beyogluHistoricalLayer = layer;
            var snapshotCorners = function () {
                return layer.getCorners().map(function (ll) {
                    return [Number(ll.lat.toFixed(6)),
                            Number(ll.lng.toFixed(6))];
                });
            };
            var formatSnapshot = function (pts) {
                return JSON.stringify({
                    nw: pts[0], ne: pts[1], sw: pts[2], se: pts[3]
                }, null, 2);
            };
            window.beyogluDumpCorners = function () {
                var snap = formatSnapshot(snapshotCorners());
                console.log('%c[beyoglu calibrate] corners:', 'color:#a67b5b', snap);
                return snap;
            };

            // Poll for changes; the plugin emits per-handle events that
            // aren't surfaced on the overlay itself, so a tight comparison
            // loop is the most reliable way to detect any corner movement
            // (drag, distort, rotate, scale, freeRotate).
            var lastSerialized = '';
            setInterval(function () {
                var pts = snapshotCorners();
                var serialized = pts.join('|');
                if (serialized !== lastSerialized) {
                    lastSerialized = serialized;
                    console.log(
                        '%c[beyoglu calibrate] corners updated:',
                        'color:#4b6455;font-weight:600',
                        formatSnapshot(pts)
                    );
                }
            }, 400);
        }

        return layer;
    }

    function createOpacitySlider(historicalLayer) {
        var control = L.control({ position: 'topleft' });
        control.onAdd = function () {
            var wrap = L.DomUtil.create('div',
                'leaflet-bar leaflet-control beyoglu-opacity-slider');
            wrap.innerHTML =
                '<label>' +
                    '<span class="beyoglu-opacity-label">' +
                        '<i class="fa-solid fa-layer-group" aria-hidden="true"></i> 1869 map' +
                    '</span>' +
                    '<input type="range" min="0" max="1" step="0.05" ' +
                        'value="' + HISTORICAL_MAP.defaultOpacity + '" ' +
                        'aria-label="Historical map opacity">' +
                '</label>';

            var input = wrap.querySelector('input');
            L.DomEvent.disableClickPropagation(wrap);
            L.DomEvent.disableScrollPropagation(wrap);
            L.DomEvent.on(input, 'input change', function () {
                historicalLayer.setOpacity(parseFloat(input.value));
            });
            return wrap;
        };
        return control;
    }

    function createIcon(category, fillColor, borderColor) {
        var iconClass = ICON_CLASS[category] || 'fa-solid fa-map-marker-alt';
        var size = MARKER_SIZE;
        var html = '<div class="beyoglu-marker-icon" style="' +
            'width:' + size + 'px;height:' + size + 'px;' +
            'background:' + fillColor + ';border:2px solid ' + borderColor + ';' +
            'border-radius:50%;display:flex;align-items:center;justify-content:center;' +
            'box-shadow:0 2px 8px rgba(0,0,0,0.25);">' +
            '<i class="' + iconClass + '" style="color:#fff;font-size:13px;"></i>' +
            '</div>';
        return L.divIcon({
            html: html,
            className: 'beyoglu-div-icon',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });
    }

    function streetViewLink(lat, lng) {
        var url = 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + lat + ',' + lng;
        return '<a class="popup-streetview" href="' + url + '" target="_blank" rel="noopener noreferrer">' +
            '📍 Open in Google Street View</a>';
    }

    function popupImportant(item) {
        return '<div class="beyoglu-popup">' +
            '<h4>' + item.name + '</h4>' +
            '<p class="popup-year">Est. ' + item.year + '</p>' +
            '<p class="popup-address">' + item.address + '</p>' +
            '<p class="popup-desc">' + item.desc + '</p>' +
            streetViewLink(item.lat, item.lng) +
            '</div>';
    }

    function popupCriminal(item) {
        return '<div class="beyoglu-popup">' +
            '<h4>' + item.criminals + '</h4>' +
            '<p class="popup-place">' + item.place + '</p>' +
            '<p class="popup-address">' + item.rue + '</p>' +
            '<p class="popup-desc">' + item.desc + '</p>' +
            streetViewLink(item.lat, item.lng) +
            '</div>';
    }

    function addImportantMarkers(data, group) {
        var icon = createIcon('important', '#2B6CB0', '#1A2A40');
        data.forEach(function (item) {
            var marker = L.marker([item.lat, item.lng], { icon: icon });
            marker.bindPopup(popupImportant(item), { minWidth: 240, maxWidth: 360 });
            marker.bindTooltip(item.name, {
                direction: 'top',
                offset: [0, -MARKER_SIZE / 2 - 4],
                className: 'beyoglu-tooltip'
            });
            group.addLayer(marker);
        });
    }

    function addCriminalMarkers(data, category, group) {
        var fill = category === 'lived' ? '#00EFA8' : '#BA7CFF';
        var border = category === 'lived' ? '#0a7a56' : '#5e2ea6';
        var icon = createIcon(category, fill, border);
        data.forEach(function (item) {
            var marker = L.marker([item.lat, item.lng], { icon: icon });
            marker.bindPopup(popupCriminal(item), { minWidth: 240, maxWidth: 360 });
            marker.bindTooltip(item.criminals, {
                direction: 'top',
                offset: [0, -MARKER_SIZE / 2 - 4],
                className: 'beyoglu-tooltip'
            });
            group.addLayer(marker);
        });
    }

    function createLegend(map) {
        var legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            var div = L.DomUtil.create('div', 'beyoglu-legend');
            div.innerHTML =
                '<p class="beyoglu-legend-title">Legend</p>' +
                '<div><span class="beyoglu-legend-icon" style="background:#2B6CB0;border-color:#1A2A40"><i class="fa-solid fa-landmark"></i></span> Important Places</div>' +
                '<div><span class="beyoglu-legend-icon" style="background:#00EFA8;border-color:#0a7a56"><i class="fa-solid fa-house"></i></span> Where They Lived / Worked</div>' +
                '<div><span class="beyoglu-legend-icon" style="background:#BA7CFF;border-color:#5e2ea6"><i class="fa-solid fa-users"></i></span> Where They Met</div>';
            return div;
        };
        legend.addTo(map);
    }

    function initBeyogluMap() {
        var mapEl = document.getElementById('beyoglu-map');
        if (!mapEl) return;

        var map = L.map('beyoglu-map', {
            center: [41.031, 28.978],
            zoom: 15,
            zoomControl: true,
            attributionControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        var historicalLayer = createHistoricalLayer();
        historicalLayer.addTo(map);

        var importantGroup = L.layerGroup();
        var livedGroup = L.layerGroup();
        var metGroup = L.layerGroup();

        addImportantMarkers(IMPORTANT_PLACES, importantGroup);
        addCriminalMarkers(LIVED_WORKED, 'lived', livedGroup);
        addCriminalMarkers(MET_HERE, 'met', metGroup);

        importantGroup.addTo(map);
        livedGroup.addTo(map);
        metGroup.addTo(map);

        L.control.layers(null, {
            'Constantinople 1869 (Scheda)': historicalLayer,
            'Important Places': importantGroup,
            'Where They Lived / Worked': livedGroup,
            'Where They Met': metGroup
        }, { collapsed: false, position: 'topright' }).addTo(map);

        createOpacitySlider(historicalLayer).addTo(map);
        createLegend(map);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBeyogluMap);
    } else {
        initBeyogluMap();
    }
})();
