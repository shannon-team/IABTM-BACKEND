import { ApiResponse } from '../utils/ApiResponse.js';

// Bloom Filter for efficient duplicate detection
class BloomFilter {
  constructor(size = 10000, hashCount = 3) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Array(size).fill(0);
  }

  // Hash functions for bloom filter
  hash1(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % this.size;
  }

  hash2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash) % this.size;
  }

  hash3(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & 0xFFFFFFFF; // 32-bit
    }
    return Math.abs(hash) % this.size;
  }

  // Add element to bloom filter
  add(element) {
    const hash1 = this.hash1(element);
    const hash2 = this.hash2(element);
    const hash3 = this.hash3(element);

    this.bitArray[hash1] = 1;
    this.bitArray[hash2] = 1;
    this.bitArray[hash3] = 1;
  }

  // Check if element might be in bloom filter
  contains(element) {
    const hash1 = this.hash1(element);
    const hash2 = this.hash2(element);
    const hash3 = this.hash3(element);

    return this.bitArray[hash1] === 1 && 
           this.bitArray[hash2] === 1 && 
           this.bitArray[hash3] === 1;
  }

  // Clear bloom filter
  clear() {
    this.bitArray.fill(0);
  }
}

// Sliding Window for real-time data processing
class SlidingWindow {
  constructor(windowSize) {
    this.windowSize = windowSize;
    this.data = [];
    this.timestamps = [];
  }

  // Add data point with timestamp
  add(data, timestamp) {
    this.data.push(data);
    this.timestamps.push(timestamp);

    // Remove old data outside window
    const cutoff = timestamp - this.windowSize;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.data.shift();
      this.timestamps.shift();
    }
  }

  // Get data within current window
  getWindowData() {
    return this.data;
  }

  // Get window statistics
  getStats() {
    if (this.data.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0 };
    }

    const sum = this.data.reduce((a, b) => a + b, 0);
    const avg = sum / this.data.length;
    const min = Math.min(...this.data);
    const max = Math.max(...this.data);

    return {
      count: this.data.length,
      avg,
      min,
      max,
      sum
    };
  }

  // Check if window is full
  isFull() {
    return this.data.length >= this.windowSize;
  }
}

// Count-Min Sketch for frequency estimation
class CountMinSketch {
  constructor(width = 1000, depth = 5) {
    this.width = width;
    this.depth = depth;
    this.sketch = Array(depth).fill().map(() => new Array(width).fill(0));
  }

  // Hash function for count-min sketch
  hash(str, seed) {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & 0xFFFFFFFF;
    }
    return Math.abs(hash) % this.width;
  }

  // Increment count for element
  increment(element) {
    for (let i = 0; i < this.depth; i++) {
      const hash = this.hash(element, i + 1);
      this.sketch[i][hash]++;
    }
  }

  // Get estimated count for element
  getCount(element) {
    let minCount = Infinity;
    for (let i = 0; i < this.depth; i++) {
      const hash = this.hash(element, i + 1);
      minCount = Math.min(minCount, this.sketch[i][hash]);
    }
    return minCount;
  }

  // Clear sketch
  clear() {
    for (let i = 0; i < this.depth; i++) {
      this.sketch[i].fill(0);
    }
  }
}

// Reservoir Sampling for random sampling from stream
class ReservoirSampler {
  constructor(sampleSize) {
    this.sampleSize = sampleSize;
    this.samples = [];
    this.count = 0;
  }

  // Add element to reservoir
  add(element) {
    this.count++;
    
    if (this.samples.length < this.sampleSize) {
      this.samples.push(element);
    } else {
      // Randomly replace with probability sampleSize/count
      const randomIndex = Math.floor(Math.random() * this.count);
      if (randomIndex < this.sampleSize) {
        this.samples[randomIndex] = element;
      }
    }
  }

  // Get current samples
  getSamples() {
    return [...this.samples];
  }

  // Get sample statistics
  getStats() {
    return {
      sampleSize: this.samples.length,
      totalCount: this.count,
      samplingRate: this.samples.length / this.count
    };
  }
}

// Real-time Stream Processor
class StreamProcessor {
  constructor() {
    this.duplicateFilter = new BloomFilter(10000, 3);
    this.spamFilter = new CountMinSketch(1000, 5);
    this.engagementWindow = new SlidingWindow(60 * 60 * 1000); // 1 hour
    this.postWindow = new SlidingWindow(24 * 60 * 60 * 1000); // 24 hours
    this.sampler = new ReservoirSampler(100);
    this.spamThreshold = 5; // Posts per hour threshold
    this.duplicateThreshold = 0.8; // Similarity threshold
  }

  // Process incoming post
  processPost(post) {
    const now = Date.now();
    const postId = post._id || post.id;
    const content = post.content || '';
    const authorId = post.postedBy._id || post.postedBy;

    // Check for duplicates
    const isDuplicate = this.checkDuplicate(content);
    
    // Check for spam
    const isSpam = this.checkSpam(authorId);
    
    // Add to windows
    this.engagementWindow.add(
      (post.applauds?.length || 0) + (post.comments?.length || 0) + (post.likes?.count || 0),
      now
    );
    
    this.postWindow.add(1, now);
    
    // Add to sampler
    this.sampler.add(post);
    
    // Update filters
    this.duplicateFilter.add(content);
    this.spamFilter.increment(authorId);

    return {
      postId,
      isDuplicate,
      isSpam,
      processedAt: now,
      stats: this.getStats()
    };
  }

  // Check for duplicate content
  checkDuplicate(content) {
    const normalizedContent = content.toLowerCase().replace(/[^\w\s]/g, '');
    return this.duplicateFilter.contains(normalizedContent);
  }

