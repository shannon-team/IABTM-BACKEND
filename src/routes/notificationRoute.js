import express from 'express';
const router = express.Router();

import {newPost , likePost  , agencyUpdate, getNotificationCount, markAsRead} from '../controllers/notificationController.js';

import { authenticate } from '../middlewares/authMiddleware.js';

router.post('/posts', newPost);

router.post('/posts/:id/like', likePost);

router.post('/agency-updates', authenticate, agencyUpdate);

router.get('/count', authenticate, getNotificationCount);

router.post('/mark-read', authenticate, markAsRead);

export default router