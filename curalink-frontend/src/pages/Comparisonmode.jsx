import { useState } from 'react'
import { runQuery } from '../services/api'
import PublicationCard from '../components/PublicationCard'
import TrialCard from '../components/TrialCard'

// ── Loading steps shown during comparison fetch ──
const STEPS = [
  { icon: '🧠', label: 'Expanding queries',        detail: 'Adding medical synonyms for both treatments' },
  { icon: '📚', label: 'Fetching Treatment A data', detail: 'Searching PubMed + OpenAlex + ClinicalTrials' },
  { icon: '📚', label: 'Fetching Treatment B data', detail: 'Searching PubMed + OpenAlex + ClinicalTrials' },
  { icon: '⚖️', label: 'Ranking results',           detail: 'Scoring by relevance, recency, credibility' },
  { icon: '🔬', label: 'Building comparison',       detail: 'Generating side-by-side analysis' },
]

// ── Generate AI verdict from real data ──
function buildVerdict(nameA, nameB, dataA, dataB) {
  const pubsA   = dataA?.rawData?.publications  || []
  const pubsB   = dataB?.rawData?.publications  || []
  const trialsA = dataA?.rawData?.clinicalTrials || []
  const trialsA_recruiting = trialsA.filter(t => t.status === 'RECRUITING').length
  const trialsB = dataB?.rawData?.clinicalTrials || []
  const trialsB_recruiting = trialsB.filter(t => t.status === 'RECRUITING').length

  const insightA = dataA?.structured?.personalizedInsight || dataA?.structured?.researchInsights?.summary || ''
  const insightB = dataB?.structured?.personalizedInsight || dataB?.structured?.researchInsights?.summary || ''
  const summaryA = dataA?.structured?.conditionOverview?.summary || ''
  const summaryB = dataB?.structured?.conditionOverview?.summary || ''

  const morePublications = pubsA.length >= pubsB.length ? nameA : nameB
  const moreTrials       = trialsA.length >= trialsB.length ? nameA : nameB
  const moreRecruiting   = trialsA_recruiting >= trialsB_recruiting ? nameA : nameB

  return {
    summary: `Comparing ${nameA} and ${nameB} across ${pubsA.length + pubsB.length} research publications and ${trialsA.length + trialsB.length} clinical trials. ${morePublications} has a stronger publication base (${Math.max(pubsA.length, pubsB.length)} papers), suggesting more established research. ${moreTrials} has more active clinical trial coverage (${Math.max(trialsA.length, trialsB.length)} trials), with ${Math.max(trialsA_recruiting, trialsB_recruiting)} currently recruiting. Both treatments have documented evidence — your specialist can help determine the best fit for your specific situation.`,
    insightA: insightA || summaryA || `${nameA} has ${pubsA.length} relevant publications and ${trialsA.length} clinical trials. ${trialsA_recruiting > 0 ? `${trialsA_recruiting} trials are currently recruiting.` : ''}`,
    insightB: insightB || summaryB || `${nameB} has ${pubsB.length} relevant publications and ${trialsB.length} clinical trials. ${trialsB_recruiting > 0 ? `${trialsB_recruiting} trials are currently recruiting.` : ''}`,
    statsA: { papers: pubsA.length, trials: trialsA.length, recruiting: trialsA_recruiting },
    statsB: { papers: pubsB.length, trials: trialsB.length, recruiting: trialsB_recruiting },
    morePublications,
    moreTrials,
  }
}

// ── Build comparison table rows from data ──
function buildTableRows(nameA, nameB, dataA, dataB) {
  const pubsA = dataA?.rawData?.publications || []
  const pubsB = dataB?.rawData?.publications || []
  const trialsA = dataA?.rawData?.clinicalTrials || []
  const trialsB = dataB?.rawData?.clinicalTrials || []

  const avgYearA = pubsA.length
    ? Math.round(pubsA.reduce((s, p) => s + (parseInt(p.year) || 2020), 0) / pubsA.length)
    : '—'
  const avgYearB = pubsB.length
    ? Math.round(pubsB.reduce((s, p) => s + (parseInt(p.year) || 2020), 0) / pubsB.length)
    : '—'

  const recruitingA = trialsA.filter(t => t.status === 'RECRUITING').length
  const recruitingB = trialsB.filter(t => t.status === 'RECRUITING').length

  const topSourceA = pubsA[0]?.journal || '—'
  const topSourceB = pubsB[0]?.journal || '—'

  return [
    { factor: 'Research Volume',    a: `${pubsA.length} publications`,  b: `${pubsB.length} publications`,  winA: pubsA.length > pubsB.length, winB: pubsB.length > pubsA.length },
    { factor: 'Clinical Trials',    a: `${trialsA.length} trials`,       b: `${trialsB.length} trials`,       winA: trialsA.length > trialsB.length, winB: trialsB.length > trialsA.length },
    { factor: 'Recruiting Now',     a: `${recruitingA} active`,          b: `${recruitingB} active`,          winA: recruitingA > recruitingB, winB: recruitingB > recruitingA },
    { factor: 'Avg. Publication Yr',a: String(avgYearA),                 b: String(avgYearB),                 winA: avgYearA > avgYearB, winB: avgYearB > avgYearA },
    { factor: 'Top Journal',        a: topSourceA.substring(0, 28),      b: topSourceB.substring(0, 28),      winA: false, winB: false },
    { factor: 'Data Sources',       a: 'PubMed · OpenAlex',              b: 'PubMed · OpenAlex',              winA: false, winB: false },
  ]
}

