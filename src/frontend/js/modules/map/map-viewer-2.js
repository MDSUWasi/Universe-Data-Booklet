/* Map View Module - Bootstrap for the interactive planetary map.
   Wires the Leaflet-based MapViewer (map-viewer-2.js / map-viewer-3.js) into
   the modal defined in index.html.  Classic script: registers window.Map.
   This module is independent of every other feature module. */
'use strict';

(function () {
    const M = {
        initialized: false,

        init() {
            if (this.initialized) return;
            this.initialized = true;

            // Wait for SITE_DATA to be available (it is registered by the
            // core data script which loads before this module).
            if (!window.SITE_DATA) {
                setTimeout(() => this.init(), 50);
                return;
            }

            // Wire the retry button (defined in index.html).
            const retryBtn = document.getElementById('map-retry');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    if (window.MapViewer) window.MapViewer.retryTiles();
                });
            }

            // Wire the close-when-clicking-overlay behaviour.
            const overlay = document.getElementById('modal-map');
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        overlay.classList.remove('open');
                        document.body.style.overflow = '';
                    }
                });
            }

            // Defer Leaflet initialisation until the modal is actually opened.
            const modal = document.getElementById('modal-map');
            if (modal) {
                const observer = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                        if (m.attributeName === 'class' && modal.classList.contains('open')) {
                            observer.disconnect();
                            if (window.MapViewer) window.MapViewer.open();
                            break;
                        }
                    }
                });
                observer.observe(modal, { attributes: true });
            }
        },

        open() {
            const modal = document.getElementById('modal-map');
            if (!modal) return;
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
            if (window.MapViewer) window.MapViewer.open();
        },

        close() {
            const modal = document.getElementById('modal-map');
            if (modal) {
                modal.classList.remove('open');
                document.body.style.overflow = '';
            }
        },
    };

    window.Map = M;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => M.init());
    } else {
        M.init();
    }
})();
