/* MapViewer part 1: Leaflet atlas init and layer switching.
   Classic script: registers window.MapViewer. */
'use strict';

(function () {
    const M = {
        map: null,
        layerGroup: null,
        markers: [],
        markerLayer: null,
        currentLayer: 'earth',
        hoverTooltip: null,
        activeMarker: null,
        tileLayer: null,
        scale: null,
        basemapIndex: 0
    };

    M.init = function (layerName = 'earth') {
        if (this.map) { this.switchLayer(layerName); return; }
        const container = document.getElementById('map');
        if (!container) return;
        this.map = L.map('map', {
            center: [10, 20], zoom: 2, minZoom: 2, zoomControl: true,
            attributionControl: true, doubleClickZoom: false,
            fadeAnimation: true, zoomAnimation: true, markerZoomAnimation: true
        });
        this.map.on('dblclick', e => {
            const nearest = this.findNearestSite(e.latlng.lat, e.latlng.lng);
            if (nearest) this.focusOnSite(nearest.id);
        });
        this.map.on('mousemove', e => this.updateHoverTooltip(e.latlng));
        this.layerGroup = L.layerGroup().addTo(this.map);
        this.markerLayer = L.layerGroup().addTo(this.map);
        this.scale = L.control.scale({ position: 'bottomright', metric: true, imperial: false, maxLength: 80 });
        this.scale.addTo(this.map);
        this.renderSiteList();
        this.switchLayer(layerName);
        this.updateSiteCount();

        document.querySelectorAll('.layer-btn').forEach(btn => {
            btn.onclick = () => this.switchLayer(btn.dataset.layer);
        });
        const fitBtn = document.getElementById('map-fit');
        if (fitBtn) fitBtn.onclick = () => this.fitAll();
        const baseBtn = document.getElementById('map-tiles');
        if (baseBtn) baseBtn.onclick = () => this.cycleBasemap();
        const retryBtn = document.getElementById('map-retry');
        if (retryBtn) retryBtn.onclick = () => this.retryTiles();
        const search = document.getElementById('map-search');
        if (search) search.oninput = () => this.filterSiteList(search.value);
        this.clearDetail();
    };

    M.switchLayer = function (name) {
        this.currentLayer = name;
        document.querySelectorAll('.layer-btn').forEach(b => {
            const isActive = b.dataset.layer === name;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-pressed', isActive);
        });
        this.layerGroup.clearLayers();
        const bodyFilter = name === 'earth' ? 'Earth' : name === 'moon' ? 'Moon' : 'Mars';
        this.markers.forEach(m => {
            const site = this._markerSite(m);
            if (site && site.body === bodyFilter) this.layerGroup.addLayer(m);
        });
        let url, attribution;
        if (name === 'moon') { url = window.trekLayers.moon.url; attribution = window.trekLayers.moon.attribution; }
        else if (name === 'mars') { url = window.trekLayers.mars.url; attribution = window.trekLayers.mars.attribution; }
        else { const bm = window.basemaps[this.basemapIndex]; url = bm.url; attribution = bm.attribution; }
        try {
            if (this.tileLayer && this.map.hasLayer(this.tileLayer)) this.map.removeLayer(this.tileLayer);
            this.tileLayer = L.tileLayer(url, { attribution, maxZoom: 6, opacity: 0.92 }).addTo(this.map);
        } catch (e) {
            console.error('Tile Load Error', e);
            const status = document.getElementById('map-status');
            if (status) status.textContent = 'Tiles loading... (fallback active)';
        }
        this.updateSiteCount();
    };

    window.MapViewer = M;
})();