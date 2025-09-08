import { ApiResponse } from '../utils/ApiResponse.js';

// Multi-armed Bandit for A/B testing
class MultiArmedBandit {
  constructor(arms, epsilon = 0.1) {
    this.arms = arms; // Array of arm configurations
    this.epsilon = epsilon; // Exploration rate
    this.rewards = new Array(arms.length).fill(0);
    this.pulls = new Array(arms.length).fill(0);
    this.totalPulls = 0;
  }

  // Select arm using epsilon-greedy strategy
  selectArm() {
    if (Math.random() < this.epsilon) {
      // Exploration: select random arm
      return Math.floor(Math.random() * this.arms.length);
    } else {
      // Exploitation: select best arm
      return this.getBestArm();
    }
  }

  // Get the arm with highest average reward
  getBestArm() {
    let bestArm = 0;
    let bestReward = -Infinity;

    for (let i = 0; i < this.arms.length; i++) {
      if (this.pulls[i] === 0) {
        return i; // Return unexplored arm
      }

      const avgReward = this.rewards[i] / this.pulls[i];
      if (avgReward > bestReward) {
        bestReward = avgReward;
        bestArm = i;
      }
    }

    return bestArm;
  }

  // Update rewards after pulling an arm
  updateReward(arm, reward) {
    this.rewards[arm] += reward;
    this.pulls[arm]++;
    this.totalPulls++;
  }

  // Get statistics for all arms
  getStats() {
    const stats = [];
    for (let i = 0; i < this.arms.length; i++) {
      const avgReward = this.pulls[i] > 0 ? this.rewards[i] / this.pulls[i] : 0;
      stats.push({
        arm: i,
        configuration: this.arms[i],
        pulls: this.pulls[i],
        totalReward: this.rewards[i],
        averageReward: avgReward,
        pullRate: this.totalPulls > 0 ? this.pulls[i] / this.totalPulls : 0
      });
    }
    return stats;
  }

  // Get confidence intervals
  getConfidenceIntervals() {
    const intervals = [];
    for (let i = 0; i < this.arms.length; i++) {
      if (this.pulls[i] > 0) {
        const avgReward = this.rewards[i] / this.pulls[i];
        const stdError = Math.sqrt(this.rewards[i] / this.pulls[i] - avgReward ** 2) / Math.sqrt(this.pulls[i]);
        const confidenceInterval = 1.96 * stdError; // 95% confidence

        intervals.push({
          arm: i,
          averageReward: avgReward,
          lowerBound: avgReward - confidenceInterval,
          upperBound: avgReward + confidenceInterval,
          confidence: confidenceInterval
        });
      }
    }
    return intervals;
  }
}

// Thompson Sampling for more sophisticated A/B testing
class ThompsonSampling {
  constructor(arms) {
    this.arms = arms;
    this.successes = new Array(arms.length).fill(0);
    this.failures = new Array(arms.length).fill(0);
  }

  // Select arm using Thompson Sampling
  selectArm() {
    const samples = [];
    
    for (let i = 0; i < this.arms.length; i++) {
      // Sample from Beta distribution
      const alpha = this.successes[i] + 1;
      const beta = this.failures[i] + 1;
      const sample = this.sampleBeta(alpha, beta);
      samples.push(sample);
    }

    // Return arm with highest sample
    return samples.indexOf(Math.max(...samples));
  }

  // Sample from Beta distribution (approximation)
  sampleBeta(alpha, beta) {
    // Using Box-Muller transform approximation
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    // Transform to Beta distribution
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const stdDev = Math.sqrt(variance);
    
    return Math.max(0, Math.min(1, mean + z0 * stdDev));
  }

  // Update after observing reward
  updateReward(arm, reward) {
    if (reward > 0.5) { // Threshold for success
      this.successes[arm]++;
    } else {
      this.failures[arm]++;
    }
  }

  // Get arm statistics
  getStats() {
    const stats = [];
    for (let i = 0; i < this.arms.length; i++) {
      const totalTrials = this.successes[i] + this.failures[i];
      const successRate = totalTrials > 0 ? this.successes[i] / totalTrials : 0;
      
      stats.push({
        arm: i,
        configuration: this.arms[i],
        successes: this.successes[i],
        failures: this.failures[i],
        totalTrials,
        successRate
      });
    }
    return stats;
  }
}

// A/B Testing Framework
class ABTestingFramework {
  constructor() {
    this.experiments = new Map();
    this.bandits = new Map();
    this.results = new Map();
  }

  // Create new A/B test experiment
  createExperiment(experimentId, configurations, type = 'epsilon-greedy') {
    let bandit;
    
    if (type === 'thompson') {
      bandit = new ThompsonSampling(configurations);
    } else {
      bandit = new MultiArmedBandit(configurations);
    }

    this.experiments.set(experimentId, {
      id: experimentId,
      configurations,
      type,
      createdAt: Date.now(),
      status: 'active'
    });

    this.bandits.set(experimentId, bandit);
    this.results.set(experimentId, []);

    return experimentId;
  }

