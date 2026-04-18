import axios from "axios";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_LLM_MODEL = process.env.HF_LLM_MODEL || "HuggingFaceH4/zephyr-7b-beta";
const HF_BASE = "https://api-inference.huggingface.co/models";

/**
 * Check if Ollama is available
 */
export async function isOllamaAvailable() {
  try {
    await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Call Ollama
 */
async function callOllama(systemPrompt, userPrompt) {
  const response = await axios.post(
    `${OLLAMA_BASE}/api/generate`,
    {
      model: OLLAMA_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        num_predict: 2048,
      },
    },
    { timeout: 120000 }
  );

  return response.data?.response || "";
}

/**
 * Call HuggingFace
 */
async function callHuggingFace(systemPrompt, userPrompt) {
  if (!HF_API_KEY || HF_API_KEY === "your_huggingface_api_key_here") {
    throw new Error("HuggingFace API key not configured");
  }

  const fullPrompt = `<|system|>\n${systemPrompt}</s>\n<|user|>\n${userPrompt}</s>\n<|assistant|>\n`;

  const response = await axios.post(
    `${HF_BASE}/${HF_LLM_MODEL}`,
    {
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: 1500,
        temperature: 0.2,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
        "x-wait-for-model": "true",
      },
      timeout: 180000,
    }
  );

  if (Array.isArray(response.data)) {
    return response.data[0]?.generated_text || "";
  }
  return response.data?.generated_text || "";
}

/**
 * System Prompt
 */
function buildSystemPrompt() {
  return `You are CuraLink, an expert AI Medical Research Assistant.

RULES:
- Use ONLY given data
- No hallucination
- Return STRICT JSON`;
}

/**
 * User Prompt
 */
function buildUserPrompt(expandedQuery, publications, clinicalTrials) {
  return `
QUERY: ${expandedQuery.primaryQuery}

PUBLICATIONS:
${JSON.stringify(publications.slice(0, 5))}

TRIALS:
${JSON.stringify(clinicalTrials.slice(0, 5))}

Return JSON only.
`;
}

/**
 * Main generator
 */
export async function generateResponse(
  expandedQuery,
  publications,
  clinicalTrials,
  conversationHistory = []
) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(expandedQuery, publications, clinicalTrials);

  let raw = "";
  let llmUsed = "";

  // Try Ollama
  if (await isOllamaAvailable()) {
    try {
      raw = await callOllama(systemPrompt, userPrompt);
      llmUsed = "Ollama";
    } catch {}
  }

  // Fallback HF
  if (!raw && HF_API_KEY) {
    try {
      raw = await callHuggingFace(systemPrompt, userPrompt);
      llmUsed = "HuggingFace";
    } catch {}
  }

  // Fallback basic
  if (!raw) {
    return {
      structured: {
        summary: "Fallback response",
        publications: publications.slice(0, 5),
        trials: clinicalTrials.slice(0, 5),
      },
      llmUsed: "fallback",
      raw: null,
    };
  }

  return {
    structured: parseJSON(raw),
    llmUsed,
    raw,
  };
}

/**
 * Safe JSON parser
 */
function parseJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return {};
  }
}