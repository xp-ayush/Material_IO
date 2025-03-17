import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './Login.css';
import Notification from './Notification';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaTruck } from 'react-icons/fa';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [status, setStatus] = useState({
    loading: false,
    error: null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      navigate(role === 'admin' ? '/admin-dashboard' : '/user-dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value.trim()
    }));
    // Clear error when user starts typing
    if (status.error) {
      setStatus(prev => ({ ...prev, error: null }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.email || !formData.password) {
      setStatus({
        loading: false,
        error: 'Please fill in all fields'
      });
      addNotification('Please fill in all fields', 'error');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setStatus({
        loading: false,
        error: 'Please enter a valid email address'
      });
      addNotification('Please enter a valid email address', 'error');
      return;
    }

    setStatus({ loading: true, error: null });

    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, formData);
      
      const { token, role, name } = response.data;
      
      // Store user info in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('userName', name);
      localStorage.setItem('showLoginSuccess', 'true');
      
      // Show success notification
      addNotification(`${role === 'admin' ? 'Admin' : 'User'} logged in successfully`, 'success');
      
      // Redirect based on role after a short delay to show notification
      setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate('/user-dashboard');
        }
      }, 1000);
    } catch (error) {
      console.error('Login error:', error.response || error);
      setStatus({
        loading: false,
        error: error.response?.data?.message || 'Failed to login. Please check your credentials and try again.'
      });
      
      addNotification(error.response?.data?.message || 'Failed to login', 'error');
      
      // Clear password on error
      setFormData(prev => ({
        ...prev,
        password: ''
      }));
    }
  };

  return (
    <div className="login-container">
      <div className="notifications-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
      <div className="login-box">
        <div className="login-header">
          <FaTruck className="company-logo" />
          <h2>Welcome Back</h2>
          <p>Please sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <div className="input-icon">
              <FaEnvelope />
            </div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <div className="input-icon">
              <FaLock />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
              tabIndex="-1"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {status.error && (
            <div className="error-message">
              {status.error}
            </div>
          )}
          <button
            type="submit"
            className={`login-button ${status.loading ? 'loading' : ''}`}
            disabled={status.loading}
          >
            {status.loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
