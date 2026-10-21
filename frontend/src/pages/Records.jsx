import { useCallback, useEffect, useState } from 'react'
import { records } from '../utils/api'
import {
  AlertTriangle, CheckCircle2, ChevronDown, Download, Filter, Flag,
  Lock, RefreshCw, Search, ShieldCheck, XCircle,
} from 'lucide-react'

const STATUS = {
  PENDING: { label: 'Pending', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'gray' },
  FLAGGED: { label: 'Flagged', tone: 'red' },
  LOCKED: { label: 'Locked', tone: 'purple' },
}
const SCOPE_COLOR = { 1: '#c96c50', 2: '#5286bd', 3: '#8a79c7' }
const fmt = value => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })

function Badge({ status }) {
  const item = STATUS[status] || STATUS.PENDING
  return <span className={`status-tag tag-${item.tone}`}>{item.label}</span>
}

function RecordRow({ record, selected, onSelect, onAction }) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState('')
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')

  const act = async action => {
    setActing(true)
    setError('')
    try {
      await onAction(record.id, action, note)
      setExpanded(false)
    } catch {
      setError('Action failed. Please retry.')
    } finally {
      setActing(false)
    }
  }

  return (
    <>
      <tr className={selected ? 'selected-row' : ''}>
        <td><input className="table-check" type="checkbox" checked={selected} onChange={() => onSelect(record.id)} aria-label={`Select record ${record.id}`} /></td>
        <td><span className="scope-badge" style={{ '--scope-color': SCOPE_COLOR[record.scope] || '#748179' }}>S{record.scope}</span></td>
        <td>
          <button className="record-title-button" onClick={() => setExpanded(value => !value)}>
            <strong>{record.category_display || record.category || 'Emission activity'}</strong>
            <small>{record.description || 'No description supplied'}</small>
          </button>
        </td>
        <td><strong className="mono">{fmt(record.activity_value)}</strong><span className="unit-label"> {record.activity_unit}</span></td>
        <td><strong className="facility-name">{record.facility || '—'}</strong><small className="cell-muted">{record.period_start || 'Period not set'}</small></td>
        <td><Badge status={record.status} /></td>
        <td><button className={`expand-row ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded(value => !value)} aria-label="Toggle record details"><ChevronDown size={17} /></button></td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={7}>
            <div className="record-detail">
              <div className="detail-grid">
                {[
                  ['Original value', `${fmt(record.original_value)} ${record.original_unit || ''}`],
                  ['Normalised activity', `${fmt(record.activity_value)} ${record.activity_unit || ''}`],
                  ['Reporting period', `${record.period_start || '—'} → ${record.period_end || '—'}`],
                  ['Data source', record.data_source_name || '—'],
                  ['Country', record.country_code || '—'],
                  ['Supplier', record.supplier || '—'],
                  ['Scope', record.scope_display || `Scope ${record.scope}`],
                ].map(([label, value]) => (
                  <div className="detail-field" key={label}><small>{label}</small><strong>{value}</strong></div>
                ))}
              </div>
              {record.flag_reason && <div className="flag-reason"><AlertTriangle size={16} /><span>{record.flag_reason}</span></div>}
              {record.status !== 'LOCKED' ? (
                <div className="review-actions">
                  <input value={note} onChange={event => setNote(event.target.value)} placeholder="Add a review note (recommended)…" aria-label="Review note" />
                  <button className="btn btn-success" disabled={acting || record.status === 'APPROVED'} onClick={() => act('APPROVE')}><CheckCircle2 size={15} /> Approve</button>
                  <button className="btn btn-neutral" disabled={acting || record.status === 'REJECTED'} onClick={() => act('REJECT')}><XCircle size={15} /> Reject</button>
                  <button className="btn btn-danger" disabled={acting || record.status === 'FLAGGED'} onClick={() => act('FLAG')}><Flag size={15} /> Flag</button>
                  {record.status === 'APPROVED' && <button className="btn btn-purple" disabled={acting} onClick={() => act('LOCK')}><Lock size={15} /> Lock</button>}
                </div>
              ) : <div className="locked-note"><Lock size={15} /> This record is locked for audit and cannot be modified.</div>}
              {error && <p className="form-error">{error}</p>}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Records() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ status: '', scope: '', category: '' })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [bulkNote, setBulkNote] = useState('')
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value })
      const response = await records.list(params)
      setData(response.data.results || response.data || [])
    } catch {
      setError('Could not load records. Check the API connection and retry.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])
  const visible = data.filter(record => `${record.category_display || ''} ${record.description || ''} ${record.facility || ''} ${record.data_source_name || ''}`.toLowerCase().includes(search.toLowerCase()))
  const action = async (id, actionType, noteText) => { await records.review(id, actionType, noteText); await load() }
  const bulk = async actionType => {
    if (!selected.size) return
    setActing(true)
    setError('')
    try {
      await records.bulkReview([...selected], actionType, bulkNote)
      setSelected(new Set())
      setBulkNote('')
      await load()
    } catch {
      setError('Bulk review failed. No confirmation received.')
    } finally {
      setActing(false)
    }
  }
  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  const toggle = id => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const toggleAll = () => setSelected(visible.length && selected.size === visible.length ? new Set() : new Set(visible.map(record => record.id)))
  const exportCsv = () => {
    const headers = ['id', 'scope', 'category', 'activity_value', 'activity_unit', 'facility', 'period_start', 'status']
    const csv = [headers.join(','), ...visible.map(record => headers.map(key => `"${String(key === 'category' ? (record.category_display || record.category || '') : (record[key] ?? '')).replaceAll('"', '""')}"`).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'greentrack-emission-records.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="content-page">
      <section className="page-heading-row">
        <div><div className="eyebrow">DATA GOVERNANCE</div><h1>Emission records<span className="title-period">.</span></h1><p>Review source activity, preserve decision notes and prepare an auditable record set.</p></div>
        <div className="heading-actions"><button className="btn btn-outline" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh</button><button className="btn btn-primary" onClick={exportCsv}><Download size={15} /> Export CSV</button></div>
      </section>
      <section className="record-kpis"><div><span>Records in view</span><strong>{visible.length}</strong></div><div><span>Pending review</span><strong>{visible.filter(record => record.status === 'PENDING').length}</strong></div><div><span>Flagged</span><strong>{visible.filter(record => record.status === 'FLAGGED').length}</strong></div><div><span>Selected</span><strong>{selected.size}</strong></div></section>
      <section className="panel records-panel">
        <div className="records-toolbar">
          <div className="search-field"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search category, facility or source…" aria-label="Search emission records" /></div>
          <div className="filter-label"><Filter size={15} /> Filter by</div>
          <select value={filters.status} onChange={event => setFilter('status', event.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="FLAGGED">Flagged</option><option value="REJECTED">Rejected</option><option value="LOCKED">Locked</option></select>
          <select value={filters.scope} onChange={event => setFilter('scope', event.target.value)} aria-label="Filter by scope"><option value="">All scopes</option><option value="1">Scope 1</option><option value="2">Scope 2</option><option value="3">Scope 3</option></select>
          <select value={filters.category} onChange={event => setFilter('category', event.target.value)} aria-label="Filter by category"><option value="">All categories</option><option value="FUEL_STATIONARY">Stationary fuel</option><option value="FUEL_MOBILE">Mobile fuel</option><option value="ELECTRICITY">Electricity</option><option value="BUSINESS_TRAVEL">Business travel</option><option value="PROCUREMENT">Procurement</option></select>
        </div>
        {selected.size > 0 && <div className="bulk-bar"><strong>{selected.size} selected</strong><input value={bulkNote} onChange={event => setBulkNote(event.target.value)} placeholder="Add a note for this batch…" /><button className="btn btn-success" disabled={acting} onClick={() => bulk('APPROVE')}>Approve selected</button><button className="btn btn-neutral" disabled={acting} onClick={() => bulk('REJECT')}>Reject selected</button><button className="btn btn-danger" disabled={acting} onClick={() => bulk('FLAG')}>Flag selected</button><button className="btn btn-quiet" onClick={() => setSelected(new Set())}>Clear</button></div>}
        {error && <div className="inline-alert"><AlertTriangle size={16} /><span>{error}</span><button onClick={load}>Retry</button></div>}
        <div className="table-scroll"><table className="data-table"><thead><tr><th><input className="table-check" type="checkbox" checked={visible.length > 0 && selected.size === visible.length} onChange={toggleAll} aria-label="Select all visible records" /></th><th>Scope</th><th>Category / description</th><th>Activity</th><th>Facility / period</th><th>Review status</th><th /></tr></thead><tbody>
          {loading ? <tr><td colSpan={7}><div className="table-state"><span className="spinner" /> Loading emission records…</div></td></tr> : visible.length === 0 ? <tr><td colSpan={7}><div className="table-state"><div className="empty-table-icon"><Search size={20} /></div><strong>No matching records</strong><span>Try adjusting the filters or import a source file.</span></div></td></tr> : visible.map(record => <RecordRow key={record.id} record={record} selected={selected.has(record.id)} onSelect={toggle} onAction={action} />)}
        </tbody></table></div>
        <div className="table-footer"><span><ShieldCheck size={14} /> Review decisions are captured in the audit trail.</span><span>Showing {visible.length} record{visible.length === 1 ? '' : 's'}</span></div>
      </section>
    </div>
  )
}
