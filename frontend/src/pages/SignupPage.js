import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Default role
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form from refreshing the page
    
    try {
      // Send request to your backend's /api/signup endpoint
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/signup`, {
        username,
        password,
        role
      });
      
      console.log(response.data.message);
      alert('Sign up successful! Please log in.');
      navigate('/login');

    } catch (error) {
      console.error('Signup error:', error.response.data.message);
      alert('Error: ' + error.response.data.message);
    }
  };

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <h2>Sign Up</h2>
      <div className="form-group">
        <label>Username:</label>
        <input 
          type="text" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required 
        />
      </div>
      <div className="form-group">
        <label>Password:</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required 
        />
      </div>
      <div className="form-group">
        <label>Role:</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="worker">Worker</option>
          <option value="management">Management</option>
        </select>
      </div>
      <button type="submit" className="submit-button">Sign Up</button>
    </form>
  );
}

export default SignupPage;