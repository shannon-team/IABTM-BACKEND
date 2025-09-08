import { ApiResponse } from '../utils/ApiResponse.js';

// LRU Cache for feed data
class LRUCache {
  constructor(capacity = 100) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

// Priority Queue for feed ranking
class PriorityQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(item, priority) {
    this.queue.push({ item, priority });
    this.queue.sort((a, b) => b.priority - a.priority); // Highest priority first
  }

  dequeue() {
    return this.queue.shift()?.item;
  }

  peek() {
    return this.queue[0]?.item;
  }

  size() {
    return this.queue.size;
  }

  clear() {
    this.queue = [];
  }
}

// Feed optimization manager
class FeedOptimizer {
  constructor() {
    this.userFeedCache = new LRUCache(50); // Cache 50 user feeds
    this.postCache = new LRUCache(200); // Cache 200 posts
    this.recommendationCache = new LRUCache(30); // Cache 30 recommendation sets
  }

  // Generate cache key for user feed
  generateFeedKey(userId, feedType = 'personalized') {
    return `${feedType}_${userId}`;
  }

  // Generate cache key for post
  generatePostKey(postId) {
    return `post_${postId}`;
  }

  // Cache user feed
  cacheUserFeed(userId, feedType, posts) {
    const key = this.generateFeedKey(userId, feedType);
    this.userFeedCache.put(key, {
      posts,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes cache
    });
  }

  // Get cached user feed
  getCachedUserFeed(userId, feedType) {
    const key = this.generateFeedKey(userId, feedType);
    const cached = this.userFeedCache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.posts;
    }
    
    return null;
  }

  // Cache individual post
  cachePost(postId, postData) {
    const key = this.generatePostKey(postId);
    this.postCache.put(key, {
      data: postData,
      timestamp: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes cache
    });
  }

  // Get cached post
  getCachedPost(postId) {
    const key = this.generatePostKey(postId);
    const cached = this.postCache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    return null;
  }

  // Optimize feed with priority queue
  optimizeFeed(posts, userPreferences = {}) {
    const priorityQueue = new PriorityQueue();
    
    posts.forEach(post => {
      let priority = 0;
      
      // Engagement priority
      priority += (post.applauds?.length || 0) * 3;
      priority += (post.comments?.length || 0) * 2;
      priority += (post.likes?.count || 0) * 1;
      
      // Recency priority (newer posts get higher priority)
      const hoursSinceCreation = (Date.now() - new Date(post.createdAt)) / (1000 * 60 * 60);
      priority += Math.max(0, 24 - hoursSinceCreation) * 2;
      
      // User preference priority
      if (userPreferences.ownPosts && post.postedBy._id === userPreferences.userId) {
        priority += 10;
      }
      
      if (userPreferences.friendPosts && userPreferences.friends?.includes(post.postedBy._id)) {
        priority += 5;
      }
      
      priorityQueue.enqueue(post, priority);
    });
    
    // Extract posts in priority order
    const optimizedPosts = [];
    while (optimizedPosts.length < 50 && priorityQueue.size() > 0) {
      const post = priorityQueue.dequeue();
      if (post) optimizedPosts.push(post);
    }
    
    return optimizedPosts;
  }

  // Clear expired cache entries
  cleanupCache() {
    const now = Date.now();
    
    // Clean user feed cache
    for (const [key, value] of this.userFeedCache.cache) {
      if (now >= value.expiresAt) {
        this.userFeedCache.cache.delete(key);
      }
    }
    
    // Clean post cache
    for (const [key, value] of this.postCache.cache) {
      if (now >= value.expiresAt) {
        this.postCache.cache.delete(key);
      }
    }
  }
}

// Global feed optimizer instance
const feedOptimizer = new FeedOptimizer();

// Cleanup cache every 5 minutes
setInterval(() => {
  feedOptimizer.cleanupCache();
}, 5 * 60 * 1000);

export { feedOptimizer, LRUCache, PriorityQueue }; 