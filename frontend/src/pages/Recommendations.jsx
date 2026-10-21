import { useCallback, useEffect, useState } from 'react'
import { ai } from '../utils/api'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Wifi,
} from 'lucide-react'

const priorityClass = (value) => {
  const priority = String(value || 'Medium').toLowerCase()

  if (priority === 'high') return 'ai-priority-high'
  if (priority === 'low') return 'ai-priority-low'

  return 'ai-priority-medium'
}

// Convert an API value into a safe array for React rendering.
function toArray(value) {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    // Some backends return JSON arrays as strings.
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed)
      }
    } catch {
      // A normal string is one note, not a list of characters.
    }

    return [trimmed]
  }

  if (typeof value === 'object') {
    return Object.values(value)
  }

  return [value]
}

function displayText(value, fallback = '') {
  if (value == null) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return value.title || value.message || value.description ||
    value.text || value.note || JSON.stringify(value)
}

function formatDate(date) {
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function Recommendations() {
  const [provider, setProvider] = useState('auto')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const generate = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await ai.recommendations(provider)
      const data = response?.data

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('The AI endpoint returned an unexpected response format.')
      }

      setResult(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Could not connect to the GreenTrack AI endpoint. Confirm that the Django backend is running and sign in again.'
      )
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    generate()
  }, [generate])

  const insights = toArray(result?.insights)
  const recommendations = toArray(result?.recommendations)
  const qualityNotes = toArray(result?.data_quality_notes)
  const providerErrors = toArray(result?.provider_errors)
  const coverage = result?.data_coverage || {}

  return (
    <div className="content-page ai-page">
      <section className="page-heading-row">
        <div>
          <div className="eyebrow">ESG INTELLIGENCE</div>
          <h1>
            AI recommendations<span className="title-period">.</span>
          </h1>
          <p>
            Evidence-led insights from activity records, ingestion quality,
            review decisions, and audit history.
          </p>
        </div>

        <div className="heading-actions">
          <label className="ai-provider-select">
            AI engine
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              disabled={loading}
            >
              <option value="auto">Auto · Groq then Ollama</option>
              <option value="groq">Groq API</option>
              <option value="ollama">Local Ollama</option>
            </select>
          </label>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={generate}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            {loading ? 'Analyzing…' : 'Refresh analysis'}
          </button>
        </div>
      </section>

      <section className="ai-hero">
        <div className="ai-hero-icon">
          <Sparkles size={23} />
        </div>
        <div className="ai-hero-copy">
          <span>WORKSPACE-WIDE ANALYSIS</span>
          <h2>Turn ESG data into clear next steps.</h2>
          <p>
            The backend gathers organization-scoped records, checks data
            quality, and generates recommendations using the selected AI
            provider or available fallback logic.
          </p>
        </div>
      </section>

      {error && (
        <div className="inline-alert" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button type="button" onClick={generate} disabled={loading}>
            Retry
          </button>
        </div>
      )}

      {loading && !result && (
        <section className="panel ai-loading">
          <span className="spinner" />
          <strong>Reviewing the workspace data…</strong>
          <p>
            Depending on the configured provider, the first analysis can take
            a little longer.
          </p>
        </section>
      )}

      {result && (
        <>
          <section className="ai-coverage-grid">
            <article>
              <span><Target size={17} /></span>
              <small>Organization</small>
              <strong>
                {displayText(coverage.organization, 'Current workspace')}
              </strong>
            </article>

            <article>
              <span><CheckCircle2 size={17} /></span>
              <small>Activity records</small>
              <strong>
                {Number(coverage.total_records || 0).toLocaleString()}
              </strong>
            </article>

            <article>
              <span><ShieldCheck size={17} /></span>
              <small>Audit events reviewed</small>
              <strong>
                {Number(coverage.audit_events_in_context || 0).toLocaleString()}
              </strong>
            </article>

            <article>
              <span><Wifi size={17} /></span>
              <small>Ingestion runs reviewed</small>
              <strong>
                {Number(coverage.ingestion_runs_in_context || 0).toLocaleString()}
              </strong>
            </article>
          </section>

          <section className="panel ai-summary-panel">
            <div className="ai-section-title">
              <div>
                <span className="eyebrow">EXECUTIVE READOUT</span>
                <h2>What the data is telling us</h2>
              </div>
              <span className="ai-updated">
                <Clock3 size={13} />
                {lastUpdated ? formatDate(lastUpdated) : 'Not updated yet'}
              </span>
            </div>

            <p>
              {displayText(
                result.summary || result.executive_summary,
                'No executive summary was provided by the AI endpoint.'
              )}
            </p>
          </section>

          <section className="ai-content-grid">
            <div className="panel ai-insights-panel">
              <div className="ai-section-title">
                <div>
                  <span className="eyebrow">OBSERVATIONS</span>
                  <h2>Clean insights</h2>
                </div>
                <span className="ai-count-pill">{insights.length}</span>
              </div>

              {insights.length > 0 ? (
                <div className="ai-list">
                  {insights.map((item, index) => {
                    const title = typeof item === 'object' && item !== null
                      ? (item.title || item.name || ('Insight ' + (index + 1)))
                      : ('Insight ' + (index + 1))

                    const description = typeof item === 'object' && item !== null
                      ? (item.description || item.message || item.detail || item.text)
                      : item


                    return (
                      <article className="ai-insight-item" key={index}>
                        <CheckCircle2 size={17} />
                        <div>
                          <strong>{displayText(title)}</strong>
                          <p>{displayText(description, 'No additional details provided.')}</p>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <p>No insights were returned for this analysis.</p>
              )}
            </div>

            <div className="panel ai-recommendations-panel">
              <div className="ai-section-title">
                <div>
                  <span className="eyebrow">PRIORITIZED ACTIONS</span>
                  <h2>Recommended next steps</h2>
                </div>
                <Lightbulb size={19} color="#6b9c68" />
              </div>

              {recommendations.length > 0 ? (
                <div className="ai-list">
                  {recommendations.map((item, index) => {
                    const title =
                      typeof item === 'object' && item !== null
                        ? item.title || item.action || item.name ||
                          'Recommendation ' + (index + 1)
                        : 'Recommendation ' + (index + 1)

                    const description =
                      typeof item === 'object' && item !== null
                        ? item.description || item.rationale || item.details ||
                          item.message || item.text
                        : item

                    const priority =
                      typeof item === 'object' && item !== null
                        ? item.priority || item.severity || 'Medium'
                        : 'Medium'

                    return (
                      <article className="ai-recommendation-item" key={index}>
                        <div className="ai-recommendation-heading">
                          <strong>{displayText(title)}</strong>
                          <span className={priorityClass(priority)}>
                            {displayText(priority, 'Medium')}
                          </span>
                        </div>

                        {description && (
                          <p>{displayText(description)}</p>
                        )}

                        {typeof item === 'object' && item !== null &&
                          (item.impact || item.expected_impact) && (
                            <p>
                              <strong>Expected impact: </strong>
                              {displayText(item.impact || item.expected_impact)}
                            </p>
                          )}

                        {typeof item === 'object' && item !== null &&
                          (item.evidence || item.reason) && (
                            <p>
                              <strong>Evidence: </strong>
                              {displayText(item.evidence || item.reason)}
                            </p>
                          )}
                      </article>
                    )
                  })}
                </div>
              ) : (
                <p>No recommendations were returned for this analysis.</p>
              )}
            </div>
          </section>

          {qualityNotes.length > 0 && (
            <section className="panel ai-quality-panel">
              <div className="ai-section-title">
                <div>
                  <span className="eyebrow">LIMITATIONS &amp; VALIDATION</span>
                  <h2>Read before acting</h2>
                </div>
                <ShieldCheck size={18} color="#7b9b75" />
              </div>

              <ul>
                {qualityNotes.map((note, index) => (
                  <li key={index}>{displayText(note)}</li>
                ))}
              </ul>
            </section>
          )}

          {providerErrors.length > 0 && (
            <div className="ai-fallback-note">
              <AlertTriangle size={15} />
              <div>
                <strong>
                  An AI provider reported an issue; review the details below.
                </strong>
                {providerErrors.map((providerError, index) => (
                  <p key={index}>{displayText(providerError)}</p>
                ))}
                <p>
                  For local inference, verify that Ollama is running and that
                  the configured model is available.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="ai-disclaimer">
        <ShieldCheck size={15} />
        <span>
          Recommendations are decision support, not verified emissions
          calculations or regulatory advice. Activity units are not combined,
          and no tCO₂e totals are inferred without validated emission factors.
        </span>
      </div>
    </div>
  )
}
