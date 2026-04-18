import express from "express";
import { v4 as uuidv4 } from "uuid";

import Session from "../models/Session.js";
import { runResearchPipeline } from "../pipeline/researchPipeline.js";
import { expandQuery } from "../services/queryExpansion.js";
import { isOllamaAvailable } from "../services/llmService.js";

const router = express.Router();

/**
 * POST /query
 */
router.post("/query", async (req, res) => {
  try {
    const { sessionId, disease, query, location, patientName } = req.body;

    if (!disease && !query) {
      return res.status(400).json({
        success: false,
        error: "At least one of 'disease' or 'query' is required",
      });
    }

    let session;
    if (sessionId) {
      session = await Session.findOne({ sessionId });
    }

    if (!session) {
      const newSessionId = sessionId || uuidv4();
      session = new Session({
        sessionId: newSessionId,
        context: {
          disease: disease || "",
          location: location || "",
          queryHistory: [],
          lastQuery: "",
        },
        messages: [],
        cachedResults: { publications: [], clinicalTrials: [], cacheKey: "" },
      });
      await session.save();
    }

    const effectiveDisease = disease || session.context.disease || "";
    const effectiveLocation = location || session.context.location || "";
    const effectiveQuery = query || "";

    const result = await runResearchPipeline(
      {
        disease: effectiveDisease,
        query: effectiveQuery,
        location: effectiveLocation,
        patientName: patientName || "",
      },
      session
    );

    return res.json(result);
  } catch (error) {
    console.error("[/query Error]:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * POST /followup
 */
router.post("/followup", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: "sessionId and message are required",
      });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    const result = await runResearchPipeline(
      {
        disease: session.context.disease || "",
        query: message,
        location: session.context.location || "",
      },
      session
    );

    return res.json(result);
  } catch (error) {
    console.error("[/followup Error]:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * GET session
 */
router.get("/session/:sessionId", async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    return res.json({
      success: true,
      sessionId: session.sessionId,
      context: session.context,
      messages: session.messages,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE session
 */
router.delete("/session/:sessionId", async (req, res) => {
  try {
    await Session.deleteOne({ sessionId: req.params.sessionId });

    return res.json({
      success: true,
      message: "Session cleared",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /expand
 */
router.post("/expand", (req, res) => {
  try {
    const { disease, query, location } = req.body;
    const expanded = expandQuery({ disease, query, location });

    return res.json({
      success: true,
      expanded,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /health
 */
router.get("/health", async (req, res) => {
  const ollamaOk = await isOllamaAvailable();

  return res.json({
    success: true,
    status: "CuraLink Backend Running",
    services: {
      ollama: ollamaOk ? "available" : "unavailable",
      huggingface:
        process.env.HUGGINGFACE_API_KEY &&
        process.env.HUGGINGFACE_API_KEY !== "your_huggingface_api_key_here"
          ? "configured"
          : "not configured",
      pubmed: "available",
      openAlex: "available",
      clinicalTrials: "available",
    },
  });
});

export default router;