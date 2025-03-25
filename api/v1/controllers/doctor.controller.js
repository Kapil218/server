import asyncHandler from "../utils/asyncHandler.js";
import { pool } from "../../db/index.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";

// Get all doctors
const getDoctors = asyncHandler(async (req, res, _) => {
  const { query, gender, experience, rating } = req.query;

  let baseQuery = "SELECT * FROM doctors WHERE 1=1"; // Always true condition for dynamic query
  const values = [];
  let count = 1;

  // Search by name or specialty (but not both)
  if (query) {
    baseQuery += " AND (name ILIKE $1 OR specialty ILIKE $1)";
    values.push(`%${query}%`);
    count++;
  }

  // Apply filters if provided
  if (gender) {
    baseQuery += ` AND gender = $${count++}`;
    values.push(gender);
  }
  if (!isNaN(parseInt(experience, 10))) {
    baseQuery += ` AND experience >= $${count++}`;
    values.push(parseInt(experience, 10));
  }
  if (!isNaN(parseFloat(rating))) {
    baseQuery += ` AND rating >= $${count++}`;
    values.push(parseFloat(rating));
  }

  const result = await pool.query(baseQuery, values);

  if (result.rowCount === 0) {
    throw new ApiError(404, "No matching doctors found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, result.rows, "Doctors fetched successfully"));
});

// Add a doctor
const addDoctor = asyncHandler(async (req, res, _) => {
  const name = (req.body.name || "").trim();
  const specialty = (req.body.specialty || "").trim();
  const experience = parseInt(req.body.experience, 10);
  const degree = (req.body.degree || "").trim();
  const location = (req.body.location || "").trim();
  const gender = (req.body.gender || "").trim();
  const available_times = req.body.available_times || {};

  if (
    !(
      name &&
      specialty &&
      degree &&
      location &&
      gender &&
      Object.keys(available_times).length > 0
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }
  if (!Number.isInteger(experience) || experience < 0) {
    throw new ApiError(400, "Experience must be a positive integer");
  }

  if (!req.user?.id) {
    throw new ApiError(403, "Unauthorized: Admin access required");
  }

  const availableTimesJson =
    typeof available_times === "string"
      ? available_times
      : JSON.stringify(available_times);

  const newDoctor = await pool.query(
    `INSERT INTO doctors (name, specialty, experience, rating, degree, location, available_times,gender, created_by_admin) 
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9) RETURNING *`,
    [
      name,
      specialty,
      experience,
      0.0,
      degree,
      location,
      availableTimesJson,
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
  let updatedAvailability = existingDoctor.rows[0].available_times;
  if (available_times) {
    updatedAvailability = { ...updatedAvailability, ...available_times };
  }

  const updatedDoctor = await pool.query(
    `UPDATE doctors 
    SET name = COALESCE(NULLIF($1, ''), name),
        specialty = COALESCE(NULLIF($2, ''), specialty),
        experience = COALESCE(NULLIF($3, ''), experience),
        degree = COALESCE(NULLIF($4, ''), degree),
        location = COALESCE(NULLIF($5, ''), location),
        available_times = COALESCE(NULLIF($6::jsonb, ''::jsonb), available_times),
        gender = COALESCE(NULLIF($7, ''), gender),
        updated_by = $8
    WHERE id = $9 RETURNING *`,
    [
      name,
      specialty,
      experience,
      degree,
      location,
      JSON.stringify(updatedAvailability),
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

// edit doctor slotes
const editDoctorSlots = asyncHandler(async (req, res, _) => {
  const { id } = req.params;
  const { date, slots } = req.body; // slots should be an array of time strings

  if (!date || !Array.isArray(slots)) {
    throw new ApiError(400, "Date and slots (array) are required");
  }

  const doctor = await pool.query(
    "SELECT available_times FROM doctors WHERE id = $1",
    [id]
  );

  if (doctor.rowCount === 0) {
    throw new ApiError(404, "Doctor not found");
  }

  let availableTimes = JSON.parse(doctor.rows[0].available_times || "{}");

  if (slots.length === 0) {
    delete availableTimes[date]; // Remove the date if no slots remain
  } else {
    availableTimes[date] = slots; // Update slots for the given date
  }

  await pool.query("UPDATE doctors SET available_times = $1 WHERE id = $2", [
    JSON.stringify(availableTimes),
    id,
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, availableTimes, "Slots updated successfully"));
});

export { addDoctor, getDoctors, updateDoctor, deleteDoctor, editDoctorSlots };
