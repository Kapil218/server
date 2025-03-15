import { asyncHandler } from "../utils/asyncHandler.js";
import { pool } from "../db/index.js";

const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "Register User" });
});

const loginUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "Login User" });
});

const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "Logout User" });
});

const getUsers = asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT * FROM users");
  res.status(200).json({ users: result.rows });
});

export { registerUser, loginUser, logoutUser, getUsers };
