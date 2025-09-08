import Post from '../models/postModel.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { emitFeedEvent } from '../helpers/socketConnection.js';
import uploadOnCloudinary from '../utils/cloudinary.js';
import fs from 'fs';

// Import advanced algorithms
import { feedOptimizer } from '../helpers/feedCache.js';
import { ContentAnalysisService } from '../helpers/contentClustering.js';
import { SentimentAnalyzer } from '../helpers/sentimentAnalysis.js';
import { SocialNetworkAnalyzer } from '../helpers/socialNetworkAnalysis.js';
import { TimeSeriesAnalyzer, TrendDetector } from '../helpers/timeSeriesAnalysis.js';
import { StreamProcessor, ContentQualityAnalyzer } from '../helpers/streamProcessor.js';
import { FeedAlgorithmTester, ContentRecommendationTester } from '../helpers/abTesting.js';

// Initialize algorithm instances
const contentAnalyzer = new ContentAnalysisService();
const sentimentAnalyzer = new SentimentAnalyzer();
const socialAnalyzer = new SocialNetworkAnalyzer();
const timeSeriesAnalyzer = new TimeSeriesAnalyzer();
const trendDetector = new TrendDetector();
const streamProcessor = new StreamProcessor();
const qualityAnalyzer = new ContentQualityAnalyzer();
const feedTester = new FeedAlgorithmTester();
const recommendationTester = new ContentRecommendationTester();

// Initialize time series analyzer
timeSeriesAnalyzer.initializeBuffers();

// Initialize A/B testing experiments
feedTester.initializeFeedExperiments();
recommendationTester.initializeRecommendationExperiments();

export const uploadPostImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json(new ApiResponse(400, null, "No images provided"));
        }

        const uploadedUrls = [];
        
        for (const file of req.files) {
            try {
                const result = await uploadOnCloudinary(file.path);
                if (result && result.url) {
                    uploadedUrls.push(result.url);
                } else {
                    console.error("Failed to upload image:", file.originalname);
                }
            } catch (uploadError) {
                console.error("Error uploading image:", uploadError);
                // File is already deleted by uploadOnCloudinary, so no need to delete again
                return res.status(500).json(new ApiResponse(500, null, "Error uploading images"));
            }
        }

        if (uploadedUrls.length === 0) {
            return res.status(500).json(new ApiResponse(500, null, "No images were uploaded successfully"));
        }

        return res.status(200).json(new ApiResponse(200, { urls: uploadedUrls }, "Images uploaded successfully"));
    } catch (error) {
        console.error("Error in uploadPostImages:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error uploading images"));
    }
};

export const createPost = async (req, res) => {
    try {
        const { content, pictures, hashtags } = req.body;
        const userId = req.user.id;

        console.log(userId)

        if (!content?.trim()) {
            return res.status(400).json(new ApiResponse(400, null, "Content is required."));
        }

        // Content quality analysis
        const qualityAnalysis = qualityAnalyzer.analyzeQuality(content);
        const qualityRecommendations = qualityAnalyzer.getQualityRecommendations(content);

        // Sentiment analysis
        const sentimentAnalysis = sentimentAnalyzer.analyzeSentiment(content);

        // Stream processing
        const streamResult = streamProcessor.processPost({
            _id: 'temp',
            content,
            postedBy: userId,
            pictures: pictures || [],
            hashtags: hashtags || [],
            createdAt: new Date()
        });

        const post = new Post({
            content,
            postedBy: userId,
            pictures: pictures || [],
            hashtags: hashtags || [],
            qualityScore: qualityAnalysis.metrics.qualityRatio - qualityAnalysis.metrics.spamRatio,
            sentiment: sentimentAnalysis.sentiment,
            sentimentScore: sentimentAnalysis.score
        })

        await post.save();

        // Populate the postedBy field for the response
        await post.populate('postedBy', '_id name profileName profilePicture role');

        // Add to time series analysis
        timeSeriesAnalyzer.addEngagementData(post, post.createdAt);
        trendDetector.addPost(post);

        // Cache the post
        feedOptimizer.cachePost(post._id, post);

        // Emit real-time event for new post
        emitFeedEvent('feed:new_post', post);

        return res.status(201).json(new ApiResponse(201, {
            post,
            analysis: {
                quality: qualityAnalysis,
                recommendations: qualityRecommendations,
                sentiment: sentimentAnalysis,
                streamProcessing: streamResult
            }
        }, "Post created successfully"));
    } catch (error) {
        console.error("Error creating post:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error creating post"));
    }
};

