/* Theme switcher: three independent themes (light / dark / planetary),
   each with its own colour palette, surface feel, and layout position.
   Classic script: registers window.Theme. */
'use strict';

(function () {
    const STORAGE_KEY = 'planet-analog-theme';
    const THEMES = ['light', 'dark', 'planetary'];
    const DEFAULT = 'light';

    const Theme = {
        current: DEFAULT,

        // Persist the choice so it survives a reload.
        save(name) {
            try { localStorage.setItem(STORAGE_KEY, name); } catch (e) { /* storage unavailable */ }
        },

        load() {
            let saved = DEFAULT;
            try { saved = localStorage.getItem(STORAGE_KEY) || DEFAULT; } catch (e) { /* ignore */ }
            if (THEMES.indexOf(saved) === -1) saved = DEFAULT;
            return saved;
        },

        apply(name) {
            if (THEMES.indexOf(name) === -1) return;
            this.current = name;
            document.documentElement.setAttribute('data-theme', name);
            this.save(name);
            this.syncButtons();
        },

        syncButtons() {
            document.querySelectorAll('.theme-btn').forEach(btn => {
                const active = btn.dataset.theme === this.current;
                btn.setAttribute('aria-pressed', active);
            });
        },

        init() {
            const name = this.load();
            this.apply(name);

            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.apply(btn.dataset.theme);
                });
            });
        }
    };

    window.Theme = Theme;
})();