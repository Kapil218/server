import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./api/v1/utils/passportServices.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN.split(","),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(passport.initialize());

app.use(express.json({ limit: "16kb" }));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(cookieParser());

import apiRouter from "./api/index.js";

app.use("/api", apiRouter);

export default app;
