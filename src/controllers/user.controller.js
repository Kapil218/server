import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwtTokens.js";
import { pool } from "../db/index.js";
import { hashValue, compareValue } from "../utils/bcrypt.js";

// --------------------------------------------------------------------------------------------------------------------------------------
// REGISTER
// ----------------------------------------------------------------------------------------------------------------------------------------------

const registerUser = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim() || "";
  const email = req.body.email?.trim().toLowerCase() || "";
  const role = req.body.role?.trim().toLowerCase() || "";
  const password = req.body.password?.trim() || "";

  if ([name, email, password, role].some((field) => field === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  if (userExists.rows.length > 0) {
    throw new ApiError(400, "User Already exists");
  }

  const hashedPassword = await hashValue(password);

  const newUser = await pool.query(
    "INSERT INTO users (name, email, password, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, role",
    [name, email, hashedPassword, role]
  );

  if (newUser.rows.length === 0) {
    throw new ApiError(500, "Error while creating user");
  }

  res
    .status(201)
    .json(new ApiResponse(201, newUser.rows[0], "User created successfully"));
});

// ----------------------------------------------------------------------------------------------------------------------------------------------
// LOGIN
// --------------------------------------------------------------------------------------------------------------------------------------------

const loginUser = asyncHandler(async (req, res, _) => {
  const email = req.body.email?.trim().toLowerCase() || "";
  const password = req.body.password?.trim() || "";

  if ([email, password].some((field) => field === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (userQuery.rows.length === 0) {
    throw new ApiError(404, "User not found");
  }

  const user = userQuery.rows[0];

  const isMatch = await compareValue(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
    throw new ApiError(500, "JWT secrets are missing");
  }

  const accessToken = await generateAccessToken(
    user.id,
    user.name,
    user.email,
    user.role
  );

  const refreshToken = await generateRefreshToken(user.id);

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
  await pool.query("UPDATE users SET refresh_token = NULL WHERE id = $1", [
    req.user.id,
  ]);

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

//----------------------------------------------------------------------------------------------------------------------------------------------
// GET USERS
//----------------------------------------------------------------------------------------------------------------------------------------------

const getUsers = asyncHandler(async (req, res, _) => {
  const users = await pool.query("SELECT * FROM users");
  res.status(200).json(new ApiResponse(200, users.rows, "Users fetched"));
});

export { registerUser, loginUser, logoutUser, refreshUserToken, getUsers };
