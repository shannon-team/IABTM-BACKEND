
import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import ApiError from "./ApiError.js";
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
    api_key: process.env.CLOUDINARY_API_KEY ,
    api_secret: process.env.CLOUDINARY_API_KEY_SECRET
})
const uploadOnCloudinary= async (filepath, folder = 'general')=>{
         try {
            if(!filepath) return null;
           const response= await cloudinary.uploader.upload(filepath,{
                resource_type:"auto",
                folder: folder
            })
            console.log("File is uploaded successfully!", response.url)
            await fs.promises.unlink(filepath)
            console.log("File deleted successfully:", filepath);
            return response;

         } catch (error) {
            console.error("Error uploading to Cloudinary:", error); 
            fs.promises.unlink(filepath) // remove the locally saved file as it upload operation got failed
            return null;
         }
}
export const  deleteOnCloudinary= async (url)=>{
   try {
      if(!url) return null;
         const parts = url.split('/');
         const filename = parts[parts.length - 1]; // e.g., sample.jpg
         const public_id= filename.split('.')[0]; // e.g., sample
         if (public_id) {
            await cloudinary.uploader.destroy(public_id);
            console.log("Old avatar deleted successfully!");
          } else {
            throw new ApiError(400, "Invalid URL format for Cloudinary image.");
          }
   } catch (error) {
      throw new ApiError(500,"Error while deleting the old avatar.")
   }
}
export default uploadOnCloudinary;