export const getPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('postedBy', '_id name profileName profilePicture role')
            .populate('likes.likedBy', '_id name profilePicture')
            .populate({
                path: 'comments',
                select: 'commentor content post_type post createdAt',
                populate: {
                    path: 'commentor',
                    select: '_id name profilePicture profileName'
                }
            });
        return res.status(200).json(new ApiResponse(200, posts, "Posts fetched successfully"));
    } catch (error) {
        console.error("Error fetching posts:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error fetching posts"));
    }
};

export const getPostsByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        console.log(userId);

        const posts = await Post.find({ postedBy: userId }).populate('postedBy', 'name email');

        if (!posts || posts.length === 0) {
            return res.status(404).json(new ApiResponse(404, null, "No posts found for this user"));
        }

        return res.status(200).json(new ApiResponse(200, { posts }, "Posts retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving posts by user:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error retrieving posts"));
    }
};

export const getPostById = async (req, res) => {
    try {
        const { postId } = req.params;
        console.log(postId)
        const post = await Post.findById(postId).populate('postedBy', 'name profileName role profilePicture').populate({
            path: 'comments',
            select: 'commentor content post_type post createdAt',
            populate: {
                path: 'commentor',
                select: '_id name profilePicture profileName'
            }
        });;

        if (!post) {
            return res.status(404).json(new ApiResponse(404, null, "Post not found"));
        }

        return res.status(200).json(new ApiResponse(200, post, "Post fetched successfully"));
    } catch (error) {
        console.error("Error fetching post:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error fetching post"));
    }
};

export const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, pictures } = req.body;
        const userId = req.user.id;

        console.log('Update post request - Post ID:', id, 'User ID:', userId);
        console.log('Update data:', { content, pictures });

        // First, find the post to check ownership
        const post = await Post.findById(id);

        if (!post) {
            console.log('Post not found with ID:', id);
            return res.status(404).json(new ApiResponse(404, null, "Post not found"));
        }

        // Check if the current user is the author of the post
        if (post.postedBy.toString() !== userId) {
            console.log('Unauthorized update attempt - User:', userId, 'Post author:', post.postedBy);
            return res.status(403).json(new ApiResponse(403, null, "You can only edit your own posts"));
        }

        // Update the post
        const updatedPost = await Post.findByIdAndUpdate(
            id,
            { content, pictures },
            { new: true, runValidators: true }
        ).populate('postedBy', '_id name profileName profilePicture role');

        console.log('Post updated successfully:', updatedPost._id);
        return res.status(200).json(new ApiResponse(200, updatedPost, "Post updated successfully"));
    } catch (error) {
        console.error("Error updating post:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error updating post"));
    }
};

export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        console.log('Delete post request - Post ID:', id, 'User ID:', userId);

        // First, find the post to check ownership
        const post = await Post.findById(id);

        if (!post) {
            console.log('Post not found with ID:', id);
            return res.status(404).json(new ApiResponse(404, null, "Post not found"));
        }

        // Check if the current user is the author of the post
        if (post.postedBy.toString() !== userId) {
            console.log('Unauthorized delete attempt - User:', userId, 'Post author:', post.postedBy);
            return res.status(403).json(new ApiResponse(403, null, "You can only delete your own posts"));
        }

        // Delete the post
        const deletedPost = await Post.findByIdAndDelete(id);

        console.log('Post deleted successfully:', deletedPost._id);
        return res.status(200).json(new ApiResponse(200, deletedPost, "Post deleted successfully"));
    } catch (error) {
        console.error("Error deleting post:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error deleting post"));
    }
};

