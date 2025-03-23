import logging
from flask import render_template, redirect, url_for, flash, request, jsonify, session
from markupsafe import Markup  # Use markupsafe instead of flask for Markup
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import User, Person, JournalEntry, PersonConnection
from utils import analyze_sentiment, extract_potential_names
import json
from datetime import datetime
import re

# Home route
@app.route('/')
def index():
    if current_user.is_authenticated:
        return render_template('index.html')
    return redirect(url_for('login'))

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page or url_for('index'))
        else:
            flash('Invalid username or password', 'danger')
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Check if username or email already exists
        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'danger')
            return render_template('register.html')
            
        if User.query.filter_by(email=email).first():
            flash('Email already exists', 'danger')
            return render_template('register.html')
            
        # Create new user
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Account created successfully! Please log in.', 'success')
        return redirect(url_for('login'))
        
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# Journal routes
@app.route('/journal')
@login_required
def journal():
    return render_template('journal.html')

@app.route('/api/journal-entries', methods=['GET'])
@login_required
def get_journal_entries():
    entries = JournalEntry.query.filter_by(user_id=current_user.id).order_by(JournalEntry.date_created.desc()).all()
    
    result = []
    for entry in entries:
        people_list = [{'id': person.id, 'name': person.name} for person in entry.people]
        
        # Extract potential names if present
        extracted_names = []
        if entry.extracted_names:
            try:
                extracted_names = json.loads(entry.extracted_names)
            except:
                # If JSON parsing fails, use empty list
                pass
        
        result.append({
            'id': entry.id,
            'title': entry.title,
            'content': entry.content,
            'content_with_highlights': entry.content_with_highlights,
            'date_created': entry.date_created.strftime('%Y-%m-%d %H:%M:%S'),
            'mood': entry.mood,
            'sentiment_score': entry.sentiment_score,
            'interaction_type': entry.interaction_type,
            'people': people_list,
            'extracted_names': extracted_names
        })
    
    return jsonify(result)

@app.route('/api/journal-entries/<int:entry_id>', methods=['GET'])
@login_required
def get_journal_entry(entry_id):
    entry = JournalEntry.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
    
    people_list = [{'id': person.id, 'name': person.name} for person in entry.people]
    
    result = {
        'id': entry.id,
        'title': entry.title,
        'content': entry.content,
        'date_created': entry.date_created.strftime('%Y-%m-%d %H:%M:%S'),
        'mood': entry.mood,
        'sentiment_score': entry.sentiment_score,
        'interaction_type': entry.interaction_type,
        'people': people_list
    }
    
    return jsonify(result)

