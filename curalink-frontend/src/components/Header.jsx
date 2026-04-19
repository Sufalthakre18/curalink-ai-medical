import ThemeToggle from './Themetoggle'

export default function Header({ onReset, hasResults, isDark, onToggleTheme }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
      style={{ background: 'color-mix(in srgb, var(--canvas) 85%, transparent)', borderBottom: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        {/* Logo */}
        <button onClick={onReset} className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--primary)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5C7 1.5 3 4 3 7.5C3 9.985 4.79 12 7 12C9.21 12 11 9.985 11 7.5C11 4 7 1.5 7 1.5Z"
                fill="white" fillOpacity="0.9"/>
              <path d="M5.5 7H8.5M7 5.5V8.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-display text-base font-medium" style={{ color: 'var(--ink)' }}>
            CuraLink
          </span>
        </button>

        {/* Center */}
        <span className="hidden sm:block font-mono text-2xs uppercase tracking-widest" style={{ color: 'var(--faint)' }}>
          AI Medical Research Assistant
        </span>

        {/* Right */}
        <div className="flex items-center gap-2">
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />

          {hasResults && (
            <button onClick={onReset}
              className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-all duration-150"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.color='var(--primary)'; e.currentTarget.style.borderColor='var(--primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.borderColor='var(--border)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L1 6L6 11M1 6H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              New Search
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--teal)' }} />
            <span className="text-2xs hidden sm:block" style={{ color: 'var(--muted)' }}>Live</span>
          </div>
        </div>
      </div>
    </header>
  )
}