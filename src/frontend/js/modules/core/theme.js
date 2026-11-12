/* Theme switcher: coordinates the topbar dots and sidebar buttons through
   the single canonical setTheme() in app.js. Light / dark / planetary sheets
   are loaded in index.html; "cream" is the base palette in style.css. */
'use strict';

(function () {
    const STORAGE_KEY = 'udb-theme';
    const THEMES = ['cream', 'light', 'dark', 'planetary'];
    const DEFAULT = 'cream';

    const Theme = {
        current: DEFAULT,

        save(name) {
            try { localStorage.setItem(STORAGE_KEY, name); } catch (e) { /* storage unavailable */ }
        },

        load() {
            let saved = DEFAULT;
            try { saved = localStorage.getItem(STORAGE_KEY) || DEFAULT; } catch (e) { /* ignore */ }
            return saved;
        },

        apply(name) {
            if (THEMES.indexOf(name) === -1) name = DEFAULT;
            this.current = name;
            if (typeof window.setTheme === 'function') {
                window.setTheme(name);
                return;
            }
            document.documentElement.setAttribute('data-theme', name);
            this.save(name);
            this.syncButtons();
        },

        syncButtons() {
            document.querySelectorAll('.theme-btn, .theme-dot').forEach(btn => {
                const active = btn.dataset.theme === this.current;
                btn.setAttribute('aria-pressed', active);
                btn.classList.toggle('active', active);
            });
        },

        init() {
            const stored = this.load();
            const rootTheme = document.documentElement.dataset.theme;
            const initial = (rootTheme && THEMES.indexOf(rootTheme) !== -1) ? rootTheme : stored;
            this.apply(initial);

            document.querySelectorAll('.theme-btn, .theme-dot').forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = btn.dataset.theme;
                    if (typeof window.setTheme === 'function') window.setTheme(target);
                    else this.apply(target);
                });
            });
        }
    };

    window.Theme = Theme;
})();
