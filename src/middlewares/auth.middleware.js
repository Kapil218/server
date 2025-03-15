import { verifyAccessToken } from "../utils/jwtTokens.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized - No Token Provided");
  }

  try {
    const decodedToken = await verifyAccessToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    throw new ApiError(403, "Invalid or Expired Token");
  }
});

export default authMiddleware;
