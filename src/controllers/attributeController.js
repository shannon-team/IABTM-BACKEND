import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/userModel.js";

export const addCurrentSelf = async (req, res) => {
    try {
        const { currentSelf } = req.body;  
        const userId = req.user.id;  

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { 'attributes.0.currentSelf': currentSelf },  
            { new: true }  
        );

        if (!updatedUser) {
            return res.status(200).json(new ApiResponse(400,null, "User not found"));
        }

        return res.status(200).json(new ApiResponse(200, updatedUser, "Current self updated successfully"));
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const addImagineSelf = async (req, res) => {
    try {
        const { imagineSelf } = req.body;  
        const userId = req.user.id;  

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { 'attributes.1.imagineSelf': imagineSelf },  
            { new: true }  
        );

        if (!updatedUser) {
            return res.status(200).json(new ApiResponse(400, null,"User not found"));
        }

        return res.status(200).json(new ApiResponse(200, updatedUser, "Imagine self updated successfully"));
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};