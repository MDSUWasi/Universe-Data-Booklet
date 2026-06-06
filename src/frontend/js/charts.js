let chartInstance = null;

window.drawChart = function(data) {
    const canvas = document.getElementById('chart-canvas');
    if (!canvas || !data || !data.length) return;

    // Cleanup old chart
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    // Get theme colors
    const style = getComputedStyle(document.body);
    const primaryColor = style.getPropertyValue('--primary').trim() || '#4facfe';
    const textColor = style.getPropertyValue('--text')?.trim() || '#ffffff';

    // Take top 20 for performance
    const displayData = data.slice(0, 20);
    const labels = displayData.map(item => 
        (item.name || item.pl_name || 'Unknown').substring(0, 15) + '..'
    );
    
    const values = displayData.map(item => {
        if (item.diameter_km) return parseFloat(item.diameter_km);
        if (item.pl_rade) return parseFloat(item.pl_rade) * 1000;
        return 1;
    });

    chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Size Metric',
                data: values,
                backgroundColor: primaryColor,
                borderColor: '#ffffff',
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
                    text: 'Top 20 Objects by Size',
                    color: textColor,
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, maxRotation: 45, minRotation: 45 }
                }
            }
        }
    });
};