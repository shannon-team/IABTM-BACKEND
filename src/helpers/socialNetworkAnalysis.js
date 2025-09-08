import { ApiResponse } from '../utils/ApiResponse.js';

// Graph representation for social network
class SocialGraph {
  constructor() {
    this.nodes = new Map(); // userId -> user data
    this.edges = new Map(); // userId -> Set of connected userIds
    this.posts = new Map(); // postId -> post data
    this.influenceScores = new Map(); // userId -> influence score
  }

  // Add user to graph
  addUser(userId, userData) {
    this.nodes.set(userId, userData);
    if (!this.edges.has(userId)) {
      this.edges.set(userId, new Set());
    }
  }

  // Add connection between users (friendship, interaction)
  addConnection(userId1, userId2, weight = 1) {
    if (!this.edges.has(userId1)) {
      this.edges.set(userId1, new Set());
    }
    if (!this.edges.has(userId2)) {
      this.edges.set(userId2, new Set());
    }
    
    this.edges.get(userId1).add(userId2);
    this.edges.get(userId2).add(userId1);
  }

  // Add post to graph
  addPost(postId, postData) {
    this.posts.set(postId, postData);
  }

  // Calculate PageRank for influence detection
  calculatePageRank(maxIterations = 100, dampingFactor = 0.85) {
    const scores = new Map();
    const newScores = new Map();
    
    // Initialize scores
    for (const userId of this.nodes.keys()) {
      scores.set(userId, 1.0);
    }
    
    // PageRank iterations
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      for (const userId of this.nodes.keys()) {
        let newScore = (1 - dampingFactor) / this.nodes.size;
        
        // Sum scores from incoming connections
        for (const [otherUserId, connections] of this.edges) {
          if (connections.has(userId)) {
            const outDegree = connections.size;
            if (outDegree > 0) {
              newScore += dampingFactor * (scores.get(otherUserId) / outDegree);
            }
          }
        }
        
        newScores.set(userId, newScore);
      }
      
      // Update scores
      for (const [userId, score] of newScores) {
        scores.set(userId, score);
      }
    }
    
    // Store influence scores
    for (const [userId, score] of scores) {
      this.influenceScores.set(userId, score);
    }
    
    return scores;
  }

  // Detect communities using Louvain algorithm
  detectCommunities() {
    const communities = new Map(); // userId -> communityId
    let nextCommunityId = 0;
    
    // Initialize: each user in their own community
    for (const userId of this.nodes.keys()) {
      communities.set(userId, nextCommunityId++);
    }
    
    let improved = true;
    const maxIterations = 10;
    
    for (let iteration = 0; iteration < maxIterations && improved; iteration++) {
      improved = false;
      
      for (const userId of this.nodes.keys()) {
        const currentCommunity = communities.get(userId);
        let bestCommunity = currentCommunity;
        let bestModularity = this.calculateModularity(communities);
        
        // Try moving user to each neighboring community
        const neighboringCommunities = new Set();
        for (const neighborId of this.edges.get(userId) || []) {
          neighboringCommunities.add(communities.get(neighborId));
        }
        
        for (const communityId of neighboringCommunities) {
          if (communityId === currentCommunity) continue;
          
          // Temporarily move user to this community
          communities.set(userId, communityId);
          const newModularity = this.calculateModularity(communities);
          
          if (newModularity > bestModularity) {
            bestModularity = newModularity;
            bestCommunity = communityId;
            improved = true;
          }
        }
        
        // Keep the best assignment
        communities.set(userId, bestCommunity);
      }
    }
    
    return communities;
  }

  // Calculate modularity for community detection
  calculateModularity(communities) {
    let modularity = 0;
    const totalEdges = this.getTotalEdges();
    
    for (const [userId1, connections1] of this.edges) {
      for (const userId2 of connections1) {
        if (communities.get(userId1) === communities.get(userId2)) {
          const degree1 = connections1.size;
          const degree2 = (this.edges.get(userId2) || new Set()).size;
          modularity += 1 - (degree1 * degree2) / (2 * totalEdges);
        }
      }
    }
    
    return modularity / (2 * totalEdges);
  }

  // Get total number of edges
  getTotalEdges() {
    let total = 0;
    for (const connections of this.edges.values()) {
      total += connections.size;
    }
    return total / 2; // Each edge counted twice
  }

  // Predict viral content based on network structure
  predictViralContent(posts, timeWindow = 24 * 60 * 60 * 1000) {
    const viralScores = new Map();
    const now = Date.now();
    
    for (const [postId, postData] of posts) {
      if (now - new Date(postData.createdAt) > timeWindow) continue;
      
      const authorId = postData.postedBy._id || postData.postedBy;
      const influenceScore = this.influenceScores.get(authorId) || 0;
      
      // Calculate engagement velocity
      const engagement = (postData.applauds?.length || 0) + 
                        (postData.comments?.length || 0) + 
                        (postData.likes?.count || 0);
      
      const timeSinceCreation = (now - new Date(postData.createdAt)) / (1000 * 60 * 60); // hours
      const engagementVelocity = engagement / Math.max(timeSinceCreation, 1);
      
      // Viral score formula
      const viralScore = (influenceScore * 0.4) + 
                        (engagementVelocity * 0.4) + 
                        (engagement * 0.2);
      
      viralScores.set(postId, viralScore);
    }
    
    return viralScores;
  }

  // Get influential users
  getInfluentialUsers(limit = 10) {
    const sortedUsers = Array.from(this.influenceScores.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit);
    
    return sortedUsers.map(([userId, score]) => ({
      userId,
      influenceScore: score,
      userData: this.nodes.get(userId)
    }));
  }

  // Get content recommendations from influential users
  getInfluentialContent(posts, limit = 20) {
    const influentialUsers = this.getInfluentialUsers(5);
    const influentialUserIds = new Set(influentialUsers.map(u => u.userId));
    
    const recommendations = [];
    
    for (const [postId, postData] of posts) {
      const authorId = postData.postedBy._id || postData.postedBy;
      
      if (influentialUserIds.has(authorId)) {
        const influenceScore = this.influenceScores.get(authorId) || 0;
        const engagement = (postData.applauds?.length || 0) + 
                          (postData.comments?.length || 0) + 
                          (postData.likes?.count || 0);
        
        recommendations.push({
          postId,
          postData,
          score: influenceScore * 0.7 + engagement * 0.3
        });
      }
    }
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.postData);
  }
}

