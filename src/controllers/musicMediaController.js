import MusicMedia from "../models/musicMediaModel.js";
import uploadOnCloudinary from '../utils/cloudinary.js';
import CuratedMedia from "../models/curatedMediaModel.js";

export const createMusicMedia = async (req, res) => {
    try {
        const { title, globalMedia, attributes } = req.body;
        const trackFilePath = req.files['trackFile']?.[0]?.path;
        const coverImagePath = req.files['coverImage']?.[0]?.path;

        const trackFileUrl = await uploadOnCloudinary(trackFilePath);
        const coverImageUrl = await uploadOnCloudinary(coverImagePath);

        const newMedia = new MusicMedia({
            title,
            globalMedia,
            attributes,
            trackFile: trackFileUrl.secure_url,
            coverImage: coverImageUrl.secure_url,
        });

        await newMedia.save();
        let curatedMedia = await CuratedMedia.findOne();
        if (!curatedMedia) {
          curatedMedia = new CuratedMedia();
        }
  
        curatedMedia.artMedia.push(newMedia._id);
        await curatedMedia.save();
    
        res.status(201).json(newMedia);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// READ (Get all Music Media)
export const getAllMusicMedia = async (req, res) => {
    try {
        const media = await MusicMedia.find();
        res.status(200).json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// READ (Get single Music Media by ID)
export const getMusicMediaById = async (req, res) => {
    try {
        const { id } = req.params;
        const media = await MusicMedia.findById(id);
        if (!media) return res.status(404).json({ message: "Music Media not found" });
        res.status(200).json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE Music Media by ID
export const updateMusicMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, globalMedia, attributes } = req.body;

        const media = await MusicMedia.findById(id);
        if (!media) return res.status(404).json({ message: "Music Media not found" });

        const trackFilePath = req.files['trackFile']?.[0]?.path;
        const coverImagePath = req.files['coverImage']?.[0]?.path;

        if (trackFilePath) {
            media.trackFile = await uploadOnCloudinary(trackFilePath);
        }
        if (coverImagePath) {
            media.coverImage = await uploadOnCloudinary(coverImagePath);
        }

        media.title = title || media.title;
        media.globalMedia = globalMedia ?? media.globalMedia;
        media.attributes = attributes || media.attributes;

        await media.save();
        res.status(200).json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE Music Media by ID
export const deleteMusicMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const media = await MusicMedia.findByIdAndDelete(id);
        if (!media) return res.status(404).json({ message: "Music Media not found" });
        res.status(200).json({ message: "Music Media deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};