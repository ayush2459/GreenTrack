import { useCallback, useEffect, useMemo, useState } from 'react'
import { records, ai } from '../utils/api'
import { AlertTriangle, CalendarDays, CheckCircle2, Download, FileText, RefreshCw, ShieldCheck } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = value => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
const dateLabel = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString() : 'Not specified'

function downloadProfessionalPdf({ rows, counts, periodStart, periodEnd, scope, status, generatedAt, aiResult }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const green = [27, 74, 51]
  const lime = [183, 224, 143]
  const muted = [105, 122, 109]
  const period = `${periodStart || 'Any start date'} — ${periodEnd || 'Any end date'}`
  const scopeLabel = scope ? `Scope ${scope}` : 'All scopes'
  const statusLabel = status ? status.replaceAll('_', ' ') : 'All statuses'
  const generatedLabel = generatedAt ? generatedAt.toLocaleString() : new Date().toLocaleString()

  const drawHeader = () => {
    doc.setFillColor(...green); doc.rect(0, 0, pageWidth, 31, 'F')
    doc.setFillColor(...lime); doc.roundedRect(margin, 7, 13, 13, 2, 2, 'F')
    doc.setTextColor(...green); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('G', margin + 6.5, 16, { align: 'center' })
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('GreenTrack', margin + 19, 13)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(220, 235, 223); doc.text('ESG INTELLIGENCE  /  ACTIVITY REPORT', margin + 19, 19)
    doc.setFontSize(8); doc.text('CONFIDENTIAL · REVIEW COPY', pageWidth - margin, 14, { align: 'right' })
  }
  const drawFooter = page => {
    doc.setDrawColor(224, 231, 224); doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...muted)
    doc.text('Generated from records currently available in GreenTrack. Validate source completeness and methodology before external disclosure.', margin, pageHeight - 5.5)
    doc.text(`Page ${page}`, pageWidth - margin, pageHeight - 5.5, { align: 'right' })
  }

  drawHeader()
  let y = 40
  doc.setTextColor(34, 57, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('Activity & Review Summary', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...muted); doc.text(`Reporting period: ${period}`, margin, y)
  doc.text(`Generated: ${generatedLabel}`, pageWidth - margin, y, { align: 'right' })
  y += 5
  doc.setFontSize(8); doc.text(`Scope filter: ${scopeLabel}     |     Review status: ${statusLabel}     |     Records in report: ${rows.length}`, margin, y)
  y += 7

  const cardGap = 4
  const cardW = (pageWidth - margin * 2 - cardGap * 3) / 4
  const kpis = [
    ['RECORDS INCLUDED', counts.total, 'Filtered activity records'],
    ['APPROVED / LOCKED', counts.approved, 'Review-ready records'],
    ['PENDING REVIEW', counts.pending, 'Awaiting a decision'],
    ['FLAGGED RECORDS', counts.flagged, 'Require follow-up'],
  ]
  kpis.forEach((k, i) => {
    const x = margin + i * (cardW + cardGap)
    doc.setFillColor(246, 249, 245); doc.setDrawColor(225, 233, 224); doc.roundedRect(x, y, cardW, 20, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...muted); doc.text(k[0], x + 4, y + 5)
    doc.setFontSize(17); doc.setTextColor(...green); doc.text(String(k[1]), x + 4, y + 12.5)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...muted); doc.text(k[2], x + 4, y + 17)
  })
  y += 27

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(34, 57, 42); doc.text('Records by emission scope', margin, y)
  y += 4
  const scopeGap = 4
  const scopeW = (pageWidth - margin * 2 - scopeGap * 2) / 3
  counts.scopes.forEach((item, i) => {
    const x = margin + i * (scopeW + scopeGap)
    doc.setFillColor(250, 252, 249); doc.setDrawColor(230, 236, 228); doc.roundedRect(x, y, scopeW, 15, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...green); doc.text(`Scope ${item.scope}`, x + 4, y + 5.5)
    doc.setFontSize(12); doc.text(String(item.count), x + scopeW - 4, y + 6.5, { align: 'right' })
    const pct = counts.total ? item.count / counts.total : 0
    doc.setFillColor(230, 237, 228); doc.roundedRect(x + 4, y + 9, scopeW - 8, 1.5, 0.7, 0.7, 'F')
    if (pct > 0) { doc.setFillColor(91, 151, 105); doc.roundedRect(x + 4, y + 9, Math.max(1, (scopeW - 8) * pct), 1.5, 0.7, 0.7, 'F') }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...muted); doc.text(`${Math.round(pct * 100)}% of included records`, x + 4, y + 13.2)
  })
  y += 22
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(34, 57, 42); doc.text('Included activity records', margin, y)
  y += 2

  const tableRows = rows.map(row => [
    String(row.id ?? '—'), `Scope ${row.scope ?? '—'}`,
    `${row.category_display || row.category || 'Activity'}${row.description ? `\n${row.description}` : ''}`,
    `${row.activity_value ?? '—'} ${row.activity_unit || ''}`.trim(),
    row.facility || '—',
    `${row.period_start || '—'}${row.period_end && row.period_end !== row.period_start ? ` to ${row.period_end}` : ''}`,
    row.status || 'UNKNOWN',
  ])
  autoTable(doc, {
    startY: y + 2, margin: { left: margin, right: margin, bottom: 15, top: 37 },
    head: [['Record ID', 'Scope', 'Category / activity', 'Activity value', 'Facility', 'Period', 'Review status']],
    body: tableRows.length ? tableRows : [['—', '—', 'No records match the selected parameters', '—', '—', '—', '—']],
    theme: 'grid', tableWidth: 'auto',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 2.2, textColor: [48, 61, 50], lineColor: [225, 232, 224], lineWidth: 0.15, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
    alternateRowStyles: { fillColor: [248, 250, 247] },
    columnStyles: { 0: { cellWidth: 17 }, 1: { cellWidth: 19 }, 2: { cellWidth: 62 }, 3: { cellWidth: 28 }, 4: { cellWidth: 38 }, 5: { cellWidth: 37 }, 6: { cellWidth: 29 } },
    didDrawPage: data => { if (data.pageNumber > 1) drawHeader(); drawFooter(data.pageNumber) },
    rowPageBreak: 'avoid', showHead: 'everyPage',
  })

  const noteY = doc.lastAutoTable.finalY + 7
  if (noteY < pageHeight - 18) {
    doc.setFillColor(250, 247, 235); doc.setDrawColor(235, 225, 192); doc.roundedRect(margin, noteY, pageWidth - margin * 2, 11, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(118, 88, 32); doc.text('Methodology note', margin + 4, noteY + 4)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text('This report summarizes recorded activity and review status only. It does not calculate or certify tCO₂e emissions.', margin + 4, noteY + 8)
  }
  // AI observations and recommendations are embedded as a dedicated report section.
  doc.addPage('a4', 'landscape')
  drawHeader()
  let insightY = 41
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...green)
  doc.text('AI Insights & Recommended Actions', margin, insightY)
  insightY += 7
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...muted)
  const providerLabel = aiResult?.provider || 'Not available'
  doc.text(`Analysis source: ${providerLabel}  |  Generated: ${aiResult?.generated_at || 'Not generated'}`, margin, insightY)
  insightY += 4
  doc.setFontSize(7.5); doc.text('Workspace-wide analysis; the activity table above follows the selected report filters.', margin, insightY)
  insightY += 7
  const writeWrapped = (text, width, fontSize = 8) => {
    doc.setFontSize(fontSize)
    const lines = doc.splitTextToSize(String(text || '—'), width)
    doc.text(lines, margin + 2, insightY)
    insightY += lines.length * (fontSize * 0.42) + 2.5
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(34, 57, 42); doc.text('Executive readout', margin, insightY)
  insightY += 5
  doc.setFont('helvetica', 'normal'); doc.setTextColor(48, 61, 50); writeWrapped(aiResult?.summary || 'AI analysis was not available when this report was generated.', pageWidth - margin * 2 - 4, 8.5)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(34, 57, 42); doc.text('Key observations', margin, insightY)
  insightY += 5
  const observations = aiResult?.insights || []
  if (!observations.length) { doc.setFont('helvetica', 'normal'); writeWrapped('No AI observations were supplied.', pageWidth - margin * 2 - 4) }
  observations.forEach((item, index) => {
    if (insightY > pageHeight - 25) { doc.addPage('a4', 'landscape'); drawHeader(); insightY = 41 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...green); doc.text(`${index + 1}. ${item.title || 'Observation'}`, margin + 1, insightY); insightY += 4.5
    doc.setFont('helvetica', 'normal'); doc.setTextColor(48, 61, 50); writeWrapped(item.detail, pageWidth - margin * 2 - 6, 8)
  })
  if (insightY > pageHeight - 38) { doc.addPage('a4', 'landscape'); drawHeader(); insightY = 41 }
  insightY += 2
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(34, 57, 42); doc.text('Prioritized recommendations', margin, insightY)
  insightY += 6
  const recommendations = aiResult?.recommendations || []
  recommendations.forEach((item, index) => {
    const body = `${item.priority || 'Medium'} priority  |  ${item.title || 'Recommended action'}\nEvidence: ${item.evidence || 'Not provided'}\nAction: ${item.action || 'Review source records and document the outcome.'}`
    const lines = doc.splitTextToSize(body, pageWidth - margin * 2 - 12)
    const height = lines.length * 4 + 8
    if (insightY + height > pageHeight - 17) { doc.addPage('a4', 'landscape'); drawHeader(); insightY = 41 }
    doc.setFillColor(247, 250, 245); doc.setDrawColor(225, 233, 224); doc.roundedRect(margin, insightY - 3, pageWidth - margin * 2, height, 1.8, 1.8, 'FD')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(48, 61, 50); doc.text(lines, margin + 5, insightY + 2)
    insightY += height + 4
  })
  if (!recommendations.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted); doc.text('No AI recommendations were supplied.', margin, insightY) }
  if (aiResult?.data_quality_notes?.length) {
    if (insightY > pageHeight - 30) { doc.addPage('a4', 'landscape'); drawHeader(); insightY = 41 }
    insightY += 3
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(118, 88, 32); doc.text('Data quality and interpretation notes', margin, insightY); insightY += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted)
    aiResult.data_quality_notes.slice(0, 8).forEach(note => { const lines = doc.splitTextToSize(`• ${note}`, pageWidth - margin * 2 - 4); if (insightY + lines.length * 3.5 > pageHeight - 14) { doc.addPage('a4', 'landscape'); drawHeader(); insightY = 41 } doc.text(lines, margin + 2, insightY); insightY += lines.length * 3.5 + 1.5 })
  }
  const safeDate = new Date().toISOString().slice(0, 10)
  doc.save(`GreenTrack_ESG_Activity_Report_${safeDate}.pdf`)
}

