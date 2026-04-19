import axios from "axios";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_LLM_MODEL = process.env.HF_LLM_MODEL || "HuggingFaceH4/zephyr-7b-beta";
const HF_BASE = "https://api-inference.huggingface.co/models";

/**
 * LLM Service
 *
 * Priority order:
 *   1. Ollama (local - best quality, no rate limits)
 *   2. HuggingFace Inference API (cloud fallback)
 *
 * The LLM receives a detailed system prompt + structured research context
 * and generates a structured medical research response.
 */

/**
 * Check if Ollama is available
 */
async function isOllamaAvailable() {
  try {
    await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Call Ollama local LLM
 */
async function callOllama(systemPrompt, userPrompt) {
  try {
    const response = await axios.post(
      `${OLLAMA_BASE}/api/generate`,
      {
        model: OLLAMA_MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        options: {
          temperature: 0.3, // Low temp for factual medical responses
          top_p: 0.9,
          num_predict: 2048,
        },
      },
      { timeout: 120000 } // 2 min timeout for local inference
    );

    return response.data?.response || "";
  } catch (error) {
    console.error(`  [Ollama Error]: ${error.message}`);
    throw error;
  }
}

/**
 * Call HuggingFace Inference API
 */
async function callHuggingFace(systemPrompt, userPrompt) {
  if (!HF_API_KEY || HF_API_KEY === "your_huggingface_api_key_here") {
    throw new Error("HuggingFace API key not configured");
  }

  try {
    // Zephyr-7b-beta uses ChatML format
    const fullPrompt = `<|system|>\n${systemPrompt}</s>\n<|user|>\n${userPrompt}</s>\n<|assistant|>\n`;

    const response = await axios.post(
      `${HF_BASE}/${HF_LLM_MODEL}`,
      {
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 1500,  // reduced for free tier speed
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
          "x-wait-for-model": "true",  // wait if model is loading
        },
        timeout: 180000, // 3 min — HF free tier can be slow
      }
    );

    if (Array.isArray(response.data)) {
      return response.data[0]?.generated_text || "";
    }
    return response.data?.generated_text || "";
  } catch (error) {
    console.error(`  [HuggingFace Error]: ${error.message}`);
    throw error;
  }
}

/**
 * Generate the system prompt for the medical research assistant
 */
function buildSystemPrompt() {
  return `You are CuraLink, an AI Medical Research Assistant that synthesises evidence from multiple research papers.

ABSOLUTE RULES — follow these strictly:
1. NEVER hallucinate or invent facts not present in the provided papers
2. ALWAYS synthesize from MULTIPLE papers — never rely on a single paper
3. FORBIDDEN phrases: "The most relevant study is...", "One study found..."
4. REQUIRED phrases: "Available research suggests...", "Evidence from multiple studies indicates...", "Based on the retrieved publications..."
5. If evidence is weak or indirect → explicitly say "Limited or indirect evidence is available"
6. If NO papers directly address the query → say "No direct research evidence was found for this specific question"
7. Be precise with medical terms, include appropriate disclaimers
8. Output ONLY valid JSON — no markdown, no preamble

Your output must be valid JSON.`;
}

/**
 * Build the user prompt with research context
 */
function buildUserPrompt(expandedQuery, publications, clinicalTrials, conversationHistory = [], relevanceResult = null) {
  const { disease, query, location, primaryQuery } = expandedQuery;

  // Format publications for LLM
  const pubContext = publications.slice(0, 8).map((pub, i) => ({
    index: i + 1,
    title: pub.title,
    abstract: pub.abstract?.substring(0, 400) || "",
    authors: pub.authors?.slice(0, 3).join(", ") || "",
    year: pub.year,
    source: pub.source,
    url: pub.url,
  }));

  // Format clinical trials for LLM
  const trialContext = clinicalTrials.slice(0, 6).map((trial, i) => ({
    index: i + 1,
    title: trial.title,
    status: trial.status,
    phase: trial.phase,
    summary: trial.summary?.substring(0, 300) || "",
    eligibility: trial.eligibility?.substring(0, 200) || "",
    location: trial.locations?.slice(0, 2).map(l => `${l.city}, ${l.country}`).join("; ") || "",
    contact: trial.contact?.email || trial.contact?.phone || "",
    url: trial.url,
  }));

  // Build conversation history context
  const historyContext = conversationHistory.length > 0
    ? `\nPREVIOUS CONVERSATION CONTEXT:\n${conversationHistory
        .slice(-4) // last 4 messages
        .map(m => `${m.role.toUpperCase()}: ${m.content.substring(0, 200)}`)
        .join("\n")}\n`
    : "";

  // Build relevance context for the LLM
  const relevanceContext = relevanceResult
    ? `
EVIDENCE QUALITY ASSESSMENT:
- Relevance Level: ${relevanceResult.relevanceLevel}
- Evidence Summary: ${relevanceResult.evidenceSummary}
- Papers that directly address this query: ${relevanceResult.passingCount ?? pubContext.length}

IMPORTANT INSTRUCTIONS BASED ON EVIDENCE LEVEL:
${relevanceResult.relevanceLevel === "NONE"
  ? "- NO papers directly address this query. State clearly that no direct evidence was found. Do NOT fabricate connections. Say: 'No direct research evidence was found for this specific question.'"
  : relevanceResult.relevanceLevel === "LOW"
  ? "- Only limited/indirect evidence available. Explicitly state this limitation. Say: 'Limited direct evidence available — only indirect research found.'"
  : relevanceResult.relevanceLevel === "PARTIAL"
  ? "- Moderate evidence available. Note where evidence is direct vs indirect."
  : "- Good evidence base. Cite specific papers for each claim."
}
`
    : "";

  return `${historyContext}
PATIENT CONTEXT:
- Disease/Condition: ${disease || "General"}
- Specific Query: ${query || "General research"}
- Location: ${location || "Not specified"}
- Full Search Query: ${primaryQuery}
${relevanceContext}
RESEARCH PUBLICATIONS (${pubContext.length} papers — pre-filtered for relevance):
${JSON.stringify(pubContext, null, 2)}

CLINICAL TRIALS (${trialContext.length} trials retrieved):
${JSON.stringify(trialContext, null, 2)}

TASK: Synthesise the retrieved research papers into a structured medical response.

SYNTHESIS RULES:
- Write findings as: "Available research suggests...", "Evidence indicates...", "Studies show..."
- NEVER write: "The most relevant study is..." or "One paper found..."
- If relevanceLevel is NONE → personalizedInsight must start with: "No direct research evidence was found for this specific question."
- If relevanceLevel is LOW or PARTIAL → clearly state: "Limited or indirect evidence is available for this question."
- Always reference patterns across papers, not single papers
- NEVER assume beyond what the papers say

Return ONLY a valid JSON object with this EXACT structure:
{
  "conditionOverview": {
    "condition": "disease name",
    "summary": "2-3 sentence overview of current medical understanding",
    "keyFacts": ["fact 1", "fact 2", "fact 3"]
  },
  "researchInsights": {
    "summary": "Overall summary of what the research shows about the query",
    "keyFindings": [
      {
        "finding": "Specific finding statement",
        "supportedBy": "Publication title (Year)",
        "significance": "Why this matters clinically"
      }
    ],
    "consensus": "What the research collectively suggests",
    "gaps": "Areas where research is still needed or inconclusive"
  },
  "clinicalTrials": {
    "summary": "Overview of active trial landscape",
    "highlighted": [
      {
        "title": "Trial title",
        "status": "RECRUITING/COMPLETED/etc",
        "phase": "Phase",
        "keyDetail": "Most important thing to know about this trial",
        "forWhom": "Patient eligibility summary",
        "location": "Location info",
        "contact": "Contact info",
        "url": "URL"
      }
    ]
  },
  "personalizedInsight": "Specific advice tailored to this patient's query and disease context. Mention what they should discuss with their doctor.",
  "disclaimer": "Medical disclaimer about consulting healthcare providers",
  "sources": [
    {
      "title": "paper title",
      "authors": "author names",
      "year": "year",
      "source": "PubMed/OpenAlex",
      "url": "url",
      "snippet": "1-2 sentence supporting snippet from abstract"
    }
  ]
}`;
}

/**
 * Main LLM generation function
 *
 * @param {Object} expandedQuery
 * @param {Array} publications
 * @param {Array} clinicalTrials
 * @param {Array} conversationHistory
 * @returns {Object} structured response
 */
async function generateResponse(expandedQuery, publications, clinicalTrials, conversationHistory = [], relevanceResult = null) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(expandedQuery, publications, clinicalTrials, conversationHistory, relevanceResult);

  let rawResponse = "";
  let llmUsed = "";

  // Try Ollama first (local, best quality)
  const ollamaAvailable = await isOllamaAvailable();
  if (ollamaAvailable) {
    console.log(`  [LLM] Using Ollama (${OLLAMA_MODEL})`);
    try {
      rawResponse = await callOllama(systemPrompt, userPrompt);
      llmUsed = `Ollama (${OLLAMA_MODEL})`;
    } catch (error) {
      console.warn("  [LLM] Ollama failed, trying HuggingFace...");
    }
  }

  // Fallback to HuggingFace
  if (!rawResponse && HF_API_KEY && HF_API_KEY !== "your_huggingface_api_key_here") {
    console.log(`  [LLM] Using HuggingFace (${HF_LLM_MODEL})`);
    try {
      rawResponse = await callHuggingFace(systemPrompt, userPrompt);
      llmUsed = `HuggingFace (${HF_LLM_MODEL})`;
    } catch (error) {
      console.warn("  [LLM] HuggingFace also failed:", error.message);
    }
  }

  // If both fail, generate structured response from data directly
  if (!rawResponse) {
    console.warn("  [LLM] No LLM available — generating rule-based response");
    llmUsed = "Rule-based (No LLM configured)";
    return {
      structured: buildFallbackResponse(expandedQuery, publications, clinicalTrials, relevanceResult),
      llmUsed,
      raw: null,
    };
  }

  // Parse LLM response
  const structured = parseStructuredResponse(rawResponse, expandedQuery, publications, clinicalTrials);

  return { structured, llmUsed, raw: rawResponse };
}

