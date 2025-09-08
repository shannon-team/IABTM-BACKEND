import FilmMedia from "../models/filmMediaModel.js";
import AudioMedia from "../models/musicMediaModel.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";


export const searchMediaContent = async (params) => {
  try {
    console.log("params in searchMediaContent", params)
    const { currentWord, imagineWord, mediaPreferences, similarWords } = params;

    if (!currentWord || !imagineWord || !mediaPreferences || !Array.isArray(mediaPreferences)) {
      throw new ApiError(400, "Missing required parameters");
    }

    // Create an array of all relevant keywords
    const keywordsArray = [];

    // Add the main keywords
    keywordsArray.push(currentWord, imagineWord);

    // Add similar words if provided
    if (similarWords && typeof similarWords === 'object') {
      // Add similar current words
      if (similarWords.similarCurrentImagine && Array.isArray(similarWords.similarCurrentImagine)) {
        similarWords.similarCurrentImagine.forEach(item => {
          if (item.original) keywordsArray.push(item.original);
          if (item.mapped) keywordsArray.push(item.mapped);
        });
      }

      // Add similar imagine words
      if (similarWords.similarSelfImagine && Array.isArray(similarWords.similarSelfImagine)) {
        similarWords.similarSelfImagine.forEach(item => {
          if (item.original) keywordsArray.push(item.original);
          if (item.mapped) keywordsArray.push(item.mapped);
        });
      }
    }

    // Remove duplicates and empty strings from the keywords array
    const uniqueKeywords = [...new Set(keywordsArray.filter(keyword => keyword && keyword.trim() !== ''))];
    console.log("uniqueKeywords", uniqueKeywords);
    const results = {
      video: [],
      audio: []
    };

    // Use Promise.all for parallel queries
    const queries = [];

    // Search for video content if requested
    if (mediaPreferences.includes("Video")) {
      console.log("uniqueKeywords:", uniqueKeywords);

      // Add the video query promise to our array
      queries.push(
        FilmMedia.find({
          $or: [
            { "attributes.currentSelf": { $in: uniqueKeywords } },
            { "attributes.imagineSelf": { $in: uniqueKeywords } }
          ]
        })
          .select('title videoLink description duration attributes isViewed')
          .limit(10)
          .exec()
      );
    } else {
      // Push null if video is not requested
      queries.push(null);
    }

    // Search for audio content if requested
    if (mediaPreferences.includes("Audio")) {
      console.log("i am in audio query");

      // Add the audio query promise to our array
      queries.push(
        AudioMedia.find({
          $or: [
            { "attributes.currentSelf": { $in: uniqueKeywords } },
            { "attributes.imagineSelf": { $in: uniqueKeywords } }
          ]
        })
          .select('title audioLink description duration attributes')
          .limit(10)
          .exec()
      );
    } else {
      // Push null if audio is not requested
      queries.push(null);
    }

    // Wait for all queries to complete
    const [videoResults, audioResults] = await Promise.all(queries);

    // Assign results
    if (videoResults) results.video = videoResults;
    if (audioResults) results.audio = audioResults;

    // Calculate relevance scores and sort results
    const calculateRelevance = (mediaItem) => {
      let score = 0;

      // Check currentSelf attributes
      if (mediaItem.attributes && mediaItem.attributes.currentSelf) {
        mediaItem.attributes.currentSelf.forEach(keyword => {
          if (keyword === currentWord) score += 3;
          else if (uniqueKeywords.includes(keyword)) score += 1;
        });
      }

      // Check imagineSelf attributes
      if (mediaItem.attributes && mediaItem.attributes.imagineSelf) {
        mediaItem.attributes.imagineSelf.forEach(keyword => {
          if (keyword === imagineWord) score += 3;
          else if (uniqueKeywords.includes(keyword)) score += 1;
        });
      }

      return score;
    };

    // Sort results by relevance
    if (results.video.length > 0) {
      results.video.forEach(item => {
        item._doc.relevanceScore = calculateRelevance(item);
      });
      results.video.sort((a, b) => b._doc.relevanceScore - a._doc.relevanceScore);
    }

    if (results.audio.length > 0) {
      results.audio.forEach(item => {
        item._doc.relevanceScore = calculateRelevance(item);
      });
      results.audio.sort((a, b) => b._doc.relevanceScore - a._doc.relevanceScore);
    }

    // Return the formatted results
    return {
      keywords: uniqueKeywords,
      mediaContent: {
        video: results.video.map(item => ({
          ...item._doc,
          relevanceScore: undefined
        })),
        audio: results.audio.map(item => ({
          ...item._doc,
          relevanceScore: undefined
        }))
      }
    };
  } catch (error) {
    console.error("Error in searchMediaContent function:", error);
    throw error;
  }
};

export default {
  searchMediaContent
};