// ── Doctor questions ──
function buildDoctorQuestions(nameA, nameB) {
  return [
    `Based on my specific condition and history, which is more appropriate — ${nameA} or ${nameB}?`,
    `What are the short-term and long-term side effects I should know about for each option?`,
    `Are there any active clinical trials for ${nameA} or ${nameB} that I could qualify for?`,
    `How do ${nameA} and ${nameB} compare in terms of cost, access, and insurance coverage?`,
    `If I start with one and it doesn't work, can I switch to the other?`,
    `Are there any contraindications with my current medications?`,
  ]
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function CompareInput({ disease, nameA, nameB, setNameA, setNameB, onCompare, loading }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    if (nameA.trim() && nameB.trim()) onCompare(nameA.trim(), nameB.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div>
        <p className="font-display text-xl font-medium mb-1" style={{ color: 'var(--ink)' }}>
          Compare Two Treatments
        </p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Enter two treatments, drugs, or approaches to get a side-by-side evidence comparison.
          {disease && <span className="ml-1 font-medium" style={{ color: 'var(--primary)' }}>Context: {disease}</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="section-label block mb-2">Treatment A</label>
          <input
            type="text"
            value={nameA}
            onChange={e => setNameA(e.target.value)}
            placeholder="e.g. Levodopa"
            className="input-field"
            disabled={loading}
            autoFocus
          />
        </div>
        <div>
          <label className="section-label block mb-2">Treatment B</label>
          <input
            type="text"
            value={nameB}
            onChange={e => setNameB(e.target.value)}
            placeholder="e.g. Deep Brain Stimulation"
            className="input-field"
            disabled={loading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !nameA.trim() || !nameB.trim()}
        className="btn-primary w-full py-3"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            Comparing...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h5M9 8h5M7 4v8M9 4v8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Compare Treatments
          </>
        )}
      </button>

      {/* Quick examples */}
      <div className="flex flex-wrap gap-2">
        {[
          ['Levodopa', 'Deep Brain Stimulation'],
          ['Chemotherapy', 'Immunotherapy'],
          ['Metformin', 'Insulin Therapy'],
        ].map(([a, b]) => (
          <button key={a} type="button"
            onClick={() => { setNameA(a); setNameB(b) }}
            className="text-xs rounded-full px-3 py-1.5 border transition-all duration-150"
            style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--primary)'; e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.background='var(--primary-soft)' }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='transparent' }}>
            {a} vs {b}
          </button>
        ))}
      </div>
    </form>
  )
}

