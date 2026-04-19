import { useState, useEffect } from 'react'
import StructuredAnswer from '../components/StructuredAnswer'
import PublicationCard from '../components/PublicationCard'
import TrialCard from '../components/TrialCard'
import ExportPDF from '../components/Exportpdf'
import { EmptyState } from '../components/ErrorState'

const TABS = ['Answer', 'Publications', 'Clinical Trials']

export default function ResultsDashboard({ result, queryHistory, onFollowUp, onSelect, currentIndex }) {
  const [activeTab, setActiveTab] = useState('Answer')
  const [followUpText, setFollowUpText] = useState('')

  // Reset to Answer tab when user clicks a different history item
  useEffect(() => {
    setActiveTab('Answer')
  }, [result])

  const { structured, rawData, meta, query } = result || {}
  const publications   = rawData?.publications  || []
  const clinicalTrials = rawData?.clinicalTrials || []
  const recruitingCount = clinicalTrials.filter(t => t.status === 'RECRUITING').length

  const isFollowUp    = queryHistory?.length > 1 && queryHistory[queryHistory.length-1]?.isFollowUp
  const followUpQuery = isFollowUp ? queryHistory[queryHistory.length-1]?.query : null

  const handleFollowUp = (e) => {
    e.preventDefault()
    if (!followUpText.trim()) return
    onFollowUp(followUpText.trim())
    setFollowUpText('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 pt-6">
      <div className="flex gap-6">

        {/* ── SIDEBAR ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-56 flex-shrink-0">

          {/* Session History — clickable */}
          <div className="card p-4 space-y-3">
            <p className="section-label">Session History</p>
            {queryHistory?.length > 0 ? (
              <div className="space-y-1.5">
                {queryHistory.map((h, i) => {
                  const isActive = i === (currentIndex ?? queryHistory.length - 1)
                  return (
                    <button key={i}
                      onClick={() => onSelect && onSelect(i)}
                      className="w-full text-left rounded-lg px-3 py-2.5 border text-xs transition-all duration-150"
                      style={{
                        background: isActive ? 'var(--primary-soft)' : 'var(--canvas)',
                        borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                        borderLeftWidth: isActive ? '3px' : '1px',
                        color: isActive ? 'var(--primary)' : 'var(--muted)',
                        cursor: 'pointer',
                      }}>
                      <div className="flex items-start gap-1.5">
                        <span className="flex-shrink-0 mt-0.5 font-mono">{h.isFollowUp ? '↳' : '●'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{h.query || h.disease || 'Search'}</p>
                          {h.disease && !h.isFollowUp && (
                            <p className="text-2xs mt-0.5 truncate opacity-60">{h.disease}</p>
                          )}
                          <p className="text-2xs opacity-40 mt-0.5">
                            {new Date(h.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                          </p>
                        </div>
                        {!isActive && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 mt-1 opacity-30">
                            <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--faint)' }}>No history yet</p>
            )}
          </div>

          {/* Export PDF */}
          <div className="card p-4">
            <p className="section-label mb-3">Export</p>
            <ExportPDF result={result} queryInfo={query} />
          </div>

          {/* Stats */}
          {meta && (
            <div className="card p-4 space-y-2.5">
              <p className="section-label">Pipeline Results</p>
              <StatRow label="Papers searched" value={meta.publicationsRetrieved} />
              <StatRow label="Papers shown"    value={publications.length} />
              <StatRow label="Trials found"    value={meta.trialsRetrieved} />
              {recruitingCount > 0 && <StatRow label="Recruiting" value={recruitingCount} highlight />}
              {meta.cached && (
                <div className="flex items-center gap-1.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--teal)' }} />
                  <span className="text-2xs font-mono" style={{ color: 'var(--teal)' }}>Cached</span>
                </div>
              )}
            </div>
          )}

          {/* Sources */}
          <div className="card p-4 space-y-2.5">
            <p className="section-label">Data Sources</p>
            <SourceRow color="#1E40AF" label="PubMed" sub="XML format" />
            <SourceRow color="#065F46" label="OpenAlex" sub="JSON format" />
            <SourceRow color="var(--teal)" label="ClinicalTrials.gov" sub="REST API" />
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="flex-1 min-w-0 space-y-5">

          {/* Tab bar + follow-up + mobile export */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex rounded-xl p-1 gap-0.5 w-fit"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: activeTab === tab ? 'var(--primary)' : 'transparent',
                    color: activeTab === tab ? 'white' : 'var(--muted)',
                  }}>
                  {tab}
                  {tab === 'Publications' && publications.length > 0 && (
                    <CountBadge count={publications.length} active={activeTab===tab} />
                  )}
                  {tab === 'Clinical Trials' && clinicalTrials.length > 0 && (
                    <CountBadge
                      count={recruitingCount > 0 ? `${recruitingCount} recruiting` : clinicalTrials.length}
                      active={activeTab===tab} green={recruitingCount>0} />
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleFollowUp} className="flex gap-2 flex-1 max-w-sm">
              <input type="text" value={followUpText} onChange={e => setFollowUpText(e.target.value)}
                placeholder="Ask a follow-up..." className="input-field text-sm py-2 flex-1" />
              <button type="submit" disabled={!followUpText.trim()} className="btn-primary px-4 py-2 text-sm">
                Ask
              </button>
            </form>

            {/* Mobile export */}
            <div className="lg:hidden">
              <ExportPDF result={result} queryInfo={query} />
            </div>
          </div>

          {/* Mobile session pills */}
          {queryHistory?.length > 1 && (
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-1">
              {queryHistory.map((h, i) => (
                <div key={i}
                  className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs border"
                  style={{
                    background: i===queryHistory.length-1 ? 'var(--primary)' : 'var(--surface)',
                    color: i===queryHistory.length-1 ? 'white' : 'var(--muted)',
                    borderColor: i===queryHistory.length-1 ? 'var(--primary)' : 'var(--border)',
                  }}>
                  {h.isFollowUp ? '↳ ' : ''}{h.query || h.disease}
                </div>
              ))}
            </div>
          )}

          {/* ── Answer Tab ── */}
          {activeTab === 'Answer' && (
            <div className="space-y-5">
              <StructuredAnswer
                structured={structured}
                rawData={rawData}
                meta={meta}
                queryInfo={query}
                isFollowUp={isFollowUp}
                followUpQuery={followUpQuery}
                relevance={result?.relevance}
                onSuggestionClick={(suggestion) => {
                  onFollowUp(suggestion)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
              {publications.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-base" style={{ color: 'var(--ink)' }}>Top Publications</h3>
                    <button onClick={() => setActiveTab('Publications')}
                      className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                      See all {publications.length} →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {publications.slice(0,2).map((pub,i) => <PublicationCard key={pub.id} pub={pub} index={i} />)}
                  </div>
                </div>
              )}
              {clinicalTrials.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-base" style={{ color: 'var(--ink)' }}>
                      Clinical Trials
                      {recruitingCount > 0 && (
                        <span className="ml-2 text-xs font-body" style={{ color: 'var(--teal)' }}>{recruitingCount} recruiting</span>
                      )}
                    </h3>
                    <button onClick={() => setActiveTab('Clinical Trials')}
                      className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                      See all {clinicalTrials.length} →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clinicalTrials.slice(0,2).map((trial,i) => <TrialCard key={trial.id} trial={trial} index={i} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Publications Tab ── */}
          {activeTab === 'Publications' && (
            <div>
              {publications.length === 0 ? (
                <EmptyState icon="📄" title="No publications found" description="Try a broader query." />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg" style={{ color: 'var(--ink)' }}>
                      {publications.length} Research Publications
                    </h2>
                    <p className="section-label">Ranked by relevance · recency · credibility</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {publications.map((pub,i) => <PublicationCard key={pub.id} pub={pub} index={i} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Trials Tab ── */}
          {activeTab === 'Clinical Trials' && (
            <div>
              {clinicalTrials.length === 0 ? (
                <EmptyState icon="🧪" title="No clinical trials found"
                  description="Try a broader disease term." />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg" style={{ color: 'var(--ink)' }}>
                      {clinicalTrials.length} Clinical Trials
                    </h2>
                    {recruitingCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#065F46' }} />
                        <span className="text-xs font-medium" style={{ color: '#065F46' }}>{recruitingCount} recruiting</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clinicalTrials.map((trial,i) => <TrialCard key={trial.id} trial={trial} index={i} />)}
                  </div>
                </>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

function CountBadge({ count, active, green }) {
  return (
    <span className="ml-1.5 text-2xs rounded-full px-1.5 py-0.5"
      style={{
        background: active ? 'rgba(255,255,255,0.2)' : green ? 'rgba(6,95,70,0.1)' : 'var(--border)',
        color: active ? 'white' : green ? '#065F46' : 'var(--muted)',
      }}>
      {count}
    </span>
  )
}

function StatRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: highlight ? 'var(--teal)' : 'var(--ink)' }}>{value}</span>
    </div>
  )
}

function SourceRow({ color, label, sub }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
      </div>
      <span className="text-2xs font-mono" style={{ color: 'var(--faint)' }}>{sub}</span>
    </div>
  )
}