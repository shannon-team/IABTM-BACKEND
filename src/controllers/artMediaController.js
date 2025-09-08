import ArtMedia from '../models/artMediaModel.js';
import CuratedMedia from '../models/curatedMediaModel.js';

// Create a new ArtMedia entry
export const createArtMedia = async (req, res) => {
    try {
      const { title, productId, imageUrl } = req.body;
      const newArtMedia = new ArtMedia({
        title,
        productId,
        image: imageUrl,
      });

      await newArtMedia.save();
  
      let curatedMedia = await CuratedMedia.findOne();
      if (!curatedMedia) {
        curatedMedia = new CuratedMedia();
      }

      curatedMedia.artMedia.push(newArtMedia._id);
      await curatedMedia.save();
  
      res.status(201).json(newArtMedia);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

// Get all ArtMedia entries
export const getAllArtMedia = async (req, res) => {
  try {
    const arts = await ArtMedia.find();
    res.status(200).json(arts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single ArtMedia entry by ID
export const getArtMediaById = async (req, res) => {
  try {
    const art = await ArtMedia.findById(req.params.id);
    if (!art) {
      return res.status(404).json({ message: "Art not found" });
    }
    res.status(200).json(art);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an ArtMedia entry by ID
export const updateArtMedia = async (req, res) => {
  try {
    const { title, productId, image } = req.body;

    const updatedArt = await ArtMedia.findByIdAndUpdate(
      req.params.id,
      { title, productId, image },
      { new: true, runValidators: true }
    );

    if (!updatedArt) {
      return res.status(404).json({ message: "Art not found" });
    }

    res.status(200).json(updatedArt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete an ArtMedia entry by ID
export const deleteArtMedia = async (req, res) => {
  try {
    const deletedArt = await ArtMedia.findByIdAndDelete(req.params.id);
    if (!deletedArt) {
      return res.status(404).json({ message: "Art not found" });
    }
    res.status(200).json({ message: "Art deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
