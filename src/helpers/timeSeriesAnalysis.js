import { ApiResponse } from '../utils/ApiResponse.js';

// Circular Buffer for time series data
class CircularBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.size = 0;
  }

  push(value) {
    this.buffer[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  get(index) {
    if (index >= this.size) return null;
    const actualIndex = (this.head - this.size + index + this.capacity) % this.capacity;
    return this.buffer[actualIndex];
  }

  toArray() {
    const result = [];
    for (let i = 0; i < this.size; i++) {
      result.push(this.get(i));
    }
    return result;
  }

  clear() {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.size = 0;
  }
}

// Moving Average Calculator
class MovingAverage {
  constructor(windowSize) {
    this.windowSize = windowSize;
    this.buffer = new CircularBuffer(windowSize);
    this.sum = 0;
  }

  add(value) {
    if (this.buffer.size >= this.windowSize) {
      this.sum -= this.buffer.get(0);
    }
    this.buffer.push(value);
    this.sum += value;
  }

  getAverage() {
    if (this.buffer.size === 0) return 0;
    return this.sum / this.buffer.size;
  }

  getTrend() {
    if (this.buffer.size < 2) return 'stable';
    
    const recent = this.buffer.get(this.buffer.size - 1);
    const previous = this.buffer.get(this.buffer.size - 2);
    
    if (recent > previous * 1.1) return 'increasing';
    if (recent < previous * 0.9) return 'decreasing';
    return 'stable';
  }
}

// Exponential Smoothing for trend prediction
class ExponentialSmoothing {
  constructor(alpha = 0.3) {
    this.alpha = alpha;
    this.lastValue = null;
    this.lastTrend = 0;
  }

  update(value) {
    if (this.lastValue === null) {
      this.lastValue = value;
      return value;
    }

    const smoothed = this.alpha * value + (1 - this.alpha) * this.lastValue;
    this.lastTrend = value - this.lastValue;
    this.lastValue = smoothed;
    
    return smoothed;
  }

  predict(steps = 1) {
    if (this.lastValue === null) return null;
    return this.lastValue + (this.lastTrend * steps);
  }
}

// Time Series Analyzer for engagement patterns
class TimeSeriesAnalyzer {
  constructor() {
    this.hourlyEngagement = new Map(); // hour -> CircularBuffer
    this.dailyEngagement = new Map(); // dayOfWeek -> CircularBuffer
    this.weeklyTrends = new Map(); // metric -> MovingAverage
    this.smoothingModels = new Map(); // metric -> ExponentialSmoothing
  }

  // Initialize buffers for different time periods
  initializeBuffers() {
    // Hourly engagement (24 hours)
    for (let hour = 0; hour < 24; hour++) {
      this.hourlyEngagement.set(hour, new CircularBuffer(30)); // 30 days of data
    }

    // Daily engagement (7 days)
    for (let day = 0; day < 7; day++) {
      this.dailyEngagement.set(day, new CircularBuffer(12)); // 12 weeks of data
    }

    // Weekly trends
    this.weeklyTrends.set('totalPosts', new MovingAverage(4)); // 4 weeks
    this.weeklyTrends.set('avgEngagement', new MovingAverage(4));
    this.weeklyTrends.set('viralPosts', new MovingAverage(4));

    // Smoothing models
    this.smoothingModels.set('engagement', new ExponentialSmoothing(0.3));
    this.smoothingModels.set('posts', new ExponentialSmoothing(0.2));
  }

  // Add engagement data point
  addEngagementData(post, timestamp) {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    const engagement = (post.applauds?.length || 0) + 
                      (post.comments?.length || 0) + 
                      (post.likes?.count || 0);

    // Add to hourly buffer
    if (this.hourlyEngagement.has(hour)) {
      this.hourlyEngagement.get(hour).push(engagement);
    }

    // Add to daily buffer
    if (this.dailyEngagement.has(dayOfWeek)) {
      this.dailyEngagement.get(dayOfWeek).push(engagement);
    }

    // Update smoothing models
    this.smoothingModels.get('engagement').update(engagement);
    this.smoothingModels.get('posts').update(1); // Count posts
  }

  // Get optimal posting times
  getOptimalPostingTimes() {
    const hourlyAverages = new Map();
    
    // Calculate average engagement for each hour
    for (const [hour, buffer] of this.hourlyEngagement) {
      const data = buffer.toArray();
      if (data.length > 0) {
        const average = data.reduce((sum, val) => sum + val, 0) / data.length;
        hourlyAverages.set(hour, average);
      }
    }

    // Find top 3 hours with highest engagement
    const sortedHours = Array.from(hourlyAverages.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    return sortedHours.map(([hour, avg]) => ({
      hour,
      averageEngagement: avg,
      timeString: `${hour.toString().padStart(2, '0')}:00`
    }));
  }

  // Get best days for posting
  getBestPostingDays() {
    const dailyAverages = new Map();
    
    for (const [day, buffer] of this.dailyEngagement) {
      const data = buffer.toArray();
      if (data.length > 0) {
        const average = data.reduce((sum, val) => sum + val, 0) / data.length;
        dailyAverages.set(day, average);
      }
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return Array.from(dailyAverages.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([day, avg]) => ({
        day: dayNames[day],
        averageEngagement: avg
      }));
  }

  // Predict engagement for next time period
  predictEngagement(timeWindow = 'hour') {
    const model = this.smoothingModels.get('engagement');
    if (!model) return null;

    const prediction = model.predict(1);
    const trend = model.lastTrend;

    return {
      predictedEngagement: Math.max(0, prediction),
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      confidence: Math.abs(trend) / (prediction || 1)
    };
  }

  // Get trend analysis
  getTrendAnalysis() {
    const trends = {};
    
    for (const [metric, movingAvg] of this.weeklyTrends) {
      trends[metric] = {
        current: movingAvg.getAverage(),
        trend: movingAvg.getTrend()
      };
    }

    return trends;
  }

  // Analyze posting patterns
  analyzePostingPatterns(posts) {
    const patterns = {
      hourlyDistribution: new Array(24).fill(0),
      dailyDistribution: new Array(7).fill(0),
      engagementByHour: new Array(24).fill(0),
      engagementByDay: new Array(7).fill(0)
    };

    posts.forEach(post => {
      const date = new Date(post.createdAt);
      const hour = date.getHours();
      const day = date.getDay();
      
      const engagement = (post.applauds?.length || 0) + 
                        (post.comments?.length || 0) + 
                        (post.likes?.count || 0);

      patterns.hourlyDistribution[hour]++;
      patterns.dailyDistribution[day]++;
      patterns.engagementByHour[hour] += engagement;
      patterns.engagementByDay[day] += engagement;
    });

    // Calculate averages
    for (let i = 0; i < 24; i++) {
      if (patterns.hourlyDistribution[i] > 0) {
        patterns.engagementByHour[i] /= patterns.hourlyDistribution[i];
      }
    }

    for (let i = 0; i < 7; i++) {
      if (patterns.dailyDistribution[i] > 0) {
        patterns.engagementByDay[i] /= patterns.dailyDistribution[i];
      }
    }

    return patterns;
  }

  // Get content timing recommendations
  getTimingRecommendations() {
    const optimalTimes = this.getOptimalPostingTimes();
    const bestDays = this.getBestPostingDays();
    const prediction = this.predictEngagement();
    const trends = this.getTrendAnalysis();

    return {
      optimalTimes,
      bestDays,
      prediction,
      trends,
      recommendations: {
        bestTimeToPost: optimalTimes[0]?.timeString || '09:00',
        bestDayToPost: bestDays[0]?.day || 'Wednesday',
        expectedEngagement: prediction?.predictedEngagement || 0,
        trendDirection: prediction?.trend || 'stable'
      }
    };
  }
}

// Real-time trend detector
class TrendDetector {
  constructor() {
    this.recentPosts = new CircularBuffer(100);
    this.trendKeywords = new Map();
    this.trendingTopics = new Map();
  }

  // Add post for trend analysis
  addPost(post) {
    this.recentPosts.push({
      content: post.content,
      hashtags: post.hashtags || [],
      engagement: (post.applauds?.length || 0) + (post.comments?.length || 0) + (post.likes?.count || 0),
      timestamp: new Date(post.createdAt)
    });

    this.updateTrends();
  }

  // Update trending topics
  updateTrends() {
    const posts = this.recentPosts.toArray();
    const now = Date.now();
    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours

    // Filter recent posts
    const recentPosts = posts.filter(post => 
      now - post.timestamp < timeWindow
    );

    // Extract keywords and hashtags
    const keywordCount = new Map();
    const hashtagCount = new Map();

    recentPosts.forEach(post => {
      // Count hashtags
      post.hashtags.forEach(hashtag => {
        hashtagCount.set(hashtag, (hashtagCount.get(hashtag) || 0) + 1);
      });

      // Extract keywords from content
      const words = post.content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);

      words.forEach(word => {
        keywordCount.set(word, (keywordCount.get(word) || 0) + 1);
      });
    });

    // Update trending topics
    this.trendingTopics = new Map([
      ...Array.from(hashtagCount.entries()).slice(0, 10),
      ...Array.from(keywordCount.entries()).slice(0, 10)
    ]);
  }

  // Get trending topics
  getTrendingTopics() {
    return Array.from(this.trendingTopics.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));
  }

  // Get viral content indicators
  getViralIndicators() {
    const posts = this.recentPosts.toArray();
    const now = Date.now();
    const timeWindow = 6 * 60 * 60 * 1000; // 6 hours

    const recentPosts = posts.filter(post => 
      now - post.timestamp < timeWindow
    );

    const viralIndicators = recentPosts
      .filter(post => post.engagement > 10) // High engagement threshold
      .map(post => ({
        content: post.content.substring(0, 100) + '...',
        engagement: post.engagement,
        hashtags: post.hashtags,
        timeAgo: Math.floor((now - post.timestamp) / (1000 * 60)) // minutes ago
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);

    return viralIndicators;
  }
}

export { CircularBuffer, MovingAverage, ExponentialSmoothing, TimeSeriesAnalyzer, TrendDetector }; 