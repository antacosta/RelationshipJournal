// Variables for DOM elements
let journalForm;
let journalEntriesList;
let peopleDropdown;
let editingEntryId = null;
let nameRecognitionEnabled = true; // Enable name recognition by default
let peopleColors = {}; // Store custom colors for people
let allPeople = []; // Store all people data

// Initialize journal page
document.addEventListener('DOMContentLoaded', function() {
    journalForm = document.getElementById('journal-form');
    journalEntriesList = document.getElementById('journal-entries');
    peopleDropdown = document.getElementById('people-select');
    
    // Load journal entries
    loadJournalEntries();
    
    // Load people for dropdown and store for highlighting
    loadPeopleWithColors();
    
    // Set up form submission
    journalForm.addEventListener('submit', handleJournalFormSubmit);
    
    // Set up search functionality
    const searchInput = document.getElementById('search-journal');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterJournalEntries(searchTerm);
        });
    }
    
    // Set up name recognition toggle
    const nameRecognitionToggle = document.getElementById('name-recognition-toggle');
    if (nameRecognitionToggle) {
        nameRecognitionToggle.addEventListener('change', function() {
            nameRecognitionEnabled = this.checked;
            const contentTextarea = document.getElementById('content');
            if (contentTextarea) {
                if (nameRecognitionEnabled) {
                    enableInlineHighlighting(contentTextarea);
                } else {
                    disableInlineHighlighting(contentTextarea);
                }
            }
        });
    }
    
    // Set up content textarea with enhanced inline highlighting
    setupEnhancedTextEditor();
    
    // Initialize the sentiment gradient bar
    initSentimentGradientBar();
});

// Load all journal entries
function loadJournalEntries() {
    fetch('/api/journal-entries')
        .then(response => response.json())
        .then(entries => {
            displayJournalEntries(entries);
        })
        .catch(error => {
            console.error('Error loading journal entries:', error);
            showAlert('Failed to load journal entries', 'danger');
        });
}

