import { useCallback } from 'react'
import Header from './components/Header'
import SearchForm from './components/SearchForm'
import ResultsDashboard from './pages/ResultsDashboard'
import LoadingSkeleton from './components/LoadingSkeleton'
import { ErrorState } from './components/ErrorState'
import { useResearch } from './hooks/useResearch'

export default function App() {
  const { status, result, error, queryHistory, search, followUp, reset } = useResearch()

  const hasResults = status === 'success' && result

  return (
    <div className="min-h-screen bg-canvas font-body">
      <Header onReset={reset} hasResults={hasResults} />

      {/* Main container — padded for fixed header */}
      <div className="pt-14">

        {/* ── IDLE: Hero search ── */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-16">
            <SearchForm onSearch={search} loading={false} />

            {/* Bottom trust bar */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-6 opacity-50">
              <TrustItem label="PubMed" sub="NCBI database" />
              <div className="w-px h-6 bg-border" />
              <TrustItem label="OpenAlex" sub="Open research" />
              <div className="w-px h-6 bg-border" />
              <TrustItem label="ClinicalTrials.gov" sub="US NLM registry" />
            </div>
          </div>
        )}

        {/* ── LOADING: shimmer skeleton ── */}
        {status === 'loading' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-20">
            {/* Inline loading indicator */}
            <div className="card p-4 mb-6 flex items-center gap-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
              <p className="text-sm text-muted">
                Searching PubMed, OpenAlex and ClinicalTrials.gov — ranking by relevance...
              </p>
            </div>
            <LoadingSkeleton />
          </div>
        )}

        {/* ── ERROR ── */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
            <div className="w-full max-w-md space-y-6">
              <ErrorState message={error} onRetry={reset} />
            </div>
          </div>
        )}

        {/* ── SUCCESS: Results dashboard ── */}
        {hasResults && (
          <>
            {/* Compact search bar at top */}
            <div className="border-b border-border bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-xl">
                    <CompactSearchBar onSearch={search} loading={false} />
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-text" />
                    {result.meta?.publicationsRetrieved || 0} papers · {result.meta?.trialsRetrieved || 0} trials
                  </div>
                </div>
              </div>
            </div>

            <ResultsDashboard
              result={result}
              queryHistory={queryHistory}
              onFollowUp={followUp}
              loading={false}
            />
          </>
        )}
      </div>
    </div>
  )
}

function TrustItem({ label, sub }) {
  return (
    <div className="text-center">
      <p className="text-xs font-medium text-ink font-mono">{label}</p>
      <p className="text-2xs text-faint">{sub}</p>
    </div>
  )
}

function CompactSearchBar({ onSearch, loading }) {
  const [val, setVal] = useState('')

  const handleKey = (e) => {
    if (e.key === 'Enter' && val.trim()) {
      onSearch({ query: val.trim(), disease: '', location: '' })
      setVal('')
    }
  }

  return (
    <input
      type="text"
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={handleKey}
      placeholder="New search — type and press Enter..."
      className="input-field text-sm py-2"
      disabled={loading}
    />
  )
}

// Need useState for CompactSearchBar
import { useState } from 'react'