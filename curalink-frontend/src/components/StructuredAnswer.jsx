function Section({ icon, label, children }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="section-label">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

function KeyFact({ text }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
      <span className="prose-medical">{text}</span>
    </div>
  )
}

function Finding({ finding, supportedBy, significance }) {
  return (
    <div className="border border-border rounded-xl p-4 space-y-1.5 hover:border-primary/30 transition-colors">
      <p className="text-sm font-medium text-ink leading-snug">{finding}</p>
      {supportedBy && (
        <p className="text-xs text-teal font-mono">{supportedBy}</p>
      )}
      {significance && (
        <p className="prose-medical text-xs">{significance}</p>
      )}
    </div>
  )
}

export default function StructuredAnswer({ structured, meta, queryInfo }) {
  if (!structured) return null

  const {
    conditionOverview,
    researchInsights,
    personalizedInsight,
    disclaimer,
  } = structured

  const isAIGenerated = meta?.llmUsed && meta.llmUsed !== 'fallback'

  return (
    <div className="card animate-section">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="section-label">Condition</span>
            {isAIGenerated && (
              <span className="text-2xs bg-teal-soft text-teal border border-teal/20 rounded-full px-2 py-0.5 font-mono">
                AI Analysis
              </span>
            )}
          </div>
          <h2 className="font-display text-xl font-medium text-ink">
            {conditionOverview?.condition || queryInfo?.disease || 'Research Results'}
          </h2>
          {queryInfo?.expanded && (
            <p className="text-xs text-muted font-mono mt-0.5">
              Query: {queryInfo.expanded}
            </p>
          )}
        </div>
        {meta && (
          <div className="text-right flex-shrink-0">
            <div className="text-2xs text-faint font-mono space-y-0.5">
              <div>{meta.publicationsRetrieved} papers retrieved</div>
              <div>{meta.trialsRetrieved} trials found</div>
              <div>{(meta.processingTimeMs / 1000).toFixed(1)}s</div>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-6 space-y-7">

        {/* Overview */}
        {conditionOverview?.summary && (
          <Section icon="🩺" label="Condition Overview">
            <p className="prose-medical">{conditionOverview.summary}</p>
            {conditionOverview.keyFacts?.length > 0 && (
              <div className="mt-3 space-y-2">
                {conditionOverview.keyFacts.map((f, i) => (
                  <KeyFact key={i} text={f} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Research Insights */}
        {researchInsights && (
          <Section icon="🔬" label="Research Insights">
            {researchInsights.summary && (
              <p className="prose-medical mb-3">{researchInsights.summary}</p>
            )}
            {researchInsights.keyFindings?.length > 0 && (
              <div className="space-y-2.5">
                {researchInsights.keyFindings.map((f, i) => (
                  <Finding key={i} {...f} />
                ))}
              </div>
            )}
            {researchInsights.consensus && (
              <div className="mt-4 bg-primary-soft border border-primary/15 rounded-xl p-4">
                <p className="section-label text-primary mb-1.5">Research Consensus</p>
                <p className="prose-medical text-primary/80">{researchInsights.consensus}</p>
              </div>
            )}
            {researchInsights.gaps && (
              <div className="mt-3 bg-amber-soft border border-amber/20 rounded-xl p-4">
                <p className="section-label text-amber mb-1.5">Knowledge Gaps</p>
                <p className="prose-medical text-amber/80">{researchInsights.gaps}</p>
              </div>
            )}
          </Section>
        )}

        {/* Personalized Insight */}
        {personalizedInsight && (
          <Section icon="💡" label="Personalized Insight">
            <div className="bg-teal-soft border border-teal/20 rounded-xl p-4">
              <p className="prose-medical text-teal/90">{personalizedInsight}</p>
            </div>
          </Section>
        )}

        {/* Disclaimer */}
        {disclaimer && (
          <div className="flex gap-3 bg-canvas rounded-xl p-4 border border-border">
            <span className="text-sm flex-shrink-0">⚠️</span>
            <p className="text-xs text-muted leading-relaxed">{disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  )
}