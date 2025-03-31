import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshUserToken,
  loginWithGoogle,
  loginWithGoogleCallback,
} from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", authMiddleware, logoutUser);
router.post("/refresh", refreshUserToken);
router.get("/login/google", loginWithGoogle);
router.get("/login/google/callback", loginWithGoogleCallback);

export default router;
