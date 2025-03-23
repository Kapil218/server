import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

const roleCheck = asyncHandler(async (req, res, next) => {
  if (req.user.role === "admin") next();
  else {
    throw new ApiError(401, "User must be Admin to Perform this operation");
  }
});

export { roleCheck };
