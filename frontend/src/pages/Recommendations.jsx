import { useCallback, useEffect, useState } from 'react'
import { ai } from '../utils/api'
import { AlertTriangle, CheckCircle2, Clock3, Lightbulb, RefreshCw, ShieldCheck, Sparkles, Target, Wifi } from 'lucide-react'

const priorityClass = value => String(value || 'Medium').toLowerCase() === 'high' ? 'ai-priority-high' : String(value || 'Medium').toLowerCase() === 'low' ? 'ai-priority-low' : 'ai-priority-medium'

export default function Recommendations() {
  const [provider, setProvider] = useState('auto')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const generate = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await ai.recommendations(provider)
      setResult(response.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.response?.data?.error || 'Could not connect to the GreenTrack AI endpoint. Confirm that the Django backend is running and sign in again.')
    } finally { setLoading(false) }
  }, [provider])

  useEffect(() => { generate() }, [generate]) // Re-run analysis when the selected provider changes.

  return <div className="content-page ai-page">
    <section className="page-heading-row">
      <div><div className="eyebrow">ESG INTELLIGENCE</div><h1>AI recommendations<span className="title-period">.</span></h1><p>Evidence-led insights from activity records, ingestion quality, review decisions, and audit history.</p></div>
      <div className="heading-actions"><label className="ai-provider-select">AI engine<select value={provider} onChange={e => setProvider(e.target.value)}><option value="auto">Auto · Groq then Ollama</option><option value="groq">Groq API</option><option value="ollama">Local Ollama</option></select></label><button className="btn btn-primary" onClick={generate} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/>{loading ? 'Analyzing workspace…' : 'Refresh insights'}</button></div>
    </section>

    <section className="ai-hero"><div className="ai-hero-icon"><Sparkles size={23}/></div><div className="ai-hero-copy"><span>WORKSPACE-WIDE ANALYSIS</span><h2>Turn ESG data into clear next steps.</h2><p>The backend gathers organization-scoped records, ingestion run quality, and recent audit events. The model is asked to ground every recommendation in that evidence.</p></div><div className="ai-hero-status"><span className="ai-status-dot"/>{result?.provider || (loading ? 'Analyzing' : 'Ready')}</div></section>

    {error && <div className="inline-alert"><AlertTriangle size={16}/><span>{error}</span><button onClick={generate}>Retry</button></div>}
    {loading && !result && <section className="panel ai-loading"><span className="spinner"/><strong>Reviewing the workspace data…</strong><p>Depending on the configured provider, the first analysis can take a little longer.</p></section>}
    {result && <>
      <section className="ai-coverage-grid">
        <article><span><Target size={17}/></span><small>Organization</small><strong>{result.data_coverage?.organization || 'Current workspace'}</strong></article>
        <article><span><CheckCircle2 size={17}/></span><small>Activity records</small><strong>{Number(result.data_coverage?.total_records || 0).toLocaleString()}</strong></article>
        <article><span><ShieldCheck size={17}/></span><small>Audit events reviewed</small><strong>{Number(result.data_coverage?.audit_events_in_context || 0).toLocaleString()}</strong></article>
        <article><span><Wifi size={17}/></span><small>Ingestion runs reviewed</small><strong>{Number(result.data_coverage?.ingestion_runs_in_context || 0).toLocaleString()}</strong></article>
      </section>
      <section className="panel ai-summary-panel"><div className="ai-section-title"><div><span className="eyebrow">EXECUTIVE READOUT</span><h2>What the data is telling us</h2></div><span className="ai-updated"><Clock3 size={13}/> {lastUpdated ? lastUpdated.toLocaleString() : result.generated_at}</span></div><p>{result.summary || 'Analysis completed.'}</p></section>
      <section className="ai-content-grid"><div className="panel ai-insights-panel"><div className="ai-section-title"><div><span className="eyebrow">OBSERVATIONS</span><h2>Clean insights</h2></div><span className="ai-count-pill">{result.insights?.length || 0}</span></div>{result.insights?.length ? result.insights.map((item, i) => <article className="ai-insight-item" key={`${item.title}-${i}`}><span className="ai-insight-index">{String(i + 1).padStart(2, '0')}</span><div><h3>{item.title}</h3><p>{item.detail}</p></div></article>) : <p className="ai-muted">No observations returned.</p>}</div>
        <div className="panel ai-recommendations-panel"><div className="ai-section-title"><div><span className="eyebrow">PRIORITIZED ACTIONS</span><h2>Recommended next steps</h2></div><Lightbulb size={19} color="#6b9c68"/></div>{result.recommendations?.length ? result.recommendations.map((item, i) => <article className="ai-recommendation" key={`${item.title}-${i}`}><div className="ai-recommendation-top"><span className={priorityClass(item.priority)}>{item.priority || 'Medium'} priority</span><span className="ai-action-number">Action {i + 1}</span></div><h3>{item.title}</h3><div className="ai-evidence"><strong>Evidence</strong><p>{item.evidence}</p></div><div className="ai-action"><strong>Suggested action</strong><p>{item.action}</p></div></article>) : <p className="ai-muted">No recommendations returned.</p>}</div></section>
      {result.data_quality_notes?.length > 0 && <section className="panel ai-quality-panel"><div className="ai-section-title"><div><span className="eyebrow">LIMITATIONS & VALIDATION</span><h2>Read before acting</h2></div><ShieldCheck size={18} color="#759274"/></div><ul>{result.data_quality_notes.map((note, i) => <li key={i}>{note}</li>)}</ul></section>}
      {result.provider_errors?.length > 0 && <div className="ai-fallback-note"><AlertTriangle size={15}/><div><strong>AI provider unavailable; showing rule-based insights.</strong><p>{result.provider_errors.join(' · ')}</p><p>Configure GROQ_API_KEY on the backend or start Ollama locally to enable model-generated analysis.</p></div></div>}
    </>}
    <div className="ai-disclaimer"><ShieldCheck size={15}/><span>Recommendations are decision support, not verified emissions calculations or regulatory advice. Activity units are not combined, and no tCO₂e totals are inferred without validated emission factors.</span></div>
  </div>
}
