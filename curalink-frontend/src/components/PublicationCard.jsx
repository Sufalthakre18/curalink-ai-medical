function SourceBadge({ source }) {
  const styles = {
    PubMed:   'bg-blue-badge text-blue-text border-blue-text/20',
    OpenAlex: 'bg-green-badge text-green-text border-green-text/20',
  }
  return (
    <span className={`text-2xs font-mono border rounded-full px-2 py-0.5 ${styles[source] || 'bg-canvas text-muted border-border'}`}>
      {source}
    </span>
  )
}

function ScoreBar({ score }) {
  const pct = Math.round((score || 0) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/40 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-2xs font-mono text-faint w-7 text-right">{pct}%</span>
    </div>
  )
}

export default function PublicationCard({ pub, index }) {
  const {
    title, abstract, authors, year, journal,
    source, url, relevanceScore, openAccess, citedByCount,
  } = pub

  const abstract_short = abstract?.length > 240
    ? abstract.substring(0, 240) + '...'
    : abstract

  return (
    <div
      className="card p-5 flex flex-col gap-3 hover:shadow-lift transition-all duration-200 animate-section group"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={source} />
          {openAccess && (
            <span className="text-2xs font-mono bg-green-badge text-green-text border border-green-text/20 rounded-full px-2 py-0.5">
              Open Access
            </span>
          )}
        </div>
        <span className="text-2xs font-mono text-faint flex-shrink-0">{year}</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-ink leading-snug group-hover:text-primary transition-colors line-clamp-3">
        {title}
      </h3>

      {/* Abstract */}
      {abstract_short && (
        <p className="text-xs text-muted leading-relaxed line-clamp-3">
          {abstract_short}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-border space-y-2.5">
        {/* Authors + journal */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {authors?.length > 0 && (
              <p className="text-xs text-muted truncate">
                {authors.slice(0, 3).join(', ')}
                {authors.length > 3 && ` +${authors.length - 3}`}
              </p>
            )}
            {journal && (
              <p className="text-2xs text-faint font-mono truncate">{journal}</p>
            )}
          </div>
          {citedByCount > 0 && (
            <span className="text-2xs font-mono text-faint flex-shrink-0">
              {citedByCount} citations
            </span>
          )}
        </div>

        {/* Relevance */}
        <div>
          <p className="section-label mb-1">Relevance</p>
          <ScoreBar score={relevanceScore} />
        </div>

        {/* Link */}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-light font-medium transition-colors"
          >
            View paper
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}