import React, { useState, useEffect, useRef } from 'react';
import './HomePage.css'; // Import the CSS file
import './HomePage-additions.css'; // Import additional professional styles
import { Link, useNavigate } from 'react-router-dom'; // Use Link for internal navigation
import axios from 'axios';

function HomePage() {
  // REMOVED: isContentVisible state is no longer needed

  // State to manage header scroll effect
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  // State to manage if the video is currently playing (for background style)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // Controls background
  // State to track current user
  const [currentUser, setCurrentUser] = useState(null);
  // State for warmup loading
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  // Refs to get direct access to DOM elements
  const bgVideoRef = useRef(null);
  const mainHeaderRef = useRef(null);
  const wrapperRef = useRef(null); // Ref for the wrapper
  const navigate = useNavigate();

  // --- Effect for Video Logic ---
  useEffect(() => {
    const video = bgVideoRef.current;
    const wrapper = wrapperRef.current;
    if (!video || !wrapper) return;

    // REMOVED: showContent function is no longer needed

    // Handler when video finishes playing
    const handleVideoEnd = () => {
      console.log("Video ended."); // Log for debugging
      video.style.opacity = '0'; // Start fading out video element
      setTimeout(() => {
        video.style.display = 'none'; // Hide video element after fade
        wrapper.classList.remove('video-playing'); // Revert wrapper to dark gradient
        setIsVideoPlaying(false); // Update state
      }, 1000); // Match CSS transition duration
    };

    // Handler if video fails to load or play
    const handleVideoError = (error) => {
      console.error('Video error:', error); // Log for debugging
      video.style.display = 'none'; // Hide video element immediately
      wrapper.classList.remove('video-playing'); // Ensure dark gradient is shown
      setIsVideoPlaying(false); // Update state
      // Content is already visible
    };

     // Handler when video starts playing successfully
     const handleVideoPlay = () => {
        console.log("Video started playing."); // Log for debugging
        wrapper.classList.add('video-playing'); // Make background transparent
        setIsVideoPlaying(true); // Update state
    }

    // Add event listeners
    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('playing', handleVideoPlay); // Listen for actual playback

    // Try to play the video
    // The 'playing' listener handles background transparency on success
    video.play().catch(handleVideoError); // Catch initial autoplay error

    // Cleanup function
    return () => {
      video.removeEventListener('ended', handleVideoEnd);
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('playing', handleVideoPlay);
    };
  }, []); // Empty dependency array means this runs once on mount

  // --- Effect for Header Scroll ---
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight) {
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

  // --- Effect to check if user is logged in ---
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }, []);

  // Warm up backend when HomePage loads
  useEffect(() => {
    setIsWarmingUp(true);
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/warmup`)
      .then(() => {
        console.log("Backend warmed up");
        setIsWarmingUp(false);
      })
      .catch(() => {
        console.log("Warmup failed");
        setIsWarmingUp(false);
      });
  }, []);

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

  // --- Handler for Smooth Scrolling ---
  const handleSmoothScroll = (e) => {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      const headerHeight = mainHeaderRef.current ? mainHeaderRef.current.offsetHeight : 0;
      const scrollPosition = targetElement.offsetTop - headerHeight;
      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  // --- Handler for Report Click ---
  const handleReportClick = (e) => {
    e.preventDefault();
    if (currentUser && currentUser.role === 'worker') {
      alert('Sorry, you\'re a worker. Please login with a user account to report issues.');
    } else {
      navigate('/report');
    }
  };

  // Dynamically set classes based on state
  const wrapperClasses = `home-page-wrapper ${isVideoPlaying ? 'video-playing' : ''}`; // Control wrapper background
  const headerClasses = isHeaderScrolled ? 'header-scrolled' : '';
  // REMOVED: contentClasses calculation

  const handleLoginNav = async (e) => {
    e.preventDefault();
    // Warm up server before navigating
    await warmUpServer();
    
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

  return (
    // Use the dynamic wrapper class and attach the ref
    <div className={wrapperClasses} ref={wrapperRef}> 
      
      <header id="mainHeader" ref={mainHeaderRef} className={`home-header ${headerClasses}`}>
         <nav className="container nav-bar">
          <a href="#hero" onClick={handleSmoothScroll} className="saniti-logo hero-logo">
            SanitiWatch
          </a>
          <div id="navLinks" className="nav-links">
            <a href="#about" onClick={handleSmoothScroll}>About Us</a>
            <a href="#how-it-works" onClick={handleSmoothScroll}>How It Works</a>
            <a href="#features" onClick={handleSmoothScroll}>Features</a>
            <Link to="/status">Status</Link>
            <Link to="/contact">Contact</Link>
            {currentUser ? (
              <a href="/auth" onClick={handleLoginNav} className="nav-dashboard-link" disabled={isWarmingUp}>
                <span className="user-icon">👤</span>
                <span>{isWarmingUp ? 'Loading...' : currentUser.username}</span>
              </a>
            ) : (
              <a href="/auth" onClick={handleLoginNav} className="nav-login-btn" disabled={isWarmingUp}>
                {isWarmingUp ? 'Loading...' : 'Login'}
              </a>
            )}
          </div>
        </nav>
      </header>

      <video id="bgVideo" ref={bgVideoRef} className="background-media" autoPlay muted playsInline>
        <source src="/vedio.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* --- CONTENT IS ALWAYS VISIBLE --- */}
      {/* Removed the conditional contentClasses */}
      <div id="hero" className="content-container hero-section"> 
        
        <h1 className="saniti-logo hero-title">
          SanitiWatch
        </h1>

        <div className="hero-card"> {/* This is your "glass" container */}
          <h2 className="hero-subtitle">
            Your Community's Health is in Your Hands
          </h2>
          <p className="hero-description">
            SanitiWatch is a platform for reporting cleanliness issues in your community. Help us to make our neighborhoods cleaner and safer.
          </p>
          <div className="hero-button-container">
             {/* Report button with worker check */}
            <a href="/report" onClick={handleReportClick} className="hero-button">
              Report an Issue
            </a>
          </div>
        </div>
      </div>
      
      {/* --- About Section --- */}
      <section id="about" className="content-section bg-white">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">About Us</span>
            <h2 className="section-title">Making Communities Cleaner Together</h2>
            <p className="section-subtitle">
              A student-driven initiative to empower citizens in creating healthier environments
            </p>
          </div>
          <div className="about-content">
            <div className="about-text">
              <p className="about-paragraph">
                <strong>SanitiWatch</strong> is a community-driven initiative conceived and developed by three M.Tech students from Amrita Vishwa Vidyapeetham, Coimbatore. We recognized the need for a transparent and accessible platform to address public sanitation issues.
              </p>
              <p className="about-paragraph">
                Our mission is to <strong>empower citizens</strong> to become active participants in maintaining a cleaner and healthier environment for all. By leveraging modern technology, our platform allows for seamless reporting and a clear feedback loop, ensuring that every issue is tracked and addressed efficiently.
              </p>
              <div className="about-stats">
                <div className="stat-item">
                  <div className="stat-number">100%</div>
                  <div className="stat-label">Community Focused</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">24/7</div>
                  <div className="stat-label">Always Available</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">Real-time</div>
                  <div className="stat-label">Issue Tracking</div>
                </div>
              </div>
            </div>
            <div className="about-image">
              <div className="about-image-placeholder">
                <svg fill="currentColor" viewBox="0 0 24 24" width="120" height="120">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <p>Community Platform</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- How It Works Section --- */}
      <section id="how-it-works" className="content-section bg-gray">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">How It Works</span>
            <h2 className="section-title">Simple Steps to Make a Difference</h2>
            <p className="section-subtitle">
              Report, track, and resolve cleanliness issues in just a few clicks
            </p>
          </div>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <div className="step-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24" width="48" height="48">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <h3 className="step-title">Spot an Issue</h3>
                <p className="step-description">Notice a cleanliness problem in your area? Take a photo or describe the issue.</p>
              </div>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <div className="step-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24" width="48" height="48">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zm0 18H6V4h8l4 4v12z"/>
                  </svg>
                </div>
                <h3 className="step-title">Submit Report</h3>
                <p className="step-description">Fill out a quick form with location details and submit your report instantly.</p>
              </div>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <div className="step-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24" width="48" height="48">
                    <path d="M12 2A10 10 0 1012 22A10 10 0 1012 2zm0 18a8 8 0 110-16a8 8 0 010 16z"/>
                  </svg>
                </div>
                <h3 className="step-title">Track Progress</h3>
                <p className="step-description">Monitor your report's status in real-time and receive updates when resolved.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="features" className="content-section bg-white">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Features</span>
            <h2 className="section-title">Powerful Tools for Community Action</h2>
            <p className="section-subtitle">
              Everything you need to report, track, and resolve sanitation issues
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg fill="currentColor" viewBox="0 0 24 24" width="40" height="40">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zm0 18H6V4h8l4 4v12z"/>
                </svg>
              </div>
              <h3 className="feature-title">Quick Reporting</h3>
              <p className="feature-description">Submit reports in seconds with our intuitive interface, complete with photo uploads and location tagging.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg fill="currentColor" viewBox="0 0 24 24" width="40" height="40">
                  <path d="M12 2A10 10 0 1012 22A10 10 0 1012 2zm0 18a8 8 0 110-16a8 8 0 010 16z"/>
                </svg>
              </div>
              <h3 className="feature-title">Real-Time Tracking</h3>
              <p className="feature-description">Monitor your report's journey from submission to resolution with live status updates.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg fill="currentColor" viewBox="0 0 24 24" width="40" height="40">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
              </div>
              <h3 className="feature-title">Interactive Heat Map</h3>
              <p className="feature-description">Visualize problem areas in your community with our dynamic heat map feature.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg fill="currentColor" viewBox="0 0 24 24" width="40" height="40">
                  <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <h3 className="feature-title">Citizen Engagement</h3>
              <p className="feature-description">Join a community of active citizens working together for cleaner neighborhoods.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg fill="currentColor" viewBox="0 0 24 24" width="40" height="40">
                  <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
                </svg>
              </div>
              <h3 className="feature-title">Role-Based Access</h3>
              <p className="feature-description">Specialized dashboards for citizens, workers, management, and administrators.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg fill="currentColor" viewBox="0 0 24 24" width="40" height="40">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <h3 className="feature-title">Transparent Process</h3>
              <p className="feature-description">Full visibility into how reports are handled from management to completion.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Team Section --- */}
      <section id="team" className="content-section bg-gray">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Our Team</span>
            <h2 className="section-title">Meet the Developers</h2>
            <p className="section-subtitle">
              M.Tech students passionate about creating technology for social good
            </p>
          </div>
          <div className="team-grid">
            {/* --- Student One --- */}
            <div className="team-card">
              <div className="team-avatar-container">
                <img 
                  src="/images/student1.png" 
                  alt="Sajin Simon" 
                  className="team-avatar" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="team-avatar-placeholder" style={{ display: 'none' }}>
                  <svg fill="currentColor" viewBox="0 0 24 24" width="60" height="60">
                    <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>
              <div className="team-card-content">
                <h3 className="team-name">Sajin Simon</h3>
                <p className="team-role">Full Stack Developer</p>
                <div className="team-divider"></div>
                <p className="team-school">M.Tech, Amrita Vishwa Vidyapeetham</p>
                <p className="team-location">Coimbatore, India</p>
                <div className="team-stats">
                  <div className="team-stat-item">
                    <div className="team-stat-label">Role</div>
                    <div className="team-stat-value">Dev</div>
                  </div>
                  <div className="team-stat-item">
                    <div className="team-stat-label">Focus</div>
                    <div className="team-stat-value">Full Stack</div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- Student Two --- */}
            <div className="team-card">
              <div className="team-avatar-container">
                <img 
                  src="/images/student2.png" 
                  alt="Jawahar G" 
                  className="team-avatar" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="team-avatar-placeholder" style={{ display: 'none' }}>
                  <svg fill="currentColor" viewBox="0 0 24 24" width="60" height="60">
                    <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>
              <div className="team-card-content">
                <h3 className="team-name">Jawahar G</h3>
                <p className="team-role">Full Stack Developer</p>
                <div className="team-divider"></div>
                <p className="team-school">M.Tech, Amrita Vishwa Vidyapeetham</p>
                <p className="team-location">Coimbatore, India</p>
                <div className="team-stats">
                  <div className="team-stat-item">
                    <div className="team-stat-label">Role</div>
                    <div className="team-stat-value">Dev</div>
                  </div>
                  <div className="team-stat-item">
                    <div className="team-stat-label">Focus</div>
                    <div className="team-stat-value">Full Stack</div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- Student Three --- */}
            <div className="team-card">
              <div className="team-avatar-container">
                <img 
                  src="/images/student3.png" 
                  alt="Shanmugampriyan S" 
                  className="team-avatar" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="team-avatar-placeholder" style={{ display: 'none' }}>
                  <svg fill="currentColor" viewBox="0 0 24 24" width="60" height="60">
                    <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>
              <div className="team-card-content">
                <h3 className="team-name">Shanmugampriyan S</h3>
                <p className="team-role">Full Stack Developer</p>
                <div className="team-divider"></div>
                <p className="team-school">M.Tech, Amrita Vishwa Vidyapeetham</p>
                <p className="team-location">Coimbatore, India</p>
                <div className="team-stats">
                  <div className="team-stat-item">
                    <div className="team-stat-label">Role</div>
                    <div className="team-stat-value">Dev</div>
                  </div>
                  <div className="team-stat-item">
                    <div className="team-stat-label">Focus</div>
                    <div className="team-stat-value">Full Stack</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Make a Difference?</h2>
            <p className="cta-description">
              Join thousands of active citizens working together to create cleaner, healthier communities. Start reporting issues today!
            </p>
            <div className="cta-buttons">
              <a href="/report" onClick={handleReportClick} className="cta-button cta-button-primary">
                <span>📝</span> Report an Issue
              </a>
              <Link to="/auth" className="cta-button cta-button-secondary">
                <span>👤</span> Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3 className="footer-logo">SanitiWatch</h3>
              <p className="footer-description">
                A community-driven platform for reporting and tracking sanitation issues, empowering citizens to create cleaner environments.
              </p>
            </div>
            <div className="footer-section">
              <h4 className="footer-heading">Quick Links</h4>
              <ul className="footer-links">
                <li><a href="#about" onClick={handleSmoothScroll}>About Us</a></li>
                <li><a href="#how-it-works" onClick={handleSmoothScroll}>How It Works</a></li>
                <li><a href="#features" onClick={handleSmoothScroll}>Features</a></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4 className="footer-heading">Get Started</h4>
              <ul className="footer-links">
                <li><a href="/report" onClick={handleReportClick}>Report Issue</a></li>
                <li><Link to="/status">Track Status</Link></li>
                <li><Link to="/auth">Login / Sign Up</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4 className="footer-heading">Project Info</h4>
              <p className="footer-text">
                <strong>Amrita Vishwa Vidyapeetham</strong><br />
                Coimbatore, India<br />
                M.Tech Project 2025
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 SanitiWatch. All rights reserved.</p>
            <p>Developed by M.Tech Students, Amrita Vishwa Vidyapeetham, Coimbatore</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default HomePage;