function CompareLoading({ activeStep }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: 'var(--primary)', animationDelay: `${i*120}ms` }} />
          ))}
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Comparison Pipeline Running
        </p>
      </div>
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isDone   = i < activeStep
          const isActive = i === activeStep
          return (
            <div key={i} className="flex items-start gap-3 transition-all duration-500"
              style={{ opacity: i > activeStep ? 0.3 : 1 }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{
                  background: isDone ? 'var(--teal-soft)' : isActive ? 'var(--primary-soft)' : 'var(--canvas)',
                  border: `1px solid ${isDone ? 'var(--teal)' : isActive ? 'var(--primary)' : 'var(--border)'}`,
                }}>
                {isDone
                  ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5L5.5 9.5L10.5 4" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <span>{step.icon}</span>
                }
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-medium" style={{ color: isDone ? 'var(--teal)' : 'var(--ink)' }}>
                  {step.label}
                  {isActive && <span className="ml-2 text-2xs font-mono animate-pulse" style={{ color: 'var(--primary)' }}>running</span>}
                </p>
                {(isActive || isDone) && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{step.detail}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VerdictCard({ nameA, nameB, verdict }) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'var(--primary-soft)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-xl">⚖️</span>
        <div>
          <p className="section-label" style={{ color: 'var(--primary)' }}>AI Research Verdict</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Based on {verdict.statsA.papers + verdict.statsB.papers} publications · {verdict.statsA.trials + verdict.statsB.trials} clinical trials
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Main summary */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
          {verdict.summary}
        </p>

        {/* Side-by-side insight boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SideInsight name={nameA} insight={verdict.insightA} stats={verdict.statsA}
            isStronger={verdict.morePublications === nameA} side="A" />
          <SideInsight name={nameB} insight={verdict.insightB} stats={verdict.statsB}
            isStronger={verdict.morePublications === nameB} side="B" />
        </div>

        {/* Disclaimer */}
        <div className="flex gap-2 rounded-xl p-3" style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}>
          <span className="text-sm flex-shrink-0">⚠️</span>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            This comparison is based on retrieved research evidence only. It does not constitute medical advice.
            Individual suitability depends on your specific condition, medical history, and your doctor's assessment.
          </p>
        </div>
      </div>
    </div>
  )
}

function SideInsight({ name, insight, stats, isStronger, side }) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--canvas)', border: `1px solid ${isStronger ? 'var(--teal)' : 'var(--border)'}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: side === 'A' ? '#1A3A5C' : '#2A7F7F' }}>
            {side}
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{name}</span>
        </div>
        {isStronger && (
          <span className="text-2xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
            More research
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
        {insight?.substring(0, 280)}{insight?.length > 280 ? '...' : ''}
      </p>
      <div className="flex gap-3 text-xs font-mono" style={{ color: 'var(--faint)' }}>
        <span>{stats.papers} papers</span>
        <span>·</span>
        <span>{stats.trials} trials</span>
        {stats.recruiting > 0 && <><span>·</span><span style={{ color: 'var(--teal)' }}>{stats.recruiting} recruiting</span></>}
      </div>
    </div>
  )
}