  // Check for spam behavior
  checkSpam(authorId) {
    const postCount = this.spamFilter.getCount(authorId);
    return postCount > this.spamThreshold;
  }

  // Get processing statistics
  getStats() {
    const engagementStats = this.engagementWindow.getStats();
    const postStats = this.postWindow.getStats();
    const sampleStats = this.sampler.getStats();

    return {
      engagement: {
        avg: engagementStats.avg,
        count: engagementStats.count,
        trend: engagementStats.avg > 5 ? 'high' : engagementStats.avg > 2 ? 'medium' : 'low'
      },
      posts: {
        rate: postStats.avg,
        count: postStats.count,
        status: postStats.avg > 10 ? 'high' : postStats.avg > 5 ? 'medium' : 'low'
      },
      sampling: sampleStats,
      spamDetected: this.spamFilter.getCount('spam') > 0,
      duplicatesDetected: this.duplicateFilter.contains('duplicate')
    };
  }

  // Get real-time alerts
  getAlerts() {
    const alerts = [];
    const stats = this.getStats();

    if (stats.engagement.trend === 'low') {
      alerts.push({
        type: 'low_engagement',
        message: 'Engagement rate is below normal',
        severity: 'warning'
      });
    }

    if (stats.posts.status === 'high') {
      alerts.push({
        type: 'high_post_rate',
        message: 'Posting rate is unusually high',
        severity: 'warning'
      });
    }

    if (stats.spamDetected) {
      alerts.push({
        type: 'spam_detected',
        message: 'Spam activity detected',
        severity: 'critical'
      });
    }

    return alerts;
  }

  // Get trending content from samples
  getTrendingContent() {
    const samples = this.sampler.getSamples();
    
    // Group by hashtags
    const hashtagCount = new Map();
    samples.forEach(post => {
      const hashtags = post.hashtags || [];
      hashtags.forEach(tag => {
        hashtagCount.set(tag, (hashtagCount.get(tag) || 0) + 1);
      });
    });

    // Get top hashtags
    const trendingHashtags = Array.from(hashtagCount.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    // Get high engagement posts
    const highEngagementPosts = samples
      .filter(post => {
        const engagement = (post.applauds?.length || 0) + 
                          (post.comments?.length || 0) + 
                          (post.likes?.count || 0);
        return engagement > 5;
      })
      .sort((a, b) => {
        const aEngagement = (a.applauds?.length || 0) + (a.comments?.length || 0) + (a.likes?.count || 0);
        const bEngagement = (b.applauds?.length || 0) + (b.comments?.length || 0) + (b.likes?.count || 0);
        return bEngagement - aEngagement;
      })
      .slice(0, 3);

    return {
      trendingHashtags,
      highEngagementPosts,
      sampleSize: samples.length
    };
  }

  // Reset all filters and windows
  reset() {
    this.duplicateFilter.clear();
    this.spamFilter.clear();
    this.engagementWindow = new SlidingWindow(60 * 60 * 1000);
    this.postWindow = new SlidingWindow(24 * 60 * 60 * 1000);
    this.sampler = new ReservoirSampler(100);
  }
}

// Content Quality Analyzer
class ContentQualityAnalyzer {
  constructor() {
    this.qualityMetrics = {
      minLength: 10,
      maxLength: 1000,
      spamWords: new Set(['buy', 'sell', 'click', 'free', 'offer', 'limited', 'act now']),
      qualityWords: new Set(['insight', 'thought', 'experience', 'learn', 'share', 'discuss'])
    };
  }

  // Analyze content quality
  analyzeQuality(content) {
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    
    let spamScore = 0;
    let qualityScore = 0;
    
    words.forEach(word => {
      if (this.qualityMetrics.spamWords.has(word)) {
        spamScore++;
      }
      if (this.qualityMetrics.qualityWords.has(word)) {
        qualityScore++;
      }
    });

    const lengthScore = wordCount >= this.qualityMetrics.minLength && 
                       wordCount <= this.qualityMetrics.maxLength ? 1 : 0;
    
    const spamRatio = spamScore / wordCount;
    const qualityRatio = qualityScore / wordCount;

    let quality = 'good';
    if (spamRatio > 0.1 || lengthScore === 0) {
      quality = 'poor';
    } else if (qualityRatio > 0.05) {
      quality = 'excellent';
    }

    return {
      quality,
      metrics: {
        wordCount,
        spamScore,
        qualityScore,
        spamRatio,
        qualityRatio,
        lengthScore
      }
    };
  }

  // Get content recommendations
  getQualityRecommendations(content) {
    const analysis = this.analyzeQuality(content);
    const recommendations = [];

    if (analysis.metrics.wordCount < this.qualityMetrics.minLength) {
      recommendations.push('Consider adding more detail to your post');
    }

    if (analysis.metrics.wordCount > this.qualityMetrics.maxLength) {
      recommendations.push('Consider making your post more concise');
    }

    if (analysis.metrics.spamRatio > 0.05) {
      recommendations.push('Avoid promotional language for better engagement');
    }

    if (analysis.metrics.qualityRatio < 0.02) {
      recommendations.push('Adding personal insights can improve engagement');
    }

    return {
      quality: analysis.quality,
      recommendations,
      score: analysis.metrics.qualityRatio - analysis.metrics.spamRatio
    };
  }
}

export { 
  BloomFilter, 
  SlidingWindow, 
  CountMinSketch, 
  ReservoirSampler, 
  StreamProcessor, 
  ContentQualityAnalyzer 
}; 