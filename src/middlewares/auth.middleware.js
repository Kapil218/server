import { verifyAccessToken, verifyRefreshToken } from "../utils/jwtTokens.js";
import { pool } from "../db/index.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwtTokens.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const refreshTokens = async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token not found");
  }

  const decodedData = await verifyRefreshToken(incomingRefreshToken);
  const userId = decodedData.id;

  const fetchedUser = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  const user = fetchedUser.rows[0];
  const savedRefreshToken = user.refresh_token;

  if (!savedRefreshToken || incomingRefreshToken !== savedRefreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  // Generate new tokens
  const newAccessToken = await generateAccessToken(
    user.id,
    user.name,
    user.email,
    user.role
  );
  const newRefreshToken = await generateRefreshToken(user.id);

  // Update the refresh token in DB
  await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
    newRefreshToken,
    user.id,
  ]);

  // Set new tokens in cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  res.cookie("accessToken", newAccessToken, options);
  res.cookie("refreshToken", newRefreshToken, options);

  // Attach new token to request so user can access the page
  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return newAccessToken; // Return new access token for internal use
};

const authMiddleware = asyncHandler(async (req, res, next) => {
  let accessToken =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!accessToken) {
    throw new ApiError(401, "Unauthorized - No Token Provided");
  }

  try {
    const decodedToken = await verifyAccessToken(accessToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    // Try refreshing tokens and proceed
    try {
      console.log("refreshing tokens");

      const refreshToken = await refreshTokens(req, res);
      req.user = await verifyAccessToken(refreshToken);
      next();
    } catch (refreshError) {
      throw new ApiError(403, "Invalid or Expired Token");
    }
  }
});

export default authMiddleware;
export { refreshTokens };
