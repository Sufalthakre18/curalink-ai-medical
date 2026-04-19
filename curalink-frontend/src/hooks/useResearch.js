import { useState, useCallback, useRef } from 'react'
import { runQuery, runFollowUp } from '../services/api'

export function useResearch() {
  const [state, setState] = useState({
    status: 'idle',
    result: null,
    error: null,
    sessionId: null,
    queryHistory: [],
    // Store full result per history entry so clicking restores it
    resultHistory: [],
    currentIndex: -1,
  })

  const sessionIdRef = useRef(null)

  const search = useCallback(async ({ disease, query, location }) => {
    setState(s => ({ ...s, status: 'loading', error: null }))

    try {
      const data = await runQuery({ disease, query, location, sessionId: sessionIdRef.current })
      sessionIdRef.current = data.sessionId

      const entry = { disease, query, location, timestamp: new Date(), expanded: data.query?.expanded, isFollowUp: false }

      setState(s => {
        const newHistory = [...s.queryHistory, entry]
        const newResultHistory = [...s.resultHistory, data]
        return {
          status: 'success',
          result: data,
          sessionId: data.sessionId,
          error: null,
          queryHistory: newHistory,
          resultHistory: newResultHistory,
          currentIndex: newHistory.length - 1,
        }
      })
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Something went wrong.'
      setState(s => ({ ...s, status: 'error', error: msg }))
    }
  }, [])

  const followUp = useCallback(async (message) => {
    if (!sessionIdRef.current) return
    setState(s => ({ ...s, status: 'loading', error: null }))

    try {
      const data = await runFollowUp({ sessionId: sessionIdRef.current, message })
      const entry = { query: message, timestamp: new Date(), expanded: data.query?.expanded, isFollowUp: true }

      setState(s => {
        const newHistory = [...s.queryHistory, entry]
        const newResultHistory = [...s.resultHistory, data]
        return {
          status: 'success',
          result: data,
          sessionId: s.sessionId,
          error: null,
          queryHistory: newHistory,
          resultHistory: newResultHistory,
          currentIndex: newHistory.length - 1,
        }
      })
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Follow-up failed.'
      setState(s => ({ ...s, status: 'error', error: msg }))
    }
  }, [])

  // Click history item → instantly restore that result
  const selectHistoryItem = useCallback((index) => {
    setState(s => {
      if (index < 0 || index >= s.resultHistory.length) return s
      return {
        ...s,
        status: 'success',
        result: s.resultHistory[index],
        currentIndex: index,
        error: null,
      }
    })
  }, [])

  const reset = useCallback(() => {
    sessionIdRef.current = null
    setState({ status: 'idle', result: null, error: null, sessionId: null, queryHistory: [], resultHistory: [], currentIndex: -1 })
  }, [])

  return { ...state, search, followUp, selectHistoryItem, reset }
}