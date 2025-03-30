import asyncHandler from "../utils/asyncHandler.js";
import { pool } from "../../db/index.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";

const pendingReviewsOfUsers = asyncHandler(async (req, res, next) => {
  try {
    const patient_id = req.user.id;

    const query = `
      SELECT 
        a.id AS appointment_id, 
        a.appointment_time, 
        a.doctor_id,
        a.location, 
        a.consultation_type, 
        a.status 
      FROM appointments a
      LEFT JOIN reviews r ON a.id = r.appointment_id
      WHERE 
        a.patient_id = $1 
        AND a.status = 'completed'  -- Only completed appointments
        AND r.appointment_id IS NULL -- Appointments with no reviews
      ORDER BY a.appointment_time DESC;
    `;

    const { rows } = await pool.query(query, [patient_id]);

    res
      .status(200)
      .json(new ApiResponse(200, rows, "Pending reviews fetched successfully"));
  } catch (error) {
    next(
      new ApiError(500, "Something went wrong while fetching pending reviews")
    );
  }
});

const reviewHistoryOfUser = asyncHandler(async (req, res) => {
  const patient_id = req.user.id;

  if (!patient_id) {
    throw new ApiError(400, "Invalid user ID");
  }

  const reviews = await pool.query(
    "SELECT * FROM reviews WHERE patient_id = $1 ORDER BY created_at DESC",
    [patient_id]
  );

  if (reviews.rows.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No reviews found for this user"));
  }

  res
    .status(200)
    .json(new ApiResponse(200, reviews.rows, "Reviews fetched successfully"));
});

const addReview = asyncHandler(async (req, res) => {
  const { doctor_id, appointment_id, review, rating } = req.body;
  const patient_id = req.user.id;

  if (!doctor_id || !appointment_id || !rating || !review) {
    throw new ApiError(
      400,
      "Doctor ID, Appointment ID, Rating, and Review are required"
    );
  }
  if (rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const appointmentQuery = `
        SELECT * FROM appointments 
        WHERE id = $1 AND status = 'completed'
      `;
  const appointmentCheck = await pool.query(appointmentQuery, [appointment_id]);

  if (appointmentCheck.rows.length === 0) {
    throw new ApiError(404, "No valid completed appointment found to review");
  }

  const reviewCheck = await pool.query(
    "SELECT * FROM reviews WHERE appointment_id = $1",
    [appointment_id]
  );

  if (reviewCheck.rows.length > 0) {
    throw new ApiError(
      400,
      "You have already submitted a review for this appointment"
    );
  }

  const insertQuery = `
        INSERT INTO reviews (doctor_id, patient_id, appointment_id, review, rating, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *;
      `;
  const newReview = await pool.query(insertQuery, [
    doctor_id,
    patient_id,
    appointment_id,
    review,
    rating,
  ]);

  const avgRatingQuery = `
        SELECT AVG(rating) AS avg_rating 
        FROM reviews 
        WHERE doctor_id = $1;
      `;
  const avgRatingResult = await pool.query(avgRatingQuery, [doctor_id]);
  const avgRating = avgRatingResult.rows[0].avg_rating;

  const updateQuery = `
        UPDATE doctors 
        SET rating = $1 
        WHERE id = $2;
      `;
  const updateResult = await pool.query(updateQuery, [avgRating, doctor_id]);

  res
    .status(201)
    .json(new ApiResponse(201, newReview.rows[0], "Review added successfully"));
});

export { addReview, reviewHistoryOfUser, pendingReviewsOfUsers };
