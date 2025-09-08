import CuratedPath from '../models/curatedPathModel.js';
import User from '../models/userModel.js';
import CuratedMedia from '../models/curatedMediaModel.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import MediaProgress from '../models/mediaProgressModel.js';

/**
 * Create a new curated path and assign it to the authenticated user
 * @route POST /api/curated-paths/create
 */
export const createCuratedPath = async (req, res) => {
    const { currentImagine, selfImagine, betterThrough, numberOfContent, mediaData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(200).json(new ApiResponse(401, null, "Authentication required"));
    }

    if (!name || !numberOfContent) {
        return res.status(200).json(new ApiResponse(400, null, "Path name and number of content are required"));
    }

    try {
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(200).json(new ApiResponse(404, null, "User not found"));
        }

        // Create curated media first (if provided)
        let curatedMediaId = null;
        if (mediaData) {
            const curatedMedia = new CuratedMedia({
                artMedia: mediaData.artMedia || [],
                musicMedia: mediaData.musicMedia || [],
                filmMedia: mediaData.filmMedia || []
            });

            const savedMedia = await curatedMedia.save();
            curatedMediaId = savedMedia._id;
        }

        // Create new curated path
        const curatedPath = new CuratedPath({
            currentImagine,
            selfImagine,
            betterThrough,
            numberOfContent,
            contentFinished: 0,
            curatedMedia: curatedMediaId
        });

        const savedPath = await curatedPath.save();

        // Add path to user's curatedPaths array
        user.curatedPaths.push(savedPath._id);
        await user.save();

        return res.status(201).json(
            new ApiResponse(201, savedPath, "Curated path created and assigned to user successfully")
        );
    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

/**
 * Get all curated paths for the authenticated user
 * @route GET /api/curated-paths/my-paths
 */
export const getUserCuratedPaths = async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(200).json(new ApiResponse(401, null, "Authentication required"));
    }

    try {
        const user = await User.findById(userId).populate({
            path: 'curatedPaths',
            populate: {
                path: 'curatedMedia',
                populate: [
                    { path: 'artMedia' },
                    { path: 'musicMedia' },
                    { path: 'filmMedia' }
                ]
            }
        });

        if (!user) {
            return res.status(200).json(new ApiResponse(404, null, "User not found"));
        }

        return res.status(200).json(
            new ApiResponse(200, user.curatedPaths, "User curated paths retrieved successfully")
        );
    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};


/**
 * Get all curated paths (admin function)
 * @route GET /api/curated-paths
 */
