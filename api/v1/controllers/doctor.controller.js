import asyncHandler from "../utils/asyncHandler.js";
import { pool } from "../../db/index.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

// Get all doctors
const getAllDoctors = asyncHandler(async (req, res, _) => {
  const doctors = await pool.query("SELECT * FROM doctors");
  if (doctors.rowCount === 0) {
    throw new ApiError(404, "No doctors found");
  }
  res.status(200).json(new ApiResponse(200, doctors.rows, "Doctors fetched"));
});

// Add a doctor
const addDoctor = asyncHandler(async (req, res, _) => {
  const name = (req.body.name || "").trim();
  const specialty = (req.body.specialty || "").trim();
  const experience = (req.body.experience || "").trim();
  const degree = (req.body.degree || "").trim();
  const location = (req.body.location || "").trim();
  const available_times = req.body.available_times || "";
  const gender = (req.body.gender || "").trim();

  if (
    [
      name,
      specialty,
      experience,
      degree,
      location,
      available_times,
      gender,
    ].some((field) => field === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  if (!req.user?.id) {
    throw new ApiError(403, "Unauthorized: Admin access required");
  }

  const newDoctor = await pool.query(
    `INSERT INTO doctors (name, specialty, experience, rating, degree, location, available_times,gender, created_by_admin) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      name,
      specialty,
      experience,
      0.0,
      degree,
      location,
      JSON.stringify(available_times),
      gender,
      req.user.id,
    ]
  );

  res
    .status(201)
    .json(new ApiResponse(201, newDoctor.rows[0], "Doctor added successfully"));
});

// Update a doctor
const updateDoctor = asyncHandler(async (req, res, _) => {
  const { id } = req.params;

  const name = (req.body.name || "").trim();
  const specialty = (req.body.specialty || "").trim();
  const experience = (req.body.experience || "").trim();
  const degree = (req.body.degree || "").trim();
  const location = (req.body.location || "").trim();
  const available_times = req.body.available_times || "";
  const gender = (req.body.gender || "").trim();

  const existingDoctor = await pool.query(
    "SELECT * FROM doctors WHERE id = $1",
    [id]
  );

  if (existingDoctor.rowCount === 0) {
    return res.status(404).json(new ApiResponse(404, null, "Doctor not found"));
  }

  if (!req.user?.id) {
    throw new ApiError(403, "Unauthorized: Admin access required");
  }
  const updatedDoctor = await pool.query(
    `UPDATE doctors 
  SET name = COALESCE(NULLIF($1, ''), name),
      specialty = COALESCE(NULLIF($2, ''), specialty),
      experience = COALESCE(NULLIF($3, ''), experience),
      degree = COALESCE(NULLIF($4, ''), degree),
      location = COALESCE(NULLIF($5, ''), location),
      available_times = COALESCE(NULLIF($6, ''), available_times),
      gender = COALESCE(NULLIF($7, ''), gender),
      updated_by = $8
  WHERE id = $9 RETURNING *`,
    [
      name,
      specialty,
      experience,
      degree,
      location,
      available_times,
      gender,
      req.user.id,
      id,
    ]
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedDoctor.rows[0], "Doctor updated successfully")
    );
});

// Delete a doctor
const deleteDoctor = asyncHandler(async (req, res, _) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Doctor ID not given");
  }

  const existingDoctor = await pool.query(
    "SELECT * FROM doctors WHERE id = $1",
    [id]
  );

  if (existingDoctor.rowCount === 0) {
    return res.status(404).json(new ApiResponse(404, null, "Doctor not found"));
  }

  const deletedDoctor = await pool.query(
    "DELETE FROM doctors WHERE id = $1 RETURNING *",
    [id]
  );

  if (deletedDoctor.rowCount === 0) {
    throw new ApiError(500, "doctor deletion failed");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Doctor deleted successfully"));
});

// search doctor by name or spaciality
const searchDoctors = asyncHandler(async (req, res, _) => {
  const query = (req.query.query || "").trim();

  if (!query) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Search query is required"));
  }

  const result = await pool.query(
    `SELECT * FROM doctors WHERE name ILIKE $1 OR specialty ILIKE $1`,
    [`%${query}%`]
  );

  if (result.rowCount === 0) {
    throw new ApiError(404, "No doctors found matching your search");
  }

  res
    .status(200)
    .json(new ApiResponse(200, result.rows, "Doctors fetched successfully"));
});

// filter doctor by rating gender experience
const filterDoctors = asyncHandler(async (req, res, _) => {
  const gender = (req.query.gender || "").trim();
  const experience = parseInt(req.query.experience, 10);
  const rating = parseFloat(req.query.rating);

  let base_query = "SELECT * FROM DOCTORS WHERE 1=1";
  const values = [];
  let count = 1;

  if (!(gender || experience || rating)) {
    return ApiError("atleast one filter is required");
  }
  if (gender) {
    values.push(gender);
    base_query += ` AND gender = $${count++}`;
  }
  if (!isNaN(experience)) {
    values.push(experience);
    base_query += ` AND experience >= $${count++}`;
  }

  if (!isNaN(rating)) {
    values.push(rating);
    base_query += ` AND rating >= $${count++}`;
  }

  const result = await pool.query(base_query, values);

  if (result.rowCount === 0) {
    throw new ApiError(404, "No doctors match found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, result.rows, "Doctors fetched successfully"));
});

export {
  addDoctor,
  getAllDoctors,
  updateDoctor,
  deleteDoctor,
  searchDoctors,
  filterDoctors,
};
