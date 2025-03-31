import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshUserToken,
  loginWithGoogle,
  loginWithGoogleCallback,
  getUserById,
} from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", authMiddleware, logoutUser);
router.post("/refresh", authMiddleware, refreshUserToken);
router.get("/profile", authMiddleware, getUserById);
router.get("/login/google", loginWithGoogle);
router.get("/login/google/callback", loginWithGoogleCallback);

export default router;
