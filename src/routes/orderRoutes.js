import express from 'express';
const router = express.Router();

import { authenticate } from '../middlewares/authMiddleware.js';

import { createOrder , getOrderHistory } from '../controllers/orderController.js';

router.post("/create" , authenticate , createOrder)

router.get("/get-history" , authenticate , getOrderHistory)

export default router;