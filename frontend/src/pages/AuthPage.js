import React, { useState, useRef, useEffect } from 'react'; // <-- Added useRef and useEffect
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom'; // <-- Added Link
import './HomePage.css'; // <-- Uses HomePage CSS

function AuthPage() {
  // State for toggling
  const [isLoginMode, setIsLoginMode] = useState(true);

  // State for form inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reEnterPassword, setReEnterPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // State for warmup loading
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  // Ref for header (optional, mainly if you add scroll effects later)
  const mainHeaderRef = useRef(null); // <-- Added Ref

  // For navigation
  const navigate = useNavigate();

  // Warm up server function
  const warmUpServer = async () => {
    try {
      setIsWarmingUp(true);
      await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/warmup`);
      console.log("Backend warmed up");
    } catch (e) {
      console.log("Warm up failed");
    } finally {
      setIsWarmingUp(false);
    }
  };

  // Warm up backend when AuthPage loads
  useEffect(() => {
    warmUpServer();
  }, []);

  // --- Login Handler ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    // Warm up server before login
    await warmUpServer();
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/login`, {
        username,
        password
      });
      const { user, token } = response.data;

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('authToken', token);

      // Redirect based on role and registration status
      if (!user.registrationComplete) {
        // Redirect to appropriate registration page if phone number or other details are missing
        if (user.role === 'worker') {
          navigate('/worker-registration');
        } else if (user.role === 'admin') {
          navigate('/admin-registration');
        } else if (user.role === 'management') {
          navigate('/management-registration');
        } else if (user.role === 'user') {
          navigate('/user-registration');
        } else {
          navigate('/');
        }
      } else {
        // Redirect to appropriate dashboard if registration is complete
        if (user.role === 'admin') {
          navigate('/admin');
        } else if (user.role === 'management') {
          navigate('/management');
        } else if (user.role === 'worker') {
          navigate('/worker');
        } else if (user.role === 'user') {
          navigate('/user');
        } else {
          navigate('/');
        }
      }

    } catch (error) {
      console.error('Login error:', error.response?.data?.message || error.message);
      alert('Login Error: ' + (error.response?.data?.message || 'Server error'));
    }
  };

  // --- Signup Handler ---
  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    // Enhanced validation
    if (!username.trim()) {
      alert('Username is required');
      return;
    }

    if (username.length < 3) {
      alert('Username must be at least 3 characters long');
      return;
    }

    if (!email.trim()) {
      alert('Email is required');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      alert('Please enter a valid email address');
      return;
    }

    if (!phone.trim()) {
      alert('Phone number is required');
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      alert('Phone number must be exactly 10 digits');
      return;
    }

    if (!password) {
      alert('Password is required');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    if (password !== reEnterPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      // Check if username, email, or phone already exists
      const validationResponse = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/validate`, {
        username,
        email,
        phone
      });

      if (!validationResponse.data.valid) {
        alert('Error: ' + validationResponse.data.errors.join(', '));
        return;
      }

      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/signup`, {
        username,
        password,
        email,
        phone,
        role: 'user'
      });
      console.log(response.data.message);
      alert('Sign up successful! Please log in.');
      setIsLoginMode(true); // Switch to login mode
      setUsername('');
      setPassword('');
      setReEnterPassword('');
      setEmail('');
      setPhone('');
    } catch (error) {
      console.error('Signup error:', error.response?.data?.message || error.message);
      alert('Signup Error: ' + (error.response?.data?.message || 'Server error'));
    }
  };

  // --- Toggle Function ---
  const toggleMode = () => {
    setIsLoginMode(prevMode => !prevMode);
    setUsername('');
    setPassword('');
    setReEnterPassword('');
    setEmail('');
    setPhone('');
  };

  return (
    // Use HomePage wrapper class + auth-layout for centering
    <div className="home-page-wrapper auth-layout">

      {/* --- ADDED HEADER --- */}
      <header id="mainHeader" ref={mainHeaderRef} className="home-header"> {/* Removed dynamic classes */}
        <nav className="container nav-bar auth-header-nav"> {/* Added specific class */}
          {/* Link logo back to homepage */}
          <Link to="/" className="saniti-logo hero-logo">
            SanitiWatch
          </Link>
          {/* REMOVED: Navigation links div */}
        </nav>
      </header>
      {/* --- END ADDED HEADER --- */}

      {/* Use hero-card + specific class for form */}
      <form className="hero-card auth-form-specifics" onSubmit={isLoginMode ? handleLoginSubmit : handleSignupSubmit}>

        {/* Use hero-subtitle class for title, adjust size */}
        <h2 className="hero-subtitle" style={{ fontSize: '2rem', marginBottom: '2rem' }}>
          {isLoginMode ? 'Login' : 'Sign Up'}
        </h2>

        {/* Username Input (Shared) - Use form-group */}
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        {/* Email Input (Signup Only) - Use form-group */}
        {!isLoginMode && (
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              pattern=".+@.+"
              title="Email must include @ symbol"
            />
          </div>
        )}

        {/* Phone Input (Signup Only) - Use form-group */}
        {!isLoginMode && (
          <div className="form-group">
            <label>Phone Number:</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhone(digitsOnly);
              }}
              required
              placeholder="Enter 10 digit phone number"
              pattern="\d{10}"
              maxLength={10}
              title="Enter exactly 10 digits"
            />
          </div>
        )}

        {/* Password Input (Shared) - Use form-group */}
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isLoginMode ? "current-password" : "new-password"}
            minLength={isLoginMode ? undefined : 6}
            title={isLoginMode ? undefined : "Password must be at least 6 characters long"}
            placeholder={isLoginMode ? "Enter your password" : "Minimum 6 characters"}
          />
        </div>

        {/* Re-enter Password Input (Signup Only) - Use form-group */}
        {!isLoginMode && (
          <div className="form-group">
            <label>Re-enter Password:</label>
            <input
              type="password"
              value={reEnterPassword}
              onChange={(e) => setReEnterPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        )}

        {/* Submit Button - Use hero-button + specific class */}
        <button 
          type="submit" 
          className="hero-button auth-submit-button"
          disabled={isWarmingUp}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '0.875rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            opacity: isWarmingUp ? 0.6 : 1,
            cursor: isWarmingUp ? 'wait' : 'pointer'
          }}
        >
          {isWarmingUp ? 'Loading...' : (isLoginMode ? 'Login' : 'Sign Up')}
        </button>

        {/* Toggle Button/Link - Needs specific style */}
        <div className="toggle-auth-mode">
          <button 
            type="button" 
            onClick={toggleMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}
          >
            {isLoginMode
              ? "Don't have an account? Sign Up"
              : "Already have an account? Login"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AuthPage;