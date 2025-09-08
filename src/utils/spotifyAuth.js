import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

let accessToken = null;
let accessTokenExpiresAt = 0;

export const getUserAccessToken = async () => {
  if (accessToken && Date.now() < accessTokenExpiresAt) {
    return accessToken;
  }

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  accessToken = response.data.access_token;
  accessTokenExpiresAt = Date.now() + response.data.expires_in * 1000 - 60000;
  return accessToken;
};

export const withAuth = async (callback) => {
  const token = await getUserAccessToken();
  return callback(token);
};
