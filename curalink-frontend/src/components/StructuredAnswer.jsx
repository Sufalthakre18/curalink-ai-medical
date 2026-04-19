/**
 * Build a direct answer from raw data when LLM didn't generate one.
 * This ensures the user ALWAYS gets a readable answer.
 */
import RelevanceBadge from './RelevanceBadge'

function buildDirectAnswer(structured, rawData, followUpQuery, disease) {
  // If LLM gave us a good personalizedInsight, use it
  const insight = structured?.personalizedInsight
  if (insight && insight.length > 40 && !insight.toLowerCase().includes('consult doctor')) {
    return insight
  }

  const pubs = rawData?.publications || []
  const query = followUpQuery || ''
  const queryLower = query.toLowerCase()

  // Vitamin D specific
  if (queryLower.includes('vitamin d')) {
    const vitDPapers = pubs.filter(p =>
      (p.title + ' ' + p.abstract).toLowerCase().includes('vitamin d') ||
      (p.title + ' ' + p.abstract).toLowerCase().includes('vitamin')
    )
    if (vitDPapers.length > 0) {
      const p = vitDPapers[0]
      return `Research on Vitamin D and ${disease || 'this condition'} is mixed. ` +
        `Based on ${pubs.length} retrieved publications, Vitamin D supplementation has been studied in neurological conditions including ${disease || 'this condition'}. ` +
        `One relevant study (${p.authors?.[0] || 'researchers'}, ${p.year}) — "${p.title}" — suggests: "${p.abstract?.substring(0, 180)}..." ` +
        `Before taking any supplement, discuss with your neurologist or specialist, who can assess your current Vitamin D levels and determine the right dosage for your condition.`
    }
    return `Vitamin D supplementation for ${disease || 'this condition'} has been studied in the literature. From ${pubs.length} retrieved papers, there is emerging evidence that Vitamin D may play a role in neurological health, but research is still ongoing. Your doctor can check your Vitamin D levels with a simple blood test and advise on whether supplementation is appropriate for you.`
  }

  // General follow-up
  if (pubs.length > 0) {
    const topPub = pubs[0]
    return `Based on ${pubs.length} research publications retrieved for "${query}" in the context of ${disease || 'your condition'}: ` +
      `The most relevant study found is "${topPub.title}" (${topPub.authors?.[0] || 'researchers'}, ${topPub.year}), which states: "${topPub.abstract?.substring(0, 200)}..." ` +
      `Review the publications below for detailed evidence. Always discuss these findings with your healthcare provider before making any changes to your treatment.`
  }

  return `We retrieved ${pubs.length} research papers related to "${query}" for ${disease || 'your condition'}. Review the publications below for evidence-based information. Consult your healthcare provider for personalized medical guidance.`
}

function KeyFact({ text }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
      <span className="text-sm text-muted leading-relaxed">{text}</span>
    </div>
  )
}

function Finding({ finding, supportedBy, significance }) {
  return (
    <div className="border border-border rounded-xl p-4 space-y-1.5 hover:border-primary/30 transition-colors">
      <p className="text-sm font-medium text-ink leading-snug">{finding}</p>
      {supportedBy && <p className="text-xs text-teal font-mono">{String(supportedBy)}</p>}
      {significance && <p className="text-xs text-muted leading-relaxed line-clamp-3">{significance}</p>}
    </div>
  )
}

