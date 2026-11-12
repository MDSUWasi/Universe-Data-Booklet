/* Planetary Explorer -- iframe bootstrap.
 *
 * Project Base's modules reference API/asset URLs with absolute root paths
 * (e.g. fetch('/api/encyclopedia'), Leaflet tile URLs '/api/tiles/moon/{z}/{y}/{x}.jpg').
 *
 * When Project Base runs standalone (its own server) those resolve correctly.
 * When it is embedded as the native "🪐 Planetary Explorer" tab of Universe Data
 * Booklet, the iframe lives at /pb/ on the UDB server, so an absolute '/api/...'
 * request resolves against the *parent* origin and hits UDB's server -- which has
 * no such endpoint.  This bootstrap detects the iframe context and rewrites those
 * requests to be prefixed with /pb so the embedded app keeps working.
 *
 * Loaded FIRST (before any feature module) so the patched fetch/XHR are in place
 * before any runtime call.
 */
(function () {
    'use strict';

    // Detect whether we are embedded inside another page (the UDB iframe tab).
    var inIframe = false;
    try {
        inIframe = (window !== window.top);
    } catch (e) {
        // Cross-origin guard: treat as not-in-iframe (standalone).
        inIframe = false;
    }

    // The prefix that routes requests back into the embedded app.
    // Project Base's frontend is now merged directly into UDB's index.html and
    // its API routes are served at the root level, so no prefix is needed.
    var PB_BASE = '';

    // Expose for any module that wants to build URLs explicitly.
    window.PB_BASE = PB_BASE;
    window.pbPath = function (p) {
        if (!p) return p;
        if (p.charAt(0) !== '/') return p;            // relative URL: leave alone
        if (p.indexOf(PB_BASE + '/') === 0) return p; // already prefixed
        if (p === PB_BASE) return p;
        return PB_BASE + p;
    };

    // Rewrite an absolute root path to its embedded form.
    function rewrite(url) {
        if (typeof url !== 'string') return url;
        if (url.charAt(0) !== '/') return url;          // relative or absolute origin
        if (url.indexOf(PB_BASE + '/') === 0) return url;
        return PB_BASE + url;
    }

    // ---- Patch window.fetch -------------------------------------------------
    var _origFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
        if (typeof input === 'string') {
            input = rewrite(input);
        } else if (input && typeof input.url === 'string') {
            // Request object: build a new one with the rewritten URL.
            try {
                input = new Request(input.url, input);
            } catch (e) { /* fall through */ }
        }
        return _origFetch(input, init);
    };

    // ---- Patch XMLHttpRequest.open (catches Leaflet/XHR tile loading) -------
    var _origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        var args = Array.prototype.slice.call(arguments);
        if (typeof url === 'string' && url.charAt(0) === '/') {
            args[1] = rewrite(url);
        }
        return _origOpen.apply(this, args);
    };

    // ---- Patch Leaflet tile layer URL templates -----------------------------
    // Leaflet stores the tile URL on each *instance* (this._url) set in the
    // constructor, so patching the prototype descriptor is unreliable.  Instead
    // wrap the method that builds the final tile URL -- _getTileUrl -- so any
    // layer (created before or after this bootstrap) gets the /pb prefix when
    // embedded.  The basemaps module builds the URL template with {z}/{y}/{x}
    // placeholders, so we only prefix when the template starts with '/'.
    if (window.L && window.L.TileLayer && window.L.TileLayer.prototype) {
        var proto = window.L.TileLayer.prototype;
        if (typeof proto._getTileUrl === 'function' && !proto._pbPatched) {
            var _origGetTileUrl = proto._getTileUrl;
            proto._getTileUrl = function (coords, opts) {
                var url = _origGetTileUrl.call(this, coords, opts);
                if (typeof url === 'string' && url.charAt(0) === '/') {
                    return rewrite(url);
                }
                return url;
            };
            proto._pbPatched = true;
        }
    }

    // Surface the flag for diagnostics / conditional module behaviour.
    window.PB_IN_IFRAME = inIframe;

    // Apply the iframe-embed class only when actually inside an iframe.
    // When served inline within UDB the host page owns layout and scaling.
    if (inIframe) {
        document.documentElement.classList.add('iframe-embed');
        document.body.classList.add('iframe-embed');
    }
})();