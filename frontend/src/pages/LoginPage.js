import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css'; // <-- 1. IMPORT THE NEW CSS FILE

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Send request to your backend's /api/login endpoint
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/login`, {
        username,
        password
      });

      const { user, token } = response.data;
      alert(`Login successful! Welcome ${user.username}. You are a ${user.role}.`);
      
      // Save auth in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect based on role and registration status
      if (user.role === 'worker' && !user.registrationComplete) {
        navigate('/worker-registration');
      } else if (user.role === 'user' && !user.registrationComplete) {
        navigate('/user-registration');
      } else if (user.role === 'worker') {
        navigate('/worker');
      } else if (user.role === 'admin' && !user.registrationComplete) {
        navigate('/admin-registration');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'management' && !user.registrationComplete) {
        navigate('/management-registration');
      } else if (user.role === 'management') {
        navigate('/management');
      } else {
        navigate('/user');
      }

    } catch (error) {
      console.error('Login error:', error.response.data.message);
      alert('Error: ' + error.response.data.message);
    }
  };

  return (
    // 2. ADD THIS WRAPPER DIV
    <div className="login-page-wrapper"> 
      <form className="login-form-container" onSubmit={handleSubmit}> {/* 3. RENAME THIS CLASS */}
        <h2>Login</h2>
        
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
        
        <button type="submit" className="submit-button">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;