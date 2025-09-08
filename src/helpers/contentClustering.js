import { ApiResponse } from '../utils/ApiResponse.js';

// K-means clustering for content topics
class ContentClusterer {
  constructor(k = 5) {
    this.k = k;
    this.clusters = [];
    this.centroids = [];
  }

  // Calculate similarity between two content vectors
  calculateSimilarity(vector1, vector2) {
    if (vector1.length !== vector2.length) return 0;
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  // Convert post content to feature vector
  contentToVector(post) {
    const features = {
      hasImage: post.pictures && post.pictures.length > 0 ? 1 : 0,
      hasHashtags: post.hashtags && post.hashtags.length > 0 ? 1 : 0,
      engagementLevel: Math.min((post.applauds?.length || 0) + (post.comments?.length || 0) + (post.likes?.count || 0), 10) / 10,
      contentLength: Math.min(post.content?.length || 0, 500) / 500,
      isRecent: Date.now() - new Date(post.createdAt) < 24 * 60 * 60 * 1000 ? 1 : 0
    };
    
    return [
      features.hasImage,
      features.hasHashtags,
      features.engagementLevel,
      features.contentLength,
      features.isRecent
    ];
  }

  // Initialize centroids randomly
  initializeCentroids(posts) {
    this.centroids = [];
    const vectors = posts.map(post => this.contentToVector(post));
    
    for (let i = 0; i < this.k; i++) {
      const randomIndex = Math.floor(Math.random() * vectors.length);
      this.centroids.push([...vectors[randomIndex]]);
    }
  }

  // Assign posts to nearest centroid
  assignToClusters(posts) {
    this.clusters = Array(this.k).fill().map(() => []);
    
    posts.forEach(post => {
      const vector = this.contentToVector(post);
      let bestCluster = 0;
      let bestSimilarity = -1;
      
      this.centroids.forEach((centroid, index) => {
        const similarity = this.calculateSimilarity(vector, centroid);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = index;
        }
      });
      
      this.clusters[bestCluster].push(post);
    });
  }

  // Update centroids based on cluster assignments
  updateCentroids() {
    this.centroids = this.clusters.map(cluster => {
      if (cluster.length === 0) {
        return Array(5).fill(0); // Default vector
      }
      
      const vectors = cluster.map(post => this.contentToVector(post));
      const centroid = Array(5).fill(0);
      
      for (let i = 0; i < 5; i++) {
        centroid[i] = vectors.reduce((sum, vector) => sum + vector[i], 0) / vectors.length;
      }
      
      return centroid;
    });
  }

  // Perform K-means clustering
  clusterPosts(posts, maxIterations = 100) {
    if (posts.length < this.k) {
      return posts.map(post => ({ ...post, cluster: 0 }));
    }
    
    this.initializeCentroids(posts);
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const previousClusters = JSON.stringify(this.clusters);
      
      this.assignToClusters(posts);
      this.updateCentroids();
      
      // Check for convergence
      if (JSON.stringify(this.clusters) === previousClusters) {
        break;
      }
    }
    
    // Return posts with cluster assignments
    return posts.map(post => {
      const vector = this.contentToVector(post);
      let bestCluster = 0;
      let bestSimilarity = -1;
      
      this.centroids.forEach((centroid, index) => {
        const similarity = this.calculateSimilarity(vector, centroid);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = index;
        }
      });
      
      return { ...post, cluster: bestCluster };
    });
  }

  // Get cluster statistics
  getClusterStats(clusteredPosts) {
    const stats = {};
    
    clusteredPosts.forEach(post => {
      const cluster = post.cluster;
      if (!stats[cluster]) {
        stats[cluster] = {
          count: 0,
          avgEngagement: 0,
          hasImages: 0,
          hasHashtags: 0,
          recentPosts: 0
        };
      }
      
      stats[cluster].count++;
      stats[cluster].avgEngagement += (post.applauds?.length || 0) + (post.comments?.length || 0) + (post.likes?.count || 0);
      
      if (post.pictures && post.pictures.length > 0) {
        stats[cluster].hasImages++;
      }
      
      if (post.hashtags && post.hashtags.length > 0) {
        stats[cluster].hasHashtags++;
      }
      
      if (Date.now() - new Date(post.createdAt) < 24 * 60 * 60 * 1000) {
        stats[cluster].recentPosts++;
      }
    });
    
    // Calculate averages
    Object.keys(stats).forEach(cluster => {
      stats[cluster].avgEngagement = stats[cluster].avgEngagement / stats[cluster].count;
    });
    
    return stats;
  }
}

// Topic detection using keyword extraction
class TopicDetector {
  constructor() {
    this.commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);
  }

  // Extract keywords from content
  extractKeywords(content) {
    if (!content) return [];
    
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.commonWords.has(word));
    
    // Count word frequency
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  // Detect topics from posts
  detectTopics(posts) {
    const allKeywords = [];
    
    posts.forEach(post => {
      const keywords = this.extractKeywords(post.content);
      allKeywords.push(...keywords);
    });
    
    // Count keyword frequency across all posts
    const keywordCount = {};
    allKeywords.forEach(keyword => {
      keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
    });
    
    // Return top topics
    return Object.entries(keywordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
  }
}

// Content analysis and clustering service
class ContentAnalysisService {
  constructor() {
    this.clusterer = new ContentClusterer(5);
    this.topicDetector = new TopicDetector();
  }

  // Analyze and cluster posts
  async analyzeContent(posts) {
    if (!posts || posts.length === 0) {
      return {
        clusteredPosts: [],
        clusterStats: {},
        topics: []
      };
    }

    // Cluster posts
    const clusteredPosts = this.clusterer.clusterPosts(posts);
    
    // Get cluster statistics
    const clusterStats = this.clusterer.getClusterStats(clusteredPosts);
    
    // Detect topics
    const topics = this.topicDetector.detectTopics(posts);
    
    return {
      clusteredPosts,
      clusterStats,
      topics
    };
  }

  // Get posts by cluster
  getPostsByCluster(clusteredPosts, clusterId) {
    return clusteredPosts.filter(post => post.cluster === clusterId);
  }

  // Get trending topics
  getTrendingTopics(posts, timeWindow = 24 * 60 * 60 * 1000) {
    const recentPosts = posts.filter(post => 
      Date.now() - new Date(post.createdAt) < timeWindow
    );
    
    return this.topicDetector.detectTopics(recentPosts);
  }
}

export { ContentClusterer, TopicDetector, ContentAnalysisService }; 