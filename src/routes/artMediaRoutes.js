import express from 'express';
import {
    createArtMedia,
    getAllArtMedia,
    getArtMediaById,
    updateArtMedia,
    deleteArtMedia,
} from '../controllers/artMediaController.js';
import { upload } from '../middlewares/multerMiddleware.js';
const router = express.Router();

router.post('/create', upload.single('file'), createArtMedia);

router.get('/get', getAllArtMedia);

router.get('/get/:id', getArtMediaById);

router.put('/update/:id', updateArtMedia);

router.delete('/delete/:id', deleteArtMedia);

export default router;
