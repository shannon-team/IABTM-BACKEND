import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';

import {
    createPlaylist,
    getPlaylists,
    getPlaylistById,
    updatePlaylist,
    deletePlaylist,
    deleteTrackFromPlaylist
} from '../controllers/playlistController.js';

const router = express.Router();

// router.use(authenticate);

router.post('/',authenticate, createPlaylist);
router.get('/', authenticate ,getPlaylists);
router.get('/:id',authenticate, getPlaylistById);
router.put('/:id',authenticate, updatePlaylist);
router.delete('/:id', authenticate, deletePlaylist);
router.delete('/track/:id', authenticate, deleteTrackFromPlaylist);

export default router;
