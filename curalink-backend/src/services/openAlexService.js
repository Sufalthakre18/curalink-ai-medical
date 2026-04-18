import axios from "axios";

const OPENALEX_BASE = "https://api.openalex.org/works";
const MAX_RESULTS = parseInt(process.env.MAX_OPENALEX_RESULTS) || 80;

const USER_AGENT = `CuraLink/1.0 (${process.env.PUBMED_EMAIL || "curalink@research.com"})`;

async function getOpenAlexPublications(query, maxResults = MAX_RESULTS) {
  console.log(`  [OpenAlex] Searching: "${query}"`);

  const perPage = Math.min(50, maxResults);
  const pages = Math.ceil(maxResults / perPage);

  const allResults = [];
  const seenIds = new Set();

  const relevanceResults = await fetchOpenAlexPage(query, perPage, 1, "relevance_score:desc");
  for (const r of relevanceResults) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      allResults.push(r);
    }
  }

  const recencyResults = await fetchOpenAlexPage(query, perPage, 1, "publication_date:desc");
  for (const r of recencyResults) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      allResults.push(r);
    }
  }

  if (allResults.length < maxResults && pages > 1) {
    const moreResults = await fetchOpenAlexPage(query, perPage, 2, "relevance_score:desc");
    for (const r of moreResults) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allResults.push(r);
      }
    }
  }

  console.log(`  [OpenAlex] Retrieved ${allResults.length} publications`);
  return allResults;
}

async function fetchOpenAlexPage(query, perPage, page, sort) {
  try {
    const params = {
      search: query,
      "per-page": perPage,
      page,
      sort,
      filter: "has_abstract:true",
      select: [
        "id",
        "title",
        "abstract_inverted_index",
        "authorships",
        "publication_year",
        "primary_location",
        "open_access",
        "cited_by_count",
        "doi",
        "relevance_score",
      ].join(","),
    };

    const response = await axios.get(OPENALEX_BASE, {
      params,
      headers: { "User-Agent": USER_AGENT },
      timeout: 20000,
    });

    const results = response.data?.results || [];
    return results.map(parseOpenAlexWork).filter(Boolean);
  } catch (error) {
    console.error(`  [OpenAlex Fetch Error]: ${error.message}`);
    return [];
  }
}

function parseOpenAlexWork(work) {
  try {
    if (!work) return null;

    const id = work.id?.replace("https://openalex.org/", "") || "";

    const abstract = reconstructAbstract(work.abstract_inverted_index);
    if (!abstract) return null;

    const authors = (work.authorships || [])
      .slice(0, 6)
      .map((a) => a?.author?.display_name)
      .filter(Boolean);

    const journal =
      work.primary_location?.source?.display_name ||
      work.primary_location?.source?.host_organization_name ||
      "";

    let url = "";
    if (work.doi) {
      url = work.doi.startsWith("http") ? work.doi : `https://doi.org/${work.doi}`;
    } else if (work.id) {
      url = work.id;
    }

    const citedByCount = work.cited_by_count || 0;

    return {
      id: `openalex_${id}`,
      openAlexId: id,
      title: (work.title || "").trim(),
      abstract: abstract.trim(),
      authors,
      year: work.publication_year || "Unknown",
      journal,
      source: "OpenAlex",
      url,
      citedByCount,
      openAccess: work.open_access?.is_oa || false,
      relevanceScore: work.relevance_score || 0,
    };
  } catch (e) {
    return null;
  }
}

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return "";

  try {
    const wordPositions = [];

    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        wordPositions.push({ word, pos });
      }
    }

    wordPositions.sort((a, b) => a.pos - b.pos);

    return wordPositions.map((wp) => wp.word).join(" ");
  } catch (e) {
    return "";
  }
}

export { getOpenAlexPublications };