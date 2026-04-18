import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const SessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },

    // Accumulated context across turns
    context: {
      disease: { type: String, default: "" },
      location: { type: String, default: "" },
      queryHistory: [{ type: String }],
      lastQuery: { type: String, default: "" },
    },

    // Full message history for LLM context
    messages: [MessageSchema],

    // Cached research results
    cachedResults: {
      publications: { type: Array, default: [] },
      clinicalTrials: { type: Array, default: [] },
      cacheKey: { type: String, default: "" },
      cachedAt: { type: Date },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", SessionSchema);

export default Session;