  // Get configuration for user
  getConfiguration(experimentId, userId) {
    const experiment = this.experiments.get(experimentId);
    const bandit = this.bandits.get(experimentId);

    if (!experiment || !bandit || experiment.status !== 'active') {
      return null;
    }

    const armIndex = bandit.selectArm();
    const configuration = experiment.configurations[armIndex];

    // Log assignment
    this.logAssignment(experimentId, userId, armIndex, configuration);

    return {
      experimentId,
      armIndex,
      configuration,
      userId
    };
  }

  // Log user assignment
  logAssignment(experimentId, userId, armIndex, configuration) {
    const assignment = {
      experimentId,
      userId,
      armIndex,
      configuration,
      timestamp: Date.now()
    };

    if (!this.results.has(experimentId)) {
      this.results.set(experimentId, []);
    }

    this.results.get(experimentId).push(assignment);
  }

  // Record reward for user
  recordReward(experimentId, userId, reward) {
    const bandit = this.bandits.get(experimentId);
    const results = this.results.get(experimentId);

    if (!bandit || !results) return;

    // Find user's assignment
    const assignment = results.find(r => r.userId === userId && r.experimentId === experimentId);
    if (!assignment) return;

    // Update bandit with reward
    bandit.updateReward(assignment.armIndex, reward);

    // Log reward
    assignment.reward = reward;
    assignment.rewardTimestamp = Date.now();
  }

  // Get experiment statistics
  getExperimentStats(experimentId) {
    const experiment = this.experiments.get(experimentId);
    const bandit = this.bandits.get(experimentId);
    const results = this.results.get(experimentId);

    if (!experiment || !bandit || !results) {
      return null;
    }

    const banditStats = bandit.getStats();
    const confidenceIntervals = bandit.getConfidenceIntervals ? bandit.getConfidenceIntervals() : [];

    return {
      experiment: experiment,
      banditStats,
      confidenceIntervals,
      totalAssignments: results.length,
      uniqueUsers: new Set(results.map(r => r.userId)).size,
      averageReward: results.reduce((sum, r) => sum + (r.reward || 0), 0) / results.length
    };
  }

  // Stop experiment
  stopExperiment(experimentId) {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.status = 'stopped';
      experiment.stoppedAt = Date.now();
    }
  }

  // Get best configuration from experiment
  getBestConfiguration(experimentId) {
    const bandit = this.bandits.get(experimentId);
    if (!bandit) return null;

    const stats = bandit.getStats();
    const bestArm = stats.reduce((best, stat) => 
      stat.averageReward > best.averageReward ? stat : best
    );

    return {
      armIndex: bestArm.arm,
      configuration: bestArm.configuration,
      averageReward: bestArm.averageReward,
      pulls: bestArm.pulls
    };
  }
}

// Feed Algorithm A/B Testing
class FeedAlgorithmTester {
  constructor() {
    this.framework = new ABTestingFramework();
    this.algorithms = {
      'ranking_v1': {
        name: 'Basic Ranking',
        description: 'Simple engagement-based ranking',
        config: { type: 'engagement', weights: { applauds: 3, comments: 2, likes: 1 } }
      },
      'ranking_v2': {
        name: 'Time-Aware Ranking',
        description: 'Ranking with time decay',
        config: { type: 'time_decay', halfLife: 24, weights: { applauds: 3, comments: 2, likes: 1 } }
      },
      'ranking_v3': {
        name: 'Social Ranking',
        description: 'Ranking with social network influence',
        config: { type: 'social', influenceWeight: 0.3, engagementWeight: 0.7 }
      },
      'ranking_v4': {
        name: 'Personalized Ranking',
        description: 'User preference-based ranking',
        config: { type: 'personalized', userInterests: true, friendPosts: true }
      }
    };
  }

  // Initialize feed algorithm experiments
  initializeFeedExperiments() {
    const experimentId = 'feed_ranking_v1';
    const configurations = Object.values(this.algorithms).map(alg => alg.config);
    
    return this.framework.createExperiment(experimentId, configurations, 'thompson');
  }

  // Get feed algorithm for user
  getFeedAlgorithm(userId) {
    const experimentId = 'feed_ranking_v1';
    const assignment = this.framework.getConfiguration(experimentId, userId);
    
    if (!assignment) {
      // Fallback to default algorithm
      return this.algorithms['ranking_v1'].config;
    }

    return assignment.configuration;
  }

