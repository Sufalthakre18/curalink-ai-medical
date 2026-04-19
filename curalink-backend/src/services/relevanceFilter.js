/**
 * Relevance Filter Service — v2
 * Flexible weighted scoring — no hard rejection of papers.
 */

const SYNONYM_MAP = {
  "vitamin a":   ["retinol","retinoic acid","retinoid","fat-soluble vitamin","carotenoid","beta-carotene","retinoids"],
  "vitamin d":   ["cholecalciferol","calcitriol","ergocalciferol","d3","sunshine vitamin","25-hydroxyvitamin"],
  "vitamin c":   ["ascorbic acid","ascorbate","l-ascorbic"],
  "vitamin e":   ["tocopherol","alpha-tocopherol","tocotrienol"],
  "vitamin b12": ["cobalamin","cyanocobalamin","methylcobalamin","b-12"],
  "vitamin b6":  ["pyridoxine","pyridoxal","b-6"],
  "vitamin k":   ["phylloquinone","menaquinone","k2"],
  "omega 3":     ["fish oil","dha","epa","docosahexaenoic","eicosapentaenoic","n-3 fatty","polyunsaturated"],
  "omega-3":     ["fish oil","dha","epa","docosahexaenoic","eicosapentaenoic","n-3 fatty","polyunsaturated"],
  "supplement":  ["supplementation","dietary supplement","nutraceutical","micronutrient","nutritional support"],
  "nutrition":   ["dietary","diet","nutritional","nutrient","food intake","caloric","macronutrient"],
  "interaction": ["drug interaction","contraindication","concomitant","co-administration","combined therapy"],
  "safety":      ["adverse effect","side effect","toxicity","tolerability","safety profile","well-tolerated"],
  "magnesium":   ["mg supplementation","hypomagnesemia","magnesium deficiency"],
  "zinc":        ["zinc deficiency","zn supplementation","zinc status"],
  "calcium":     ["calcium carbonate","ca supplementation","bone mineral"],
  "turmeric":    ["curcumin","curcuminoid","anti-inflammatory spice"],
  "melatonin":   ["sleep hormone","circadian","pineal","sleep quality"],
  "probiotics":  ["lactobacillus","bifidobacterium","gut microbiome","gut flora","microbiota"],
  "antioxidant": ["oxidative stress","free radical","reactive oxygen species","nrf2","superoxide"],
  "exercise":    ["physical activity","aerobic exercise","gait training","rehabilitation","walking program"],
};

const INTENT_PATTERNS = {
  supplement_safety:   { patterns:["can i take","is it safe","safe to take","should i take","vitamin","supplement","mineral","omega","nutrition","dietary"], generalTerms:["supplement","vitamin","mineral","nutrient","dietary","nutrition","antioxidant"] },
  drug_interaction:    { patterns:["interact","interaction","together with","combine","mixing","drug","medication","contraindic"], generalTerms:["interaction","drug","medication","combination","contraindication","co-administration"] },
  treatment_comparison:{ patterns:["vs","versus","compare","better","difference","alternative","or treatment"], generalTerms:["treatment","therapy","intervention","approach","option"] },
  symptom_management:  { patterns:["symptom","help with","reduce","manage","relieve","control","exercise","walking","gait"], generalTerms:["symptom","management","quality of life","rehabilitation","palliative"] },
  clinical_trial:      { patterns:["trial","study","research","recruit","participate","eligib"], generalTerms:["trial","study","clinical","phase","intervention","randomized"] },
  general_research:    { patterns:[], generalTerms:[] },
};

function parseQueryIntent({ disease="", query="" }) {
  const combined = `${disease} ${query}`.toLowerCase();

  let intent = "general_research";
  for (const [key, cfg] of Object.entries(INTENT_PATTERNS)) {
    if (key === "general_research") continue;
    if (cfg.patterns.some(p => combined.includes(p))) { intent = key; break; }
  }

  const specificTerms = extractSpecificTerms(query.toLowerCase());
  const specificSynonyms = {};
  for (const t of specificTerms) specificSynonyms[t] = SYNONYM_MAP[t] || [];

  return {
    condition: disease,
    intent,
    conditionKeywords: tokenize(disease),
    queryKeywords: tokenize(query),
    specificTerms,
    specificSynonyms,
    intentGeneralTerms: INTENT_PATTERNS[intent]?.generalTerms || [],
  };
}

function scorePaperRelevance(paper, pq) {
  const text  = `${paper.title||""} ${paper.abstract||""}`.toLowerCase();
  const title = (paper.title||"").toLowerCase();
  let score = 0;

  // 1. Exact specific term match → +1.0 (weight 35%)
  let exactScore = 0;
  for (const term of pq.specificTerms) {
    if (text.includes(term)) { exactScore += 1.0; if (title.includes(term)) exactScore += 0.3; }
  }
  if (pq.specificTerms.length > 0) exactScore = Math.min(1.0, exactScore / pq.specificTerms.length);
  score += exactScore * 0.35;

  // 2. Synonym / related term match → +0.6 (weight 25%)
  let synScore = 0, totalSyns = 0;
  for (const [, syns] of Object.entries(pq.specificSynonyms)) {
    totalSyns += syns.length;
    for (const s of syns) { if (text.includes(s)) synScore += 0.6; }
  }
  for (const qw of pq.queryKeywords) {
    for (const s of (SYNONYM_MAP[qw]||[])) { if (text.includes(s)) synScore += 0.3; }
  }
  synScore = Math.min(1.0, synScore / Math.max(totalSyns + 1, 1));
  score += synScore * 0.25;

  // 3. Condition / disease match → +0.8 (weight 25%)
  let condScore = 0;
  const condHits = pq.conditionKeywords.filter(w => text.includes(w));
  if (pq.conditionKeywords.length > 0) {
    condScore = condHits.length / pq.conditionKeywords.length;
    if (pq.conditionKeywords.some(w => title.includes(w))) condScore += 0.2;
    condScore = Math.min(1.0, condScore);
  }
  score += condScore * 0.25;

  // 4. General topic / intent match → +0.3 (weight 15%)
  const allGeneral = [...pq.intentGeneralTerms, ...pq.queryKeywords];
  const genHits = allGeneral.filter(w => w.length > 3 && text.includes(w));
  const genScore = Math.min(1.0, genHits.length / Math.max(allGeneral.length * 0.4, 1));
  score += genScore * 0.15;

  return { score: Math.min(1.0, Math.max(0, score)) };
}

