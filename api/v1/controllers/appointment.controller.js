import asyncHandler from "../utils/asyncHandler.js";
import { pool } from "../../db/index.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { sendAppointmentEmail } from "../utils/mailService.js";

const getAllAppointments = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM appointments
    ORDER BY 
      CASE 
        WHEN status = 'pending' THEN 0 
        ELSE 1 
      END, 
      appointment_time ASC
  `);

  if (result.rowCount === 0) {
    throw new ApiError(404, "No appointments found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, result.rows, "Appointments fetched successfully")
    );
});

const bookAppointment = asyncHandler(async (req, res) => {
  const { doctor_id, appointment_time, location, consultation_type } = req.body;

  if (!doctor_id || !appointment_time || !location || !consultation_type) {
    throw new ApiError(400, "All fields are required");
  }

  const { date, shift, slot_time } = appointment_time;

  if (!date || !shift || !slot_time) {
    throw new ApiError(
      400,
      "Appointment time must include date, shift, and slot_time"
    );
  }

  const patient_id = req.user?.id;
  if (!patient_id) {
    throw new ApiError(
      403,
      "Unauthorized: User must login to book an appointment"
    );
  }

  const doctorExists = await pool.query(
    "SELECT id, available_times FROM doctors WHERE id = $1",
    [doctor_id]
  );

  if (doctorExists.rowCount === 0) {
    throw new ApiError(404, "Doctor not found");
  }

  let availableTimes =
    typeof doctorExists.rows[0].available_times === "string"
      ? JSON.parse(doctorExists.rows[0].available_times)
      : doctorExists.rows[0].available_times || {};

  // Ensure the selected date exists
  if (!availableTimes[date]) {
    throw new ApiError(400, "Doctor is not available on the selected date");
  }

  // Extract all available slots from all shifts (morning, afternoon, evening, etc.)
  const allAvailableSlots = Object.values(availableTimes[date]).flat();

  // Check if the selected slot_time exists in the available slots

  if (!allAvailableSlots.includes(slot_time)) {
    throw new ApiError(400, "Doctor is not available at the selected time");
  }

  // Check if the doctor already has an appointment at the same time
  const existingAppointment = await pool.query(
    "SELECT id FROM appointments WHERE doctor_id = $1 AND appointment_time = $2",
    [doctor_id, `${date}T${slot_time}`]
  );

  if (existingAppointment.rowCount > 0) {
    throw new ApiError(400, "This time slot is already booked");
  }

  // Insert the new appointment into the database
  const newAppointment = await pool.query(
    `INSERT INTO appointments 
      (patient_id, doctor_id, appointment_time, location, consultation_type, status) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
    [
      patient_id,
      doctor_id,
      `${date}T${slot_time}`, //"YYYY-MM-DDTHH:MM"
      location,
      consultation_type,
      "pending",
    ]
  );

  console.log(availableTimes);

  // Remove the booked slot from the correct shift
  availableTimes[date][shift] = availableTimes[date][shift].filter(
    (slot) => slot !== slot_time
  );

  // If no slots left in the shift, remove the shift
  if (availableTimes[date][shift].length === 0) {
    delete availableTimes[date][shift];
  }

  // If no shifts left for the day, remove the date
  if (Object.keys(availableTimes[date]).length === 0) {
    delete availableTimes[date];
  }

  // Update the doctor's available_times in the database
  await pool.query("UPDATE doctors SET available_times = $1 WHERE id = $2", [
    JSON.stringify(availableTimes),
    doctor_id,
  ]);

  // Send success response with the booked appointment details
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        newAppointment.rows[0],
        "Appointment booked successfully"
      )
    );
});

// update appointment status
const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) {
    throw new ApiError(400, "Appointment ID and status are required");
  }
  const appointment = await pool.query(
    "SELECT * FROM appointments WHERE id =$1",
    [id]
  );
  if (appointment.rowCount === 0) {
    throw new ApiError(200, "appointment not found ");
  }
  const updatedAppointment = await pool.query(
    "UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *",
    [status, id]
  );

  if (updatedAppointment.rowCount === 0) {
    throw new ApiError(500, "Could not update appointment");
  }

  const updatedData = updatedAppointment.rows[0];

  if (updatedData.status === "rejected" || updatedData.status === "approved") {
    const doctor = await pool.query("SELECT name FROM doctors WHERE id=$1", [
      updatedData.doctor_id,
    ]);

    if (doctor.rowCount === 0) {
      throw new ApiError(200, "doctor not found");
    }
    const doctor_name = doctor.rows[0].name;

    const patient = await pool.query("SELECT name FROM doctors WHERE id=$1", [
      updatedData.patient_id,
    ]);

    if (patient.rowCount === 0) {
      throw new ApiError(200, "doctor not found");
    }
    const userEmail = patient.rows[0].email;

    const dataToSend = {
      appointment_id: updatedData.id,
      doctor_name,
      userEmail,
      appointment_time: updatedData.appointment_time,
      location: updatedData.location,
      consultation_type: updatedData.consultation_type,
      status: status,
    };

    await sendAppointmentEmail(dataToSend);
  }
  res.status(200).json({
    success: true,
    message: `Appointment status updated to '${status}'`,
  });
});
export { bookAppointment, updateAppointmentStatus, getAllAppointments };