export const toggleLikePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        console.log('Toggle like request - Post ID:', id, 'User ID:', userId);

        // First, check if the user has already applauded
        const post = await Post.findById(id);
        
        if (!post) {
            console.log('Post not found with ID:', id);
            return res.status(404).json(new ApiResponse(404, null, "Post not found"));
        }

        // Check if user has already applauded
        const hasApplauded = (post.applauds && post.applauds.some(user => String(user) === String(userId))) ||
                            (post.likes && post.likes.likedBy && post.likes.likedBy.some(user => String(user) === String(userId)));

        console.log('Current applaud status:', { hasApplauded, userId });

        let action;
        let updatedPost;

        if (hasApplauded) {
            // Remove applaud - use atomic operations
            action = 'unapplaud';
            updatedPost = await Post.findByIdAndUpdate(
                id,
                {
                    $pull: { 
                        applauds: userId,
                        'likes.likedBy': userId 
                    },
                    $inc: { 'likes.count': -1 }
                },
                { new: true }
            );
        } else {
            // Add applaud - use atomic operations
            action = 'applaud';
            updatedPost = await Post.findByIdAndUpdate(
                id,
                {
                    $addToSet: { 
                        applauds: userId,
                        'likes.likedBy': userId 
                    },
                    $inc: { 'likes.count': 1 }
                },
                { new: true }
            );
        }

        if (!updatedPost) {
            return res.status(404).json(new ApiResponse(404, null, "Post not found"));
        }

        console.log('Updated post:', {
            postId: updatedPost._id,
            applaudsCount: updatedPost.applauds?.length || 0,
            likesCount: updatedPost.likes?.count || 0,
            action: action
        });

        // Emit real-time event for applaud/unapplaud
        emitFeedEvent('feed:applaud', { postId: id, userId, action });

        return res.status(200).json(new ApiResponse(200, updatedPost, `Post ${action}ed successfully`));
    } catch (error) {
        console.error("Error toggling like on post:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error toggling like on post"));
    }
};


export const getPostLikesData = async (req, res) => {
    try {
        const { id } = req.params;

        const post = await Post.findById(id)
            .populate('likes.likedBy', 'name email')
            .populate('applauds', 'name email');

        if (!post) {
            return res.status(404).json(new ApiResponse(404, null, "Post not found"));
        }
        
        // Combine counts from both fields
        const likesCount = (post.likes?.count || 0) + (post.applauds?.length || 0);
        
        // Combine users from both fields
        const likesUsers = post.likes?.likedBy || [];
        const applaudsUsers = post.applauds || [];
        const allUsers = [...likesUsers, ...applaudsUsers];

        return res.status(200).json(new ApiResponse(200, { likesCount, users: allUsers }, "Users who liked the post retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving users who liked the post:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error retrieving users who liked the post"));
    }
};

export const hasUserLikedPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json(new ApiResponse(404, null, "Post not found"));
        }

        // Check both likes and applauds fields for compatibility
        const isLikedByUser = (post.likes?.likedBy?.some(user => String(user) === String(userId)) || false) ||
                             (post.applauds?.some(user => String(user) === String(userId)) || false);

        return res.status(200).json(new ApiResponse(200, { isLikedByUser }, "Like status fetched successfully"));
    } catch (error) {
        console.error("Error checking like status:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error checking like status"));
    }
};

