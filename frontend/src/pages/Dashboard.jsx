import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { api } from '../api'
import './Dashboard.css'

const WEEKDAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SUBJECT_COLORS = ['#00f0ff', '#ff00aa', '#c4ff00', '#b026ff', '#ffea00', '#ff6b35', '#00ff88']

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value">{payload[0].value} {unit}</div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="dash-loading">Loading stats...</div></div>
  if (!stats) return <div className="page"><div className="dash-loading">Could not load stats.</div></div>

  const weekdayData = WEEKDAY_ORDER.map(day => ({
    day,
    minutes: stats.by_weekday?.[day] ?? 0,
  }))

  const subjectData = (stats.by_subject || []).map((s, i) => ({
    ...s,
    color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }))

  const totalHours = stats.total_hours || 0
  const h = Math.floor(totalHours)
  const m = Math.round((totalHours - h) * 60)

  return (
    <div>
      <h1 className="panel-title">Dashboard</h1>

      {/* Stat chips */}
      <div className="dash-stats">
        <div className="stat-chip">
          <span className="stat-chip-label">Current Streak</span>
          <span className="stat-chip-value">
            {stats.streak}
            <span className="stat-chip-unit"> days</span>
          </span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-label">Total Focus Time</span>
          <span className="stat-chip-value">
            {h}<span className="stat-chip-unit">h </span>{m}<span className="stat-chip-unit">m</span>
          </span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-label">Sessions This Week</span>
          <span className="stat-chip-value">
            {stats.sessions_this_week}
            <span className="stat-chip-unit"> sessions</span>
          </span>
        </div>
      </div>

      <div className="dash-charts">
        {/* Weekly pattern */}
        <div className="card dash-chart-card">
          <div className="dash-chart-title">Weekly Pattern</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekdayData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fill: 'rgba(232,232,255,0.45)', fontSize: 12, fontFamily: 'Space Grotesk' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(232,232,255,0.45)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip unit="min" />} cursor={{ fill: 'rgba(0,240,255,0.05)' }} />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {weekdayData.map((_, i) => (
                  <Cell key={i} fill="url(#barGrad)" />
                ))}
              </Bar>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#b026ff" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By subject */}
        <div className="card dash-chart-card">
          <div className="dash-chart-title">Focus by Subject</div>
          {subjectData.length === 0 ? (
            <div className="dash-empty">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectData} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 0 }}>
                <XAxis
                  type="number"
                  tick={{ fill: 'rgba(232,232,255,0.45)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fill: 'rgba(232,232,255,0.7)', fontSize: 12, fontFamily: 'Space Grotesk' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip unit="min" />} cursor={{ fill: 'rgba(0,240,255,0.05)' }} />
                <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                  {subjectData.map((s, i) => (
                    <Cell key={i} fill={s.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
