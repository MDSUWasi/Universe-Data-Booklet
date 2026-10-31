        // ============================================
        // GLOBAL DATA
        // ============================================
        const SITE_DATA = {
            moon: {
                name: "Lunar South Pole",
                lat: -89.9,
                lng: 0.0,
                type: "Moon",
                area: 3.875,
                meanRoughness: 0.293,
                p95Roughness: 0.518,
                vsMoon: 100,
                analogy: "Baseline",
                color: "#ffffff",
                badge: "badge-baseline"
            },
            mcmurdo: {
                name: "McMurdo Dry Valleys",
                lat: -77.6,
                lng: 162.2,
                type: "Earth (Antarctic)",
                area: 250.242,
                meanRoughness: 2.294,
                p95Roughness: 3.865,
                vsMoon: 93,
                analogy: "Strong Match",
                color: "#4ade80",
                badge: "badge-strong"
            },
            kerguelen: {
                name: "Kerguelen Islands",
                lat: -49.35,
                lng: 69.35,
                type: "Earth (Sub-Antarctic)",
                area: 1.241,
                meanRoughness: 1.352,
                p95Roughness: 3.946,
                vsMoon: 55,
                analogy: "Weak Match",
                color: "#facc15",
                badge: "badge-weak"
            },
            axel: {
                name: "Axel Heiberg Island",
                lat: 79.4,
                lng: -90.0,
                type: "Earth (Arctic)",
                area: 81.175,
                meanRoughness: 2.232,
                p95Roughness: 3.611,
                vsMoon: 91,
                analogy: "Strong Match",
                color: "#4ade80",
                badge: "badge-strong"
            },
            mars: {
                name: "Jezero Crater",
                lat: 18.4,
                lng: 77.6,
                type: "Mars",
                area: 506.277,
                meanRoughness: 2.110,
                p95Roughness: 3.744,
                vsMoon: 86,
                analogy: "Strong Match",
                color: "#ef4444",
                badge: "badge-strong"
            }
        };

        // ============================================
        // THREE.JS BACKGROUND ANIMATION
        // ============================================
        function initBackground() {
            const canvas = document.getElementById('bg-canvas');
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });

            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            // Star particles
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            for (let i = 0; i < 5000; i++) {
                vertices.push(
                    (Math.random() - 0.5) * 2000,
                              (Math.random() - 0.5) * 2000,
                              (Math.random() - 0.5) * 2000
                );
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
            const stars = new THREE.Points(geometry, material);
            scene.add(stars);

            camera.position.z = 500;

            function animate() {
                requestAnimationFrame(animate);
                stars.rotation.x += 0.0003;
                stars.rotation.y += 0.0005;
                renderer.render(scene, camera);
            }
            animate();

            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
        }

        // ============================================
        // MODAL FUNCTIONS
        // ============================================
        function openModal(id) {
            const modal = document.getElementById(`modal-${id}`);
            modal.classList.add('active');
            gsap.to(modal, { opacity: 1, duration: 0.4 });

            // Initialize specific features when opened
            if (id === 'map') setTimeout(initMap, 100);
            if (id === 'compare') setTimeout(populateTable, 100);
        }

        function closeModal(id) {
            const modal = document.getElementById(`modal-${id}`);
            gsap.to(modal, { opacity: 0, duration: 0.4, onComplete: () => {
                modal.classList.remove('active');
            }});
        }

        // Close on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });

        // ============================================
        // LEAFLET MAP
        // ============================================
        let mapInitialized = false;
        function initMap() {
            if (mapInitialized) return;
            mapInitialized = true;

            const map = L.map('feature-map').setView([20, 0], 2);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(map);

            const createIcon = (color) => {
                return L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="width: 32px; height: 32px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 20px ${color};"></div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
            };

            Object.entries(SITE_DATA).forEach(([key, site]) => {
                const marker = L.marker([site.lat, site.lng], { icon: createIcon(site.color) }).addTo(map);
                const popupContent = `
                <div style="color: #000; min-width: 250px;">
                <h3 style="color: ${site.color};">${site.name}</h3>
                <p><strong>Type:</strong> ${site.type}</p>
                <p><strong>Area:</strong> ${site.area.toFixed(2)} km²</p>
                <p><strong>Mean Roughness:</strong> ${site.meanRoughness.toFixed(3)} m</p>
                <p><strong>p95 Roughness:</strong> ${site.p95Roughness.toFixed(3)} m</p>
                <p><strong>vs Moon:</strong> ${site.vsMoon}%</p>
                </div>
                `;
                marker.bindPopup(popupContent);
            });

            const bounds = L.latLngBounds(Object.values(SITE_DATA).map(s => [s.lat, s.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        // ============================================
        // SITE SELECTOR LOGIC
        // ============================================
        function runSelector() {
            const slopeLimit = parseFloat(document.getElementById('priority-slope').value);
            const minArea = parseFloat(document.getElementById('priority-area').value);
            const maxRoughness = parseFloat(document.getElementById('priority-roughness').value);

            document.getElementById('selector-loading').style.display = 'block';
            document.getElementById('selector-results').classList.remove('show');

            setTimeout(() => {
                let results = [];
                Object.entries(SITE_DATA).forEach(([key, site]) => {
                    if (site.type.includes('Earth')) {
                        let score = 100;
                        if (site.meanRoughness > maxRoughness) score -= Math.min(30, (site.meanRoughness - maxRoughness) * 10);
                        if (site.area < minArea) score -= 50;
                        if (site.area > 200) score += 10;
                        results.push({
                            name: site.name, type: site.type, score: Math.max(0, score).toFixed(1),
                                     area: site.area.toFixed(2), roughness: site.meanRoughness.toFixed(3), analogy: site.analogy
                        });
                    }
                });
                results.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

                const outputDiv = document.getElementById('ranking-output');
                outputDiv.innerHTML = results.map((r, i) => `
                <div class="result-item">
                <span><strong>#${i+1}</strong> ${r.name} (${r.type})<br><small>Area: ${r.area} km² | Roughness: ${r.roughness} m</small></span>
                <span class="result-score">${r.score}%</span>
                </div>
                `).join('');

                document.getElementById('selector-loading').style.display = 'none';
                document.getElementById('selector-results').classList.add('show');
            }, 800);
        }

        // ============================================
        // SIMILARITY CALCULATOR
        // ============================================
        let similarityChart = null;
        function calculateSimilarity() {
            const targetRoughness = parseFloat(document.getElementById('calc-roughness').value);
            const targetP95 = parseFloat(document.getElementById('calc-p95').value);

            document.getElementById('calculator-loading').style.display = 'block';
            document.getElementById('calculator-results').classList.remove('show');

            setTimeout(() => {
                let results = [];
                Object.entries(SITE_DATA).forEach(([key, site]) => {
                    if (site.type.includes('Earth')) {
                        const roughDiff = Math.abs(site.meanRoughness - targetRoughness);
                        const p95Diff = Math.abs(site.p95Roughness - targetP95);
                        const distance = Math.sqrt(roughDiff ** 2 + p95Diff ** 2);
                        const similarity = Math.max(0, 100 - distance * 20);
                        results.push({ name: site.name, type: site.type, similarity: similarity.toFixed(1), analogy: site.analogy });
                    }
                });
                results.sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity));

                const outputDiv = document.getElementById('similarity-output');
                outputDiv.innerHTML = results.map(r => `
                <div class="result-item">
                <span><strong>${r.name}</strong> (${r.type})<br><small>${r.analogy}</small></span>
                <span class="result-score">${r.similarity}%</span>
                </div>
                `).join('');

                document.getElementById('calculator-loading').style.display = 'none';
                document.getElementById('calculator-results').classList.add('show');

                // Create chart
                const ctx = document.getElementById('similarity-chart').getContext('2d');
                if (similarityChart) similarityChart.destroy();
                similarityChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: results.map(r => r.name.split(' ')[0]),
                                            datasets: [{
                                                label: 'Similarity to Target (%)',
                                            data: results.map(r => parseFloat(r.similarity)),
                                            backgroundColor: ['#6d4aff', '#00d9ff', '#4ade80', '#facc15'],
                                            borderRadius: 8
                                            }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, max: 100 } }
                    }
                });
            }, 800);
        }

        // ============================================
        // MISSION PLANNER
        // ============================================
        function planMission() {
            const missionType = document.getElementById('mission-type').value;
            const planet = document.getElementById('target-planet').value;
            const duration = document.getElementById('duration').value;

            document.getElementById('planner-loading').style.display = 'block';
            document.getElementById('planner-results').classList.remove('show');

            setTimeout(() => {
                let recommendation = planet === 'moon' ? "McMurdo Dry Valleys (Antarctica)" : "Axel Heiberg Island (Canadian Arctic)";
                let reasoning = planet === 'moon'
                ? "Extreme cold, permafrost, minimal biological activity. Ideal for equipment reliability testing."
                : "Freeze-thaw cycles, geological analog to Martian polar regions.";

                const durations = { week: "Short-term validation", month: "Comprehensive testing", quarter: "Extended endurance", year: "Long-duration assessment" };

                const outputDiv = document.getElementById('mission-output');
                outputDiv.innerHTML = `
                <div class="result-item">
                <span style="flex: 2;"><strong>Recommended:</strong> ${recommendation}<br><small>${reasoning}</small></span>
                </div>
                <div class="result-item">
                <span style="flex: 2;"><strong>Profile:</strong> ${missionType} • ${planet === 'moon' ? 'Lunar' : 'Martian'} • ${duration.toUpperCase()}<br><small>${durations[duration]}</small></span>
                </div>
                `;

                document.getElementById('planner-loading').style.display = 'none';
                document.getElementById('planner-results').classList.add('show');
            }, 800);
        }

        // ============================================
        // POPULATE COMPARISON TABLE
        // ============================================
        let barChart = null;
        function populateTable() {
            const tbody = document.getElementById('comparison-tbody');
            tbody.innerHTML = '';

            Object.entries(SITE_DATA).forEach(([key, site]) => {
                const row = document.createElement('tr');
                const statusText = site.analogy === 'Strong Match' ? '✓ Strong' : site.analogy === 'Baseline' ? '★ Baseline' : '⚠ Weak';
                row.innerHTML = `
                <td><strong>${site.name}</strong></td>
                <td style="color: ${site.color};">${site.type}</td>
                <td>${site.area.toFixed(2)}</td>
                <td>${site.meanRoughness.toFixed(3)}</td>
                <td>${site.p95Roughness.toFixed(3)}</td>
                <td style="font-weight: bold; color: ${site.color};">${site.vsMoon}%</td>
                <td><span class="status-badge ${site.badge}">${statusText}</span></td>
                `;
                tbody.appendChild(row);
            });

            // Create bar chart
            setTimeout(() => {
                const ctx = document.getElementById('bar-chart').getContext('2d');
                if (barChart) barChart.destroy();
                barChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Lunar SP', 'McMurdo', 'Kerguelen', 'Axel Heiberg', 'Jezero'],
                        datasets: [{
                            label: 'Mean Roughness (m)',
                                     data: [0.293, 2.294, 1.352, 2.232, 2.110],
                                     backgroundColor: ['#ffffff', '#4ade80', '#facc15', '#4ade80', '#ef4444']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, title: { display: true, text: 'Roughness (m)' } } }
                    }
                });
            }, 100);
        }

        // ============================================
        // INITIALIZATION
        // ============================================
        document.addEventListener('DOMContentLoaded', () => {
            initBackground();
            gsap.from('.hero-content', { opacity: 0, y: 50, duration: 1, delay: 0.5 });
        });