/**
 * Parse and validate LLM JSON response
 */
function parseStructuredResponse(rawResponse, expandedQuery, publications, clinicalTrials) {
  try {
    // Extract JSON from response (LLM might add text around it)
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate critical fields
    if (!parsed.conditionOverview) throw new Error("Missing conditionOverview");
    if (!parsed.researchInsights) throw new Error("Missing researchInsights");

    return parsed;
  } catch (error) {
    console.warn(`  [LLM] JSON parse failed: ${error.message} — using fallback structure`);
    return buildFallbackResponse(expandedQuery, publications, clinicalTrials);
  }
}

/**
 * Rule-based fallback when LLM is unavailable
 */
function buildFallbackResponse(expandedQuery, publications, clinicalTrials, relevanceResult = null) {
  const { disease, query, primaryQuery } = expandedQuery;

  const recruitingTrials = clinicalTrials.filter(t => t.status === "RECRUITING");
  const recentPubs = publications.filter(p => parseInt(p.year) >= 2022);
  const topPubs = publications.slice(0, 5);

  const keyFindings = topPubs.map((pub) => ({
    finding: pub.title,
    supportedBy: `${pub.authors?.[0] || "Authors"} et al. (${pub.year})`,
    significance: pub.abstract?.substring(0, 250) + "..." || "See full abstract for details.",
  }));

  const trialHighlights = clinicalTrials.slice(0, 6).map((t) => ({
    title: t.title,
    status: t.status,
    phase: t.phase || "Not specified",
    keyDetail: t.summary?.substring(0, 300) || "See trial page for details.",
    forWhom: t.eligibility?.substring(0, 200) || "See eligibility criteria on trial page.",
    location: t.locations?.slice(0, 2).map(l => [l.city, l.country].filter(Boolean).join(", ")).join("; ") || "See trial page",
    contact: t.contact?.email || t.contact?.phone || "See trial page for contact info.",
    url: t.url,
  }));

  return {
    conditionOverview: {
      condition: disease || query || "Medical Research",
      summary: `${disease || query} is an active area of medical research. Analysis of ${publications.length} publications from PubMed and OpenAlex, along with ${clinicalTrials.length} clinical trials from ClinicalTrials.gov, reveals ongoing scientific investigation into ${query ? `"${query}"` : "treatments and management strategies"} for this condition. ${recentPubs.length} of the retrieved publications are from 2022 or later, indicating active recent research.`,
      keyFacts: [
        `${publications.length} peer-reviewed publications retrieved and ranked by relevance`,
        `${clinicalTrials.length} clinical trials found — ${recruitingTrials.length} currently recruiting`,
        `${recentPubs.length} publications from 2022–present showing active research momentum`,
        disease && query ? `Research specifically examines the relationship between ${disease} and ${query}` : `Research covers current understanding and treatment landscape`,
      ].filter(Boolean),
    },
    researchInsights: {
      summary: `Based on analysis of ${publications.length} research publications, the scientific literature shows active investigation into ${primaryQuery}. The top-ranked publications below represent the most relevant, recent, and credible findings from PubMed and OpenAlex databases.`,
      keyFindings,
      consensus: `The retrieved publications collectively suggest that ${query || disease} remains an important area of clinical and scientific investigation. Researchers are actively publishing findings that may inform treatment decisions and patient care strategies.`,
      gaps: `While the literature provides substantial information on ${primaryQuery}, patients and clinicians should note that research is ongoing. Individual patient factors, comorbidities, and clinical context significantly influence treatment suitability. Consultation with a specialist is recommended to interpret these findings in a personalized context.`,
    },
    clinicalTrials: {
      summary: `${clinicalTrials.length} clinical trials identified related to ${disease || query}. ${recruitingTrials.length > 0 ? `${recruitingTrials.length} trials are currently RECRUITING participants.` : "No actively recruiting trials found — check completed trials for established results."}`,
      highlighted: trialHighlights,
    },
    personalizedInsight: relevanceResult?.relevanceLevel === "NONE"
      ? `No direct research evidence was found for this specific question: "${query || primaryQuery}". The retrieved papers cover related topics but do not directly address your query. Evidence from multiple publications indicates that this specific combination (${query} with ${disease || "this condition"}) has limited dedicated research. We recommend asking your healthcare provider directly, or trying a broader search.`
      : relevanceResult?.relevanceLevel === "LOW"
      ? `Limited or indirect evidence is available for "${query || primaryQuery}" in the context of ${disease || "this condition"}. Available research suggests related findings, but no studies directly address this exact question. Based on ${publications.length} retrieved publications, the evidence is indirect. Discuss these findings with your specialist.`
      : `Based on ${publications.length} research publications and ${clinicalTrials.length} clinical trials retrieved for "${primaryQuery}": Available evidence suggests ${recentPubs.length > 5 ? "active" : "emerging"} research in this area. ${recruitingTrials.length > 0 ? `Evidence from ${recruitingTrials.length} currently recruiting trials may be relevant — review eligibility criteria above.` : ""} We recommend discussing these findings with your healthcare provider or a specialist in ${disease || "this condition"}.`,
    disclaimer: "⚠️ This information is generated for educational and research purposes only. It does not constitute medical advice, diagnosis, or treatment recommendations. Always consult a qualified healthcare professional before making any medical decisions. Clinical trial eligibility must be confirmed with the trial team.",
    sources: publications.slice(0, 8).map((pub) => ({
      title: pub.title,
      authors: pub.authors?.slice(0, 3).join(", ") || "Unknown authors",
      year: String(pub.year),
      source: pub.source,
      url: pub.url,
      snippet: pub.abstract?.substring(0, 220) + "..." || "Abstract not available.",
    })),
  };
}

export { generateResponse, isOllamaAvailable };