// Feed ranking algorithm with multiple factors
const calculatePostScore = (post, user) => {
  const now = new Date();
  const postAge = (now - new Date(post.createdAt)) / (1000 * 60 * 60); // hours
  
  // Base score from engagement
  let score = 0;
  
  // Engagement factors
  const applaudCount = post.applauds?.length || 0;
  const commentCount = post.comments?.length || 0;
  const likeCount = post.likes?.count || 0;
  
  // Weighted engagement score
  score += applaudCount * 3; // Applauds worth more
  score += commentCount * 2; // Comments worth medium
  score += likeCount * 1; // Likes worth least
  
  // Time decay factor (posts lose relevance over time)
  const timeDecay = Math.exp(-postAge / 24); // 24-hour half-life
  score *= timeDecay;
  
  // User relationship bonus
  if (post.postedBy._id.toString() === user.id) {
    score *= 1.5; // User's own posts get boost
  }
  
  // Friend bonus
  if (user.friends?.includes(post.postedBy._id)) {
    score *= 1.3; // Friend posts get boost
  }
  
  // Interest matching bonus
  const userInterests = user.interests || [];
  const postHashtags = post.hashtags || [];
  const interestMatches = userInterests.filter(interest => 
    postHashtags.some(hashtag => 
      hashtag.toLowerCase().includes(interest.toLowerCase())
    )
  ).length;
  
  score += interestMatches * 2; // Each interest match adds points
  
  // Content quality bonus (posts with images get slight boost)
  if (post.pictures && post.pictures.length > 0) {
    score *= 1.1;
  }
  
  return score;
};

export const getPersonalizedFeed = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await (await import('../models/userModel.js')).default.findById(userId);
        if (!user) {
            return res.status(404).json(new ApiResponse(404, null, "User not found"));
        }

        const friends = user.friends || [];
        const interests = user.interests || [];
        
        // Simple query without advanced algorithms for debugging
        const posts = await Post.find({
            $or: [
                { postedBy: { $in: friends } },
                { hashtags: { $in: interests } },
                { postedBy: userId }
            ]
        })
        .sort({ createdAt: -1 })
        .populate('postedBy', '_id name profileName profilePicture role')
        .populate({
            path: 'comments',
            select: 'commentor content post_type post createdAt',
            populate: {
                path: 'commentor',
                select: '_id name profilePicture profileName'
            }
        });
        
        console.log('Found posts:', posts.length);
        
        // Return simple array for debugging
        return res.status(200).json(new ApiResponse(200, posts, "Personalized feed fetched successfully"));
    } catch (error) {
        console.error("Error fetching personalized feed:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error fetching personalized feed"));
    }
};

export const getAdvancedFeed = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await (await import('../models/userModel.js')).default.findById(userId);
        
        if (!user) {
            return res.status(404).json(new ApiResponse(404, null, "User not found"));
        }

        // Get all posts for advanced analysis
        const allPosts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('postedBy', '_id name profileName profilePicture role')
            .populate({
                path: 'comments',
                select: 'commentor content post_type post createdAt',
                populate: {
                    path: 'commentor',
                    select: '_id name profilePicture profileName'
                }
            });

        // Get all users for social network analysis
        const allUsers = await (await import('../models/userModel.js')).default.find();

        // Perform comprehensive analysis
        const socialAnalysis = await socialAnalyzer.analyzeNetwork(allUsers, allPosts);
        const contentAnalysis = await contentAnalyzer.analyzeContent(allPosts);
        const timingRecommendations = timeSeriesAnalyzer.getTimingRecommendations();
        const trendingTopics = trendDetector.getTrendingTopics();
        const viralIndicators = trendDetector.getViralIndicators();
        const streamStats = streamProcessor.getStats();

        // Get A/B testing performance
        const algorithmPerformance = feedTester.getAlgorithmPerformance();
        const recommendationPerformance = recommendationTester.getRecommendationPerformance();

        return res.status(200).json(new ApiResponse(200, {
            socialNetwork: {
                communities: socialAnalysis.communities,
                influentialUsers: socialAnalysis.influentialUsers,
                viralScores: socialAnalysis.viralScores,
                metrics: socialAnalysis.graphMetrics
            },
            contentAnalysis: {
                clusters: contentAnalysis.clusterStats,
                topics: contentAnalysis.topics,
                qualityDistribution: allPosts.map(post => ({
                    postId: post._id,
                    qualityScore: post.qualityScore || 0,
                    sentiment: post.sentiment || 'neutral'
                }))
            },
            timing: timingRecommendations,
            trends: {
                topics: trendingTopics,
                viralContent: viralIndicators
            },
            streamProcessing: streamStats,
            abTesting: {
                algorithms: algorithmPerformance,
                recommendations: recommendationPerformance
            }
        }, "Advanced feed analysis completed successfully"));
    } catch (error) {
        console.error("Error fetching advanced feed:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error fetching advanced feed"));
    }
};

