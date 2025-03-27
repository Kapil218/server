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
    <p>Your appointment status has been changed To ${data.status}.</p>
    <p><strong>Appointment ID:</strong> ${data.appointment_id}</p>
    <p><strong>Doctor :</strong> ${data.doctor_name}</p>
    <p><strong>Date & Time:</strong> ${data.appointment_time}</p>
    <p><strong>Location:</strong> ${data.location}</p>
    <p><strong>Consultation Type:</strong> ${data.consultation_type}</p>
    <p>Thank you for using our service.</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"Clinic Support" <aliceksr218@gmail.com>',
      to: data.userEmail,
      subject: "Your Appointment Status",
      html: emailContent,
    });

    console.log("Appointment email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export { sendAppointmentEmail };
