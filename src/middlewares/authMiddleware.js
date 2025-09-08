import dotenv from "dotenv"
import User from "../models/userModel.js";
dotenv.config({
    path: "./.env"
})

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
const JWT_SECRET =  process.env.JWT_SECRET


export const authenticate = async (req, res, next) => {
    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️ MongoDB not connected, attempting to reconnect...');
            return res.status(503).json({ 
                message: 'Database temporarily unavailable',
                error: 'Database connection lost'
            });
        }

        // console.log(req.cookies)
        const token = req.cookies.token;


        if (!token) {
            console.log('No token found in cookies');
            return res.status(401).json({ message: 'No token provided' });
        }

        // console.log('Token found:', token);

        const decoded = jwt.verify(token, JWT_SECRET);
        // console.log('Decoded ID:', decoded.id);

        const user = await User.findById(decoded.id);
        
        if (!user) {
            console.log('User not found');
            return res.status(404).json({ message: 'User not found' });
        }

        req.user = user;
        // console.log(user)
        // console.log('User ID:', user.id);
        console.log("Request recieved");
        
        next();
    } catch (error) {
        console.log('Authentication error:', error);
        
        // Handle specific database errors
        if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
            return res.status(503).json({ 
                message: 'Database temporarily unavailable',
                error: 'Database connection error'
            });
        }
        
        return res.status(403).json({ 
            message: 'Authentication failed',
            error: error.message 
        });
    }
};


