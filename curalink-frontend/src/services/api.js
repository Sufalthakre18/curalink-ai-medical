import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE,
  timeout: 120000, // 2 min — HuggingFace can be slow
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Run full research pipeline
 */
export async function runQuery({ disease, query, location, sessionId }) {
  const { data } = await api.post('/research/query', {
    disease,
    query,
    location,
    sessionId,
  })
  return data
}

/**
 * Follow-up question using existing session
 */
export async function runFollowUp({ sessionId, message }) {
  const { data } = await api.post('/research/followup', { sessionId, message })
  return data
}

/**
 * Get session history
 */
export async function getSession(sessionId) {
  const { data } = await api.get(`/research/session/${sessionId}`)
  return data
}

/**
 * Health check
 */
export async function healthCheck() {
  const { data } = await api.get('/research/health')
  return data
}