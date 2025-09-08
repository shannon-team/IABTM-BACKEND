
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateSignedUrl } from "../utils/cloudiinary2.js";

export const getSignedUrl = async (req, res) => {
    try {
        const userId = req.params?.userId || "guest";
        const resourceType = req.query?.resourceType || "image";
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const signedUrlData = await generateSignedUrl(userId,resourceType);

        return res.status(200).json(new ApiResponse(200, signedUrlData, "Signed Url generated Successfully "));
    } catch (error) {
        console.error("Error generating signed URL:", error);
       throw new ApiError(500,"Error generating the signed URL:", error)
    }
};
