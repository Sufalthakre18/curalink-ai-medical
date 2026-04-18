import { useState, useCallback, useRef } from 'react'
import { runQuery, runFollowUp } from '../services/api'

export function useResearch() {
  const [state, setState] = useState({
    status: 'idle',
    result: null,
    error: null,
    sessionId: null,
    queryHistory: [],
  })

  const sessionIdRef = useRef(null)

  const search = useCallback(async ({ disease, query, location }) => {
    // Keep previous result visible while loading (no blank flash)
    setState(s => ({ ...s, status: 'loading', error: null }))

    try {
      const data = await runQuery({ disease, query, location, sessionId: sessionIdRef.current })
      sessionIdRef.current = data.sessionId

      setState(s => ({
        status: 'success',
        result: data,
        sessionId: data.sessionId,
        error: null,
        queryHistory: [
          ...s.queryHistory,
          { disease, query, location, timestamp: new Date(), expanded: data.query?.expanded, isFollowUp: false },
        ],
      }))
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Something went wrong. Please try again.'
      setState(s => ({ ...s, status: 'error', error: msg }))
    }
  }, [])

  const followUp = useCallback(async (message) => {
    if (!sessionIdRef.current) return
    setState(s => ({ ...s, status: 'loading', error: null }))

    try {
      const data = await runFollowUp({ sessionId: sessionIdRef.current, message })
      setState(s => ({
        status: 'success',
        result: data,
        sessionId: s.sessionId,
        error: null,
        queryHistory: [
          ...s.queryHistory,
          { query: message, timestamp: new Date(), expanded: data.query?.expanded, isFollowUp: true },
        ],
      }))
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Follow-up failed. Please try again.'
      setState(s => ({ ...s, status: 'error', error: msg }))
    }
  }, [])

  const reset = useCallback(() => {
    sessionIdRef.current = null
    setState({ status: 'idle', result: null, error: null, sessionId: null, queryHistory: [] })
  }, [])

  return { ...state, search, followUp, reset }
}