// Display journal entries in the list
function displayJournalEntries(entries) {
    journalEntriesList.innerHTML = '';
    
    if (entries.length === 0) {
        journalEntriesList.innerHTML = '<div class="text-center py-5"><p>No journal entries yet. Create your first one!</p></div>';
        return;
    }
    
    entries.forEach(entry => {
        // Create entry card
        const entryCard = document.createElement('div');
        entryCard.className = 'card mb-3';
        entryCard.dataset.entryId = entry.id;
        
        // Format date
        const date = new Date(entry.date_created);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        // Create people tags
        let peopleTags = '';
        if (entry.people && entry.people.length > 0) {
            peopleTags = '<div class="people-tags">';
            entry.people.forEach(person => {
                peopleTags += `<span class="badge bg-secondary me-1">${person.name}</span>`;
            });
            peopleTags += '</div>';
        }
        
        // Set sentiment badge color based on score
        let sentimentClass = 'bg-secondary';
        let sentimentText = 'Neutral';
        
        if (entry.sentiment_score > 0.3) {
            sentimentClass = 'bg-success';
            sentimentText = 'Positive';
        } else if (entry.sentiment_score < -0.3) {
            sentimentClass = 'bg-danger';
            sentimentText = 'Negative';
        }
        
        // Use content with highlights if available, otherwise use regular content
        const displayContent = entry.content_with_highlights || entry.content;
        
        entryCard.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0">${entry.title}</h5>
                <div>
                    <span class="badge ${sentimentClass} me-1">${sentimentText}</span>
                    ${entry.mood ? `<span class="badge bg-info me-1">${entry.mood}</span>` : ''}
                    ${entry.interaction_type ? `<span class="badge bg-primary">${entry.interaction_type}</span>` : ''}
                </div>
            </div>
            <div class="card-body">
                <div class="card-text mb-2">${displayContent}</div>
                ${peopleTags}
                <div class="text-muted small mt-2">${formattedDate}</div>
            </div>
            <div class="card-footer d-flex justify-content-end">
                <button class="btn btn-sm btn-outline-primary me-2 edit-entry-btn">Edit</button>
                <button class="btn btn-sm btn-outline-danger delete-entry-btn">Delete</button>
            </div>
        `;
        
        // Add event listeners for edit and delete buttons
        const editButton = entryCard.querySelector('.edit-entry-btn');
        const deleteButton = entryCard.querySelector('.delete-entry-btn');
        
        editButton.addEventListener('click', () => editJournalEntry(entry.id));
        deleteButton.addEventListener('click', () => deleteJournalEntry(entry.id));
        
        // Add event listeners for person highlights
        const personHighlights = entryCard.querySelectorAll('.person-highlight');
        personHighlights.forEach(highlight => {
            if (highlight.classList.contains('known')) {
                // For known people, add a click handler to show details
                const personId = highlight.dataset.personId;
                highlight.addEventListener('click', () => showPersonDetails(personId));
            } else if (highlight.classList.contains('new')) {
                // For new people, add a click handler to create new person
                const personName = highlight.textContent;
                highlight.addEventListener('click', () => createPersonFromHighlight(personName));
            }
        });
        
        journalEntriesList.appendChild(entryCard);
    });
}

// Load people for the dropdown selection
function loadPeopleForDropdown() {
    fetch('/api/people')
        .then(response => response.json())
        .then(people => {
            peopleDropdown.innerHTML = '';
            
            people.forEach(person => {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.name;
                peopleDropdown.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading people:', error);
        });
}

// Load people with colors for highlighting
function loadPeopleWithColors() {
    fetch('/api/people')
        .then(response => response.json())
        .then(people => {
            // Store all people data for later use
            allPeople = people;
            
            // Populate dropdown (can be called separately if needed)
            peopleDropdown.innerHTML = '';
            
            // Generate default colors or load saved ones
            people.forEach((person, index) => {
                // Assign default color if none exists
                if (!peopleColors[person.id]) {
                    // Generate colors from a pleasing palette
                    const colorPalette = [
                        '#9b59b6', // Purple
                        '#3498db', // Blue
                        '#2ecc71', // Green
                        '#f1c40f', // Yellow
                        '#e67e22', // Orange
                        '#e74c3c', // Red
                        '#1abc9c', // Turquoise
                        '#34495e'  // Dark Blue
                    ];
                    
                    // Assign color from palette (cycle through if more people than colors)
                    peopleColors[person.id] = colorPalette[index % colorPalette.length];
                }
                
                // Add to dropdown
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.name;
                option.style.backgroundColor = peopleColors[person.id] + '33'; // Add transparency
                peopleDropdown.appendChild(option);
            });
            
            // Initialize text editor highlighting after loading people
            const contentTextarea = document.getElementById('content');
            if (contentTextarea && nameRecognitionEnabled) {
                enableInlineHighlighting(contentTextarea);
            }
        })
        .catch(error => {
            console.error('Error loading people:', error);
            showAlert('Failed to load people data', 'danger');
        });
}

// Handle journal form submission (create or update)
function handleJournalFormSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;
    const mood = document.getElementById('mood').value;
    const interactionType = document.getElementById('interaction-type').value;
    
    // Get selected people
    const selectedPeople = Array.from(peopleDropdown.selectedOptions).map(option => parseInt(option.value));
    
    const journalData = {
        title: title,
        content: content,
        mood: mood,
        interaction_type: interactionType,
        people_ids: selectedPeople
    };
    
    // Determine if we're creating or updating
    const url = editingEntryId ? `/api/journal-entries/${editingEntryId}` : '/api/journal-entries';
    const method = editingEntryId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(journalData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showAlert(data.error, 'danger');
            return;
        }
        
        // Show success message
        const message = editingEntryId ? 'Journal entry updated successfully!' : 'Journal entry created successfully!';
        showAlert(message, 'success');
        
        // Reset form and reload entries
        journalForm.reset();
        document.querySelector('#people-select').selectedIndex = -1;
        editingEntryId = null;
        document.getElementById('journal-form-title').textContent = 'Create Journal Entry';
        document.getElementById('submit-button').textContent = 'Save Entry';
        
        // Reload journal entries
        loadJournalEntries();
    })
    .catch(error => {
        console.error('Error saving journal entry:', error);
        showAlert('Failed to save journal entry', 'danger');
    });
}

// Edit journal entry
function editJournalEntry(entryId) {
    // Set editing state
    editingEntryId = entryId;
    
    // Update form title and button text
    document.getElementById('journal-form-title').textContent = 'Edit Journal Entry';
    document.getElementById('submit-button').textContent = 'Update Entry';
    
    // Get entry details
    fetch(`/api/journal-entries/${entryId}`)
        .then(response => response.json())
        .then(entry => {
            // Populate form fields
            document.getElementById('title').value = entry.title;
            document.getElementById('content').value = entry.content;
            document.getElementById('mood').value = entry.mood || '';
            document.getElementById('interaction-type').value = entry.interaction_type || '';
            
            // Set selected people
            const peopleSelect = document.getElementById('people-select');
            Array.from(peopleSelect.options).forEach(option => {
                option.selected = entry.people.some(person => person.id === parseInt(option.value));
            });
            
            // Scroll to form
            journalForm.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Error fetching journal entry:', error);
            showAlert('Failed to load journal entry details', 'danger');
        });
}

// Delete journal entry
function deleteJournalEntry(entryId) {
    if (confirm('Are you sure you want to delete this journal entry?')) {
        fetch(`/api/journal-entries/${entryId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            showAlert('Journal entry deleted successfully!', 'success');
            loadJournalEntries();
            
            // Reset form if currently editing the deleted entry
            if (editingEntryId === entryId) {
                journalForm.reset();
                editingEntryId = null;
                document.getElementById('journal-form-title').textContent = 'Create Journal Entry';
                document.getElementById('submit-button').textContent = 'Save Entry';
            }
        })
        .catch(error => {
            console.error('Error deleting journal entry:', error);
            showAlert('Failed to delete journal entry', 'danger');
        });
    }
}

