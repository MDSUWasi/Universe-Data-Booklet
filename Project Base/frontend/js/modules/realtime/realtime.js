/* Realtime dashboard: live data from free public APIs.
   Shows ISS position, astronauts in space, Mars weather, space weather,
   and recent earthquakes. Data comes from:
   - Open Notify (ISS, astronauts) — no key required
   - NASA Mars Weather, DONKI — demo key
   - USGS Earthquakes — no key required
   Classic script: registers window.Realtime. */
'use strict';

(function () {
    const R = {
        _iss: null,
        _astros: null,
        _marsWeather: null,
        _spaceWeather: null,
        _earthquakes: null,

        async loadAll() {
            await Promise.all([
                this._fetchIss(),
                this._fetchAstros(),
                this._fetchMarsWeather(),
                this._fetchSpaceWeather(),
                this._fetchEarthquakes(),
            ]);
            this.render();
        },

        async _fetchIss() {
            try {
                const res = await fetch('/api/space/iss');
                if (res.ok) this._iss = await res.json();
            } catch { /* silent — offline tolerance */ }
        },

        async _fetchAstros() {
            try {
                const res = await fetch('/api/space/astronauts');
                if (res.ok) this._astros = await res.json();
            } catch { /* silent */ }
        },

        async _fetchMarsWeather() {
            try {
                const res = await fetch('/api/nasa/mars-weather');
                if (res.ok) this._marsWeather = await res.json();
            } catch { /* silent */ }
        },

        async _fetchSpaceWeather() {
            try {
                const res = await fetch('/api/nasa/space-weather');
                if (res.ok) this._spaceWeather = await res.json();
            } catch { /* silent */ }
        },

        async _fetchEarthquakes() {
            try {
                const res = await fetch('/api/earth/earthquakes');
                if (res.ok) this._earthquakes = await res.json();
            } catch { /* silent */ }
        },

        render() {
            const panel = document.getElementById('realtime-content');
            if (!panel) return;

            const issHtml = this._iss
                ? `<div class="rt-card">
                    <div class="rt-kicker">🛰️ International Space Station</div>
                    <div class="rt-value">${this._iss.latitude.toFixed(3)}° N, ${this._iss.longitude.toFixed(3)}° E</div>
                    <div class="rt-note">Cache: ${this._iss.cache_state}</div>
                   </div>`
                : `<div class="rt-card empty">🛰️ ISS position unavailable</div>`;

            const astrosHtml = this._astros
                ? `<div class="rt-card">
                    <div class="rt-kicker">👨‍🚀 Astronauts in Space</div>
                    <div class="rt-value big">${this._astros.count}</div>
                    <div class="rt-people">${(this._astros.people || []).map(p => p.name + ' (' + p.craft + ')').join(', ')}</div>
                    <div class="rt-note">Cache: ${this._astros.cache_state}</div>
                   </div>`
                : `<div class="rt-card empty">👨‍🚀 Astronaut data unavailable</div>`;

            const marsHtml = this._marsWeather && this._marsWeather.report && this._marsWeather.report.sol
                ? `<div class="rt-card">
                    <div class="rt-kicker">🔴 Mars Weather (InSight)</div>
                    <div class="rt-value">${this._marsWeather.report.temperature !== null ? this._marsWeather.report.temperature.toFixed(1) + ' °C' : '—'}</div>
                    <div class="rt-detail">Sol ${this._marsWeather.report.sol} · Wind ${this._marsWeather.report.wind_speed !== null ? this._marsWeather.report.wind_speed.toFixed(1) + ' m/s' : '—'} · Pressure ${this._marsWeather.report.pressure !== null ? this._marsWeather.report.pressure.toFixed(1) + ' Pa' : '—'}</div>
                    <div class="rt-note">Cache: ${this._marsWeather.cache_state}</div>
                   </div>`
                : `<div class="rt-card empty">🔴 Mars weather unavailable</div>`;

            const swHtml = this._spaceWeather
                ? `<div class="rt-card">
                    <div class="rt-kicker">☀️ Space Weather (DONKI)</div>
                    <div class="rt-value big">${this._spaceWeather.count}</div>
                    <div class="rt-note">Events in last 7 days · Cache: ${this._spaceWeather.cache_state}</div>
                   </div>`
                : `<div class="rt-card empty">☀️ Space weather unavailable</div>`;

            const quakesHtml = this._earthquakes
                ? `<div class="rt-card">
                    <div class="rt-kicker">📉 Recent Earthquakes (USGS)</div>
                    <div class="rt-value big">${this._earthquakes.count}</div>
                    <div class="rt-list">${(this._earthquakes.quakes || []).slice(0, 6).map(q =>
                        '<div class="rt-event">' + q.place + ' <span style="font-size:0.75rem;color:var(--ink-mute)">· M' + q.mag + '</span></div>'
                    ).join('')}</div>
                    <div class="rt-note">Cache: ${this._earthquakes.cache_state}</div>
                   </div>`
                : `<div class="rt-card empty">📉 Earthquake data unavailable</div>`;

            panel.innerHTML = `
              <div class="realtime-grid">
                ${issHtml}
                ${astrosHtml}
                ${marsHtml}
                ${swHtml}
                ${quakesHtml}
              </div>
              <div class="realtime-footer">
                All data from free public APIs: Open Notify, NASA (InSight · DONKI), USGS. No API keys required.
              </div>
            `;
        },

        refresh() {
            this.loadAll();
        },
    };

    window.Realtime = R;
})();
