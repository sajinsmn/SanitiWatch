import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/Layout.css';
import './WorkerPage.css';
import Modal from '../components/Modal';
import HeatMap from '../components/HeatMap';
import TaskNavigationMap from '../components/TaskNavigationMap';
import ChatSystem from '../components/ChatSystem';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const WorkerPage = () => {
  const [assignedReports, setAssignedReports] = useState([]);
  const [completedReports, setCompletedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [updateNotes, setUpdateNotes] = useState('');
  const [completionImage, setCompletionImage] = useState(null);
  // const [myReports, setMyReports] = useState([]); // Unused
  const [activeTab, setActiveTab] = useState('assigned-tasks'); // 'assigned-tasks', 'my-reports', 'analytics', 'heat-map', 'chat'
  const [analytics, setAnalytics] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMyReport, setSelectedMyReport] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editWasteConditions, setEditWasteConditions] = useState([]);
  const [editUserPriority, setEditUserPriority] = useState('medium');
  const [allReports, setAllReports] = useState([]);
  const [showNavigationMap, setShowNavigationMap] = useState(false);
  const [navigationTask, setNavigationTask] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  // Function to open Google Maps directly for navigation
  const openGoogleMapsNavigation = (report) => {
    if (!report.location?.latitude || !report.location?.longitude) {
      alert('Location information not available for this task.');
      return;
    }

    const destination = `${report.location.latitude},${report.location.longitude}`;
    
    // Try to get current location and open maps
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const origin = `${position.coords.latitude},${position.coords.longitude}`;
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
          window.open(mapsUrl, '_blank');
        },
        (error) => {
          // If location fails, just open with destination
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
          window.open(mapsUrl, '_blank');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      // If geolocation not supported, just open with destination
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
      window.open(mapsUrl, '_blank');
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    if (user && user.role === 'worker' && !user.registrationComplete) {
      navigate('/worker-registration');
      return;
    }
    fetchWorkerReports();
    fetchMyReports();
    fetchAllReportsForHeatMap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  const fetchWorkerReports = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!user || !user.id) {
        console.error('No user data found');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/worker/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const reports = response.data;
      setAssignedReports(reports.filter(r => r.status !== 'Completed'));
      setCompletedReports(reports.filter(r => r.status === 'Completed'));
    } catch (error) {
      console.error('Error fetching worker reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyReports = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.id) return;
      await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/user/${user.id}`);
      // setMyReports(res.data || []); // Commented out since setMyReports is unused
    } catch (e) {
      console.error('Error fetching my reports:', e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.id) return;
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/worker/${user.id}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAnalytics(res.data);
    } catch (e) {
      console.error('Error fetching analytics:', e);
    }
  };

  const fetchAllReportsForHeatMap = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAllReports(res.data || []);
    } catch (e) {
      console.error('Error fetching all reports for heat map:', e);
      setAllReports([]); // Set empty array on error
    }
  };

  // const openEditMyReport = (report) => { // Unused function
  //   if (report.status !== 'Reported') return;
  //   setSelectedMyReport(report);
  //   setEditTitle(report.title || '');
  //   setEditDescription(report.description || '');
  //   setEditCategory(report.category || '');
  //   setEditWasteConditions(report.wasteConditions || []);
  //   setEditUserPriority(report.userPriority || 'medium');
  //   setEditModalOpen(true);
  // };

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

  const submitEditMyReport = async () => {
    if (!selectedMyReport) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/reports/edit/${selectedMyReport._id}`,
        { 
          userId: user.id, 
          title: editTitle, 
          description: editDescription, 
          category: editCategory,
          wasteConditions: editWasteConditions,
          userPriority: editUserPriority
        }
      );
      setEditModalOpen(false);
      setSelectedMyReport(null);
      await fetchMyReports();
    } catch (err) {
      console.error('Edit failed:', err);
    }
  };

  // const openDeleteMyReport = (report) => { // Unused function
  //   if (report.status !== 'Reported') return;
  //   setSelectedMyReport(report);
  //   setDeleteModalOpen(true);
  // };

  const confirmDeleteMyReport = async () => {
    if (!selectedMyReport) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/reports/${selectedMyReport._id}?userId=${user.id}`);
      setDeleteModalOpen(false);
      setSelectedMyReport(null);
      await fetchMyReports();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      const token = localStorage.getItem('authToken');
      if (newStatus === 'Completed') {
        const form = new FormData();
        form.append('notes', updateNotes || 'Task marked as completed');
        form.append('workerId', JSON.parse(localStorage.getItem('user')).id);
        if (completionImage) form.append('completionImage', completionImage);
        await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/reports/complete/${reportId}`, form, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.put(
          `${process.env.REACT_APP_API_BASE_URL}/api/reports/update/${reportId}`,
          { 
            status: newStatus, 
            notes: updateNotes || `Status updated to ${newStatus}`
          },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      }
      
      setUpdateNotes('');
      setCompletionImage(null);
      fetchWorkerReports();
      alert(`Report status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report status');
    }
  };

  if (loading) {
    return (
      <>
        <div className="dashboard-page">
          <div style={{ textAlign: 'center', color: 'white' }}>Loading...</div>
        </div>

      <Modal open={editModalOpen} title="Edit Report" onClose={() => setEditModalOpen(false)}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} placeholder="Title" className="form-input" />
          <textarea value={editDescription} onChange={(e)=>setEditDescription(e.target.value)} placeholder="Description" className="form-input" rows={4} />
          <select value={editCategory} onChange={(e)=>setEditCategory(e.target.value)} className="select-field">
            <option value="" disabled>Select a category</option>
            <option value="overflowing_bin">Overflowing Bin</option>
            <option value="illegal_dumping">Illegal Dumping</option>
            <option value="uncollected_garbage">Uncollected Garbage</option>
            <option value="broken_bin">Broken Bin</option>
            <option value="other">Other</option>
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
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button 
              className="hero-button" 
              onClick={submitEditMyReport}
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

      <Modal open={deleteModalOpen} title="Delete Report" onClose={() => setDeleteModalOpen(false)}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>Are you sure you want to delete this report?</div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button 
              className="delete-button" 
              onClick={confirmDeleteMyReport}
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
      </>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Worker Dashboard</h1>
        <p>Manage your assigned tasks</p>
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
          { id: 'assigned-tasks', icon: '📋', label: `My Tasks (${assignedReports.length})` },
          { id: 'analytics', icon: '📈', label: 'Analytics' },
          { id: 'heat-map', icon: '🗺️', label: 'Heat Map' },
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

      {/* Assigned Tasks Tab */}
      {activeTab === 'assigned-tasks' && (
      <>
      <div className="stats-grid" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM4 19V8h5.13C9.2 8.39 9 8.94 9 9.5v.5H7v2h2v2H7v2h2v2H7v2h4.5c.56 0 1.11.2 1.5.37V19H4z"/>
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{assignedReports.length}</div>
          <div className="stat-card-label">Assigned Tasks</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{completedReports.length}</div>
          <div className="stat-card-label">Completed Tasks</div>
        </div>
      </div>

      {/* Assigned Reports */}
      <div className="content-card" style={{ marginBottom: '2rem' }}>
        <div className="content-card-header">
          <h3>My Assigned Tasks ({assignedReports.length})</h3>
        </div>
        {assignedReports.length > 0 ? (
          <div className="reports-list">
            {assignedReports.map((report) => (
              <div 
                key={report._id} 
                className="report-item worker-report-item"
                onClick={() => setSelectedReport(report)}
                style={{ cursor: 'pointer' }}
              >
                <div className="report-item-header">
                  <span className="report-ticket">#{report.ticketNumber}</span>
                  <span className={`status-badge status-${report.status.toLowerCase()}`}>
                    {report.status}
                  </span>
                  <span className={`priority-badge priority-${report.priority?.toLowerCase()}`}>
                    {report.priority || 'Medium'}
                  </span>
                </div>
                <p className="report-title">{report.title}</p>
                <p className="report-description">{report.description}</p>
                
                {/* Display new fields */}
                {report.userPriority && (
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>User Priority:</strong> 
                    <span style={{ 
                      color: report.userPriority === 'emergency' ? '#dc2626' : 
                            report.userPriority === 'high' ? '#ef4444' : 
                            report.userPriority === 'medium' ? '#f59e0b' : '#10b981',
                      fontWeight: '600',
                      marginLeft: '0.5rem'
                    }}>
                      {report.userPriority.charAt(0).toUpperCase() + report.userPriority.slice(1)}
                    </span>
                  </div>
                )}
                
                {report.wasteConditions && report.wasteConditions.length > 0 && (
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>Waste Conditions:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                      {report.wasteConditions.map((condition, index) => (
                        <span key={index} style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#93c5fd',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          {condition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="report-location">
                  <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {report.location?.address}
                </div>
                {report.internalNotes && (
                  <div className="internal-notes">
                    <strong>Internal Notes:</strong> {report.internalNotes}
                  </div>
                )}
                {report.photoPath && (
                  <div style={{ marginTop: '1rem' }}>
                    <img 
                      src={report.photoPath.startsWith('http') ? report.photoPath : `${process.env.REACT_APP_API_BASE_URL}${report.photoPath}`} 
                      alt="Report" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '200px',
                        borderRadius: '0.5rem',
                        border: '2px solid rgba(255,255,255,0.2)'
                      }}
                    />
                  </div>
                )}
                
                <div className="worker-actions" onClick={(e) => e.stopPropagation()}>
                  {report.location?.latitude && report.location?.longitude && (
                    <button 
                      className="hero-button"
                      style={{ 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        fontSize: '0.85rem'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openGoogleMapsNavigation(report);
                      }}
                    >
                      🗺️ Navigate
                    </button>
                  )}
                  <button 
                    className="hero-button update-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateStatus(report._id, 'In Progress');
                    }}
                  >
                    Mark In Progress
                  </button>
                  <input type="file" accept="image/*" onChange={(e)=>setCompletionImage(e.target.files[0])} style={{ color: 'white' }} />
                  <button 
                    className="hero-button complete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Mark this report as completed?')) {
                        handleUpdateStatus(report._id, 'Completed');
                      }
                    }}
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
            No assigned tasks. Great job!
          </div>
        )}
      </div>

      {/* Completed Reports */}
      {completedReports.length > 0 && (
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <div className="content-card-header">
            <h3>Recently Completed ({completedReports.length})</h3>
          </div>
          <div className="reports-list">
            {completedReports.map((report) => (
              <div 
                key={report._id} 
                className="report-item completed"
                onClick={() => setSelectedReport(report)}
                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="report-item-header">
                  <span className="report-ticket">#{report.ticketNumber}</span>
                  <span className="status-badge status-completed">Completed</span>
                </div>
                <p className="report-title">{report.title}</p>
                <p className="report-description" style={{ 
                  fontSize: '0.875rem', 
                  color: '#9ca3af',
                  margin: '0.5rem 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>{report.description}</p>
                <div className="report-meta">
                  <span>✅ Completed on: {new Date(report.completedAt || report.timestamp).toLocaleDateString()}</span>
                </div>
                {report.completionPhotoPath && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#10b981' }}>
                    📸 Completion photo uploaded
                  </div>
                )}
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#60a5fa' }}>
                  🔍 Click to view details and edit
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="content-card" style={{ marginTop: '1rem' }}>
          <div className="content-card-header">
            <h3>💬 Messages</h3>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0.5rem 0 0 0' }}>
              Communicate with users about their reports
            </p>
          </div>
          <ChatSystem currentUser={currentUser} />
        </div>
      )}

      {/* Heat Map Tab */}
      {activeTab === 'heat-map' && (
        <div className="content-card" style={{ marginTop: '1rem', minHeight: '700px' }}>
          <div className="content-card-header">
            <h3>🗺️ Reports Heat Map</h3>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0.5rem 0 0 0' }}>
              Visual representation of all reports across locations. 
              {allReports.length > 0 ? ` Showing ${allReports.length} report${allReports.length !== 1 ? 's' : ''}.` : ' No reports to display.'}
            </p>
          </div>
          <div style={{ minHeight: '650px' }}>
            <HeatMap 
              reports={allReports} 
              userRole="worker" 
              userId={currentUser?.id}
              assignedReportIds={assignedReports.map(r => r._id)}
            />
          </div>
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
                  <div className="stat-card-value">{analytics.totalTasks}</div>
                  <div className="stat-card-label">Total Tasks</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{analytics.completed}</div>
                  <div className="stat-card-label">Completed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{analytics.completionRate}%</div>
                  <div className="stat-card-label">Completion Rate</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{analytics.avgCompletionTime}</div>
                  <div className="stat-card-label">Avg Days to Complete</div>
                </div>
              </div>

              {/* Status Breakdown - Bar + Pie Chart */}
              <div className="content-card" style={{ marginTop: '2rem' }}>
                <div className="content-card-header">
                  <h3>📊 Task Status Distribution</h3>
                </div>
                <div style={{ padding: '2rem' }}>
                  {/* Bar Visualizations */}
                  <div style={{ marginBottom: '3rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        <span style={{ fontWeight: '600' }}>✅ Completed</span>
                        <span style={{ fontWeight: '600' }}>{analytics.completed} ({analytics.totalTasks > 0 ? ((analytics.completed / analytics.totalTasks) * 100).toFixed(0) : 0}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: `${analytics.totalTasks > 0 ? (analytics.completed / analytics.totalTasks) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.8s ease', borderRadius: '12px' }}></div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        <span style={{ fontWeight: '600' }}>🔄 In Progress</span>
                        <span style={{ fontWeight: '600' }}>{analytics.inProgress} ({analytics.totalTasks > 0 ? ((analytics.inProgress / analytics.totalTasks) * 100).toFixed(0) : 0}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: `${analytics.totalTasks > 0 ? (analytics.inProgress / analytics.totalTasks) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #d97706)', transition: 'width 0.8s ease', borderRadius: '12px' }}></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        <span style={{ fontWeight: '600' }}>📋 Assigned</span>
                        <span style={{ fontWeight: '600' }}>{analytics.assigned} ({analytics.totalTasks > 0 ? ((analytics.assigned / analytics.totalTasks) * 100).toFixed(0) : 0}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: `${analytics.totalTasks > 0 ? (analytics.assigned / analytics.totalTasks) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', transition: 'width 0.8s ease', borderRadius: '12px' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pie Chart */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                    <h4 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.1rem', color: '#e5e7eb' }}>Visual Distribution</h4>
                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                      <Pie
                    data={{
                      labels: ['Completed', 'In Progress', 'Assigned'],
                      datasets: [{
                        data: [analytics.completed, analytics.inProgress, analytics.assigned],
                        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
                        borderColor: ['#059669', '#d97706', '#2563eb'],
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

              {/* Category Breakdown - Doughnut Chart */}
              <div className="content-card" style={{ marginTop: '2rem' }}>
                <div className="content-card-header">
                  <h3>🗂️ Tasks by Category</h3>
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
                              return `${label}: ${value} tasks (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                  </div>
                </div>
              </div>

              {/* Priority Breakdown - Bar Chart */}
              <div className="content-card" style={{ marginTop: '2rem' }}>
                <div className="content-card-header">
                  <h3>⚡ Tasks by Priority</h3>
                </div>
                <div style={{ padding: '2.5rem' }}>
                  <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                  <Bar
                    data={{
                      labels: Object.keys(analytics.priorityBreakdown),
                      datasets: [{
                        label: 'Number of Tasks',
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
                              return `${value} tasks (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                  </div>
                </div>
              </div>

              {/* Recent Performance */}
              <div className="content-card" style={{ marginTop: '2rem' }}>
                <div className="content-card-header">
                  <h3>📈 Last 30 Days Performance</h3>
                </div>
                <div style={{ padding: '2.5rem' }}>
                  <div className="stats-grid" style={{ marginBottom: '2rem', gap: '1rem' }}>
                    <div className="stat-card">
                      <div className="stat-card-value">{analytics.recentCompletions}</div>
                      <div className="stat-card-label">Tasks Completed</div>
                    </div>
                  </div>
                  {Object.keys(analytics.completionsByDate).length > 0 ? (
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Line
                        data={{
                          labels: Object.keys(analytics.completionsByDate).sort().map(date => 
                            new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          ),
                          datasets: [{
                            label: 'Tasks Completed',
                            data: Object.keys(analytics.completionsByDate).sort().map(date => analytics.completionsByDate[date]),
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
                      No completions in the last 30 days
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

      {/* Navigation Map Modal */}
      {showNavigationMap && navigationTask && navigationTask.location && (
        <TaskNavigationMap 
          taskLocation={navigationTask.location}
          onClose={() => {
            setShowNavigationMap(false);
            setNavigationTask(null);
          }}
        />
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>📋 Task Details</h2>
              <button className="modal-close" onClick={() => setSelectedReport(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Ticket:</strong> #{selectedReport.ticketNumber}
              </div>
              <div className="detail-row">
                <strong>Status:</strong>
                <span className={`status-badge status-${selectedReport.status.toLowerCase()}`}>
                  {selectedReport.status}
                </span>
              </div>
              <div className="detail-row">
                <strong>Priority:</strong>
                <span className={`priority-badge priority-${selectedReport.priority?.toLowerCase()}`}>
                  {selectedReport.priority}
                </span>
              </div>
              <div className="detail-row">
                <strong>Title:</strong> {selectedReport.title}
              </div>
              <div className="detail-row">
                <strong>Description:</strong> {selectedReport.description}
              </div>
              <div className="detail-row">
                <strong>Category:</strong> {selectedReport.category?.replace(/_/g, ' ')}
              </div>
              <div className="detail-row">
                <strong>Location:</strong> {selectedReport.location?.address || 'Not specified'}
              </div>
              <div className="detail-row">
                <strong>Submitted:</strong> {new Date(selectedReport.timestamp).toLocaleString()}
              </div>
              {selectedReport.completedAt && (
                <div className="detail-row">
                  <strong>Completed:</strong> {new Date(selectedReport.completedAt).toLocaleString()}
                </div>
              )}
              {selectedReport.internalNotes && (
                <div className="detail-row">
                  <strong>Internal Notes:</strong> 
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.75rem', 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {selectedReport.internalNotes}
                  </div>
                </div>
              )}
              
              {/* Image Gallery */}
              {(selectedReport.photoPath || selectedReport.completionPhotoPath) && (
                <div style={{ marginTop: '1.5rem' }}>
                  <strong style={{ display: 'block', marginBottom: '1rem' }}>📸 Photos:</strong>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    {selectedReport.photoPath && (
                      <div style={{ flex: '1 1 calc(50% - 0.5rem)', minWidth: '200px' }}>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '600', 
                          color: '#60a5fa',
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          📷 Original Report
                        </div>
                        <img 
                          src={selectedReport.photoPath.startsWith('http') ? selectedReport.photoPath : `${process.env.REACT_APP_API_BASE_URL}${selectedReport.photoPath}`} 
                          alt="Original Report" 
                          style={{ 
                            width: '100%', 
                            height: '200px',
                            objectFit: 'cover',
                            borderRadius: '0.5rem',
                            border: '2px solid rgba(96, 165, 250, 0.3)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}
                        />
                      </div>
                    )}
                    {selectedReport.completionPhotoPath && (
                      <div style={{ flex: '1 1 calc(50% - 0.5rem)', minWidth: '200px' }}>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '600', 
                          color: '#10b981',
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          ✅ Completion Photo
                        </div>
                        <img 
                          src={selectedReport.completionPhotoPath.startsWith('http') ? selectedReport.completionPhotoPath : `${process.env.REACT_APP_API_BASE_URL}${selectedReport.completionPhotoPath}`} 
                          alt="Completion" 
                          style={{ 
                            width: '100%', 
                            height: '200px',
                            objectFit: 'cover',
                            borderRadius: '0.5rem',
                            border: '2px solid rgba(16, 185, 129, 0.3)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons for completed tasks */}
              {selectedReport.status === 'Completed' && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: '#10b981',
                    marginBottom: '0.75rem',
                    fontWeight: '600'
                  }}>
                    ✅ This task has been completed
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      className="hero-button"
                      style={{ 
                        fontSize: '0.85rem',
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      }}
                      onClick={() => {
                        if (window.confirm('Are you sure you want to re-open this task?')) {
                          handleUpdateStatus(selectedReport._id, 'In Progress');
                          setSelectedReport(null);
                        }
                      }}
                    >
                      🔄 Re-open Task
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons for active tasks */}
              {selectedReport.status !== 'Completed' && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  display: 'flex', 
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {selectedReport.location?.latitude && selectedReport.location?.longitude && (
                    <button 
                      className="hero-button"
                      style={{ 
                        fontSize: '0.85rem', 
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      }}
                      onClick={() => openGoogleMapsNavigation(selectedReport)}
                    >
                      🗺️ Navigate in Google Maps
                    </button>
                  )}
                  {selectedReport.status === 'Assigned' && (
                    <button 
                      className="hero-button"
                      style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      onClick={() => {
                        handleUpdateStatus(selectedReport._id, 'In Progress');
                        setSelectedReport(null);
                      }}
                    >
                      ▶️ Start Working
                    </button>
                  )}
                  <button 
                    className="hero-button"
                    style={{ 
                      fontSize: '0.85rem', 
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    }}
                    onClick={() => {
                      if (window.confirm('Mark this task as completed?')) {
                        handleUpdateStatus(selectedReport._id, 'Completed');
                        setSelectedReport(null);
                      }
                    }}
                  >
                    ✅ Mark Complete
                  </button>
                </div>
              )}

              <div style={{ 
                marginTop: '1rem', 
                paddingTop: '1rem', 
                borderTop: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'right'
              }}>
                <button 
                  className="hero-button" 
                  onClick={() => setSelectedReport(null)}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerPage;
