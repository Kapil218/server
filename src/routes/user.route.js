import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getUsers,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/").get(getUsers);
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(logoutUser);

export default router;
