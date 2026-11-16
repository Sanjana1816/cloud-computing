import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { isConfigured } from './lib/firebase'
import { RequireRole, FullScreenLoader } from './components/ui'
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import SetupNeeded from './pages/SetupNeeded'

// Map-heavy pages are code-split so the landing page loads fast from the CDN.
const PassengerMap = lazy(() => import('./pages/PassengerMap'))
const DriverConsole = lazy(() => import('./pages/DriverConsole'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

export default function App() {
  if (!isConfigured) return <SetupNeeded />
  return (
    <Suspense fallback={<FullScreenLoader label="Loading…" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/map" element={<RequireRole roles={['passenger', 'driver']}><PassengerMap /></RequireRole>} />
        <Route path="/driver" element={<RequireRole roles={['driver']}><DriverConsole /></RequireRole>} />
        <Route path="/admin" element={<RequireRole roles={['admin']}><AdminPanel /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
