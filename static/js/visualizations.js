// Variables to store chart instances
let relationshipStrengthChart = null;
let interactionFrequencyChart = null;
let emotionTimelineChart = null;

// Initialize visualizations page
document.addEventListener('DOMContentLoaded', function() {
    // Load people for person selector
    loadPeopleForSelector();
    
    // Load initial visualizations
    loadRelationshipStrengthVisualization();
    loadInteractionFrequencyVisualization();
    
    // Set up person selector change event
    const personSelector = document.getElementById('person-selector');
    if (personSelector) {
        personSelector.addEventListener('change', function() {
            const personId = this.value;
            if (personId) {
                loadEmotionTimelineVisualization(personId);
            } else {
                // If no person selected, clear the emotion timeline chart
                if (emotionTimelineChart) {
                    emotionTimelineChart.destroy();
                    emotionTimelineChart = null;
                    document.getElementById('emotion-timeline-chart-container').innerHTML = 
                        '<div class="text-center py-5">Select a person to view their emotion timeline</div>';
                }
            }
        });
    }
});

// Load people for the person selector
function loadPeopleForSelector() {
    fetch('/api/people')
        .then(response => response.json())
        .then(people => {
            const personSelector = document.getElementById('person-selector');
            
            // Clear existing options
            personSelector.innerHTML = '<option value="">Select a person</option>';
            
            // Add people options
            people.forEach(person => {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.name;
                personSelector.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading people:', error);
            showAlert('Failed to load people for selector', 'danger');
        });
}

// Load relationship strength visualization
function loadRelationshipStrengthVisualization() {
    fetch('/api/visualizations/relationship-strength')
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                document.getElementById('relationship-strength-chart-container').innerHTML = 
                    '<div class="text-center py-5">No data available. Add journal entries with people to see visualizations</div>';
                return;
            }
            
            // Prepare data for chart
            const labels = data.map(item => item.name);
            const entryCountData = data.map(item => item.entry_count);
            const avgSentimentData = data.map(item => item.avg_sentiment);
            
            // Generate sentiment colors (green for positive, red for negative)
            const sentimentColors = avgSentimentData.map(sentiment => {
                if (sentiment > 0.3) return 'rgba(40, 167, 69, 0.7)';  // Green for positive
                if (sentiment < -0.3) return 'rgba(220, 53, 69, 0.7)'; // Red for negative
                return 'rgba(108, 117, 125, 0.7)';                     // Gray for neutral
            });
            
            // Get the canvas element
            const ctx = document.getElementById('relationship-strength-chart').getContext('2d');
            
            // Destroy existing chart if it exists
            if (relationshipStrengthChart) {
                relationshipStrengthChart.destroy();
            }
            
            // Create new chart
            relationshipStrengthChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Number of Entries',
                            data: entryCountData,
                            backgroundColor: 'rgba(13, 110, 253, 0.7)',
                            borderColor: 'rgba(13, 110, 253, 1)',
                            borderWidth: 1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Average Sentiment',
                            data: avgSentimentData,
                            backgroundColor: sentimentColors,
                            borderColor: sentimentColors.map(color => color.replace('0.7', '1')),
                            borderWidth: 1,
                            yAxisID: 'y1',
                            type: 'bar'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Relationship Strength and Sentiment'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Number of Entries'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            min: -1,
                            max: 1,
                            title: {
                                display: true,
                                text: 'Sentiment Score'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading relationship strength data:', error);
            showAlert('Failed to load relationship strength visualization', 'danger');
        });
}

