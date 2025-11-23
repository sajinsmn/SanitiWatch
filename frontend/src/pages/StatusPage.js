import React, { useState, useEffect, useRef } from 'react'; // Ensure all hooks are imported
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css'; // Import HomePage CSS

const StatusPage = () => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const mainHeaderRef = useRef(null);
  const navigate = useNavigate(); 

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) { 
        setIsHeaderScrolled(true);
      } else {
        setIsHeaderScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Check for logged in user
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const handleSearch = async () => {
    if (!ticketNumber.trim()) {
      setError('Please enter a ticket number.');
      return;
    }
    
    setLoading(true);
    setError('');
    setReportData(null);
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/ticket/${ticketNumber}`);
      setReportData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Report not found. Please check your ticket number.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginNav = (e) => {
    e.preventDefault();
    try {
      const raw = localStorage.getItem('user');
      if (!raw) {
        navigate('/auth');
        return;
      }
      const u = JSON.parse(raw);
      const role = u?.role;
      const route = role === 'admin' ? '/admin'
        : role === 'management' ? '/management'
        : role === 'worker' ? '/worker'
        : role === 'user' ? '/user'
        : '/auth';
      navigate(route);
    } catch (_) {
      navigate('/auth');
    }
  };

  const headerClasses = isHeaderScrolled ? 'header-scrolled' : '';

  return (
    <div className="home-page-wrapper"> 
      <header id="mainHeader" ref={mainHeaderRef} className={`home-header ${headerClasses}`}>
        <nav className="container nav-bar">
          <Link to="/" className="saniti-logo hero-logo"> 
            SanitiWatch
          </Link>
          <div id="navLinks" className="nav-links">
             <Link to="/">Home</Link> 
             <Link to="/report">Report</Link> 
             <button 
               type="button" 
               onClick={handleLoginNav}
               className="hero-button"
               style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
             >
               {currentUser ? 'Dashboard' : 'Login'}
             </button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="content-container hero-section"> 
        <div className="hero-card"> 
          <h2 className="hero-subtitle" style={{ fontSize: '1.875rem' }}> 
            Track Your Ticket
          </h2>
          <p className="hero-description"> 
            Enter your ticket number below to check the status of your report.
          </p>
          {/* --- Input and Button Container --- */}
          {/* Add a specific class for styling this container */}
          <div className="status-input-container"> 
            <input
              type="text"
              placeholder="Enter Ticket Number..."
              // Add a specific class for styling the input
              className="status-input-field" 
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <button
              className="hero-button status-search-button" // Reuse hero-button, add specific class
              onClick={handleSearch} 
            >
              Search
            </button>
          </div>
          {/* Results area */}
          {loading && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#d1d5db', fontSize: '1rem' }}>Searching for your ticket...</p>
            </div>
          )}
          
          {error && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#ef4444', fontSize: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ef4444' }}>
                {error}
              </p>
            </div>
          )}
          
          {reportData && (
            <div className="status-result-card" style={{ marginTop: '2rem', textAlign: 'left' }}>
              <div className="status-card-header">
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  Report Details
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                  Ticket Number: <strong style={{ color: '#fff' }}>{reportData.ticketNumber}</strong>
                </p>
              </div>
              
              <div className="status-card-content">
                <div className="status-info-row">
                  <span className="status-label">Title:</span>
                  <span className="status-value">{reportData.title}</span>
                </div>
                
                <div className="status-info-row">
                  <span className="status-label">Category:</span>
                  <span className="status-value">
                    {reportData.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                
                <div className="status-info-row">
                  <span className="status-label">Status:</span>
                  <span className={`status-value status-badge status-${reportData.status.toLowerCase()}`}>
                    {reportData.status}
                  </span>
                </div>
                
                {reportData.priority && (
                  <div className="status-info-row">
                    <span className="status-label">Priority:</span>
                    <span className="status-value">{reportData.priority}</span>
                  </div>
                )}
                
                {reportData.description && (
                  <div className="status-info-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span className="status-label" style={{ marginBottom: '0.5rem' }}>Description:</span>
                    <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: 0 }}>
                      {reportData.description}
                    </p>
                  </div>
                )}
                
                <div className="status-info-row">
                  <span className="status-label">Location:</span>
                  <span className="status-value">{reportData.location?.address || 'N/A'}</span>
                </div>
                
                {reportData.photoPath && (
                  <div className="status-photo-container">
                    <span className="status-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Photo:</span>
                    <img 
                      src={reportData.photoPath.startsWith('http') ? reportData.photoPath : `${process.env.REACT_APP_API_BASE_URL}${reportData.photoPath}`} 
                      alt="Report" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px', 
                        borderRadius: '0.5rem',
                        border: '2px solid #4b5563',
                        marginTop: '0.5rem'
                      }} 
                    />
                  </div>
                )}
                
                {reportData.completionPhotoPath && (
                  <div className="status-photo-container">
                    <span className="status-label" style={{ display: 'block', marginBottom: '0.5rem' }}>✅ Completion Photo:</span>
                    <img 
                      src={reportData.completionPhotoPath.startsWith('http') ? reportData.completionPhotoPath : `${process.env.REACT_APP_API_BASE_URL}${reportData.completionPhotoPath}`} 
                      alt="Completion" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px', 
                        borderRadius: '0.5rem',
                        border: '2px solid #10b981',
                        marginTop: '0.5rem'
                      }} 
                    />
                  </div>
                )}
                
                {reportData.timestamp && (
                  <div className="status-info-row">
                    <span className="status-label">Submitted:</span>
                    <span className="status-value">
                      {new Date(reportData.timestamp).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusPage;