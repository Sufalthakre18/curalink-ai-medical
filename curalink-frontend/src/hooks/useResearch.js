import { useState, useCallback, useRef } from 'react'
import { runQuery, runFollowUp } from '../services/api'

export function useResearch() {
  const [state, setState] = useState({
    status: 'idle',   // idle | loading | success | error
    result: null,
    error: null,
    sessionId: null,
    queryHistory: [],
  })

  const sessionIdRef = useRef(null)

  const search = useCallback(async ({ disease, query, location }) => {
    setState(s => ({ ...s, status: 'loading', error: null }))

    try {
      const data = await runQuery({
        disease,
        query,
        location,
        sessionId: sessionIdRef.current,
      })

      sessionIdRef.current = data.sessionId

      setState(s => ({
        ...s,
        status: 'success',
        result: data,
        sessionId: data.sessionId,
        queryHistory: [
          ...s.queryHistory,
          {
            disease,
            query,
            location,
            timestamp: new Date(),
            expanded: data.query?.expanded,
          },
        ],
      }))
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Something went wrong. Please try again.'
      setState(s => ({ ...s, status: 'error', error: msg }))
    }
  }, [])

  const followUp = useCallback(async (message) => {
    if (!sessionIdRef.current) return
    setState(s => ({ ...s, status: 'loading', error: null }))

    try {
      const data = await runFollowUp({
        sessionId: sessionIdRef.current,
        message,
      })
      setState(s => ({
        ...s,
        status: 'success',
        result: data,
        queryHistory: [
          ...s.queryHistory,
          {
            query: message,
            timestamp: new Date(),
            expanded: data.query?.expanded,
            isFollowUp: true,
          },
        ],
      }))
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Follow-up failed.'
      setState(s => ({ ...s, status: 'error', error: msg }))
    }
  }, [])

  const reset = useCallback(() => {
    sessionIdRef.current = null
    setState({
      status: 'idle',
      result: null,
      error: null,
      sessionId: null,
      queryHistory: [],
    })
  }, [])

  return { ...state, search, followUp, reset }
}