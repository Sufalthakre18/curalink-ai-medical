import { useState } from 'react'

const EXAMPLE_QUERIES = [
  { disease: "Parkinson's disease", query: 'Deep Brain Stimulation', location: 'Toronto, Canada' },
  { disease: 'Lung cancer',         query: 'Latest immunotherapy treatments', location: '' },
  { disease: 'Diabetes',            query: 'Clinical trials 2024', location: '' },
  { disease: "Alzheimer's disease", query: 'Top researchers and findings', location: '' },
]

export default function SearchForm({ onSearch, loading, compact = false }) {
  const [disease, setDisease]   = useState('')
  const [query, setQuery]       = useState('')
  const [location, setLocation] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!disease.trim() && !query.trim()) return
    onSearch({ disease: disease.trim(), query: query.trim(), location: location.trim() })
  }

  const fillExample = (ex) => {
    setDisease(ex.disease)
    setQuery(ex.query)
    setLocation(ex.location)
  }

  if (compact) {
    // Compact search bar shown after results load
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask a follow-up question..."
          className="input-field flex-1 text-sm py-2.5"
        />
        <button type="submit" disabled={loading || !query.trim()} className="btn-primary px-5 py-2.5 text-sm">
          {loading ? <Spinner size="sm" /> : 'Ask'}
        </button>
      </form>
    )
  }

  return (
    <div className="w-full  max-w-2xl mx-auto">
      {/* Hero text */}
      <div className="text-center mb-8">
        
        <h1 className="font-display text-4xl sm:text-5xl text-ink font-medium leading-tight tracking-tight mb-1">
          Understand your condition<br />
          <span className="italic font-light text-[#028090]">with confidence</span>
        </h1>
        <p className="text-muted font-body text-base max-w-md mx-auto leading-relaxed">
          Search across PubMed, OpenAlex, and ClinicalTrials.gov to get
          structured, evidence-based insights — ranked by relevance and recency.
        </p>
      </div>

      {/* Form card */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block section-label mb-2">Disease / Condition</label>
            <input
              type="text"
              value={disease}
              onChange={e => setDisease(e.target.value)}
              placeholder="e.g. Parkinson's disease"
              className="input-field"
              autoFocus
            />
          </div>
          <div>
            <label className="block section-label mb-2">Your Query</label>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. Deep Brain Stimulation"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="block section-label mb-2">Location <span className="text-faint normal-case font-body text-xs">(optional — for nearby trials)</span></label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Toronto, Canada"
            className="input-field"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (!disease.trim() && !query.trim())}
          className="btn-primary w-full py-3.5 text-base"
        >
          {loading ? (
            <>
              <Spinner />
              Searching research databases...
            </>
          ) : (
            <>
              <SearchIcon />
              Search Research
            </>
          )}
        </button>
      </form>

      {/* Example queries */}
      <div className="mt-6">
        <p className="text-center section-label mb-3">Try an example</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLE_QUERIES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => fillExample(ex)}
              className="text-xs font-body text-muted border border-border bg-white
                         rounded-full px-3.5 py-1.5 hover:border-primary/40
                         hover:text-primary hover:bg-primary-soft transition-all duration-150"
            >
              {ex.query}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  return (
    <svg className={`${s} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}