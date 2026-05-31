import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'
import './Timer.css'

const FOCUS_MINS = 25
const BREAK_MINS = 5
const FOCUS_MS = FOCUS_MINS * 60 * 1000
const BREAK_MS = BREAK_MINS * 60 * 1000

const GRADIENT_PRESETS = [
  { label: 'Night', value: 'linear-gradient(145deg,#0d0d14,#12101e)' },
  { label: 'Ocean', value: 'linear-gradient(145deg,#0a1628,#0d2240)' },
  { label: 'Forest', value: 'linear-gradient(145deg,#0a1a0f,#0d2818)' },
  { label: 'Dusk',  value: 'linear-gradient(145deg,#1a0f28,#120a1e)' },
  { label: 'Ember', value: 'linear-gradient(145deg,#1a0f0a,#280d08)' },
]

const PHOTO_PRESETS = [
  { label: 'Sunset', src: './wallpapers/sunset.jpg' },
  { label: 'Field',  src: './wallpapers/field.jpg' },
  { label: 'Ship',   src: './wallpapers/ship.jpg' },
]

const LS_BG_KEY = 'focusTimer_bgImage'

function loadState() {
  try { return JSON.parse(localStorage.getItem('focusTimer') || 'null') } catch { return null }
}
function saveState(s) {
  localStorage.setItem('focusTimer', JSON.stringify(s))
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Timer() {
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [showAddSubject, setShowAddSubject] = useState(false)

  const [mode, setMode] = useState('focus')
  const [running, setRunning] = useState(false)
  const [remainingMs, setRemainingMs] = useState(FOCUS_MS)
  const [endTime, setEndTime] = useState(null)

  // bg: gradient string or photo preset src (starts with './')
  const [bg, setBg] = useState(GRADIENT_PRESETS[0].value)
  // customBg: base64 data URL for user-uploaded photo
  const [customBg, setCustomBg] = useState(null)

  const [notification, setNotification] = useState(null)
  const intervalRef = useRef(null)

  const totalMs = mode === 'focus' ? FOCUS_MS : BREAK_MS
  const progress = 1 - remainingMs / totalMs
  const R = 120
  const CIRC = 2 * Math.PI * R

  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(console.error)
  }, [])

  // restore from localStorage
  useEffect(() => {
    const saved = loadState()
    if (saved) {
      setMode(saved.mode || 'focus')
      setSelectedSubject(saved.selectedSubject || '')
      setBg(saved.bg || GRADIENT_PRESETS[0].value)
      if (saved.running && saved.endTime) {
        const left = saved.endTime - Date.now()
        if (left > 0) { setEndTime(saved.endTime); setRemainingMs(left); setRunning(true) }
        else { setRemainingMs(0) }
      } else {
        setRemainingMs(saved.remainingMs ?? FOCUS_MS)
      }
    }
    // restore custom uploaded photo
    const saved64 = localStorage.getItem(LS_BG_KEY)
    if (saved64) setCustomBg(saved64)
  }, [])

  // tick
  useEffect(() => {
    if (running && endTime) {
      intervalRef.current = setInterval(() => {
        const left = endTime - Date.now()
        if (left <= 0) {
          clearInterval(intervalRef.current)
          setRemainingMs(0); setRunning(false); handleTimerEnd()
        } else { setRemainingMs(left) }
      }, 250)
    } else { clearInterval(intervalRef.current) }
    return () => clearInterval(intervalRef.current)
  }, [running, endTime])

  useEffect(() => {
    document.title = running
      ? `${formatTime(remainingMs)} — ${mode === 'focus' ? '🎯 Focus' : '☕ Break'}`
      : 'Focus Timer'
  }, [running, remainingMs, mode])

  useEffect(() => {
    saveState({ mode, running, endTime, remainingMs, selectedSubject, bg })
  }, [mode, running, endTime, remainingMs, selectedSubject, bg])

  const handleTimerEnd = useCallback(async () => {
    playBeep()
    if (mode === 'focus') {
      showNotif('Focus session complete!', 'success')
      if (selectedSubject) {
        try { await api.createSession(parseInt(selectedSubject), FOCUS_MINS) } catch (e) { console.error(e) }
      }
      setTimeout(() => {
        setMode('break')
        const et = Date.now() + BREAK_MS
        setEndTime(et); setRemainingMs(BREAK_MS); setRunning(true)
        showNotif('Break time — 5 minutes.', 'info')
      }, 1500)
    } else {
      showNotif('Break over! Ready to focus?', 'info')
      setMode('focus'); setRemainingMs(FOCUS_MS); setEndTime(null)
    }
  }, [mode, selectedSubject])

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.35)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.35 + 0.3)
        osc.start(ctx.currentTime + i * 0.35)
        osc.stop(ctx.currentTime + i * 0.35 + 0.3)
      }
    } catch (_) {}
    if (Notification.permission === 'granted') {
      new Notification('Focus Timer', { body: mode === 'focus' ? 'Session complete!' : 'Break over!' })
    }
  }

  function showNotif(msg, type) {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  function handleStart() {
    if (!selectedSubject && mode === 'focus') { showNotif('Select a subject first!', 'warn'); return }
    if (Notification.permission === 'default') Notification.requestPermission()
    setEndTime(Date.now() + remainingMs); setRunning(true)
  }

  function handlePause() { setRunning(false); setEndTime(null) }

  function handleReset() {
    setRunning(false); setEndTime(null); setMode('focus'); setRemainingMs(FOCUS_MS)
  }

  async function handleAddSubject(e) {
    e.preventDefault()
    if (!newSubject.trim()) return
    try {
      const s = await api.createSubject(newSubject.trim())
      setSubjects(prev => [...prev, s])
      setSelectedSubject(String(s.id)); setNewSubject(''); setShowAddSubject(false)
    } catch (e) { showNotif(e.message, 'warn') }
  }

  async function handleDeleteSubject(id) {
    await api.deleteSubject(id)
    setSubjects(prev => prev.filter(s => s.id !== id))
    if (selectedSubject === String(id)) setSelectedSubject('')
  }

  function handleBgUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data64 = ev.target.result
      try {
        localStorage.setItem(LS_BG_KEY, data64)
      } catch (_) {
        showNotif('Image too large to save. Showing temporarily.', 'warn')
      }
      setCustomBg(data64)
      setBg('')
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveCustomBg() {
    localStorage.removeItem(LS_BG_KEY)
    setCustomBg(null)
    setBg(GRADIENT_PRESETS[0].value)
  }

  function selectPhotoBg(src) {
    setCustomBg(null)
    localStorage.removeItem(LS_BG_KEY)
    setBg(src)
  }

  function selectGradient(value) {
    setCustomBg(null)
    localStorage.removeItem(LS_BG_KEY)
    setBg(value)
  }

  const bgStyle = customBg
    ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : bg.startsWith('./')
      ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: bg }

  const dashoffset = CIRC * (1 - progress)
  const ringColor = mode === 'focus' ? '#6c8ef5' : '#4ade80'

  return (
    <div className="timer-root" style={bgStyle}>
      <div className="timer-overlay" />

      {notification && (
        <div className={`timer-notif timer-notif--${notification.type}`}>{notification.msg}</div>
      )}

      <div className="timer-layout">
        {/* ── Left: Timer ── */}
        <div className="timer-left">
          <div className="timer-mode-badge" data-mode={mode}>
            {mode === 'focus' ? '🎯 Focus' : '☕ Break'}
          </div>

          <div className="timer-circle-wrap">
            <svg className="timer-svg" viewBox="0 0 280 280">
              <circle cx="140" cy="140" r={R} className="timer-track" />
              <circle
                cx="140" cy="140" r={R}
                className="timer-progress"
                style={{ strokeDasharray: CIRC, strokeDashoffset: dashoffset, stroke: ringColor }}
              />
            </svg>
            <div className="timer-display">
              <span className="timer-digits">{formatTime(remainingMs)}</span>
              <span className="timer-sublabel">{mode === 'focus' ? 'minutes left' : 'break'}</span>
            </div>
          </div>

          <div className="timer-controls">
            {!running
              ? <button className="btn btn-lg btn-primary" onClick={handleStart}>
                  {remainingMs === (mode === 'focus' ? FOCUS_MS : BREAK_MS) ? 'Start' : 'Resume'}
                </button>
              : <button className="btn btn-lg btn-glass" onClick={handlePause}>Pause</button>
            }
            <button className="btn btn-glass btn-sm" onClick={handleReset}>Reset</button>
          </div>
        </div>

        {/* ── Right: Subject + BG ── */}
        <div className="timer-right">
          {/* Subject */}
          <div className="card timer-subject-card">
            <div className="timer-section-title">Subject</div>
            <select className="select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={running}>
              <option value="">— Select subject —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <div className="subject-list">
              {subjects.map(s => (
                <div key={s.id} className="subject-item">
                  <span>{s.name}</span>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteSubject(s.id)}>✕</button>
                </div>
              ))}
            </div>

            {showAddSubject ? (
              <form className="subject-add-form" onSubmit={handleAddSubject}>
                <input className="input" value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject name..." autoFocus />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-sm btn-primary">Add</button>
                  <button type="button" className="btn btn-sm btn-glass" onClick={() => setShowAddSubject(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <button className="btn btn-sm btn-glass" onClick={() => setShowAddSubject(true)}>+ Add Subject</button>
            )}
          </div>

          {/* Background */}
          <div className="card">
            <div className="timer-section-title">Background</div>

            <div className="bg-section-label">Photos</div>
            <div className="bg-photo-presets">
              {PHOTO_PRESETS.map(p => (
                <button
                  key={p.label}
                  className={'bg-photo-thumb' + (bg === p.src && !customBg ? ' active' : '')}
                  style={{ backgroundImage: `url(${p.src})` }}
                  onClick={() => selectPhotoBg(p.src)}
                  title={p.label}
                />
              ))}
            </div>

            <div className="bg-section-label" style={{ marginTop: 12 }}>Colors</div>
            <div className="bg-presets">
              {GRADIENT_PRESETS.map(p => (
                <button
                  key={p.label}
                  className={'bg-swatch' + (bg === p.value && !customBg ? ' active' : '')}
                  style={{ background: p.value }}
                  onClick={() => selectGradient(p.value)}
                  title={p.label}
                />
              ))}
            </div>

            <label className="btn btn-sm btn-glass" style={{ width: '100%', marginTop: 12, cursor: 'pointer' }}>
              📷 Upload Photo
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />
            </label>
            {customBg && (
              <button className="btn btn-sm btn-glass" style={{ width: '100%', marginTop: 6 }} onClick={handleRemoveCustomBg}>
                ✕ Remove Uploaded Photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
