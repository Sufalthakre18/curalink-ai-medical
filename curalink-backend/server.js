import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import https from "https";

import connectDB from "./src/config/db.js";
import researchRoutes from "./src/routes/research.js";

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

// ── CORS — allow localhost + any Vercel URL ──
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman / mobile
    const allowed = [
      "http://localhost:3000",
      "http://localhost:5173",
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    if (allowed.includes(origin) || origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }
    return callback(null, true); // open for hackathon demo
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, error: "Too many requests. Please try again later." },
});
app.use("/api/research/query", limiter);
app.use("/api/research/followup", limiter);

app.use("/api/research", researchRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "🏥 CuraLink AI Medical Research Assistant API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      query:    "POST /api/research/query",
      followup: "POST /api/research/followup",
      session:  "GET /api/research/session/:sessionId",
      health:   "GET /api/research/health",
      expand:   "POST /api/research/expand",
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  });
});

app.listen(PORT, () => {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║     🏥 CuraLink Backend Server Started      ║");
  console.log("╠════════════════════════════════════════════╣");
  console.log(`║  Port:     ${PORT}                              ║`);
  console.log(`║  Env:      ${process.env.NODE_ENV || "development"}                   ║`);
  console.log("╚════════════════════════════════════════════╝\n");
});

// ── Keep Render awake (ES module version — no require()) ──
if (process.env.NODE_ENV === "production") {
  const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || "https://curalink-ai-medical.onrender.com";
  setInterval(() => {
    https.get(keepAliveUrl, (res) => {
      console.log(`Keep-alive ping: ${res.statusCode}`);
    }).on("error", (e) => {
      console.log(`Keep-alive error: ${e.message}`);
    });
  }, 14 * 60 * 1000); // every 14 min
}

export default app;