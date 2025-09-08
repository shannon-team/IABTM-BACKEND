import stripe from '../utils/stripe.js';  // Import the Stripe instance
import Transaction from '../models/transactionModel.js'; // Import the Transaction model
import ApiError from '../utils/ApiError.js'; // For handling errors
import { ApiResponse } from '../utils/ApiResponse.js'; // Standardized API responses
import Order from '../models/orderModel.js';
import {  handleSubscriptionCreated } from './subscriptionController.js';
import User from '../models/userModel.js';


export const createPaymentSession = async (req, res) => {
    const { items } = req.body;

    // Validate the request body
    if (!items || !items.length) {
        return res.status(400).json(new ApiResponse(400, null, "Items are required"));
    }

    try {
        // Prepare line items for Stripe
        const lineItems = items.map((item) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.product.title, // Ensure consistent field (title)
                },
                unit_amount: item.product.price * 100, // Convert to cents
            },
            quantity: item.quantity,
        }));

        // to prefill the email with login user email 
        // const customerEmail = req.user.email || undefined;
        
        // Create a Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['US', 'IN'], 
            },
            phone_number_collection
            : {
                enabled
            : true,
              },
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
        });

        // Log the payment transaction in the database
        await new Transaction({
            userId: req.user.id,
            amount: items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0),
            description: 'IABTM product payment',
            type: 'product',
        }).save();

        // Return the session ID and redirect URL
        return res.json(new ApiResponse(200, { sessionId: session.id, url: session.url }, "Payment session created successfully"));
    } catch (error) {
        console.error('Error creating payment session:', error);
        throw new ApiError(500, 'Internal server error', [error.message]);
    }
};
const handleProductCheckout = async (session) => {
    try {
        const { payment_intent, customer_email } = session;

        // Get the user from your database using the email
        const user = await User.findOne({ email: customer_email });

        if (!user) {
            console.error(`User not found for email: ${customer_email}`);
            return;
        }

        // Update the order associated with the payment intent
        const updatedOrder = await Order.findOneAndUpdate(
            { userId: user.id, paymentId: payment_intent }, // Link order to the user
            { paymentStatus: 'Paid', status: 'Shipped' },
            { new: true }
        );

        if (!updatedOrder) {
            console.error(`Order not found for Payment ID: ${payment_intent} and User ID: ${user.id}`);
            return;
        }

        console.log(`Order ${updatedOrder._id} marked as Paid for User ID: ${user.id}`);
    } catch (error) {
        console.error('Error in handleProductCheckout:', error.message);
    }
};


// 3. Pay Artist (after platform fee deduction)
export const payArtist = async (req, res) => {
    const { amount, artistStripeAccountId, platformFeePercent } = req.body;

    if (!amount || !artistStripeAccountId || !platformFeePercent) {
        return res.status(200).json(new ApiResponse(400, null, "Amount, Artist Stripe Account ID, and Platform Fee Percent are required"));
    }

    try {
        // Calculate the platform fee and the amount to be paid to the artist
        const platformFee = Math.floor((amount * platformFeePercent) / 100);
        const artistAmount = amount - platformFee;

        // Create a transfer to the artist's Stripe account
        const transfer = await stripe.transfers.create({
            amount: artistAmount * 100, // Convert to cents
            currency: 'usd',
            destination: artistStripeAccountId,
        });

        // Log the artist payout transaction
        await new Transaction({
            userId: req.user._id,
            amount: artistAmount,
            description: 'Artist payout after fee deduction',
            type: 'artist',
        }).save();

        return res.json(new ApiResponse(200, transfer, "Artist payout successful"));
    } catch (error) {
        console.error('Error paying artist:', error);
        throw new ApiError(500, 'Internal server error', [error.message]);
    }
};


export const handlePaymentWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

        console.log('Received event:', event.type);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                if (session.payment_status === 'paid') {
                    if (session.subscription) {
                        // Subscription payment: Pass session details to handleSubscriptionCreated
                        await handleSubscriptionCreated(session);
                    } else {
                        // Product payment: Pass session details to handleProductCheckout
                        await handleProductCheckout(session);
                    }
                }
                break;
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;

                // Update the order status for product purchases
                const updatedOrder = await Order.findOneAndUpdate(
                    { paymentId: paymentIntent.id, userId: req.user.id },
                    { paymentStatus: 'Paid', status: 'Shipped' },
                    { new: true }
                );

                if (!updatedOrder) {
                    console.error(`Order not found for paymentId: ${paymentIntent.id}`);
                    return res.status(404).json(new ApiResponse(404, null, 'Order not found'));
                }

                console.log(`Order ${updatedOrder._id} marked as Paid`);
                break;
            }

            case 'payment_intent.payment_failed': {
                const failedPaymentIntent = event.data.object;

                // Update the order status for failed payments
                await Order.findOneAndUpdate(
                    { paymentId: failedPaymentIntent.id, userId: req.user.id },
                    { paymentStatus: 'Failed' }
                );

                console.error(`Payment failed for paymentId: ${failedPaymentIntent.id}`);
                break;
            }

            case 'customer.subscription.created': {
                const subscription = event.data.object;
                console.log('Subscription Created:', subscription.id);

                // // Handle new subscription creation (this is redundant if we already handle this in the checkout session)
                // await handleSubscriptionCreated(subscription);
                break;
            }

            default:
                console.warn(`Unhandled event type: ${event.type}`);
        }

        res.status(200).send('Webhook handled successfully');
    } catch (err) {
        console.error('Webhook error:', err.message);
        res.status(400).json(new ApiResponse(400, null, `Webhook Error: ${err.message}`));
    }
};
