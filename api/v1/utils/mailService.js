import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.MAIL_PASS,
  },
});

const sendAppointmentEmail = async (data) => {
  if (!data) {
    console.error("Missing appointment details or user email.");
    return;
  }

  const emailContent = `
  <h2>Appointment Confirmation</h2>
  <p>Your appointment status has been changed to <strong>${data.status}</strong>.</p>
  <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">
    <tr>
      <th style="background-color: #f2f2f2;">Field</th>
      <th style="background-color: #f2f2f2;">Details</th>
    </tr>
    <tr>
      <td><strong>Appointment ID</strong></td>
      <td>${data.appointment_id}</td>
    </tr>
    <tr>
      <td><strong>Doctor</strong></td>
      <td>${data.doctor_name}</td>
    </tr>
    <tr>
      <td><strong>Patient</strong></td>
      <td>${data.patient_name}</td>
    </tr>
    <tr>
      <td><strong>Date & Time</strong></td>
      <td>${data.appointment_time}</td>
    </tr>
    <tr>
      <td><strong>Location</strong></td>
      <td>${data.location}</td>
    </tr>
    <tr>
      <td><strong>Consultation Type</strong></td>
      <td>${data.consultation_type}</td>
    </tr>
  </table>
  <p>Thank you for using our service.</p>
`;

  try {
    const info = await transporter.sendMail({
      from: '"Clinic Support" <aliceksr218@gmail.com>',
      to: data.userEmail,
      subject: "Your Appointment Status",
      html: emailContent,
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export { sendAppointmentEmail };
