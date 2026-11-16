/* Browser-side discovery cache (localStorage), independent of the server cache. */
'use strict';

(function () {
    const KEY = 'explorer_cache_v1';
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    const MAX_ENTRIES = 300;

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    const Cache = {
        _store: {},
        KEY,
        maxAgeMs: MAX_AGE_MS,
        maxEntries: MAX_ENTRIES,

        _read(key, fallback = '') {
            try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
        },
        _write(key, value) {
            try { localStorage.setItem(key, value); } catch { /* storage disabled or full */ }
        },
        round(v, d) { return Math.round(v * 10 ** d) / 10 ** d; },

        init() {
            try {
                const saved = JSON.parse(this._read(this.KEY, '{}'));
                const cutoff = Date.now() - this.maxAgeMs;
                this._store = Object.fromEntries(
                    Object.entries(saved).filter(([, e]) => e && e.ts > cutoff && e.data)
                );
            } catch {
                this._store = {};
            }
            this.updateStats();
        },

        lookup(lat, lng) {
            const key = `${this.round(lat, 4)},${this.round(lng, 4)}`;
            const entry = this._store[key];
            if (!entry) return null;
            if (Date.now() - entry.ts > this.maxAgeMs) {
                delete this._store[key];
                return null;
            }
            return entry;
        },

        set(lat, lng, result) {
            const key = `${this.round(lat, 4)},${this.round(lng, 4)}`;
            this._store[key] = { ts: Date.now(), data: result };
            this._store = Object.fromEntries(
                Object.entries(this._store).sort((a, b) => b[1].ts - a[1].ts).slice(0, this.maxEntries)
            );
            this._write(this.KEY, JSON.stringify(this._store));
            this.updateStats();
        },

        clear() {
            this._store = {};
            this._write(this.KEY, '{}');
            this._write('explorer_hits', '0');
            this._write('explorer_misses', '0');
            this.updateStats();
        },

        recordHit() {
            this._write('explorer_hits', String(Number(this._read('explorer_hits', '0')) + 1));
            this.updateStats();
        },

        incrementMiss() {
            this._write('explorer_misses', String(Number(this._read('explorer_misses', '0')) + 1));
            this.updateStats();
        },

        updateStats() {
            const entries = Object.keys(this._store).length;
            const hits = this._read('explorer_hits', '0');
            const misses = this._read('explorer_misses', '0');
            setText('cache-hits', hits);
            setText('cache-entries', entries);
            setText('cache-misses', misses);
        setText('stat-cache', entries);
        setText('cache-summary', `${entries} locations remembered`);
        }
    };

    window.Cache = Cache;
    window.setText = setText;
})();