// Filter journal entries based on search term
function filterJournalEntries(searchTerm) {
    const entryCards = journalEntriesList.querySelectorAll('.card');
    
    entryCards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const content = card.querySelector('.card-text').textContent.toLowerCase();
        const peopleTags = card.querySelectorAll('.badge');
        
        let peopleText = '';
        peopleTags.forEach(tag => {
            peopleText += tag.textContent.toLowerCase() + ' ';
        });
        
        if (title.includes(searchTerm) || content.includes(searchTerm) || peopleText.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// This function is now replaced by processHighlighting in our enhanced text editor approach
// Kept as a legacy function for compatibility with any code that might still call it
function highlightNamesInRealtime(content) {
    // We now use the processHighlighting function with our enhanced text editor approach
    const contentTextarea = document.getElementById('content');
    if (contentTextarea) {
        processHighlighting(contentTextarea);
    }
}

// Show person details when clicking on a highlighted name
function showPersonDetails(personId) {
    fetch(`/api/people/${personId}`)
        .then(response => response.json())
        .then(person => {
            const modal = new bootstrap.Modal(document.getElementById('person-details-modal') || createPersonDetailsModal());
            
            // Populate modal with person details
            document.getElementById('person-modal-name').textContent = person.name;
            document.getElementById('person-modal-type').textContent = person.relationship_type || 'Unknown';
            document.getElementById('person-modal-description').textContent = person.description || 'No description available';
            
            // Add button to view person page
            const viewPersonBtn = document.getElementById('view-person-btn');
            viewPersonBtn.onclick = () => window.location.href = `/people?highlight=${personId}`;
            
            modal.show();
        })
        .catch(error => {
            console.error('Error fetching person details:', error);
            showAlert('Failed to load person details', 'danger');
        });
}

// Create a new person from a highlighted name
function createPersonFromHighlight(name) {
    const modal = new bootstrap.Modal(document.getElementById('create-person-modal') || createNewPersonModal());
    
    // Populate name field
    document.getElementById('new-person-name').value = name;
    
    // Setup form submission
    const createPersonForm = document.getElementById('create-person-form');
    createPersonForm.onsubmit = function(e) {
        e.preventDefault();
        
        const name = document.getElementById('new-person-name').value;
        const type = document.getElementById('new-person-type').value;
        const description = document.getElementById('new-person-description').value;
        
        const personData = {
            name: name,
            relationship_type: type,
            description: description
        };
        
        fetch('/api/people', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(personData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showAlert(data.error, 'danger');
                return;
            }
            
            showAlert('Person created successfully!', 'success');
            modal.hide();
            
            // Reload people dropdown and journal entries
            loadPeopleForDropdown();
            loadJournalEntries();
        })
        .catch(error => {
            console.error('Error creating person:', error);
            showAlert('Failed to create person', 'danger');
        });
    };
    
    modal.show();
}

// Create person details modal if it doesn't exist
function createPersonDetailsModal() {
    const modalElement = document.createElement('div');
    modalElement.className = 'modal fade';
    modalElement.id = 'person-details-modal';
    modalElement.tabIndex = '-1';
    modalElement.setAttribute('aria-labelledby', 'personDetailsModalLabel');
    modalElement.setAttribute('aria-hidden', 'true');
    
    modalElement.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="personDetailsModalLabel">Person Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <h4 id="person-modal-name"></h4>
                        <span class="badge bg-info" id="person-modal-type"></span>
                    </div>
                    <div class="mb-3">
                        <p id="person-modal-description" class="text-muted"></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="view-person-btn">View Person Profile</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalElement);
    return modalElement;
}

// Create new person modal if it doesn't exist
function createNewPersonModal() {
    const modalElement = document.createElement('div');
    modalElement.className = 'modal fade';
    modalElement.id = 'create-person-modal';
    modalElement.tabIndex = '-1';
    modalElement.setAttribute('aria-labelledby', 'createPersonModalLabel');
    modalElement.setAttribute('aria-hidden', 'true');
    
    modalElement.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="createPersonModalLabel">Create New Person</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="create-person-form">
                        <div class="mb-3">
                            <label for="new-person-name" class="form-label">Name</label>
                            <input type="text" class="form-control" id="new-person-name" required>
                        </div>
                        <div class="mb-3">
                            <label for="new-person-type" class="form-label">Relationship Type</label>
                            <select class="form-select" id="new-person-type">
                                <option value="">- Select Type -</option>
                                <option value="friend">Friend</option>
                                <option value="family">Family</option>
                                <option value="colleague">Colleague</option>
                                <option value="acquaintance">Acquaintance</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="new-person-description" class="form-label">Description</label>
                            <textarea class="form-control" id="new-person-description" rows="3"></textarea>
                        </div>
                        <div class="text-end">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Create Person</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalElement);
    return modalElement;
}