// Social network analysis service
class SocialNetworkAnalyzer {
  constructor() {
    this.graph = new SocialGraph();
  }

  // Build social graph from user and post data
  async buildGraph(users, posts) {
    // Add users to graph
    users.forEach(user => {
      this.graph.addUser(user._id, user);
    });
    
    // Add connections (friendships)
    users.forEach(user => {
      if (user.friends) {
        user.friends.forEach(friendId => {
          this.graph.addConnection(user._id, friendId);
        });
      }
    });
    
    // Add posts to graph
    posts.forEach(post => {
      this.graph.addPost(post._id, post);
    });
    
    // Calculate influence scores
    this.graph.calculatePageRank();
    
    return this.graph;
  }

  // Analyze social network and return insights
  async analyzeNetwork(users, posts) {
    await this.buildGraph(users, posts);
    
    const communities = this.graph.detectCommunities();
    const viralScores = this.graph.predictViralContent(new Map(posts.map(p => [p._id, p])));
    const influentialUsers = this.graph.getInfluentialUsers();
    
    return {
      communities: Array.from(communities.entries()),
      viralScores: Array.from(viralScores.entries()),
      influentialUsers,
      graphMetrics: {
        totalUsers: this.graph.nodes.size,
        totalConnections: this.graph.getTotalEdges(),
        avgInfluenceScore: Array.from(this.graph.influenceScores.values()).reduce((a, b) => a + b, 0) / this.graph.influenceScores.size
      }
    };
  }

  // Get personalized recommendations based on social network
  getSocialRecommendations(userId, posts, limit = 20) {
    const userCommunities = this.graph.detectCommunities();
    const userCommunity = userCommunities.get(userId);
    
    // Get posts from same community
    const communityPosts = posts.filter(post => {
      const authorId = post.postedBy._id || post.postedBy;
      return userCommunities.get(authorId) === userCommunity;
    });
    
    // Get posts from influential users
    const influentialPosts = this.graph.getInfluentialContent(posts, limit);
    
    // Combine and rank recommendations
    const recommendations = [...communityPosts, ...influentialPosts];
    
    // Remove duplicates and sort by engagement
    const uniquePosts = new Map();
    recommendations.forEach(post => {
      if (!uniquePosts.has(post._id)) {
        uniquePosts.set(post._id, post);
      }
    });
    
    return Array.from(uniquePosts.values())
      .sort((a, b) => {
        const aEngagement = (a.applauds?.length || 0) + (a.comments?.length || 0) + (a.likes?.count || 0);
        const bEngagement = (b.applauds?.length || 0) + (b.comments?.length || 0) + (b.likes?.count || 0);
        return bEngagement - aEngagement;
      })
      .slice(0, limit);
  }
}

export { SocialGraph, SocialNetworkAnalyzer }; 