import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useTimer, formatTime, FOCUS_MS, BREAK_MS } from '../context/TimerContext'
import './TimerLeft.css'

export default function TimerLeft() {
  const {
    subjects, selectedSubject, setSelectedSubject, selectedSubjectName,
    mode, running, remainingMs,
    handleStart, handlePause, handleReset,
    R, CIRC, dashoffset, ringColor,
  } = useTimer()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const isStart = remainingMs === (mode === 'focus' ? FOCUS_MS : BREAK_MS)

  return (
    <div className="timer-left">
      {/* Subject badge dropdown — 안 A */}
      <div className="subject-badge-wrap" ref={dropdownRef}>
        <button
          className="subject-badge"
          onClick={() => setDropdownOpen(v => !v)}
          title="Click to change subject"
        >
          <span>{mode === 'focus' ? '🎯' : '☕'}</span>
          <span className="subject-badge-name">
            {selectedSubjectName || 'Select subject'}
          </span>
          <span className={'badge-chevron' + (dropdownOpen ? ' open' : '')}>›</span>
        </button>

        {dropdownOpen && (
          <div className="subject-dropdown">
            {subjects.length === 0 && (
              <div className="subject-dropdown-empty">No subjects yet</div>
            )}
            {subjects.map(s => (
              <button
                key={s.id}
                className={'subject-option' + (selectedSubject === String(s.id) ? ' selected' : '')}
                onClick={() => { setSelectedSubject(String(s.id)); setDropdownOpen(false) }}
              >
                <span className="subject-option-check">
                  {selectedSubject === String(s.id) ? '✓' : ''}
                </span>
                {s.name}
              </button>
            ))}
            <div className="subject-dropdown-divider" />
            <NavLink
              to="/"
              className="subject-manage-link"
              onClick={() => setDropdownOpen(false)}
            >
              Manage subjects →
            </NavLink>
          </div>
        )}
      </div>

      {/* Circle timer */}
      <div className="timer-circle-wrap">
        <svg className="timer-svg" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r={R} className="timer-track" />
          <circle
            cx="150" cy="150" r={R}
            className="timer-progress"
            style={{ strokeDasharray: CIRC, strokeDashoffset: dashoffset, stroke: ringColor }}
          />
        </svg>
        <div className="timer-display">
          <span className="timer-digits">{formatTime(remainingMs)}</span>
          <span className="timer-sublabel">
            {mode === 'focus' ? 'minutes left' : 'break'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="timer-controls">
        {!running
          ? <button className="btn-start" onClick={handleStart}>
              {isStart ? 'Start' : 'Resume'}
            </button>
          : <button className="btn-pause" onClick={handlePause}>Pause</button>
        }
        <button className="btn-reset" onClick={handleReset}>Reset</button>
      </div>
    </div>
  )
}
