import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
  const PrivateRoute = ({ children, allowedRole }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || !role) {
      localStorage.clear();
      return <Navigate to="/login" replace />;
    }

    if (allowedRole && role !== allowedRole) {
      return <Navigate to={`/${role}-dashboard`} replace />;
    }

    return children;
  };

  const LoginRedirect = () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || !role) {
      localStorage.clear();
      return <Login />;
    }

    return <Navigate to={`/${role}-dashboard`} replace />;
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Protected Routes */}
          <Route
            path="/user-dashboard"
            element={
              <PrivateRoute allowedRole="user">
                <UserDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <PrivateRoute allowedRole="admin">
                <AdminDashboard />
              </PrivateRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
