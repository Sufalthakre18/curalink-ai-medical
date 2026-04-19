/**
 * RelevanceBadge v2
 * - Shown when evidence is PARTIAL, LOW, or NONE
 * - Clickable suggestion chips
 * - Tooltip on PARTIAL
 */
export default function RelevanceBadge({ relevance, onSuggestionClick }) {
  if (!relevance || relevance.level === 'HIGH') return null

  const config = {
    PARTIAL: {
      icon: '⚠️',
      label: 'Limited Evidence',
      tooltip: 'Results are related but may not directly answer your question.',
      style: { background: 'rgba(196,122,58,0.07)', border: '1px solid rgba(196,122,58,0.25)', color: '#92560A' },
      badgeBg: 'rgba(196,122,58,0.12)',
    },
    LOW: {
      icon: '⚠️',
      label: 'Indirect Evidence Only',
      tooltip: 'Very few papers directly address this question.',
      style: { background: 'rgba(196,122,58,0.08)', border: '1px solid rgba(196,122,58,0.3)', color: '#92560A' },
      badgeBg: 'rgba(196,122,58,0.15)',
    },
    NONE: {
      icon: '🚫',
      label: 'No Direct Research Found',
      tooltip: null,
      style: { background: 'rgba(153,27,27,0.06)', border: '1px solid rgba(153,27,27,0.2)', color: '#991B1B' },
      badgeBg: 'rgba(153,27,27,0.1)',
    },
  }

  const c = config[relevance.level]
  if (!c) return null

  return (
    <div className="rounded-xl p-4 space-y-3" style={c.style}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{c.icon}</span>
          <span className="text-sm font-medium" style={{ color: c.style.color }}>{c.label}</span>
          <span className="text-2xs font-mono px-2 py-0.5 rounded-full"
            style={{ background: c.badgeBg, color: c.style.color }}>
            {relevance.passingCount ?? 0} directly relevant papers
          </span>
        </div>
        {/* Tooltip trigger for PARTIAL/LOW */}
        {c.tooltip && (
          <span title={c.tooltip}
            className="text-xs cursor-help px-2 py-0.5 rounded-full border flex-shrink-0"
            style={{ borderColor: c.style.color + '40', color: c.style.color, opacity: 0.7 }}>
            ?
          </span>
        )}
      </div>

      {/* Evidence summary */}
      <p className="text-xs leading-relaxed" style={{ color: c.style.color, opacity: 0.85 }}>
        {relevance.evidenceSummary}
      </p>

      {/* Clickable suggestion chips */}
      {relevance.suggestions?.length > 0 && (
        <div>
          <p className="text-2xs font-mono uppercase tracking-widest mb-2"
            style={{ color: c.style.color, opacity: 0.55 }}>
            {relevance.level === 'NONE' ? 'Try a more specific search' : 'Related searches'}
          </p>
          <div className="flex flex-wrap gap-2">
            {relevance.suggestions.map((s, i) => (
              <button key={i}
                onClick={() => onSuggestionClick && onSuggestionClick(s)}
                className="text-xs rounded-full px-3 py-1.5 border transition-all duration-150"
                style={{ background: 'var(--surface)', borderColor: c.style.color + '40', color: c.style.color }}
                onMouseEnter={e => { e.currentTarget.style.background = c.badgeBg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}