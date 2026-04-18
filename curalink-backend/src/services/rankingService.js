import { computeSimilarityScores } from "./embeddingService.js";

const FINAL_COUNT = parseInt(process.env.FINAL_RESULTS_COUNT) || 8;

const WEIGHTS = {
  semanticSimilarity: 0.40,
  recency: 0.25,
  credibility: 0.20,
  keywordMatch: 0.15,
};

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Rank publications
 */
async function rankPublications(publications, query, topN = FINAL_COUNT) {
  if (!publications || publications.length === 0) return [];

  console.log(`  [Ranking] Scoring ${publications.length} publications...`);

  const deduped = deduplicateByTitle(publications);
  console.log(`  [Ranking] After dedup: ${deduped.length} publications`);

  const filtered = deduped.filter(
    (p) => p.abstract && p.abstract.length > 50
  );
  console.log(`  [Ranking] After abstract filter: ${filtered.length}`);

  const simScores = await computeSimilarityScores(query, filtered);

  const scored = filtered.map((pub) => {
    const semanticScore = simScores.get(pub.id) || 0;
    const recencyScore = computeRecencyScore(pub.year);
    const credibilityScore = computeCredibilityScore(pub);
    const keywordScore = computeKeywordScore(query, pub);

    const finalScore =
      semanticScore * WEIGHTS.semanticSimilarity +
      recencyScore * WEIGHTS.recency +
      credibilityScore * WEIGHTS.credibility +
      keywordScore * WEIGHTS.keywordMatch;

    return {
      ...pub,
      scores: {
        semantic: Math.round(semanticScore * 100) / 100,
        recency: Math.round(recencyScore * 100) / 100,
        credibility: Math.round(credibilityScore * 100) / 100,
        keyword: Math.round(keywordScore * 100) / 100,
        final: Math.round(finalScore * 100) / 100,
      },
      relevanceScore: finalScore,
    };
  });

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const top = scored.slice(0, topN);
  console.log(`  [Ranking] Top ${top.length} publications selected`);

  return top;
}

/**
 * Rank clinical trials
 */
async function rankClinicalTrials(trials, query, topN = FINAL_COUNT) {
  if (!trials || trials.length === 0) return [];

  console.log(`  [Ranking] Scoring ${trials.length} clinical trials...`);

  const deduped = deduplicateByTitle(trials);

  const trialsWithText = deduped.map((t) => ({
    ...t,
    abstract: t.summary || t.eligibility || "",
  }));

  const simScores = await computeSimilarityScores(query, trialsWithText);

  const scored = deduped.map((trial) => {
    const semanticScore = simScores.get(trial.id) || 0;
    const recencyScore = computeRecencyScore(
      trial.startDate?.substring(0, 4)
    );
    const keywordScore = computeKeywordScore(query, {
      title: trial.title,
      abstract: trial.summary || "",
    });

    const recruitingBonus =
      trial.recruitingPriority === 2
        ? 0.3
        : trial.recruitingPriority === 1
        ? 0.15
        : 0;

    const finalScore =
      semanticScore * 0.45 +
      recencyScore * 0.2 +
      keywordScore * 0.15 +
      recruitingBonus * 0.2;

    return {
      ...trial,
      relevanceScore: finalScore,
    };
  });

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const top = scored.slice(0, topN);
  console.log(`  [Ranking] Top ${top.length} trials selected`);

  return top;
}

/**
 * Recency scoring
 */
function computeRecencyScore(year) {
  if (!year || year === "Unknown") return 0.3;

  const y = parseInt(year);
  if (isNaN(y)) return 0.3;

  const minYear = 2000;
  if (y >= CURRENT_YEAR) return 1.0;
  if (y <= minYear) return 0.05;

  return (y - minYear) / (CURRENT_YEAR - minYear);
}

/**
 * Credibility scoring
 */
function computeCredibilityScore(pub) {
  let score = 0.5;

  if (pub.citedByCount !== undefined) {
    score = Math.min(1.0, Math.log10((pub.citedByCount || 0) + 1) / 2);
    score = Math.max(0.1, score);
  }

  if (pub.source === "PubMed") {
    score = Math.min(1.0, score + 0.1);
  }

  return score;
}

/**
 * Keyword scoring
 */
function computeKeywordScore(query, pub) {
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  if (queryTerms.length === 0) return 0;

  const text = `${pub.title || ""} ${pub.abstract || ""}`.toLowerCase();

  let matches = 0;
  for (const term of queryTerms) {
    if (text.includes(term)) matches++;
  }

  const titleText = (pub.title || "").toLowerCase();
  let titleMatches = 0;
  for (const term of queryTerms) {
    if (titleText.includes(term)) titleMatches++;
  }

  const baseScore = matches / queryTerms.length;
  const titleBonus = (titleMatches / queryTerms.length) * 0.3;

  return Math.min(1.0, baseScore + titleBonus);
}

/**
 * Deduplication
 */
function deduplicateByTitle(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const normalizedTitle = (item.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 80);

    if (normalizedTitle && !seen.has(normalizedTitle)) {
      seen.add(normalizedTitle);
      result.push(item);
    }
  }

  return result;
}

export { rankPublications, rankClinicalTrials };