function ComparisonTable({ nameA, nameB, rows }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="section-label">Evidence Comparison</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          Head-to-head metrics from retrieved research data
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--canvas)', borderBottom: '1px solid var(--border)' }}>
              <th className="text-left px-6 py-3 text-xs font-medium" style={{ color: 'var(--faint)', width: '30%' }}>Factor</th>
              <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#1A3A5C' }}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" style={{ background: '#1A3A5C' }} />
                  {nameA}
                </span>
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#2A7F7F' }}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#2A7F7F' }} />
                  {nameB}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--canvas)' }}>
                <td className="px-6 py-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>{row.factor}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-medium px-2 py-1 rounded-lg"
                    style={{
                      color: row.winA ? '#1A3A5C' : 'var(--muted)',
                      background: row.winA ? 'var(--primary-soft)' : 'transparent',
                      fontWeight: row.winA ? 600 : 400,
                    }}>
                    {row.a}
                    {row.winA && ' ✓'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-medium px-2 py-1 rounded-lg"
                    style={{
                      color: row.winB ? '#2A7F7F' : 'var(--muted)',
                      background: row.winB ? 'var(--teal-soft)' : 'transparent',
                      fontWeight: row.winB ? 600 : 400,
                    }}>
                    {row.b}
                    {row.winB && ' ✓'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CollapsibleSection({ title, count, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 transition-all duration-150"
        style={{ background: 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--canvas)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{title}</span>
          <span className="text-2xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--muted)' }}>
            {count}
          </span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: 'var(--faint)' }}>
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

function DoctorQuestions({ questions, nameA, nameB }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">💬</span>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Questions for Your Doctor</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            When discussing {nameA} vs {nameB} with your specialist
          </p>
        </div>
      </div>
      <div className="space-y-2.5">
        {questions.map((q, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl p-3"
            style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}>
            <span className="text-xs font-mono font-bold flex-shrink-0 mt-0.5"
              style={{ color: 'var(--primary)' }}>
              Q{i + 1}
            </span>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{q}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorMsg({ error, onRetry }) {
  return (
    <div className="card p-8 text-center">
      <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ background: 'rgba(153,27,27,0.1)', border: '1px solid rgba(153,27,27,0.2)' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7.5" stroke="#991B1B" strokeWidth="1.3"/>
          <path d="M9 5.5v4M9 11.5v.5" stroke="#991B1B" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>Comparison failed</p>
      <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>{error}</p>
      <button onClick={onRetry} className="btn-primary px-5 py-2 text-sm">Try again</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function ComparisonMode({ disease = '', onBack }) {
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [results, setResults] = useState(null)  // { dataA, dataB, verdict, tableRows, questions }
  const [error, setError] = useState(null)

  const compare = async (treatA, treatB) => {
    setLoading(true)
    setError(null)
    setResults(null)
    setActiveStep(0)

    // Animate loading steps
    const stepTimings = [0, 600, 1200, 1800, 2400]
    const timers = stepTimings.map((t, i) => setTimeout(() => setActiveStep(i), t))

    try {
      // Parallel fetch — this is the key performance feature
      const [dataA, dataB] = await Promise.all([
        runQuery({ disease, query: treatA, location: '' }),
        runQuery({ disease, query: treatB, location: '' }),
      ])

      timers.forEach(clearTimeout)
      setActiveStep(5)

      const verdict    = buildVerdict(treatA, treatB, dataA, dataB)
      const tableRows  = buildTableRows(treatA, treatB, dataA, dataB)
      const questions  = buildDoctorQuestions(treatA, treatB)

      setResults({ dataA, dataB, verdict, tableRows, questions })
    } catch (err) {
      timers.forEach(clearTimeout)
      setError(err.response?.data?.error || err.message || 'Comparison failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResults(null)
    setError(null)
    setActiveStep(0)
  }

  const pubsA   = results?.dataA?.rawData?.publications  || []
  const pubsB   = results?.dataB?.rawData?.publications  || []
  const trialsA = results?.dataA?.rawData?.clinicalTrials || []
  const trialsB = results?.dataB?.rawData?.clinicalTrials || []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">

      {/* Back button */}
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm transition-colors duration-150"
        style={{ color: 'var(--muted)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7L9 12M4 7H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Search
      </button>

      {/* Page title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: 'var(--primary-soft)', border: '1px solid var(--border)' }}>
          ⚖️
        </div>
        <div>
          <h1 className="font-display text-2xl font-medium" style={{ color: 'var(--ink)' }}>
            Research Comparison
          </h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Evidence-based side-by-side analysis using live research data
          </p>
        </div>

        {results && (
          <button onClick={reset}
            className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150"
            style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--primary)'; e.currentTarget.style.borderColor='var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.borderColor='var(--border)' }}>
            New comparison
          </button>
        )}
      </div>

      {/* Input form — always shown, disabled during loading */}
      <CompareInput disease={disease} nameA={nameA} nameB={nameB}
        setNameA={setNameA} setNameB={setNameB}
        onCompare={compare} loading={loading} />

      {/* Loading pipeline */}
      {loading && <CompareLoading activeStep={activeStep} />}

      {/* Error */}
      {error && <ErrorMsg error={error} onRetry={() => compare(nameA, nameB)} />}

      {/* Results */}
      {results && (
        <div className="space-y-5">
          {/* 1. AI Verdict */}
          <VerdictCard nameA={nameA} nameB={nameB} verdict={results.verdict} />

          {/* 2. Comparison Table */}
          <ComparisonTable nameA={nameA} nameB={nameB} rows={results.tableRows} />

          {/* 3. Supporting Research — collapsible */}
          {pubsA.length > 0 && (
            <CollapsibleSection title={`📄 Publications for ${nameA}`} count={`${pubsA.length} papers`}>
              {pubsA.slice(0, 6).map((pub, i) => (
                <PublicationCard key={pub.id} pub={pub} index={i} />
              ))}
            </CollapsibleSection>
          )}
          {pubsB.length > 0 && (
            <CollapsibleSection title={`📄 Publications for ${nameB}`} count={`${pubsB.length} papers`}>
              {pubsB.slice(0, 6).map((pub, i) => (
                <PublicationCard key={pub.id} pub={pub} index={i} />
              ))}
            </CollapsibleSection>
          )}
          {(trialsA.length > 0 || trialsB.length > 0) && (
            <CollapsibleSection title="🧪 Clinical Trials (Both)"
              count={`${trialsA.length + trialsB.length} total`}>
              {[...trialsA.slice(0,3), ...trialsB.slice(0,3)].map((trial, i) => (
                <TrialCard key={trial.id} trial={trial} index={i} />
              ))}
            </CollapsibleSection>
          )}

          {/* 4. Doctor questions */}
          <DoctorQuestions
            questions={results.questions}
            nameA={nameA}
            nameB={nameB}
          />
        </div>
      )}
    </div>
  )
}