export const getMyPosts = async (req, res) => {
    try {
        const userId = req.user.id;
        const posts = await Post.find({ postedBy: userId })
            .sort({ createdAt: -1 })
            .populate('postedBy', '_id name profileName profilePicture role');
        return res.status(200).json(new ApiResponse(200, posts, "User post history fetched successfully"));
    } catch (error) {
        console.error("Error fetching user post history:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error fetching user post history"));
    }
};

// Collaborative filtering algorithm for content recommendations
const calculateUserSimilarity = (user1, user2) => {
  // Jaccard similarity for interests
  const interests1 = new Set(user1.interests || []);
  const interests2 = new Set(user2.interests || []);
  
  const intersection = new Set([...interests1].filter(x => interests2.has(x)));
  const union = new Set([...interests1, ...interests2]);
  
  const interestSimilarity = intersection.size / union.size;
  
  // Friend overlap similarity
  const friends1 = new Set(user1.friends?.map(f => f.toString()) || []);
  const friends2 = new Set(user2.friends?.map(f => f.toString()) || []);
  
  const friendIntersection = new Set([...friends1].filter(x => friends2.has(x)));
  const friendUnion = new Set([...friends1, ...friends2]);
  
  const friendSimilarity = friendUnion.size > 0 ? friendIntersection.size / friendUnion.size : 0;
  
  // Weighted combination
  return (interestSimilarity * 0.7) + (friendSimilarity * 0.3);
};

// Content recommendation based on similar users
const getRecommendedPosts = async (userId, limit = 10) => {
  const user = await (await import('../models/userModel.js')).default.findById(userId);
  if (!user) return [];
  
  // Find users with similar interests
  const similarUsers = await (await import('../models/userModel.js')).default.find({
    _id: { $ne: userId },
    interests: { $in: user.interests || [] }
  }).limit(20);
  
  // Calculate similarity scores
  const userSimilarities = await Promise.all(
    similarUsers.map(async (similarUser) => {
      const similarity = calculateUserSimilarity(user, similarUser);
      return { user: similarUser, similarity };
    })
  );
  
  // Sort by similarity and get top similar users
  userSimilarities.sort((a, b) => b.similarity - a.similarity);
  const topSimilarUsers = userSimilarities.slice(0, 5).map(u => u.user._id);
  
  // Get posts from similar users that current user hasn't seen
  const userPosts = await Post.find({ postedBy: userId }).select('_id');
  const userPostIds = userPosts.map(p => p._id.toString());
  
  const recommendedPosts = await Post.find({
    postedBy: { $in: topSimilarUsers },
    _id: { $nin: userPostIds }
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('postedBy', '_id name profileName profilePicture role')
  .populate({
    path: 'comments',
    select: 'commentor content post_type post createdAt',
    populate: {
      path: 'commentor',
      select: '_id name profilePicture profileName'
    }
  });
  
  return recommendedPosts;
};

export const getRecommendedFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const recommendedPosts = await getRecommendedPosts(userId, 20);
    
    return res.status(200).json(new ApiResponse(200, recommendedPosts, "Recommended posts fetched successfully"));
  } catch (error) {
    console.error("Error fetching recommended feed:", error);
    return res.status(500).json(new ApiResponse(500, error, "Error fetching recommended feed"));
  }
};

export const getTestPosts = async (req, res) => {
    try {
        console.log('Test endpoint called');
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('postedBy', '_id name profileName profilePicture role');
        
        console.log('Test posts found:', posts.length);
        return res.status(200).json(new ApiResponse(200, posts, "Test posts fetched successfully"));
    } catch (error) {
        console.error("Error fetching test posts:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error fetching test posts"));
    }
};

