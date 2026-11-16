/* Map basemap definitions — retained for reference.
   The map view now uses three.js globe rendering with baked planet textures
   (earth.jpg, moon.jpg, mars.jpg) instead of Leaflet tile layers. */
'use strict';

(function () {
    window.basemaps = [];
    window.trekLayers = {};
    window.PLANET_COLORS = { Earth: '#4E8C6E', Moon: '#C9821A', Mars: '#F08080' };
})();
