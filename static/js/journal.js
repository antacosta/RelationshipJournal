// Variables for DOM elements
let journalForm;
let journalEntriesList;
let peopleDropdown;
let editingEntryId = null;

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
                <div class="card-text mb-2">${entry.content}</div>
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
