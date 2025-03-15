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
  // get data from user
  const { name, email, password, role } = req.body;

  //   validations
  name = name.trim();
  email = email.trim().toLowerCase();
  role = role.trim().toLowerCase();
  password = password.trim();
  if (
    [name, email, password, role].some(
      (field) => typeof field === "string" && field === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if he already exists
  const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  if (userExists.rows.length > 0) {
    throw new ApiError(400, "User Already exists");
  }

  // hash password
  const hashedPassword = await hashValue(password);

  // create user
  const newUser = await pool.query(
    "INSERT INTO users (name, email, password, role, created_at) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
    [name, email, hashedPassword, role, Date.now()]
  );

  // check for user creation if not created successfully then send err
  if (newUser.rows.length === 0) {
    throw new ApiError(500, "Error while creating user");
  }

  // if created successfully remove password and refresh token field and send res to user
  res
    .status(201)
    .json(new ApiResponse(201, newUser.rows[0], "User created successfully"));
});

// ----------------------------------------------------------------------------------------------------------------------------------------------
// LOGIN
// --------------------------------------------------------------------------------------------------------------------------------------------

const loginUser = asyncHandler(async (req, res, _) => {
  const { email, password } = req.body;

  // Validate input
  email = email.trim().toLowerCase();
  password = password.trim();
  if (
    [email, password].some((field) => typeof field === "string" && field === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user exists
  const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (userQuery.rows.length === 0) {
    throw new ApiError(404, "User not found");
  }

  const user = userQuery.rows[0];

  // Compare passwords
  const isMatch = await compareValue(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
    throw new ApiError(500, "JWT secrets are missing");
  }

  // Generate access and refresh tokens
  const accessToken = await generateAccessToken(
    user.id,
    user.name,
    user.email,
    user.role
  );

  const refreshToken = await generateRefreshToken(user.id);

  // Store refresh token in DB
  await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
    refreshToken,
    user.id,
  ]);

  // Set token in cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  // in response data we are sending access and refresh token because if we have mobile app then it does not have cookies store like browser
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
