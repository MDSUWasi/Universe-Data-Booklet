/* MapViewer part 2: site list rendering, markers, detail panel.
   Classic script: registers extra methods on window.MapViewer. */
'use strict';

(function () {
    const M = window.MapViewer;
    M.renderSiteList = function () {
        const list = document.getElementById('map-sites');
        if (!list) return;
        list.innerHTML = '';
        Object.values(window.SITE_DATA).forEach(site => {
            const card = document.createElement('button');
            card.className = 'map-site';
            card.type = 'button';
            card.dataset.id = site.id;
            card.dataset.name = site.name.toLowerCase();
            card.onclick = () => this.focusOnSite(site.id);
            card.onmouseenter = () => {
                const marker = this.markers.find(m => m.getLatLng().lat === site.lat);
                if (marker) marker.openPopup();
            };
            card.onmouseleave = () => {
                if (this.activeMarker) return;
                this.markers.forEach(m => m.closePopup());
            };
            card.innerHTML = `<b>${site.name}</b><span>${site.body}</span><div class="ms-metric">${window.fmt(site.area)} km\u00b2</div>`;
            list.appendChild(card);

            const marker = L.marker([site.lat, site.lng], {
                icon: L.divIcon({
                    className: 'custom-pin',
                    html: `<div style="background:${site.color};width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
                    iconSize: [14, 14], iconAnchor: [7, 7]
                })
            });
            marker.on('popupopen', () => {
                this.setActiveMarker(marker);
                this.activeMarker = marker;
                this.renderDetail(site);
            });
            marker.on('popupclose', () => {
                this.activeMarker = null;
                this.setActiveMarker(null);
            });
            marker.bindPopup(`<b>${site.name}</b><br><span style="color:${window.PLANET_COLORS[site.body]}">\u25cf</span> ${site.body}<br><b>${window.fmt(site.meanRough)} m</b> mean roughness<br><b>${site.vsMoon}%</b> vs Moon reference`);
            this.markers.push(marker);
        });
    };

    M.updateSiteList = function () {
        this.markers = [];
        this.renderSiteList();
        this.switchLayer(this.currentLayer);
    };

    M.focusOnSite = function (id) {
        const site = window.SITE_DATA[id];
        if (!site) return;
        const bodyLayer = site.body === 'Moon' ? 'moon' : site.body === 'Mars' ? 'mars' : 'earth';
        if (bodyLayer !== this.currentLayer) this.switchLayer(bodyLayer);
        this.map.setView([site.lat, site.lng], 8);
        const marker = this.markers.find(m => m.getLatLng().lat === site.lat);
        if (marker) {
            this.markers.forEach(m => m.closePopup());
            marker.openPopup();
            this.setActiveMarker(marker);
        }
        document.querySelectorAll('.map-site').forEach(c => {
            c.classList.toggle('active', c.dataset.id === id);
        });
        this.renderDetail(site);
    };

    M.findNearestSite = function (lat, lng) {
        let best = null, bestDist = Infinity;
        Object.values(window.SITE_DATA).forEach(site => {
            const d = (site.lat - lat) ** 2 + (site.lng - lng) ** 2;
            if (d < bestDist) { bestDist = d; best = site; }
        });
        return bestDist < 200 ? best : null;
    };

    M._markerSite = function (marker) {
        const ll = marker.getLatLng();
        return Object.values(window.SITE_DATA).find(s => s.lat === ll.lat && s.lng === ll.lng) || null;
    };

    M.filterSiteList = function (query) {
        const q = query.trim().toLowerCase();
        document.querySelectorAll('.map-site').forEach(card => {
            const match = !q || card.dataset.name.includes(q) || card.querySelector('span').textContent.toLowerCase().includes(q);
            card.style.display = match ? '' : 'none';
        });
    };

    M.updateSiteCount = function () {
        const counter = document.getElementById('map-site-count');
        if (!counter) return;
        const count = Object.values(window.SITE_DATA).filter(s => s.body.toLowerCase() === (this.currentLayer === 'earth' ? 'earth' : this.currentLayer)).length;
        const text = this.currentLayer === 'all' ? 'Showing 5 sites' : `Showing ${count} ${this.currentLayer} sites`;
        counter.textContent = text;
    };

    M.retryTiles = function () {
        const btn = document.getElementById('map-retry');
        if (btn) btn.hidden = true;
        if (this.map) this.map.invalidateSize();
    };

    M.cycleBasemap = function () {
        if (this.currentLayer !== 'earth') {
            window.Toast.show('Basemap cycling is for Earth only; Moon/Mars use NASA Trek imagery');
            return;
        }
        this.basemapIndex = (this.basemapIndex + 1) % window.basemaps.length;
        this.switchLayer(this.currentLayer);
        window.Toast.show(`Basemap: ${window.basemaps[this.basemapIndex].name}`);
    };

    M.updateHoverTooltip = function (latlng) {
        if (!this.map || !latlng || !latlng.lat) return;
        const nearest = this.findNearestSite(latlng.lat, latlng.lng);
        if (!nearest) {
            if (this.hoverTooltip) { this.map.removeLayer(this.hoverTooltip); this.hoverTooltip = null; }
            return;
        }
        const dist = Math.sqrt(Math.pow(latlng.lat - nearest.lat, 2) + Math.pow(latlng.lng - nearest.lng, 2));
        if (dist > 15) {
            if (this.hoverTooltip) { this.map.removeLayer(this.hoverTooltip); this.hoverTooltip = null; }
            return;
        }
        const content = `<b>${nearest.name}</b><br>${window.fmt(nearest.meanRough)} m rough \u00b7 ${nearest.vsMoon}% vs Moon`;
        if (!this.hoverTooltip) {
            this.hoverTooltip = L.tooltip({ permanent: false, direction: 'top', offset: [0, -14], className: 'map-hover-tooltip' });
        }
        this.hoverTooltip.setLatLng(latlng).setContent(content).openOn(this.map);
    };

    M.fitAll = function () {
        if (!this.map || !this.markers.length) return;
        const bounds = L.latLngBounds(this.markers.map(m => m.getLatLng()));
        this.map.fitBounds(bounds, { padding: [40, 40] });
    };

    M.setActiveMarker = function (marker) {
        this.markers.forEach(m => {
            const el = m.getElement && m.getElement();
            if (el) el.classList.toggle('active', m === marker);
        });
    };
})();