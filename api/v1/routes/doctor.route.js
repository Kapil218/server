import { Router } from "express";
import {
  addDoctor,
  getAllDoctors,
  deleteDoctor,
  updateDoctor,
  searchDoctors,
  filterDoctors,
} from "../controllers/doctor.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { roleCheck } from "../middlewares/roleCheck.middleware.js";

const route = new Router();

route.get("/", authMiddleware, getAllDoctors);
route.get("/search", authMiddleware, searchDoctors);
route.get("/filter", authMiddleware, filterDoctors);
route.post("/add-doctor", authMiddleware, roleCheck, addDoctor);
route.delete("/remove/:id", authMiddleware, roleCheck, deleteDoctor);
route.patch("/update/:id", authMiddleware, roleCheck, updateDoctor);

export default route;
