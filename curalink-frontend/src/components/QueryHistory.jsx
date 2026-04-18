export default function QueryHistory({ history }) {
  if (!history || history.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="section-label px-1 mb-2">Session History</p>
      {history.map((h, i) => (
        <div
          key={i}
          className={`rounded-lg px-3 py-2.5 border text-xs font-body transition-colors
            ${i === history.length - 1
              ? 'bg-primary-soft border-primary/20 text-primary'
              : 'bg-white border-border text-muted'
            }`}
        >
          <div className="flex items-start gap-2">
            {h.isFollowUp ? (
              <span className="mt-0.5 flex-shrink-0">↳</span>
            ) : (
              <span className="mt-0.5 flex-shrink-0">●</span>
            )}
            <div className="min-w-0">
              <p className="font-medium truncate">
                {h.query || h.disease}
              </p>
              {h.disease && h.query && !h.isFollowUp && (
                <p className="text-2xs mt-0.5 opacity-70 truncate">{h.disease}</p>
              )}
              <p className="text-2xs opacity-50 mt-0.5">
                {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}