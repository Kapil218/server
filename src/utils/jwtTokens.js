import jwt from "jsonwebtoken";
import ApiError from "./ApiError.js";

// Generate Access Token
const generateAccessToken = (id, email, role) => {
  return jwt.sign({ id, email, role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

// Verify Access Token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(403, "Invalid or Expired Token");
  }
};

// Export functions
export { generateAccessToken, generateRefreshToken, verifyAccessToken };