@app.route('/api/journal-entries', methods=['POST'])
@login_required
def create_journal_entry():
    data = request.json
    
    # Extract data
    title = data.get('title')
    content = data.get('content')
    mood = data.get('mood')
    interaction_type = data.get('interaction_type')
    people_ids = data.get('people_ids', [])
    
    # Validate data
    if not title or not content:
        return jsonify({'error': 'Title and content are required'}), 400
    
    # Analyze sentiment
    sentiment_score = analyze_sentiment(content)
    
    # Extract potential names from content
    potential_names = extract_potential_names(content)
    
    # Get existing people names for comparison
    existing_people = Person.query.filter_by(user_id=current_user.id).all()
    existing_names = {person.name for person in existing_people}
    
    # Extract names not in existing people
    new_names = [name for name in potential_names if name not in existing_names]
    
    # Create content with highlighted names
    content_with_highlights = content
    known_people = {}
    
    # Add highlights for existing people first
    for person in existing_people:
        if person.name in content:
            # Create a case-insensitive pattern to find the name
            pattern = re.compile(r'\b' + re.escape(person.name) + r'\b', re.IGNORECASE)
            
            # Highlight with person ID for linking
            highlight = f'<span class="person-highlight known" data-person-id="{person.id}">{person.name}</span>'
            content_with_highlights = pattern.sub(highlight, content_with_highlights)
            known_people[person.name] = person.id
    
    # Add highlights for potential new people
    for name in new_names:
        if name in content:
            pattern = re.compile(r'\b' + re.escape(name) + r'\b', re.IGNORECASE)
            highlight = f'<span class="person-highlight new">{name}</span>'
            content_with_highlights = pattern.sub(highlight, content_with_highlights)
    
    # Create journal entry with extracted data
    new_entry = JournalEntry(
        title=title,
        content=content,
        content_with_highlights=content_with_highlights,
        mood=mood,
        interaction_type=interaction_type,
        sentiment_score=sentiment_score,
        user_id=current_user.id,
        extracted_names=json.dumps(potential_names)
    )
    
    # Add associated people
    entry_people = []
    for person_id in people_ids:
        person = Person.query.filter_by(id=person_id, user_id=current_user.id).first()
        if person:
            new_entry.people.append(person)
            entry_people.append(person)
    
    db.session.add(new_entry)
    db.session.commit()
    
    # Process relationships between people mentioned in this entry
    if len(entry_people) > 1 and interaction_type:
        # If multiple people are mentioned in a single entry,
        # create or update relationships between them
        for i in range(len(entry_people)):
            for j in range(i + 1, len(entry_people)):
                source_person = entry_people[i]
                target_person = entry_people[j]
                
                # Check if a connection already exists
                connection = PersonConnection.query.filter(
                    (PersonConnection.source_id == source_person.id) & 
                    (PersonConnection.target_id == target_person.id)
                ).first()
                
                if not connection:
                    # Check the reverse direction
                    connection = PersonConnection.query.filter(
                        (PersonConnection.source_id == target_person.id) & 
                        (PersonConnection.target_id == source_person.id)
                    ).first()
                
                if connection:
                    # Update existing connection
                    connection.interaction_count += 1
                    # Update sentiment with a weighted average
                    connection.sentiment = (connection.sentiment * connection.mention_count + sentiment_score) / (connection.mention_count + 1)
                    connection.mention_count += 1
                    connection.last_updated = datetime.utcnow()
                else:
                    # Create new connection
                    connection = PersonConnection(
                        source_id=source_person.id,
                        target_id=target_person.id,
                        relationship_type="unknown",  # Default
                        closeness=1,  # Start with a low closeness
                        sentiment=sentiment_score,
                        interaction_count=1,
                        mention_count=1
                    )
                    db.session.add(connection)
    
    db.session.commit()
    
    # Return data includes highlighted content and extracted names
    response_data = {
        'id': new_entry.id, 
        'message': 'Journal entry created successfully',
        'content_with_highlights': content_with_highlights,
        'potential_new_names': new_names,
        'known_people': known_people
    }
    
    return jsonify(response_data), 201

