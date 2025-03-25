// import express from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser";

// const app = express();

// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   })
// );

// app.use(express.json({ limit: "16kb" }));

// app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// app.use(express.static("public"));

// app.use(cookieParser());

// // routes
// import userRouter from "./routes/user.route.js";
// import doctorRouter from "./routes/doctor.route.js";

// app.use("/api/v1/users", userRouter);
// app.use("/api/v1/doctors", doctorRouter);

// export default app;

import express from "express";
import userRoutes from "./routes/user.route.js";
import doctorRoutes from "./routes/doctor.route.js";
import appointmentRoutes from "./routes/appointment.route.js";

const router = express.Router();

router.use("/users", userRoutes);
router.use("/doctors", doctorRoutes);
router.use("/appointments", appointmentRoutes);

export default router;
