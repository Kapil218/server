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
    "SELECT id, name, available_times FROM doctors WHERE id = $1",
    [doctor_id]
  );

  if (doctorExists.rowCount === 0) {
    throw new ApiError(404, "Doctor not found");
  }

  let availableTimes =
    typeof doctorExists.rows[0].available_times === "string"
      ? JSON.parse(doctorExists.rows[0].available_times)
      : doctorExists.rows[0].available_times || {};

  if (!availableTimes[date]) {
    throw new ApiError(400, "Doctor is not available on the selected date");
  }

  const allAvailableSlots = Object.values(availableTimes[date]).flat();

  if (!allAvailableSlots.includes(slot_time)) {
    throw new ApiError(400, "Doctor is not available at the selected time");
  }

  const existingAppointment = await pool.query(
    "SELECT id FROM appointments WHERE doctor_id = $1 AND appointment_time = $2",
    [doctor_id, `${date}T${slot_time}`]
  );

  if (existingAppointment.rowCount > 0) {
    throw new ApiError(400, "This time slot is already booked");
  }

  const newAppointment = await pool.query(
    `INSERT INTO appointments 
      (patient_id, doctor_id, appointment_time, location, consultation_type, status) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
    [
      patient_id,
      doctor_id,
      `${date}T${slot_time}`,
      location,
      consultation_type,
      "pending",
    ]
  );

  availableTimes[date][shift] = availableTimes[date][shift].filter(
    (slot) => slot !== slot_time
  );

  if (availableTimes[date][shift].length === 0) {
    delete availableTimes[date][shift];
  }

  if (Object.keys(availableTimes[date]).length === 0) {
    delete availableTimes[date];
  }

  await pool.query("UPDATE doctors SET available_times = $1 WHERE id = $2", [
    JSON.stringify(availableTimes),
    doctor_id,
  ]);

  // Fetch patient details correctly
  const patientData = await pool.query(
    "SELECT name, email FROM users WHERE id=$1",
    [patient_id]
  );

  if (patientData.rowCount === 0) {
    throw new ApiError(404, "Patient not found");
  }

  const patientEmail = patientData.rows[0].email;
  const patientName = patientData.rows[0].name;

  console.log(patientData.rows[0]);

  // Email Data
  const emailData = {
    appointment_id: newAppointment.rows[0].id,
    doctor_name: doctorExists.rows[0].name,
    patient_name: patientName,
    userEmail: patientEmail,
    appointment_time: `${date} at ${slot_time}`,
    location,
    consultation_type,
    status: "pending",
  };

  // Send Email
  await sendAppointmentEmail(emailData);

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        newAppointment.rows[0],
        "Appointment booked successfully. Confirmation email sent."
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
    throw new ApiError(404, "Appointment not found");
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
      throw new ApiError(404, "Doctor not found");
    }

    const doctor_name = doctor.rows[0].name;

    // Correcting the patient query to fetch details from the `users` table
    const patient = await pool.query(
      "SELECT name, email FROM users WHERE id=$1",
      [updatedData.patient_id]
    );

    if (patient.rowCount === 0) {
      throw new ApiError(404, "Patient not found");
    }

    const userEmail = patient.rows[0].email;
    const patient_name = patient.rows[0].name;

    const dataToSend = {
      appointment_id: updatedData.id,
      doctor_name,
      patient_name,
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
