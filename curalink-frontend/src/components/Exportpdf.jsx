import { useState } from 'react'

export default function ExportPDF({ result, queryInfo }) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      // Dynamically load html2pdf
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      document.head.appendChild(script)
      await new Promise(res => { script.onload = res })

      const { structured, rawData, meta } = result
      const pubs   = rawData?.publications  || []
      const trials = rawData?.clinicalTrials || []
      const date   = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })

      // Build HTML content for PDF
      const content = `
        <div style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1C1C1E;">
          <!-- Header -->
          <div style="border-bottom: 2px solid #1A3A5C; padding-bottom: 20px; margin-bottom: 30px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
              <div style="width:32px;height:32px;background:#1A3A5C;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-size:16px;">⚕</span>
              </div>
              <span style="font-family: sans-serif; font-size:20px; font-weight:600; color:#1A3A5C;">CuraLink Research Brief</span>
            </div>
            <table style="width:100%;font-family:sans-serif;font-size:12px;color:#6B6B6B;">
              <tr>
                <td><strong>Condition:</strong> ${structured?.conditionOverview?.condition || queryInfo?.disease || '—'}</td>
                <td><strong>Date:</strong> ${date}</td>
              </tr>
              <tr>
                <td><strong>Query:</strong> ${queryInfo?.original?.query || '—'}</td>
                <td><strong>Sources:</strong> PubMed · OpenAlex · ClinicalTrials.gov</td>
              </tr>
            </table>
          </div>

          <!-- Key Insight -->
          ${structured?.personalizedInsight ? `
          <div style="background:#EAF0F7;border-left:4px solid #1A3A5C;padding:16px;border-radius:8px;margin-bottom:24px;">
            <p style="font-family:sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#1A3A5C;margin:0 0 8px;">Key Insight</p>
            <p style="font-size:13px;line-height:1.7;margin:0;color:#1C1C1E;">${structured.personalizedInsight}</p>
          </div>` : ''}

          <!-- Condition Overview -->
          ${structured?.conditionOverview?.summary ? `
          <div style="margin-bottom:24px;">
            <h2 style="font-size:16px;color:#1A3A5C;border-bottom:1px solid #E2E0DA;padding-bottom:8px;margin-bottom:12px;">🩺 Condition Overview</h2>
            <p style="font-size:13px;line-height:1.7;color:#4A5568;">${structured.conditionOverview.summary}</p>
          </div>` : ''}

          <!-- Research Insights -->
          ${structured?.researchInsights?.summary ? `
          <div style="margin-bottom:24px;">
            <h2 style="font-size:16px;color:#1A3A5C;border-bottom:1px solid #E2E0DA;padding-bottom:8px;margin-bottom:12px;">🔬 Research Summary</h2>
            <p style="font-size:13px;line-height:1.7;color:#4A5568;">${structured.researchInsights.summary}</p>
            ${structured.researchInsights.consensus ? `
            <div style="background:#E6F4F4;border-radius:8px;padding:12px;margin-top:12px;">
              <p style="font-family:sans-serif;font-size:11px;font-weight:600;color:#2A7F7F;margin:0 0 6px;">CONSENSUS</p>
              <p style="font-size:12px;line-height:1.6;color:#2A7F7F;margin:0;">${structured.researchInsights.consensus}</p>
            </div>` : ''}
          </div>` : ''}

          <!-- Publications -->
          ${pubs.length > 0 ? `
          <div style="margin-bottom:24px;">
            <h2 style="font-size:16px;color:#1A3A5C;border-bottom:1px solid #E2E0DA;padding-bottom:8px;margin-bottom:16px;">📄 Supporting Literature (${pubs.length} papers)</h2>
            ${pubs.map((pub, i) => `
            <div style="border:1px solid #E2E0DA;border-radius:8px;padding:14px;margin-bottom:10px;page-break-inside:avoid;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                <span style="font-family:monospace;font-size:10px;background:#EFF6FF;color:#1E40AF;padding:2px 8px;border-radius:99px;">${pub.source}</span>
                <span style="font-family:monospace;font-size:10px;color:#AEAEAD;">${pub.year}</span>
              </div>
              <p style="font-size:13px;font-weight:600;color:#1C1C1E;margin:0 0 6px;line-height:1.4;">${pub.title}</p>
              <p style="font-size:11px;color:#6B6B6B;margin:0 0 6px;">${pub.authors?.slice(0,3).join(', ')}${pub.authors?.length > 3 ? ' et al.' : ''}</p>
              ${pub.abstract ? `<p style="font-size:11px;color:#6B6B6B;line-height:1.6;margin:0 0 6px;">${pub.abstract.substring(0,200)}...</p>` : ''}
              ${pub.url ? `<p style="font-size:10px;color:#1A3A5C;margin:0;">🔗 ${pub.url}</p>` : ''}
            </div>`).join('')}
          </div>` : ''}

          <!-- Clinical Trials -->
          ${trials.length > 0 ? `
          <div style="margin-bottom:24px;">
            <h2 style="font-size:16px;color:#1A3A5C;border-bottom:1px solid #E2E0DA;padding-bottom:8px;margin-bottom:16px;">🧪 Clinical Trials (${trials.length} found)</h2>
            ${trials.map(trial => `
            <div style="border:1px solid #E2E0DA;border-radius:8px;padding:14px;margin-bottom:10px;page-break-inside:avoid;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span style="font-family:monospace;font-size:10px;padding:2px 8px;border-radius:99px;
                  background:${trial.status==='RECRUITING'?'#ECFDF5':'#EFF6FF'};
                  color:${trial.status==='RECRUITING'?'#065F46':'#1E40AF'};">${trial.status}</span>
                <span style="font-family:monospace;font-size:10px;color:#AEAEAD;">${trial.nctId || ''}</span>
              </div>
              <p style="font-size:13px;font-weight:600;color:#1C1C1E;margin:0 0 6px;">${trial.title}</p>
              ${trial.summary ? `<p style="font-size:11px;color:#6B6B6B;line-height:1.5;margin:0 0 6px;">${trial.summary.substring(0,200)}...</p>` : ''}
              ${trial.url ? `<p style="font-size:10px;color:#1A3A5C;margin:0;">🔗 ${trial.url}</p>` : ''}
            </div>`).join('')}
          </div>` : ''}

          <!-- Disclaimer -->
          <div style="background:#FEF6EC;border:1px solid rgba(196,122,58,0.3);border-radius:8px;padding:14px;margin-top:20px;">
            <p style="font-size:11px;color:#C47A3A;margin:0;line-height:1.6;">
              ⚠️ This Research Brief is generated for educational purposes only and does not constitute medical advice.
              Always consult a qualified healthcare professional before making any medical decisions.
              Generated by CuraLink — AI Medical Research Assistant
            </p>
          </div>
        </div>
      `

      const container = document.createElement('div')
      container.innerHTML = content
      document.body.appendChild(container)

      const disease = structured?.conditionOverview?.condition || queryInfo?.disease || 'research'
      const filename = `CuraLink-${disease.replace(/\s+/g,'-')}-${new Date().toISOString().split('T')[0]}.pdf`

      await window.html2pdf().set({
        margin:      [8, 8, 8, 8],
        filename,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(container).save()

      document.body.removeChild(container)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
      style={{
        border: '1px solid var(--border)',
        color: 'var(--muted)',
        background: 'transparent',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-soft)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
    >
      {exporting ? (
        <>
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
            <path d="M7 2a5 5 0 0 1 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Exporting...
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3M2 10v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Export Research Brief
        </>
      )}
    </button>
  )
}