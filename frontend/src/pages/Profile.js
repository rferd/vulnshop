import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

function Profile({ user, token, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    role: user.role
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      // VULNERABILITY: User can modify their own role to admin
      const response = await axios.put(
        `${API_URL}/users/profile/${user.id}`,
        formData
      );

      setMessage('Profile updated successfully!');
      setEditing(false);
      
      // Update local storage with new data
      const updatedUser = { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="profile-container">
      <h2>User Profile</h2>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="profile-info">
        {!editing ? (
          <>
            <div className="profile-field">
              <label>User ID</label>
              <div className="value">{user.id}</div>
            </div>
            <div className="profile-field">
              <label>Username</label>
              <div className="value">{user.username}</div>
            </div>
            <div className="profile-field">
              <label>Email</label>
              <div className="value">{user.email}</div>
            </div>
            <div className="profile-field">
              <label>Role</label>
              <div className="value">{user.role}</div>
            </div>
            {/* VULNERABILITY: Exposing JWT token in UI */}
            <div className="profile-field">
              <label>Authentication Token</label>
              <div className="value" style={{ wordBreak: 'break-all', fontSize: '12px', fontFamily: 'monospace' }}>
                {token}
              </div>
            </div>
            <button 
              onClick={() => setEditing(true)}
              className="btn-primary"
              style={{ marginTop: '20px' }}
            >
              Edit Profile
            </button>
          </>
        ) : (
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="text"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            {/* VULNERABILITY: Allowing users to change their own role */}
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
              <button 
                type="button"
                onClick={() => setEditing(false)}
                style={{ flex: 1, padding: '12px', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button 
          onClick={onLogout}
          style={{ padding: '12px 30px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
        >
          Logout
        </button>
      </div>

      {/* VULNERABILITY: Exposing sensitive information in comments */}
      {/* API Key: AIzaSyVulnerableKeyExample123 */}
      {/* Database connection: postgres://vulnshop:vulnerable123@localhost:5432/vulnshop */}
    </div>
  );
}

export default Profile;
