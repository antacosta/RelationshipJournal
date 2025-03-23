from app import db, login_manager
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    date_joined = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    journal_entries = db.relationship('JournalEntry', backref='author', lazy='dynamic')
    people = db.relationship('Person', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Person(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    relationship_type = db.Column(db.String(50))  # e.g., friend, family, colleague
    description = db.Column(db.Text)
    date_added = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relationships
    journal_entries = db.relationship('JournalEntry', 
                                     secondary='journal_person', 
                                     backref=db.backref('people', lazy='dynamic'))
    
    def __repr__(self):
        return f'<Person {self.name}>'

class JournalEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    mood = db.Column(db.String(50))  # e.g., happy, sad, neutral
    sentiment_score = db.Column(db.Float)  # numerical sentiment (-1 to 1)
    interaction_type = db.Column(db.String(50))  # e.g., meeting, call, text
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def __repr__(self):
        return f'<JournalEntry {self.title}>'

# Association table for many-to-many relationship between JournalEntry and Person
journal_person = db.Table('journal_person',
    db.Column('journal_entry_id', db.Integer, db.ForeignKey('journal_entry.id'), primary_key=True),
    db.Column('person_id', db.Integer, db.ForeignKey('person.id'), primary_key=True)
)
