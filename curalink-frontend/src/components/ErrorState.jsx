export function ErrorState({ message, onRetry }) {
  return (
    <div className="card p-10 text-center max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-red-badge border border-red-text/20 flex items-center justify-center mx-auto mb-4">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 6v5M10 13.5v.5" stroke="#991B1B" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="10" cy="10" r="8.5" stroke="#991B1B" strokeWidth="1.5"/>
        </svg>
      </div>
      <h3 className="font-display text-lg text-ink mb-2">Something went wrong</h3>
      <p className="prose-medical text-sm mb-6 max-w-sm mx-auto">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary px-6 py-2.5">
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, description, icon = '🔍' }) {
  return (
    <div className="text-center py-12">
      <span className="text-4xl block mb-4">{icon}</span>
      <h3 className="font-display text-lg text-ink mb-2">{title}</h3>
      <p className="prose-medical text-sm max-w-sm mx-auto">{description}</p>
    </div>
  )
}