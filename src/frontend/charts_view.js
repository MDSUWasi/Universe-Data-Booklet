// src/frontend/charts_view.js
let chartInstance = null;

window.renderChart = function(data, canvasId = 'chart-canvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { console.error(`Canvas #${canvasId} not found.`); return; }

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    if (!data || data.length === 0) return;

    const MAX_CHART_ITEMS = 50;
    const displayData = data.slice(0, Math.min(MAX_CHART_ITEMS, data.length));
    
    const labels = displayData.map(item => {
        const name = item.name || item.pl_name || "Unknown";
        return name.length > 12 ? name.substring(0, 10) + '..' : name;
    });
    
    const values = displayData.map(item => {
        if (item.diameter_km) return parseFloat(item.diameter_km);
        if (item.pl_rade) return parseFloat(item.pl_rade) * 1000;
        return 1;
    });

    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--primary').trim() || '#8b6f47';
    const accentColor = style.getPropertyValue('--accent').trim() || '#c97b3c';
    const textColor = style.getPropertyValue('--text-chart').trim() || '#efe8de';
    const gridColor = style.getPropertyValue('--chart-grid').trim() || 'rgb(248, 232, 207)';

    chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Size Metric',
                data: values,
                backgroundColor: primaryColor,
                borderColor: accentColor,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: `Top ${displayData.length} Objects by Size`,
                    color: textColor,
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    backgroundColor: primaryColor,
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: accentColor,
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
                    ticks: { color: textColor, maxRotation: 45, minRotation: 45 }
                }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });
};
