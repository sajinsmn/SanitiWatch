import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/Layout.css';
import './LoginPage.css';
import './HomePage.css';

const ContactUsPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    recipientType: 'general' // 'general', 'management', 'admin'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Apply input filters
    if (name === 'name') {
      const lettersOnly = value.replace(/[^A-Za-z\s]/g, '');
      setFormData({ ...formData, [name]: lettersOnly });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validations
    if (formData.name && !/^[A-Za-z\s]+$/.test(formData.name)) {
      setMessage('Name must contain only alphabets and spaces');
      setLoading(false);
      return;
    }
    if (!formData.email.includes('@')) {
      setMessage('Email must contain @ symbol');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/contact`, formData, {
        headers: { 'Content-Type': 'application/json' }
      });
      setMessage('Thank you for your message! We will get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '', recipientType: 'general' });
    } catch (err) {
      console.error('Contact submit error:', err?.response?.status, err?.response?.data || err?.message);
      setMessage(err.response?.data?.message || `Failed to send message. Please try again`);
    } finally {
      setLoading(false);
    }
  };

  const getDashboardLink = () => {
    const u = JSON.parse(localStorage.getItem('user')) || {};
    if (!u) return '/auth';
    switch (u.role) {
      case 'admin':
        return '/admin';
      case 'management':
        return '/management';
      case 'worker':
        return '/worker';
      case 'user':
        return '/user';
      default:
        return '/';
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="login-page-wrapper" style={{ display: 'block' }}>
      <div style={{ paddingTop: '1rem', marginBottom: '2rem' }}>
        <nav className="container nav-bar" style={{ maxWidth: '1200px' }}>
          <Link to="/" className="saniti-logo hero-logo">
            SanitiWatch
          </Link>
          <div id="navLinks" className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <Link to="/">Home</Link>
            <Link to="/report">Report</Link>
            <Link to="/status">Status</Link>
            {JSON.parse(localStorage.getItem('user')) ? (
              <>
                <Link to={getDashboardLink()}>Dashboard</Link>
                <Link to="/profile">Profile</Link>
                <button 
                  onClick={handleLogout} 
                  className="hero-button logout-button" 
                  style={{ 
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    color: 'white'
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/auth" className="hero-button">Login</Link>
            )}
          </div>
        </nav>
      </div>
      
      <div className="login-form-container" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2>Contact Us</h2>
          <p style={{ color: '#d1d5db', fontSize: '0.875rem' }}>Get in touch with our team</p>
        </div>

        {message && (
          <div style={{ 
            color: message.includes('Thank you') ? '#10b981' : '#ef4444', 
            marginBottom: '1rem',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            background: message.includes('Thank you') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${message.includes('Thank you') ? '#10b981' : '#ef4444'}`
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              className="form-input" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              placeholder="Enter your full name"
              pattern="[A-Za-z\s]+"
              title="Use alphabets and spaces only"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              className="form-input" 
              name="email" 
              value={formData.email} 
              onChange={handleChange}
              required
              placeholder="Enter your email address"
              pattern=".+@.+"
              title="Email must include @ symbol"
            />
          </div>

          <div className="form-group">
            <label>Subject</label>
            <input 
              className="form-input" 
              name="subject" 
              value={formData.subject} 
              onChange={handleChange}
              required
              placeholder="What is this about?"
            />
          </div>

          <div className="form-group">
            <label>Send to</label>
            <select 
              className="form-input" 
              name="recipientType" 
              value={formData.recipientType} 
              onChange={handleChange}
              required
            >
              <option value="general">General Support</option>
              <option value="management">Management Team</option>
              <option value="admin">Administration</option>
            </select>
          </div>

          <div className="form-group">
            <label>Message</label>
            <textarea 
              className="form-input" 
              name="message" 
              value={formData.message} 
              onChange={handleChange} 
              rows="5" 
              required 
              placeholder="Tell us how we can help you..."
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.25rem' }}>Other Ways to Reach Us</h3>
          <div style={{ color: '#d1d5db', fontSize: '0.875rem', lineHeight: '1.6' }}>
            <p><strong>Email:</strong> cb.sc.p2cse25031@cb.students.amrita.edu</p>
            <p><strong>Email:</strong> cb.sc.p2cse25014@cb.students.amrita.edu</p>
            <p><strong>Email:</strong> cb.sc.p2cse25041@cb.students.amrita.edu</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUsPage;
