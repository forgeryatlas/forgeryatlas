// Diplomatic Documents index — filterable card grid

(function () {
    'use strict';

    var DATA_URL = '../../data/diplomatic_documents.json';

    function loadData() {
        // Prefer the inline global emitted by data/diplomatic_documents.js
        // so the page works on file:// and any static host without depending
        // on fetch() being allowed for the JSON sibling.
        if (Array.isArray(window.DIPLOMATIC_DOCUMENTS)) {
            return Promise.resolve(window.DIPLOMATIC_DOCUMENTS);
        }
        return fetch(DATA_URL).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    var state = {
        all: [],
        filtered: [],
        year: 'all',
        query: ''
    };

    function formatDate(iso) {
        if (!iso) return 'Date unknown';
        var d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    function uniqueYears(items) {
        var set = {};
        items.forEach(function (it) {
            if (it.date && /^\d{4}/.test(it.date)) {
                set[it.date.slice(0, 4)] = true;
            }
        });
        return Object.keys(set).sort();
    }

    function applyFilters() {
        var q = (state.query || '').trim().toLowerCase();
        state.filtered = state.all.filter(function (it) {
            if (state.year !== 'all') {
                if (!it.date || it.date.slice(0, 4) !== state.year) return false;
            }
            if (q) {
                var hay = [
                    it.sender || '',
                    it.receiver || '',
                    it.sender_location || '',
                    it.receiver_location || '',
                    it.date || '',
                    it.source_folder || ''
                ].join(' ').toLowerCase();
                if (hay.indexOf(q) === -1) return false;
            }
            return true;
        });
        renderGrid();
    }

    function renderToolbar() {
        var years = uniqueYears(state.all);
        var yearChips = document.getElementById('diplomatic-year-chips');
        if (!yearChips) return;

        var html = '<button type="button" class="filter-chip is-active" data-year="all">All <span class="count">' + state.all.length + '</span></button>';
        years.forEach(function (y) {
            var count = state.all.filter(function (it) {
                return it.date && it.date.slice(0, 4) === y;
            }).length;
            html += '<button type="button" class="filter-chip" data-year="' + y + '">' + y + ' <span class="count">' + count + '</span></button>';
        });
        yearChips.innerHTML = html;

        yearChips.addEventListener('click', function (e) {
            var btn = e.target.closest('.filter-chip');
            if (!btn) return;
            yearChips.querySelectorAll('.filter-chip').forEach(function (b) {
                b.classList.remove('is-active');
            });
            btn.classList.add('is-active');
            state.year = btn.getAttribute('data-year') || 'all';
            applyFilters();
        });

        var search = document.getElementById('diplomatic-search-input');
        if (search) {
            search.addEventListener('input', function () {
                state.query = search.value || '';
                applyFilters();
            });
        }
    }

    function renderGrid() {
        var grid = document.getElementById('diplomatic-grid');
        var counter = document.getElementById('diplomatic-result-count');
        if (!grid) return;

        if (counter) {
            counter.textContent = state.filtered.length + ' of ' + state.all.length + ' document' + (state.all.length !== 1 ? 's' : '');
        }

        if (!state.filtered.length) {
            grid.innerHTML = '<div class="documents-empty-state">No documents match the current filters.</div>';
            return;
        }

        var html = '';
        state.filtered.forEach(function (it) {
            var sender = (it.sender || '').replace(/\s+/g, ' ').trim();
            var receiver = (it.receiver || '').replace(/\s+/g, ' ').trim();
            var senderLoc = it.sender_location || '';
            var receiverLoc = it.receiver_location || '';
            var locations = '';
            if (senderLoc || receiverLoc) {
                locations = senderLoc + (senderLoc && receiverLoc ? ' \u2192 ' : '') + receiverLoc;
            }

            var route = '';
            if (sender || receiver) {
                route = (sender || 'Unknown sender') +
                    '<span class="arrow">&rarr;</span>' +
                    (receiver || 'Unknown recipient');
            } else {
                route = '<em>Communication metadata not available</em>';
            }

            html += '<a class="document-card" href="document.html?id=' + encodeURIComponent(it.id) + '">' +
                '<div class="document-card-id">' + (it.source_folder || it.id) + '</div>' +
                '<div class="document-card-date">' + formatDate(it.date) + '</div>' +
                '<div class="document-card-route">' + route + '</div>' +
                (locations ? '<div class="document-card-locations">' + locations + '</div>' : '') +
                '<div class="document-card-cta">Open document <i class="fas fa-arrow-right"></i></div>' +
                '</a>';
        });
        grid.innerHTML = html;
    }

    function init() {
        loadData()
            .then(function (items) {
                state.all = Array.isArray(items) ? items.slice() : [];
                state.all.sort(function (a, b) {
                    var ad = a.date || '';
                    var bd = b.date || '';
                    return ad.localeCompare(bd);
                });
                state.filtered = state.all.slice();
                renderToolbar();
                renderGrid();
            })
            .catch(function (err) {
                var grid = document.getElementById('diplomatic-grid');
                if (grid) {
                    grid.innerHTML = '<div class="documents-empty-state">Failed to load document index: ' +
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
