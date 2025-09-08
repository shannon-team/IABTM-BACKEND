import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const searchTracks = async (req, res) => { 
    const API_KEY = process.env.MUSIC_API_KEY;
    const API_HOST = process.env.MUSIC_API_HOST;

    try {
        let query = req.query.q?.trim() || "top songs";

        if (!API_HOST || !API_KEY) {
            console.error("Missing API_HOST or API_KEY in environment variables");
            return res.status(500).json({ error: "Server misconfiguration" });
        }

        let response = await axios.post(`https://${API_HOST}/search`,
            { q: query, shelf: "song" },
            {
                headers: {
                    "x-rapidapi-key": API_KEY,
                    "x-rapidapi-host": API_HOST,
                    "Content-Type": "application/json",
                },
            }
        );

        let contents = response.data?.results?.data?.[0]?.contents || [];

        if (contents.length === 0) {
            const fallbackResponse = await axios.post(`https://${API_HOST}/search`,
                { q: "popular songs", shelf: "song" },
                {
                    headers: {
                        "x-rapidapi-key": API_KEY,
                        "x-rapidapi-host": API_HOST,
                        "Content-Type": "application/json",
                    },
                }
            );
            contents = fallbackResponse.data?.results?.data?.[0]?.contents || [];
        }

        const formattedTracks = contents
            .filter(item => item.item_type === "song")
            .map(item => ({
                title: item.title,
                videoId: item.id,
                author: item.artists?.map(a => a.name).join(", ") || "Unknown",
                thumbnail: item.thumbnail?.contents?.[0]?.url || "",
                duration: item.duration?.text || "",
            }));

        res.json({ tracks: formattedTracks });
    } catch (err) {
        console.error("Search error:", err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data || err.message });
    }
};
