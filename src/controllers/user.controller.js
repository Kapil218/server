import { asyncHandler } from "../utils/asyncHandler.js";
import { pool } from "../db/index.js";
import { hashPassword } from "../utils/bcrypt.js";

const registerUser = asyncHandler(async (req, res) => {
  // get data from user
  const { name, email, password, role } = req.body;

  //   validations
  if (!name?.trim() || !email?.trim() || !password?.trim() || !role?.trim()) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // check if he already exists
  const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  if (userExists.rows.length > 0) {
    return res.status(400).json({ error: "User already exists" });
  }

  // hash password
  const hashedPassword = await hashPassword(password);

  // create user
  const newUser = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
    [name, email, hashedPassword, role]
  );

  // check for user creation if not created successfully then send err
  if (newUser.rows.length === 0) {
    return res.status(500).json({ error: "User registration failed" });
  }

  // if created successfully remove password and refresh token field and send res to user
  res
    .status(201)
    .json({ message: "User registered successfully", user: newUser.rows[0] });
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
