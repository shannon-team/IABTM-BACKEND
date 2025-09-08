import Cart from '../models/cartModel.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { io } from '../../app.js';

export const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id; 
    if (!userId) {
        return res.status(200).json(new ApiResponse(400, null, "user id not found"));
    }
    if (!productId || !quantity) {
        return res.status(200).json(new ApiResponse(400, null, "Product ID and quantity are required"));
    }

    try {
        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (itemIndex > -1) {
            // Item exists in cart, update quantity
            cart.items[itemIndex].quantity += quantity;
        } else {
            // Add new item to cart
            cart.items.push({ product: productId, quantity });
        }

        await cart.save();

        io.emit('cartUpdated', { userId, cart });

        return res.status(200).json(new ApiResponse(200, cart, "Item added to cart successfully"));
    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

export const getCart = async (req, res) => {
    const userId = req.user.id;

    try {
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        
        if (!cart) {
            return res.status(200).json(new ApiResponse(400, null,"Cart not found"));
        }

        return res.status(200).json(new ApiResponse(200, cart, "Cart retrieved successfully"));
    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

export const removeFromCart = async (req, res) => {
    const { productId } = req.body;
    const userId = req.user.id;

    try {
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(200).json(new ApiResponse(400, null,"Cart not found"));
        }

        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();

        io.emit('cartUpdated', { userId, cart });

        return res.status(200).json(new ApiResponse(200, cart, "Item removed from cart successfully"));
    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

export const getCartCount = async (req, res) => {
    const userId = req.user.id;
    try {
        const cart = await Cart.findOne({ user: userId });
        const count = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        return res.status(200).json(new ApiResponse(200, { count }, "Cart count retrieved successfully"));
    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};
