import { Router } from "express";
import {
  addDoctor,
  getDoctors,
  deleteDoctor,
  updateDoctor,
  editDoctorSlots,
  getDoctorById,
} from "../controllers/doctor.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { roleCheck } from "../middlewares/roleCheck.middleware.js";

const router = Router();

router.get("/", getDoctors);
router.get("/:id", getDoctorById);
router.post("/add-doctor", authMiddleware, roleCheck, addDoctor);
router.delete("/remove/:id", authMiddleware, roleCheck, deleteDoctor);
router.patch("/update/:id", authMiddleware, roleCheck, updateDoctor);
router.patch("/updateSlots/:id", authMiddleware, roleCheck, editDoctorSlots);

export default router;
