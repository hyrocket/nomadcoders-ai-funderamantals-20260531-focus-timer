import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import './App.css'
import Timer from './pages/Timer'
import History from './pages/History'
import Dashboard from './pages/Dashboard'

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">Focus Timer</NavLink>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Timer</NavLink>
        <NavLink to="/history" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>History</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Dashboard</NavLink>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Timer />} />
          <Route path="/history" element={<History />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
