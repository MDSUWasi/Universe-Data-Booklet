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

            requestAnimationFrame(() => {
                const map = window.MapViewer && window.MapViewer.map;
                if (map) map.invalidateSize();
            });
        },

        closeModal(id) {
            const modal = document.getElementById('modal-' + id);
            if (modal) modal.classList.remove('open');
        },

        overlayClose(evt, id) {
            if (evt.target === document.getElementById('modal-' + id)) {
                this.closeModal(id);
            }
        }
    };

    window.UI = UI;
})();