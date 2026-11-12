/* Map basemap definitions, independent of the MapViewer logic.
   ATTRIBUTION: each tile URL carries its provider's required credit, which
   Leaflet renders on the map.  Earth basemaps are requested directly by the
   browser (not proxied); Moon/Mars come via the server's NASA Trek proxy. */
'use strict';

(function () {
    // Earth basemaps — each attribution is the provider's required credit.
    const basemaps = [
        { name: 'Esri Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri &mdash; Sources: Esri, Maxar, Earthstar Geographics' },
        { name: 'NASA Imagery', url: 'https://basemap.nationalmap.gov/arcgis/rest/services/Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; USGS The National Map' },
        { name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors (ODbL)' },
        { name: 'Carto Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; CARTO' }
    ];

    // NASA Trek WMTS proxies served by the server. Leaflet substitutes {y}=row, {x}=column.
    // Moon: LRO WAC Mosaic (public domain). Mars: Viking MDIM21 (public domain).
    const trekLayers = {
        moon: { url: '/api/tiles/moon/{z}/{y}/{x}.jpg', attribution: '&copy; NASA LRO WAC Mosaic (via Trek proxy, SQLite cached)' },
        mars: { url: '/api/tiles/mars/{z}/{y}/{x}.jpg', attribution: '&copy; NASA Mars Viking MDIM21 (via Trek proxy, SQLite cached)' }
    };

    const PLANET_COLORS = { Earth: '#4E8C6E', Moon: '#C9821A', Mars: '#F08080' };

    window.basemaps = basemaps;
    window.trekLayers = trekLayers;
    window.PLANET_COLORS = PLANET_COLORS;
})();