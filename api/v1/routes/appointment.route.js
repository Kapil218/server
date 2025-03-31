import { Router } from "express";
import {
  bookAppointment,
  updateAppointmentStatus,
  getAllAppointments,
  getAppointmentsByUser,
} from "../controllers/appointment.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { roleCheck } from "../middlewares/roleCheck.middleware.js";
const router = Router();

router.get("/", authMiddleware, roleCheck, getAllAppointments);
router.get(
  "/get-user-appointments",
  authMiddleware,
  roleCheck,
  getAppointmentsByUser
);
router.post("/book-appointment", authMiddleware, bookAppointment);
router.patch(
  "/updateStatus",
  authMiddleware,
  roleCheck,
  updateAppointmentStatus
);
export default router;
