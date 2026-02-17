import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import './App.css';

function App() {
  // VULNERABILITY: Sensitive data stored in localStorage
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    // VULNERABILITY: JWT token stored in localStorage (XSS vulnerability)
    return localStorage.getItem('token');
  });

  useEffect(() => {
    if (user) {
      // VULNERABILITY: Storing sensitive user data in localStorage
      localStorage.setItem('user', JSON.stringify(user));
    }
    if (token) {
      localStorage.setItem('token', token);
    }
  }, [user, token]);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <nav>
            <h1>🛒 VulnShop</h1>
            <div className="nav-links">
              <Link to="/products">Products</Link>
              {user ? (
                <>
                  <Link to="/orders">Orders</Link>
                  <Link to="/profile">Profile</Link>
                  <button onClick={handleLogout}>Logout ({user.username})</button>
                </>
              ) : (
                <>
                  <Link to="/login">Login</Link>
                  <Link to="/register">Register</Link>
                </>
              )}
            </div>
          </nav>
          {/* VULNERABILITY: Exposing API key in frontend code */}
          <div style={{ display: 'none' }}>
            API_KEY: {process.env.REACT_APP_GOOGLE_MAPS_KEY}
          </div>
        </header>

        <main className="App-main">
          <Routes>
            <Route path="/" element={<Navigate to="/products" />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/products" element={<Products user={user} token={token} />} />
            <Route path="/orders" element={user ? <Orders user={user} token={token} /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile user={user} token={token} onLogout={handleLogout} /> : <Navigate to="/login" />} />
          </Routes>
        </main>

        <footer className="App-footer">
          <p>⚠️ VulnShop - Intentionally Vulnerable Application for Security Testing</p>
          <p>DO NOT use in production or on public networks</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
