// Variables to store chart instances
let relationshipStrengthChart = null;
let interactionFrequencyChart = null;
let emotionTimelineChart = null;
let socialNetworkGraph = null;

// Initialize visualizations page
document.addEventListener('DOMContentLoaded', function() {
    // Load people for person selector
    loadPeopleForSelector();
    
    // Load initial visualizations
    loadRelationshipStrengthVisualization();
    loadInteractionFrequencyVisualization();
    loadSocialWebVisualization();
    
    // Set up person selector change event
    const personSelector = document.getElementById('person-selector');
    if (personSelector) {
        personSelector.addEventListener('change', function() {
            const personId = this.value;
            if (personId) {
                loadEmotionTimelineVisualization(personId);
                highlightPersonInSocialWeb(personId);
            } else {
                // If no person selected, clear the emotion timeline chart
                if (emotionTimelineChart) {
                    emotionTimelineChart.destroy();
                    emotionTimelineChart = null;
                    document.getElementById('emotion-timeline-chart-container').innerHTML = 
                        '<div class="text-center py-5">Select a person to view their emotion timeline</div>';
                }
                
                // Reset social web highlights
                resetSocialWebHighlights();
            }
        });
    }
    
    // Set up relationship edit form
    const relationshipForm = document.getElementById('relationship-form');
    if (relationshipForm) {
        relationshipForm.addEventListener('submit', function(event) {
            event.preventDefault();
            updatePersonConnection();
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

// Load social web visualization
function loadSocialWebVisualization() {
    fetch('/api/visualizations/social-web')
        .then(response => response.json())
        .then(data => {
            if (!data.nodes || data.nodes.length === 0) {
                document.getElementById('social-web-container').innerHTML = 
                    '<div class="text-center py-5">No data available. Add people and their relationships to see the social web.</div>';
                return;
            }
            
            const container = document.getElementById('social-web-container');
            container.innerHTML = '<div id="social-web-graph" class="social-web-graph"></div>';
            
            // Create D3 force directed graph
            createSocialWebGraph(data);
        })
        .catch(error => {
            console.error('Error loading social web data:', error);
            showAlert('Failed to load social web visualization', 'danger');
        });
}

// Create D3 force directed graph for social web
function createSocialWebGraph(data) {
    const width = document.getElementById('social-web-graph').clientWidth;
    const height = 500; // Fixed height
    
    // Create SVG element
    const svg = d3.select('#social-web-graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('class', 'social-web-svg');
    
    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
    
    // Create container group for zoom
    const g = svg.append('g');
    
    // Add arrow markers for directed links
    g.append('defs').selectAll('marker')
        .data(['positive', 'negative', 'neutral'])
        .enter().append('marker')
        .attr('id', d => `arrow-${d}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', d => {
            if (d === 'positive') return '#28a745';
            if (d === 'negative') return '#dc3545';
            return '#6c757d';
        })
        .attr('d', 'M0,-5L10,0L0,5');
    
    // Create the force simulation
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(50));
    
    // Create links
    const links = g.append('g')
        .attr('class', 'links')
        .selectAll('path')
        .data(data.links)
        .enter().append('path')
        .attr('class', 'link')
        .attr('stroke-width', d => Math.max(1, d.closeness || 1))
        .attr('stroke', d => {
            if (d.sentiment > 0.3) return '#28a745';  // Green for positive
            if (d.sentiment < -0.3) return '#dc3545'; // Red for negative
            return '#6c757d';                        // Gray for neutral
        })
        .attr('fill', 'none')
        .attr('marker-end', d => {
            if (d.sentiment > 0.3) return 'url(#arrow-positive)';
            if (d.sentiment < -0.3) return 'url(#arrow-negative)';
            return 'url(#arrow-neutral)';
        })
        .on('click', function(event, d) {
            showRelationshipDetails(d);
        });
    
    // Create nodes
    const nodeGroups = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(data.nodes)
        .enter().append('g')
        .attr('class', 'node-group')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // Add node circles
    nodeGroups.append('circle')
        .attr('r', d => Math.max(10, Math.min(20, 10 + d.entry_count)))
        .attr('fill', d => {
            if (d.avg_sentiment > 0.3) return '#28a745';  // Green for positive
            if (d.avg_sentiment < -0.3) return '#dc3545'; // Red for negative
            return '#6c757d';                            // Gray for neutral
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('data-person-id', d => d.id);
    
    // Add node labels
    nodeGroups.append('text')
        .attr('dy', 30)
        .attr('text-anchor', 'middle')
        .text(d => d.name)
        .attr('class', 'node-label')
        .attr('fill', '#fff')
        .attr('data-person-id', d => d.id);
    
    // Add node interaction
    nodeGroups.on('click', function(event, d) {
        // Select person in dropdown
        const personSelector = document.getElementById('person-selector');
        if (personSelector) {
            personSelector.value = d.id;
            personSelector.dispatchEvent(new Event('change'));
        }
        
        // Highlight node
        highlightPersonInSocialWeb(d.id);
        
        // Show person details
        showPersonDetails(d);
    });
    
    // Define tick function for simulation
    simulation.on('tick', () => {
        links.attr('d', linkArc);
        
        nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Store simulation for later use
    socialNetworkGraph = simulation;
    
    // Helper functions for drag behavior
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    // Function to create curved paths for links
    function linkArc(d) {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y} A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    }
}

// Highlight a person in the social web visualization
function highlightPersonInSocialWeb(personId) {
    // Reset previous highlights
    resetSocialWebHighlights();
    
    // Highlight selected person
    d3.selectAll('.node-group circle')
        .attr('stroke-width', function() {
            return this.getAttribute('data-person-id') == personId ? 4 : 2;
        })
        .attr('stroke', function() {
            return this.getAttribute('data-person-id') == personId ? '#ffc107' : '#fff';
        });
    
    d3.selectAll('.node-group text')
        .attr('font-weight', function() {
            return this.getAttribute('data-person-id') == personId ? 'bold' : 'normal';
        })
        .attr('font-size', function() {
            return this.getAttribute('data-person-id') == personId ? '14px' : '12px';
        });
    
    // Highlight related links
    d3.selectAll('.link')
        .attr('stroke-opacity', function(d) {
            return (d.source.id == personId || d.target.id == personId) ? 1.0 : 0.2;
        })
        .attr('stroke-width', function(d) {
            const baseWidth = Math.max(1, d.closeness || 1);
            return (d.source.id == personId || d.target.id == personId) ? baseWidth * 2 : baseWidth;
        });
    
    // Highlight related nodes
    d3.selectAll('.node-group')
        .style('opacity', function(d) {
            // Check all links to find connections
            let isConnected = false;
            d3.selectAll('.link').each(function(linkData) {
                if ((linkData.source.id == personId && linkData.target.id == d.id) || 
                    (linkData.target.id == personId && linkData.source.id == d.id)) {
                    isConnected = true;
                }
            });
            
            return d.id == personId || isConnected ? 1.0 : 0.3;
        });
}

// Reset highlights in the social web visualization
function resetSocialWebHighlights() {
    d3.selectAll('.node-group circle')
        .attr('stroke-width', 2)
        .attr('stroke', '#fff');
    
    d3.selectAll('.node-group text')
        .attr('font-weight', 'normal')
        .attr('font-size', '12px');
    
    d3.selectAll('.link')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.max(1, d.closeness || 1));
    
    d3.selectAll('.node-group')
        .style('opacity', 1.0);
}

// Show person details
function showPersonDetails(person) {
    // Load person connections
    fetch(`/api/visualizations/social-connections/${person.id}`)
        .then(response => response.json())
        .then(connections => {
            const detailsContainer = document.getElementById('person-details-container');
            
            let connectionsHtml = '';
            if (connections.length > 0) {
                connectionsHtml = `
                    <h5 class="mt-4">Connections (${connections.length})</h5>
                    <div class="list-group">
                `;
                
                connections.forEach(conn => {
                    // Set sentiment class
                    let sentimentClass = 'bg-secondary';
                    if (conn.sentiment > 0.3) sentimentClass = 'bg-success';
                    if (conn.sentiment < -0.3) sentimentClass = 'bg-danger';
                    
                    connectionsHtml += `
                        <a href="#" class="list-group-item list-group-item-action" 
                           onclick="event.preventDefault(); highlightPersonInSocialWeb(${conn.person_id});">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${conn.person_name}</h6>
                                <span class="badge ${sentimentClass}">${conn.relationship_type}</span>
                            </div>
                            <div class="d-flex justify-content-between">
                                <small>Interactions: ${conn.interaction_count}</small>
                                <small>Closeness: ${conn.closeness}/10</small>
                            </div>
                            <button class="btn btn-sm btn-outline-primary mt-2" 
                                    onclick="event.stopPropagation(); showEditRelationshipModal(${person.id}, ${conn.person_id})">
                                Edit Relationship
                            </button>
                        </a>
                    `;
                });
                
                connectionsHtml += '</div>';
            } else {
                connectionsHtml = '<p class="text-muted">No connections found for this person.</p>';
            }
            
            detailsContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h4>${person.name}</h4>
                        <span class="badge bg-info">${person.relationship_type}</span>
                    </div>
                    <div class="card-body">
                        <p>Journal Entries: ${person.entry_count}</p>
                        <p>Average Sentiment: ${person.avg_sentiment.toFixed(2)}</p>
                        ${connectionsHtml}
                    </div>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error loading person connections:', error);
            showAlert('Failed to load person connections', 'danger');
        });
}

// Show edit relationship modal
function showEditRelationshipModal(sourceId, targetId) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('edit-relationship-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-relationship-modal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-labelledby', 'editRelationshipModalLabel');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editRelationshipModalLabel">Edit Relationship</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="relationship-form">
                            <input type="hidden" id="source-person-id">
                            <input type="hidden" id="target-person-id">
                            
                            <div class="mb-3">
                                <label for="relationship-type" class="form-label">Relationship Type</label>
                                <select class="form-select" id="relationship-type" required>
                                    <option value="">Select type</option>
                                    <option value="Friend">Friend</option>
                                    <option value="Family">Family</option>
                                    <option value="Colleague">Colleague</option>
                                    <option value="Acquaintance">Acquaintance</option>
                                    <option value="Dating">Dating</option>
                                    <option value="Partner">Partner</option>
                                    <option value="Spouse">Spouse</option>
                                    <option value="Ex-Partner">Ex-Partner</option>
                                    <option value="Mentor">Mentor</option>
                                    <option value="Mentee">Mentee</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="closeness" class="form-label">Closeness (1-10)</label>
                                <input type="range" class="form-range" id="closeness" min="1" max="10" value="5">
                                <div class="d-flex justify-content-between">
                                    <small>Distant</small>
                                    <small>Close</small>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="relationship-notes" class="form-label">Notes</label>
                                <textarea class="form-control" id="relationship-notes" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="updatePersonConnection()">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Set source and target person IDs
    document.getElementById('source-person-id').value = sourceId;
    document.getElementById('target-person-id').value = targetId;
    
    // Show the modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// Update person connection
function updatePersonConnection() {
    const sourceId = document.getElementById('source-person-id').value;
    const targetId = document.getElementById('target-person-id').value;
    const relationshipType = document.getElementById('relationship-type').value;
    const closeness = document.getElementById('closeness').value;
    const notes = document.getElementById('relationship-notes').value;
    
    const connectionData = {
        source_id: sourceId,
        target_id: targetId,
        relationship_type: relationshipType,
        closeness: parseInt(closeness),
        notes: notes
    };
    
    fetch('/api/person-connections', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(connectionData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showAlert(data.error, 'danger');
            return;
        }
        
        showAlert('Relationship updated successfully!', 'success');
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-relationship-modal'));
        modal.hide();
        
        // Reload the social web
        loadSocialWebVisualization();
        
        // Reload person details
        const personSelector = document.getElementById('person-selector');
        if (personSelector && personSelector.value) {
            const personId = personSelector.value;
            fetch(`/api/people/${personId}`)
                .then(response => response.json())
                .then(person => {
                    showPersonDetails(person);
                });
        }
    })
    .catch(error => {
        console.error('Error updating relationship:', error);
        showAlert('Failed to update relationship', 'danger');
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
