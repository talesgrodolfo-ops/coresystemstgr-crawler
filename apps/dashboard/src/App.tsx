import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './Layout'
import { getAdminKey } from './api'
import LoginGate from './pages/LoginGate'
import OverviewPage from './pages/OverviewPage'
import TargetsPage from './pages/TargetsPage'
import ResultsPage from './pages/ResultsPage'
import FailuresPage from './pages/FailuresPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const [authed, setAuthed] = useState(!!getAdminKey())

  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="targets" element={<TargetsPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="failures" element={<FailuresPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
