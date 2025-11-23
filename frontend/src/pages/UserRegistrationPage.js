import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/Layout.css';

const UserRegistrationPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    phone: '',
    gender: 'male'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Pre-populate form with existing data
  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.id) {
          const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/profile/user/${user.id}`);
          const data = response.data;
          if (data && Object.keys(data).length > 0) {
            setFormData({
              fullName: data.fullName || '',
              address: data.address || '',
              phone: data.phone || '',
              gender: data.gender || 'male'
            });
          }
        }
      } catch (error) {
        // If no existing data, keep empty form
        console.log('No existing data found');
      }
    };
    
    fetchExistingData();
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } catch {}
    navigate('/auth');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // restrict phone to digits only
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, [name]: digitsOnly });
    } else if (name === 'fullName') {
      // allow letters and spaces only
      const letters = value.replace(/[^A-Za-z\s]/g, '');
      setFormData({ ...formData, [name]: letters });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // validations
    if (!formData.fullName || !formData.address || !formData.phone) {
      setError('Please fill in all required fields including phone number');
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(formData.fullName)) {
      setError('Full Name must contain alphabets and spaces only');
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('authToken');

      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/user/register`, {
        userId: user.id || user._id,
        ...formData
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const updatedUser = { ...user, registrationComplete: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      navigate('/user');
    } catch (err) {
      console.error('User registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page-wrapper">
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100 }}>
        <button 
          onClick={handleLogout} 
          className="hero-button logout-button" 
          title="Log out"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            border: 'none',
            color: 'white'
          }}
        >
          Log out
        </button>
      </div>
      <div className="registration-container" style={{ paddingTop: '100px' }}>
        <div className="registration-card">
          <div className="registration-header">
            <h1>👤 Complete Your Profile</h1>
            <p>Please provide your details to continue</p>
          </div>

          {error && (
            <div className="error-message" style={{ 
              background: 'rgba(239, 68, 68, 0.2)', 
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="worker-registration-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className="form-input"
                pattern="[A-Za-z\s]+"
                title="Use alphabets and spaces only"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address *</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter your complete address"
                required
                rows="3"
                className="form-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g., 9876543210"
                required
                className="form-input"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                title="Enter 10 digit phone number"
              />
            </div>

            <div className="form-group">
              <label>Gender *</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={formData.gender === 'male'}
                    onChange={handleChange}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Male</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={formData.gender === 'female'}
                    onChange={handleChange}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Female</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="other"
                    checked={formData.gender === 'other'}
                    onChange={handleChange}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Other</span>
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              className="hero-button"
              disabled={loading}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? 'Saving...' : 'Save and Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserRegistrationPage;





