// Sentiment Analysis for Content Understanding
class SentimentAnalyzer {
  constructor() {
    // Positive and negative word dictionaries
    this.positiveWords = new Set([
      'love', 'great', 'amazing', 'wonderful', 'excellent', 'fantastic', 'awesome', 'brilliant',
      'happy', 'joy', 'excited', 'inspired', 'motivated', 'grateful', 'blessed', 'successful',
      'beautiful', 'perfect', 'incredible', 'outstanding', 'superb', 'magnificent', 'splendid',
      'delighted', 'thrilled', 'ecstatic', 'elated', 'jubilant', 'euphoric', 'blissful'
    ]);
    
    this.negativeWords = new Set([
      'hate', 'terrible', 'awful', 'horrible', 'disgusting', 'disappointed', 'angry', 'sad',
      'depressed', 'frustrated', 'annoyed', 'irritated', 'upset', 'worried', 'anxious', 'stressed',
      'miserable', 'unhappy', 'sorrowful', 'grief', 'pain', 'suffering', 'agony', 'despair',
      'hopeless', 'defeated', 'broken', 'crushed', 'devastated', 'heartbroken', 'shattered'
    ]);
    
    // Intensity modifiers
    this.intensifiers = new Set([
      'very', 'extremely', 'absolutely', 'completely', 'totally', 'entirely', 'thoroughly',
      'really', 'truly', 'genuinely', 'sincerely', 'deeply', 'profoundly', 'intensely'
    ]);
    
    this.diminishers = new Set([
      'slightly', 'somewhat', 'kind of', 'sort of', 'a little', 'barely', 'hardly',
      'almost', 'nearly', 'practically', 'virtually', 'essentially', 'basically'
    ]);
  }

  // Analyze sentiment of text content
  analyzeSentiment(text) {
    if (!text) return { score: 0, sentiment: 'neutral', confidence: 0 };
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    let score = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let totalWords = words.length;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let wordScore = 0;
      
      // Check if word is positive or negative
      if (this.positiveWords.has(word)) {
        wordScore = 1;
        positiveCount++;
      } else if (this.negativeWords.has(word)) {
        wordScore = -1;
        negativeCount++;
      }
      
      // Check for intensifiers and diminishers
      if (i > 0) {
        const prevWord = words[i - 1];
        if (this.intensifiers.has(prevWord)) {
          wordScore *= 1.5;
        } else if (this.diminishers.has(prevWord)) {
          wordScore *= 0.5;
        }
      }
      
      score += wordScore;
    }
    
    // Normalize score
    const normalizedScore = totalWords > 0 ? score / totalWords : 0;
    
    // Determine sentiment
    let sentiment = 'neutral';
    let confidence = Math.abs(normalizedScore);
    
    if (normalizedScore > 0.1) {
      sentiment = 'positive';
    } else if (normalizedScore < -0.1) {
      sentiment = 'negative';
    }
    
    return {
      score: normalizedScore,
      sentiment,
      confidence,
      positiveCount,
      negativeCount,
      totalWords
    };
  }

  // Analyze user engagement patterns
  analyzeEngagementPattern(posts) {
    if (!posts || posts.length === 0) {
      return { pattern: 'neutral', trend: 'stable' };
    }
    
    const engagementScores = posts.map(post => {
      const sentiment = this.analyzeSentiment(post.content);
      const engagement = (post.applauds?.length || 0) + (post.comments?.length || 0) + (post.likes?.count || 0);
      
      return {
        sentiment: sentiment.sentiment,
        score: sentiment.score,
        engagement,
        timestamp: new Date(post.createdAt)
      };
    });
    
    // Calculate engagement trend
    const recentPosts = engagementScores.slice(-10);
    const olderPosts = engagementScores.slice(0, -10);
    
    const recentAvg = recentPosts.reduce((sum, p) => sum + p.engagement, 0) / recentPosts.length;
    const olderAvg = olderPosts.reduce((sum, p) => sum + p.engagement, 0) / olderPosts.length;
    
    let trend = 'stable';
    if (recentAvg > olderAvg * 1.2) {
      trend = 'increasing';
    } else if (recentAvg < olderAvg * 0.8) {
      trend = 'decreasing';
    }
    
    // Determine overall pattern
    const positivePosts = engagementScores.filter(p => p.sentiment === 'positive').length;
    const negativePosts = engagementScores.filter(p => p.sentiment === 'negative').length;
    const neutralPosts = engagementScores.filter(p => p.sentiment === 'neutral').length;
    
    let pattern = 'neutral';
    if (positivePosts > negativePosts * 2) {
      pattern = 'positive';
    } else if (negativePosts > positivePosts * 2) {
      pattern = 'negative';
    }
    
    return {
      pattern,
      trend,
      stats: {
        positivePosts,
        negativePosts,
        neutralPosts,
        totalPosts: engagementScores.length,
        avgEngagement: engagementScores.reduce((sum, p) => sum + p.engagement, 0) / engagementScores.length
      }
    };
  }

  // Get content recommendations based on sentiment
  getSentimentBasedRecommendations(userPosts, allPosts) {
    const userPattern = this.analyzeEngagementPattern(userPosts);
    
    // Filter posts based on user's sentiment pattern
    let recommendations = allPosts.filter(post => {
      const sentiment = this.analyzeSentiment(post.content);
      
      // If user tends to post positive content, recommend positive posts
      if (userPattern.pattern === 'positive' && sentiment.sentiment === 'positive') {
        return true;
      }
      
      // If user tends to post negative content, recommend supportive/positive posts
      if (userPattern.pattern === 'negative' && sentiment.sentiment === 'positive') {
        return true;
      }
      
      // If user is neutral, recommend diverse content
      return true;
    });
    
    // Sort by engagement and recency
    recommendations.sort((a, b) => {
      const aEngagement = (a.applauds?.length || 0) + (a.comments?.length || 0) + (a.likes?.count || 0);
      const bEngagement = (b.applauds?.length || 0) + (b.comments?.length || 0) + (b.likes?.count || 0);
      
      if (aEngagement !== bEngagement) {
        return bEngagement - aEngagement;
      }
      
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    return recommendations.slice(0, 20);
  }
}

export { SentimentAnalyzer }; 