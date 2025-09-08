import express from 'express';
import {
    createCuratedPath,
    getUserCuratedPaths,
    getAllCuratedPaths,
    getCuratedPathById,
    updatePathProgress,
    deleteCuratedPath,
    markMediaAsViewed,
    getUserMediaProgress,
    getAllUserMediaProgress
} from '../controllers/curatedPathController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/create', authenticate, createCuratedPath);

router.get('/my-paths', authenticate, getUserCuratedPaths);

router.get('/:pathId', getCuratedPathById);

router.get('/', getAllCuratedPaths);

router.patch('/:pathId/progress', authenticate, updatePathProgress);

router.post('/mark-viewed', authenticate, markMediaAsViewed);

router.get('/media-progress/all', authenticate, getAllUserMediaProgress);

router.get('/media-progress/:mediaId', authenticate, getUserMediaProgress);

router.delete('/:pathId', authenticate, deleteCuratedPath);


export default router;