  // Record feed engagement as reward
  recordFeedEngagement(userId, posts, engagementMetrics) {
    const experimentId = 'feed_ranking_v1';
    
    // Calculate reward based on engagement
    const totalEngagement = engagementMetrics.applauds + engagementMetrics.comments + engagementMetrics.likes;
    const reward = Math.min(totalEngagement / posts.length, 10) / 10; // Normalize to 0-1

    this.framework.recordReward(experimentId, userId, reward);
  }

  // Get algorithm performance comparison
  getAlgorithmPerformance() {
    const experimentId = 'feed_ranking_v1';
    const stats = this.framework.getExperimentStats(experimentId);
    
    if (!stats) return null;

    const algorithmNames = Object.keys(this.algorithms);
    const performance = stats.banditStats.map((stat, index) => ({
      algorithm: algorithmNames[index],
      name: this.algorithms[algorithmNames[index]].name,
      description: this.algorithms[algorithmNames[index]].description,
      averageReward: stat.averageReward,
      pulls: stat.pulls,
      pullRate: stat.pullRate
    }));

    return {
      experiment: stats.experiment,
      algorithms: performance,
      totalUsers: stats.uniqueUsers,
      averageReward: stats.averageReward
    };
  }

  // Get recommended algorithm
  getRecommendedAlgorithm() {
    const experimentId = 'feed_ranking_v1';
    const bestConfig = this.framework.getBestConfiguration(experimentId);
    
    if (!bestConfig) return this.algorithms['ranking_v1'].config;

    const algorithmNames = Object.keys(this.algorithms);
    const bestAlgorithm = algorithmNames[bestConfig.armIndex];

    return {
      algorithm: bestAlgorithm,
      name: this.algorithms[bestAlgorithm].name,
      configuration: bestConfig.configuration,
      performance: {
        averageReward: bestConfig.averageReward,
        pulls: bestConfig.pulls
      }
    };
  }
}

// Content Recommendation A/B Testing
class ContentRecommendationTester {
  constructor() {
    this.framework = new ABTestingFramework();
    this.recommendationStrategies = {
      'collaborative': {
        name: 'Collaborative Filtering',
        description: 'Recommend based on similar users',
        config: { type: 'collaborative', similarityThreshold: 0.5 }
      },
      'content_based': {
        name: 'Content-Based Filtering',
        description: 'Recommend based on content similarity',
        config: { type: 'content_based', tfidf: true, cosineSimilarity: true }
      },
      'hybrid': {
        name: 'Hybrid Approach',
        description: 'Combine collaborative and content-based',
        config: { type: 'hybrid', collaborativeWeight: 0.6, contentWeight: 0.4 }
      },
      'social_influence': {
        name: 'Social Influence',
        description: 'Recommend from influential users',
        config: { type: 'social_influence', influenceThreshold: 0.7 }
      }
    };
  }

  // Initialize recommendation experiments
  initializeRecommendationExperiments() {
    const experimentId = 'content_recommendation_v1';
    const configurations = Object.values(this.recommendationStrategies).map(strat => strat.config);
    
    return this.framework.createExperiment(experimentId, configurations, 'thompson');
  }

  // Get recommendation strategy for user
  getRecommendationStrategy(userId) {
    const experimentId = 'content_recommendation_v1';
    const assignment = this.framework.getConfiguration(experimentId, userId);
    
    if (!assignment) {
      return this.recommendationStrategies['collaborative'].config;
    }

    return assignment.configuration;
  }

  // Record recommendation engagement
  recordRecommendationEngagement(userId, recommendedPosts, userEngagement) {
    const experimentId = 'content_recommendation_v1';
    
    // Calculate reward based on user engagement with recommended content
    const totalEngagement = userEngagement.applauds + userEngagement.comments + userEngagement.likes;
    const reward = Math.min(totalEngagement / recommendedPosts.length, 5) / 5; // Normalize to 0-1

    this.framework.recordReward(experimentId, userId, reward);
  }

  // Get recommendation performance
  getRecommendationPerformance() {
    const experimentId = 'content_recommendation_v1';
    const stats = this.framework.getExperimentStats(experimentId);
    
    if (!stats) return null;

    const strategyNames = Object.keys(this.recommendationStrategies);
    const performance = stats.banditStats.map((stat, index) => ({
      strategy: strategyNames[index],
      name: this.recommendationStrategies[strategyNames[index]].name,
      description: this.recommendationStrategies[strategyNames[index]].description,
      averageReward: stat.averageReward,
      pulls: stat.pulls,
      pullRate: stat.pullRate
    }));

    return {
      experiment: stats.experiment,
      strategies: performance,
      totalUsers: stats.uniqueUsers,
      averageReward: stats.averageReward
    };
  }
}

export { 
  MultiArmedBandit, 
  ThompsonSampling, 
  ABTestingFramework, 
  FeedAlgorithmTester, 
  ContentRecommendationTester 
}; 