/* Modal manager. Cross-module calls go through window.<Module>, which is the
   single seam that lets any feature module be swapped independently. */
'use strict';

(function () {
    const UI = {
        openModal(id, mapLayer = 'earth') {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
            const modal = document.getElementById('modal-' + id);
            if (!modal) return;
            modal.classList.add('open');
            // Freeze the background page (hero, footer, stats) so it cannot
            // scroll out from under the modal while the user interacts.
            this._lockBody();
            if (window.gsap) gsap.fromTo(modal, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 });

            if (id === 'map' && window.MapViewer) window.MapViewer.init(mapLayer);
            if (id === 'selector' && window.Selector) window.Selector.run();
            if (id === 'calculator' && window.Calculator) window.Calculator.init();
            if (id === 'planner' && window.Planner) window.Planner.start();
            if (id === 'compare' && window.Comparator) window.Comparator.render();
            if (id === 'discovery' && window.Discovery) window.Discovery.renderCacheStats();
            if (id === 'terrain' && window.TerrainLab) window.TerrainLab.open();
            if (id === 'patches' && window.PatchExplorer) window.PatchExplorer.open();
            if (id === 'scale' && window.ScaleSensitivity) window.ScaleSensitivity.open();
            if (id === 'encyclopedia' && window.Encyclopedia) {
                window.Encyclopedia.load(mapLayer).then(() => window.Encyclopedia.render());
            }
            if (id === 'realtime' && window.Realtime) window.Realtime.loadAll();

            requestAnimationFrame(() => {
                const map = window.MapViewer && window.MapViewer.map;
                if (map) map.invalidateSize();
            });
        },

        closeModal(id) {
            const modal = document.getElementById('modal-' + id);
            if (modal) modal.classList.remove('open');
            // Release the background page only when every modal is gone.
            if (!document.querySelector('.modal-overlay.open')) this._unlockBody();
        },

        overlayClose(evt, id) {
            if (evt.target === document.getElementById('modal-' + id)) {
                this.closeModal(id);
            }
        },

        _lockBody() {
            const sb = document.body;
            if (sb.classList.contains('scroll-locked')) return;
            // Remember the current scroll position so we can restore it.
            this._scrollTop = window.scrollY || document.documentElement.scrollTop;
            sb.classList.add('scroll-locked');
        },

        _unlockBody() {
            const sb = document.body;
            sb.classList.remove('scroll-locked');
            // Restore the previous scroll position so the user is not
            // teleported to the top of the page when the modal closes.
            if (this._scrollTop !== undefined) {
                window.scrollTo(0, this._scrollTop);
                this._scrollTop = undefined;
            }
        }
    };

    window.UI = UI;
})();