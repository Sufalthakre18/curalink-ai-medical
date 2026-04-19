function SourceBadge({ source }) {
  const styles = {
    PubMed:   { bg: '#EFF6FF', color: '#1E40AF', border: 'rgba(30,64,175,0.2)' },
    OpenAlex: { bg: '#ECFDF5', color: '#065F46', border: 'rgba(6,95,70,0.2)' },
  }
  const s = styles[source] || { bg: 'var(--canvas)', color: 'var(--muted)', border: 'var(--border)' }
  return (
    <span className="text-2xs font-mono rounded-full px-2 py-0.5 border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {source}
    </span>
  )
}

export default function PublicationCard({ pub, index }) {
  const { title, abstract, authors, year, journal, source, url, relevanceScore, openAccess, citedByCount } = pub

  // Score is 0-100 integer from backend rawData
  const pct = Math.min(100, Math.max(0, Math.round(Number(relevanceScore) || 0)))

  const abstract_short = abstract?.length > 240 ? abstract.substring(0, 240) + '...' : abstract

  return (
    <div className="card p-5 flex flex-col gap-3 hover:shadow-lift transition-all duration-200 group">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={source} />
          {openAccess && (
            <span className="text-2xs font-mono rounded-full px-2 py-0.5 border"
              style={{ background: '#ECFDF5', color: '#065F46', borderColor: 'rgba(6,95,70,0.2)' }}>
              Open Access
            </span>
          )}
        </div>
        <span className="text-2xs font-mono flex-shrink-0" style={{ color: 'var(--faint)' }}>{year}</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium leading-snug line-clamp-3 transition-colors"
        style={{ color: 'var(--ink)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--ink)'}>
        {title}
      </h3>

      {/* Abstract */}
      {abstract_short && (
        <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--muted)' }}>
          {abstract_short}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-2 space-y-2.5" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {authors?.length > 0 && (
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                {authors.slice(0,3).join(', ')}{authors.length > 3 && ` +${authors.length - 3}`}
              </p>
            )}
            {journal && (
              <p className="text-2xs font-mono truncate" style={{ color: 'var(--faint)' }}>{journal}</p>
            )}
          </div>
          {citedByCount > 0 && (
            <span className="text-2xs font-mono flex-shrink-0" style={{ color: 'var(--faint)' }}>
              {citedByCount} cited
            </span>
          )}
        </div>

        {/* ── Relevance bar — fixed ── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="section-label">Relevance</span>
            <span className="text-2xs font-mono" style={{ color: 'var(--faint)' }}>{pct}%</span>
          </div>
          {/* Outer track */}
          <div style={{
            width: '100%',
            height: '4px',
            borderRadius: '999px',
            background: 'var(--border)',
            overflow: 'hidden',
          }}>
            {/* Inner fill */}
            <div style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: '999px',
              background: 'var(--primary)',
              opacity: 0.5,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: 'var(--primary)' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
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