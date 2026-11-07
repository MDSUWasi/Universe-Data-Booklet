/* Sidebar navigation, independent of every feature module. */
'use strict';

(function () {
    const Sidebar = {
        el: null,
        toggleBtn: null,
        overlay: null,
        isOpen: true,
        MOBILE_BREAKPOINT: 960,

        init() {
            this.el = document.getElementById('sidebar');
            this.toggleBtn = document.getElementById('hamburger');
            this.overlay = document.getElementById('sidebar-overlay');
            if (!this.el || !this.toggleBtn) return;

            document.addEventListener('keydown', evt => {
                if (evt.key === 'Escape' && this.isOpen) this.close();
            });

            this.el.querySelectorAll('.side-nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    if (window.innerWidth <= this.MOBILE_BREAKPOINT) this.close();
                });
            });

            this.open();

            let resizeTimer = null;
            window.addEventListener('resize', () => {
                if (resizeTimer) clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (this.overlay) {
                        this.overlay.classList.toggle('visible', this.isOpen && window.innerWidth <= this.MOBILE_BREAKPOINT);
                    }
                    if (window.MapViewer && window.MapViewer.map) window.MapViewer.map.invalidateSize();
                }, 150);
            }, { passive: true });
        },

        toggle() { this.isOpen ? this.close() : this.open(); },

        open() {
            this.isOpen = true;
            this.apply(true);
        },

        close() {
            this.isOpen = false;
            this.apply(false);
        },

        apply(open) {
            this.el.classList.toggle('open', open);
            this.toggleBtn.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('sidebar-open', open);
            document.body.classList.toggle('sidebar-closed', !open);

            if (this.overlay) {
                this.overlay.classList.toggle('visible', open && window.innerWidth <= this.MOBILE_BREAKPOINT);
            }

            if (window.MapViewer && window.MapViewer.map) {
                requestAnimationFrame(() => window.MapViewer.map.invalidateSize());
            }
        }
    };

    window.Sidebar = Sidebar;
})();