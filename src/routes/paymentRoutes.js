import express from 'express';
import {  createPaymentSession, payArtist } from '../controllers/paymentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { cancelSubscription, createSubscription, updateSubscription } from '../controllers/subscriptionController.js';

const router = express.Router();

// Route for subscription
router.post('/subscription/:planId', authenticate, createSubscription );
router.post('/subscription/cancel/:subscriptionId', authenticate, cancelSubscription)
router.post('/subscription/update', authenticate, updateSubscription)
// Route for handling one-time payments (IABTM product payment)
router.post('/checkout/product', authenticate, createPaymentSession);

// Route for paying artist (with platform fee deduction)
router.post('/pay-artist', authenticate, payArtist);

export default router;
