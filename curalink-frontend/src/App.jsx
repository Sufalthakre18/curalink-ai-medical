import { useState } from 'react'
import Header from './components/Header'
import SearchForm from './components/SearchForm'
import ResultsDashboard from './pages/ResultsDashboard'
import ComparisonMode from './pages/Comparisonmode'
import PipelineStatus from './components/Pipelinestatus'
import { ErrorState } from './components/ErrorState'
import { useResearch } from './hooks/useResearch'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const { status, result, error, queryHistory, currentIndex, search, followUp, selectHistoryItem, reset } = useResearch()
  const { isDark, toggle } = useTheme()
  const [view, setView] = useState('home') // 'home' | 'compare'

  const hasResults = status === 'success' && result
  const isLoading  = status === 'loading'
  const isError    = status === 'error'
  const isIdle     = status === 'idle'
  const showCompare = view === 'compare'

  const handleReset = () => { reset(); setView('home') }

  const currentDisease = result?.query?.original?.disease
    || queryHistory?.[0]?.disease
    || ''

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)', color: 'var(--ink)' }}>
      <Header onReset={handleReset} hasResults={hasResults || isLoading || isError || showCompare}
        isDark={isDark} onToggleTheme={toggle} />

      <div className="pt-14">

        {/* ── IDLE: Hero ── */}
        {isIdle && !showCompare && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-16">
            <SearchForm onSearch={search} loading={false} />

            {/* Compare Mode entry button */}
            <div className="mt-8">
              <button onClick={() => setView('compare')}
                className="flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all duration-200"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--surface)' }}
                onMouseEnter={e => { e.currentTarget.style.color='var(--primary)'; e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.background='var(--primary-soft)' }}
                onMouseLeave={e => { e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--surface)' }}>
                <span>⚖️</span>
                Compare two treatments side-by-side
                <span className="text-2xs font-mono px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>New</span>
              </button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-6" style={{ opacity: 0.4 }}>
              <TrustItem label="PubMed"            sub="NCBI peer-reviewed" />
              <div className="w-px h-6" style={{ background: 'var(--border)' }} />
              <TrustItem label="OpenAlex"           sub="Open access research" />
              <div className="w-px h-6" style={{ background: 'var(--border)' }} />
              <TrustItem label="ClinicalTrials.gov" sub="US NLM registry" />
            </div>
          </div>
        )}

        {/* ── COMPARE MODE ── */}
        {showCompare && (
          <ComparisonMode
            disease={currentDisease}
            onBack={() => setView('home')}
          />
        )}

        {/* ── LOADING ── */}
        {isLoading && !showCompare && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-20">
            <PipelineStatus />
          </div>
        )}

        {/* ── ERROR ── */}
        {isError && !showCompare && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
            <ErrorState message={error} onRetry={reset} />
          </div>
        )}

        {/* ── RESULTS ── */}
        {hasResults && !showCompare && (
          <>
            <div className="sticky top-14 z-40 backdrop-blur-md"
              style={{ background: 'color-mix(in srgb, var(--surface) 90%, transparent)', borderBottom: '1px solid var(--border)' }}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
                <CompactSearchBar onSearch={search} />
                <div className="hidden sm:flex items-center gap-2 text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--teal)' }} />
                  {result.meta?.publicationsRetrieved || 0} papers · {result.meta?.trialsRetrieved || 0} trials
                </div>
                {/* Compare button inside results view */}
                <button onClick={() => setView('compare')}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border flex-shrink-0 transition-all duration-150"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.color='var(--primary)'; e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.background='var(--primary-soft)' }}
                  onMouseLeave={e => { e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='transparent' }}>
                  ⚖️ Compare
                </button>
              </div>
            </div>
            <ResultsDashboard result={result} queryHistory={queryHistory} onFollowUp={followUp} onSelect={selectHistoryItem} currentIndex={currentIndex} onCompare={() => setView('compare')} />
          </>
        )}
      </div>
    </div>
  )
}

function TrustItem({ label, sub }) {
  return (
    <div className="text-center">
      <p className="text-xs font-medium font-mono" style={{ color: 'var(--ink)' }}>{label}</p>
      <p className="text-2xs" style={{ color: 'var(--faint)' }}>{sub}</p>
    </div>
  )
}

function CompactSearchBar({ onSearch }) {
  const [val, setVal] = useState('')
  const handleKey = (e) => {
    if (e.key === 'Enter' && val.trim()) {
      onSearch({ query: val.trim(), disease: '', location: '' })
      setVal('')
    }
  }
  return (
    <input type="text" value={val} onChange={e => setVal(e.target.value)}
      onKeyDown={handleKey} placeholder="New search — press Enter..."
      className="input-field text-sm py-2 flex-1 max-w-xl" />
  )
}