// Set up enhanced text editor with inline name highlighting
function setupEnhancedTextEditor() {
    const contentTextarea = document.getElementById('content');
    if (!contentTextarea) return;
    
    // Create content overlay div for inline highlighting
    const editorContainer = document.createElement('div');
    editorContainer.className = 'editor-container';
    editorContainer.style.position = 'relative';
    contentTextarea.parentNode.insertBefore(editorContainer, contentTextarea);
    editorContainer.appendChild(contentTextarea);
    
    // Add inline highlight overlay
    const highlightOverlay = document.createElement('div');
    highlightOverlay.className = 'editor-highlight-overlay';
    highlightOverlay.style.position = 'absolute';
    highlightOverlay.style.top = '0';
    highlightOverlay.style.left = '0';
    highlightOverlay.style.right = '0';
    highlightOverlay.style.bottom = '0';
    highlightOverlay.style.pointerEvents = 'none';
    highlightOverlay.style.padding = '0.375rem 0.75rem'; // Match bootstrap form-control padding
    highlightOverlay.style.overflow = 'hidden';
    highlightOverlay.style.whiteSpace = 'pre-wrap';
    highlightOverlay.style.wordWrap = 'break-word';
    editorContainer.appendChild(highlightOverlay);
    
    // Create suggestion popup for highlighted names
    const nameSuggestionPopup = document.createElement('div');
    nameSuggestionPopup.className = 'name-suggestion-popup card shadow';
    nameSuggestionPopup.style.position = 'absolute';
    nameSuggestionPopup.style.display = 'none';
    nameSuggestionPopup.style.zIndex = '1000';
    nameSuggestionPopup.style.maxWidth = '300px';
    document.body.appendChild(nameSuggestionPopup);
    
    // Enable inline highlighting
    if (nameRecognitionEnabled) {
        enableInlineHighlighting(contentTextarea);
    }
    
    // Content textarea input handler for realtime analysis
    contentTextarea.addEventListener('input', function() {
        // Update sentiment analysis display
        updateSentimentAnalysis(this.value);
        
        // Skip highlighting if disabled
        if (!nameRecognitionEnabled) return;
        
        // Update the highlighting overlay
        processHighlighting(this);
    });
    
    // Click handler to show popup when clicking on highlighted name
    document.addEventListener('click', function(e) {
        // Check if we clicked on a highlighted name
        if (e.target.matches('.inline-person-highlight')) {
            e.preventDefault();
            
            const name = e.target.textContent;
            const isNew = e.target.classList.contains('new');
            
            // Position popup near the highlighted name
            nameSuggestionPopup.style.left = e.pageX + 'px';
            nameSuggestionPopup.style.top = e.pageY + 'px';
            
            if (isNew) {
                // Show options for creating or matching this new name
                showNewNameOptions(name, nameSuggestionPopup);
            } else {
                // Show existing person details
                const personId = e.target.dataset.personId;
                showPersonSuggestionDetails(personId, nameSuggestionPopup);
            }
            
            // Show the popup
            nameSuggestionPopup.style.display = 'block';
        } else if (!e.target.closest('.name-suggestion-popup')) {
            // Hide popup when clicking elsewhere
            nameSuggestionPopup.style.display = 'none';
        }
    });
}

