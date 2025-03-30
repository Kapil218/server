import { verifyAccessToken } from "../utils/jwtTokens.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

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
    throw new ApiError(403, "Invalid or Expired Token");
  }
});

export default authMiddleware;
