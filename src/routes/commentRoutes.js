import express from 'express';
const router = express.Router();

import {createComment , getCommentsByPost ,  updateComment , deleteComment} from '../controllers/commentController.js';

import { authenticate } from '../middlewares/authMiddleware.js';

router.post('/:postId/create', authenticate , createComment);

router.get('/:postId/showAll', getCommentsByPost);

router.post('/:commentId/edit', authenticate , updateComment);

router.delete('/:commentId/delete', authenticate ,  deleteComment);

export default router