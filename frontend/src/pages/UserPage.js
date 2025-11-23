import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/Layout.css';
import './UserPage.css';
import HeatMap from '../components/HeatMap';
import Modal from '../components/Modal';
import ChatSystem from '../components/ChatSystem';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const UserPage = () => {
  const [userReports, setUserReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('my-reports'); // 'my-reports', 'report-new', 'heatmap', 'analytics', 'chat'
  const [heatMapReports, setHeatMapReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editWasteConditions, setEditWasteConditions] = useState([]);
  const [editUserPriority, setEditUserPriority] = useState('medium');
  const [editWasteAmount, setEditWasteAmount] = useState(50);
  const [categories, setCategories] = useState([]);
  const [feedbackByReport, setFeedbackByReport] = useState({});
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState('create');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedReportForFeedback, setSelectedReportForFeedback] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState({ url: '', title: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setCurrentUser(userData);
      // Redirect to registration if profile incomplete
      if (userData.role === 'user' && !userData.registrationComplete) {
        navigate('/user-registration');
        return;
      }
      fetchUserReports(userData.id || userData._id);
      fetchHeatMapReports();
      fetchUserFeedbacks(userData.id || userData._id);
      fetchSystemOptions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserReports = async (userId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/user/${userId}`);
      setUserReports(response.data);
    } catch (error) {
      console.error('Error fetching user reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFeedbacks = async (userId) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/feedback/user/${userId}`);
      const map = {};
      (res.data || []).forEach(fb => { map[fb.reportId] = fb; });
      setFeedbackByReport(map);
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    }
  };

  const fetchSystemOptions = async () => {
    try {
      const categoriesRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/system-options/category`);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching system options:', error);
      // Fallback to default categories
      setCategories([
        { _id: '1', value: 'overflowing_bin' },
        { _id: '2', value: 'illegal_dumping' },
        { _id: '3', value: 'uncollected_garbage' },
        { _id: '4', value: 'broken_bin' },
        { _id: '5', value: 'other' }
      ]);
    }
  };

  const openCreateFeedback = (report) => {
    setFeedbackMode('create');
    setSelectedReportForFeedback(report);
    setSelectedFeedback(null);
    setFeedbackRating(5);
    setFeedbackComment('');
    setFeedbackModalOpen(true);
  };

  const openEditFeedback = (report, feedback) => {
    setFeedbackMode('edit');
    setSelectedReportForFeedback(report);
    setSelectedFeedback(feedback);
    setFeedbackRating(feedback.rating || 5);
    setFeedbackComment(feedback.comment || '');
    setFeedbackModalOpen(true);
  };

  const submitFeedback = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !selectedReportForFeedback) return;
      if (feedbackMode === 'create') {
        await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/feedback`, {
          reportId: selectedReportForFeedback._id,
          userId: user.id || user._id,
          username: user.username,
          rating: Number(feedbackRating),
          comment: feedbackComment
        });
      } else if (feedbackMode === 'edit' && selectedFeedback) {
        await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/feedback/${selectedFeedback._id}`, {
          userId: user.id || user._id,
          rating: Number(feedbackRating),
          comment: feedbackComment
        });
      }
      setFeedbackModalOpen(false);
      setSelectedFeedback(null);
      setSelectedReportForFeedback(null);
      await fetchUserFeedbacks(user.id || user._id);
    } catch (err) {
      console.error('Feedback submit failed:', err);
    }
  };

  const deleteFeedback = async (feedback) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/feedback/${feedback._id}?userId=${user.id || user._id}`);
      await fetchUserFeedbacks(user.id || user._id);
    } catch (err) {
      console.error('Feedback delete failed:', err);
    }
  };

  const openEditModal = (report) => {
    if (report.status !== 'Reported') return;
    setSelectedReport(report);
    setEditTitle(report.title || '');
    setEditDescription(report.description || '');
    setEditCategory(report.category || '');
    setEditWasteConditions(report.wasteConditions || []);
    setEditUserPriority(report.userPriority || 'medium');
    setEditWasteAmount(report.wasteAmount || 50);
    
    // Ensure categories are loaded
    if (categories.length === 0) {
      fetchSystemOptions();
    }
    
    setEditModalOpen(true);
  };

  // Handle waste condition checkbox changes in edit modal
  const handleEditWasteConditionChange = (condition) => {
    setEditWasteConditions(prev => {
      if (prev.includes(condition)) {
        return prev.filter(c => c !== condition);
      } else {
        return [...prev, condition];
      }
    });
  };

  const submitEdit = async () => {
    if (!selectedReport) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/reports/edit/${selectedReport._id}`,
        { 
          userId: user.id, 
          title: editTitle, 
          description: editDescription, 
          category: editCategory,
          wasteConditions: editWasteConditions,
          userPriority: editUserPriority,
          wasteAmount: editWasteAmount
        }
      );
      setEditModalOpen(false);
      setSelectedReport(null);
      await fetchUserReports(user.id || user._id);
    } catch (err) {
      console.error('Edit failed:', err);
    }
  };

  const openDeleteModal = (report) => {
    if (report.status !== 'Reported') return;
    setSelectedReport(report);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedReport) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/reports/${selectedReport._id}?userId=${user.id}`);
      setDeleteModalOpen(false);
      setSelectedReport(null);
      await fetchUserReports(user.id || user._id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const fetchHeatMapReports = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHeatMapReports(response.data);
    } catch (error) {
      console.error('Error fetching heat map reports:', error);
    }
  };

  const fetchAnalytics = async (userId) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/user/${userId}/analytics`);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics' && currentUser) {
      fetchAnalytics(currentUser.id || currentUser._id);
    }
  }, [activeTab, currentUser]);

  const getStatusBadgeColor = (status) => {
    const colors = {
      'Reported': '#3b82f6',
      'Assigned': '#f59e0b',
      'In Progress': '#6366f1',
      'Completed': '#10b981',
      'Rejected': '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const reportsByStatus = {
    all: userReports,
    Reported: userReports.filter(r => r.status === 'Reported'),
    Assigned: userReports.filter(r => r.status === 'Assigned'),
    'In Progress': userReports.filter(r => r.status === 'In Progress'),
    Completed: userReports.filter(r => r.status === 'Completed'),
    Rejected: userReports.filter(r => r.status === 'Rejected'),
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div style={{ textAlign: 'center', color: 'white' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>My Dashboard</h1>
        <p>Track your reported issues and make new reports</p>
      </div>

      {/* Main Tabs */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '1rem',
        padding: '0.5rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {[
          { id: 'my-reports', icon: '📋', label: `My Reports (${userReports.length})` },
          { id: 'report-new', icon: '➕', label: 'Report New Issue' },
          { id: 'heatmap', icon: '🗺️', label: 'Heat Map' },
          { id: 'analytics', icon: '📈', label: 'Analytics' },
          { id: 'chat', icon: '💬', label: 'Chat' }
        ].map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeTab === tab.id 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? '600' : '500',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeTab === tab.id ? '0 4px 6px rgba(102, 126, 234, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.background = 'rgba(255,255,255,0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.background = 'transparent';
              }
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'my-reports' && (
        <>
          {/* Statistics */}
          <div className="stats-grid" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM4 19V8h5.13C9.2 8.39 9 8.94 9 9.5v.5H7v2h2v2H7v2h2v2H7v2h4.5c.56 0 1.11.2 1.5.37V19H4z"/>
                  </svg>
                </div>
              </div>
              <div className="stat-card-value">{userReports.length}</div>
              <div className="stat-card-label">Total Reports</div>
            </div>

            {Object.entries(reportsByStatus).slice(1, 6).map(([status, reports]) => (
              <div className="stat-card" key={status}>
                <div className="stat-card-header">
                  <div className="stat-card-icon">
                    <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                </div>
                <div className="stat-card-value">{reports.length}</div>
                <div className="stat-card-label">{status}</div>
              </div>
            ))}
          </div>

          {/* Reports List */}
          <div className="content-card">
            <div className="content-card-header">
              <h3>My Reports</h3>
            </div>
            {userReports.length > 0 ? (
              <div className="user-reports-list">
                {userReports.map((report) => (
                  <div key={report._id} className="user-report-item">
                    <div className="user-report-header">
                      <div className="report-info">
                        <h4>#{report.ticketNumber}</h4>
                        <span 
                          className="status-badge" 
                          style={{ backgroundColor: getStatusBadgeColor(report.status) }}
                        >
                          {report.status}
                        </span>
                      </div>
                      <span className="report-date">
                        {new Date(report.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h5 className="report-title">{report.title}</h5>
                    
                    <div className="report-details-grid">
                      <div className="detail-item">
                        <strong>Category:</strong>
                        <span>{report.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      </div>
                      <div className="detail-item">
                        <strong>User Priority:</strong>
                        <span style={{ 
                          color: report.userPriority === 'emergency' ? '#dc2626' : 
                                report.userPriority === 'high' ? '#ef4444' : 
                                report.userPriority === 'medium' ? '#f59e0b' : '#10b981',
                          fontWeight: '600'
                        }}>
                          {(report.userPriority || 'medium').charAt(0).toUpperCase() + (report.userPriority || 'medium').slice(1)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <strong>Admin Priority:</strong>
                        <span>{report.priority || 'Medium'}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Location:</strong>
                        <span>{report.location?.address || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Waste Amount:</strong>
                        <span style={{ 
                          color: '#f59e0b',
                          fontWeight: '600'
                        }}>
                          {report.wasteAmount || 50}%
                        </span>
                      </div>
                      {report.wasteConditions && report.wasteConditions.length > 0 && (
                        <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                          <strong>Waste Conditions:</strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                            {report.wasteConditions.map((condition, index) => (
                              <span key={index} style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#93c5fd',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                border: '1px solid rgba(59, 130, 246, 0.3)'
                              }}>
                                {condition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <p className="report-description" style={{ 
                      padding: '0.75rem', 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(255,255,255,0.05)',
                      lineHeight: '1.6',
                      fontSize: '0.9rem',
                      color: '#d1d5db'
                    }}>{report.description}</p>
                    
                    {(report.photoPath || report.completionPhotoPath) && (
                      <div style={{ 
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}>
                        {report.photoPath && (
                          <div style={{ 
                            flex: '0 0 auto',
                            width: report.photoPath && report.completionPhotoPath ? 'calc(50% - 0.375rem)' : '280px',
                            minWidth: '200px',
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.5rem' 
                          }}>
                            <div style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: '600', 
                              color: '#60a5fa',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              <span style={{ fontSize: '0.85rem' }}>📸</span> Original
                            </div>
                            <div 
                              onClick={() => {
                                setSelectedImage({ url: report.photoPath.startsWith('http') ? report.photoPath : `${process.env.REACT_APP_API_BASE_URL}${report.photoPath}`, title: 'Original Report Photo' });
                                setImageModalOpen(true);
                              }}
                              style={{ 
                                position: 'relative',
                                width: '100%',
                                height: '160px',
                                overflow: 'hidden',
                                borderRadius: '0.5rem',
                                border: '1.5px solid rgba(96, 165, 250, 0.25)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                background: '#000',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(96, 165, 250, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                              }}
                            >
                              <img 
                                src={report.photoPath.startsWith('http') ? report.photoPath : `${process.env.REACT_APP_API_BASE_URL}${report.photoPath}`} 
                                alt="Report" 
                                style={{ 
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: '0.5rem',
                                right: '0.5rem',
                                background: 'rgba(0,0,0,0.7)',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.7rem',
                                color: '#fff'
                              }}>🔍 Click to zoom</div>
                            </div>
                          </div>
                        )}
                        {report.completionPhotoPath && (
                          <div style={{ 
                            flex: '0 0 auto',
                            width: report.photoPath && report.completionPhotoPath ? 'calc(50% - 0.375rem)' : '280px',
                            minWidth: '200px',
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.5rem' 
                          }}>
                            <div style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: '600', 
                              color: '#34d399',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              <span style={{ fontSize: '0.85rem' }}>✅</span> Completed
                            </div>
                            <div 
                              onClick={() => {
                                setSelectedImage({ url: report.completionPhotoPath.startsWith('http') ? report.completionPhotoPath : `${process.env.REACT_APP_API_BASE_URL}${report.completionPhotoPath}`, title: 'Completion Photo' });
                                setImageModalOpen(true);
                              }}
                              style={{ 
                                position: 'relative',
                                width: '100%',
                                height: '160px',
                                overflow: 'hidden',
                                borderRadius: '0.5rem',
                                border: '1.5px solid rgba(52, 211, 153, 0.25)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                background: '#000',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 211, 153, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                              }}
                            >
                              <img 
                                src={report.completionPhotoPath.startsWith('http') ? report.completionPhotoPath : `${process.env.REACT_APP_API_BASE_URL}${report.completionPhotoPath}`} 
                                alt="Completion" 
                                style={{ 
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: '0.5rem',
                                right: '0.5rem',
                                background: 'rgba(0,0,0,0.7)',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.7rem',
                                color: '#fff'
                              }}>🔍 Click to zoom</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="report-actions" style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '0.5rem', 
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <Link 
                        to={`/status`} 
                        className="hero-button view-status-button" 
                        style={{ 
                          fontSize: '0.85rem', 
                          padding: '0.5rem 0.875rem',
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          border: 'none',
                          color: 'white',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        📍 Track
                      </Link>
                      <button 
                        className="hero-button"
                        style={{ 
                          fontSize: '0.85rem', 
                          padding: '0.5rem 0.875rem',
                          background: report.status !== 'Reported' ? '#6b7280' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          cursor: report.status !== 'Reported' ? 'not-allowed' : 'pointer',
                          opacity: report.status !== 'Reported' ? 0.6 : 1
                        }}
                        onClick={() => report.status === 'Reported' ? openEditModal(report) : null}
                        disabled={report.status !== 'Reported'}
                        title={report.status !== 'Reported' ? `Cannot edit - Report is ${report.status.toLowerCase()}` : 'Edit this report'}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="delete-button"
                        style={{ 
                          fontSize: '0.85rem', 
                          padding: '0.5rem 0.875rem',
                          background: report.status !== 'Reported' ? '#6b7280' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          cursor: report.status !== 'Reported' ? 'not-allowed' : 'pointer',
                          opacity: report.status !== 'Reported' ? 0.6 : 1
                        }}
                        onClick={() => report.status === 'Reported' ? openDeleteModal(report) : null}
                        disabled={report.status !== 'Reported'}
                        title={report.status !== 'Reported' ? `Cannot delete - Report is ${report.status.toLowerCase()}` : 'Delete this report'}
                      >
                        🗑️ Delete
                      </button>
                      {report.status !== 'Reported' && (
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          color: '#93c5fd',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          This report cannot be edited or deleted because it has been {report.status.toLowerCase()}.
                        </div>
                      )}
                      {report.status === 'Completed' && (
                        <>
                          {!feedbackByReport[report._id] ? (
                            <button 
                              className="hero-button"
                              style={{ fontSize: '0.85rem', padding: '0.5rem 0.875rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                              onClick={() => openCreateFeedback(report)}
                            >
                              ⭐ Feedback
                            </button>
                          ) : (
                            <>
                              <button 
                                className="hero-button"
                                style={{ 
                                  fontSize: '0.85rem', 
                                  padding: '0.5rem 0.875rem', 
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  border: 'none',
                                  color: 'white'
                                }}
                                onClick={() => openEditFeedback(report, feedbackByReport[report._id])}
                              >
                                ✏️ Edit Feedback
                              </button>
                              <button 
                                className="delete-button"
                                style={{ 
                                  fontSize: '0.85rem', 
                                  padding: '0.5rem 0.875rem',
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  border: 'none',
                                  color: 'white'
                                }}
                                onClick={() => deleteFeedback(feedbackByReport[report._id])}
                              >
                                🗑️ Delete Feedback
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    {report.status === 'Completed' && feedbackByReport[report._id] && (
                      <div className="content-card" style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ fontWeight: 600 }}>Your Feedback:</div>
                          <div>Rating: {feedbackByReport[report._id].rating} / 5</div>
                        </div>
                        {feedbackByReport[report._id].comment && (
                          <div style={{ marginTop: '0.25rem' }}>{feedbackByReport[report._id].comment}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <svg fill="currentColor" viewBox="0 0 24 24" width="64" height="64" style={{ opacity: 0.3 }}>
                  <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM4 19V8h5.13C9.2 8.39 9 8.94 9 9.5v.5H7v2h2v2H7v2h2v2H7v2h4.5c.56 0 1.11.2 1.5.37V19H4z"/>
                </svg>
                <h3>No reports yet</h3>
                <p>Start by reporting an issue in your community</p>
                <Link to="/report" className="hero-button">
                  Report an Issue
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'report-new' && (
        <div className="content-card">
          <div className="content-card-header">
            <h3>Report a New Issue</h3>
            <p>Help keep your community clean by reporting waste management issues</p>
          </div>
          <div className="report-new-content">
            <div className="report-steps">
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Take a Photo</h4>
                  <p>Capture evidence of the issue</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Add Details</h4>
                  <p>Describe the issue and location</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Submit</h4>
                  <p>Get a ticket number for tracking</p>
                </div>
              </div>
            </div>
            
            <div className="report-cta" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Link to="/report" className="hero-button large-button" style={{ 
                fontSize: '1.1rem',
                padding: '1rem 2rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 10px rgba(102, 126, 234, 0.4)'
              }}>
                ➕ Report an Issue Now
              </Link>
            </div>

            <div className="info-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem' }}>What can you report?</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗑️</div>
                  <h5 style={{ color: '#fff', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Overflowing Bins</h5>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Waste containers that are full or overflowing</p>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚚</div>
                  <h5 style={{ color: '#fff', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Illegal Dumping</h5>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Unauthorized waste disposal sites</p>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
                  <h5 style={{ color: '#fff', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Uncollected Garbage</h5>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Missed collection or piled up trash</p>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
                  <h5 style={{ color: '#fff', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Broken Bins</h5>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Damaged or malfunctioning containers</p>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌍</div>
                  <h5 style={{ color: '#fff', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Other Issues</h5>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Environmental concerns and more</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <h4 style={{ color: '#10b981', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <span>💡</span> Quick Tips
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ padding: '0.5rem 0', color: '#e5e7eb', fontSize: '0.875rem' }}>
                  ✓ Take clear photos showing the issue
                </li>
                <li style={{ padding: '0.5rem 0', color: '#e5e7eb', fontSize: '0.875rem' }}>
                  ✓ Enable location services for accurate reporting
                </li>
                <li style={{ padding: '0.5rem 0', color: '#e5e7eb', fontSize: '0.875rem' }}>
                  ✓ Provide detailed descriptions to help resolve the issue faster
                </li>
                <li style={{ padding: '0.5rem 0', color: '#e5e7eb', fontSize: '0.875rem' }}>
                  ✓ Track your report status in "My Reports" tab
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <Modal open={editModalOpen} title="Edit Report" onClose={() => setEditModalOpen(false)}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} placeholder="Title" className="form-input" />
          <textarea value={editDescription} onChange={(e)=>setEditDescription(e.target.value)} placeholder="Description" className="form-input" rows={4} />
          <select value={editCategory} onChange={(e)=>setEditCategory(e.target.value)} className="select-field">
            <option value="" disabled>Select a category</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat.value.trim()}>
                {cat.value.trim().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
          
          {/* Waste Conditions */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Waste Conditions</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
              {[
                { value: 'smelly', label: 'Smelly' },
                { value: 'hazardous', label: 'Hazardous' },
                { value: 'blocking_pathway', label: 'Blocking pathway' },
                { value: 'pest_infestation', label: 'Pest infestation' },
                { value: 'fire_risk', label: 'Fire risk' },
                { value: 'spillage', label: 'Spillage' },
                { value: 'other', label: 'Other' }
              ].map((condition) => (
                <label key={condition.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={editWasteConditions.includes(condition.value)}
                    onChange={() => handleEditWasteConditionChange(condition.value)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{condition.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Level */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Priority Level</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                { value: 'low', label: 'Low', color: '#10b981' },
                { value: 'medium', label: 'Medium', color: '#f59e0b' },
                { value: 'high', label: 'High', color: '#ef4444' },
                { value: 'emergency', label: 'Emergency', color: '#dc2626' }
              ].map((priority) => (
                <label key={priority.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.375rem', border: `2px solid ${editUserPriority === priority.value ? priority.color : '#d1d5db'}`, backgroundColor: editUserPriority === priority.value ? `${priority.color}20` : 'transparent', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    name="editUserPriority"
                    value={priority.value}
                    checked={editUserPriority === priority.value}
                    onChange={() => setEditUserPriority(priority.value)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ color: editUserPriority === priority.value ? priority.color : '#374151' }}>{priority.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Waste Amount Slider */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Amount of Waste (0-100)</label>
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280', minWidth: '20px' }}>0</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editWasteAmount}
                  onChange={(e) => setEditWasteAmount(parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${editWasteAmount}%, #e5e7eb ${editWasteAmount}%, #e5e7eb 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: '#6b7280', minWidth: '30px' }}>100</span>
              </div>
              <div style={{ 
                textAlign: 'center',
                padding: '0.5rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#f59e0b'
              }}>
                {editWasteAmount}%
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button 
              className="hero-button" 
              onClick={submitEdit}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: 'white'
              }}
            >
              Save
            </button>
            <button 
              className="delete-button" 
              onClick={()=>setEditModalOpen(false)}
              style={{
                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                border: 'none',
                color: 'white'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={feedbackModalOpen} title={feedbackMode === 'create' ? 'Give Feedback' : 'Edit Feedback'} onClose={() => setFeedbackModalOpen(false)}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <select value={feedbackRating} onChange={(e)=>setFeedbackRating(e.target.value)} className="select-field">
            <option value={5}>5 - Excellent</option>
            <option value={4}>4 - Good</option>
            <option value={3}>3 - Okay</option>
            <option value={2}>2 - Poor</option>
            <option value={1}>1 - Bad</option>
          </select>
          <textarea value={feedbackComment} onChange={(e)=>setFeedbackComment(e.target.value)} placeholder="Comment (optional)" className="form-input" rows={3} />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button 
              className="hero-button" 
              onClick={submitFeedback}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: 'white'
              }}
            >
              {feedbackMode === 'create' ? 'Submit' : 'Save'}
            </button>
            <button 
              className="delete-button" 
              onClick={()=>setFeedbackModalOpen(false)}
              style={{
                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                border: 'none',
                color: 'white'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteModalOpen} title="Delete Report" onClose={() => setDeleteModalOpen(false)}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>Are you sure you want to delete this report?</div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button 
              className="delete-button" 
              onClick={confirmDelete}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                color: 'white'
              }}
            >
              Delete
            </button>
            <button 
              className="hero-button" 
              onClick={()=>setDeleteModalOpen(false)}
              style={{
                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                border: 'none',
                color: 'white'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={imageModalOpen} title={selectedImage.title} onClose={() => setImageModalOpen(false)}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ 
            width: '100%',
            maxHeight: '70vh',
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#000',
            borderRadius: '0.5rem',
            padding: '0.5rem'
          }}>
            <img 
              src={selectedImage.url} 
              alt={selectedImage.title}
              style={{ 
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: '0.5rem'
              }}
            />
          </div>
          <button 
            className="hero-button" 
            onClick={() => setImageModalOpen(false)}
            style={{ width: '100%' }}
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="content-card">
          <div className="content-card-header">
            <h3>💬 Messages</h3>
            <p>Chat with workers about your reports</p>
          </div>
          <ChatSystem currentUser={currentUser} />
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className="content-card">
          <div className="content-card-header">
            <h3>🗺️ Heat Map</h3>
            <p>View complaint locations and grouped reports by area. Your reports are shown in green 📍</p>
          </div>
          <HeatMap 
            reports={heatMapReports} 
            userRole="user"
            userId={currentUser?.id || currentUser?._id}
            onReportClick={(report) => {
              // For regular users, just log the click (no detailed modal)
              console.log('Report clicked:', report);
            }}
          />
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <>
          {analytics ? (
            <>
              {/* Performance Overview */}
              <div className="stats-grid" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="stat-card">
                  <div className="stat-card-value">{analytics.totalReports}</div>
                  <div className="stat-card-label">Total Reports</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{analytics.completed}</div>
                  <div className="stat-card-label">Resolved</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{analytics.resolutionRate}%</div>
                  <div className="stat-card-label">Resolution Rate</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{analytics.avgResolutionTime}</div>
                  <div className="stat-card-label">Avg Days to Resolve</div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="content-card" style={{ marginTop: '2rem' }}>
                <div className="content-card-header">
                  <h3>📊 Report Status Distribution</h3>
                </div>
                <div style={{ padding: '2rem' }}>
                  {/* Bar Visualizations */}
                  <div style={{ marginBottom: '3rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        <span style={{ fontWeight: '600' }}>✅ Completed</span>
                        <span style={{ fontWeight: '600' }}>{analytics.completed} ({analytics.totalReports > 0 ? ((analytics.completed / analytics.totalReports) * 100).toFixed(0) : 0}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: `${analytics.totalReports > 0 ? (analytics.completed / analytics.totalReports) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.8s ease', borderRadius: '12px' }}></div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        <span style={{ fontWeight: '600' }}>🔄 In Progress</span>
                        <span style={{ fontWeight: '600' }}>{analytics.inProgress} ({analytics.totalReports > 0 ? ((analytics.inProgress / analytics.totalReports) * 100).toFixed(0) : 0}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: `${analytics.totalReports > 0 ? (analytics.inProgress / analytics.totalReports) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #4f46e5)', transition: 'width 0.8s ease', borderRadius: '12px' }}></div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        <span style={{ fontWeight: '600' }}>📋 Assigned</span>
                        <span style={{ fontWeight: '600' }}>{analytics.assigned} ({analytics.totalReports > 0 ? ((analytics.assigned / analytics.totalReports) * 100).toFixed(0) : 0}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: `${analytics.totalReports > 0 ? (analytics.assigned / analytics.totalReports) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #d97706)', transition: 'width 0.8s ease', borderRadius: '12px' }}></div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        <span style={{ fontWeight: '600' }}>📝 Reported</span>
                        <span style={{ fontWeight: '600' }}>{analytics.reported} ({analytics.totalReports > 0 ? ((analytics.reported / analytics.totalReports) * 100).toFixed(0) : 0}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: `${analytics.totalReports > 0 ? (analytics.reported / analytics.totalReports) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', transition: 'width 0.8s ease', borderRadius: '12px' }}></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        <span style={{ fontWeight: '600' }}>❌ Rejected</span>
                        <span style={{ fontWeight: '600' }}>{analytics.rejected} ({analytics.totalReports > 0 ? ((analytics.rejected / analytics.totalReports) * 100).toFixed(0) : 0}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: `${analytics.totalReports > 0 ? (analytics.rejected / analytics.totalReports) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #ef4444, #dc2626)', transition: 'width 0.8s ease', borderRadius: '12px' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Pie Chart */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                    <h4 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.1rem', color: '#e5e7eb' }}>Visual Distribution</h4>
                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                      <Pie
                        data={{
                          labels: ['Completed', 'In Progress', 'Assigned', 'Reported', 'Rejected'],
                          datasets: [{
                            data: [analytics.completed, analytics.inProgress, analytics.assigned, analytics.reported, analytics.rejected],
                            backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#ef4444'],
                            borderColor: ['#059669', '#4f46e5', '#d97706', '#2563eb', '#dc2626'],
                            borderWidth: 2
                          }]
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: 'bottom', labels: { color: '#fff', font: { size: 14 } } },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const label = context.label || '';
                                  const value = context.parsed || 0;
                                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                  return `${label}: ${value} (${percentage}%)`;
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="content-card" style={{ marginTop: '2rem' }}>
                <div className="content-card-header">
                  <h3>🗂️ Reports by Category</h3>
                </div>
                <div style={{ padding: '2.5rem' }}>
                  <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                    <Doughnut
                      data={{
                        labels: Object.keys(analytics.categoryBreakdown).map(cat => cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
                        datasets: [{
                          data: Object.values(analytics.categoryBreakdown),
                          backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
                          borderColor: ['#dc2626', '#d97706', '#059669', '#2563eb', '#7c3aed'],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: 'bottom', labels: { color: '#fff', font: { size: 12 } } },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} reports (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Priority Breakdown */}
              <div className="content-card" style={{ marginTop: '2rem' }}>
                <div className="content-card-header">
                  <h3>⚡ Reports by Priority</h3>
                </div>
                <div style={{ padding: '2.5rem' }}>
                  <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                    <Bar
                      data={{
                        labels: Object.keys(analytics.priorityBreakdown),
                        datasets: [{
                          label: 'Number of Reports',
                          data: Object.values(analytics.priorityBreakdown),
                          backgroundColor: Object.keys(analytics.priorityBreakdown).map(p => {
                            const colors = { 'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#10b981' };
                            return colors[p] || '#6b7280';
                          }),
                          borderColor: Object.keys(analytics.priorityBreakdown).map(p => {
                            const colors = { 'High': '#dc2626', 'Medium': '#d97706', 'Low': '#059669' };
                            return colors[p] || '#4b5563';
                          }),
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        scales: {
                          y: { beginAtZero: true, ticks: { color: '#9ca3af', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.1)' } },
                          x: { ticks: { color: '#fff' }, grid: { display: false } }
                        },
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const value = context.parsed.y || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${value} reports (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Submission Trend */}
              <div className="content-card" style={{ marginTop: '2rem' }}>
                <div className="content-card-header">
                  <h3>📈 Last 30 Days Submission Trend</h3>
                </div>
                <div style={{ padding: '2.5rem' }}>
                  <div className="stats-grid" style={{ marginBottom: '2rem', gap: '1rem' }}>
                    <div className="stat-card">
                      <div className="stat-card-value">{analytics.recentSubmissions}</div>
                      <div className="stat-card-label">Reports Submitted</div>
                    </div>
                  </div>
                  {Object.keys(analytics.submissionsByDate).length > 0 ? (
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Line
                        data={{
                          labels: Object.keys(analytics.submissionsByDate).sort().map(date => 
                            new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          ),
                          datasets: [{
                            label: 'Reports Submitted',
                            data: Object.keys(analytics.submissionsByDate).sort().map(date => analytics.submissionsByDate[date]),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            pointBackgroundColor: '#3b82f6',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2
                          }]
                        }}
                        options={{
                          responsive: true,
                          scales: {
                            y: { beginAtZero: true, ticks: { color: '#9ca3af', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            x: { ticks: { color: '#9ca3af', maxRotation: 45, minRotation: 45 }, grid: { color: 'rgba(255,255,255,0.05)' } }
                          },
                          plugins: {
                            legend: { labels: { color: '#fff' } },
                            tooltip: {
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              titleColor: '#fff',
                              bodyColor: '#fff',
                              borderColor: '#3b82f6',
                              borderWidth: 1
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                      No reports submitted in the last 30 days
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
              Loading analytics...
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserPage;


