import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import connectDB from "./src/config/db.js";
import researchRoutes from "./src/routes/research.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
// Connect to MongoDB
// ─────────────────────────────────────────────
connectDB();

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); // request logging

// Rate limiting (prevent API abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 min
  message: { success: false, error: "Too many requests. Please try again later." },
});

app.use("/api/research/query", limiter);
app.use("/api/research/followup", limiter);

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.use("/api/research", researchRoutes);

// Root health check
app.get("/", (req, res) => {
  res.json({
    message: "🏥 CuraLink AI Medical Research Assistant API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      query: "POST /api/research/query",
      followup: "POST /api/research/followup",
      session: "GET /api/research/session/:sessionId",
      health: "GET /api/research/health",
      expand: "POST /api/research/expand",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║     🏥 CuraLink Backend Server Started      ║");
  console.log("╠════════════════════════════════════════════╣");
  console.log(`║  Port:     ${PORT}                              ║`);
  console.log(
    `║  Env:      ${process.env.NODE_ENV || "development"}                   ║`
  );
  console.log(
    `║  Ollama:   ${process.env.OLLAMA_BASE_URL || "not set"}    ║`
  );
  console.log(
    `║  Model:    ${process.env.OLLAMA_MODEL || "llama3.2"}                      ║`
  );
  console.log("╚════════════════════════════════════════════╝\n");
});

export default app;