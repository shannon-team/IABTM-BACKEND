import uploadOnCloudinary from "../utils/cloudinary.js";
import User from "../models/userModel.js";
import Expert from "../models/expertModel.js";
import Artist from "../models/artistModel.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import validator from 'validator';

export const createUser = async (req, res) => {
    const { userName, email, password, profileName, age, gender, phoneNumber, role,profilePicture} = req.body;
    if(!req.user) {
        return res.status(200).json(new ApiResponse(400, null, "SuperAdmin is not loggedin yet!"));
    }

    if (!userName || !email || !password || !role || !profileName || !age || !gender || !phoneNumber || !profilePicture ) {
        return res.status(200).json(new ApiResponse(400, null, "All fields and a profile picture are required"));
    }

    if (!validator.isEmail(email)) {
        return res.status(200).json(new ApiResponse(400, null, "Invalid email address"));
    }

    if (password.length < 6) {
        return res.status(200).json(new ApiResponse(400, null, "Password must be at least 6 characters long"));
    }
    try {
        const newUser = new User({
            name : userName,
            email,
            password,
            profileName,
            age,
            gender,
            phoneNumber,
            role,
            profilePicture,
        });
    
        await newUser.save();
        return res.json(new ApiResponse(200, null, "User registered successfully"));
    } catch (error) {
        console.error('Error in registering user by superAdmin', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }

}

export const createExpert = async(req,res)=>{
    const { name, email, password, age, gender, phoneNumber , expertise , topRated,profilePicture } = req.body;

    const newExpert = new Expert({
        name,
        email,
        password,
        age,
        gender,
        phoneNumber,
        expertise,
        topRated,
        profilePicture
    });

    await newExpert.save();
    return res.json(new ApiResponse(200, null, "Expert registered successfully"));
}

export const createArtist = async(req,res)=>{
    const { name, email, password, age, gender, phoneNumber , profilePicture} = req.body;

    const newArtist = new Artist({
        name,
        email,
        password: password,
        age,
        gender,
        phoneNumber,
        profilePicture: profilePicture,
    });

    await newArtist.save();
    return res.json(new ApiResponse(200, null, "Artist registered successfully"));
}