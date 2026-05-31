import { useState } from 'react'
import { useTimer, GRADIENT_PRESETS, PHOTO_PRESETS } from '../context/TimerContext'
import './TimerPanel.css'

export default function TimerPanel() {
  const {
    subjects, handleAddSubject, handleDeleteSubject, showNotif,
    bg, customBg,
    handleBgUpload, handleRemoveCustomBg, selectCustomBg, selectPhotoBg, selectGradient,
    resetAll,
  } = useTimer()

  const [newSubject, setNewSubject] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function onAdd(e) {
    e.preventDefault()
    if (!newSubject.trim()) return
    try {
      await handleAddSubject(newSubject.trim())
      setNewSubject(''); setShowForm(false)
    } catch (err) {
      showNotif(err.message, 'warn')
    }
  }

  function onReset() {
    if (window.confirm('모든 데이터(과목, 세션 기록)를 초기화할까요?\n이 작업은 되돌릴 수 없습니다.')) {
      resetAll()
    }
  }

  return (
    <div className="timer-panel">
      {/* Subjects */}
      <section className="panel-section">
        <div className="panel-section-title">Subjects</div>
        <div className="panel-subject-list">
          {subjects.map(s => (
            <div key={s.id} className="panel-subject-item">
              <span>{s.name}</span>
              <button className="panel-delete-btn" onClick={() => handleDeleteSubject(s.id)}>✕</button>
            </div>
          ))}
        </div>

        {showForm ? (
          <form className="panel-add-form" onSubmit={onAdd}>
            <input
              className="panel-input"
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              placeholder="Subject name..."
              autoFocus
            />
            <div className="panel-add-actions">
              <button type="submit" className="panel-btn-primary">Add</button>
              <button type="button" className="panel-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button className="panel-btn-ghost panel-add-trigger" onClick={() => setShowForm(true)}>
            + Add Subject
          </button>
        )}
      </section>

      {/* Background */}
      <section className="panel-section">
        <div className="panel-section-title">Background</div>

        <div className="panel-bg-label">Photos</div>
        <div className="panel-photo-row">
          {/* Preset photos */}
          {PHOTO_PRESETS.map(p => (
            <button
              key={p.label}
              className={'panel-photo-thumb' + (bg === p.src ? ' active' : '')}
              style={{ backgroundImage: `url(${p.src})` }}
              onClick={() => selectPhotoBg(p.src)}
              title={p.label}
            />
          ))}

          {/* User-uploaded photo thumbnail */}
          {customBg && (
            <div className="panel-photo-custom-wrap">
              <button
                className={'panel-photo-thumb' + (bg === '__custom__' ? ' active' : '')}
                style={{ backgroundImage: `url(${customBg})` }}
                onClick={selectCustomBg}
                title="My photo"
              />
              <button className="panel-photo-remove" onClick={handleRemoveCustomBg} title="Remove">✕</button>
            </div>
          )}

          {/* Upload button */}
          <label className="panel-photo-upload" title="Upload photo">
            <span>+</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files[0] && handleBgUpload(e.target.files[0])}
            />
          </label>
        </div>

        <div className="panel-bg-label" style={{ marginTop: 16 }}>Colors</div>
        <div className="panel-gradient-row">
          {GRADIENT_PRESETS.map(p => (
            <button
              key={p.label}
              className={'panel-gradient-swatch' + (bg === p.value ? ' active' : '')}
              style={{ background: p.value }}
              onClick={() => selectGradient(p.value)}
              title={p.label}
            />
          ))}
        </div>
      </section>

      {/* Reset all */}
      <button className="panel-reset-btn" onClick={onReset}>
        ↺ Reset All Data
      </button>
    </div>
  )
}
