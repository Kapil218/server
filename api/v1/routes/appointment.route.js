import { Router } from "express";
import {
  bookAppointment,
  updateAppointmentStatus,
  getAllAppointments,
} from "../controllers/appointment.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { roleCheck } from "../middlewares/roleCheck.middleware.js";
const router = Router();

router.get("/", authMiddleware, roleCheck, getAllAppointments);
router.post("/book-appointment", authMiddleware, roleCheck, bookAppointment);
router.patch(
  "/updateStatus",
  authMiddleware,
  roleCheck,
  updateAppointmentStatus
);
export default router;
