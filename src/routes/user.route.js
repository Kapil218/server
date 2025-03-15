import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getUsers,
} from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(getUsers);
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(authMiddleware, logoutUser);

export default router;
