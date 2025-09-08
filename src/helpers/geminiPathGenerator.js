import { GoogleGenerativeAI } from '@google/generative-ai';
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const geminiPathGenerator = async (currentImagine, selfImagine, staticCurrentKeywords, staticSelfKeywords) => {
    try {
        if (!currentImagine || !selfImagine) {
            throw new ApiError(400, "Current and desired self keywords are required");
        }

        const geminiPrompt = `
You are an AI coach helping users bridge the gap between their current self and their imagined/desired self.

Current Self Keywords selected by user: ${JSON.stringify(currentImagine)}
Desired Self Keywords selected by user: ${JSON.stringify(selfImagine)}
Available standard Current Keywords in our system: ${JSON.stringify(staticCurrentKeywords)}
Available standard Desired Keywords in our system: ${JSON.stringify(staticSelfKeywords)}

Task: Generate meaningful paths from current self to desired self.

Each path should represent a journey from ONE specific current state keyword to ONE specific desired state keyword. 
For each path:
1. Select one keyword from current self and one from desired self that form a LOGICAL psychological progression where:
   - The current self keyword represents a clear deficit, limitation, or negative state
   - The desired self keyword represents an improvement, growth, or positive state that directly addresses that deficit
   - The two keywords must have a clear logical opposition or progression relationship (e.g., "sad" → "happy", "unintelligent" → "intelligent", "unmotivated" → "energized")
2. Generate a "betterThrough" word - a specific activity, practice, or approach that would help achieve this transition.
3. If the user has entered keywords not found in our standard lists, map them to the most semantically similar standard keywords.
4. EACH PATH MUST BE UNIQUE - do not repeat the same current-to-desired keyword combination OR the same current keyword to different desired keywords.
5. IMPORTANT: Each current self keyword should appear at most ONCE in your paths.
6. Generate ONLY ONE path for each current self keyword, matching it with the most relevant desired self keyword.
7. The total number of paths should be equal to the number of current self keywords or less.

CRITICAL: For each path, carefully analyze the semantic opposition between the keywords. For example:
- If "intelligent" is a desired keyword, the current self keyword should represent lacking intelligence (like "confused", "uninformed", or "unfocused"), NOT an unrelated state like "energized" or "happy"
- If "energized" is a desired keyword, the current self keyword should represent lacking energy (like "tired", "fatigued", or "lethargic"), NOT an unrelated state like "intelligent" or "uninspired"

Return your response as a JSON array where each element is a path object with the following structure:
[
  {
    "currentImagine": "keyword from current self",
    "selfImagine": "keyword from desired self",
    "betterThrough": "suggested activity/practice word",
    "similarWords": {
      "similarCurrentImagine": [
        { "original": "user's custom word", "mapped": "closest standard keyword" }
      ],
      "similarSelfImagine": [
        { "original": "user's custom word", "mapped": "closest standard keyword" }
      ]
    }
  }
]

For the similarWords property:
- Only include mappings for words that needed to be mapped to standard keywords
- If no mapping was needed for a path, include empty arrays
- Each path should have its own similarWords mapping specific to that path

IMPORTANT: Make your response ONLY the JSON array with no additional explanation or text. Do not exceed the number of paths beyond the number of current self keywords provided.
        `;

        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            throw new ApiError(500, "Gemini API key is not configured");
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

        const result = await model.generateContent(geminiPrompt);
        const responseText = result.response.text();

        // Clean the response text to handle markdown code blocks or other formatting
        // that might be wrapping the JSON
        const cleanResponse = responseText.replace(/```json|```/g, '').trim();

        try {
            const paths = JSON.parse(cleanResponse);
            // Use util.inspect to properly display nested arrays in console
            const util = await import('util');
            console.log("gemini-response", util.inspect(paths, { depth: null, colors: true }));
            return paths;
        } catch (parseError) {
            console.error("Error parsing Gemini API response:", parseError);
            console.error("Raw response:", responseText);

            // Attempt more aggressive cleanup for deeply problematic responses
            try {
                // Find anything that looks like a JSON array
                const jsonMatch = cleanResponse.match(/\[\s*\{.*\}\s*\]/s);
                if (jsonMatch) {
                    const jsonCandidate = jsonMatch[0];
                    const paths = JSON.parse(jsonCandidate);
                    const util = await import('util');
                    console.log("Successfully parsed after extraction:", util.inspect(paths, { depth: null, colors: true }));
                    return paths;
                }
            } catch (secondaryError) {
                console.error("Secondary parsing attempt failed:", secondaryError);
            }

            // If we can't parse the JSON, return a fallback response
            console.log("Returning fallback response");
            return [
                {
                    "currentImagine": "default",
                    "selfImagine": "default",
                    "betterThrough": "practice",
                    "similarWords": {
                        "similarCurrentImagine": [],
                        "similarSelfImagine": []
                    }
                }
            ];
        }

    } catch (error) {
        console.error("Error in geminiPathsGenerator:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        // Return a fallback response instead of throwing an error
        console.log("Returning fallback response after error");
        return [
            {
                "currentImagine": "default",
                "selfImagine": "default",
                "betterThrough": "practice",
                "similarWords": {
                    "similarCurrentImagine": [],
                    "similarSelfImagine": []
                }
            }
        ];
    }
};

export default geminiPathGenerator;