@app.route('/api/journal-entries/<int:entry_id>', methods=['PUT'])
@login_required
def update_journal_entry(entry_id):
    entry = JournalEntry.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
    
    data = request.json
    content_changed = False
    sentiment_score = entry.sentiment_score
    
    # Update fields
    if 'title' in data:
        entry.title = data['title']
    if 'content' in data:
        content = data['content']
        entry.content = content
        content_changed = True
        # Re-analyze sentiment if content changed
        sentiment_score = analyze_sentiment(content)
        entry.sentiment_score = sentiment_score
        
        # Extract potential names from content
        potential_names = extract_potential_names(content)
        
        # Get existing people names for comparison
        existing_people = Person.query.filter_by(user_id=current_user.id).all()
        existing_names = {person.name for person in existing_people}
        
        # Extract names not in existing people
        new_names = [name for name in potential_names if name not in existing_names]
        
        # Create content with highlighted names
        content_with_highlights = content
        known_people = {}
        
        # Add highlights for existing people first
        for person in existing_people:
            if person.name in content:
                # Create a case-insensitive pattern to find the name
                pattern = re.compile(r'\b' + re.escape(person.name) + r'\b', re.IGNORECASE)
                
                # Highlight with person ID for linking
                highlight = f'<span class="person-highlight known" data-person-id="{person.id}">{person.name}</span>'
                content_with_highlights = pattern.sub(highlight, content_with_highlights)
                known_people[person.name] = person.id
        
        # Add highlights for potential new people
        for name in new_names:
            if name in content:
                pattern = re.compile(r'\b' + re.escape(name) + r'\b', re.IGNORECASE)
                highlight = f'<span class="person-highlight new">{name}</span>'
                content_with_highlights = pattern.sub(highlight, content_with_highlights)
        
        # Update highlighted content and extracted names
        entry.content_with_highlights = content_with_highlights
        entry.extracted_names = json.dumps(potential_names)
        
    if 'mood' in data:
        entry.mood = data['mood']
    if 'interaction_type' in data:
        entry.interaction_type = data['interaction_type']
    
    # Update associated people
    old_people = list(entry.people)
    entry_people = []
    
    if 'people_ids' in data:
        # Clear existing people
        entry.people = []
        
        # Add new people
        for person_id in data['people_ids']:
            person = Person.query.filter_by(id=person_id, user_id=current_user.id).first()
            if person:
                entry.people.append(person)
                entry_people.append(person)
    
    db.session.commit()
    
    # Process relationships between people mentioned in this entry if people changed
    if len(entry_people) > 1 and entry.interaction_type and (
        content_changed or set(old_people) != set(entry_people)):
        # If multiple people are mentioned in a single entry,
        # create or update relationships between them
        for i in range(len(entry_people)):
            for j in range(i + 1, len(entry_people)):
                source_person = entry_people[i]
                target_person = entry_people[j]
                
                # Check if a connection already exists
                connection = PersonConnection.query.filter(
                    (PersonConnection.source_id == source_person.id) & 
                    (PersonConnection.target_id == target_person.id)
                ).first()
                
                if not connection:
                    # Check the reverse direction
                    connection = PersonConnection.query.filter(
                        (PersonConnection.source_id == target_person.id) & 
                        (PersonConnection.target_id == source_person.id)
                    ).first()
                
                if connection:
                    # Update existing connection
                    connection.interaction_count += 1
                    # Update sentiment with a weighted average
                    connection.sentiment = (connection.sentiment * connection.mention_count + sentiment_score) / (connection.mention_count + 1)
                    connection.mention_count += 1
                    connection.last_updated = datetime.utcnow()
                else:
                    # Create new connection
                    connection = PersonConnection(
                        source_id=source_person.id,
                        target_id=target_person.id,
                        relationship_type="unknown",  # Default
                        closeness=1,  # Start with a low closeness
                        sentiment=sentiment_score,
                        interaction_count=1,
                        mention_count=1
                    )
                    db.session.add(connection)
        
        db.session.commit()
    
    # Include highlighted content in response if content changed
    response_data = {'message': 'Journal entry updated successfully'}
    if content_changed:
        # These are already defined in the content block
        # We don't need to recreate them here
        response_data['content_with_highlights'] = entry.content_with_highlights
        
        # Reuse existing variable or extract from JSON
        if 'potential_names' in locals():
            # Get existing people names for comparison
            existing_people = Person.query.filter_by(user_id=current_user.id).all()
            existing_names = {person.name for person in existing_people}
            
            # Extract names not in existing people
            new_names = [name for name in potential_names if name not in existing_names]
            response_data['potential_new_names'] = new_names
            
            if 'known_people' in locals():
                response_data['known_people'] = known_people
    
    return jsonify(response_data)

