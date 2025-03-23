import re

def analyze_sentiment(text):
    """
    A more nuanced sentiment analysis function.
    
    This function analyzes text sentiment based on positive and negative keywords
    and phrases, with weighted scores.
    Returns a score between -1 (very negative) and 1 (very positive).
    
    In a production environment, this could be replaced with even more sophisticated
    sentiment analysis using NLP libraries like NLTK, spaCy, or a cloud service API.
    """
    # Strong positive words (weight: 1.0)
    strong_positive = [
        'love', 'amazing', 'excellent', 'fantastic', 'outstanding', 'perfect',
        'wonderful', 'brilliant', 'delightful', 'exceptional', 'thrilled'
    ]
    
    # Moderate positive words (weight: 0.7)
    moderate_positive = [
        'good', 'great', 'happy', 'pleased', 'enjoy', 'nice', 'joy', 'excited',
        'grateful', 'thankful', 'awesome', 'best', 'positive', 'comfortable',
        'fun', 'caring', 'helpful', 'thoughtful', 'considerate', 'impressed'
    ]
    
    # Mild positive words (weight: 0.4)
    mild_positive = [
        'fine', 'okay', 'decent', 'pleasant', 'satisfactory', 'content',
        'calm', 'relaxed', 'refreshing', 'interesting', 'promising', 'sweet'
    ]
    
    # Strong negative words (weight: -1.0)
    strong_negative = [
        'hate', 'terrible', 'horrible', 'awful', 'dreadful', 'miserable',
        'devastating', 'disgusting', 'furious', 'despise', 'disaster'
    ]
    
    # Moderate negative words (weight: -0.7)
    moderate_negative = [
        'bad', 'sad', 'upset', 'angry', 'annoyed', 'disappointed', 'frustrated',
        'unhappy', 'sorry', 'regret', 'difficult', 'unfortunate', 'unpleasant',
        'troubled', 'worried', 'painful', 'negative', 'problem', 'concerned'
    ]
    
    # Mild negative words (weight: -0.4)
    mild_negative = [
        'not great', 'not good', 'mediocre', 'uneasy', 'uncomfortable',
        'tired', 'boring', 'dull', 'bland', 'awkward', 'challenging'
    ]
    
    # Positive phrases (weight: varies)
    positive_phrases = {
        r'was so (sweet|nice|kind|helpful|thoughtful)': 0.8,
        r'made me (smile|laugh|happy)': 0.8,
        r'really (enjoyed|appreciated|liked|loved)': 0.9,
        r'very (supportive|understanding|patient)': 0.8,
        r'had a great time': 0.7,
        r'was a pleasure': 0.7,
        r'went well': 0.6,
        r'felt comfortable': 0.6,
        r'was helpful': 0.5,
        r'helped me': 0.6,
        r'good conversation': 0.5,
        r'looking forward to': 0.5,
        r'impressed': 0.6,
        r'proud of': 0.7,
        r'grateful for': 0.7,
        r'thankful for': 0.7
    }
    
    # Negative phrases (weight: varies)
    negative_phrases = {
        r'had a (bad|terrible|awful|uncomfortable) experience': -0.8,
        r'made me (uncomfortable|upset|angry|sad)': -0.8,
        r'did not (like|enjoy|appreciate)': -0.6,
        r'was not (helpful|pleasant|kind|nice)': -0.6,
        r'was (rude|impolite|inconsiderate|mean)': -0.8,
        r'felt (awkward|uncomfortable|uneasy)': -0.5,
        r'didn\'t go well': -0.6,
        r'wasn\'t (good|great|pleasant)': -0.5,
        r'struggled with': -0.4,
        r'don\'t like': -0.6,
        r'not comfortable': -0.5,
        r'disappointed': -0.5,
        r'frustrating': -0.6,
        r'not happy': -0.6,
        r'concerned about': -0.4,
        r'worried about': -0.4
    }
    
    # Convert to lowercase for easier comparison
    text_lower = text.lower()
    
    # Calculate sentiment scores with weights
    score = 0
    word_count = 0
    
    # Check for strong positive words
    for word in strong_positive:
        matches = len(re.findall(r'\b' + word + r'\b', text_lower))
        score += matches * 1.0
        word_count += matches
    
    # Check for moderate positive words
    for word in moderate_positive:
        matches = len(re.findall(r'\b' + word + r'\b', text_lower))
        score += matches * 0.7
        word_count += matches
    
    # Check for mild positive words
    for word in mild_positive:
        matches = len(re.findall(r'\b' + word + r'\b', text_lower))
        score += matches * 0.4
        word_count += matches
    
    # Check for strong negative words
    for word in strong_negative:
        matches = len(re.findall(r'\b' + word + r'\b', text_lower))
        score += matches * -1.0
        word_count += matches
    
    # Check for moderate negative words
    for word in moderate_negative:
        matches = len(re.findall(r'\b' + word + r'\b', text_lower))
        score += matches * -0.7
        word_count += matches
    
    # Check for mild negative words
    for word in mild_negative:
        matches = len(re.findall(r'\b' + word + r'\b', text_lower))
        score += matches * -0.4
        word_count += matches
    
    # Check for positive phrases
    for phrase, weight in positive_phrases.items():
        matches = len(re.findall(phrase, text_lower))
        score += matches * weight
        word_count += matches
    
    # Check for negative phrases
    for phrase, weight in negative_phrases.items():
        matches = len(re.findall(phrase, text_lower))
        score += matches * weight
        word_count += matches
    
    # Normalize score between -1 and 1
    if word_count == 0:
        return 0  # Neutral sentiment if no sentiment words found
    
    # Calculate final score and ensure it's between -1 and 1
    sentiment_score = score / (word_count * 1.0)
    return max(min(sentiment_score, 1.0), -1.0)


def extract_potential_names(text):
    """
    Extract potential person names from text.
    
    This simplified implementation looks for words that start with a capital letter
    and aren't at the beginning of a sentence or after punctuation.
    
    Returns a list of potential names found in the text.
    """
    # Pattern to find capitalized words that might be names
    # This is a simplified approach - in production, use a Named Entity Recognition model
    potential_names = []
    
    # Split text into sentences
    sentences = re.split(r'[.!?]+', text)
    
    for sentence in sentences:
        # Skip empty sentences
        if not sentence.strip():
            continue
            
        # Find all words in the sentence
        words = re.findall(r'\b\w+\b', sentence)
        
        # Check each word (except the first one, which is naturally capitalized)
        for i, word in enumerate(words):
            if i > 0 and word[0].isupper() and len(word) > 1:
                # Exclude common capitalized non-name words
                common_non_names = ['I', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                                   'Friday', 'Saturday', 'Sunday', 'January', 'February', 
                                   'March', 'April', 'May', 'June', 'July', 'August', 
                                   'September', 'October', 'November', 'December']
                
                if word not in common_non_names:
                    potential_names.append(word)
    
    return list(set(potential_names))  # Remove duplicates