export const getIABTM3605Feed = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await (await import('../models/userModel.js')).default.findById(userId);
        
        if (!user) {
            return res.status(404).json(new ApiResponse(404, null, "User not found"));
        }

        const friends = user.friends || [];
        const interests = user.interests || [];
        
        console.log('User ID:', userId);
        console.log('Friends count:', friends.length);
        console.log('Interests:', interests);

        // 1. Get all user's own posts (mandatory)
        const userPosts = await Post.find({ postedBy: userId })
            .sort({ createdAt: -1 })
            .populate('postedBy', '_id name profileName profilePicture role')
            .populate({
                path: 'comments',
                select: 'commentor content post_type post createdAt',
                populate: {
                    path: 'commentor',
                    select: '_id name profilePicture profileName'
                }
            });

        // 2. Get all friends' posts (mandatory)
        const friendsPosts = friends.length > 0 ? await Post.find({ 
            postedBy: { $in: friends } 
        })
        .sort({ createdAt: -1 })
        .populate('postedBy', '_id name profileName profilePicture role')
        .populate({
            path: 'comments',
            select: 'commentor content post_type post createdAt',
            populate: {
                path: 'commentor',
                select: '_id name profilePicture profileName'
            }
        }) : [];

        // 3. Get posts from all users if topic is related to user's interests
        const relatedPosts = interests.length > 0 ? await Post.find({
            $and: [
                { postedBy: { $ne: userId } }, // Not user's own posts
                { postedBy: { $nin: friends } }, // Not friends' posts (already fetched)
                {
                    $or: [
                        { hashtags: { $in: interests } },
                        { content: { $regex: interests.join('|'), $options: 'i' } }
                    ]
                }
            ]
        })
        .sort({ createdAt: -1 })
        .populate('postedBy', '_id name profileName profilePicture role')
        .populate({
            path: 'comments',
            select: 'commentor content post_type post createdAt',
            populate: {
                path: 'commentor',
                select: '_id name profilePicture profileName'
            }
        }) : [];

        // 4. Get some general posts to ensure feed is not empty
        const generalPosts = await Post.find({
            $and: [
                { postedBy: { $ne: userId } },
                { postedBy: { $nin: friends } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('postedBy', '_id name profileName profilePicture role')
        .populate({
            path: 'comments',
            select: 'commentor content post_type post createdAt',
            populate: {
                path: 'commentor',
                select: '_id name profilePicture profileName'
            }
        });

        // Combine all posts with priority ordering
        const allPosts = [
            ...userPosts,           // User's own posts first
            ...friendsPosts,        // Friends' posts second
            ...relatedPosts,        // Related posts third
            ...generalPosts         // General posts last
        ];

        // Remove duplicates based on post ID
        const uniquePosts = allPosts.filter((post, index, self) => 
            index === self.findIndex(p => p._id.toString() === post._id.toString())
        );

        // Sort by creation date (newest first)
        uniquePosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log('Feed breakdown:');
        console.log('- User posts:', userPosts.length);
        console.log('- Friends posts:', friendsPosts.length);
        console.log('- Related posts:', relatedPosts.length);
        console.log('- General posts:', generalPosts.length);
        console.log('- Total unique posts:', uniquePosts.length);

        return res.status(200).json(new ApiResponse(200, uniquePosts, "IABTM 3605 feed fetched successfully"));
    } catch (error) {
        console.error("Error fetching IABTM 3605 feed:", error);
        return res.status(500).json(new ApiResponse(500, error, "Error fetching IABTM 3605 feed"));
    }
};

// Get public/featured posts (no authentication required) - simplified version
export const getPublicPosts = async (req, res) => {
  try {
    // Simply get all posts with author info
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate('postedBy', '_id name profileName profilePicture role')
      .populate({
        path: 'comments',
        select: 'commentor content post_type post createdAt',
        populate: {
          path: 'commentor',
          select: '_id name profilePicture profileName'
        }
      });
    
    return res.status(200).json(new ApiResponse(200, posts, "Public posts retrieved successfully"));
  } catch (error) {
    console.error('Error fetching public posts:', error);
    return res.status(500).json(new ApiResponse(500, error, "Error fetching posts"));
  }
};

