import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import {
  previewMedia,
  downloadMedia,
  deleteMedia,
  searchMedia,
  getMediaStatistics
} from '../controllers/mediaController.js';

const router = express.Router();

// Media operations
router.get('/:fileId/preview', authenticate, previewMedia);
router.get('/:fileId/download', authenticate, downloadMedia);
router.delete('/:fileId', authenticate, deleteMedia);

// Media search and statistics
router.get('/search', authenticate, searchMedia);
router.get('/statistics/:groupId', authenticate, getMediaStatistics);

export default router; 