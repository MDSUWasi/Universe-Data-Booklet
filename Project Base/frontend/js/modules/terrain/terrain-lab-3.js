/* 3D Terrain Lab part 3: asset loading, validation, geometry, render.
   Classic script: extends window.TerrainLab. */
'use strict';

(function () {
    const T = window.TerrainLab;

    T.loadSelectedSite = function () {
        const id = document.getElementById('terrain-site').value;
        const site = Object.values(window.SITE_DATA).find(candidate => candidate.id === id);
        if (!site) return;
        this.site = site;
        this.setStatus('Loading ' + site.name + ' DEM window\u2026');
        (async () => {
            try {
                let asset = this.assets.get(id);
                if (!asset) {
                    const response = await fetch('assets/terrain/' + encodeURIComponent(id) + '.json');
                    if (!response.ok) throw new Error('Terrain asset returned HTTP ' + response.status);
                    asset = await response.json();
                    this.validateAsset(asset, id);
                    this.assets.set(id, asset);
                }
                this.asset = asset;
                this.updateGeometry();
                document.getElementById('terrain-meta').innerHTML =
                    '<span>Source: <strong>' + asset.source_dem + '</strong></span>' +
                    '<span>Window: <strong>' + asset.window_m + ' m</strong></span>' +
                    '<span>Valid non-filled cells: <strong>' + (asset.valid_fraction * 100).toFixed(1) + '%</strong></span>' +
                    '<span>\u22643\u00b0 screen: <strong>' + (asset.slope_screen_fraction * 100).toFixed(1) + '%</strong></span>' +
                    '<span>Elevation range: <strong>' + asset.elevation_min_m.toFixed(1) + '\u2013' + asset.elevation_max_m.toFixed(1) + ' m</strong></span>';
                this.setStatus(site.name + ' terrain loaded from local DEM assets.');
            } catch (error) {
                this.setStatus('Terrain unavailable: ' + error.message);
            }
        })();
    };

    T.validateAsset = function (asset, id) {
        const expected = asset.grid_size * asset.grid_size;
        if (asset.id !== id || asset.schema_version !== 1 || asset.grid_size !== 128) {
            throw new Error('Unsupported or mismatched terrain asset');
        }
        ['elevation_u8', 'slope_u8', 'roughness_u8', 'valid_mask', 'slope_screen_mask'].forEach(function (key) {
            if (!Array.isArray(asset[key]) || asset[key].length !== expected) {
                throw new Error('Terrain asset has an invalid ' + key + ' grid');
            }
        });
    };

    T.updateGeometry = function () {
        if (!this.asset || !window.THREE || !this.scene) return;
        const size = this.asset.grid_size;
        const elevations = this.asset.elevation_u8;
        const slopes = this.asset.slope_u8;
        const roughness = this.asset.roughness_u8;
        const valid = this.asset.valid_mask;
        const safe = this.asset.slope_screen_mask;
        const positions = new Float32Array(size * size * 3);
        const colors = new Float32Array(size * size * 3);
        const color = new THREE.Color();
        const useElevation = this.mode === 'elevation' || this.mode === 'safe';
        const unitsScale = this.mode === 'slope' ? this.asset.slope_scale_deg : this.asset.roughness_scale_m;
        const values = this.mode === 'slope' ? slopes : roughness;

        for (let row = 0; row < size; row++) {
            for (let column = 0; column < size; column++) {
                const index = row * size + column;
                const positionIndex = index * 3;
                const value = values[index] / 255 * unitsScale;
                const height = useElevation
                    ? (elevations[index] / 255 - 0.5) * 0.34 * this.exaggeration
                    : value / unitsScale * 0.34 * this.exaggeration;
                positions[positionIndex] = (column / (size - 1) - 0.5) * 2;
                positions[positionIndex + 1] = valid[index] ? height : -0.18;
                positions[positionIndex + 2] = (row / (size - 1) - 0.5) * 2;

                if (!valid[index]) color.set('#252a33');
                else if (this.mode === 'safe') color.set(safe[index] ? '#55d6a5' : '#e16b63');
                else if (this.mode === 'elevation') color.setHSL(0.58 - elevations[index] / 255 * 0.48, 0.68, 0.42 + elevations[index] / 255 * 0.12);
                else { const intensity = Math.min(1, value / unitsScale); color.setHSL(0.34 - intensity * 0.33, 0.78, 0.46); }
                colors[positionIndex] = color.r;
                colors[positionIndex + 1] = color.g;
                colors[positionIndex + 2] = color.b;
            }
        }

        const indices = [];
        for (let row = 0; row < size - 1; row++) {
            for (let column = 0; column < size - 1; column++) {
                const topLeft = row * size + column;
                const topRight = topLeft + 1;
                const bottomLeft = topLeft + size;
                const bottomRight = bottomLeft + 1;
                if (valid[topLeft] && valid[topRight] && valid[bottomLeft]) indices.push(topLeft, bottomLeft, topRight);
                if (valid[topRight] && valid[bottomLeft] && valid[bottomRight]) indices.push(topRight, bottomLeft, bottomRight);
            }
        }

        if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setIndex(indices);
        this.geometry.computeVertexNormals();
        this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({
            vertexColors: true, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide
        }));
        this.mesh.rotation.set(this.rotationX, this.rotationY, 0);
        this.scene.add(this.mesh);
        this.render();
    };

    T.render = function () {
        if (!this.renderer || !this.scene || !this.camera) return;
        if (this.mesh) this.mesh.rotation.set(this.rotationX, this.rotationY, 0);
        this.renderer.render(this.scene, this.camera);
    };

    T.setStatus = function (message) {
        const element = document.getElementById('terrain-status');
        if (element) element.textContent = message;
    };
})();