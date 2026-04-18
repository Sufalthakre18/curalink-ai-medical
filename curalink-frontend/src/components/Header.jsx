export default function Header({ onReset, hasResults }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-canvas/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5C7 1.5 3 4 3 7.5C3 9.985 4.79 12 7 12C9.21 12 11 9.985 11 7.5C11 4 7 1.5 7 1.5Z" fill="white" fillOpacity="0.9" />
              <path d="M5.5 7H8.5M7 5.5V8.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-display text-base font-medium text-ink tracking-tight">
            CuraLink
          </span>
        </button>

        {/* Center tag */}
        <span className=" text-primary hidden sm:block section-label">
          AI Medical Research Assistant
        </span>
        {/* Right actions */}
        <div className="flex items-center gap-3">
          {hasResults && (
            <button
              onClick={onReset}
              className="btn-secondary text-xs px-4 py-2"
            >
              New Search
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            <span className="text-2xs text-muted font-body">Live</span>
          </div>
        </div>
      </div>
    </header>
  )
}