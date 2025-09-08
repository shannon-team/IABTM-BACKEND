import Order from '../models/orderModel.js';
import Cart from '../models/cartModel.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import stripe from '../utils/stripe.js';

export const createOrder = async (req, res) => {
    const userId = req.user.id;

    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json(new ApiResponse(400, null, 'sessionId is required'));
        }

        // Retrieve the session details from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!session) {
            return res.status(404).json(new ApiResponse(404, null, 'Session not found in Stripe'));
        }

        const paymentId = session.payment_intent;

        // Check if an order already exists with the same payment ID
        const existingOrder = await Order.findOne({ paymentId });

        if (existingOrder) {
            return res.status(409).json(new ApiResponse(409, null, 'Order already exists for this transaction ID'));
        }

        // Create the new order
        const newOrder = new Order({
            paymentId,
            user: userId,
            totalAmount: session.amount_total / 100, // Convert from cents if necessary
            status: 'Pending', // Default status until payment is confirmed
            paymentStatus: 'Pending',
            items: [] // Add items if applicable
        });

        // Save the new order to the database
        await newOrder.save();

        // Clear the user's cart after the order is created
        await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } }
        );

        // Respond with success
        return res.status(200).json(new ApiResponse(200, newOrder, 'Order created successfully.'));
    } catch (err) {
        console.error('Error creating order:', err);
        return res.status(500).json(new ApiResponse(500, null, 'Internal server error', [err.message]));
    }
};

export const getOrderHistory = async (req, res) => {
    const userId = req.user.id;

    try {
        const orders = await Order.find({ user: userId }).populate('items.product');

        return res.status(200).json(new ApiResponse(200, orders, 'Order history retrieved successfully'));
    } catch (err) {
        console.error(err);
        throw new ApiError(500, 'Internal server error', [err.message]);
    }
};
