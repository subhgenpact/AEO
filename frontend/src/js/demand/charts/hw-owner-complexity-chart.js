/**
 * HW Owner Part Complexity Chart Module
 * Renders stacked vertical bar chart showing part count by complexity level for each HW Owner
 */

function renderHWOwnerComplexityChart() {
    console.log('📊 Rendering HW Owner Part Complexity Chart');

    // Fetch HW owner by part complexity from backend
    fetch('/api/hw-owner-by-part-complexity')
        .then(response => response.json())
        .then(result => {
            if (result.status !== 'success' || !result.data || result.data.length === 0) {
                console.error('❌ No HW owner part complexity data available');
                return;
            }

            const hwOwnerData = result.data;
            console.log('✓ HW Owner part complexity data:', hwOwnerData);

            // Extract labels and data
            const labels = hwOwnerData.map(item => item.hw_owner);
            const highData = hwOwnerData.map(item => item.High || 0);
            const lowData = hwOwnerData.map(item => item.Low || 0);
            const moderateData = hwOwnerData.map(item => item.Moderate || 0);

            const ctx = document.getElementById('hwOwnerChart');
            if (!ctx) {
                console.error('❌ hwOwnerChart canvas not found');
                return;
            }

            // Destroy existing chart if it exists
            if (window.hwOwnerChart && typeof window.hwOwnerChart.destroy === 'function') {
                window.hwOwnerChart.destroy();
            }

            // Create stacked vertical bar chart
            window.hwOwnerChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'High',
                            data: highData,
                            backgroundColor: '#ef4444', // Red
                            borderColor: '#ffffff',
                            borderWidth: 1
                        },
                        {
                            label: 'Moderate',
                            data: moderateData,
                            backgroundColor: '#f97316', // Orange
                            borderColor: '#ffffff',
                            borderWidth: 1
                        },
                        {
                            label: 'Low',
                            data: lowData,
                            backgroundColor: '#3b82f6', // Blue
                            borderColor: '#ffffff',
                            borderWidth: 1
                        }

                    ]
                },
                plugins: [ChartDataLabels],
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'HW OWNER',
                                font: {
                                    size: 12,
                                    weight: 'normal'
                                }
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Count of Part Number',
                                font: {
                                    size: 12,
                                    weight: 'normal'
                                }
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            },
                            grid: {
                                display: true,
                                color: '#e5e7eb'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            align: 'end',
                            labels: {
                                boxWidth: 15,
                                padding: 10,
                                font: {
                                    size: 11
                                },
                                generateLabels: function (chart) {
                                    return chart.data.datasets.map((dataset, i) => ({
                                        text: dataset.label,
                                        fillStyle: dataset.backgroundColor,
                                        strokeStyle: dataset.borderColor,
                                        lineWidth: dataset.borderWidth,
                                        hidden: false,
                                        index: i
                                    }));
                                }
                            },
                            title: {
                                display: true,
                                text: 'Part Complexity',
                                font: {
                                    size: 11,
                                    weight: 'normal'
                                },
                                padding: {
                                    bottom: 5
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
                            cornerRadius: 6,
                            displayColors: true,
                            callbacks: {
                                title: (items) => {
                                    return items[0]?.label || '';
                                },
                                label: (context) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y || 0;
                                    return `${label}: ${value.toLocaleString()}`;
                                },
                                footer: (items) => {
                                    // Calculate total for this HW Owner
                                    const dataIndex = items[0].dataIndex;
                                    const total = highData[dataIndex] + lowData[dataIndex] + moderateData[dataIndex];
                                    return `Total: ${total.toLocaleString()}`;
                                }
                            }
                        },
                        // Add data labels on bars
                        datalabels: {
                            color: '#ffffff',
                            font: {
                                weight: 'bold',
                                size: 10
                            },
                            formatter: function (value, context) {
                                // Only show label if value is significant enough
                                if (value === 0) return '';
                                // Calculate percentage of total bar
                                const dataIndex = context.dataIndex;
                                const total = highData[dataIndex] + lowData[dataIndex] + moderateData[dataIndex];
                                const percentage = (value / total * 100);
                                // Only show if > 10% of the bar
                                if (percentage < 10) return '';
                                return value.toLocaleString();
                            },
                            anchor: 'center',
                            align: 'center',
                            clip: true
                        }
                    },
                    // Add click handler to open HW Owner details modal
                    onClick: (event, activeElements, chart) => {
                        if (activeElements.length > 0) {
                            const clickedIndex = activeElements[0].index;
                            const hwOwnerName = chart.data.labels[clickedIndex];
                            
                            console.log('🖱️ Clicked HW Owner:', hwOwnerName);
                            
                            // Call the modal function
                            if (typeof showHWOwnerDetailsModal === 'function') {
                                showHWOwnerDetailsModal(hwOwnerName);
                            } else {
                                console.error('❌ showHWOwnerDetailsModal function not found');
                            }
                        }
                    }
                }
            });

            console.log('✓ HW Owner Part Complexity chart rendered successfully');
        })
        .catch(error => {
            console.error('❌ Error fetching HW owner part complexity data:', error);
        });
}

// Make function available globally
window.renderHWOwnerComplexityChart = renderHWOwnerComplexityChart;
