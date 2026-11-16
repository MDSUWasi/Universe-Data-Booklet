/* Map View Module - Bootstrap for the three.js planetary map.
   Wires the MapViewer (map-viewer.js) into the modal defined in index.html.
   Exports initMap for use by app.js modal management. */
'use strict';

const M = {
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

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

        const modal = document.getElementById('modal-map');
        if (!modal) return;

        // If modal is already open (openModalById adds 'open' before calling initMap),
        // initialise MapViewer immediately. Otherwise defer until the modal opens.
        if (modal.classList.contains('open')) {
            this.initMapViewer();
        } else {
            const observer = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    if (m.attributeName === 'class' && modal.classList.contains('open')) {
                        observer.disconnect();
                        this.initMapViewer();
                        break;
                    }
                }
            });
            observer.observe(modal, { attributes: true });
        }
    },

    initMapViewer() {
        if (window.MapViewer) {
            window.MapViewer.open();
        }
        // Ensure three.js renderer recalculates size once the modal is visible.
        setTimeout(() => {
            if (window.MapViewer) {
                window.MapViewer.open();
            }
        }, 100);
    },

    open() {
        const modal = document.getElementById('modal-map');
        if (!modal) return;
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (window.MapViewer) window.MapViewer.open();
        setTimeout(() => {
            if (window.MapViewer) window.MapViewer.open();
        }, 100);
    },

    close() {
        const modal = document.getElementById('modal-map');
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    },
};

export function initMap() {
    M.init();
}

export function openMap() {
    M.open();
}

export function closeMap() {
    M.close();
}

export default M;
