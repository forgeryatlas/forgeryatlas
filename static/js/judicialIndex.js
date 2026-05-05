// Judicial Documents index — city-grouped timeline

(function () {
    'use strict';

    var DATA_URL = '../../data/judicial_documents.json';

    var CITY_ORDER = ['Turin', 'Bologna', 'Constantinople'];

    function loadData() {
        if (Array.isArray(window.JUDICIAL_DOCUMENTS)) {
            return Promise.resolve(window.JUDICIAL_DOCUMENTS);
        }
        return fetch(DATA_URL).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function compareIso(a, b) {
        var ad = (a && a.date) || '';
        var bd = (b && b.date) || '';
        return ad.localeCompare(bd);
    }

    function groupByCity(items) {
        var byCity = {};
        items.forEach(function (it) {
            var key = it.city || 'Other';
            if (!byCity[key]) byCity[key] = [];
            byCity[key].push(it);
        });
        Object.keys(byCity).forEach(function (k) {
            byCity[k].sort(compareIso);
        });
        return byCity;
    }

    function renderTimeline(items) {
        var html = '';
        items.forEach(function (it) {
            var dateLabel = it.date_display || it.date || '';
            var lang = it.language ? '<span class="judicial-language-tag">' + it.language + '</span>' : '';
            html += '<a class="judicial-timeline-item" href="document.html?id=' + encodeURIComponent(it.id) + '">' +
                '<div class="judicial-timeline-date">' + dateLabel + '</div>' +
                '<div class="judicial-timeline-body">' +
                    '<h3>' + (it.court || 'Unknown court') + '</h3>' +
                    (it.session ? '<p>' + it.session + '</p>' : '') +
                    lang +
                '</div>' +
            '</a>';
        });
        return html;
    }

    function render(items) {
        var container = document.getElementById('judicial-content');
        if (!container) return;

        if (!items.length) {
            container.innerHTML = '<div class="documents-empty-state">No judicial documents available.</div>';
            return;
        }

        var byCity = groupByCity(items);
        var cities = CITY_ORDER.filter(function (c) {
            return byCity[c] && byCity[c].length;
        });
        Object.keys(byCity).forEach(function (c) {
            if (cities.indexOf(c) === -1) cities.push(c);
        });

        var html = '';
        cities.forEach(function (city) {
            var docs = byCity[city];
            html += '<section class="judicial-section">' +
                '<div class="judicial-city-heading">' +
                    '<h2>' + city + '</h2>' +
                    '<div class="judicial-city-meta">' + docs.length + ' document' + (docs.length !== 1 ? 's' : '') + '</div>' +
                '</div>' +
                '<div class="judicial-timeline">' +
                    renderTimeline(docs) +
                '</div>' +
            '</section>';
        });
        container.innerHTML = html;

        var counter = document.getElementById('judicial-result-count');
        if (counter) counter.textContent = items.length + ' total';
    }

    function init() {
        loadData()
            .then(function (items) {
                render(Array.isArray(items) ? items : []);
            })
            .catch(function (err) {
                var container = document.getElementById('judicial-content');
                if (container) {
                    container.innerHTML = '<div class="documents-empty-state">Failed to load judicial index: ' +
                        (err && err.message ? err.message : err) + '</div>';
                }
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
