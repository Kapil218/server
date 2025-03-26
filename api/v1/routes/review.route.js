import {
  addReview,
  reviewHistoryOfUser,
  j,
} from "../controllers/review.controller.js";

import { Router } from "express";
const router = Router();

router.route("/", reviewHistoryOfUser);
router.route("/add-review", addReview);
router.route("/review-pending", pendingReviewsOfUsers);

export default router;
