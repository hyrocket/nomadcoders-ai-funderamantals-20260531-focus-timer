import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'
import './Timer.css'

const FOCUS_MINS = 25
const BREAK_MINS = 5
const FOCUS_MS = FOCUS_MINS * 60 * 1000
const BREAK_MS = BREAK_MINS * 60 * 1000

const BG_PRESETS = [
  { label: 'Void', value: '#0a0014' },
  { label: 'Deep Sea', value: 'linear-gradient(135deg,#001428,#002244)' },
  { label: 'Aurora', value: 'linear-gradient(135deg,#0a0014,#0d1a2e,#001a0a)' },
  { label: 'Ember', value: 'linear-gradient(135deg,#1a0000,#2a0a00)' },
  { label: 'Dusk', value: 'linear-gradient(135deg,#0a001a,#1a0033,#000d1a)' },
]

function loadState() {
  try {
    return JSON.parse(localStorage.getItem('focusTimer') || 'null')
  } catch {
    return null
  }
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

  // timer state
  const [mode, setMode] = useState('focus') // 'focus' | 'break'
  const [running, setRunning] = useState(false)
  const [remainingMs, setRemainingMs] = useState(FOCUS_MS)
  const [endTime, setEndTime] = useState(null) // epoch ms when timer ends

  const [bg, setBg] = useState(BG_PRESETS[0].value)
  const [bgImage, setBgImage] = useState(null)
  const [notification, setNotification] = useState(null) // { msg, type }

  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  const totalMs = mode === 'focus' ? FOCUS_MS : BREAK_MS
  const progress = 1 - remainingMs / totalMs

  // circle math
  const R = 120
  const CIRC = 2 * Math.PI * R

  // load subjects
  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(console.error)
  }, [])

  // restore from localStorage
  useEffect(() => {
    const saved = loadState()
    if (!saved) return
    setMode(saved.mode || 'focus')
    setSelectedSubject(saved.selectedSubject || '')
    setBg(saved.bg || BG_PRESETS[0].value)
    if (saved.running && saved.endTime) {
      const left = saved.endTime - Date.now()
      if (left > 0) {
        setEndTime(saved.endTime)
        setRemainingMs(left)
        setRunning(true)
      } else {
        setRemainingMs(0)
      }
    } else {
      setRemainingMs(saved.remainingMs ?? (saved.mode === 'break' ? BREAK_MS : FOCUS_MS))
    }
  }, [])

  // tick
  useEffect(() => {
    if (running && endTime) {
      intervalRef.current = setInterval(() => {
        const left = endTime - Date.now()
        if (left <= 0) {
          clearInterval(intervalRef.current)
          setRemainingMs(0)
          setRunning(false)
          handleTimerEnd()
        } else {
          setRemainingMs(left)
        }
      }, 250)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, endTime])

  // update tab title
  useEffect(() => {
    if (running) {
      document.title = `${formatTime(remainingMs)} — ${mode === 'focus' ? '🎯 Focus' : '☕ Break'}`
    } else {
      document.title = 'Focus Timer'
    }
  }, [running, remainingMs, mode])

  // persist state
  useEffect(() => {
    saveState({ mode, running, endTime, remainingMs, selectedSubject, bg })
  }, [mode, running, endTime, remainingMs, selectedSubject, bg])

  const handleTimerEnd = useCallback(async () => {
    playBeep()
    if (mode === 'focus') {
      showNotif('🎯 Focus session complete! Great work.', 'success')
      if (selectedSubject) {
        try {
          await api.createSession(parseInt(selectedSubject), FOCUS_MINS)
        } catch (e) {
          console.error(e)
        }
      }
      // auto-start break
      setTimeout(() => {
        setMode('break')
        const et = Date.now() + BREAK_MS
        setEndTime(et)
        setRemainingMs(BREAK_MS)
        setRunning(true)
        showNotif('☕ Break time! 5 minutes.', 'info')
      }, 1500)
    } else {
      showNotif('☕ Break over! Ready to focus?', 'info')
      setMode('focus')
      setRemainingMs(FOCUS_MS)
      setEndTime(null)
    }
  }, [mode, selectedSubject])

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.35)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.35 + 0.3)
        osc.start(ctx.currentTime + i * 0.35)
        osc.stop(ctx.currentTime + i * 0.35 + 0.3)
      }
    } catch (_) {}
    // browser notification
    if (Notification.permission === 'granted') {
      new Notification('Focus Timer', {
        body: mode === 'focus' ? 'Focus session complete!' : 'Break time over!',
      })
    }
  }

  function showNotif(msg, type) {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  function handleStart() {
    if (!selectedSubject && mode === 'focus') {
      showNotif('Select a subject first!', 'warn')
      return
    }
    if (Notification.permission === 'default') Notification.requestPermission()
    const et = Date.now() + remainingMs
    setEndTime(et)
    setRunning(true)
  }

  function handlePause() {
    setRunning(false)
    setEndTime(null)
  }

  function handleReset() {
    setRunning(false)
    setEndTime(null)
    setMode('focus')
    setRemainingMs(FOCUS_MS)
  }

  async function handleAddSubject(e) {
    e.preventDefault()
    if (!newSubject.trim()) return
    try {
      const s = await api.createSubject(newSubject.trim())
      setSubjects(prev => [...prev, s])
      setSelectedSubject(String(s.id))
      setNewSubject('')
      setShowAddSubject(false)
    } catch (e) {
      showNotif(e.message, 'warn')
    }
  }

  async function handleDeleteSubject(id) {
    await api.deleteSubject(id)
    setSubjects(prev => prev.filter(s => s.id !== id))
    if (selectedSubject === String(id)) setSelectedSubject('')
  }

  function handleBgImage(e) {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setBgImage(url)
  }

  const bgStyle = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : bg.startsWith('linear') || bg.startsWith('radial')
      ? { background: bg }
      : { backgroundColor: bg }

  const dashoffset = CIRC * (1 - progress)
  const ringColor = mode === 'focus' ? 'var(--cyan)' : 'var(--lime)'

  return (
    <div className="timer-root" style={bgStyle}>
      <div className="timer-overlay" />

      {notification && (
        <div className={`timer-notif timer-notif--${notification.type}`}>
          {notification.msg}
        </div>
      )}

      <div className="timer-layout">
        {/* ── Left: Timer ───────────────────────────── */}
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
                style={{
                  strokeDasharray: CIRC,
                  strokeDashoffset: dashoffset,
                  stroke: ringColor,
                }}
              />
            </svg>
            <div className="timer-display">
              <span className="timer-digits">{formatTime(remainingMs)}</span>
              <span className="timer-sublabel">{mode === 'focus' ? 'minutes left' : 'break'}</span>
            </div>
          </div>

          <div className="timer-controls">
            {!running ? (
              <button className="btn btn-lg btn-cyan" onClick={handleStart}>
                ▶ {remainingMs === (mode === 'focus' ? FOCUS_MS : BREAK_MS) ? 'Start' : 'Resume'}
              </button>
            ) : (
              <button className="btn btn-lg btn-pink" onClick={handlePause}>⏸ Pause</button>
            )}
            <button className="btn btn-ghost" onClick={handleReset}>↺ Reset</button>
          </div>
        </div>

        {/* ── Right: Subject + BG ───────────────────── */}
        <div className="timer-right">
          {/* Subject selector */}
          <div className="card timer-subject-card">
            <div className="timer-section-title">Subject</div>
            <select
              className="select"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              disabled={running}
            >
              <option value="">— Select subject —</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div className="subject-list">
              {subjects.map(s => (
                <div key={s.id} className="subject-item">
                  <span>{s.name}</span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleDeleteSubject(s.id)}
                    title="Delete subject"
                  >✕</button>
                </div>
              ))}
            </div>

            {showAddSubject ? (
              <form className="subject-add-form" onSubmit={handleAddSubject}>
                <input
                  className="input"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="New subject name..."
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-sm btn-cyan">Add</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowAddSubject(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <button className="btn btn-sm btn-ghost" onClick={() => setShowAddSubject(true)}>+ Add Subject</button>
            )}
          </div>

          {/* Background picker */}
          <div className="card">
            <div className="timer-section-title">Background</div>
            <div className="bg-presets">
              {BG_PRESETS.map(p => (
                <button
                  key={p.label}
                  className={'bg-swatch' + (bg === p.value && !bgImage ? ' active' : '')}
                  style={p.value.startsWith('linear') ? { background: p.value } : { backgroundColor: p.value }}
                  onClick={() => { setBg(p.value); setBgImage(null) }}
                  title={p.label}
                />
              ))}
            </div>
            <label className="btn btn-sm btn-ghost" style={{ width: '100%', marginTop: 10, cursor: 'pointer' }}>
              📷 Upload Photo
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgImage} />
            </label>
            {bgImage && (
              <button className="btn btn-sm btn-ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => setBgImage(null)}>
                ✕ Remove Photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
