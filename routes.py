import logging
from flask import render_template, redirect, url_for, flash, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import User, Person, JournalEntry
from utils import analyze_sentiment
import json
from datetime import datetime

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
        
        result.append({
            'id': entry.id,
            'title': entry.title,
            'content': entry.content,
            'date_created': entry.date_created.strftime('%Y-%m-%d %H:%M:%S'),
            'mood': entry.mood,
            'sentiment_score': entry.sentiment_score,
            'interaction_type': entry.interaction_type,
            'people': people_list
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
    
    # Create journal entry
    new_entry = JournalEntry(
        title=title,
        content=content,
        mood=mood,
        interaction_type=interaction_type,
        sentiment_score=sentiment_score,
        user_id=current_user.id
    )
    
    # Add associated people
    for person_id in people_ids:
        person = Person.query.filter_by(id=person_id, user_id=current_user.id).first()
        if person:
            new_entry.people.append(person)
    
    db.session.add(new_entry)
    db.session.commit()
    
    return jsonify({'id': new_entry.id, 'message': 'Journal entry created successfully'}), 201

@app.route('/api/journal-entries/<int:entry_id>', methods=['PUT'])
@login_required
def update_journal_entry(entry_id):
    entry = JournalEntry.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
    
    data = request.json
    
    # Update fields
    if 'title' in data:
        entry.title = data['title']
    if 'content' in data:
        entry.content = data['content']
        # Re-analyze sentiment if content changed
        entry.sentiment_score = analyze_sentiment(data['content'])
    if 'mood' in data:
        entry.mood = data['mood']
    if 'interaction_type' in data:
        entry.interaction_type = data['interaction_type']
    
    # Update associated people
    if 'people_ids' in data:
        # Clear existing people
        entry.people = []
        
        # Add new people
        for person_id in data['people_ids']:
            person = Person.query.filter_by(id=person_id, user_id=current_user.id).first()
            if person:
                entry.people.append(person)
    
    db.session.commit()
    
    return jsonify({'message': 'Journal entry updated successfully'})

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
