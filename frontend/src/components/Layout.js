import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import './Layout.css';

function Layout() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }

    // Handle scroll effect
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsHeaderScrolled(true);
      } else {
        setIsHeaderScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setCurrentUser(null);
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!currentUser) return '/auth';
    switch (currentUser.role) {
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

  const headerClasses = isHeaderScrolled ? 'header-scrolled' : '';

  return (
    <div className="home-page-wrapper">
      <header id="mainHeader" className={`home-header ${headerClasses}`}>
        <nav className="container nav-bar">
          <Link to="/" className="saniti-logo hero-logo">
            SanitiWatch
          </Link>
          <div id="navLinks" className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/contact">Contact Us</Link>
            {/* Hide Report link for workers */}
            {(!currentUser || currentUser.role !== 'worker') && (
              <Link to="/report">Report</Link>
            )}
            <Link to="/status">Status</Link>
            {currentUser ? (
              <>
                <Link to={getDashboardLink()}>Dashboard</Link>
                <Link to="/profile">Profile</Link>
                <span className="user-greeting">Welcome, {currentUser.username}!</span>
                <button
                  onClick={handleLogout}
                  className="hero-button logout-button"
                  style={{
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
      </header>

      <main className="dashboard-container">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
