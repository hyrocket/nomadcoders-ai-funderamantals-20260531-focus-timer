import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { api } from '../api'

export const FOCUS_MINS = 25
export const BREAK_MINS = 5
export const FOCUS_MS = FOCUS_MINS * 60 * 1000
export const BREAK_MS = BREAK_MINS * 60 * 1000
const LS_KEY = 'focusTimer'
const LS_BG_KEY = 'focusTimer_bgImage'

export const GRADIENT_PRESETS = [
  { label: 'Night',  value: 'linear-gradient(145deg,#0d0d14,#12101e)' },
  { label: 'Ocean',  value: 'linear-gradient(145deg,#0a1628,#0d2240)' },
  { label: 'Forest', value: 'linear-gradient(145deg,#0a1a0f,#0d2818)' },
  { label: 'Dusk',   value: 'linear-gradient(145deg,#1a0f28,#120a1e)' },
  { label: 'Ember',  value: 'linear-gradient(145deg,#1a0f0a,#280d08)' },
]

export const PHOTO_PRESETS = [
  { label: 'Sunset', src: './wallpapers/sunset.jpg' },
  { label: 'Field',  src: './wallpapers/field.jpg' },
  { label: 'Ship',   src: './wallpapers/ship.jpg' },
]

export function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null }
}

const TimerContext = createContext(null)

export function TimerProvider({ children }) {
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [mode, setMode] = useState('focus')
  const [running, setRunning] = useState(false)
  const [remainingMs, setRemainingMs] = useState(FOCUS_MS)
  const [endTime, setEndTime] = useState(null)
  const [bg, setBg] = useState(GRADIENT_PRESETS[0].value)
  const [customBg, setCustomBg] = useState(null)
  const [notification, setNotification] = useState(null)

  const intervalRef = useRef(null)
  // refs to avoid stale closure in interval
  const modeRef = useRef(mode)
  const subjectRef = useRef(selectedSubject)
  const remainingRef = useRef(remainingMs)
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { subjectRef.current = selectedSubject }, [selectedSubject])
  useEffect(() => { remainingRef.current = remainingMs }, [remainingMs])

  const R = 120
  const CIRC = 2 * Math.PI * R
  const totalMs = mode === 'focus' ? FOCUS_MS : BREAK_MS
  const progress = 1 - remainingMs / totalMs
  const dashoffset = CIRC * (1 - progress)
  const ringColor = mode === 'focus' ? '#6c8ef5' : '#4ade80'

  const selectedSubjectName = subjects.find(s => String(s.id) === selectedSubject)?.name || null

  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(console.error)
  }, [])

  // restore localStorage on mount
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

  // tab title
  useEffect(() => {
    document.title = running
      ? `${formatTime(remainingMs)} — ${mode === 'focus' ? '🎯' : '☕'}`
      : 'Focus Timer'
  }, [running, remainingMs, mode])

  // persist
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ mode, running, endTime, remainingMs, selectedSubject, bg }))
  }, [mode, running, endTime, remainingMs, selectedSubject, bg])

  function showNotif(msg, type) {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

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
      new Notification('Focus Timer', {
        body: modeRef.current === 'focus' ? 'Session complete!' : 'Break over!',
      })
    }
  }

  function handleTimerEnd() {
    const currentMode = modeRef.current
    const currentSubject = subjectRef.current
    playBeep()
    if (currentMode === 'focus') {
      showNotif('Focus session complete!', 'success')
      if (currentSubject) {
        api.createSession(parseInt(currentSubject), FOCUS_MINS).catch(console.error)
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
  }

  function handleStart() {
    if (!subjectRef.current && modeRef.current === 'focus') {
      showNotif('Select a subject first!', 'warn'); return
    }
    if (Notification.permission === 'default') Notification.requestPermission()
    setEndTime(Date.now() + remainingRef.current); setRunning(true)
  }

  function handlePause() { setRunning(false); setEndTime(null) }

  function handleReset() {
    setRunning(false); setEndTime(null); setMode('focus'); setRemainingMs(FOCUS_MS)
  }

  async function handleAddSubject(name) {
    const s = await api.createSubject(name.trim())
    setSubjects(prev => [...prev, s])
    setSelectedSubject(String(s.id))
    return s
  }

  async function handleDeleteSubject(id) {
    await api.deleteSubject(id)
    setSubjects(prev => prev.filter(s => s.id !== id))
    if (selectedSubject === String(id)) setSelectedSubject('')
  }

  // customBg = stored base64 (persists). bg = active choice.
  // bg === '__custom__' means use customBg as background.
  function handleBgUpload(file) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data64 = ev.target.result
      try { localStorage.setItem(LS_BG_KEY, data64) } catch (_) {
        showNotif('Image too large to save.', 'warn')
      }
      setCustomBg(data64)
      setBg('__custom__')
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveCustomBg() {
    localStorage.removeItem(LS_BG_KEY)
    setCustomBg(null)
    setBg(GRADIENT_PRESETS[0].value)
  }

  function selectCustomBg() { setBg('__custom__') }

  function selectPhotoBg(src) { setBg(src) }

  function selectGradient(value) { setBg(value) }

  async function resetAll() {
    try {
      await api.resetAll()
      // reload subjects
      const subs = await api.getSubjects()
      setSubjects(subs)
      setSelectedSubject('')
      // reset timer
      setRunning(false); setEndTime(null); setMode('focus'); setRemainingMs(FOCUS_MS)
      // clear bg
      localStorage.removeItem(LS_BG_KEY)
      localStorage.removeItem(LS_KEY)
      setCustomBg(null); setBg(GRADIENT_PRESETS[0].value)
      showNotif('All data reset.', 'info')
    } catch (e) {
      showNotif('Reset failed.', 'warn')
    }
  }

  const bgStyle = (() => {
    if (bg === '__custom__' && customBg)
      return { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    if (bg.startsWith('./'))
      return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    return { background: bg }
  })()

  return (
    <TimerContext.Provider value={{
      subjects, selectedSubject, setSelectedSubject, selectedSubjectName,
      mode, running, remainingMs,
      handleStart, handlePause, handleReset,
      handleAddSubject, handleDeleteSubject,
      bg, customBg,
      handleBgUpload, handleRemoveCustomBg, selectCustomBg, selectPhotoBg, selectGradient,
      bgStyle, notification, showNotif,
      R, CIRC, dashoffset, ringColor, progress,
      resetAll,
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  return useContext(TimerContext)
}
