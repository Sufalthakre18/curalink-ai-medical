import axios from "axios";
import xml2js from "xml2js";

const PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const EMAIL = process.env.PUBMED_EMAIL || "curalink@research.com";
const MAX_RESULTS = parseInt(process.env.MAX_PUBMED_RESULTS) || 60;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchPubMed(query, maxResults = MAX_RESULTS) {
  try {
    const url = `${PUBMED_BASE}/esearch.fcgi`;
    const response = await axios.get(url, {
      params: {
        db: "pubmed",
        term: query,
        retmax: maxResults,
        sort: "pub+date",
        retmode: "json",
        email: EMAIL,
      },
      timeout: 15000,
    });

    const idList = response.data?.esearchresult?.idlist || [];
    const total = response.data?.esearchresult?.count || 0;

    console.log(`  [PubMed] Found ${total} total results, fetching ${idList.length} IDs`);
    return idList;
  } catch (error) {
    console.error(`  [PubMed Search Error]: ${error.message}`);
    return [];
  }
}

async function fetchPubMedDetails(ids) {
  if (!ids || ids.length === 0) return [];

  try {
    await sleep(400);

    const url = `${PUBMED_BASE}/efetch.fcgi`;
    const response = await axios.get(url, {
      params: {
        db: "pubmed",
        id: ids.join(","),
        retmode: "xml",
        email: EMAIL,
      },
      timeout: 30000,
    });

    return parsePubMedXML(response.data);
  } catch (error) {
    console.error(`  [PubMed Fetch Error]: ${error.message}`);
    return [];
  }
}

async function parsePubMedXML(xmlData) {
  try {
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const result = await parser.parseStringPromise(xmlData);

    const articles = result?.PubmedArticleSet?.PubmedArticle;
    if (!articles) return [];

    const articleArray = Array.isArray(articles) ? articles : [articles];

    return articleArray.map((article) => {
      try {
        const medlineCitation = article?.MedlineCitation;
        const articleData = medlineCitation?.Article;

        const title = extractText(articleData?.ArticleTitle) || "Untitled";

        let abstract = "";
        const abstractData = articleData?.Abstract?.AbstractText;
        if (Array.isArray(abstractData)) {
          abstract = abstractData.map((a) => (typeof a === "object" ? a._ || "" : a)).join(" ");
        } else {
          abstract = extractText(abstractData) || "";
        }

        const authorList = articleData?.AuthorList?.Author;
        let authors = [];
        if (authorList) {
          const authorArray = Array.isArray(authorList) ? authorList : [authorList];
          authors = authorArray
            .slice(0, 6)
            .map((a) => {
              const last = extractText(a?.LastName) || "";
              const fore = extractText(a?.ForeName) || extractText(a?.Initials) || "";
              return `${last}${fore ? " " + fore : ""}`.trim();
            })
            .filter(Boolean);
        }

        const pubDate = articleData?.Journal?.JournalIssue?.PubDate;
        const year =
          extractText(pubDate?.Year) ||
          extractText(pubDate?.MedlineDate)?.substring(0, 4) ||
          "Unknown";

        const pmid = extractText(medlineCitation?.PMID) || "";
        const journal = extractText(articleData?.Journal?.Title) || "";

        return {
          id: `pubmed_${pmid}`,
          pmid,
          title: cleanText(title),
          abstract: cleanText(abstract),
          authors,
          year,
          journal,
          source: "PubMed",
          url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : "",
          relevanceScore: 0,
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error(`  [PubMed XML Parse Error]: ${error.message}`);
    return [];
  }
}

async function getPubMedPublications(query, maxResults = MAX_RESULTS) {
  console.log(`  [PubMed] Searching: "${query}"`);

  const ids = await searchPubMed(query, maxResults);
  if (ids.length === 0) return [];

  const articles = await fetchPubMedDetails(ids);
  console.log(`  [PubMed] Parsed ${articles.length} articles`);
  return articles;
}

function extractText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "object") {
    if (node._) return node._;
    if (node["#text"]) return node["#text"];
    return "";
  }
  return String(node);
}

function cleanText(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

export { getPubMedPublications };