// Process highlighting in the textarea
function processHighlighting(textarea) {
    const highlightOverlay = textarea.parentNode.querySelector('.editor-highlight-overlay');
    if (!highlightOverlay) return;
    
    // Get text and adjust highlightOverlay to match textarea dimensions
    const text = textarea.value;
    highlightOverlay.style.width = textarea.clientWidth + 'px';
    highlightOverlay.style.height = textarea.clientHeight + 'px';
    
    // Get or create the detected names container
    let detectedNamesContainer = document.getElementById('detected-names-container');
    if (!detectedNamesContainer) {
        detectedNamesContainer = document.createElement('div');
        detectedNamesContainer.id = 'detected-names-container';
        detectedNamesContainer.className = 'mt-2 p-2 border-top';
        
        // Find the right place to insert it (after the sentiment preview)
        const sentimentPreview = document.querySelector('.sentiment-preview');
        if (sentimentPreview) {
            sentimentPreview.parentNode.insertBefore(detectedNamesContainer, sentimentPreview.nextSibling);
        } else {
            // Fallback: add it after the editor container
            const editorContainer = textarea.parentNode;
            editorContainer.parentNode.insertBefore(detectedNamesContainer, editorContainer.nextSibling);
        }
    }
    
    // Process the text for highlighting
    let highlightedHtml = '';
    let lastIndex = 0;
    
    // Track all detected names
    const detectedNames = new Map();
    
    // Find and highlight known people
    allPeople.forEach(person => {
        if (!person.name || person.name.length < 2) return;
        
        // Create a regex to find the name with word boundaries
        const regex = new RegExp(`\\b${escapeRegExp(person.name)}\\b`, 'g');
        let match;
        
        // Start search from beginning of text
        regex.lastIndex = 0;
        
        // Find all matches
        while ((match = regex.exec(text)) !== null) {
            // Skip if the match is part of a previously highlighted area
            let skipMatch = false;
            for (let i = match.index; i < match.index + match[0].length; i++) {
                if (i >= lastIndex) continue;
                skipMatch = true;
                break;
            }
            if (skipMatch) continue;
            
            // Add text before the match
            highlightedHtml += escapeHtml(text.substring(lastIndex, match.index));
            
            // Add the highlighted name with custom color
            const personColor = peopleColors[person.id] || '#3498db';
            highlightedHtml += `<span class="inline-person-highlight known" 
                                    data-person-id="${person.id}" 
                                    style="background-color: ${personColor}33; border-bottom: 1px solid ${personColor};">${escapeHtml(match[0])}</span>`;
            
            // Add to detected names map
            detectedNames.set(person.name, {
                id: person.id,
                isKnown: true,
                color: personColor
            });
            
            // Update lastIndex to continue after this match
            lastIndex = match.index + match[0].length;
        }
    });
    
    // Add the remaining text after the last match
    highlightedHtml += escapeHtml(text.substring(lastIndex));
    
    // Now look for potential new names (capitalized words) that aren't already highlighted
    const newNamesRegex = /\b[A-Z][a-z]+\b/g;
    let newHighlightedHtml = '';
    lastIndex = 0;
    
    // Use a temporary div to parse the HTML without actually adding it to the DOM
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = highlightedHtml;
    const plainText = tempDiv.textContent;
    
    // Find all potential new names - including those at the start of sentences
    let newNameMatch;
    while ((newNameMatch = newNamesRegex.exec(plainText)) !== null) {
        const name = newNameMatch[0];
        const index = newNameMatch.index;
        
        // Check if this is a common word that's capitalized (like days, months, etc)
        const commonWords = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
                           'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
                           'The', 'This', 'That', 'These', 'Those', 'They', 'There', 'Today', 'Tomorrow', 'Yesterday'];
        if (commonWords.includes(name)) continue;
        
        // We'll now detect names at the start of sentences too, but still check if it's at the start
        const isStartOfSentence = index === 0 || (index > 0 && ['.', '!', '?', '\n'].includes(plainText[index - 1]));
        
        // Check if this name is already known (part of a highlight span)
        let isKnownName = false;
        for (const person of allPeople) {
            if (person.name === name) {
                isKnownName = true;
                break;
            }
        }
        
        // Skip if it's already a known name
        if (isKnownName) continue;
        
        // Find the HTML index for this plain text index
        let htmlIndex = findHtmlIndexForTextIndex(highlightedHtml, index);
        if (htmlIndex === -1) continue;
        
        // Add text before the match
        newHighlightedHtml += highlightedHtml.substring(lastIndex, htmlIndex);
        
        // Only highlight if it's not inside an existing highlight span
        if (!isInsideHighlightSpan(highlightedHtml, htmlIndex)) {
            // Add the highlighted name
            newHighlightedHtml += `<span class="inline-person-highlight new">${escapeHtml(name)}</span>`;
            
            // Add to detected names map
            if (!detectedNames.has(name)) {
                detectedNames.set(name, {
                    isKnown: false
                });
            }
            
            // Update lastIndex to continue after this match
            lastIndex = htmlIndex + name.length;
        } else {
            // If inside an existing span, just keep the original HTML
            newHighlightedHtml += highlightedHtml.substring(htmlIndex, htmlIndex + name.length);
            lastIndex = htmlIndex + name.length;
        }
    }
    
    // Add the remaining HTML after the last match
    newHighlightedHtml += highlightedHtml.substring(lastIndex);
    
    // Set the highlighted HTML
    highlightOverlay.innerHTML = newHighlightedHtml || highlightedHtml;
    
    // Update detected names container
    updateDetectedNamesPanel(detectedNamesContainer, detectedNames);
    
    // Adjust scroll position of highlight overlay to match textarea
    highlightOverlay.scrollTop = textarea.scrollTop;
}

// Helper function to escape HTML entities
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to escape special regex characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper to find HTML index for a given plain text index
function findHtmlIndexForTextIndex(html, textIndex) {
    // This is a simplified approximation - a more robust solution would use a proper HTML parser
    let plainIndex = 0;
    let htmlIndex = 0;
    let inTag = false;
    
    while (htmlIndex < html.length && plainIndex < textIndex) {
        if (html[htmlIndex] === '<') {
            inTag = true;
        } else if (html[htmlIndex] === '>') {
            inTag = false;
        } else if (!inTag) {
            plainIndex++;
        }
        
        htmlIndex++;
    }
    
    // If we couldn't reach the text index, return -1
    if (plainIndex < textIndex) return -1;
    
    // Adjust if we ended up inside a tag
    while (htmlIndex < html.length && html[htmlIndex] !== '<' && html[htmlIndex-1] !== '>') {
        htmlIndex++;
    }
    
    return htmlIndex;
}

// Helper to check if a position is inside a highlight span
function isInsideHighlightSpan(html, position) {
    // Find the last opening tag before this position
    const lastOpenTag = html.lastIndexOf('<span', position);
    if (lastOpenTag === -1) return false;
    
    // Find the last closing tag before this position
    const lastCloseTag = html.lastIndexOf('</span>', position);
    
    // If the last open tag comes after the last close tag (or there is no close tag),
    // then we're inside a span
    return lastOpenTag > lastCloseTag;
}

// Enable inline highlighting for a textarea
function enableInlineHighlighting(textarea) {
    const container = textarea.parentNode;
    if (!container.classList.contains('editor-container')) return;
    
    // Show the highlight overlay
    const overlay = container.querySelector('.editor-highlight-overlay');
    if (overlay) overlay.style.display = 'block';
    
    // Process current content
    processHighlighting(textarea);
    
    // Set up the scroll sync
    textarea.addEventListener('scroll', function() {
        const overlay = this.parentNode.querySelector('.editor-highlight-overlay');
        if (overlay) overlay.scrollTop = this.scrollTop;
    });
}