export default function StructuredAnswer({ structured, rawData, meta, queryInfo, isFollowUp, followUpQuery, relevance, onSuggestionClick }) {
  if (!structured && !rawData) return null

  const cond     = structured?.conditionOverview
  const research = structured?.researchInsights
  const disclaimer = structured?.disclaimer

  // ALWAYS generate a direct answer — never leave it empty
  const directAnswer = buildDirectAnswer(structured, rawData, followUpQuery, cond?.condition || queryInfo?.disease)

  const conditionName = cond?.condition || queryInfo?.disease || 'Research Results'

  return (
    <div className="card">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
        <div>
          {isFollowUp && followUpQuery && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-muted">↳ Follow-up:</span>
              <span className="text-xs font-medium text-primary bg-primary-soft px-2.5 py-0.5 rounded-full">
                {followUpQuery}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-2xs uppercase tracking-widest text-faint">
              {isFollowUp ? 'Answer' : 'Condition Overview'}
            </span>
          </div>
          <h2 className="font-display text-xl font-medium text-ink">{conditionName}</h2>
          {queryInfo?.expanded && (
            <p className="text-xs text-faint font-mono mt-0.5 truncate max-w-md">
              Search: {queryInfo.expanded}
            </p>
          )}
        </div>
        {meta && (
          <div className="text-right flex-shrink-0 hidden sm:block">
            <div className="text-2xs text-faint font-mono space-y-0.5">
              <div>{meta.publicationsRetrieved} papers searched</div>
              {meta.trialsRetrieved > 0 && <div>{meta.trialsRetrieved} trials found</div>}
              <div>{(meta.processingTimeMs / 1000).toFixed(1)}s</div>
            </div>
          </div>
        )}
      </div>

      {/* ─── BODY ─── */}
      <div className="p-6 space-y-6">

        {/* Relevance badge — shown when evidence is weak/absent */}
      <RelevanceBadge relevance={relevance} onSuggestionClick={onSuggestionClick} />

      {/* 1. DIRECT ANSWER — always first, always visible */}
        <div className="bg-primary-soft border border-primary/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💡</span>
            <span className="font-mono text-2xs uppercase tracking-widest text-primary font-medium">
              {isFollowUp ? 'Direct Answer' : 'Key Insight'}
            </span>
          </div>
          <p className="text-sm text-primary/90 leading-relaxed">{directAnswer}</p>
        </div>

        {/* 2. CONDITION SUMMARY */}
        {cond?.summary && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🩺</span>
              <span className="font-mono text-2xs uppercase tracking-widest text-faint">About This Condition</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">{cond.summary}</p>
            {cond.keyFacts?.length > 0 && (
              <div className="space-y-2 pt-1">
                {cond.keyFacts.map((f, i) => <KeyFact key={i} text={f} />)}
              </div>
            )}
          </div>
        )}

        {/* 3. RESEARCH INSIGHTS */}
        {research && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🔬</span>
              <span className="font-mono text-2xs uppercase tracking-widest text-faint">Research Summary</span>
            </div>
            {research.summary && (
              <p className="text-sm text-muted leading-relaxed">{research.summary}</p>
            )}
            {research.keyFindings?.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {research.keyFindings.map((f, i) => <Finding key={i} {...f} />)}
              </div>
            )}
            {research.consensus && (
              <div className="bg-teal-soft border border-teal/20 rounded-xl p-4">
                <p className="font-mono text-2xs uppercase tracking-widest text-teal mb-1.5">What Research Suggests</p>
                <p className="text-sm text-teal/90 leading-relaxed">{research.consensus}</p>
              </div>
            )}
            {research.gaps && (
              <div className="bg-amber-soft border border-amber/20 rounded-xl p-4">
                <p className="font-mono text-2xs uppercase tracking-widest text-amber mb-1.5">Ongoing Questions</p>
                <p className="text-sm text-amber/80 leading-relaxed">{research.gaps}</p>
              </div>
            )}
          </div>
        )}

        {/* 4. DISCLAIMER */}
        {disclaimer && (
          <div className="flex gap-3 bg-canvas rounded-xl p-4 border border-border">
         
            <p className="text-xs text-muted leading-relaxed">{disclaimer}</p>
          </div>
        )}

        {/* Fallback disclaimer if no structured disclaimer */}
        {!disclaimer && (
          <div className="flex gap-3 bg-canvas rounded-xl p-4 border border-border">
            <span className="text-sm flex-shrink-0">⚠️</span>
            <p className="text-xs text-muted leading-relaxed">
              This information is for educational purposes only and does not constitute medical advice.
              Always consult a qualified healthcare professional before making any medical decisions.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}