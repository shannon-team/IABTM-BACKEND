import express from 'express';
import {
  createFilmMedia,
  getAllFilmMedia,
  getFilmMediaById,
  updateFilmMedia,
  deleteFilmMedia
} from '../controllers/filmMediaController.js';

const router = express.Router();

router.post('/create', createFilmMedia);

router.get('/get', getAllFilmMedia);

router.get('/get/:id', getFilmMediaById);

router.put('/update/:id', updateFilmMedia);

router.delete('/delete/:id', deleteFilmMedia);

export default router;
