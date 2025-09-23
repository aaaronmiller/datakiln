import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import MainLayout from './components/core/MainLayout'
import Dashboard from './pages/Dashboard'
import Workflows from './pages/Workflows'
import WorkflowEditor from './components/workflow/WorkflowEditor'
import Runs from './pages/Runs'
import Results from './pages/Results'
import Selectors from './pages/Selectors'
import Templates from './pages/Templates'
import Transcript from './pages/Transcript'
import Extension from './pages/Extension'
import Settings from './pages/Settings'
import CommandPalette from './pages/CommandPalette'

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MainLayout>
        <Routes>
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workflows"
            element={
              <ProtectedRoute>
                <Workflows />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workflows/new"
            element={
              <ProtectedRoute>
                <WorkflowEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workflows/:id/edit"
            element={
              <ProtectedRoute>
                <WorkflowEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/runs"
            element={
              <ProtectedRoute>
                <Runs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            }
          />
          <Route
            path="/selectors-lab"
            element={
              <ProtectedRoute>
                <Selectors />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transcript-analysis"
            element={
              <ProtectedRoute>
                <Transcript />
              </ProtectedRoute>
            }
          />
          <Route
            path="/extension-capture"
            element={
              <ProtectedRoute>
                <Extension />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/command-palette"
            element={
              <ProtectedRoute>
                <CommandPalette />
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  )
}

export default App