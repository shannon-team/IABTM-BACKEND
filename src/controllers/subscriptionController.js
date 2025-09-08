import Subscription from '../models/subscriptionModel.js';
import stripe from '../utils/stripe.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/userModel.js';

const planMapping = {
    'price_1QSLviF4Y1BewsrLqF0FHHLy': 'Pro',
    'price_1QSM1AF4Y1BewsrLUOC7Z8SH': 'Advance',
    'price_1QShF3F4Y1BewsrLlIt6DguL': 'Pro', // yearly
    'price_1QShG7F4Y1BewsrLZvkSiQQW': 'Advance', // yearly
};

// Create Subscription and Payment Link using Stripe Checkout
export const createSubscription = async (req, res, next) => {
    const { planId } = req.params; // Price ID from Stripe
    const userId = req.user.id;

    try {
        // Fetch the user
        const user = await User.findById(userId);
        if (!user) throw new ApiError(404, 'User not found');

        let stripeCustomerId = user.stripeCustomerId;

        // Create Stripe customer if not exists
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
            });
            user.stripeCustomerId = customer.id;
            await user.save();
            stripeCustomerId = customer.id;
        }

        // Create the Checkout Session to get a payment link
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer: stripeCustomerId,
            line_items: [
                {
                    price: planId, // Plan Price ID
                    quantity: 1,
                },
            ],
            mode: 'subscription', // Subscription mode
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            subscription_data: {
                trial_period_days: 14, // Optional: Add trial period
            },
        });

        console.log("Session subscription:", session);
        
        // Map the planId to the plan type
        const planType = planMapping[planId];
        if (!planType) throw new ApiError(400, 'Invalid plan type');

        // Save the initial subscription with status 'pending' (or 'trialing') in the database
        const newSubscription = await Subscription.create({
            userId,
            stripeCustomerId,
            stripeSubscriptionId: null, // Will be updated after payment is completed
            plan: planType,
            status: 'pending', // Status is pending until the payment is successful
            startDate: null,
            endDate: null,
            trialEnd: null,
        });

        // Send the payment link to the client
        res.status(200).json(new ApiResponse(200, { paymentLink: session.url }, 'Subscription created successfully. Please complete payment.'));
    } catch (err) {
        console.error('Error creating subscription:', err.message);
        next(new ApiError(500, 'Failed to create subscription', [err.message]));
    }
};

// Handle subscription created webhook (update subscription data after payment success)
export const handleSubscriptionCreated = async (subscription) => {
    try {
        const { id: stripeSubscriptionId, items, current_period_start, current_period_end, customer } = subscription;

        // Get the user from your database using the Stripe customer ID (customer)
        const user = await User.findOne({ email: customer.email });

        if (!user) {
            console.error(`User not found for Stripe customer ID: ${customer.id}`);
            return;
        }

        // Update the subscription details in the database
        const updatedSubscription = await Subscription.findOneAndUpdate(
            { userId: user.id, stripeSubscriptionId },
            { 
                status: 'active',
                items: items.data, 
                startDate: new Date(current_period_start * 1000), // Stripe timestamp to JS Date
                endDate: new Date(current_period_end * 1000), // Stripe timestamp to JS Date
                lastUpdated: new Date(),
            },
            { upsert: true, new: true } // Create a new record if it doesn't exist
        );

        console.log(`Subscription ${stripeSubscriptionId} marked as active for User ID: ${user.id}`);
    } catch (error) {
        console.error('Error in handleSubscriptionCreated:', error.message);
    }
};

// Cancel Subscription
export const cancelSubscription = async (req, res, next) => {
    const { subscriptionId } = req.params;

    try {
        // Cancel the subscription in Stripe
        const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);

        // Update subscription status in the database
        const updatedSubscription = await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            { status: 'canceled', endDate: new Date() },
            { new: true }
        );

        if (!updatedSubscription) throw new ApiError(404, 'Subscription not found');

        res.status(200).json(new ApiResponse(200, updatedSubscription, 'Subscription canceled successfully'));
    } catch (err) {
        console.error('Error canceling subscription:', err.message);
        next(new ApiError(500, 'Failed to cancel subscription', [err.message]));
    }
};

// Update Subscription Plan
export const updateSubscription = async (req, res, next) => {
    const { subscriptionId, newPlanId } = req.body; // `subscriptionId` from DB, `newPlanId` is the new price ID

    try {
        // Retrieve the subscription from the database
        const subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
        
        if (!subscription) {
            throw new ApiError(404, 'Subscription not found');
        }

        // Get the subscription item ID from the subscription details (assuming only one item per subscription)
        const subscriptionItemId = subscription.stripeSubscriptionItemId;

        // Update the subscription in Stripe with the new plan (price ID)
        const updatedStripeSubscription = await stripe.subscriptions.update(subscriptionId, {
            items: [
                {
                    id: subscriptionItemId, // Use the subscription item ID
                    price: newPlanId, // New Price ID (plan)
                },
            ],
        });

        // Update subscription details in the database
        const updatedSubscription = await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            { 
                plan: newPlanId, 
                status: updatedStripeSubscription.status,
                updatedAt: new Date(),
            },
            { new: true }
        );

        if (!updatedSubscription) throw new ApiError(404, 'Subscription update failed');

        res.status(200).json(new ApiResponse(200, updatedSubscription, 'Subscription updated successfully'));
    } catch (err) {
        console.error('Error updating subscription:', err.message);
        next(new ApiError(500, 'Failed to update subscription', [err.message]));
    }
};
