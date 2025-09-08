import FilmMedia from '../models/filmMediaModel.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import  ApiError  from '../utils/ApiError.js';

// Create a new FilmMedia entry
export const createFilmMedia = async (req, res) => {
  try {
    const { title, attributes, videoLink, description, thumbnail } = req.body;

    console.log("request body", req.body);

    // Extract video ID from YouTube URL
    const videoId = videoLink.split("v=")[1]?.split("&")[0];

    if (!videoId) {
      throw new ApiError(400, "Invalid YouTube video link.");
    }

    // Use provided thumbnail or fallback to YouTube default
    const ytThumbnail = thumbnail?.trim()
      ? thumbnail.trim()
      : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const newFilmMedia = new FilmMedia({
      title,
      attributes,
      videoLink,
      description,
      thumbnail: ytThumbnail,
    });

    await newFilmMedia.save();

    return res
      .status(201)
      .json(new ApiResponse(201, newFilmMedia, "Film media created successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Failed to create film media", [error.message]);
  }
};


// Get all FilmMedia entries
export const getAllFilmMedia = async (req, res) => {
  try {
    const films = await FilmMedia.find();
    
    return res.status(200).json(
      new ApiResponse(200, films, "Film media retrieved successfully")
    );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Failed to retrieve film media", [error.message]);
  }
};

// Get a single FilmMedia entry by ID
export const getFilmMediaById = async (req, res) => {
  try {
    const film = await FilmMedia.findById(req.params.id);
    
    if (!film) {
      throw new ApiError(404, "Film not found");
    }
    
    return res.status(200).json(
      new ApiResponse(200, film, "Film media retrieved successfully")
    );
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to retrieve film media", [error.message]);
  }
};

// Update a FilmMedia entry by ID
export const updateFilmMedia = async (req, res) => {
  try {
    const { title, attributes, videoLink, description, thumbnail } = req.body;

    const updatedFilm = await FilmMedia.findByIdAndUpdate(
      req.params.id,
      { title, attributes, videoLink, description, thumbnail },
      { new: true, runValidators: true }
    );

    if (!updatedFilm) {
      throw new ApiError(404, "Film not found");
    }

    return res.status(200).json(
      new ApiResponse(200, updatedFilm, "Film media updated successfully")
    );
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to update film media", [error.message]);
  }
};

// Delete a FilmMedia entry by ID
export const deleteFilmMedia = async (req, res) => {
  try {
    const deletedFilm = await FilmMedia.findByIdAndDelete(req.params.id);
    
    if (!deletedFilm) {
      throw new ApiError(404, "Film not found");
    }
    
    return res.status(200).json(
      new ApiResponse(200, null, "Film deleted successfully")
    );
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to delete film media", [error.message]);
  }
};
