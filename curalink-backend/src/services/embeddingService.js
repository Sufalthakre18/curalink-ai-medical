import axios from "axios";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_EMBEDDING_MODEL =
  process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";
const HF_BASE = "https://api-inference.huggingface.co/models";

/**
 * Get embeddings from HuggingFace
 */
async function getHFEmbeddings(texts) {
  if (!HF_API_KEY || HF_API_KEY === "your_huggingface_api_key_here") {
    return null;
  }

  try {
    const response = await axios.post(
      `${HF_BASE}/${HF_EMBEDDING_MODEL}`,
      { inputs: texts },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    if (Array.isArray(response.data)) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.warn(
      `  [Embeddings] HuggingFace API failed: ${error.message} — falling back to TF-IDF`
    );
    return null;
  }
}

/**
 * Cosine similarity
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * TF-IDF Vector
 */
function buildTFIDFVector(text, vocabulary, idfMap) {
  const words = tokenize(text);
  const wordCount = {};

  for (const w of words) {
    wordCount[w] = (wordCount[w] || 0) + 1;
  }

  return vocabulary.map((term) => {
    const tf = (wordCount[term] || 0) / (words.length || 1);
    const idf = idfMap ? idfMap[term] || 1 : 1;
    return tf * idf;
  });
}

function buildIDFMap(texts, vocabulary) {
  const n = texts.length;
  const idfMap = {};

  for (const term of vocabulary) {
    const df = texts.filter((t) => tokenize(t).includes(term)).length;
    idfMap[term] = Math.log((n + 1) / (df + 1)) + 1;
  }

  return idfMap;
}

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function buildVocabulary(texts) {
  const termDF = {};

  for (const text of texts) {
    const words = new Set(tokenize(text));
    for (const w of words) {
      termDF[w] = (termDF[w] || 0) + 1;
    }
  }

  const n = texts.length;
  return Object.entries(termDF)
    .filter(([_, df]) => df >= 2 && df <= n * 0.8)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 500)
    .map(([term]) => term);
}

/**
 * Main similarity computation
 */
async function computeSimilarityScores(query, items) {
  const scores = new Map();
  if (items.length === 0) return scores;

  const itemTexts = items.map((item) =>
    `${item.title || ""} ${item.abstract || item.summary || ""}`.substring(
      0,
      1000
    )
  );

  const allTexts = [query, ...itemTexts];
  const embeddings = await getHFEmbeddings(
    allTexts.map((t) => t.substring(0, 512))
  );

  if (embeddings && embeddings.length === allTexts.length) {
    console.log("  [Embeddings] Using HuggingFace semantic embeddings");

    const queryEmbedding = embeddings[0];

    for (let i = 0; i < items.length; i++) {
      const sim = cosineSimilarity(queryEmbedding, embeddings[i + 1]);
      scores.set(items[i].id, sim);
    }
  } else {
    console.log("  [Embeddings] Using TF-IDF fallback similarity");

    const allTextsCombined = [query, ...itemTexts];
    const vocabulary = buildVocabulary(allTextsCombined);

    if (vocabulary.length === 0) {
      for (const item of items) {
        scores.set(
          item.id,
          keywordOverlapScore(query, itemTexts[items.indexOf(item)])
        );
      }
      return scores;
    }

    const idfMap = buildIDFMap(allTextsCombined, vocabulary);
    const queryVec = buildTFIDFVector(query, vocabulary, idfMap);

    for (let i = 0; i < items.length; i++) {
      const itemVec = buildTFIDFVector(
        itemTexts[i],
        vocabulary,
        idfMap
      );
      const rawSim = cosineSimilarity(queryVec, itemVec);
      scores.set(items[i].id, Math.min(1, Math.max(0, rawSim)));
    }
  }

  return scores;
}

/**
 * Keyword fallback
 */
function keywordOverlapScore(query, text) {
  const queryWords = new Set(tokenize(query));
  const textWords = new Set(tokenize(text));

  if (queryWords.size === 0) return 0;

  let overlap = 0;
  for (const w of queryWords) {
    if (textWords.has(w)) overlap++;
  }

  return overlap / queryWords.size;
}

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for",
  "of","with","by","from","up","about","into","through","during",
  "is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might",
  "this","that","these","those","it","its","we","they","he","she",
  "as","if","then","than","so","not","no","can","also","however",
  "which","who","whom","what","when","where","how","all","each",
  "both","few","more","most","other","some","such","than","too",
  "very","just","study","studies","research","result","results",
  "patient","patients","clinical","trial","method","methods",
]);

export { computeSimilarityScores, cosineSimilarity, tokenize };