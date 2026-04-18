const STATUS_STYLES = {
  RECRUITING:           { bg: 'bg-green-badge', text: 'text-green-text', border: 'border-green-text/20', dot: 'bg-green-text', label: 'Recruiting' },
  ACTIVE_NOT_RECRUITING:{ bg: 'bg-blue-badge',  text: 'text-blue-text',  border: 'border-blue-text/20',  dot: 'bg-blue-text',  label: 'Active' },
  COMPLETED:            { bg: 'bg-canvas',       text: 'text-muted',      border: 'border-border',         dot: 'bg-faint',      label: 'Completed' },
  NOT_YET_RECRUITING:  { bg: 'bg-amber-soft',   text: 'text-amber',      border: 'border-amber/20',       dot: 'bg-amber',      label: 'Upcoming' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.COMPLETED
  return (
    <span className={`inline-flex items-center gap-1.5 text-2xs font-mono border rounded-full px-2.5 py-1 ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === 'RECRUITING' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  )
}

export default function TrialCard({ trial, index }) {
  const {
    title, status, phase, summary, eligibility,
    locations, contact, sponsor, interventions,
    nctId, url, conditions,
  } = trial

  const summary_short = summary?.length > 220
    ? summary.substring(0, 220) + '...'
    : summary

  const locationStr = locations?.slice(0, 2)
    .map(l => [l.city, l.country].filter(Boolean).join(', '))
    .filter(Boolean)
    .join(' · ') || ''

  return (
    <div
      className="card p-5 flex flex-col gap-3 hover:shadow-lift transition-all duration-200 animate-section"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={status} />
        {phase && phase !== 'NA' && phase !== 'Not Specified' && (
          <span className="text-2xs font-mono text-faint">{phase}</span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-ink leading-snug line-clamp-3">
        {title}
      </h3>

      {/* Summary */}
      {summary_short && (
        <p className="text-xs text-muted leading-relaxed line-clamp-3">
          {summary_short}
        </p>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {locationStr && (
          <div>
            <p className="section-label mb-0.5">Location</p>
            <p className="text-muted truncate">{locationStr}</p>
          </div>
        )}
        {sponsor && (
          <div>
            <p className="section-label mb-0.5">Sponsor</p>
            <p className="text-muted truncate">{sponsor}</p>
          </div>
        )}
        {nctId && (
          <div>
            <p className="section-label mb-0.5">NCT ID</p>
            <p className="font-mono text-muted">{nctId}</p>
          </div>
        )}
        {interventions?.length > 0 && (
          <div>
            <p className="section-label mb-0.5">Intervention</p>
            <p className="text-muted truncate">{interventions[0]?.replace(/^[A-Z]+:\s*/,'')}</p>
          </div>
        )}
      </div>

      {/* Eligibility snippet */}
      {status === 'RECRUITING' && eligibility && (
        <div className="bg-green-badge border border-green-text/15 rounded-lg p-3">
          <p className="section-label text-green-text mb-1">Eligibility (excerpt)</p>
          <p className="text-xs text-green-text/80 line-clamp-3 leading-relaxed">
            {eligibility.substring(0, 200)}...
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-border flex items-center justify-between">
        {contact?.email || contact?.phone ? (
          <p className="text-xs text-muted">
            {contact.email || contact.phone}
          </p>
        ) : (
          <span />
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-light font-medium transition-colors"
          >
            View trial
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}