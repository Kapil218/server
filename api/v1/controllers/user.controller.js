import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwtTokens.js";
import { pool } from "../../db/index.js";
import { hashValue, compareValue } from "../utils/bcrypt.js";

// --------------------------------------------------------------------------------------------------------------------------------------
// REGISTER
// ----------------------------------------------------------------------------------------------------------------------------------------------

const registerUser = asyncHandler(async (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = (req.body.password || "").trim();
  // Assigning role

  if ([name, email, password].some((field) => field === "")) {
    throw new ApiError(400, "All fields are required");
  }
  const role = email.endsWith("@tothenew.com") ? "admin" : "user";

  const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  const hashedPassword = await hashValue(password);
  if (userExists.rowCount > 0) {
    throw new ApiError(400, "User Already exists");
  }

  const newUser = await pool.query(
    "INSERT INTO users (name, email, password, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, role, created_at",
    [name, email, hashedPassword, role]
  );

  if (newUser.rowCount === 0) {
    throw new ApiError(500, "Error while creating user");
  }

  res
    .status(201)
    .json(new ApiResponse(201, newUser.rows[0], "User created successfully"));
});

// ----------------------------------------------------------------------------------------------------------------------------------------------
// LOGIN
// --------------------------------------------------------------------------------------------------------------------------------------------
const loginWithGoogle = asyncHandler(async (req, res) => {
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })(req, res, (err) => {
    if (err) {
      throw new ApiError(500, "Google authentication failed");
    }
    res.status(200).json(new ApiResponse(200, null, "Google login initiated"));
  });
});
const loginWithGoogleCallback = asyncHandler(async (req, res) => {
  passport.authenticate("google", {
    session: false,
  }),
    async (req, res) => {
      try {
        console.log("success", req.user);
        res.redirect(`http://localhost:5000/api/v1/employees`);
      } catch (err) {
        console.log("catch of google auth", err);
      }
    };
});
const loginUser = asyncHandler(async (req, res, _) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = (req.body.password || "").trim();

  if ([email, password].some((field) => field === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (userQuery.rowCount === 0) {
    throw new ApiError(404, "User not found");
  }

  const user = userQuery.rows[0];

  const isMatch = await compareValue(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = await generateAccessToken(
    user.id,
    user.name,
    user.email,
    user.role
  );

  const refreshToken = await generateRefreshToken(user.id, user.role);

  await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
    refreshToken,
    user.id,
  ]);

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          refreshToken,
          accessToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        "Login successful"
      )
    );
});

//----------------------------------------------------------------------------------------------------------------------------------------------
// LOGOUT
//----------------------------------------------------------------------------------------------------------------------------------------------

const logoutUser = asyncHandler(async (req, res, _) => {
  if (!req.user?.id) {
    throw new ApiError(400, "User not authenticated");
  }
  const result = await pool.query(
    "UPDATE users SET refresh_token = NULL WHERE id = $1",
    [req.user.id]
  );

  if (result.rowCount === 0) {
    throw new ApiError(404, "User not found");
  }
  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .status(200)
    .json(new ApiResponse(200, null, "Logout successful"));
});

//----------------------------------------------------------------------------------------------------------------------------------------------
// REFRESH TOKEN
//----------------------------------------------------------------------------------------------------------------------------------------------

const refreshUserToken = asyncHandler(async (req, res, _) => {
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

  if (!savedRefreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (incomingRefreshToken !== savedRefreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const newAccessToken = await generateAccessToken(
    user.id,
    user.name,
    user.email,
    user.role
  );

  const newRefreshToken = await generateRefreshToken(user.id);

  await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
    newRefreshToken,
    user.id,
  ]);

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .cookie("accessToken", newAccessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken: newAccessToken, refreshToken: newRefreshToken },
        "Access token refreshed"
      )
    );
});

export { registerUser, loginUser, logoutUser, refreshUserToken };
