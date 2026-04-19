import { useState, useEffect } from 'react'

const STEPS = [
  { id: 1, icon: '🧠', label: 'Understanding your query',       detail: 'Expanding search terms + medical synonyms',                    duration: 800  },
  { id: 2, icon: '📚', label: 'Searching PubMed',               detail: 'Fetching up to 60 peer-reviewed articles from NCBI',           duration: 3000 },
  { id: 3, icon: '🌐', label: 'Searching OpenAlex',             detail: 'Fetching up to 80 open-access publications',                   duration: 3000 },
  { id: 4, icon: '🧪', label: 'Fetching Clinical Trials',       detail: 'Querying ClinicalTrials.gov — recruiting + completed trials',  duration: 2500 },
  { id: 5, icon: '⚖️', label: 'Ranking Results',                detail: 'Scoring by relevance, recency + source credibility',          duration: 1500 },
  { id: 6, icon: '✨', label: 'Generating Answer',              detail: 'Synthesising top 8 papers into structured insights',           duration: 2000 },
]

export default function PipelineStatus() {
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])

  useEffect(() => {
    let stepIndex = 0
    let elapsed = 0

    const timers = STEPS.map((step, i) => {
      const timer = setTimeout(() => {
        setActiveStep(i)
        setCompletedSteps(prev => i > 0 ? [...prev, i - 1] : prev)
      }, elapsed)
      elapsed += step.duration
      return timer
    })

    // Mark last step complete after its duration
    const finalTimer = setTimeout(() => {
      setCompletedSteps(STEPS.map((_, i) => i))
    }, elapsed)

    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(finalTimer)
    }
  }, [])

  return (
    <div className="card p-6 mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: 'var(--primary)', animationDelay: `${i*120}ms` }} />
          ))}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Research Pipeline Running</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Live transparency — see exactly how your answer is being built
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isDone    = completedSteps.includes(i)
          const isActive  = activeStep === i && !isDone
          const isPending = i > activeStep

          return (
            <div key={step.id}
              className="flex items-start gap-3 transition-all duration-500"
              style={{ opacity: isPending ? 0.35 : 1 }}
            >
              {/* Icon / Check */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-300"
                style={{
                  background: isDone ? 'var(--teal-soft)' : isActive ? 'var(--primary-soft)' : 'var(--canvas)',
                  border: `1px solid ${isDone ? 'var(--teal)' : isActive ? 'var(--primary)' : 'var(--border)'}`,
                }}>
                {isDone ? (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2.5 6.5L5.5 9.5L10.5 4" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span style={{ filter: isPending ? 'grayscale(1)' : 'none' }}>{step.icon}</span>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium" style={{ color: isDone ? 'var(--teal)' : isActive ? 'var(--ink)' : 'var(--muted)' }}>
                    {step.label}
                  </p>
                  {isActive && (
                    <span className="text-2xs font-mono px-1.5 py-0.5 rounded-full animate-pulse"
                      style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                      running
                    </span>
                  )}
                  {isDone && (
                    <span className="text-2xs font-mono" style={{ color: 'var(--teal)' }}>done</span>
                  )}
                </div>
                {(isActive || isDone) && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{step.detail}</p>
                )}
                {/* Progress bar for active step */}
                {isActive && (
                  <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full animate-pulse" style={{ background: 'var(--primary)', width: '60%' }} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom note */}
      <div className="mt-4 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--faint)' }}>
          Retrieving from PubMed (XML) · OpenAlex (JSON) · ClinicalTrials.gov — normalised into one unified format
        </span>
      </div>
    </div>
  )
}