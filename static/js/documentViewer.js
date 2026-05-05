// Shared viewer for Diplomacy and Judicial document pages

(function () {
    'use strict';

    var DOC_TYPE = (window.DOCUMENT_VIEWER_TYPE || 'diplomatic'); // 'diplomatic' | 'judicial'

    var CONFIG = {
        diplomatic: {
            dataUrl: '../../data/diplomatic_documents.json',
            globalKey: 'DIPLOMATIC_DOCUMENTS',
            indexUrl: 'index.html',
            kicker: 'Diplomatic correspondence',
            buildHeader: buildDiplomaticHeader
        },
        judicial: {
            dataUrl: '../../data/judicial_documents.json',
            globalKey: 'JUDICIAL_DOCUMENTS',
            indexUrl: 'index.html',
            kicker: 'Judicial proceedings',
            buildHeader: buildJudicialHeader
        }
    };

    function loadDataset(cfg) {
        var inline = window[cfg.globalKey];
        if (Array.isArray(inline)) return Promise.resolve(inline);
        return fetch(cfg.dataUrl).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function paramId() {
        try {
            return new URLSearchParams(window.location.search).get('id') || '';
        } catch (e) {
            return '';
        }
    }

    function formatDate(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function findIndex(items, id) {
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === id) return i;
        }
        return -1;
    }

    function buildDiplomaticHeader(item) {
        var sender = (item.sender || '').replace(/\s+/g, ' ').trim();
        var receiver = (item.receiver || '').replace(/\s+/g, ' ').trim();
        var senderLoc = item.sender_location || '';
        var receiverLoc = item.receiver_location || '';

        var title;
        if (sender || receiver) {
            title = (sender || 'Unknown sender') + ' &rarr; ' + (receiver || 'Unknown recipient');
        } else {
            title = 'Diplomatic document';
        }

        var subParts = [];
        if (item.date) subParts.push(formatDate(item.date));
        if (senderLoc || receiverLoc) {
            subParts.push((senderLoc || '?') + ' \u2192 ' + (receiverLoc || '?'));
        }
        if (item.source_folder) subParts.push(item.source_folder);

        return {
            kicker: 'Diplomatic correspondence',
            title: title,
            sub: subParts.join(' \u00b7 ')
        };
    }

    function buildJudicialHeader(item) {
        var subParts = [];
        if (item.date_display) subParts.push(item.date_display);
        else if (item.date) subParts.push(formatDate(item.date));
        if (item.session) subParts.push(item.session);
        if (item.language) subParts.push(item.language);

        return {
            kicker: 'Judicial proceedings · ' + (item.city || ''),
            title: item.court || 'Judicial document',
            sub: subParts.join(' \u00b7 ')
        };
    }

    function setupTabs() {
        var tabs = document.getElementById('viewer-tabs');
        if (!tabs) return;
        var pdfPane = document.getElementById('pane-pdf');
        var transPane = document.getElementById('pane-transcription');

        tabs.addEventListener('click', function (e) {
            var btn = e.target.closest('button');
            if (!btn) return;
            var target = btn.getAttribute('data-target');
            tabs.querySelectorAll('button').forEach(function (b) {
                b.classList.toggle('is-active', b === btn);
            });
            if (target === 'pdf') {
                pdfPane.classList.remove('pane-hidden');
                transPane.classList.add('pane-hidden');
            } else {
                pdfPane.classList.add('pane-hidden');
                transPane.classList.remove('pane-hidden');
            }
        });
    }

    function renderError(message) {
        var shell = document.getElementById('document-viewer-shell');
        if (shell) {
            shell.innerHTML = '<div class="viewer-error"><h2>Document not found</h2><p>' +
                escapeHtml(message || 'We could not locate that document.') +
                '</p><p><a class="viewer-btn" href="index.html"><i class="fas fa-arrow-left"></i> Back to index</a></p></div>';
        }
    }

    function renderViewer(items, item) {
        var cfg = CONFIG[DOC_TYPE];
        var header = cfg.buildHeader(item);

        document.title = header.title.replace(/&rarr;/g, '→') + ' — ForgeryAtlas';

        var meta = document.getElementById('viewer-meta');
        if (meta) {
            meta.innerHTML =
                '<span class="viewer-kicker">' + escapeHtml(header.kicker) + '</span>' +
                '<h1>' + header.title + '</h1>' +
                '<div class="viewer-sub">' + escapeHtml(header.sub) + '</div>';
        }

        // Prev / Next within the dataset (chronological order)
        var sorted = items.slice().sort(function (a, b) {
            var ad = (a.date || '').toString();
            var bd = (b.date || '').toString();
            return ad.localeCompare(bd);
        });
        var idx = findIndex(sorted, item.id);
        var prev = idx > 0 ? sorted[idx - 1] : null;
        var next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;

        var actions = document.getElementById('viewer-actions');
        if (actions) {
            var prevBtn = '<a class="viewer-btn ' + (prev ? '' : 'is-disabled') +
                '" href="' + (prev ? 'document.html?id=' + encodeURIComponent(prev.id) : '#') +
                '" aria-disabled="' + (prev ? 'false' : 'true') + '"><i class="fas fa-chevron-left"></i> Previous</a>';
            var nextBtn = '<a class="viewer-btn ' + (next ? '' : 'is-disabled') +
                '" href="' + (next ? 'document.html?id=' + encodeURIComponent(next.id) : '#') +
                '" aria-disabled="' + (next ? 'false' : 'true') + '">Next <i class="fas fa-chevron-right"></i></a>';

            var pdfHref = '../../' + item.directory + '/' + (item.pdf || 'original.pdf');
            var docxHref = '../../' + item.directory + '/' + (item.transcription_docx || 'transcription.docx');

            actions.innerHTML =
                '<a class="viewer-btn viewer-btn-primary" href="' + pdfHref + '" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i> Download PDF</a>' +
                '<a class="viewer-btn" href="' + docxHref + '" target="_blank" rel="noopener"><i class="fas fa-file-word"></i> Download DOCX</a>' +
                prevBtn + nextBtn;
        }

        // PDF iframe
        var frame = document.getElementById('pdf-frame');
        if (frame) {
            var pdfSrc = '../../' + item.directory + '/' + (item.pdf || 'original.pdf') + '#view=FitH';
            frame.setAttribute('src', pdfSrc);
        }

        // Transcription / translation — rendered via <iframe> so it works on
        // file:// and on any static host without relying on fetch() permissions.
        // The iframe document is a self-contained styled page emitted by
        // scripts/build_documents.py. When the doc has a separate translation
        // file, render a segmented switch that swaps the iframe src.
        renderTranscriptionPane(item);
    }

    function renderTranscriptionPane(item) {
        var pane = document.getElementById('pane-transcription');
        if (!pane) return;
        var header = pane.querySelector('.pane-header');
        var frame = document.getElementById('transcription-frame');
        if (!header || !frame) return;

        var dir = '../../' + item.directory + '/';
        var transcriptionUrl = dir + (item.transcription_html || 'transcription.html');
        var translationUrl = item.has_translation
            ? dir + (item.translation_html || 'translation.html')
            : null;

        if (translationUrl) {
            header.innerHTML =
                '<h2 class="pane-title">Transcription</h2>' +
                '<div class="transcription-switch" role="tablist" aria-label="Choose view">' +
                    '<button type="button" class="is-active" role="tab" aria-selected="true" data-view="transcription">' +
                        '<i class="fas fa-feather"></i> Transcription' +
                    '</button>' +
                    '<button type="button" role="tab" aria-selected="false" data-view="translation">' +
                        '<i class="fas fa-language"></i> Translation' +
                    '</button>' +
                '</div>';

            var sw = header.querySelector('.transcription-switch');
            var titleEl = header.querySelector('.pane-title');
            sw.addEventListener('click', function (e) {
                var btn = e.target.closest('button[data-view]');
                if (!btn) return;
                var view = btn.getAttribute('data-view');
                sw.querySelectorAll('button').forEach(function (b) {
                    var active = b === btn;
                    b.classList.toggle('is-active', active);
                    b.setAttribute('aria-selected', active ? 'true' : 'false');
                });
                if (titleEl) {
                    titleEl.textContent = view === 'translation' ? 'Translation' : 'Transcription';
                }
                frame.setAttribute('src', view === 'translation' ? translationUrl : transcriptionUrl);
            });
        } else {
            header.innerHTML = '<h2 class="pane-title">Transcription</h2>';
        }

        frame.setAttribute('src', transcriptionUrl);
    }

    function init() {
        var cfg = CONFIG[DOC_TYPE];
        if (!cfg) {
            renderError('Unknown viewer type: ' + DOC_TYPE);
            return;
        }
        setupTabs();

        var id = paramId();
        if (!id) {
            renderError('No document id specified.');
            return;
        }

        loadDataset(cfg)
            .then(function (items) {
                items = Array.isArray(items) ? items : [];
                var item = null;
                for (var i = 0; i < items.length; i++) {
                    if (items[i].id === id) { item = items[i]; break; }
                }
                if (!item) {
                    renderError('Document "' + id + '" not found in the index.');
                    return;
                }
                renderViewer(items, item);
            })
            .catch(function (err) {
                renderError(err && err.message ? err.message : String(err));
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
