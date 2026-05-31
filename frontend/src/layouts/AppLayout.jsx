import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useTimer } from '../context/TimerContext'
import TimerLeft from '../components/TimerLeft'
import './AppLayout.css'

export default function AppLayout() {
  const { bgStyle, notification } = useTimer()
  const { pathname } = useLocation()
  const isTimerTab = pathname === '/'

  return (
    <div className="app-root">
      <div className="app-bg" style={bgStyle} />
      <div className="app-overlay" />

      <nav className="navbar">
        <span className="navbar-brand">Focus Timer</span>
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Timer</NavLink>
          <NavLink to="/history" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>History</NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Dashboard</NavLink>
        </div>
      </nav>

      {notification && (
        <div className={`toast toast--${notification.type}`}>{notification.msg}</div>
      )}

      <div className={`split-layout ${isTimerTab ? 'layout-center' : 'layout-split'}`}>
        <aside className="split-left">
          <TimerLeft />
        </aside>
        {!isTimerTab && (
          <main className="split-right">
            <Outlet />
          </main>
        )}
        {isTimerTab && (
          <div className="timer-right-panel">
            <Outlet />
          </div>
        )}
      </div>
    </div>
  )
}