// Load interaction frequency visualization
function loadInteractionFrequencyVisualization() {
    fetch('/api/visualizations/interaction-frequency')
        .then(response => response.json())
        .then(data => {
            // Check if we have data
            if (Object.keys(data).length === 0) {
                document.getElementById('interaction-frequency-chart-container').innerHTML = 
                    '<div class="text-center py-5">No data available. Add journal entries with people to see visualizations</div>';
                return;
            }
            
            // Prepare data for chart
            const peopleNames = Object.keys(data);
            
            // Get all unique months across all people
            const allMonths = new Set();
            peopleNames.forEach(name => {
                data[name].forEach(item => {
                    allMonths.add(item.month);
                });
            });
            
            // Convert to array and sort chronologically
            const monthLabels = Array.from(allMonths).sort();
            
            // Create datasets for each person
            const datasets = peopleNames.map((name, index) => {
                // Generate a color based on index
                const hue = (index * 137) % 360; // Use golden ratio to spread colors
                const color = `hsl(${hue}, 70%, 60%)`;
                
                // Create array of counts matching the monthLabels
                const counts = monthLabels.map(month => {
                    const entry = data[name].find(item => item.month === month);
                    return entry ? entry.count : 0;
                });
                
                return {
                    label: name,
                    data: counts,
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 2,
                    tension: 0.3
                };
            });
            
            // Get the canvas element
            const ctx = document.getElementById('interaction-frequency-chart').getContext('2d');
            
            // Destroy existing chart if it exists
            if (interactionFrequencyChart) {
                interactionFrequencyChart.destroy();
            }
            
            // Format month labels for display (YYYY-MM to MMM YYYY)
            const formattedMonthLabels = monthLabels.map(monthStr => {
                const [year, month] = monthStr.split('-');
                const date = new Date(year, parseInt(month) - 1);
                return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
            });
            
            // Create new chart
            interactionFrequencyChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: formattedMonthLabels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Interaction Frequency Over Time'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Interactions'
                            },
                            ticks: {
                                stepSize: 1
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading interaction frequency data:', error);
            showAlert('Failed to load interaction frequency visualization', 'danger');
        });
}

// Load emotion timeline visualization for a specific person
function loadEmotionTimelineVisualization(personId) {
    fetch(`/api/visualizations/emotion-timeline/${personId}`)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                document.getElementById('emotion-timeline-chart-container').innerHTML = 
                    '<div class="text-center py-5">No entries found for this person</div>';
                return;
            }
            
            // Prepare data for chart
            const dates = data.map(item => item.date);
            const sentiments = data.map(item => item.sentiment);
            const titles = data.map(item => item.title);
            const moods = data.map(item => item.mood || 'Not specified');
            
            // Generate point colors based on sentiment
            const pointColors = sentiments.map(sentiment => {
                if (sentiment > 0.3) return 'rgba(40, 167, 69, 1)';     // Green for positive
                if (sentiment < -0.3) return 'rgba(220, 53, 69, 1)';    // Red for negative
                return 'rgba(108, 117, 125, 1)';                        // Gray for neutral
            });
            
            // Get the canvas element
            const ctx = document.getElementById('emotion-timeline-chart').getContext('2d');
            
            // Destroy existing chart if it exists
            if (emotionTimelineChart) {
                emotionTimelineChart.destroy();
            }
            
            // Create new chart
            emotionTimelineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: 'Emotional Sentiment',
                            data: sentiments,
                            backgroundColor: pointColors,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 2,
                            pointRadius: 6,
                            pointBackgroundColor: pointColors,
                            pointBorderColor: '#fff',
                            pointBorderWidth: 1,
                            pointHoverRadius: 8,
                            tension: 0.4,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Emotional Timeline'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const index = context.dataIndex;
                                    const sentiment = context.raw;
                                    const mood = moods[index];
                                    const title = titles[index];
                                    
                                    let sentimentLabel = 'Neutral';
                                    if (sentiment > 0.3) sentimentLabel = 'Positive';
                                    if (sentiment < -0.3) sentimentLabel = 'Negative';
                                    
                                    return [
                                        `Title: ${title}`,
                                        `Sentiment: ${sentimentLabel} (${sentiment.toFixed(2)})`,
                                        `Mood: ${mood}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            min: -1,
                            max: 1,
                            title: {
                                display: true,
                                text: 'Sentiment (-1 to 1)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading emotion timeline data:', error);
            showAlert('Failed to load emotion timeline visualization', 'danger');
        });
}

// Show alert message
function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alertContainer.removeChild(alert);
        }, 150);
    }, 5000);
}
