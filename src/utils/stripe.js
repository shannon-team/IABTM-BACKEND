import Stripe from 'stripe';

// Only initialize Stripe client if secret key is available
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
    console.warn('Stripe secret key not configured. Payment functionality disabled.');
}

export default stripe;
