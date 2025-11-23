import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/Layout.css';
import './LoginPage.css';
import './HomePage.css';

const ProfilePage = () => {
  const [formData, setFormData] = useState({ fullName: '', address: '', phone: '', email: '', department: '', workerCode: '', roleInManagement: '', roleTitle: '', gender: 'male' });
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [profileImage, setProfileImage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef(null);
  const navigate = useNavigate();
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user')) || {};
    setCurrentUser(u || null);
    setRole(u.role || 'user');
    if (u && u.id) {
      axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/profile/${u.role}/${u.id}`)
        .then(res => {
          const d = res.data || {};
          setFormData({
            fullName: d.fullName || '',
            address: d.address || '',
            phone: d.phone || '',
            email: d.email || '',
            department: d.department || '',
            workerCode: d.workerCode || '',
            roleInManagement: d.roleInManagement || '',
            roleTitle: d.roleTitle || '',
            gender: d.gender || 'male'
          });
          setProfileImage(d.profileImage || '');
        })
        .catch(()=>{});
    }
  }, []);

  const getDashboardLink = () => {
    const u = currentUser;
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
    setCurrentUser(null);
    navigate('/');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Apply input filters
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, [name]: digitsOnly });
    } else if (name === 'fullName') {
      const lettersOnly = value.replace(/[^A-Za-z\s]/g, '');
      setFormData({ ...formData, [name]: lettersOnly });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setMessage('');
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setMessage('Image size should be less than 5MB.');
      return;
    }

    setImageUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      formData.append('userId', currentUser.id || currentUser._id);
      formData.append('role', currentUser.role);

      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/profile/upload-image`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setProfileImage(response.data.imageUrl);
      setMessage('Profile image updated successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      setMessage('Failed to upload image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
    setPasswordMessage('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage('');

    // Validations
    if (!passwordData.currentPassword) {
      setPasswordMessage('Current password is required');
      setPasswordLoading(false);
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordMessage('New password is required');
      setPasswordLoading(false);
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordMessage('New password must be at least 6 characters long');
      setPasswordLoading(false);
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage('New passwords do not match');
      setPasswordLoading(false);
      return;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordMessage('New password must be different from current password');
      setPasswordLoading(false);
      return;
    }

    try {
      const u = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/profile/change-password`,
        {
          userId: u.id || u._id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      setPasswordMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Enhanced Validations
    if (!formData.fullName || !formData.fullName.trim()) {
      setMessage('Full Name is required');
      setLoading(false);
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(formData.fullName)) {
      setMessage('Full Name must contain only alphabets and spaces');
      setLoading(false);
      return;
    }
    if (!formData.address || !formData.address.trim()) {
      setMessage('Address is required');
      setLoading(false);
      return;
    }
    if (!formData.phone || !formData.phone.trim()) {
      setMessage('Phone number is required');
      setLoading(false);
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      setMessage('Phone number must be exactly 10 digits');
      setLoading(false);
      return;
    }
    if (formData.email && (!formData.email.includes('@') || !formData.email.includes('.'))) {
      setMessage('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Check for phone and email uniqueness
    try {
      const validationResponse = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/validate`, {
        phone: formData.phone,
        email: formData.email,
        excludeUserId: currentUser.id,
        isWorker: role === 'worker'
      });

      if (!validationResponse.data.valid) {
        setMessage('Error: ' + validationResponse.data.errors.join(', '));
        setLoading(false);
        return;
      }
    } catch (validationError) {
      setMessage('Validation failed. Please try again.');
      setLoading(false);
      return;
    }

    try {
      const u = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('authToken');
      const bodyBase = { userId: u.id || u._id, fullName: formData.fullName, address: formData.address, phone: formData.phone, email: formData.email };
      const urlMap = {
        user: `${process.env.REACT_APP_API_BASE_URL}/api/user/register`,
        management: `${process.env.REACT_APP_API_BASE_URL}/api/management/register`,
        admin: `${process.env.REACT_APP_API_BASE_URL}/api/admin/register`,
        worker: `${process.env.REACT_APP_API_BASE_URL}/api/worker/register`
      };
      const url = urlMap[role] || urlMap.user;
      // role-specific required fields validation
      if (role === 'management' && !formData.roleInManagement) {
        setMessage('Role in management is required');
        setLoading(false);
        return;
      }
      if (role === 'admin' && !formData.roleTitle) {
        setMessage('Admin role title is required');
        setLoading(false);
        return;
      }

      if (role === 'worker') {
        await axios.post(url, { ...bodyBase, department: formData.department, gender: formData.gender }, { headers: { 'Authorization': `Bearer ${token}` } });
      } else if (role === 'management') {
        await axios.post(url, { ...bodyBase, roleInManagement: formData.roleInManagement, gender: formData.gender }, { headers: { 'Authorization': `Bearer ${token}` } });
      } else if (role === 'admin') {
        await axios.post(url, { ...bodyBase, roleTitle: formData.roleTitle, gender: formData.gender }, { headers: { 'Authorization': `Bearer ${token}` } });
      } else {
        await axios.post(url, { ...bodyBase, gender: formData.gender }, { headers: { 'Authorization': `Bearer ${token}` } });
      }
      setMessage('Profile updated successfully');
      const curr = JSON.parse(localStorage.getItem('user')) || {};
      localStorage.setItem('user', JSON.stringify({ ...curr, registrationComplete: true }));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
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
            <Link to={getDashboardLink()}>Dashboard</Link>
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
          </div>
        </nav>
      </div>
      
      <div className="login-form-container" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2>My Profile</h2>
          <p style={{ color: '#d1d5db', fontSize: '0.875rem' }}>Update your contact details</p>
        </div>

        {message && (
          <div style={{ 
            color: message.includes('successfully') ? '#10b981' : '#ef4444', 
            marginBottom: '1rem',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            background: message.includes('successfully') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${message.includes('successfully') ? '#10b981' : '#ef4444'}`
          }}>
            {message}
          </div>
        )}

        {/* Profile Image Section */}
        <div className="form-group" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '1rem', color: '#d1d5db', fontWeight: '600' }}>
            Profile Picture
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            {profileImage ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img 
                  src={profileImage.startsWith('http') ? profileImage : `${process.env.REACT_APP_API_BASE_URL}${profileImage}`} 
                  alt="Profile" 
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '50%', 
                    objectFit: 'cover',
                    border: '3px solid #4b5563'
                  }} 
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageUploading}
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {imageUploading ? '⏳' : '📷'}
                </button>
              </div>
            ) : (
              <div 
                onClick={() => imageInputRef.current?.click()}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: '#374151',
                  border: '3px dashed #6b7280',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  fontSize: '12px',
                  textAlign: 'center',
                  padding: '1rem'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '0.5rem' }}>📷</div>
                <div>Click to upload</div>
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
            {imageUploading && (
              <div style={{ color: '#3b82f6', fontSize: '0.875rem' }}>
                Uploading image...
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              className="form-input" 
              name="fullName" 
              value={formData.fullName} 
              onChange={handleChange} 
              required 
              placeholder="Enter your full name"
              pattern="[A-Za-z\s]+"
              title="Use alphabets and spaces only"
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea 
              className="form-input" 
              name="address" 
              value={formData.address} 
              onChange={handleChange} 
              rows="3" 
              required 
              placeholder="Enter your complete address"
            />
          </div>

          {role === 'worker' && (
            <>
              <div className="form-group">
                <label>Department</label>
                <input 
                  className="form-input" 
                  name="department" 
                  value={formData.department} 
                  onChange={handleChange}
                  placeholder="e.g., Sanitation, Waste Management"
                />
              </div>
              <div className="form-group">
                <label>Worker Code</label>
                <input 
                  className="form-input" 
                  name="workerCode" 
                  value={formData.workerCode || 'Auto-assigned'} 
                  readOnly
                  style={{ opacity: 0.7 }}
                />
              </div>
            </>
          )}

          {role === 'management' && (
            <div className="form-group">
              <label>Role in Management</label>
              <input 
                className="form-input" 
                name="roleInManagement" 
                value={formData.roleInManagement}
                onChange={handleChange}
                placeholder="e.g., Supervisor, Coordinator"
                required
              />
            </div>
          )}

          {role === 'admin' && (
            <div className="form-group">
              <label>Role Title</label>
              <input 
                className="form-input" 
                name="roleTitle" 
                value={formData.roleTitle}
                onChange={handleChange}
                placeholder="e.g., Chief Admin, Lead Admin"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              className="form-input" 
              name="email" 
              value={formData.email} 
              onChange={handleChange}
              placeholder="Enter your email address"
              pattern=".+@.+"
              title="Email must include @ symbol"
            />
          </div>

          <div className="form-group">
            <label>Phone *</label>
            <input 
              type="tel"
              className="form-input" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange}
              placeholder="Enter 10 digit phone number"
              pattern="\d{10}"
              minLength="10"
              maxLength="10"
              inputMode="numeric"
              title="Phone number must be exactly 10 digits"
              required
            />
          </div>

          <div className="form-group">
            <label>Gender *</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#d1d5db' }}>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#d1d5db' }}>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#d1d5db' }}>
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

          <button type="submit" className="submit-button" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        {/* Change Password Section */}
        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px solid #374151' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>Change Password</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Update your account password</p>
          </div>

          {passwordMessage && (
            <div style={{ 
              color: passwordMessage.includes('successfully') ? '#10b981' : '#ef4444', 
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              background: passwordMessage.includes('successfully') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${passwordMessage.includes('successfully') ? '#10b981' : '#ef4444'}`
            }}>
              {passwordMessage}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Current Password *</label>
              <input 
                type="password"
                className="form-input" 
                name="currentPassword" 
                value={passwordData.currentPassword} 
                onChange={handlePasswordChange} 
                required 
                placeholder="Enter your current password"
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label>New Password *</label>
              <input 
                type="password"
                className="form-input" 
                name="newPassword" 
                value={passwordData.newPassword} 
                onChange={handlePasswordChange} 
                required 
                placeholder="Enter new password (min. 6 characters)"
                minLength="6"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password *</label>
              <input 
                type="password"
                className="form-input" 
                name="confirmPassword" 
                value={passwordData.confirmPassword} 
                onChange={handlePasswordChange} 
                required 
                placeholder="Confirm your new password"
                minLength="6"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="submit-button" disabled={passwordLoading} style={{ marginTop: '1rem' }}>
              {passwordLoading ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
