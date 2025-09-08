import express from "express";
import {searchTracks } from "../controllers/musicController.js";
const router = express.Router();

// router.get("/track/:trackId", getTrack);
// router.get("/featured-playlists", getFeaturedPlaylists);
// router.put("/play", play);
// router.put("/pause", pause);
// router.post("/next", next);
// router.post("/previous", previous);
// router.put("/volume", setVolume);
router.get("/search",searchTracks)

export default router;
