import express from 'express';
const router = express.Router();

import { submitContactForm, submitHowItWorksForm } from '../controllers/contactController.js';

// Contact form submission (from About page)
router.post("/contact", submitContactForm);

// How it works form submission (from How It Works page)
router.post("/how-it-works", submitHowItWorksForm);

export default router; 