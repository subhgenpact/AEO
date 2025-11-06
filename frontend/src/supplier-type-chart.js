/**
 * Supplier Type Chart Module
 * Renders donut chart showing supplier distribution by type (Internal, AEO, External)
 */

function renderSupplierTypeChart() {
  console.log('📊 Rendering Supplier Type Distribution Chart');
  
  // Prevent double rendering - check if already rendering
  if (window._renderingSupplierTypeChart) {
    console.log('⚠️ Already rendering supplier type chart, skipping...');
    return;
  }
  
  window._renderingSupplierTypeChart = true;
  
  // Fetch supplier type distribution from backend
  fetch('/api/supplier-type-distribution')
    .then(response => response.json())
    .then(result => {
      if (result.status !== 'success' || !result.data || result.data.length === 0) {
        console.error('❌ No supplier type data available');
        return;
      }
      
      const supplierTypeData = result.data;
      console.log('✓ Supplier type data:', supplierTypeData);
      
      // Extract labels, counts, and percentages
      const labels = supplierTypeData.map(item => item.supplier_type);
      const counts = supplierTypeData.map(item => item.count);
      const percentages = supplierTypeData.map(item => item.percentage);
      const totalSuppliers = counts.reduce((sum, val) => sum + val, 0);
      
      // Define colors for each supplier type
      const colorMap = {
        'Internal': '#3b82f6',  // Blue
        'AEO': '#22c55e',       // Green
        'External': '#ef4444'   // Orange/Amber
      };
      
      const hoverColorMap = {
        'Internal': '#3b82f6',  // Blue
        'AEO': '#22c55e',       // Green
        'External': '#ef4444'   // Orange/Amber
      };
      
      const backgroundColor = labels.map(label => colorMap[label] || '#6b7280');
      const hoverBackgroundColor = labels.map(label => hoverColorMap[label] || '#4b5563');
      
      const ctx = document.getElementById('supplierChart');
      if (!ctx) {
        console.error('❌ supplierChart canvas not found');
        return;
      }
      
      // Destroy existing chart if it exists
      if (window.supplierChart && typeof window.supplierChart.destroy === 'function') {
        window.supplierChart.destroy();
      }
      
      // Create donut chart
      window.supplierChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            label: 'Parent Part Supplier',
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
          onClick: (event, activeElements) => {
            if (activeElements.length > 0) {
              const index = activeElements[0].index;
              const supplierType = labels[index];
              console.log('Clicked on supplier type:', supplierType);
              // Call the modal function
              if (typeof window.showSupplierTypeDetailsModal === 'function') {
                window.showSupplierTypeDetailsModal(supplierType);
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'right',
              labels: {
                boxWidth: 15,
                padding: 12,
                font: { size: 13, weight: '500' },
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
                size: 11
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
      
      console.log('✓ Supplier Type chart rendered successfully');
      window._renderingSupplierTypeChart = false;
    })
    .catch(error => {
      console.error('❌ Error fetching supplier type distribution:', error);
      window._renderingSupplierTypeChart = false;
    });
}

// Make function available globally
window.renderSupplierTypeChart = renderSupplierTypeChart;
