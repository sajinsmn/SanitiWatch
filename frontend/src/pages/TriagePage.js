import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/Layout.css';

function showToast({ title, description, variant = 'default' }) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    console.log(`Toast (${variant}): ${title} - ${description}`);
}

const TriagePage = () => {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [assignedReports, setAssignedReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workerJobCounts, setWorkerJobCounts] = useState({});
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingAssigned, setEditingAssigned] = useState(null);
  
  const [priority, setPriority] = useState('Medium');
  const [assignedWorkerId, setAssignedWorkerId] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [priorities, setPriorities] = useState([]);
  const [activeTab, setActiveTab] = useState('unassigned'); // 'unassigned' or 'assigned'
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [reportsRes, assignedRes, workersRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/unassigned/grouped`, { headers }),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/assigned`, { headers }),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/users/workers`, { headers })
      ]);

      const grp = reportsRes.data || [];
      setGroups(grp);
      setAssignedReports(assignedRes.data || []);
      
      const workersData = workersRes.data || [];
      setWorkers(workersData);
      
      const countsEntries = await Promise.all((workersData).map(async (w) => {
        try {
          const r = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/worker/${w._id}`, { headers });
          const pending = (r.data || []).filter(x => x.status !== 'Completed').length;
          return [w._id, pending];
        } catch (_) {
          return [w._id, 0];
        }
      }));
      setWorkerJobCounts(Object.fromEntries(countsEntries));
      
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. You may not have permission.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchPriorities = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/system-options/priority`);
        setPriorities(response.data);
      } catch (error) {
        console.error('Error fetching priorities:', error);
        // Fallback to defaults
        setPriorities([
          { _id: '1', value: 'Low' },
          { _id: '2', value: 'Medium' },
          { _id: '3', value: 'High' }
        ]);
      }
    };
    fetchPriorities();
  }, []);

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      if (user.role !== 'admin' && user.role !== 'management') {
        alert("Access Denied: This page is for Management only.");
        navigate('/');
        return;
      }
      fetchData();
    } else {
      navigate('/auth');
    }
  }, [navigate, fetchData]);

  const handleAssignGroup = async (groupId) => {
    if (!assignedWorkerId) {
        alert("Please select a worker to assign.");
        return;
    }
    
    try {
      const group = groups.find(g => g.groupId === groupId);
      if (!group) return;

      const token = localStorage.getItem('authToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Assign all reports in the group
      await Promise.all(group.reports.map(report => 
        axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/reports/assign/${report._id}`, {
          workerId: assignedWorkerId,
          priority: priority,
          internalNotes: internalNotes,
          status: 'Assigned'
        }, { headers })
      ));
      
      showToast({ title: "Success", description: `Assigned ${group.count} report(s) to worker.` });
      fetchData();
      setAssignedWorkerId('');
      setInternalNotes('');
      
    } catch (err) {
      console.error("Error assigning group:", err);
      showToast({ title: "Error", description: "Failed to assign group.", variant: "destructive" });
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignedWorkerId || !selectedReport) {
        alert("Please select a worker to assign.");
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        await axios.put(
            `${process.env.REACT_APP_API_BASE_URL}/api/reports/assign/${selectedReport._id}`,
            {
                workerId: assignedWorkerId,
                priority: priority,
                internalNotes: internalNotes,
                status: 'Assigned'
            },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        showToast({ title: "Success", description: `Report #${selectedReport.ticketNumber} assigned.` });
        fetchData();
        setSelectedReport(null);
        
    } catch (err) {
        console.error("Error assigning report:", err);
        showToast({ title: "Error", description: "Failed to assign report.", variant: "destructive" });
    }
  };

  const handleReject = async (report) => {
    if (!window.confirm("Are you sure you want to reject this report?")) return;
    try {
        const token = localStorage.getItem('authToken');
        await axios.put(
            `${process.env.REACT_APP_API_BASE_URL}/api/reports/reject/${report._id}`,
            { 
                status: 'Rejected',
                internalNotes: internalNotes || "Report rejected as invalid/spam."
            },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        showToast({ title: "Report Rejected", description: `Report #${report.ticketNumber} rejected.` });
        fetchData();
    } catch (err) {
        console.error("Error rejecting report:", err);
        showToast({ title: "Error", description: "Failed to reject report.", variant: "destructive" });
    }
  };

  const handleEditAssigned = (report) => {
    setEditingAssigned(report);
    setPriority(report.priority || 'Medium');
    setAssignedWorkerId(report.assignedWorkerId || '');
    setInternalNotes(report.internalNotes || '');
  };

  const handleUpdateAssigned = async (e) => {
    e.preventDefault();
    if (!editingAssigned || !assignedWorkerId) {
      alert('Please select a worker.');
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/api/reports/assign/${editingAssigned._id}`,
        {
          workerId: assignedWorkerId,
          priority: priority,
          internalNotes: internalNotes,
          status: 'Assigned'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      showToast({ title: "Success", description: `Report #${editingAssigned.ticketNumber} updated.` });
      setEditingAssigned(null);
      fetchData();
    } catch (err) {
      console.error("Error updating assigned report:", err);
      showToast({ title: "Error", description: "Failed to update report.", variant: "destructive" });
    }
  };

  const handleDeleteAssigned = async (report) => {
    if (!window.confirm(`Are you sure you want to cancel and delete assigned report #${report.ticketNumber}? This action cannot be undone.`)) {
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/api/reports/assigned/${report._id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      showToast({ title: "Success", description: `Report #${report.ticketNumber} cancelled and deleted.` });
      setEditingAssigned(null);
      fetchData();
    } catch (err) {
      console.error("Error deleting assigned report:", err);
      showToast({ title: "Error", description: err.response?.data?.message || "Failed to delete report.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div style={{ textAlign: 'center', color: 'white' }}>Loading Manage Reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>
      </div>
    );
  }

  
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Manage Reports</h1>
        <p>Assign new reports and manage assigned work</p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '1rem',
        padding: '0.5rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.5rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={() => setActiveTab('unassigned')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: activeTab === 'unassigned' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'unassigned' ? '600' : '500',
            transition: 'all 0.3s ease',
            boxShadow: activeTab === 'unassigned' ? '0 4px 6px rgba(102, 126, 234, 0.3)' : 'none'
          }}
        >
          📋 New Reports ({groups.reduce((sum, g) => sum + g.count, 0)})
        </button>
        <button
          onClick={() => setActiveTab('assigned')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: activeTab === 'assigned' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'assigned' ? '600' : '500',
            transition: 'all 0.3s ease',
            boxShadow: activeTab === 'assigned' ? '0 4px 6px rgba(102, 126, 234, 0.3)' : 'none'
          }}
        >
          🔧 Assigned Reports ({assignedReports.length})
        </button>
      </div>

      {activeTab === 'unassigned' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Grouped Reports List */}
        <div>
          <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div className="content-card-header" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>📍 Location Groups</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>{groups.length} location clusters awaiting assignment</p>
            </div>
            <div className="reports-list">
              {groups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                  <h4 style={{ marginBottom: '1rem' }}>No unassigned reports found. Good job!</h4>
                  <p>All reports have been assigned to workers.</p>
                </div>
              ) : (
                groups.map((group, idx) => (
                <div key={group.groupId} style={{ marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                       onClick={() => setExpandedGroup(expandedGroup === idx ? null : idx)}>
                    <div>
                      <h4 style={{ margin: 0 }}>
                        📍 Location {idx + 1} - {group.center.address || 'Unknown'}
                        {group.count > 1 && <span style={{ color: '#f59e0b' }}> ({group.count} reports)</span>}
                      </h4>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#9ca3af' }}>
                        Priority: <span style={{ 
                          color: group.priority === 'High' ? '#ef4444' : group.priority === 'Medium' ? '#f59e0b' : '#10b981' 
                        }}>{group.priority}</span>
                      </p>
                    </div>
                    <span>{expandedGroup === idx ? '▼' : '▶'}</span>
                  </div>
                  
                  {expandedGroup === idx && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      {/* Quick Assign Group Section */}
                      <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                          Assign entire group to worker:
                        </label>
                        <select 
                          value={assignedWorkerId}
                          onChange={(e) => setAssignedWorkerId(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', marginBottom: '0.5rem' }}
                        >
                          <option value="" disabled>Select worker...</option>
                          {workers.map(worker => {
                            const count = workerJobCounts[worker._id] ?? 0;
                            return (
                              <option key={worker._id} value={worker._id}>
                                {worker.username} — Pending: {count}
                              </option>
                            );
                          })}
                        </select>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleAssignGroup(group.groupId)}
                            className="hero-button"
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', flex: 1 }}
                            disabled={!assignedWorkerId}
                          >
                            Assign All ({group.count} reports)
                          </button>
                        </div>
                      </div>

                      {/* Individual Reports in Group */}
                      <div style={{ marginTop: '0.5rem' }}>
                        {group.reports.map(report => (
                          <div key={report._id} 
                               onClick={() => setSelectedReport(report)}
                               style={{ 
                                 padding: '0.5rem', 
                                 marginBottom: '0.25rem', 
                                 background: selectedReport?._id === report._id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                 borderRadius: '0.25rem',
                                 cursor: 'pointer'
                               }}>
                            <div style={{ fontWeight: 'bold' }}>#{report.ticketNumber}</div>
                            <div style={{ fontSize: '0.875rem' }}>{report.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{report.username}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )))}
            </div>
          </div>
        </div>

        {/* Right: Individual Assignment Form */}
        <div>
          {selectedReport ? (
            <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <div className="content-card-header" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>📝 Assign Report</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Ticket #{selectedReport.ticketNumber}</p>
              </div>
              <form onSubmit={handleAssign} style={{ padding: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <p><strong>Title:</strong> {selectedReport.title}</p>
                  <p><strong>Category:</strong> {selectedReport.category}</p>
                  <p><strong>Location:</strong> {selectedReport.location?.address}</p>
                  <p><strong>Priority:</strong> {selectedReport.priority || 'Medium'}</p>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Set Priority:</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} 
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}>
                    {priorities.map((pri) => (
                      <option key={pri._id} value={pri.value}>
                        {pri.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Assign to Worker:</label>
                  <select value={assignedWorkerId} onChange={(e) => setAssignedWorkerId(e.target.value)} required
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}>
                    <option value="" disabled>Select a worker...</option>
                    {workers.map(worker => {
                      const count = workerJobCounts[worker._id] ?? 0;
                      return (
                        <option key={worker._id} value={worker._id}>
                          {worker.username} — Pending: {count}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Internal Notes:</label>
                  <textarea 
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows="3"
                    placeholder="Add notes for the worker..."
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', backgroundColor: '#333', color: 'white' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="hero-button" style={{ flex: 1 }}>
                    Assign Ticket
                  </button>
                  <button type="button" onClick={() => handleReject(selectedReport)} className="hero-button" 
                          style={{ flex: 1, backgroundColor: '#ef4444' }}>
                    Reject
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '3rem 1.5rem' }}>
              <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <svg fill="currentColor" viewBox="0 0 24 24" width="64" height="64" style={{ opacity: 0.3, margin: '0 auto 1rem' }}>
                  <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM4 19V8h5.13C9.2 8.39 9 8.94 9 9.5v.5H7v2h2v2H7v2h2v2H7v2h4.5c.56 0 1.11.2 1.5.37V19H4z"/>
                </svg>
                <h3 style={{ marginBottom: '0.5rem' }}>No Report Selected</h3>
                <p style={{ margin: 0 }}>Select a report from the left to assign it to a worker</p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'assigned' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Left: Assigned Reports List */}
          <div>
            <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <div className="content-card-header" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>🔧 Assigned Reports</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>{assignedReports.length} reports in progress</p>
              </div>
              <div className="reports-list" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {assignedReports.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    No assigned reports yet.
                  </div>
                ) : (
                  assignedReports.map((report) => {
                    const worker = workers.find(w => w._id === report.assignedWorkerId);
                    return (
                      <div
                        key={report._id}
                        onClick={() => handleEditAssigned(report)}
                        style={{
                          padding: '1rem',
                          marginBottom: '0.75rem',
                          background: editingAssigned?._id === report._id 
                            ? 'rgba(59, 130, 246, 0.2)' 
                            : 'rgba(255,255,255,0.05)',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>#{report.ticketNumber}</div>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            background: report.status === 'In Progress' ? '#6366f1' : '#f59e0b',
                            color: 'white'
                          }}>
                            {report.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>{report.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          <div>📍 {report.location?.address || 'No address'}</div>
                          <div>👤 Reporter: {report.username}</div>
                          <div>🔧 Worker: {worker?.username || 'Unknown'}</div>
                          <div>⚡ Priority: <span style={{
                            color: report.priority === 'High' ? '#ef4444' : report.priority === 'Medium' ? '#f59e0b' : '#10b981'
                          }}>{report.priority || 'Medium'}</span></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right: Edit Form */}
          <div>
            {editingAssigned ? (
              <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div className="content-card-header" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>✏️ Edit Assignment</h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Ticket #{editingAssigned.ticketNumber}</p>
                </div>
                <form onSubmit={handleUpdateAssigned} style={{ padding: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <p><strong>Title:</strong> {editingAssigned.title}</p>
                    <p><strong>Category:</strong> {editingAssigned.category}</p>
                    <p><strong>Current Status:</strong> {editingAssigned.status}</p>
                    <p><strong>Location:</strong> {editingAssigned.location?.address}</p>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Update Priority:</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} 
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}>
                      {priorities.map((pri) => (
                        <option key={pri._id} value={pri.value}>
                          {pri.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Reassign to Worker:</label>
                    <select value={assignedWorkerId} onChange={(e) => setAssignedWorkerId(e.target.value)} required
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}>
                      <option value="" disabled>Select a worker...</option>
                      {workers.map(worker => {
                        const count = workerJobCounts[worker._id] ?? 0;
                        return (
                          <option key={worker._id} value={worker._id}>
                            {worker.username} — Pending: {count}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Update Notes:</label>
                    <textarea 
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows="3"
                      placeholder="Add or update notes..."
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', backgroundColor: '#333', color: 'white' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="submit" className="hero-button" style={{ flex: '1 1 45%' }}>
                      Update Assignment
                    </button>
                    <button type="button" onClick={() => handleDeleteAssigned(editingAssigned)} className="hero-button" 
                            style={{ flex: '1 1 45%', backgroundColor: '#ef4444' }}>
                      Delete Report
                    </button>
                    <button type="button" onClick={() => setEditingAssigned(null)} className="hero-button" 
                            style={{ flex: '1 1 100%', backgroundColor: '#6b7280' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '3rem 1.5rem' }}>
                <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                  <svg fill="currentColor" viewBox="0 0 24 24" width="64" height="64" style={{ opacity: 0.3, margin: '0 auto 1rem' }}>
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM4 19V8h5.13C9.2 8.39 9 8.94 9 9.5v.5H7v2h2v2H7v2h2v2H7v2h4.5c.56 0 1.11.2 1.5.37V19H4z"/>
                  </svg>
                  <h3 style={{ marginBottom: '0.5rem' }}>No Report Selected</h3>
                  <p style={{ margin: 0 }}>Select an assigned report to edit or reassign</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div id="toast-container" style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 1000 }}></div>
    </div>
  );
};

export default TriagePage;
