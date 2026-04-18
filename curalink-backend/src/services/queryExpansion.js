/**
 * Query Expansion Service
 *
 * Expands basic user queries into semantically rich search terms.
 * Strategy:
 *   1. Combine disease + query intelligently
 *   2. Add medical synonyms and related terms
 *   3. Generate multiple query variants for broader retrieval
 */

// Medical synonym map for common diseases/terms
const MEDICAL_SYNONYMS = {
  "parkinson's disease": ["parkinson disease", "PD", "parkinsonism", "dopamine"],
  "alzheimer's disease": ["alzheimer disease", "AD", "dementia", "cognitive decline", "amyloid"],
  "lung cancer": ["pulmonary carcinoma", "NSCLC", "SCLC", "non-small cell lung cancer", "pulmonary neoplasm"],
  diabetes: ["diabetes mellitus", "type 2 diabetes", "T2DM", "hyperglycemia", "insulin resistance"],
  "heart disease": ["cardiovascular disease", "coronary artery disease", "CAD", "cardiac disease", "myocardial infarction"],
  cancer: ["malignancy", "neoplasm", "tumor", "carcinoma", "oncology"],
  "multiple sclerosis": ["MS", "demyelinating disease", "neuroinflammation"],
  "breast cancer": ["mammary carcinoma", "BRCA", "breast neoplasm", "HER2"],
  "deep brain stimulation": ["DBS", "neuromodulation", "neural stimulation", "brain implant"],
  immunotherapy: ["immune checkpoint", "CAR-T", "checkpoint inhibitor", "PD-1", "PD-L1"],
  chemotherapy: ["cytotoxic therapy", "antineoplastic", "chemo regimen"],
  "clinical trial": ["randomized controlled trial", "RCT", "phase trial", "interventional study"],
};

/**
 * Get synonyms for a term
 */
function getSynonyms(term) {
  const lower = term.toLowerCase();
  for (const [key, synonyms] of Object.entries(MEDICAL_SYNONYMS)) {
    if (lower.includes(key)) {
      return synonyms;
    }
  }
  return [];
}

/**
 * Main query expansion function
 *
 * @param {Object} input - { disease, query, location }
 * @returns {Object}
 */
function expandQuery(input) {
  const { disease = "", query = "", location = "" } = input;

  const diseaseLower = disease.toLowerCase().trim();
  const queryLower = query.toLowerCase().trim();

  let primaryQuery = "";
  if (disease && query) {
    primaryQuery = `${query} ${disease}`;
  } else if (disease) {
    primaryQuery = `${disease} treatment research`;
  } else {
    primaryQuery = query;
  }

  const diseaseSynonyms = getSynonyms(diseaseLower);
  const querySynonyms = getSynonyms(queryLower);

  const variants = new Set();
  variants.add(primaryQuery);

  if (disease && query) {
    variants.add(`${disease} AND ${query}`);
    variants.add(`${query} AND ${disease}`);
  }

  if (disease) {
    variants.add(`${disease} latest treatment`);
    variants.add(`${disease} clinical study`);
    variants.add(`${disease} therapy advances`);
  }

  if (diseaseSynonyms.length > 0) {
    const topSynonym = diseaseSynonyms[0];
    if (query) {
      variants.add(`${query} ${topSynonym}`);
    }
    variants.add(`${topSynonym} treatment`);
  }

  if (querySynonyms.length > 0) {
    const topQuerySynonym = querySynonyms[0];
    if (disease) {
      variants.add(`${topQuerySynonym} ${disease}`);
    }
  }

  const locationQuery = location
    ? `${primaryQuery} ${location}`
    : primaryQuery;

  let pubmedQuery = "";
  if (disease && query) {
    pubmedQuery = `(${query}[Title/Abstract]) AND (${disease}[Title/Abstract])`;
    if (diseaseSynonyms.length > 0) {
      pubmedQuery += ` OR (${diseaseSynonyms[0]}[Title/Abstract])`;
    }
  } else if (disease) {
    pubmedQuery = `${disease}[Title/Abstract]`;
    if (diseaseSynonyms.length > 0) {
      pubmedQuery += ` OR ${diseaseSynonyms[0]}[Title/Abstract]`;
    }
  } else {
    pubmedQuery = query;
  }

  const openAlexQuery = primaryQuery;

  const clinicalTrialsCondition = disease || query;
  const clinicalTrialsIntervention = query !== disease ? query : "";

  return {
    primaryQuery,
    pubmedQuery,
    openAlexQuery,
    clinicalTrialsCondition,
    clinicalTrialsIntervention,
    locationQuery,
    variants: [...variants].slice(0, 6),
    disease,
    query,
    location,
    diseaseSynonyms,
    querySynonyms,
  };
}

export { expandQuery, getSynonyms };