export const getAllCuratedPaths = async (req, res) => {
    try {
        const curatedPaths = await CuratedPath.find().populate('curatedMedia');

        return res.status(200).json(
            new ApiResponse(200, curatedPaths, "All curated paths retrieved successfully")
        );
    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

/**
 * Get a specific curated path by ID
 * @route GET /api/curated-paths/:pathId
 */
export const getCuratedPathById = async (req, res) => {
    const { pathId } = req.params;

    if (!pathId) {
        return res.status(200).json(new ApiResponse(400, null, "Path ID is required"));
    }

    try {
        const curatedPath = await CuratedPath.findById(pathId).populate({
            path: 'curatedMedia',
            populate: [
                { path: 'artMedia' },
                { path: 'musicMedia' },
                { path: 'filmMedia' }
            ]
        });

        if (!curatedPath) {
            return res.status(200).json(new ApiResponse(404, null, "Curated path not found"));
        }

        return res.status(200).json(
            new ApiResponse(200, curatedPath, "Curated path retrieved successfully")
        );
    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

/**
 * Update a curated path's progress
 * @route PATCH /api/curated-paths/:pathId/progress
 */
export const updatePathProgress = async (req, res) => {
    const { pathId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json(new ApiResponse(401, null, "Authentication required"));
    }

    if (!pathId) {
        return res.status(400).json(new ApiResponse(400, null, "Path ID is required"));
    }

    try {

        const updatedPath = await CuratedPath.findOneAndUpdate(
            { _id: pathId },
            { $inc: { contentFinished: 1 } },
            { new: true }
        );

        if (!updatedPath) {
            return res.status(404).json(new ApiResponse(404, null, "Curated path not found"));
        }

        const user = await User.findById(userId).populate({
            path: 'curatedPaths',
            populate: {
                path: 'curatedMedia',
                populate: [
                    { path: 'artMedia' },
                    { path: 'musicMedia' },
                    { path: 'filmMedia' }
                ]
            }
        });

        return res.status(200).json(
            new ApiResponse(200, user, "Path progress updated successfully")
        );
    } catch (err) {
        console.error(err);
        return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
    }
};


/**
 * Delete a curated path and remove it from user's paths
 * @route DELETE /api/curated-paths/:pathId
 */
export const deleteCuratedPath = async (req, res) => {
    const { pathId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(200).json(new ApiResponse(401, null, "Authentication required"));
    }

    if (!pathId) {
        return res.status(200).json(new ApiResponse(400, null, "Path ID is required"));
    }

    try {
        // Check if the curated path exists
        const curatedPath = await CuratedPath.findById(pathId);
        if (!curatedPath) {
            return res.status(200).json(new ApiResponse(404, null, "Curated path not found"));
        }

        // Check if user has this path in their list
        const user = await User.findById(userId);
        if (!user) {
            return res.status(200).json(new ApiResponse(404, null, "User not found"));
        }

        if (!user.curatedPaths.includes(pathId)) {
            return res.status(200).json(new ApiResponse(403, null, "You don't have access to delete this path"));
        }

        // Remove path from user's paths array
        user.curatedPaths = user.curatedPaths.filter(path => path.toString() !== pathId);
        await user.save();

        // Delete associated curated media if exists
        if (curatedPath.curatedMedia) {
            await CuratedMedia.findByIdAndDelete(curatedPath.curatedMedia);
        }

        // Delete the path
        await CuratedPath.findByIdAndDelete(pathId);

        return res.status(200).json(
            new ApiResponse(200, null, "Curated path deleted successfully")
        );
    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

export const markMediaAsViewed = async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(200).json(new ApiResponse(401, null, "Authentication required"));
    }

    const { mediaId, mediaType = 'FilmMedia' } = req.body;

    if (!mediaId) {
        return res.status(200).json(new ApiResponse(400, null, "Media ID is required"));
    }

    try {
        // First, verify the user has access to this media
        const user = await User.findById(userId).populate({
            path: 'curatedPaths',
            populate: {
                path: 'curatedMedia',
                populate: [
                    { path: 'artMedia' },
                    { path: 'musicMedia' },
                    { path: 'filmMedia' }
                ]
            }
        });

        if (!user) {
            return res.status(200).json(new ApiResponse(404, null, "User not found"));
        }

        let mediaFound = false;
        let pathId = null;

        // Check if user has access to this media
        for (const path of user.curatedPaths) {
            const medias = path.curatedMedia?.filmMedia || [];
            if (medias.some(media => media._id.toString() === mediaId)) {
                pathId = path._id;
                mediaFound = true;
                break;
            }
        }

        if (!mediaFound) {
            return res.status(200).json(new ApiResponse(404, null, "Media not found in user's curated paths"));
        }

        // Create or update user progress
        const progressData = {
            userId,
            mediaId,
            pathId,
            mediaType,
            isViewed: true,
            viewedAt: new Date(),
        };

        const userProgress = await MediaProgress.findOneAndUpdate(
            { userId, mediaId, mediaType },
            progressData,
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        // Optionally populate media details for response
        await userProgress.populate('mediaId');

        console.log("User progress after marking as viewed:", userProgress);

        return res.status(200).json(
            new ApiResponse(200, userProgress, "Media marked as viewed successfully")
        );

    } catch (err) {
        console.error("Error in markMediaAsViewed:", err);

        // Handle duplicate key error (shouldn't happen with findOneAndUpdate, but just in case)
        if (err.code === 11000) {
            return res.status(200).json(new ApiResponse(409, null, "Progress already exists for this media"));
        }

        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

export const getUserMediaProgress = async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json(new ApiResponse(401, null, "Authentication required"));
    }

    const { mediaId } = req.params;

    if (!mediaId) {
        return res.status(400).json(new ApiResponse(400, null, "Media ID is required"));
    }

    try {
        const progress = await MediaProgress.findOne({ userId, mediaId }, 'isViewed');

        if (!progress) {
            return res.status(404).json(new ApiResponse(200, { isViewed: false }, "Media Do not exist"));
        }

        return res.status(200).json(
            new ApiResponse(200, { isViewed: progress.isViewed }, "isViewed field retrieved successfully")
        );

    } catch (err) {
        console.error("Error in getUserMediaProgress:", err);
        return res.status(500).json(
            new ApiResponse(500, null, "Internal server error", [err.message])
        );
    }
};


export const getAllUserMediaProgress = async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json(new ApiResponse(401, null, "Authentication required"));
    }

    try {
        const progress = await MediaProgress.find({ userId }).select('mediaId isViewed');

        if (!progress || progress.length === 0) {
            return res.status(404).json(new ApiResponse(404, null, "No media progress found for this user"));
        }

        return res.status(200).json(
            new ApiResponse(200, progress, "User media progress retrieved successfully")
        );

    } catch (err) {
        console.error("Error in getAllUserMediaProgress:", err);
        return res.status(500).json(
            new ApiResponse(500, null, "Internal server error", [err.message])
        );
    }
}

