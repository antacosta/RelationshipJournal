// Variables for DOM elements
let peopleForm;
let peopleList;
let editingPersonId = null;

// Initialize people page
document.addEventListener('DOMContentLoaded', function() {
    peopleForm = document.getElementById('people-form');
    peopleList = document.getElementById('people-list');
    
    // Load people
    loadPeople();
    
    // Set up form submission
    peopleForm.addEventListener('submit', handlePeopleFormSubmit);
    
    // Set up search functionality
    const searchInput = document.getElementById('search-people');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterPeople(searchTerm);
        });
    }
});

// Load all people
function loadPeople() {
    fetch('/api/people')
        .then(response => response.json())
        .then(people => {
            displayPeople(people);
        })
        .catch(error => {
            console.error('Error loading people:', error);
            showAlert('Failed to load people', 'danger');
        });
}

// Display people in the list
function displayPeople(people) {
    peopleList.innerHTML = '';
    
    if (people.length === 0) {
        peopleList.innerHTML = '<div class="text-center py-5"><p>No people added yet. Add your first contact!</p></div>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'table table-hover';
    
    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Relationship Type</th>
                <th>Description</th>
                <th>Date Added</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    
    const tableBody = table.querySelector('tbody');
    
    people.forEach(person => {
        // Format date
        const date = new Date(person.date_added);
        const formattedDate = date.toLocaleDateString();
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${person.name}</td>
            <td>${person.relationship_type || '-'}</td>
            <td>${person.description || '-'}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-2 edit-person-btn">Edit</button>
                <button class="btn btn-sm btn-outline-danger delete-person-btn">Delete</button>
            </td>
        `;
        
        // Add event listeners for edit and delete buttons
        const editButton = row.querySelector('.edit-person-btn');
        const deleteButton = row.querySelector('.delete-person-btn');
        
        editButton.addEventListener('click', () => editPerson(person.id));
        deleteButton.addEventListener('click', () => deletePerson(person.id));
        
        tableBody.appendChild(row);
    });
    
    peopleList.appendChild(table);
}

// Handle people form submission (create or update)
function handlePeopleFormSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const name = document.getElementById('name').value;
    const relationshipType = document.getElementById('relationship-type').value;
    const description = document.getElementById('description').value;
    
    const personData = {
        name: name,
        relationship_type: relationshipType,
        description: description
    };
    
    // Determine if we're creating or updating
    const url = editingPersonId ? `/api/people/${editingPersonId}` : '/api/people';
    const method = editingPersonId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
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
        
        // Show success message
        const message = editingPersonId ? 'Person updated successfully!' : 'Person added successfully!';
        showAlert(message, 'success');
        
        // Reset form and reload people
        peopleForm.reset();
        editingPersonId = null;
        document.getElementById('people-form-title').textContent = 'Add New Person';
        document.getElementById('submit-button').textContent = 'Add Person';
        
        // Reload people
        loadPeople();
    })
    .catch(error => {
        console.error('Error saving person:', error);
        showAlert('Failed to save person', 'danger');
    });
}

// Edit person
function editPerson(personId) {
    // Set editing state
    editingPersonId = personId;
    
    // Update form title and button text
    document.getElementById('people-form-title').textContent = 'Edit Person';
    document.getElementById('submit-button').textContent = 'Update Person';
    
    // Get person details
    fetch(`/api/people/${personId}`)
        .then(response => response.json())
        .then(person => {
            // Populate form fields
            document.getElementById('name').value = person.name;
            document.getElementById('relationship-type').value = person.relationship_type || '';
            document.getElementById('description').value = person.description || '';
            
            // Scroll to form
            peopleForm.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Error fetching person:', error);
            showAlert('Failed to load person details', 'danger');
        });
}

// Delete person
function deletePerson(personId) {
    if (confirm('Are you sure you want to delete this person? This will also remove them from associated journal entries.')) {
        fetch(`/api/people/${personId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            showAlert('Person deleted successfully!', 'success');
            loadPeople();
            
            // Reset form if currently editing the deleted person
            if (editingPersonId === personId) {
                peopleForm.reset();
                editingPersonId = null;
                document.getElementById('people-form-title').textContent = 'Add New Person';
                document.getElementById('submit-button').textContent = 'Add Person';
            }
        })
        .catch(error => {
            console.error('Error deleting person:', error);
            showAlert('Failed to delete person', 'danger');
        });
    }
}

// Filter people based on search term
function filterPeople(searchTerm) {
    const rows = peopleList.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        const relationship = row.cells[1].textContent.toLowerCase();
        const description = row.cells[2].textContent.toLowerCase();
        
        if (name.includes(searchTerm) || relationship.includes(searchTerm) || description.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
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
