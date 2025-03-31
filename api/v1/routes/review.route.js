import {
  addReview,
  reviewHistoryOfUser,
  pendingReviewsOfUsers,
  getDoctorReviews,
} from "../controllers/review.controller.js";

import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
const router = Router();

router.get("/", authMiddleware, reviewHistoryOfUser);
router.post("/add-review", authMiddleware, addReview);
router.get("/review-pending", authMiddleware, pendingReviewsOfUsers);
router.get("/doctor-reviews/:id", authMiddleware, getDoctorReviews);

export default router;
