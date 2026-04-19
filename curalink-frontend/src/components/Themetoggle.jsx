export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Switch to Clinical Mode' : 'Switch to Focus Mode'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 text-xs font-medium"
      style={{
        background: isDark ? 'rgba(74,144,217,0.1)' : 'transparent',
        borderColor: 'var(--border)',
        color: 'var(--muted)',
      }}
    >
      {isDark ? (
        <>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M6.5 1v1M6.5 11v1M1 6.5h1M11 6.5h1M2.6 2.6l.7.7M9.7 9.7l.7.7M9.7 2.6l-.7.7M2.6 9.7l.7-.7"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Clinical Mode
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M11 7.5A5 5 0 1 1 5.5 2a3.5 3.5 0 0 0 5.5 5.5z"
              stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
          Focus Mode
        </>
      )}
    </button>
  )
}