function downloadCsv(rows) {
  const columns = [
    ['id', 'Record ID'], ['scope', 'Scope'], ['category_display', 'Category'],
    ['description', 'Description'], ['activity_value', 'Activity value'], ['activity_unit', 'Activity unit'],
    ['facility', 'Facility'], ['period_start', 'Period start'], ['period_end', 'Period end'],
    ['status', 'Review status'], ['data_source_name', 'Data source'], ['country_code', 'Country'],
  ]
  const csv = [columns.map(([, label]) => label), ...rows.map(row => columns.map(([key]) => key === 'category_display' ? (row.category_display || row.category || '') : (row[key] ?? '')))]
    .map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a'); link.href = url; link.download = 'greentrack-esg-report-records.csv'; link.click(); URL.revokeObjectURL(url)
}

export default function Reports() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [scope, setScope] = useState('')
  const [status, setStatus] = useState('')
  const [generatedAt, setGeneratedAt] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const handlePdfDownload = async () => {
    setPdfLoading(true); setPdfError('')
    try {
      const response = await ai.recommendations('auto')
      downloadProfessionalPdf({ rows: filtered, counts, periodStart, periodEnd, scope, status, generatedAt, aiResult: response.data })
    } catch (err) {
      setPdfError('Could not retrieve AI insights from the backend. The report was not downloaded; open AI recommendations to check the connection and retry.')
    } finally { setPdfLoading(false) }
  }

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // Fetch the full record set for a report; handle paginated and non-paginated API responses.
      let response = await records.list({ page_size: 1000 })
      let rows = response.data?.results || response.data || []
      if (Array.isArray(rows) && response.data?.next) {
        let next = response.data.next
        while (next && rows.length < 10000) {
          const page = await fetch(next, { headers: localStorage.getItem('token') ? { Authorization: `Token ${localStorage.getItem('token')}` } : {} })
          if (!page.ok) break
          const body = await page.json(); rows = rows.concat(body.results || []); next = body.next
        }
      }
      setData(Array.isArray(rows) ? rows : [])
      setGeneratedAt(new Date())
    } catch {
      setError('Could not load records for the report. Check the backend connection and retry.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  const filtered = useMemo(() => data.filter(row => {
    const start = row.period_start || ''
    const end = row.period_end || row.period_start || ''
    return (!periodStart || (end && end >= periodStart)) && (!periodEnd || (start && start <= periodEnd)) && (!scope || String(row.scope) === scope) && (!status || row.status === status)
  }), [data, periodStart, periodEnd, scope, status])
  const counts = useMemo(() => ({
    total: filtered.length,
    approved: filtered.filter(r => r.status === 'APPROVED' || r.status === 'LOCKED').length,
    pending: filtered.filter(r => r.status === 'PENDING').length,
    flagged: filtered.filter(r => r.status === 'FLAGGED').length,
    scopes: [1, 2, 3].map(n => ({ scope: n, count: filtered.filter(r => Number(r.scope) === n).length })),
  }), [filtered])

  return <div className="content-page report-page">
    <section className="page-heading-row report-heading">
      <div><div className="eyebrow">ESG REPORTING</div><h1>Report generation<span className="title-period">.</span></h1><p>Build a review-ready activity report from records currently stored in GreenTrack.</p></div>
      <div className="heading-actions"><button className="btn btn-outline" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/> Refresh data</button><button className="btn btn-primary" onClick={handlePdfDownload} disabled={loading || pdfLoading || !filtered.length}><Download size={15}/>{pdfLoading ? 'Generating insights…' : 'Download PDF report'}</button></div>
    </section>

    <section className="report-callout"><span><FileText size={20}/></span><div><strong>Activity report · source-backed records</strong><p>This report summarizes recorded activity and review status. It does not calculate or certify tCO₂e emissions; use a validated emission-factor methodology before reporting carbon totals.</p></div><span className="report-callout-tag"><ShieldCheck size={14}/> Traceable data</span></section>

    <section className="panel report-filters">
      <div className="card-heading"><div><h3>Report parameters</h3><p className="panel-description">Filter the records included in the preview and exports.</p></div><CalendarDays size={19} color="#6e9475"/></div>
      <div className="report-filter-grid"><label>Period from<input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}/></label><label>Period to<input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}/></label><label>Emission scope<select value={scope} onChange={e => setScope(e.target.value)}><option value="">All scopes</option><option value="1">Scope 1</option><option value="2">Scope 2</option><option value="3">Scope 3</option></select></label><label>Review status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="APPROVED">Approved</option><option value="LOCKED">Locked</option><option value="PENDING">Pending</option><option value="FLAGGED">Flagged</option><option value="REJECTED">Rejected</option></select></label></div>
      <div className="report-filter-footer"><span>{loading ? 'Loading records…' : `${filtered.length} records match these parameters`}</span><button className="btn btn-quiet" onClick={() => {setPeriodStart('');setPeriodEnd('');setScope('');setStatus('')}}>Clear filters</button></div>
    </section>

    {pdfError && <div className="inline-alert"><AlertTriangle size={16}/><span>{pdfError}</span><button onClick={() => setPdfError('')}>Dismiss</button></div>}
    {error && <div className="inline-alert"><AlertTriangle size={16}/><span>{error}</span><button onClick={load}>Retry</button></div>}
    <section className="report-kpis"><article><span>Records included</span><strong>{loading ? '—' : fmt(counts.total)}</strong><small>Filtered activity records</small></article><article><span>Approved / locked</span><strong>{loading ? '—' : fmt(counts.approved)}</strong><small><CheckCircle2 size={13}/> Review-ready records</small></article><article><span>Pending review</span><strong>{loading ? '—' : fmt(counts.pending)}</strong><small>Require a decision</small></article><article><span>Flagged records</span><strong>{loading ? '—' : fmt(counts.flagged)}</strong><small>Require follow-up</small></article></section>

    <section className="panel report-preview" id="report-preview">
      <div className="report-document-head"><div className="report-brand-mark">G</div><div><div className="eyebrow">GREENTRACK · ESG INTELLIGENCE</div><h2>Activity and review summary</h2><p>Reporting period: {periodStart ? dateLabel(periodStart) : 'Any start date'} — {periodEnd ? dateLabel(periodEnd) : 'Any end date'}</p></div><div className="report-generated">Generated<br/><strong>{generatedAt ? generatedAt.toLocaleString() : 'Waiting for data'}</strong></div></div>
      <div className="report-section-title"><h3>Records by scope</h3><span>Activity record counts, not emissions totals</span></div>
      <div className="report-scope-grid">{counts.scopes.map(item => <div key={item.scope}><span>Scope {item.scope}</span><strong>{fmt(item.count)}</strong><div className="report-bar"><i style={{width: `${counts.total ? item.count / counts.total * 100 : 0}%`}}/></div><small>{counts.total ? Math.round(item.count / counts.total * 100) : 0}% of included records</small></div>)}</div>
      <div className="report-section-title"><h3>Included activity records</h3><span>{filtered.length} total</span></div>
      <div className="table-scroll"><table className="data-table report-table"><thead><tr><th>ID</th><th>Scope</th><th>Category / activity</th><th>Activity</th><th>Facility</th><th>Period</th><th>Status</th></tr></thead><tbody>{loading ? <tr><td colSpan="7"><div className="table-state">Loading report data…</div></td></tr> : filtered.length ? filtered.slice(0, 500).map(row => <tr key={row.id}><td>{row.id}</td><td>S{row.scope}</td><td><strong>{row.category_display || row.category || 'Activity'}</strong><small className="cell-muted">{row.description || row.data_source_name || '—'}</small></td><td>{fmt(row.activity_value)} {row.activity_unit || ''}</td><td>{row.facility || '—'}</td><td>{row.period_start || '—'}{row.period_end && row.period_end !== row.period_start ? ` → ${row.period_end}` : ''}</td><td><span className={`status-tag ${row.status === 'APPROVED' || row.status === 'LOCKED' ? 'tag-ok' : row.status === 'FLAGGED' ? 'tag-red' : 'tag-warn'}`}>{row.status || 'UNKNOWN'}</span></td></tr>) : <tr><td colSpan="7"><div className="table-state">No records match the selected report parameters.</div></td></tr>}</tbody></table></div>
      {filtered.length > 500 && <p className="report-limit-note">Preview shows the first 500 records. Export CSV to include the full filtered result set.</p>}
      <div className="report-footnote"><ShieldCheck size={14}/> Values and statuses are sourced from the current GreenTrack API response. Verify source completeness and methodology before external disclosure.</div>
    </section>
    <section className="report-export-row"><div><strong>Ready to share?</strong><p>Download a professionally formatted PDF report or export the filtered records as CSV for further analysis.</p></div><div><button className="btn btn-outline" onClick={() => downloadCsv(filtered)} disabled={loading || !filtered.length}><Download size={15}/> Export CSV</button><button className="btn btn-primary" onClick={handlePdfDownload} disabled={loading || pdfLoading || !filtered.length}><Download size={15}/>{pdfLoading ? 'Generating insights…' : 'Download PDF report'}</button></div></section>
  </div>
}
