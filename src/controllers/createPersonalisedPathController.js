import { geminiPathGenerator } from "../helpers/geminiPathGenerator.js";
import { searchMediaContent } from "../helpers/searchMediaContent.js";
import { createNewCuratedPath } from "../helpers/createNewCuratedPath.js";
import { staticCurrentSelfWords, staticImagineSelfWords } from "../constants/selfWords.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import MediaProgress from "../models/mediaProgressModel.js";

export const createPersonlisedPath = async (req, res) => {
    const { currentSelf, imagineSelf, learningStyle, mediaPreferences } = req.body.attributes;
    //   attributes: {
    //     currentSelf: string[];
    //     imagineSelf: string[];
    //     learningStyle: string[];
    //     mediaPreferences: string[];
    //   };

    const userId = req.user?.id;

    try {
        const geminiResponse = await geminiPathGenerator(currentSelf, imagineSelf, staticCurrentSelfWords, staticImagineSelfWords);

        if (!geminiResponse || !geminiResponse.length) {
            throw new ApiError(400, "No path suggestions generated");
        }

        // Array to store all created paths and their associated media
        const createdPaths = [];

        // Loop through each item in the Gemini response
        for (const pathItem of geminiResponse) {
            const { currentImagine, selfImagine, betterThrough, similarWords } = pathItem;

            try {
                // Search for media content for the current path
                const mediaSearchParams = {
                    currentWord: currentImagine,
                    imagineWord: selfImagine,
                    mediaPreferences: mediaPreferences,
                    similarWords: similarWords
                };

                const mediaResults = await searchMediaContent(mediaSearchParams);

                console.log("mediaResults", mediaResults);

                // Extract media content
                const videoMedia = mediaResults.mediaContent.video || [];
                const audioMedia = mediaResults.mediaContent.audio || [];

                // Extract just the IDs from the media results
                const filmMediaIds = videoMedia.map(item => item._id || item.id);
                const musicMediaIds = audioMedia.map(item => item._id || item.id);



                // Skip this path if no media is found
                if (filmMediaIds.length === 0 && musicMediaIds.length === 0) {
                    console.log(`No media found for path ${currentImagine} -> ${selfImagine}, skipping...`);
                    continue;
                }

                // Create a new curated path document in the database
                const pathData = {
                    userId,
                    currentImagine,
                    selfImagine,
                    betterThrough,
                    numberOfContent: filmMediaIds.length + musicMediaIds.length,
                    mediaData: {
                        filmMedia: filmMediaIds,
                        musicMedia: musicMediaIds,
                        artMedia: []
                    }
                };

                console.log("pathData before req", pathData)

                const newPathResult = await createNewCuratedPath(pathData);


                // for each film media ids, create the mediaProgress

                if (filmMediaIds.length > 0) {
                    await Promise.all(filmMediaIds.map(async (mediaId) => {
                        const newProgress = new MediaProgress({
                            userId,
                            mediaId,
                            pathId: newPathResult.data._id,
                            mediaType: 'FilmMedia',
                            isViewed: false
                        });

                        await newProgress.save();
                    }));
                }

                createdPaths.push({
                    path: newPathResult.data,
                    media: {
                        video: videoMedia,
                        audio: audioMedia
                    },
                    keywords: mediaResults.keywords
                });

            } catch (error) {
                console.error(`Error processing path ${currentImagine} -> ${selfImagine}:`, error);
            }
        }

        // Handle case where no paths were created
        if (createdPaths.length === 0) {
            return res.status(200).json(
                new ApiResponse(200, {
                    createdPaths: [],
                    totalPathsCreated: 0,
                    message: "Personalised content will be pushed soon."
                }, "Personalised content will be pushed soon.")
            );
        }

        // Return success response with all created paths
        return res.status(200).json(
            new ApiResponse(200, {
                createdPaths,
                totalPathsCreated: createdPaths.length,
                message: "Personalized paths created successfully"
            }, "Personalized paths created successfully")
        );

    } catch (error) {
        console.error("Error creating Personalised Path:", error);
        return res.status(500).json(new ApiError(500, "Error creating Personalised Path", error));
    }
};