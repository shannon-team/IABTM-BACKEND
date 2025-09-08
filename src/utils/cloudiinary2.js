import cloudinary from "cloudinary"
export const cloudinaryV2= cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
    api_key: process.env.CLOUDINARY_API_KEY ,
    api_secret: process.env.CLOUDINARY_API_KEY_SECRET
})
// to generate the signed url 
export const generateSignedUrl= async (userId,resourceType = "image")=>{
    if (!["image", "video"].includes(resourceType)) {
        throw new Error("Invalid resource type. Allowed types: 'image', 'video'.");
    }
    const timestamp = Math.round(Date.now() / 1000) + 30 * 60; // Add 30 minutes in seconds
    const signature= cloudinary.v2.utils.api_sign_request(
        {
            timestamp,
            folder: `user_uploads/${userId}`,
        },
    process.env.CLOUDINARY_API_KEY_SECRET
)
return { url:`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,timestamp,signature,userId: userId, api_key: process.env.CLOUDINARY_API_KEY, folder: `user_uploads/${userId}`}
}