// Disable inline highlighting for a textarea
function disableInlineHighlighting(textarea) {
    const container = textarea.parentNode;
    if (!container.classList.contains('editor-container')) return;
    
    // Hide the highlight overlay
    const overlay = container.querySelector('.editor-highlight-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Show options for new name
function showNewNameOptions(name, popupElement) {
    // Prepare popup content
    popupElement.innerHTML = `
        <div class="card-header bg-warning text-dark">
            <h6 class="mb-0">New Person: ${name}</h6>
        </div>
        <div class="card-body">
            <p class="small">This appears to be a new person in your journal.</p>
            <div class="similar-names mb-2"></div>
            <div class="d-grid gap-2">
                <button class="btn btn-sm btn-primary create-person-btn">
                    <i class="fas fa-plus-circle me-1"></i> Add as new person
                </button>
                <button class="btn btn-sm btn-secondary ignore-name-btn">
                    <i class="fas fa-times me-1"></i> Ignore
                </button>
            </div>
        </div>
    `;
    
    // Find similar names
    const similarNamesContainer = popupElement.querySelector('.similar-names');
    let foundSimilar = false;
    
    // Filter allPeople for similar names using simple string similarity
    const similarPeople = allPeople.filter(person => {
        // Calculate simple similarity (using lowercase for both)
        const nameLower = name.toLowerCase();
        const personNameLower = person.name.toLowerCase();
        
        // Check for substring match or similar start/end
        return personNameLower.includes(nameLower) || 
               nameLower.includes(personNameLower) ||
               (personNameLower.length > 3 && nameLower.startsWith(personNameLower.substring(0, 3))) ||
               (nameLower.length > 3 && personNameLower.startsWith(nameLower.substring(0, 3)));
    });
    
    if (similarPeople.length > 0) {
        foundSimilar = true;
        similarNamesContainer.innerHTML = `
            <p class="small mb-1">Did you mean one of these people?</p>
            <div class="similar-names-list"></div>
        `;
        
        const namesList = similarNamesContainer.querySelector('.similar-names-list');
        similarPeople.forEach(person => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-outline-info me-1 mb-1';
            btn.textContent = person.name;
            btn.dataset.personId = person.id;
            
            // Style with person's color
            const personColor = peopleColors[person.id] || '#3498db';
            btn.style.borderColor = personColor;
            btn.style.color = personColor;
            
            btn.addEventListener('click', function() {
                // Apply this person to the highlighted name in the text
                const highlights = document.querySelectorAll('.inline-person-highlight.new');
                highlights.forEach(highlight => {
                    if (highlight.textContent === name) {
                        highlight.classList.remove('new');
                        highlight.classList.add('known');
                        highlight.dataset.personId = person.id;
                        highlight.style.backgroundColor = personColor + '33';
                        highlight.style.borderBottom = `1px solid ${personColor}`;
                    }
                });
                
                // Select this person in the dropdown
                const option = Array.from(peopleDropdown.options).find(
                    opt => parseInt(opt.value) === parseInt(person.id)
                );
                if (option) option.selected = true;
                
                // Hide the popup
                popupElement.style.display = 'none';
            });
            
            namesList.appendChild(btn);
        });
    }
    
    if (!foundSimilar) {
        similarNamesContainer.innerHTML = `
            <p class="small text-muted">No similar names found in your contacts.</p>
        `;
    }
    
    // Set up event handlers
    const createBtn = popupElement.querySelector('.create-person-btn');
    createBtn.addEventListener('click', function() {
        createPersonFromHighlight(name);
        popupElement.style.display = 'none';
    });
    
    const ignoreBtn = popupElement.querySelector('.ignore-name-btn');
    ignoreBtn.addEventListener('click', function() {
        popupElement.style.display = 'none';
    });
}

// Update the detected names panel
function updateDetectedNamesPanel(container, detectedNames) {
    if (!container || detectedNames.size === 0) {
        if (container) container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    container.innerHTML = '<div class="d-flex flex-wrap align-items-center">' +
                        '<small class="text-muted me-2">Mentioned people:</small>' +
                        '<div class="name-badges"></div>' +
                        '</div>';
                        
    const badgesContainer = container.querySelector('.name-badges');
    
    // Convert map to array and sort (known people first, then alphabetically)
    const namesArray = Array.from(detectedNames.entries())
        .sort((a, b) => {
            // Sort known people first
            if (a[1].isKnown && !b[1].isKnown) return -1;
            if (!a[1].isKnown && b[1].isKnown) return 1;
            
            // Then sort alphabetically by name
            return a[0].localeCompare(b[0]);
        });
    
    // Create badges for each name
    namesArray.forEach(([name, info]) => {
        const badge = document.createElement('span');
        badge.className = 'badge rounded-pill me-1 mb-1';
        
        if (info.isKnown) {
            badge.classList.add('known-person-badge');
            badge.style.backgroundColor = info.color + '33';
            badge.style.color = info.color;
            badge.style.borderColor = info.color;
            badge.dataset.personId = info.id;
            badge.style.cursor = 'pointer';
            badge.addEventListener('click', function() {
                // Add this person to the selected people in the dropdown
                const peopleDropdown = document.getElementById('journal-people');
                if (peopleDropdown) {
                    const option = Array.from(peopleDropdown.options).find(
                        opt => parseInt(opt.value) === parseInt(info.id)
                    );
                    if (option) option.selected = true;
                }
            });
        } else {
            badge.classList.add('new-person-badge');
            badge.style.backgroundColor = 'rgba(241, 196, 15, 0.2)';
            badge.style.color = '#d35400';
            badge.style.cursor = 'pointer';
            badge.addEventListener('click', function() {
                createPersonFromHighlight(name);
            });
        }
        
        badge.textContent = name;
        badgesContainer.appendChild(badge);
    });
}

// Show person details in the suggestion popup
function showPersonSuggestionDetails(personId, popupElement) {
    // Get person details
    const person = allPeople.find(p => p.id === parseInt(personId));
    if (!person) {
        popupElement.style.display = 'none';
        return;
    }
    
    // Get the person's color
    const personColor = peopleColors[person.id] || '#3498db';
    
    // Prepare popup content
    popupElement.innerHTML = `
        <div class="card-header" style="background-color: ${personColor}; color: white;">
            <h6 class="mb-0">${person.name}</h6>
        </div>
        <div class="card-body">
            <p class="small mb-1">
                <strong>Type:</strong> ${person.relationship_type || 'Not specified'}
            </p>
            <p class="small text-muted mb-2">
                ${person.description || 'No description available'}
            </p>
            <div class="d-flex justify-content-between">
                <button class="btn btn-sm btn-primary view-person-btn">
                    <i class="fas fa-user me-1"></i> View profile
                </button>
                <button class="btn btn-sm btn-secondary close-popup-btn">
                    <i class="fas fa-times me-1"></i> Close
                </button>
            </div>
        </div>
    `;
    
    // Set up event handlers
    const viewBtn = popupElement.querySelector('.view-person-btn');
    viewBtn.addEventListener('click', function() {
        window.location.href = `/people?highlight=${person.id}`;
    });
    
    const closeBtn = popupElement.querySelector('.close-popup-btn');
    closeBtn.addEventListener('click', function() {
        popupElement.style.display = 'none';
    });
}

// Initialize the sentiment gradient bar
function initSentimentGradientBar() {
    // Create container for the gradient mood bar
    const sentimentContainer = document.querySelector('.sentiment-preview');
    if (!sentimentContainer) return;
    
    // Clear any existing content
    sentimentContainer.innerHTML = '';
    
    // Create elements for the gradient mood bar
    const moodBarContainer = document.createElement('div');
    moodBarContainer.className = 'mood-gradient-container';
    moodBarContainer.style.width = '100%';
    moodBarContainer.style.height = '24px';
    moodBarContainer.style.marginTop = '10px';
    moodBarContainer.style.position = 'relative';
    moodBarContainer.style.borderRadius = '12px';
    moodBarContainer.style.overflow = 'hidden';
    moodBarContainer.style.backgroundColor = 'rgba(0,0,0,0.1)';
    
    // Create the gradient bar
    const gradientBar = document.createElement('div');
    gradientBar.className = 'mood-gradient-bar';
    gradientBar.style.width = '100%';
    gradientBar.style.height = '100%';
    gradientBar.style.position = 'absolute';
    gradientBar.style.top = '0';
    gradientBar.style.left = '0';
    gradientBar.style.background = 'linear-gradient(90deg, rgba(70,70,70,0.8) 0%, rgba(70,70,70,0.8) 100%)';
    gradientBar.style.transition = 'background 0.5s ease';
    
    // Add a label overlay
    const moodLabel = document.createElement('div');
    moodLabel.className = 'mood-label';
    moodLabel.style.position = 'absolute';
    moodLabel.style.top = '0';
    moodLabel.style.left = '0';
    moodLabel.style.width = '100%';
    moodLabel.style.height = '100%';
    moodLabel.style.display = 'flex';
    moodLabel.style.alignItems = 'center';
    moodLabel.style.justifyContent = 'center';
    moodLabel.style.color = 'white';
    moodLabel.style.fontSize = '12px';
    moodLabel.style.fontWeight = 'bold';
    moodLabel.style.textShadow = '0 1px 2px rgba(0,0,0,0.7)';
    moodLabel.style.zIndex = '2';
    moodLabel.textContent = 'Neutral';
    
    // Add the indicator marker
    const sentimentMarker = document.createElement('div');
    sentimentMarker.className = 'sentiment-marker';
    sentimentMarker.style.position = 'absolute';
    sentimentMarker.style.top = '0';
    sentimentMarker.style.left = '50%';
    sentimentMarker.style.width = '3px';
    sentimentMarker.style.height = '100%';
    sentimentMarker.style.backgroundColor = 'white';
    sentimentMarker.style.transform = 'translateX(-50%)';
    sentimentMarker.style.zIndex = '1';
    sentimentMarker.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
    sentimentMarker.style.transition = 'left 0.5s ease';
    
    // Add all elements to the container
    moodBarContainer.appendChild(gradientBar);
    moodBarContainer.appendChild(sentimentMarker);
    moodBarContainer.appendChild(moodLabel);
    sentimentContainer.appendChild(moodBarContainer);
    
    // Create sentiment score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'sentiment-score-display';
    scoreDisplay.style.textAlign = 'center';
    scoreDisplay.style.fontSize = '12px';
    scoreDisplay.style.marginTop = '5px';
    scoreDisplay.style.color = 'var(--bs-secondary)';
    scoreDisplay.textContent = 'Sentiment: 0.00';
    
    // Add score display to container
    sentimentContainer.appendChild(scoreDisplay);
    
    // Initialize with neutral sentiment
    updateSentimentGradientBar(0);
}

// Update sentiment analysis when content changes
function updateSentimentAnalysis(text) {
    // Calculate sentiment score using the existing function from sentiment.js
    const score = calculateSentiment(text);
    
    // Update the gradient mood bar
    updateSentimentGradientBar(score);
}

// Update the gradient mood bar based on sentiment score
function updateSentimentGradientBar(score) {
    const gradientBar = document.querySelector('.mood-gradient-bar');
    const sentimentMarker = document.querySelector('.sentiment-marker');
    const moodLabel = document.querySelector('.mood-label');
    const scoreDisplay = document.querySelector('.sentiment-score-display');
    
    if (!gradientBar || !sentimentMarker || !moodLabel || !scoreDisplay) return;
    
    // Update the score display
    scoreDisplay.textContent = `Sentiment: ${score.toFixed(2)}`;
    
    // Position the marker based on score (-1 to 1)
    // Convert to 0-100% scale for positioning
    const markerPosition = ((score + 1) / 2) * 100;
    sentimentMarker.style.left = `${markerPosition}%`;
    
    // Determine the mood label and colors
    let moodText = 'Neutral';
    let gradientColors = '';
    
    if (score > 0.7) {
        moodText = 'Very Positive';
        gradientColors = 'linear-gradient(90deg, rgba(46,204,113,0.8) 0%, rgba(39,174,96,0.9) 100%)';
    } else if (score > 0.3) {
        moodText = 'Positive';
        gradientColors = 'linear-gradient(90deg, rgba(241,196,15,0.6) 0%, rgba(46,204,113,0.8) 100%)';
    } else if (score > 0.1) {
        moodText = 'Slightly Positive';
        gradientColors = 'linear-gradient(90deg, rgba(149,165,166,0.7) 0%, rgba(241,196,15,0.6) 100%)';
    } else if (score < -0.7) {
        moodText = 'Very Negative';
        gradientColors = 'linear-gradient(90deg, rgba(192,57,43,0.9) 0%, rgba(231,76,60,0.8) 100%)';
    } else if (score < -0.3) {
        moodText = 'Negative';
        gradientColors = 'linear-gradient(90deg, rgba(41,128,185,0.8) 0%, rgba(192,57,43,0.7) 100%)';
    } else if (score < -0.1) {
        moodText = 'Slightly Negative';
        gradientColors = 'linear-gradient(90deg, rgba(149,165,166,0.7) 0%, rgba(41,128,185,0.6) 100%)';
    } else {
        moodText = 'Neutral';
        gradientColors = 'linear-gradient(90deg, rgba(149,165,166,0.6) 0%, rgba(149,165,166,0.6) 100%)';
    }
    
    // For mixed emotions (complex content), add some more color variation
    // This is a simplified approach - a more complex analysis would be needed for truly accurate emotion detection
    const content = document.getElementById('content')?.value || '';
    if (content.length > 100) {
        // Check for mixed emotions in longer text by looking for both positive and negative keywords
        const positiveWords = ['happy', 'joy', 'love', 'excited', 'pleased'];
        const negativeWords = ['sad', 'angry', 'upset', 'worried', 'disappointed'];
        
        let hasPositive = positiveWords.some(word => content.toLowerCase().includes(word));
        let hasNegative = negativeWords.some(word => content.toLowerCase().includes(word));
        
        if (hasPositive && hasNegative) {
            moodText = 'Mixed Emotions';
            
            // Create a more complex gradient for mixed emotions
            if (score > 0) {
                // More positive than negative
                gradientColors = 'linear-gradient(90deg, rgba(41,128,185,0.4) 0%, rgba(149,165,166,0.5) 33%, rgba(241,196,15,0.6) 66%, rgba(46,204,113,0.7) 100%)';
            } else {
                // More negative than positive
                gradientColors = 'linear-gradient(90deg, rgba(192,57,43,0.7) 0%, rgba(41,128,185,0.6) 33%, rgba(149,165,166,0.5) 66%, rgba(241,196,15,0.4) 100%)';
            }
            
            // Add a subtle animation for mixed emotions
            gradientBar.style.animation = 'gradient-shift 8s ease infinite';
            
            // Add keyframes if they don't exist yet
            if (!document.getElementById('gradient-keyframes')) {
                const style = document.createElement('style');
                style.id = 'gradient-keyframes';
                style.textContent = `
                    @keyframes gradient-shift {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Set background size for the animation
            gradientBar.style.backgroundSize = '200% 200%';
        } else {
            // Remove animation for non-mixed emotions
            gradientBar.style.animation = 'none';
            gradientBar.style.backgroundSize = '100% 100%';
        }
    } else {
        // Remove animation for short content
        gradientBar.style.animation = 'none';
        gradientBar.style.backgroundSize = '100% 100%';
    }
    
    // Update the gradient and label
    gradientBar.style.background = gradientColors;
    moodLabel.textContent = moodText;
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
