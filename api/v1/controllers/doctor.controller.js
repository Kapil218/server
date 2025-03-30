import asyncHandler from "../utils/asyncHandler.js";
import { pool } from "../../db/index.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";

const getDoctors = asyncHandler(async (req, res, _) => {
  const {
    query,
    gender,
    experience,
    rating,
    page = 1,
    perPage = 6,
    topRated,
  } = req.query;

  let whereClause = " WHERE 1=1"; // Base condition
  const values = [];
  let count = 1;

  // Check if filters or search query are applied
  const hasFilters = query || gender || experience || rating;

  // If topRated=true and no filters/search, return top-rated doctors without pagination
  if (topRated === "true" && !hasFilters) {
    const topRatedQuery = `SELECT * FROM doctors ORDER BY rating DESC LIMIT 6`;
    const result = await pool.query(topRatedQuery);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { doctors: result.rows },
          "Top-rated doctors fetched successfully"
        )
      );
  }

  // Search filter (name or specialty)
  if (query) {
    whereClause += ` AND (name ILIKE $${count} OR specialty ILIKE $${count + 1})`;
    values.push(`%${query}%`, `%${query}%`);
    count += 2;
  }

  // Gender filter
  if (gender) {
    whereClause += ` AND gender ILIKE $${count}`;
    values.push(gender);
    count++;
  }

  // Experience filter
  if (experience) {
    if (experience.includes("-")) {
      const [minExp, maxExp] = experience.split("-").map(Number);
      whereClause += ` AND experience BETWEEN $${count} AND $${count + 1}`;
      values.push(minExp, maxExp);
      count += 2;
    } else {
      whereClause += ` AND experience >= $${count}`;
      values.push(parseInt(experience, 10));
      count++;
    }
  }

  // Rating filter
  if (!isNaN(parseInt(rating))) {
    whereClause += ` AND rating >= $${count}`;
    values.push(parseFloat(rating));
    count++;
  }

  // Get total count after applying filters
  const countQuery = `SELECT COUNT(*) FROM doctors ${whereClause}`;
  const totalResult = await pool.query(countQuery, values);
  const totalDoctors = parseInt(totalResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalDoctors / perPage);

  // Pagination
  const pageSize = Number(perPage) || 6;
  const currentPage = Number(page) || 1;
  const offset = (currentPage - 1) * pageSize;

  values.push(pageSize);
  values.push(offset);

  // Fetch filtered results with pagination
  const finalQuery = `
    SELECT * FROM doctors 
    ${whereClause} 
    ORDER BY rating DESC 
    LIMIT $${count} OFFSET $${count + 1}
  `;
  console.log(finalQuery);

  const result = await pool.query(finalQuery, values);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        doctors: result.rows,
        pagination:
          topRated !== "true"
            ? { totalDoctors, totalPages, currentPage, pageSize }
            : undefined, // No pagination for topRated=true case
      },
      "Doctors fetched successfully"
    )
  );
});

// get doctor by id
const getDoctorById = asyncHandler(async (req, res, _) => {
  const { id } = req.params; // Get doctor ID from request params

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Doctor ID is required" });
  }

  // Query to fetch a single doctor
  const query = `SELECT * FROM doctors WHERE id = $1 LIMIT 1`;

  try {
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, result.rows[0], "Doctor fetched successfully")
      );
  } catch (error) {
    console.error("Error fetching doctor:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const addDoctor = asyncHandler(async (req, res, _) => {
  const name = (req.body.name || "").trim();
  const specialty = (req.body.specialty || "").trim();
  const experience = parseInt(req.body.experience, 10);
  const degree = (req.body.degree || "").trim();
  const location = (req.body.location || "").trim();
  const gender = (req.body.gender || "").trim();
  const available_times = req.body.available_times || {};
  const created_by_admin = req.user?.id; // Ensure this is present

  if (
    !(
      name &&
      specialty &&
      degree &&
      location &&
      gender &&
      Object.keys(available_times).length > 0 &&
      created_by_admin
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  if (!Number.isInteger(experience) || experience < 0) {
    throw new ApiError(400, "Experience must be a positive integer");
  }

  const availableTimesJson =
    typeof available_times === "string"
      ? available_times
      : JSON.stringify(available_times);

  const newDoctor = await pool.query(
    `INSERT INTO doctors (name, specialty, experience, degree, location, available_times, gender, created_by_admin) 
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) RETURNING *`,
    [
      name,
      specialty,
      experience,
      degree,
      location,
      availableTimesJson,
      gender,
      created_by_admin,
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
  const experience =
    typeof req.body.experience === "number" ? req.body.experience : null;
  const degree = (req.body.degree || "").trim();
  const location = (req.body.location || "").trim();
  const available_times = req.body.available_times || {};
  const gender = (req.body.gender || "").trim();
  const rating =
    typeof req.body.rating === "number"
      ? parseFloat(req.body.rating.toFixed(1))
      : null;

  const existingDoctor = await pool.query(
    "SELECT * FROM doctors WHERE id = $1",
    [id]
  );

  if (existingDoctor.rowCount === 0) {
    throw new ApiError(404, "Doctor not found in database");
  }

  if (!req.user?.id) {
    throw new ApiError(403, "Unauthorized: Admin access required");
  }

  let updatedAvailability = {
    ...existingDoctor.rows[0].available_times,
    ...available_times,
  };

  const updatedDoctor = await pool.query(
    `UPDATE doctors 
      SET name = COALESCE(NULLIF($1, ''), name),
          specialty = COALESCE(NULLIF($2, ''), specialty),
          experience = COALESCE($3, experience),
          degree = COALESCE(NULLIF($4, ''), degree),
          location = COALESCE(NULLIF($5, ''), location),
          available_times = COALESCE(NULLIF($6::jsonb, '{}'::jsonb), available_times),
          gender = COALESCE(NULLIF($7, ''), gender),
          rating = COALESCE($8, rating),
          updated_by_admin = $9
      WHERE id = $10 RETURNING *`,
    [
      name,
      specialty,
      experience,
      degree,
      location,
      JSON.stringify(updatedAvailability),
      gender,
      rating,
      req.user.id,
      id,
    ]
  );

  return res
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
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Doctor not founded in database"));
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

export {
  addDoctor,
  getDoctors,
  updateDoctor,
  deleteDoctor,
  editDoctorSlots,
  getDoctorById,
};
