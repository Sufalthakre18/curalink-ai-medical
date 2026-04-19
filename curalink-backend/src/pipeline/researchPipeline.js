/**
 * Research Pipeline (ES6 Version)
 */

import { expandQuery } from "../services/queryExpansion.js";
import { getPubMedPublications } from "../services/pubmedService.js";
import { getOpenAlexPublications } from "../services/openAlexService.js";
import { getClinicalTrials } from "../services/clinicalTrialsService.js";
import { rankPublications, rankClinicalTrials } from "../services/rankingService.js";
import { generateResponse } from "../services/llmService.js";
import { parseQueryIntent, filterByRelevance } from "../services/relevanceFilter.js";
import Session from "../models/Session.js";

export async function runResearchPipeline(input, session) {
  const startTime = Date.now();
  const { disease = "", query = "", location = "" } = input;

  console.log("\n═══════════════════════════════════════════════");
  console.log(`🔬 PIPELINE START`);
  console.log(`  Disease: ${disease}`);
  console.log(`  Query: ${query}`);
  console.log(`  Location: ${location}`);
  console.log("═══════════════════════════════════════════════");

  // STEP 1: Query Expansion
  const expandedQuery = expandQuery({ disease, query, location });

  const cacheKey = `${disease.toLowerCase()}_${query.toLowerCase()}`;
  const isSameContext =
    session.cachedResults?.cacheKey === cacheKey &&
    session.cachedResults?.publications?.length > 0 &&
    session.cachedResults?.cachedAt &&
    Date.now() - new Date(session.cachedResults.cachedAt).getTime() < 30 * 60 * 1000;

  let publications = [];
  let clinicalTrials = [];

  // STEP 2: DATA FETCH
  if (isSameContext) {
    publications = session.cachedResults.publications;
    clinicalTrials = session.cachedResults.clinicalTrials;
  } else {
    const [pubmedResults, openAlexResults, trialsResults] = await Promise.allSettled([
      getPubMedPublications(expandedQuery.pubmedQuery),
      getOpenAlexPublications(expandedQuery.openAlexQuery),
      getClinicalTrials(
        expandedQuery.clinicalTrialsCondition,
        expandedQuery.clinicalTrialsIntervention,
        location
      ),
    ]);

    const pubmedArticles = pubmedResults.status === "fulfilled" ? pubmedResults.value : [];
    const openAlexArticles = openAlexResults.status === "fulfilled" ? openAlexResults.value : [];
    const trials = trialsResults.status === "fulfilled" ? trialsResults.value : [];

    publications = [...pubmedArticles, ...openAlexArticles];
    clinicalTrials = trials;
  }

  // STEP 3: Ranking
  const [rankedPublications, rankedTrials] = await Promise.all([
    rankPublications(publications, expandedQuery.primaryQuery),
    rankClinicalTrials(clinicalTrials, expandedQuery.primaryQuery),
  ]);

  // STEP 3.5: Relevance Filter
  const parsedQuery = parseQueryIntent({ disease, query });
  const relevanceResult = filterByRelevance(rankedPublications, parsedQuery);

  const finalPublications = relevanceResult.papers;

  // STEP 4: LLM
  const conversationHistory = session.messages || [];

  const { structured, llmUsed } = await generateResponse(
    expandedQuery,
    finalPublications,
    rankedTrials,
    conversationHistory,
    relevanceResult
  );

  // STEP 5: Build Response
  const elapsed = Date.now() - startTime;

  const finalResponse = {
    success: true,
    sessionId: session.sessionId,
    query: {
      original: { disease, query, location },
      expanded: expandedQuery.primaryQuery,
      parsedIntent: parsedQuery.intent,
    },
    structured,
    rawData: {
      publications: finalPublications.map(formatPublicationForResponse),
      clinicalTrials: rankedTrials.map(formatTrialForResponse),
    },
    relevance: {
      level: relevanceResult.relevanceLevel,
      evidenceSummary: relevanceResult.evidenceSummary,
      passingCount: relevanceResult.passingCount,
      suggestions: relevanceResult.suggestions,
    },
    meta: {
      llmUsed,
      publicationsRetrieved: publications.length,
      trialsRetrieved: clinicalTrials.length,
      publicationsShown: finalPublications.length,
      trialsShown: rankedTrials.length,
      processingTimeMs: elapsed,
      cached: isSameContext,
    },
  };

  await updateSession(session, {
    disease,
    query,
    location,
    cacheKey,
    publications,
    clinicalTrials,
    userMessage: `${query || disease}${location ? ` (${location})` : ""}`,
    assistantMessage:
      structured?.personalizedInsight ||
      structured?.researchInsights?.summary ||
      "Research complete.",
    expandedQuery,
  });

  return finalResponse;
}

/* SESSION UPDATE */

async function updateSession(session, data) {
  try {
    if (data.disease) session.context.disease = data.disease;
    if (data.location) session.context.location = data.location;

    session.context.lastQuery = data.query;
    session.context.queryHistory.push(data.expandedQuery.primaryQuery);

    session.messages.push({ role: "user", content: data.userMessage });
    session.messages.push({ role: "assistant", content: data.assistantMessage });

    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-20);
    }

    session.markModified("messages");
    session.markModified("context");

    session.cachedResults = {
      publications: data.publications.slice(0, 100),
      clinicalTrials: data.clinicalTrials.slice(0, 40),
      cacheKey: data.cacheKey,
      cachedAt: new Date(),
    };

    session.updatedAt = new Date();
    await session.save();
  } catch (err) {
    console.error("Session update error:", err.message);
  }
}

/* FORMATTERS */

function formatPublicationForResponse(pub) {
  return {
    id: pub.id,
    title: pub.title,
    abstract: pub.abstract?.slice(0, 500) || "",
    authors: pub.authors || [],
    year: pub.year,
    journal: pub.journal || "",
    source: pub.source,
    url: pub.url,
    relevanceScore: Math.round((pub.relevanceScore || 0) * 100),
  };
}

function formatTrialForResponse(trial) {
  return {
    id: trial.id,
    title: trial.title,
    status: trial.status,
    phase: trial.phase,
    summary: trial.summary?.slice(0, 400) || "",
    conditions: trial.conditions || [],
    url: trial.url,
  };
}