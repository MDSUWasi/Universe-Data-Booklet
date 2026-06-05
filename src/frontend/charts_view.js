// src/frontend/charts_view.js
// I create a variable to hold the chart instance so I can destroy it later
let chartInstance = null;

/**
 * I render a bar chart comparing object sizes
 * @param {Array} data - The data array
 * @param {string} canvasId - The ID of the canvas element
 */
window.renderChart = function(data, canvasId = 'chart-canvas') {
    // I get the canvas element from the HTML
    const canvas = document.getElementById(canvasId);
    // If the canvas doesn't exist, I stop
    if (!canvas) {
        console.error(`Canvas #${canvasId} not found.`);
        return;
    }

    // If a chart already exists, I destroy it to prevent overlapping charts
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    // If there is no data, I stop
    if (!data || data.length === 0) return;

    // I prepare the data (take the top 15 items)
    const limit = 15;
    const displayData = data.slice(0, limit);
    
    // I create labels for the X-axis (names of planets/asteroids)
    const labels = displayData.map(item => {
        const name = item.name || item.pl_name || "Unknown";
        // I truncate long names so they fit
        return name.length > 12 ? name.substring(0, 10) + '..' : name;
    });
    
    // I create values for the Y-axis (sizes)
    const values = displayData.map(item => {
        if (item.diameter_km) {
            return parseFloat(item.diameter_km); // Asteroids: km
        }
        if (item.pl_rade) {
            return parseFloat(item.pl_rade) * 1000; // Exoplanets: Scale up for visibility
        }
        return 1;
    });

    // I get the current theme colors from CSS variables so the chart matches the site
    const style = getComputedStyle(document.body);
    const primaryColor = style.getPropertyValue('--primary').trim() || '#4facfe';
    const textColor = style.getPropertyValue('--text-main').trim() || '#ffffff';
    const gridColor = 'rgba(255, 255, 255, 0.1)';

    // I create the Chart.js instance
    chartInstance = new Chart(canvas, {
        type: 'bar', // I choose a bar chart
        data: {
            labels: labels,
            datasets: [{
                label: 'Size Metric',
                data: values,
                backgroundColor: primaryColor, // Use theme color
                borderColor: '#ffffff',
                borderWidth: 1,
                borderRadius: 4 // Rounded corners
            }]
        },
        options: {
            responsive: true, // Adjust to container size
            maintainAspectRatio: false, // Fill the container
            plugins: {
                legend: { display: false }, // Hide legend
                title: {
                    display: true,
                    text: 'Top ' + limit + ' Objects by Size',
                    color: textColor,
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: primaryColor,
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: textColor, 
                        maxRotation: 45, // Angle text for readability
                        minRotation: 45 
                    }
                }
            },
            animation: {
                duration: 1000, // 1 second animation
                easing: 'easeOutQuart'
            }
        }
    });
};