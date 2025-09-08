import express from 'express';
const router = express.Router();

import { authenticate } from '../middlewares/authMiddleware.js';

import { addCurrentSelf , addImagineSelf } from '../controllers/attributeController.js';

router.post("/add-current-self" , authenticate , addCurrentSelf)

router.post("/add-imagine-self" , authenticate , addImagineSelf)

export default router;