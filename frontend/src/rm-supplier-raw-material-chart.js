/**
 * RM Supplier Raw Material Chart Module
 * Renders donut chart showing RM supplier count distribution by raw material type
 */

function renderRMSupplierRawMaterialChart() {
  console.log('📊 Rendering RM Supplier by Raw Material Chart');
  
  // Prevent double rendering
  if (window._renderingRMSupplierChart) {
    console.log('⚠️ Already rendering RM supplier chart, skipping...');
    return;
  }
  
  window._renderingRMSupplierChart = true;
  
  // Fetch RM supplier by raw material from backend
  fetch('/api/rm-supplier-by-raw-material')
    .then(response => response.json())
    .then(result => {
      if (result.status !== 'success' || !result.data || result.data.length === 0) {
        console.error('❌ No RM supplier raw material data available');
        window._renderingRMSupplierChart = false;
        return;
      }
      
      const rawMaterialData = result.data;
      console.log('✓ RM supplier raw material data:', rawMaterialData);
      
      // Extract labels, counts, and percentages
      const labels = rawMaterialData.map(item => item.raw_material);
      const counts = rawMaterialData.map(item => item.count);
      const percentages = rawMaterialData.map(item => item.percentage);
      const totalSuppliers = counts.reduce((sum, val) => sum + val, 0);
      
      // Define colors for each raw material type (matching the attached image)
      const colorPalette = [
        '#3b82f6',  // Blue - Casting Structural
        '#1e40af',  // Dark Blue - Forging Ring
        '#f97316',  // Orange - Detail Part
        '#7c3aed',  // Purple - Casting Airfoil
        '#ec4899',  // Pink - Casting Other
        '#8b5cf6',  // Violet - Plate
        '#eab308',  // Yellow - Forging Closed Die
        '#ef4444'   // Red - Forging Powder
      ];
      
      const backgroundColor = labels.map((label, index) => colorPalette[index % colorPalette.length]);
      const hoverBackgroundColor = labels.map((label, index) => colorPalette[index % colorPalette.length]);
      
      const ctx = document.getElementById('rmDetailChart');
      if (!ctx) {
        console.error('❌ rmDetailChart canvas not found');
        window._renderingRMSupplierChart = false;
        return;
      }
      
      // Destroy existing chart if it exists
      if (window.rmSupplierChart && typeof window.rmSupplierChart.destroy === 'function') {
        window.rmSupplierChart.destroy();
      }
      
      // Create donut chart
      window.rmSupplierChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            label: 'RM Supplier',
            data: counts,
            backgroundColor: backgroundColor,
            borderColor: '#ffffff',
            borderWidth: 3,
            hoverBackgroundColor: hoverBackgroundColor,
            hoverBorderWidth: 4,
            cutout: '50%' // Reduce donut size to make labels more visible
          }]
        },
        plugins: [ChartDataLabels],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 20,
              bottom: 20,
              left: 20,
              right: 20
            }
          },
          interaction: { intersect: true, mode: 'nearest' },
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1000
          },
          plugins: {
            legend: {
              display: true,
              position: 'right',
              labels: {
                boxWidth: 15,
                padding: 8,
                font: { size: 11, weight: '500' },
                generateLabels: function (chart) {
                  const data = chart.data;
                  if (data.labels.length && data.datasets.length) {
                    return data.labels.map((label, i) => {
                      return {
                        text: `${label}`,
                        fillStyle: data.datasets[0].backgroundColor[i],
                        strokeStyle: data.datasets[0].borderColor,
                        lineWidth: 2,
                        hidden: false,
                        index: i
                      };
                    });
                  }
                  return [];
                }
              },
              title: {
                display: true,
                text: 'Raw Material',
                font: {
                  size: 12,
                  weight: '600'
                },
                padding: {
                  bottom: 10
                }
              }
            },
            title: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              borderColor: '#ffffff',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                title: (items) => items?.[0]?.label || '',
                label: (ctx) => {
                  const value = counts[ctx.dataIndex];
                  const percentage = percentages[ctx.dataIndex];
                  return `${value.toLocaleString()} (${percentage}%)`;
                }
              }
            },
            // Add data labels outside the donut
            datalabels: {
              display: true,
              color: '#000000',
              font: {
                weight: 'bold',
                size: 10
              },
              formatter: function (value, context) {
                const count = counts[context.dataIndex];
                const percentage = percentages[context.dataIndex];
                return `${count} (${percentage}%)`;
              },
              anchor: 'end',
              align: 'end',
              offset: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 4,
              padding: 4
            }
          }
        }
      });
      
      console.log('✓ RM Supplier Raw Material chart rendered successfully');
      window._renderingRMSupplierChart = false;
    })
    .catch(error => {
      console.error('❌ Error fetching RM supplier raw material data:', error);
      window._renderingRMSupplierChart = false;
    });
}

// Make function available globally
window.renderRMSupplierRawMaterialChart = renderRMSupplierRawMaterialChart;
