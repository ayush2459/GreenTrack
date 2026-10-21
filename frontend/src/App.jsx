import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Records from './pages/Records'
import Ingest from './pages/Ingest'
import AuditLog from './pages/AuditLog'
import Reports from './pages/Reports'
import Recommendations from './pages/Recommendations'
function ProtectedRoute({ children }) { const { user, loading } = useAuth(); if (loading) return <div className="screen-loading"><span className="spinner"/>Preparing your workspace…</div>; if (!user) return <Navigate to="/login" replace />; return <Layout>{children}</Layout> }
function AppRoutes(){const {user,loading}=useAuth();if(loading)return <div className="screen-loading"><span className="spinner"/>Preparing your workspace…</div>;return <Routes><Route path="/login" element={user?<Navigate to="/" replace/>:<Login/>}/><Route path="/" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/><Route path="/records" element={<ProtectedRoute><Records/></ProtectedRoute>}/><Route path="/ingest" element={<ProtectedRoute><Ingest/></ProtectedRoute>}/><Route path="/audit" element={<ProtectedRoute><AuditLog/></ProtectedRoute>}/><Route path="/reports" element={<ProtectedRoute><Reports/></ProtectedRoute>}/><Route path="/recommendations" element={<ProtectedRoute><Recommendations/></ProtectedRoute>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}
export default function App(){return <BrowserRouter><AuthProvider><AppRoutes/></AuthProvider></BrowserRouter>}
