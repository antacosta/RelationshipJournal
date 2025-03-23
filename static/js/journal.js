// Variables for DOM elements
let journalForm;
let journalEntriesList;
let peopleDropdown;
let editingEntryId = null;
let nameRecognitionEnabled = true; // Enable name recognition by default

// Initialize journal page
document.addEventListener('DOMContentLoaded', function() {
    journalForm = document.getElementById('journal-form');
    journalEntriesList = document.getElementById('journal-entries');
    peopleDropdown = document.getElementById('people-select');
    
    // Load journal entries
    loadJournalEntries();
    
    // Load people for dropdown
    loadPeopleForDropdown();
    
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
        });
    }
    
    // Set up content textarea to show realtime name highlighting
    const contentTextarea = document.getElementById('content');
    if (contentTextarea) {
        contentTextarea.addEventListener('input', function() {
            if (nameRecognitionEnabled) {
                highlightNamesInRealtime(this.value);
            }
        });
    }
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

// Handle highlighting names in realtime as user types
function highlightNamesInRealtime(content) {
    // Only perform this if we have a preview element
    const previewElement = document.getElementById('content-preview');
    if (!previewElement) return;
    
    // Get all people from our dropdown
    const peopleOptions = Array.from(peopleDropdown.options);
    const peopleNames = peopleOptions.map(option => option.textContent);
    
    // Create a temporary copy of content for highlighting
    let highlightedContent = content;
    
    // Highlight existing people names
    peopleNames.forEach(name => {
        if (name && name.length > 0 && content.includes(name)) {
            const regex = new RegExp(`\\b${name}\\b`, 'gi');
            const personId = peopleOptions.find(option => option.textContent === name)?.value;
            
            if (personId) {
                highlightedContent = highlightedContent.replace(
                    regex, 
                    `<span class="person-highlight known" data-person-id="${personId}">${name}</span>`
                );
            }
        }
    });
    
    // Look for potential new names (capitalized words not at the beginning of sentences)
    // This is a simple implementation - in a real app, we'd use more sophisticated NLP
    const words = content.split(/\s+/);
    words.forEach(word => {
        // Check if word starts with capital letter and isn't already highlighted
        if (word.length > 1 && 
            word.match(/^[A-Z][a-z]+$/) && 
            !peopleNames.includes(word) &&
            !highlightedContent.includes(`>${word}<`)) {
            
            // Don't highlight words that appear at the beginning of a sentence
            const wordIndex = highlightedContent.indexOf(word);
            if (wordIndex > 0) {
                const charBefore = highlightedContent[wordIndex - 1];
                if (!['.', '!', '?', '\n'].includes(charBefore)) {
                    highlightedContent = highlightedContent.replace(
                        new RegExp(`\\b${word}\\b`, 'g'),
                        `<span class="person-highlight new">${word}</span>`
                    );
                }
            }
        }
    });
    
    // Update preview
    previewElement.innerHTML = highlightedContent;
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
