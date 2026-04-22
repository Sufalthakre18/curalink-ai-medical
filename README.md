# CuraLink — AI Medical Research Assistant

> A full-stack AI-powered medical research assistant that retrieves, ranks, and synthesizes real research evidence from PubMed, OpenAlex, and ClinicalTrials.gov — giving patients and caregivers structured, honest, research-backed answers.

<div align="center">

**[Live App](https://curalink-ai-medical.vercel.app/) · [Backend API](https://curalink-ai-medical.onrender.com) · [Demo Video](https://drive.google.com/file/d/1TanrbsPIgPlkw171xNVbUFJwQ07oheR0/view?usp=sharing)**

</div>

---

## Table of Contents

- [Overview](#overview)
- [Live Links](#live-links)
- [Features](#features)
- [System Architecture](#system-architecture)
- [AI Pipeline](#ai-pipeline)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Key Design Decisions](#key-design-decisions)
- [Screenshots](#screenshots)

---

## Overview

CuraLink is built for people who are dealing with a serious medical condition and need access to real research — not generic health articles, not Reddit threads, but actual peer-reviewed publications and active clinical trials.

The problem it solves: medical research is publicly available but practically inaccessible. PubMed alone indexes 35 million papers. ClinicalTrials.gov lists hundreds of thousands of trials. Most people have no way to navigate this.

CuraLink takes a simple user query — disease, intent, optional location — and runs it through a full retrieval and reasoning pipeline. It returns a structured answer grounded only in what the retrieved research actually says.

**It cannot hallucinate research that doesn't exist — because it only reasons over what was retrieved.**

---

## Live Links

| Resource | URL |
|----------|-----|
| 🌐 Live Application | https://curalink-ai-medical.vercel.app/ |
| ⚙️ Backend API | https://curalink-ai-medical.onrender.com |
| 🎥 Demo Video | https://drive.google.com/file/d/1TanrbsPIgPlkw171xNVbUFJwQ07oheR0/view?usp=sharing |
| 📋 Health Check | https://curalink-ai-medical.onrender.com/api/research/health |

---

## Features

### Core Research Pipeline
- **Multi-source retrieval** — searches PubMed, OpenAlex, and ClinicalTrials.gov in parallel using `Promise.all`
- **Query expansion** — automatically expands queries with medical synonyms and related terms (e.g. "DBS" → also searches "deep brain stimulation", "neuromodulation", "subthalamic nucleus")
- **Custom ranking** — scores every paper on semantic similarity, recency, and source credibility before filtering
- **Relevance filter** — removes papers that don't actually address the user's question before the LLM sees them
- **Structured output** — generates condition overview, research insights, personalized answer, and sources

### Conversation & Context
- **Multi-turn follow-ups** — disease context carries forward automatically across the conversation
- **Session memory** — MongoDB stores session history; clicking any past query instantly restores its results
- **Smart caching** — follow-up questions on the same disease reuse retrieved data instead of re-calling APIs

### Unique Features
- **Research Comparison Mode** — compare two treatments side-by-side using parallel API calls; generates AI verdict, comparison table, and doctor discussion questions
- **Pipeline Transparency** — animated step-by-step status during loading shows exactly what the system is doing (not just a spinner)
- **Relevance Badges** — when evidence is limited, shows ⚠️ Limited Evidence or 🚫 No Direct Research Found with clickable suggestions
- **Export Research Brief** — downloads a clean, structured PDF of the full research session
- **Clinical Dark Mode** — "Focus Mode" dark theme with smooth transitions, saved in localStorage
- **Location-aware trials** — filters ClinicalTrials.gov by user's city/country to find nearby recruiting trials

---

## System Architecture

```
User Input (disease + query + location)
        │
        ▼
┌─────────────────────┐
│   Query Expansion   │  Synonyms, medical terms, PubMed boolean format
└─────────────────────┘
        │
        ▼ (parallel)
┌───────────────────────────────────────────────┐
│  PubMed API    │  OpenAlex API  │  ClinicalTrials.gov  │
│  (XML format)  │  (JSON format) │  (REST API v2)       │
└───────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────┐
│   Normalization     │  All three formats unified into one structure
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│   Ranking           │  Semantic similarity + recency + credibility
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Relevance Filter   │  Flexible keyword + synonym scoring
│                     │  Classifies: HIGH / PARTIAL / LOW / NONE
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│   LLM Reasoning     │  HuggingFace open-source model
│                     │  Prompt enforces multi-paper synthesis
│                     │  No hallucination — reasons only over retrieved data
└─────────────────────┘
        │
        ▼
Structured Response → Frontend
```

---

## AI Pipeline

### 1. Query Expansion (`queryExpansion.js`)
Converts user input into multiple search variants:
- Primary query combining disease + intent
- PubMed boolean format: `(term[Title/Abstract]) AND (disease[Title/Abstract])`
- OpenAlex free-text query
- ClinicalTrials condition + intervention fields
- 6 query variants for broader retrieval

### 2. Parallel Retrieval
Three external APIs called simultaneously:
- **PubMed** — up to 60 articles via esearch + efetch (XML parsed with xml2js)
- **OpenAlex** — up to 80 articles (reconstructs abstract from inverted index format)
- **ClinicalTrials.gov** — up to 40 trials (RECRUITING + ACTIVE + COMPLETED)

Total candidate pool: ~160-180 items per query.

### 3. Ranking (`rankingService.js`)
Multi-factor scoring:
| Factor | Weight |
|--------|--------|
| Semantic similarity (TF-IDF / HuggingFace embeddings) | 40% |
| Recency (publication year, linear decay) | 25% |
| Source credibility (citation count, PubMed indexing) | 20% |
| Keyword match | 15% |

### 4. Relevance Filter (`relevanceFilter.js`)
Flexible weighted scoring — no hard rejection:
| Match Type | Score Contribution |
|------------|-------------------|
| Exact keyword match (e.g. "vitamin A") | +1.0 |
| Synonym match (e.g. "retinol") | +0.6 |
| General topic match (e.g. "nutrition") | +0.3 |
| Condition/disease match | +0.8 |

Papers are always sorted and top-N returned. Relevance level determines LLM prompt behavior and frontend badge.

### 5. LLM Reasoning (`llmService.js`)
- **Primary**: Ollama (local inference if available)
- **Fallback**: HuggingFace Inference API (zephyr-7b-beta)
- **Rule-based fallback**: Rich structured response generated from data directly if no LLM available

LLM prompt enforces:
- Multi-paper synthesis only (banned: "The most relevant study is...")
- Explicit honesty when evidence is limited
- No reasoning beyond provided papers

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 + Vite | UI framework |
| Tailwind CSS v4 | Styling with CSS variables for theming |
| Framer Motion | Animations |
| Axios | API calls |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | Server |
| MongoDB + Mongoose | Session storage |
| xml2js | PubMed XML parsing |
| Axios | External API calls |

### AI / Data
| Service | Purpose |
|---------|---------|
| PubMed (NCBI eUtils) | Peer-reviewed publications |
| OpenAlex | Open-access research |
| ClinicalTrials.gov v2 | Clinical trial registry |
| HuggingFace Inference API | LLM (zephyr-7b-beta) + embeddings |
| Ollama (optional) | Local LLM inference |

### Deployment
| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting |
| Render | Backend hosting |
| MongoDB Atlas | Database |

---

## Project Structure

```
curalink-backend/
├── server.js
├── src/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   └── Session.js
│   ├── routes/
│   │   └── research.js
│   ├── pipeline/
│   │   └── researchPipeline.js       ← main orchestrator
│   └── services/
│       ├── queryExpansion.js          ← query expansion + synonyms
│       ├── pubmedService.js           ← PubMed API (XML)
│       ├── openAlexService.js         ← OpenAlex API (JSON)
│       ├── clinicalTrialsService.js   ← ClinicalTrials.gov API
│       ├── rankingService.js          ← multi-factor scoring
│       ├── relevanceFilter.js         ← strict relevance validation
│       ├── embeddingService.js        ← TF-IDF + HuggingFace embeddings
│       └── llmService.js              ← LLM orchestration

curalink-frontend/
├── src/
│   ├── App.jsx
│   ├── hooks/
│   │   ├── useResearch.js             ← all API state management
│   │   └── useTheme.js                ← dark/light mode
│   ├── services/
│   │   └── api.js                     ← Axios service layer
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── SearchForm.jsx
│   │   ├── StructuredAnswer.jsx
│   │   ├── PublicationCard.jsx
│   │   ├── TrialCard.jsx
│   │   ├── RelevanceBadge.jsx         ← evidence quality indicator
│   │   ├── PipelineStatus.jsx         ← live pipeline transparency
│   │   ├── ExportPDF.jsx              ← research brief download
│   │   ├── ThemeToggle.jsx
│   │   ├── LoadingSkeleton.jsx
│   │   └── ErrorState.jsx
│   └── pages/
│       ├── ResultsDashboard.jsx
│       └── ComparisonMode.jsx         ← side-by-side treatment comparison
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- HuggingFace API key (free tier works)

### Backend Setup

```bash
# Clone and install
cd curalink-backend
npm install

# Configure environment
cp .env.example .env
# Fill in your values (see Environment Variables below)

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd curalink-frontend
npm install

# Set API URL
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start development server
npm run dev
```

Open `http://localhost:3000`

---

## Environment Variables

### Backend (`.env`)

```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/curaLinkDb

# Server
PORT=5000
NODE_ENV=development

# HuggingFace
HUGGINGFACE_API_KEY=hf_your_key_here
HF_LLM_MODEL=HuggingFaceH4/zephyr-7b-beta
HF_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Ollama (optional - local LLM)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# PubMed (add your email for better rate limits)
PUBMED_EMAIL=your@email.com

# Retrieval config
MAX_PUBMED_RESULTS=60
MAX_OPENALEX_RESULTS=80
MAX_CLINICAL_TRIALS=40
FINAL_RESULTS_COUNT=8

# Deployment (Render keep-alive)
RENDER_EXTERNAL_URL=https://your-app.onrender.com
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (`.env`)

```env
# Development
VITE_API_URL=http://localhost:5000/api

# Production
VITE_API_URL=https://your-backend.onrender.com/api
```

---

## API Reference

### `POST /api/research/query`
Main research query — runs the full pipeline.

**Request:**
```json
{
  "disease": "Parkinson's disease",
  "query": "Deep Brain Stimulation",
  "location": "Toronto, Canada",
  "sessionId": "optional-existing-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "query": { "original": {}, "expanded": "..." },
  "structured": {
    "conditionOverview": {},
    "researchInsights": {},
    "clinicalTrials": {},
    "personalizedInsight": "...",
    "disclaimer": "..."
  },
  "rawData": {
    "publications": [],
    "clinicalTrials": []
  },
  "relevance": {
    "level": "HIGH | PARTIAL | LOW | NONE",
    "evidenceSummary": "...",
    "passingCount": 6,
    "suggestions": []
  },
  "meta": {
    "publicationsRetrieved": 160,
    "trialsRetrieved": 7,
    "publicationsShown": 8,
    "processingTimeMs": 12000
  }
}
```

### `POST /api/research/followup`
Follow-up question using existing session context.

```json
{ "sessionId": "uuid", "message": "Can I take Vitamin D?" }
```

### `GET /api/research/session/:sessionId`
Retrieve conversation history and context.

### `POST /api/research/expand`
Preview query expansion without running the full pipeline.

### `GET /api/research/health`
Check all service statuses.

```json
{
  "services": {
    "ollama": "unavailable",
    "huggingface": "configured",
    "pubmed": "available",
    "openAlex": "available",
    "clinicalTrials": "available"
  }
}
```

---

## Key Design Decisions

**Why TF-IDF over embeddings by default?**
HuggingFace embedding API has cold-start latency on free tier. TF-IDF with IDF weighting gives reliable 0–1 scores with zero latency. HuggingFace embeddings are used automatically when the API key is configured.

**Why filter AFTER ranking?**
Ranking uses semantic similarity across the full pool (better deduplication). The relevance filter then applies domain-specific scoring — it's more accurate to rank first, then validate relevance, than to filter early and miss papers that rank well for non-obvious reasons.

**Why never return empty results?**
Papers are always sorted by combined score and top-N returned even when relevance is low. The frontend badge communicates the evidence quality honestly — hiding results when they're weak is worse than showing them with an appropriate warning.

**Why session caching?**
Follow-up questions on the same disease context don't need to re-hit 3 external APIs. The session stores up to 100 papers and 40 trials for 30 minutes. This makes follow-up responses ~10x faster.

**Why HuggingFace over OpenAI/Gemini?**
Assignment requirement — and the right call. Open-source models with explicit prompting give more control over hallucination. The LLM can only reason over what's in its context window — it cannot draw on its training data to fill gaps.

---

## Screenshots

> Demo video covers all features in detail:
> https://drive.google.com/file/d/1TanrbsPIgPlkw171xNVbUFJwQ07oheR0/view?usp=sharing

| Feature | Description |
|---------|-------------|
| Search + Pipeline Status | Animated step-by-step pipeline transparency during loading |
| Structured Answer | Condition overview, research insights, personalized answer |
| Publications | Ranked cards with relevance bar, source badge, direct links |
| Clinical Trials | Status badges, eligibility, location filtering |
| Session History | Clickable history, instant result restoration |
| Relevance Badges | Honest evidence quality indicators with suggestions |
| Comparison Mode | Side-by-side treatment comparison with AI verdict |
| Focus Mode | Full dark theme with smooth transitions |
| Export PDF | Clean research brief download |

---

## License

Built for the CuraLink Hackathon. All external data sources (PubMed, OpenAlex, ClinicalTrials.gov) are publicly accessible APIs used in accordance with their respective terms of service.

---

<div align="center">
Built with care by a developer who believes good medical information should be accessible to everyone.
</div>