@app.route('/api/journal-entries/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_journal_entry(entry_id):
    entry = JournalEntry.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
    
    db.session.delete(entry)
    db.session.commit()
    
    return jsonify({'message': 'Journal entry deleted successfully'})

# People routes
@app.route('/people')
@login_required
def people():
    return render_template('people.html')

@app.route('/api/people', methods=['GET'])
@login_required
def get_people():
    people = Person.query.filter_by(user_id=current_user.id).all()
    
    result = []
    for person in people:
        result.append({
            'id': person.id,
            'name': person.name,
            'relationship_type': person.relationship_type,
            'description': person.description,
            'date_added': person.date_added.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return jsonify(result)

@app.route('/api/people/<int:person_id>', methods=['GET'])
@login_required
def get_person(person_id):
    person = Person.query.filter_by(id=person_id, user_id=current_user.id).first_or_404()
    
    result = {
        'id': person.id,
        'name': person.name,
        'relationship_type': person.relationship_type,
        'description': person.description,
        'date_added': person.date_added.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    return jsonify(result)

@app.route('/api/people', methods=['POST'])
@login_required
def create_person():
    data = request.json
    
    # Extract data
    name = data.get('name')
    relationship_type = data.get('relationship_type')
    description = data.get('description')
    
    # Validate data
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    # Create person
    new_person = Person(
        name=name,
        relationship_type=relationship_type,
        description=description,
        user_id=current_user.id
    )
    
    db.session.add(new_person)
    db.session.commit()
    
    return jsonify({'id': new_person.id, 'message': 'Person created successfully'}), 201

@app.route('/api/people/<int:person_id>', methods=['PUT'])
@login_required
def update_person(person_id):
    person = Person.query.filter_by(id=person_id, user_id=current_user.id).first_or_404()
    
    data = request.json
    
    # Update fields
    if 'name' in data:
        person.name = data['name']
    if 'relationship_type' in data:
        person.relationship_type = data['relationship_type']
    if 'description' in data:
        person.description = data['description']
    
    db.session.commit()
    
    return jsonify({'message': 'Person updated successfully'})

@app.route('/api/people/<int:person_id>', methods=['DELETE'])
@login_required
def delete_person(person_id):
    person = Person.query.filter_by(id=person_id, user_id=current_user.id).first_or_404()
    
    # Delete associated connections first
    PersonConnection.query.filter(
        (PersonConnection.source_id == person_id) |
        (PersonConnection.target_id == person_id)
    ).delete(synchronize_session=False)
    
    db.session.delete(person)
    db.session.commit()
    
    return jsonify({'message': 'Person deleted successfully'})

# Visualization routes
@app.route('/visualizations')
@login_required
def visualizations():
    return render_template('visualizations.html')

@app.route('/api/visualizations/relationship-strength', methods=['GET'])
@login_required
def get_relationship_strength():
    # Get all people with their associated journal entries
    people = Person.query.filter_by(user_id=current_user.id).all()
    
    result = []
    for person in people:
        entry_count = len(person.journal_entries)
        # Calculate average sentiment
        total_sentiment = 0
        for entry in person.journal_entries:
            if entry.sentiment_score is not None:
                total_sentiment += entry.sentiment_score
        
        avg_sentiment = total_sentiment / entry_count if entry_count > 0 else 0
        
        result.append({
            'id': person.id,
            'name': person.name,
            'entry_count': entry_count,
            'avg_sentiment': avg_sentiment
        })
    
    return jsonify(result)

@app.route('/api/visualizations/interaction-frequency', methods=['GET'])
@login_required
def get_interaction_frequency():
    # Get entries by month and person
    people = Person.query.filter_by(user_id=current_user.id).all()
    
    result = {}
    for person in people:
        entries_by_month = {}
        
        for entry in person.journal_entries:
            month_key = entry.date_created.strftime('%Y-%m')
            
            if month_key not in entries_by_month:
                entries_by_month[month_key] = 0
            
            entries_by_month[month_key] += 1
        
        result[person.name] = [{'month': k, 'count': v} for k, v in entries_by_month.items()]
    
    return jsonify(result)

@app.route('/api/visualizations/emotion-timeline/<int:person_id>', methods=['GET'])
@login_required
def get_emotion_timeline(person_id):
    person = Person.query.filter_by(id=person_id, user_id=current_user.id).first_or_404()
    
    entries = []
    for entry in person.journal_entries:
        entries.append({
            'id': entry.id,
            'date': entry.date_created.strftime('%Y-%m-%d'),
            'sentiment': entry.sentiment_score,
            'mood': entry.mood,
            'title': entry.title
        })
    
    # Sort by date
    entries.sort(key=lambda x: x['date'])
    
    return jsonify(entries)

@app.route('/api/visualizations/social-web', methods=['GET'])
@login_required
def get_social_web():
    """
    Get social web data for visualization of relationships between people.
    Returns nodes (people) and links (connections between people).
    """
    # Get all people for the current user
    people = Person.query.filter_by(user_id=current_user.id).all()
    
    # Prepare nodes (people)
    nodes = []
    for person in people:
        # Count journal entries for this person
        entry_count = len(person.journal_entries)
        
        # Calculate average sentiment
        total_sentiment = 0
        for entry in person.journal_entries:
            if entry.sentiment_score is not None:
                total_sentiment += entry.sentiment_score
        
        avg_sentiment = total_sentiment / entry_count if entry_count > 0 else 0
        
        # Create node
        nodes.append({
            'id': person.id,
            'name': person.name,
            'relationship_type': person.relationship_type or 'Unknown',
            'entry_count': entry_count,
            'avg_sentiment': avg_sentiment
        })
    
    # Prepare links (connections between people)
    links = []
    # Track processed connections to avoid duplicates
    processed_connections = set()
    
    # Get all connections for this user's people
    for person in people:
        for connection in person.get_connections():
            # Create a unique identifier for this connection
            # Sort IDs to ensure we catch connections in both directions
            link_key = tuple(sorted([connection.source_id, connection.target_id]))
            
            # Skip if already processed
            if link_key in processed_connections:
                continue
            
            # Mark as processed
            processed_connections.add(link_key)
            
            # Get source and target people
            source_person = Person.query.get(connection.source_id)
            target_person = Person.query.get(connection.target_id)
            
            # Only include connections between people owned by the current user
            if source_person.user_id == current_user.id and target_person.user_id == current_user.id:
                links.append({
                    'source': connection.source_id,
                    'target': connection.target_id,
                    'relationship_type': connection.relationship_type or 'Unknown',
                    'sentiment': connection.sentiment,
                    'interaction_count': connection.interaction_count,
                    'mention_count': connection.mention_count,
                    'closeness': connection.closeness
                })
    
    return jsonify({
        'nodes': nodes,
        'links': links
    })

@app.route('/api/visualizations/social-connections/<int:person_id>', methods=['GET'])
@login_required
def get_person_connections(person_id):
    """
    Get connections for a specific person.
    Returns detailed information about all connections.
    """
    person = Person.query.filter_by(id=person_id, user_id=current_user.id).first_or_404()
    
    connections = []
    for connection in person.get_connections():
        # Determine the other person in the connection
        other_id = connection.target_id if connection.source_id == person_id else connection.source_id
        other_person = Person.query.get(other_id)
        
        # Only include connections to people owned by the current user
        if other_person.user_id == current_user.id:
            connections.append({
                'person_id': other_id,
                'person_name': other_person.name,
                'relationship_type': connection.relationship_type or 'Unknown',
                'sentiment': connection.sentiment,
                'interaction_count': connection.interaction_count,
                'mention_count': connection.mention_count,
                'closeness': connection.closeness,
                'last_updated': connection.last_updated.strftime('%Y-%m-%d %H:%M:%S')
            })
    
    return jsonify(connections)

@app.route('/api/person-connections', methods=['POST'])
@login_required
def create_or_update_connection():
    """
    Create or update a connection between two people.
    """
    data = request.json
    
    # Extract data
    source_id = data.get('source_id')
    target_id = data.get('target_id')
    relationship_type = data.get('relationship_type')
    sentiment = data.get('sentiment')
    closeness = data.get('closeness')
    notes = data.get('notes')
    
    # Validate data
    if not source_id or not target_id:
        return jsonify({'error': 'Source and target IDs are required'}), 400
    
    # Verify that both people belong to the current user
    source_person = Person.query.filter_by(id=source_id, user_id=current_user.id).first()
    target_person = Person.query.filter_by(id=target_id, user_id=current_user.id).first()
    
    if not source_person or not target_person:
        return jsonify({'error': 'Invalid source or target person'}), 400
    
    # Check if connection already exists
    connection = PersonConnection.query.filter(
        (PersonConnection.source_id == source_id) & 
        (PersonConnection.target_id == target_id)
    ).first()
    
    if not connection:
        # Check reverse direction
        connection = PersonConnection.query.filter(
            (PersonConnection.source_id == target_id) & 
            (PersonConnection.target_id == source_id)
        ).first()
    
    if connection:
        # Update existing connection
        if relationship_type:
            connection.relationship_type = relationship_type
        if sentiment is not None:
            connection.sentiment = sentiment
        if closeness is not None:
            connection.closeness = closeness
        if notes:
            connection.notes = notes
        
        connection.last_updated = datetime.utcnow()
    else:
        # Create new connection
        connection = PersonConnection(
            source_id=source_id,
            target_id=target_id,
            relationship_type=relationship_type or 'Unknown',
            sentiment=sentiment or 0,
            closeness=closeness or 1,
            notes=notes,
            interaction_count=0,
            mention_count=0
        )
        db.session.add(connection)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Connection updated successfully', 
        'id': connection.id
    })
