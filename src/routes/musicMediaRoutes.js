// musicMediaRoutes.js
import express from 'express';
import { upload } from '../middlewares/multerMiddleware.js';
import {
    createMusicMedia,
    getAllMusicMedia,
    getMusicMediaById,
    updateMusicMedia,
    deleteMusicMedia,
} from '../controllers/musicMediaController.js';

const router = express.Router();

router.post('/create', upload.fields([{ name: 'trackFile' }, { name: 'coverImage' }]), createMusicMedia);

router.get('/get', getAllMusicMedia);

router.get('/get/:id', getMusicMediaById);

router.put('/update/:id', upload.fields([{ name: 'trackFile' }, { name: 'coverImage' }]), updateMusicMedia);

router.delete('/delete/:id', deleteMusicMedia); 

export default router;
