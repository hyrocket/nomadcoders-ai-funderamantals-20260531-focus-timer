import { useState, useEffect } from 'react'
import { api } from '../api'
import './History.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export default function History() {
  const [sessions, setSessions] = useState([])
  const [subjects, setSubjects] = useState([])
  const [filterSubject, setFilterSubject] = useState('')
  const [filterRange, setFilterRange] = useState('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const params = {}
      if (filterSubject) params.subject_id = filterSubject
      if (filterRange !== 'all') params.range = filterRange
      const data = await api.getSessions(params)
      setSessions(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(console.error)
  }, [])

  useEffect(() => { load() }, [filterSubject, filterRange])

  async function handleDelete(id) {
    await api.deleteSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  // group by date
  const grouped = sessions.reduce((acc, s) => {
    const day = formatDate(s.created_at)
    if (!acc[day]) acc[day] = []
    acc[day].push(s)
    return acc
  }, {})

  return (
    <div className="page">
      <h1 className="page-title">History</h1>

      {/* Filters */}
      <div className="history-filters card">
        <div className="filter-group">
          <label className="filter-label">Subject</label>
          <select className="select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Range</label>
          <div className="filter-tabs">
            {[['all','All'],['week','This Week'],['month','This Month']].map(([val, label]) => (
              <button
                key={val}
                className={'filter-tab' + (filterRange === val ? ' active' : '')}
                onClick={() => setFilterRange(val)}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Session list */}
      {loading ? (
        <div className="history-empty">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="history-empty">No sessions found. Start your first focus session!</div>
      ) : (
        <div className="history-list">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day} className="history-group">
              <div className="history-date">{day}</div>
              {items.map(s => (
                <div key={s.id} className="session-item card">
                  <div className="session-dot" />
                  <div className="session-info">
                    <span className="session-subject">{s.subject_name}</span>
                    <span className="session-time">{formatTime(s.created_at)}</span>
                  </div>
                  <span className="session-duration">{s.duration}m</span>
                  <button
                    className="btn btn-sm btn-ghost session-delete"
                    onClick={() => handleDelete(s.id)}
                    title="Delete session"
                  >✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
