// This file contains JavaScript code for sentiment analysis on the client side
// For real-time sentiment analysis hints while typing journal entries

document.addEventListener('DOMContentLoaded', function() {
    // Get the content textarea element
    const contentTextarea = document.getElementById('content');
    
    // Only proceed if we're on the journal page with the content element
    if (contentTextarea) {
        // The event listener for real-time analysis is set up in journal.js
        // to integrate with the enhanced text editor
    }
});

// Simple client-side sentiment analysis
function calculateSentiment(text) {
    // This is a very simplified version of sentiment analysis
    // In a production app, we would use the server-side analysis
    // with proper NLP libraries
    
    const positiveWords = [
        'happy', 'good', 'great', 'excellent', 'wonderful', 'fantastic',
        'amazing', 'love', 'enjoy', 'pleased', 'joy', 'delighted', 'excited',
        'grateful', 'thankful', 'awesome', 'best', 'positive', 'comfortable',
        'fun', 'nice', 'caring', 'helpful', 'thoughtful', 'considerate'
    ];
    
    const negativeWords = [
        'sad', 'bad', 'awful', 'terrible', 'horrible', 'worst', 'hate',
        'annoyed', 'angry', 'upset', 'disappointed', 'frustrating', 'difficult',
        'anxious', 'worried', 'afraid', 'negative', 'uncomfortable', 'hurt',
        'painful', 'trouble', 'problem', 'unhappy', 'sorry', 'regret'
    ];
    
    // Convert to lowercase for easier comparison
    const lowerText = text.toLowerCase();
    
    // Count positive and negative words
    let positiveCount = 0;
    positiveWords.forEach(word => {
        const regex = new RegExp('\\b' + word + '\\b', 'g');
        const matches = lowerText.match(regex);
        if (matches) {
            positiveCount += matches.length;
        }
    });
    
    let negativeCount = 0;
    negativeWords.forEach(word => {
        const regex = new RegExp('\\b' + word + '\\b', 'g');
        const matches = lowerText.match(regex);
        if (matches) {
            negativeCount += matches.length;
        }
    });
    
    // Calculate sentiment score
    const totalCount = positiveCount + negativeCount;
    
    if (totalCount === 0) {
        return 0;  // Neutral sentiment if no positive or negative words found
    }
    
    return (positiveCount - negativeCount) / totalCount;
}

// Update the sentiment indicator based on the calculated score
function updateSentimentIndicator(score) {
    const sentimentScore = document.getElementById('sentiment-score');
    const sentimentIndicator = document.getElementById('sentiment-indicator');
    
    // Update the displayed score
    sentimentScore.textContent = score.toFixed(2);
    
    // Determine sentiment category
    let sentiment;
    let bgColorClass;
    
    if (score > 0.3) {
        sentiment = 'Positive';
        bgColorClass = 'bg-success';
    } else if (score < -0.3) {
        sentiment = 'Negative';
        bgColorClass = 'bg-danger';
    } else {
        sentiment = 'Neutral';
        bgColorClass = 'bg-secondary';
    }
    
    // Update the indicator text and class
    sentimentIndicator.textContent = sentiment;
    
    // Remove all potential color classes
    sentimentIndicator.classList.remove('bg-success', 'bg-danger', 'bg-secondary');
    
    // Add the appropriate color class
    sentimentIndicator.classList.add(bgColorClass);
}
