import express from 'express';
import { handlePaymentWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Webhook endpoint
router.post('/stripe', handlePaymentWebhook);

export default router;
