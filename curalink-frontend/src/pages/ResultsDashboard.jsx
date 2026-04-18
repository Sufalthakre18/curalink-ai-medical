import { useState } from 'react'
import StructuredAnswer from '../components/StructuredAnswer'
import PublicationCard from '../components/PublicationCard'
import TrialCard from '../components/TrialCard'
import { EmptyState } from '../components/ErrorState'

const TABS = ['Answer', 'Publications', 'Clinical Trials']

export default function ResultsDashboard({ result, queryHistory, onFollowUp }) {
  const [activeTab, setActiveTab] = useState('Answer')
  const [followUpText, setFollowUpText] = useState('')

  const { structured, rawData, meta, query } = result || {}
  const publications   = rawData?.publications  || []
  const clinicalTrials = rawData?.clinicalTrials || []
  const recruitingCount = clinicalTrials.filter(t => t.status === 'RECRUITING').length

  // Detect if this is a follow-up
  const isFollowUp    = queryHistory?.length > 1 && queryHistory[queryHistory.length - 1]?.isFollowUp
  const followUpQuery = isFollowUp ? queryHistory[queryHistory.length - 1]?.query : null

  const handleFollowUp = (e) => {
    e.preventDefault()
    if (!followUpText.trim()) return
    onFollowUp(followUpText.trim())
    setFollowUpText('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 pt-6">
      <div className="flex gap-6">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="hidden lg:flex flex-col gap-5 w-56 flex-shrink-0">

          {/* Session History — always visible */}
          <div className="card p-4 space-y-3">
            <p className="font-mono text-2xs uppercase tracking-widest text-faint">Session History</p>
            {queryHistory && queryHistory.length > 0 ? (
              <div className="space-y-2">
                {queryHistory.map((h, i) => (
                  <div key={i} className={`rounded-lg px-3 py-2 border text-xs transition-colors
                    ${i === queryHistory.length - 1
                      ? 'bg-primary-soft border-primary/20 text-primary'
                      : 'bg-canvas border-border text-muted'}`}>
                    <div className="flex items-start gap-1.5">
                      <span className="flex-shrink-0 mt-0.5">{h.isFollowUp ? '↳' : '●'}</span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{h.query || h.disease || 'Search'}</p>
                        {h.disease && !h.isFollowUp && (
                          <p className="text-2xs opacity-60 truncate mt-0.5">{h.disease}</p>
                        )}
                        <p className="text-2xs opacity-40 mt-0.5">
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-faint">No history yet</p>
            )}
          </div>

          {/* Pipeline Stats — no LLM label shown */}
          {meta && (
            <div className="card p-4 space-y-2.5">
              <p className="font-mono text-2xs uppercase tracking-widest text-faint">Results</p>
              <StatRow label="Papers searched" value={meta.publicationsRetrieved} />
              <StatRow label="Papers shown"    value={publications.length} />
              <StatRow label="Trials found"    value={meta.trialsRetrieved} />
              {recruitingCount > 0 && (
                <StatRow label="Recruiting"    value={recruitingCount} highlight />
              )}
              {meta.cached && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                  <span className="text-2xs text-teal font-mono">Cached</span>
                </div>
              )}
            </div>
          )}

          {/* Sources */}
          <div className="card p-4 space-y-2.5">
            <p className="font-mono text-2xs uppercase tracking-widest text-faint">Data Sources</p>
            <SourceRow color="bg-blue-text"  label="PubMed" />
            <SourceRow color="bg-green-text" label="OpenAlex" />
            <SourceRow color="bg-teal"       label="ClinicalTrials.gov" />
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 min-w-0 space-y-5">

          {/* Tab bar + follow-up input */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Tabs */}
            <div className="flex bg-white border border-border rounded-xl p-1 gap-0.5 w-fit">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                    ${activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink'}`}>
                  {tab}
                  {tab === 'Publications' && publications.length > 0 && (
                    <CountBadge count={publications.length} active={activeTab === tab} />
                  )}
                  {tab === 'Clinical Trials' && clinicalTrials.length > 0 && (
                    <CountBadge
                      count={recruitingCount > 0 ? `${recruitingCount} recruiting` : clinicalTrials.length}
                      active={activeTab === tab}
                      green={recruitingCount > 0}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Follow-up input */}
            <form onSubmit={handleFollowUp} className="flex gap-2 flex-1 max-w-sm">
              <input
                type="text"
                value={followUpText}
                onChange={e => setFollowUpText(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="input-field text-sm py-2 flex-1"
              />
              <button type="submit" disabled={!followUpText.trim()} className="btn-primary px-4 py-2 text-sm">
                Ask
              </button>
            </form>
          </div>

          {/* Mobile session history */}
          {queryHistory?.length > 1 && (
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-1">
              {queryHistory.map((h, i) => (
                <div key={i} className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs border
                  ${i === queryHistory.length - 1
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-muted border-border'}`}>
                  {h.isFollowUp ? '↳ ' : ''}{h.query || h.disease}
                </div>
              ))}
            </div>
          )}

          {/* ── TAB: Answer ── */}
          {activeTab === 'Answer' && (
            <div className="space-y-5">
              <StructuredAnswer rawData={rawData}
                structured={structured}
                meta={meta}
                queryInfo={query}
                isFollowUp={isFollowUp}
                followUpQuery={followUpQuery}
              />

              {/* Top 2 publications preview */}
              {publications.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-base text-ink">Top Publications</h3>
                    <button onClick={() => setActiveTab('Publications')}
                      className="text-xs text-primary hover:text-primary-light font-medium">
                      See all {publications.length} →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {publications.slice(0, 2).map((pub, i) => (
                      <PublicationCard key={pub.id} pub={pub} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top 2 trials preview */}
              {clinicalTrials.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-base text-ink">
                      Clinical Trials
                      {recruitingCount > 0 && (
                        <span className="ml-2 text-xs font-body text-green-text">{recruitingCount} recruiting</span>
                      )}
                    </h3>
                    <button onClick={() => setActiveTab('Clinical Trials')}
                      className="text-xs text-primary hover:text-primary-light font-medium">
                      See all {clinicalTrials.length} →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clinicalTrials.slice(0, 2).map((trial, i) => (
                      <TrialCard key={trial.id} trial={trial} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Publications ── */}
          {activeTab === 'Publications' && (
            <div>
              {publications.length === 0 ? (
                <EmptyState icon="📄" title="No publications found"
                  description="Try a broader query or disease name." />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg text-ink">{publications.length} Research Publications</h2>
                    <p className="font-mono text-2xs text-faint uppercase tracking-widest">
                      Ranked by relevance · recency · credibility
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {publications.map((pub, i) => (
                      <PublicationCard key={pub.id} pub={pub} index={i} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: Clinical Trials ── */}
          {activeTab === 'Clinical Trials' && (
            <div>
              {clinicalTrials.length === 0 ? (
                <EmptyState icon="🧪" title="No clinical trials found"
                  description="Try a broader disease term. Trials are location-filtered when you provide a location." />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg text-ink">{clinicalTrials.length} Clinical Trials</h2>
                    {recruitingCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-text animate-pulse" />
                        <span className="text-xs text-green-text font-medium">{recruitingCount} currently recruiting</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clinicalTrials.map((trial, i) => (
                      <TrialCard key={trial.id} trial={trial} index={i} />
                    ))}
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
    <span className={`ml-1.5 text-2xs rounded-full px-1.5 py-0.5
      ${active ? 'bg-white/20 text-white'
        : green ? 'bg-green-badge text-green-text'
        : 'bg-border text-muted'}`}>
      {count}
    </span>
  )
}

function StatRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-green-text' : 'text-ink'}`}>{value}</span>
    </div>
  )
}

function SourceRow({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}