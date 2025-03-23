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

// Enhanced client-side sentiment analysis
function calculateSentiment(text) {
    // This is a more nuanced sentiment analysis that considers:
    // - Weighted emotion words (strong vs mild emotions)
    // - Emotional phrases (not just single words)
    // - Negation handling
    // - Context-based emotion detection
    
    // In a production app, we would use a server-side analysis
    // with proper NLP libraries or a sentiment API
    
    // Weighted positive words/phrases with intensity scores (0.5 to 1.0)
    const positiveTerms = {
        // Strong positive emotions (score: 0.8-1.0)
        'ecstatic': 1.0, 'overjoyed': 1.0, 'elated': 0.9, 'thrilled': 0.9,
        'absolutely love': 0.9, 'incredibly happy': 0.9, 'fantastic': 0.9,
        'exhilarated': 0.9, 'couldn\'t be happier': 0.9, 'perfect': 0.8,
        'amazing': 0.8, 'wonderful': 0.8, 'brilliant': 0.8, 'exceptional': 0.8,
        
        // Moderate positive emotions (score: 0.6-0.7)
        'happy': 0.7, 'joy': 0.7, 'delighted': 0.7, 'great': 0.7, 'love': 0.7,
        'excited': 0.7, 'pleased': 0.6, 'glad': 0.6, 'satisfied': 0.6,
        'enjoyed': 0.6, 'proud': 0.6, 'impressed': 0.6, 'grateful': 0.6,
        
        // Mild positive emotions (score: 0.5)
        'good': 0.5, 'nice': 0.5, 'fine': 0.5, 'ok': 0.5, 'okay': 0.5,
        'content': 0.5, 'comfortable': 0.5, 'thankful': 0.5, 'pleasant': 0.5,
        'positive': 0.5, 'calm': 0.5, 'relaxed': 0.5, 'relieved': 0.5
    };
    
    // Weighted negative words/phrases with intensity scores (-0.5 to -1.0)
    const negativeTerms = {
        // Strong negative emotions (score: -0.8 to -1.0)
        'devastated': -1.0, 'heartbroken': -1.0, 'miserable': -0.9, 'despair': -0.9,
        'absolutely hate': -0.9, 'terrible': -0.9, 'horrible': -0.9, 'furious': -0.9,
        'completely failed': -0.9, 'disaster': -0.8, 'awful': -0.8, 'disgusted': -0.8,
        'dreadful': -0.8, 'terrified': -0.8, 'depressed': -0.8,
        
        // Moderate negative emotions (score: -0.6 to -0.7)
        'sad': -0.7, 'angry': -0.7, 'upset': -0.7, 'hate': -0.7, 'annoyed': -0.7,
        'disappointed': -0.7, 'frustrated': -0.6, 'hurt': -0.6, 'anxious': -0.6,
        'worried': -0.6, 'unhappy': -0.6, 'regret': -0.6, 'troubled': -0.6,
        
        // Mild negative emotions (score: -0.5)
        'bad': -0.5, 'dislike': -0.5, 'meh': -0.5, 'uncomfortable': -0.5,
        'concerned': -0.5, 'tired': -0.5, 'bored': -0.5, 'confused': -0.5,
        'unsure': -0.5, 'uncertain': -0.5, 'not great': -0.5, 'mediocre': -0.5
    };
    
    // Negation words that flip the sentiment
    const negationWords = ['not', 'no', 'never', 'don\'t', 'doesn\'t', 'didn\'t', 'wouldn\'t', 'couldn\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t'];
    
    // Amplifiers increase the intensity of sentiment
    const amplifiers = ['very', 'really', 'extremely', 'incredibly', 'absolutely', 'completely', 'totally', 'utterly', 'so'];
    
    // Diminishers decrease the intensity of sentiment
    const diminishers = ['somewhat', 'slightly', 'a bit', 'a little', 'kind of', 'sort of', 'barely'];
    
    // Special phrases that indicate complex or mixed emotions
    const complexEmotions = {
        'mixed feelings': 0, 'bittersweet': 0.1, 'complicated feelings': 0,
        'emotional rollercoaster': 0, 'conflicted': -0.1, 'unsure how to feel': 0
    };
    
    // Convert to lowercase for easier comparison
    const lowerText = text.toLowerCase();
    
    // Break the text into sentences for better context analysis
    const sentences = lowerText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let totalScore = 0;
    let termCount = 0;
    let hasComplex = false;
    
    // Check for complex emotion indicators across the whole text
    Object.keys(complexEmotions).forEach(phrase => {
        if (lowerText.includes(phrase)) {
            hasComplex = true;
            totalScore += complexEmotions[phrase];
            termCount++;
        }
    });
    
    // Analyze each sentence separately to better handle negation and context
    sentences.forEach(sentence => {
        // Tokenize the sentence into words
        const words = sentence.match(/\b[\w']+\b/g) || [];
        
        // Check for negation in this sentence
        let hasNegation = words.some(word => negationWords.includes(word));
        
        // Track amplifiers and diminishers in this sentence
        let hasAmplifier = words.some(word => amplifiers.includes(word));
        let hasDiminisher = words.some(word => diminishers.includes(word));
        
        // Calculate sentiment modifier based on amplifiers and diminishers
        let sentimentModifier = 1.0;
        if (hasAmplifier) sentimentModifier = 1.5;
        if (hasDiminisher) sentimentModifier = 0.5;
        
        // Find positive terms in the sentence
        Object.keys(positiveTerms).forEach(term => {
            if (sentence.includes(term)) {
                // If there's negation, flip the sentiment
                let score = positiveTerms[term] * sentimentModifier;
                if (hasNegation) {
                    // Negation reduces the intensity and flips the polarity
                    score = -score * 0.8;
                }
                totalScore += score;
                termCount++;
            }
        });
        
        // Find negative terms in the sentence
        Object.keys(negativeTerms).forEach(term => {
            if (sentence.includes(term)) {
                // If there's negation, flip the sentiment (double negative = positive)
                let score = negativeTerms[term] * sentimentModifier;
                if (hasNegation) {
                    // Negation reduces the intensity and flips the polarity
                    score = -score * 0.8;
                }
                totalScore += score;
                termCount++;
            }
        });
    });
    
    // Calculate the final sentiment score
    if (termCount === 0) {
        return 0;  // Neutral sentiment if no emotional terms found
    }
    
    // Normalize score to range between -1 and 1
    let score = totalScore / termCount;
    
    // If there are complex emotions, dampen the score to reflect ambivalence
    if (hasComplex) {
        score *= 0.7; // Reduce intensity to reflect emotional complexity
    }
    
    // Ensure score is within -1 to 1 range
    return Math.max(-1, Math.min(1, score));
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
