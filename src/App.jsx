import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login            from './pages/Login'
import Register         from './pages/Register'
import AdopterFeed      from './pages/AdopterFeed'
import Onboarding       from './pages/Onboarding'
import ShelterDashboard from './pages/ShelterDashboard'
import ShelterMeetings  from './pages/ShelterMeetings'
import Matches          from './pages/Matches'

// Route guard: redirects unauthenticated users to /login
function PrivateRoute({ children, requiredRole, requirePreferences }) {
  const { user, profile, preferencesReady, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // If a specific role is required, redirect wrong-role users to their home
  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={profile?.role === 'shelter' ? '/shelter' : '/feed'} replace />
  }

  // Adopters must complete the match questionnaire before seeing the feed
  if (requirePreferences && profile?.role === 'adopter' && !preferencesReady) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

// Root redirect based on auth + role
function RootRedirect() {
  const { user, profile, preferencesReady, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/register" replace />
  if (profile?.role === 'shelter') return <Navigate to="/shelter" replace />
  return <Navigate to={preferencesReady ? '/feed' : '/onboarding'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"          element={<RootRedirect />} />
      <Route path="/login"     element={<Login />} />
      <Route path="/register"  element={<Register />} />

      <Route path="/onboarding" element={
        <PrivateRoute requiredRole="adopter">
          <Onboarding />
        </PrivateRoute>
      } />

      <Route path="/feed" element={
        <PrivateRoute requiredRole="adopter" requirePreferences>
          <AdopterFeed />
        </PrivateRoute>
      } />

      <Route path="/shelter" element={
        <PrivateRoute requiredRole="shelter">
          <ShelterDashboard />
        </PrivateRoute>
      } />

      <Route path="/shelter/meetings" element={
        <PrivateRoute requiredRole="shelter">
          <ShelterMeetings />
        </PrivateRoute>
      } />

      <Route path="/matches" element={
        <PrivateRoute>
          <Matches />
        </PrivateRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
