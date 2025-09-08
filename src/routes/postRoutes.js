import express from 'express';

import { createPost, getPosts, getPostById, getPostsByUser, updatePost, deletePost, toggleLikePost, getPostLikesData, hasUserLikedPost, getPersonalizedFeed, getMyPosts, uploadPostImages, getRecommendedFeed, getAdvancedFeed, getTestPosts, getIABTM3605Feed, getPublicPosts } from '../controllers/postController.js';

import { authenticate } from '../middlewares/authMiddleware.js';
import { uploadMiddleware } from '../middlewares/multerMiddleware.js';

const router = express.Router();

router.post('/create', authenticate , createPost);
router.get('/get', getPosts);
router.get('/public', getPublicPosts); // Public posts - no authentication required
router.get('/test', getTestPosts);
router.get('/history', authenticate, getMyPosts);
router.get('/feed/personalized', authenticate, getPersonalizedFeed);
router.get('/feed/recommended', authenticate, getRecommendedFeed);
router.get('/feed/advanced', authenticate, getAdvancedFeed);
router.get('/feed/iabtm3605', authenticate, getIABTM3605Feed);
router.get('/feed/iabtm3605/public', getPublicPosts); // Public version of 3605 feed
router.get('/:id', getPostById);
router.get('/user/:userId', getPostsByUser);
router.put('/:id', authenticate, updatePost);
router.delete('/:id', authenticate, deletePost);
router.post('/:id/like', authenticate, toggleLikePost);
router.get('/:id/likesData', getPostLikesData);
router.get('/:id/likes/check', authenticate, hasUserLikedPost);
router.post('/upload', authenticate, uploadMiddleware, uploadPostImages);

export default router;
