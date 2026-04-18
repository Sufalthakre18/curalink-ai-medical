import { useState } from 'react'
import StructuredAnswer from '../components/StructuredAnswer'
import PublicationCard from '../components/PublicationCard'
import TrialCard from '../components/TrialCard'
import QueryHistory from '../components/QueryHistory'
import SearchForm from '../components/SearchForm'
import { EmptyState } from '../components/ErrorState'

const TABS = ['Overview', 'Publications', 'Clinical Trials']

export default function ResultsDashboard({ result, queryHistory, onFollowUp, loading }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [followUpText, setFollowUpText] = useState('')

  const { structured, rawData, meta, query } = result || {}
  const publications  = rawData?.publications || []
  const clinicalTrials = rawData?.clinicalTrials || []
  const recruitingCount = clinicalTrials.filter(t => t.status === 'RECRUITING').length

  const handleFollowUp = (e) => {
    e.preventDefault()
    if (!followUpText.trim()) return
    onFollowUp(followUpText.trim())
    setFollowUpText('')
  }

  return (
    <div className="flex gap-6 max-w-7xl mx-auto px-4 sm:px-6 pb-20">

      {/* ── Left sidebar ── */}
      <aside className="hidden lg:flex flex-col gap-6 w-60 flex-shrink-0 pt-6">
        <QueryHistory history={queryHistory} />

        {/* Stats panel */}
        {meta && (
          <div className="card p-4 space-y-3">
            <p className="section-label">Pipeline Stats</p>
            <StatRow label="Papers fetched" value={meta.publicationsRetrieved} />
            <StatRow label="Trials found"   value={meta.trialsRetrieved} />
            <StatRow label="Shown"          value={`${publications.length} papers`} />
            <StatRow label="Time"           value={`${(meta.processingTimeMs/1000).toFixed(1)}s`} />
            <StatRow label="LLM"            value={meta.llmUsed || '—'} mono />
            {meta.cached && (
              <div className="flex items-center gap-1.5 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                <span className="text-2xs text-teal font-mono">Cached response</span>
              </div>
            )}
          </div>
        )}

        {/* Sources legend */}
        <div className="card p-4 space-y-2.5">
          <p className="section-label">Data Sources</p>
          <SourceRow color="bg-blue-text" label="PubMed" />
          <SourceRow color="bg-green-text" label="OpenAlex" />
          <SourceRow color="bg-teal" label="ClinicalTrials.gov" />
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 pt-6 space-y-6">

        {/* Tab bar + follow-up */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-white border border-border rounded-xl p-1 gap-0.5 w-fit">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-all duration-150
                  ${activeTab === tab
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                  }`}
              >
                {tab}
                {tab === 'Publications' && publications.length > 0 && (
                  <span className={`ml-1.5 text-2xs rounded-full px-1.5 py-0.5
                    ${activeTab === tab ? 'bg-white/20' : 'bg-border'}`}>
                    {publications.length}
                  </span>
                )}
                {tab === 'Clinical Trials' && clinicalTrials.length > 0 && (
                  <span className={`ml-1.5 text-2xs rounded-full px-1.5 py-0.5
                    ${activeTab === tab
                      ? 'bg-white/20'
                      : recruitingCount > 0 ? 'bg-green-badge text-green-text' : 'bg-border'
                    }`}>
                    {recruitingCount > 0 ? `${recruitingCount} recruiting` : clinicalTrials.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Follow-up input */}
          <form onSubmit={handleFollowUp} className="flex gap-2 flex-1 sm:max-w-xs">
            <input
              type="text"
              value={followUpText}
              onChange={e => setFollowUpText(e.target.value)}
              placeholder="Ask a follow-up..."
              className="input-field text-sm py-2 flex-1"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !followUpText.trim()}
              className="btn-primary px-4 py-2 text-sm"
            >
              Ask
            </button>
          </form>
        </div>

        {/* ── Tab: Overview ── */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            <StructuredAnswer
              structured={structured}
              meta={meta}
              queryInfo={query}
            />

            {/* Quick preview of top papers */}
            {publications.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg text-ink">Top Publications</h2>
                  <button
                    onClick={() => setActiveTab('Publications')}
                    className="text-xs text-primary hover:text-primary-light font-medium"
                  >
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

            {/* Quick preview of top trials */}
            {clinicalTrials.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg text-ink">
                    Clinical Trials
                    {recruitingCount > 0 && (
                      <span className="ml-2 text-sm font-body text-green-text">
                        {recruitingCount} recruiting
                      </span>
                    )}
                  </h2>
                  <button
                    onClick={() => setActiveTab('Clinical Trials')}
                    className="text-xs text-primary hover:text-primary-light font-medium"
                  >
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

        {/* ── Tab: Publications ── */}
        {activeTab === 'Publications' && (
          <div>
            {publications.length === 0 ? (
              <EmptyState
                icon="📄"
                title="No publications found"
                description="Try a different query or disease term to find relevant research."
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg text-ink">
                    {publications.length} Research Publications
                  </h2>
                  <p className="section-label">Ranked by relevance · recency · credibility</p>
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

        {/* ── Tab: Clinical Trials ── */}
        {activeTab === 'Clinical Trials' && (
          <div>
            {clinicalTrials.length === 0 ? (
              <EmptyState
                icon="🧪"
                title="No clinical trials found"
                description="No matching trials in ClinicalTrials.gov for this query. Try a broader disease term."
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg text-ink">
                    {clinicalTrials.length} Clinical Trials
                  </h2>
                  {recruitingCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-text animate-pulse" />
                      <span className="text-xs text-green-text font-medium">
                        {recruitingCount} currently recruiting
                      </span>
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
  )
}

function StatRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-xs text-ink font-medium ${mono ? 'font-mono text-2xs' : ''}`}>
        {value}
      </span>
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