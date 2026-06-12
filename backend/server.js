import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";

import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";

import trainingMatrixRoutes from "./routes/trainingMatrix.routes.js";
import workerRoutes from "./routes/workerRoutes.js";
import positionRoutes from "./routes/positionRoutes.js";
import trainingRoutes from "./routes/trainingMatrix.routes.js";

import complianceRoutes from "./routes/complianceRoutes.js";



import safetyRouter from "./routes/safetyRoutes.js";
import medicalRouter from "./routes/medicalRoutes.js";
import requestRouter from "./routes/requestRoutes.js";


// import bookingRouter from "./routes/bookingRoutes.js";
// import vehicleRouter from "./routes/vehicleRoutes.js";
// import costRouter from "./routes/costRoutes.js";

const app = express();
const port = process.env.PORT || 4000;
const allowedOrigins = [
  process.env.CLIENT_URL?.trim(),
  "http://localhost:5173",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

// middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// routes
app.get("/", (req, res) => res.send("API Working"));
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

// app.use("/uploads", express.static("uploads"));

app.use("/api/training-matrix", trainingMatrixRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/trainings", trainingRoutes);
app.use("/api/compliance", complianceRoutes);




app.use("/api/safety", safetyRouter);
app.use("/api/medical", medicalRouter);
app.use("/api/request", requestRouter);

// start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
