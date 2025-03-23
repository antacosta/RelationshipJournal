import re

def analyze_sentiment(text):
    """
    A simple sentiment analysis function.
    
    This function analyzes text sentiment based on positive and negative keywords.
    Returns a score between -1 (very negative) and 1 (very positive).
    
    In a production environment, this would be replaced with more sophisticated
    sentiment analysis using NLP libraries like NLTK, TextBlob, or a cloud service.
    """
    positive_words = [
        'happy', 'good', 'great', 'excellent', 'wonderful', 'fantastic',
        'amazing', 'love', 'enjoy', 'pleased', 'joy', 'delighted', 'excited',
        'grateful', 'thankful', 'awesome', 'best', 'positive', 'comfortable',
        'fun', 'nice', 'caring', 'helpful', 'thoughtful', 'considerate'
    ]
    
    negative_words = [
        'sad', 'bad', 'awful', 'terrible', 'horrible', 'worst', 'hate',
        'annoyed', 'angry', 'upset', 'disappointed', 'frustrating', 'difficult',
        'anxious', 'worried', 'afraid', 'negative', 'uncomfortable', 'hurt',
        'painful', 'trouble', 'problem', 'unhappy', 'sorry', 'regret'
    ]
    
    # Convert to lowercase for easier comparison
    text = text.lower()
    
    # Count positive and negative words
    positive_count = 0
    for word in positive_words:
        positive_count += len(re.findall(r'\b' + word + r'\b', text))
    
    negative_count = 0
    for word in negative_words:
        negative_count += len(re.findall(r'\b' + word + r'\b', text))
    
    # Calculate sentiment score
    total_count = positive_count + negative_count
    
    if total_count == 0:
        return 0  # Neutral sentiment if no positive or negative words found
    
    sentiment_score = (positive_count - negative_count) / total_count
    
    return sentiment_score
