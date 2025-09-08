import CuratedPath from '../models/curatedPathModel.js';
import User from '../models/userModel.js';
import CuratedMedia from '../models/curatedMediaModel.js';

export const createNewCuratedPath = async (pathData) => {
    console.log("pathData", pathData);

    const { userId, currentImagine, selfImagine, betterThrough, numberOfContent, mediaData } = pathData;

    if (!userId) {
        throw new Error("User ID is required");
    }

    if (!numberOfContent) {
        throw new Error("Number of content is required");
    }

    try {
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
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

        return {
            data: savedPath,
            message: "Curated path created and assigned to user successfully"
        };
    } catch (err) {
        console.error("Error creating curated path:", err);
        throw err; // Re-throw the error for the calling function to handle
    }
};