import { HashRouter, Routes, Route } from 'react-router-dom'
import { TimerProvider } from './context/TimerContext'
import AppLayout from './layouts/AppLayout'
import TimerPanel from './pages/TimerPanel'
import History from './pages/History'
import Dashboard from './pages/Dashboard'
import './App.css'

export default function App() {
  return (
    <TimerProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<TimerPanel />} />
            <Route path="history" element={<History />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </HashRouter>
    </TimerProvider>
  )
}
