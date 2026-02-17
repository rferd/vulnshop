import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// VULNERABILITY: API URL exposed in frontend code
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // VULNERABILITY: Client-side only validation
    // No actual validation, just checks if fields are not empty
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      // VULNERABILITY: Sending credentials over HTTP (if API_URL is http://)
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });

      if (response.data.token) {
        // VULNERABILITY: Storing sensitive data in memory and passing to parent
        onLogin(response.data.user, response.data.token);
        navigate('/products');
      }
    } catch (err) {
      // VULNERABILITY: Exposing detailed error messages from backend
      setError(err.response?.data?.error || err.response?.data?.hint || 'Login failed');
    }
  };

  return (
    <div className="form-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          {/* VULNERABILITY: No input sanitization */}
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          {/* VULNERABILITY: No password strength requirements */}
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn-primary">Login</button>
        {error && <div className="error-message">{error}</div>}
      </form>
      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        Don't have an account? <a href="/register">Register</a>
      </p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <strong>Test Accounts:</strong><br />
        Username: admin, Password: admin123<br />
        Username: user1, Password: password123
      </div>
    </div>
  );
}

export default Login;