function filterByRelevance(papers, parsedQuery, topN = 8) {
  if (!papers || papers.length === 0) {
    return {
      papers: [], relevanceLevel: "NONE",
      evidenceSummary: "No research papers were retrieved for this query.",
      passingCount: 0,
      suggestions: buildSuggestions(parsedQuery),
    };
  }

  const scored = papers.map(p => {
    const { score } = scorePaperRelevance(p, parsedQuery);
    const combined  = score * 0.6 + (p.relevanceScore||0) * 0.4;
    return { ...p, relevanceFilterScore: score, combinedScore: combined };
  });

  scored.sort((a,b) => b.combinedScore - a.combinedScore);

  const strongCount  = scored.filter(p => p.relevanceFilterScore > 0.25).length;
  const partialCount = scored.filter(p => p.relevanceFilterScore > 0.10).length;

  console.log(`  [RelevanceFilter] Strong:${strongCount} Partial:${partialCount} Total:${papers.length}`);

  const q = parsedQuery.specificTerms[0] || parsedQuery.queryKeywords[0] || "this topic";
  const c = parsedQuery.condition || "this condition";

  let relevanceLevel, evidenceSummary;
  if (strongCount === 0 && partialCount === 0) {
    relevanceLevel  = "NONE";
    evidenceSummary = `No research directly addressing "${q}" in the context of ${c} was found.`;
  } else if (strongCount === 0) {
    relevanceLevel  = "LOW";
    evidenceSummary = `Only indirect or loosely related research found for "${q}" with ${c}. Findings below are related but may not directly answer your question.`;
  } else if (strongCount <= 3) {
    relevanceLevel  = "PARTIAL";
    evidenceSummary = `Limited direct evidence found (${strongCount} relevant papers). Some research addresses this question, but coverage may be incomplete.`;
  } else {
    relevanceLevel  = "HIGH";
    evidenceSummary = `Good evidence base (${strongCount} relevant papers) for "${q}" with ${c}.`;
  }

  return {
    papers: scored.slice(0, topN),   // always return top N — never empty
    relevanceLevel,
    evidenceSummary,
    passingCount: strongCount,
    suggestions: buildSuggestions(parsedQuery),
    parsedQuery,
  };
}

function buildSuggestions({ condition, intent, specificTerms, queryKeywords }) {
  const suggestions = new Set();
  const c    = condition || "this condition";
  const term = specificTerms[0] || queryKeywords[0] || "";

  if (intent === "supplement_safety" || specificTerms.length > 0) {
    if (term) suggestions.add(`${term} studies in ${c} patients`);
    suggestions.add(`Safe supplements for ${c}`);
    suggestions.add(`Nutritional guidelines for ${c}`);
    suggestions.add(`Drug interactions in ${c} treatment`);
  } else if (intent === "drug_interaction") {
    suggestions.add(`${c} medication interactions`);
    suggestions.add(`Safe complementary treatments for ${c}`);
  } else {
    suggestions.add(`Latest ${c} treatments 2024`);
    suggestions.add(`Clinical trials for ${c}`);
    suggestions.add(`${c} research advances`);
  }

  return [...suggestions].slice(0, 3);
}

function extractSpecificTerms(query) {
  const terms = [];
  const vitaminMatch = query.match(/vitamin\s+[a-z0-9]+/g);
  if (vitaminMatch) terms.push(...vitaminMatch.map(v => v.trim()));
  const omegaMatch = query.match(/omega[- ]?\d+/g);
  if (omegaMatch) {
    terms.push(...omegaMatch.map(o => o.toLowerCase().replace(/\s/," ")));
    terms.push(...omegaMatch.map(o => o.toLowerCase().replace(/\s/,"-")));
  }
  const named = ["fish oil","zinc","magnesium","iron","calcium","folate","folic acid","b12","b6","coq10","turmeric","curcumin","melatonin","probiotics","glutathione","selenium","potassium","retinol","beta-carotene"];
  for (const s of named) { if (query.includes(s)) terms.push(s); }
  return [...new Set(terms)];
}

function tokenize(text) {
  return (text||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w => w.length>2 && !STOP_WORDS.has(w));
}

const STOP_WORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","have","has","had","do","does","did","will","can","could","this","that","these","those","it","its","not","no","take","i","my","me","what","how","when","where","which","who","should","would","may","might","any","all","some","yes"]);

export { parseQueryIntent, filterByRelevance, scorePaperRelevance };