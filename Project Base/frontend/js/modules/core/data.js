/* Shared core: site data + helpers. Classic script: registers window.SITE_DATA,
   window.PLANET_COLORS, window.SITES, window.fmt, window.setText.

   DATA PROVENANCE: every figure below is derived from the committed reports
   in output/reports/ (see docs/data_source.md for full provenance):
     - Moon  (Shackleton): LRO South Pole DEM, USGS/NASA (public domain)
     - McMurdo, Axel Heiberg, Kerguelen: Copernicus GLO-30, ESA/Airbus (free, attribution required)
     - Jezero: MRO CTX Controlled DTM, USGS/NASA (public domain)
   All metrics were computed on a common 30 m grid with a nominal 90 m roughness
   window, so the numbers are comparable across bodies.
   */
'use strict';

(function () {
    const SITE_DATA = {
        moon: {
            id: 'moon', name: 'Lunar South Pole (Shackleton)', lat: -89.9, lng: 0.0,
            body: 'Moon', area: 3.875, meanRough: 2.462, p95Rough: 4.138, maxRough: 7.775,
            slopeDiscipline: 0.92, vsMoon: 100, analogy: 'baseline', color: '#C9821A',
            description: 'Target landing zone near Shackleton Crater rim - permanent sunlight peaks with permanently shadowed craters nearby.',
            hasWeather: false
        },
        mcmurdo: {
            id: 'mcmurdo', name: 'McMurdo Dry Valleys', lat: -77.6, lng: 162.2,
            body: 'Earth', area: 250.242, meanRough: 2.294, p95Rough: 3.865, maxRough: 6.256,
            slopeDiscipline: 0.93, vsMoon: 93, analogy: 'strong analog', color: '#4E8C6E',
            description: 'Extreme polar desert, minimal biology, permafrost - the most studied Mars analog on Earth.',
            hasWeather: true
        },
        axel: {
            id: 'axel', name: 'Axel Heiberg Island', lat: 79.4, lng: -90.0,
            body: 'Earth', area: 81.175, meanRough: 2.232, p95Rough: 3.611, maxRough: 5.371,
            slopeDiscipline: 0.91, vsMoon: 91, analogy: 'strong analog', color: '#2E7D9A',
            description: 'Canadian Arctic, freeze-thaw cycles, exposed bedrock - an accessible northern polar analog.',
            hasWeather: true
        },
        kerguelen: {
            id: 'kerguelen', name: 'Kerguelen Islands', lat: -49.35, lng: 69.35,
            body: 'Earth', area: 1.241, meanRough: 1.352, p95Rough: 3.946, maxRough: 6.782,
            slopeDiscipline: 0.55, vsMoon: 55, analogy: 'weak analog', color: '#E07A5F',
            description: 'Volcanic basalt highlands, isolated oceanic - tests the "unexpected analog" hypothesis.',
            hasWeather: true
        },
        jezero: {
            id: 'jezero', name: 'Jezero Crater', lat: 18.4, lng: 77.6,
            body: 'Mars', area: 506.277, meanRough: 2.110, p95Rough: 3.744, maxRough: 7.6,
            slopeDiscipline: 0.86, vsMoon: 86, analogy: 'reference (Mars)', color: '#F08080',
            description: 'Perseverance rover site - ancient delta fan and lakebed - a benchmark for Martian terrain.',
            hasWeather: false
        }
    };

    const PLANET_COLORS = { Earth: '#4E8C6E', Moon: '#C9821A', Mars: '#F08080' };
    const SITES = () => Object.values(SITE_DATA);
    const fmt = (n, d = 3) => (Number.isFinite(n) ? n.toFixed(d) : '-');
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    window.SITE_DATA = SITE_DATA;
    window.PLANET_COLORS = PLANET_COLORS;
    window.SITES = SITES;
    window.fmt = fmt;
    window.setText = setText;
})();