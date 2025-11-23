import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/Layout.css';
import './AdminPage.css';
import HeatMap from '../components/HeatMap';
import Modal from '../components/Modal';
import TriagePage from './TriagePage';
import ChatSystem from '../components/ChatSystem';
import DatabasePage from './DatabasePage';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const AdminPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'manage', 'reports', 'master-forms', 'profiles', 'messages', 'heatmap', 'your-reports', 'analytics', 'chat', 'database'
  const [allReports, setAllReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [allDetails, setAllDetails] = useState(null);
  const [contactMessages, setContactMessages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [editUserId, setEditUserId] = useState(null);
  
  // Profile filters
  const [profileRoleFilter, setProfileRoleFilter] = useState('all');
  const [profileStatusFilter, setProfileStatusFilter] = useState('all');
  const [profileImageFilter, setProfileImageFilter] = useState('all');
  const [heatMapReports, setHeatMapReports] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  // const [selectedReport, setSelectedReport] = useState(null); // Unused
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState({ url: '', title: '' });
  const [reportToEdit, setReportToEdit] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editWasteConditions, setEditWasteConditions] = useState([]);
  const [editUserPriority, setEditUserPriority] = useState('medium');
  const [editWasteAmount, setEditWasteAmount] = useState(50);
  
  // System Options State
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [optionsMessage, setOptionsMessage] = useState('');
  const [reportFilter, setReportFilter] = useState('All');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [deleteReportId, setDeleteReportId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [editPriority, setEditPriority] = useState('');
  
  // Edit mode states
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingPriority, setEditingPriority] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  
  // Report Generation states
  // const [generatedReports, setGeneratedReports] = useState([]); // Unused
  // const [period] = useState('Weekly'); // Unused
  // const [fromDate, setFromDate] = useState(''); // Unused
  // const [toDate, setToDate] = useState(''); // Unused
  // const [selectedMonth, setSelectedMonth] = useState(''); // Unused
  // const [selectedWeekDate, setSelectedWeekDate] = useState(''); // Unused
  // const [selectedDayDate, setSelectedDayDate] = useState(''); // Unused
  // const [exportType, setExportType] = useState('PDF'); // Unused
  // const [generatingReport, setGeneratingReport] = useState(false); // Unused
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  // const [selectedGeneratedReport, setSelectedGeneratedReport] = useState(null); // Unused

  const navigate = useNavigate();

  // Fetch System Options
  const fetchSystemOptions = async () => {
    try {
      const [catRes, priRes, statRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/system-options/category`),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/system-options/priority`),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/system-options/status`)
      ]);
      setCategories(catRes.data);
      setPriorities(priRes.data);
      setStatuses(statRes.data);
    } catch (error) {
      console.error('Error fetching system options:', error);
    }
  };

  // Add new option
  const handleAddOption = async (type, value) => {
    if (!value.trim()) {
      setOptionsMessage(`Please enter a ${type} name`);
      setTimeout(() => setOptionsMessage(''), 3000);
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/system-options`, 
        { type, value: value.trim() },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setOptionsMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`);
      setTimeout(() => setOptionsMessage(''), 3000);
      
      // Clear input and refresh
      if (type === 'category') setNewCategory('');
      if (type === 'priority') setNewPriority('');
      if (type === 'status') setNewStatus('');
      
      await fetchSystemOptions();
    } catch (error) {
      setOptionsMessage(error.response?.data?.message || 'Error adding option');
      setTimeout(() => setOptionsMessage(''), 3000);
    }
  };

  // Edit option
  const handleEditOption = (type, selectedId) => {
    if (!selectedId) {
      setOptionsMessage(`Please select a ${type} to edit`);
      setTimeout(() => setOptionsMessage(''), 3000);
      return;
    }
    
    let option = null;
    if (type === 'category') {
      option = categories.find(c => c._id === selectedId);
      if (option) {
        setEditingCategory(option);
        setNewCategory(option.value);
      }
    } else if (type === 'priority') {
      option = priorities.find(p => p._id === selectedId);
      if (option) {
        setEditingPriority(option);
        setNewPriority(option.value);
      }
    } else if (type === 'status') {
      option = statuses.find(s => s._id === selectedId);
      if (option) {
        setEditingStatus(option);
        setNewStatus(option.value);
      }
    }
  };
  
  // Update option
  const handleUpdateOption = async (type, editingOption, value) => {
    if (!value.trim()) {
      setOptionsMessage(`Please enter a ${type} name`);
      setTimeout(() => setOptionsMessage(''), 3000);
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/system-options/${editingOption._id}`, 
        { value: value.trim() },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setOptionsMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`);
      setTimeout(() => setOptionsMessage(''), 3000);
      
      // Clear edit mode and input
      if (type === 'category') {
        setEditingCategory(null);
        setNewCategory('');
        setSelectedCategory('');
      }
      if (type === 'priority') {
        setEditingPriority(null);
        setNewPriority('');
        setSelectedPriority('');
      }
      if (type === 'status') {
        setEditingStatus(null);
        setNewStatus('');
        setSelectedStatus('');
      }
      
      await fetchSystemOptions();
    } catch (error) {
      setOptionsMessage(error.response?.data?.message || 'Error updating option');
      setTimeout(() => setOptionsMessage(''), 3000);
    }
  };
  
  // Cancel edit mode
  const handleCancelEdit = (type) => {
    if (type === 'category') {
      setEditingCategory(null);
      setNewCategory('');
    }
    if (type === 'priority') {
      setEditingPriority(null);
      setNewPriority('');
    }
    if (type === 'status') {
      setEditingStatus(null);
      setNewStatus('');
    }
  };

  // Delete selected option
  const handleDeleteOption = async (type, selectedId) => {
    if (!selectedId) {
      setOptionsMessage(`Please select a ${type} to delete`);
      setTimeout(() => setOptionsMessage(''), 3000);
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/system-options/${selectedId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setOptionsMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
      setTimeout(() => setOptionsMessage(''), 3000);
      
      // Clear selection and refresh
      if (type === 'category') setSelectedCategory('');
      if (type === 'priority') setSelectedPriority('');
      if (type === 'status') setSelectedStatus('');
      
      await fetchSystemOptions();
    } catch (error) {
      setOptionsMessage(error.response?.data?.message || 'Error deleting option');
      setTimeout(() => setOptionsMessage(''), 3000);
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

  const fetchMyReports = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const uid = user?.id || user?._id;
      if (!uid) return;
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/user/${uid}` , {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const list = res.data || [];
      console.log(`Admin: My reports fetched = ${list.length}`);
      if (list.length > 0) {
        setMyReports(list);
      } else {
        // Fallback: derive from allReports if API returned empty
        const derived = (allReports || []).filter(r => {
          const rid = r?.userId && typeof r.userId === 'object' ? r.userId._id || r.userId : r.userId;
          return (uid && String(rid) === String(uid)) || r.username === user?.username;
        });
        setMyReports(derived);
        console.log(`Admin: Derived my reports from allReports = ${derived.length}`);
      }
    } catch (e) {
      console.error('Error fetching my reports:', e);
    }
  };

  const openEditModal = (report) => {
    if (report.status !== 'Reported') return;
    setReportToEdit(report);
    setEditTitle(report.title || '');
    setEditDescription(report.description || '');
    setEditCategory(report.category || '');
    setEditPriority(report.priority || 'Medium');
    setEditWasteConditions(report.wasteConditions || []);
    setEditUserPriority(report.userPriority || 'medium');
    setEditWasteAmount(report.wasteAmount || 50);
    
    // Ensure system options are loaded
    if (categories.length === 0 || priorities.length === 0) {
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
    if (!reportToEdit) return;
    
    // Validation
    if (!editTitle.trim()) {
      alert('Please enter a title for the report');
      return;
    }
    if (!editDescription.trim()) {
      alert('Please enter a description for the report');
      return;
    }
    if (!editCategory) {
      alert('Please select a category for the report');
      return;
    }
    
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const uid = user?.id || user?._id;
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/reports/edit/${reportToEdit._id}`,
        { 
          userId: uid, 
          title: editTitle.trim(), 
          description: editDescription.trim(), 
          category: editCategory,
          wasteConditions: editWasteConditions,
          userPriority: editUserPriority,
          wasteAmount: editWasteAmount
        }
      );
      setEditModalOpen(false);
      setReportToEdit(null);
      setEditTitle('');
      setEditDescription('');
      setEditCategory('');
      setEditWasteConditions([]);
      setEditUserPriority('medium');
      setEditWasteAmount(50);
      await fetchMyReports();
      await fetchAllReports(); // Refresh all reports too
      alert('Report updated successfully!');
    } catch (err) {
      console.error('Edit failed:', err);
      alert('Failed to update report. Please try again.');
    }
  };

  const openDeleteModal = (report) => {
    if (report.status !== 'Reported') return;
    setReportToEdit(report);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!reportToEdit) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const uid = user?.id || user?._id;
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/reports/${reportToEdit._id}?userId=${uid}`);
      setDeleteModalOpen(false);
      setReportToEdit(null);
      await fetchMyReports();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'admin' && !user.registrationComplete) {
      navigate('/admin-registration');
      return;
    }
    fetchDashboardStats();
    fetchAllReports();
    fetchAllDetails();
    fetchContactMessages();
    fetchHeatMapReports();
    fetchMyReports();
    fetchSystemOptions(); // Ensure system options are always loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh my reports whenever Your Reports tab is opened
  useEffect(() => {
    if (activeTab === 'your-reports') {
      fetchMyReports();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch system options when master-forms tab is opened
  useEffect(() => {
    if (activeTab === 'master-forms') {
      fetchSystemOptions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch analytics when analytics tab is opened
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  // Fetch generated reports when report-generation tab is opened
  useEffect(() => {
    if (activeTab === 'report-generation') {
      fetchGeneratedReports();
    }
  }, [activeTab]);

  const fetchGeneratedReports = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Note: generatedReports state is commented out, so this fetch is for future use
      // setGeneratedReports(response.data);
      console.log('Generated reports fetched:', response.data);
    } catch (error) {
      console.error('Error fetching generated reports:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleDeleteReport = async (reportId) => {
    setDeleteReportId(reportId);
    setShowDeleteConfirm(true);
  };

  const handleEditReport = (report) => {
    setEditingReport(report);
    setEditTitle(report.title);
    setEditDescription(report.description);
    setEditCategory(report.category);
    setEditPriority(report.priority || 'Medium');
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editDescription.trim()) {
      alert('Title and description are required');
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/admin/reports/${editingReport._id}`, {
        title: editTitle,
        description: editDescription,
        category: editCategory,
        priority: editPriority
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Report updated successfully');
      setEditingReport(null);
      setEditTitle('');
      setEditDescription('');
      setEditCategory('');
      setEditPriority('');
      await fetchAllReports();
    } catch (error) {
      console.error('Error updating report:', error);
      alert(error.response?.data?.message || 'Failed to update report');
    }
  };

  const handleCancelEditReport = () => {
    setEditingReport(null);
    setEditTitle('');
    setEditDescription('');
    setEditCategory('');
    setEditPriority('');
  };

  const confirmDeleteReport = async () => {
    if (!deleteReportId) return;
    
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/admin/reports/${deleteReportId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Refresh reports list
      await fetchAllReports();
      await fetchDashboardStats();
      
      setShowDeleteConfirm(false);
      setDeleteReportId(null);
      
      // Show success message (optional)
      alert('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Error deleting report. Please try again.');
    }
  };

  const cancelDeleteReport = () => {
    setShowDeleteConfirm(false);
    setDeleteReportId(null);
  };

  const fetchAllReports = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAllReports(response.data);
      console.log(`Admin: Fetched ${response.data?.length || 0} reports`);
      // Fallback: derive myReports from allReports using current user
      const user = JSON.parse(localStorage.getItem('user')) || {};
      const uid = user.id || user._id;
      if (uid) {
        const mine = (response.data || []).filter(r => String(r.userId) === String(uid) || r.username === user.username);
        setMyReports(mine);
      }
    } catch (error) {
      console.error('Error fetching all reports:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDetails = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/admin/all-details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAllDetails(response.data);
    } catch (error) {
      console.error('Error fetching all details:', error);
    }
  };


  const fetchContactMessages = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/admin/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Handle both old format (array) and new format (object with contacts array)
      setContactMessages(response.data.contacts || response.data);
    } catch (error) {
      console.error('Error fetching contact messages:', error);
    }
  };

  const deleteContactMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this contact message?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/admin/contacts/${messageId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Refresh the contact messages list
      await fetchContactMessages();
      alert('Contact message deleted successfully!');
    } catch (error) {
      console.error('Error deleting contact message:', error);
      alert('Failed to delete contact message. Please try again.');
    }
  };

  const updateDetails = async (type, userId, payload) => {
    try {
      setSaving(true);
      
      // Validation
      if (payload.fullName && !/^[A-Za-z\s]+$/.test(payload.fullName)) {
        alert('Full Name must contain only alphabets and spaces');
        setSaving(false);
        return;
      }
      
      if (payload.phone) {
        if (!/^\d{10}$/.test(payload.phone)) {
          alert('Phone number must be exactly 10 digits');
          setSaving(false);
          return;
        }
        
        // Check phone uniqueness
        try {
          const validationResponse = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/validate`, {
            phone: payload.phone,
            excludeUserId: userId,
            isWorker: type === 'worker'
          });
          
          if (!validationResponse.data.valid) {
            alert('Error: ' + validationResponse.data.errors.join(', '));
            setSaving(false);
            return;
          }
        } catch (validationError) {
          alert('Validation failed. Please try again.');
          setSaving(false);
          return;
        }
      }
      
      if (payload.email && payload.email.trim()) {
        if (!payload.email.includes('@') || !payload.email.includes('.')) {
          alert('Please enter a valid email address');
          setSaving(false);
          return;
        }
        
        // Check email uniqueness
        try {
          const validationResponse = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/validate`, {
            email: payload.email,
            excludeUserId: userId
          });
          
          if (!validationResponse.data.valid) {
            alert('Error: ' + validationResponse.data.errors.join(', '));
            setSaving(false);
            return;
          }
        } catch (validationError) {
          alert('Validation failed. Please try again.');
          setSaving(false);
          return;
        }
      }
      
      const token = localStorage.getItem('authToken');
      const urlMap = {
        user: `${process.env.REACT_APP_API_BASE_URL}/api/admin/update/userdetails/${userId}`,
        management: `${process.env.REACT_APP_API_BASE_URL}/api/admin/update/managementdetails/${userId}`,
        admin: `${process.env.REACT_APP_API_BASE_URL}/api/admin/update/admindetails/${userId}`,
      };
      await axios.put(urlMap[type], payload, { headers: { 'Authorization': `Bearer ${token}` } });
      await fetchAllDetails();
      alert('Details updated successfully');
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.message || 'Please try again'));
    } finally {
      setSaving(false);
    }
  };

  const fetchUserDetails = async (userId, username) => {
    try {
      const token = localStorage.getItem('authToken');
      // Try to get user details from all possible collections
      const [userResponse] = await Promise.allSettled([
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/admin/all-details`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (userResponse.status === 'fulfilled') {
        const allDetails = userResponse.value.data;
        const user = allDetails.users?.find(u => u._id === userId);
        const userDetails = allDetails.userDetails?.find(d => d.userId === userId);
        const managementDetails = allDetails.managementDetails?.find(d => d.userId === userId);
        const adminDetails = allDetails.adminDetails?.find(d => d.userId === userId);
        const workerDetails = allDetails.workerDetails?.find(d => d.userId === userId);

        setSelectedUserDetails({
          user,
          userDetails,
          managementDetails,
          adminDetails,
          workerDetails,
          username
        });
        setShowUserModal(true);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Failed to fetch user details');
    }
  };

  const deleteUserAccount = async (userId, username) => {
    if (!window.confirm(`Delete account for "${username}"? This cannot be undone.`)) {
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchAllDetails();
      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user.');
    }
  };

  const toggleUserBlockStatus = async (userId, username, isBlocked) => {
    const action = isBlocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} the account for "${username}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/users/${userId}/block`,
        { isBlocked: !isBlocked },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      await fetchAllDetails();
      alert(`User ${username} has been ${!isBlocked ? 'blocked' : 'unblocked'}.`);
    } catch (error) {
      console.error('Error updating user block status:', error);
      alert('Failed to update user block status.');
    }
  };
  //   setFromDate('');
  //   setToDate('');
  //   setSelectedMonth('');
  //   setSelectedWeekDate('');
  //   setSelectedDayDate('');
  // };

  // Calculate dates based on period
  // const calculateDates = () => { // Unused function
  //   let from, to;
  //   // const now = new Date(); // Unused variable

  //   if (period === 'Monthly' && selectedMonth) {
  //     const [year, month] = selectedMonth.split('-');
  //     from = new Date(year, month - 1, 1);
  //     to = new Date(year, month, 0); // Last day of month
  //   } else if (period === 'Weekly' && selectedWeekDate) {
  //     from = new Date(selectedWeekDate);
  //     to = new Date(from);
  //     to.setDate(to.getDate() + 6); // 7 days total (including start date)
  //   } else if (period === 'Daily' && selectedDayDate) {
  //     from = new Date(selectedDayDate);
  //     to = new Date(selectedDayDate);
  //   } else if (period === 'Custom' && fromDate && toDate) {
  //     from = new Date(fromDate);
  //     to = new Date(toDate);
  //   } else {
  //     return null;
  //   }

  //   return { from, to };
  // };

  // Generate New Report
  // const handleGenerateReport = async (e) => { // Unused function
  //   e.preventDefault();
  //   
  //   const dates = calculateDates();
  //   if (!dates) {
  //     setReportMessage('Please select the required date fields');
  //     setTimeout(() => setReportMessage(''), 3000);
  //     return;
  //   }

  //   setGeneratingReport(true);
  //   setReportMessage('');
  //   try {
  //     const user = JSON.parse(localStorage.getItem('user'));
  //     const token = localStorage.getItem('authToken');
  //     await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports`, {
  //       period,
  //       fromDate: dates.from.toISOString(),
  //       toDate: dates.to.toISOString(),
  //       exportType,
  //       generatedBy: user?.username || 'Admin',
  //       generatedById: user?.id || user?._id
  //     }, {
  //       headers: { 'Authorization': `Bearer ${token}` }
  //     });
  //     setReportMessage('Report generated successfully!');
  //     setTimeout(() => setReportMessage(''), 3000);
  //     setPeriod('Weekly');
  //     setFromDate('');
  //     setToDate('');
  //     setSelectedMonth('');
  //     setSelectedWeekDate('');
  //     setSelectedDayDate('');
  //     setExportType('PDF');
  //     await fetchGeneratedReports();
  //   } catch (error) {  
  //     setReportMessage(error.response?.data?.message || 'Error generating report');
  //     setTimeout(() => setReportMessage(''), 3000);
  //   } finally {
  //     setGeneratingReport(false);
  //   }
  // };

  // Delete Generated Report
  // const handleDeleteGeneratedReport = async (reportId) => { // Unused function
  //   if (!window.confirm('Are you sure you want to delete this report?')) return;
  //   try {
  //     const token = localStorage.getItem('authToken');
  //     await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports/${reportId}`, {
  //       headers: { 'Authorization': `Bearer ${token}` }
  //     });
  //     setReportMessage('Report deleted successfully!');
  //     setTimeout(() => setReportMessage(''), 3000);
  //     await fetchGeneratedReports();
  //   } catch (error) {
  //     setReportMessage('Error deleting report');
  //     setTimeout(() => setReportMessage(''), 3000);
  //   }
  // };

  // Regenerate Report (Update)
  // const handleRegenerateReport = async (reportId) => { // Unused function
  //   try {
  //     const token = localStorage.getItem('authToken');
  //     await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports/${reportId}`, {}, {
  //       headers: { 'Authorization': `Bearer ${token}` }
  //     });
  //     setReportMessage('Report regenerated successfully!');
  //     setTimeout(() => setReportMessage(''), 3000);
  //     await fetchGeneratedReports();
  //   } catch (error) {
  //     setReportMessage('Error regenerating report');
  //     setTimeout(() => setReportMessage(''), 3000);
  //   }
  // };

  // Download Report as PDF
  // const handleDownloadPDF = async (reportId, reportIdText) => { // Unused function
  //   try {
  //     const token = localStorage.getItem('authToken');
  //     const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports/${reportId}/download/pdf`, {
  //       headers: { 'Authorization': `Bearer ${token}` },
  //       responseType: 'blob'
  //     });
  //     
  //     // Create download link
  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.setAttribute('download', `${reportIdText}.pdf`);
  //     document.body.appendChild(link);
  //     link.click();
  //     link.remove();
  //     window.URL.revokeObjectURL(url);
  //     
  //     setReportMessage('PDF downloaded successfully!');
  //     setTimeout(() => setReportMessage(''), 3000);
  //   } catch (error) {
  //     setReportMessage('Error downloading PDF');
  //     setTimeout(() => setReportMessage(''), 3000);
  //   }
  // };

  // Download Report as Excel
  // const handleDownloadExcel = async (reportId, reportIdText) => { // Unused function
  //   try {
  //     const token = localStorage.getItem('authToken');
  //     const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports/${reportId}/download/excel`, {
  //       headers: { 'Authorization': `Bearer ${token}` },
  //       responseType: 'blob'
  //     });
  //     
  //     // Create download link
  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.setAttribute('download', `${reportIdText}.xlsx`);
  //     document.body.appendChild(link);
  //     link.click();
  //     link.remove();
  //     window.URL.revokeObjectURL(url);
  //     
  //     setReportMessage('Excel downloaded successfully!');
  //     setTimeout(() => setReportMessage(''), 3000);
  //   } catch (error) {
  //     setReportMessage('Error downloading Excel');
  //     setTimeout(() => setReportMessage(''), 3000);
  //   }
  // };

  const filteredUsers = () => {
    if (!allDetails?.users) return [];
    return allDetails.users.filter(user => {
      // Search term filter
      const matchesSearch = searchTerm === '' || 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.phone && user.phone.includes(searchTerm));
      
      // Role filter
      const matchesRole = profileRoleFilter === 'all' || user.role === profileRoleFilter;
      
      // Status filter (based on whether user is active/blocked)
      const matchesStatus = profileStatusFilter === 'all' || 
        (profileStatusFilter === 'active' && !user.isBlocked) ||
        (profileStatusFilter === 'blocked' && user.isBlocked);
      
      // Profile image filter
      const matchesImage = profileImageFilter === 'all' ||
        (profileImageFilter === 'has-image' && user.profileImage) ||
        (profileImageFilter === 'no-image' && !user.profileImage);
      
      return matchesSearch && matchesRole && matchesStatus && matchesImage;
    });
  };

  const clearAllReportFilters = () => {
    setReportFilter('All');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setDateFilter('all');
    setReportSearchTerm('');
  };

  const clearProfileFilters = () => {
    setProfileRoleFilter('all');
    setProfileStatusFilter('all');
    setProfileImageFilter('all');
    setSearchTerm('');
  };

  const getActiveProfileFilterCount = () => {
    let count = 0;
    if (profileRoleFilter !== 'all') count++;
    if (profileStatusFilter !== 'all') count++;
    if (profileImageFilter !== 'all') count++;
    if (searchTerm !== '') count++;
    return count;
  };

  const getActiveReportFilterCount = () => {
    let count = 0;
    if (reportFilter !== 'All') count++;
    if (priorityFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (dateFilter !== 'all') count++;
    if (reportSearchTerm.trim()) count++;
    return count;
  };

  const toggleUserExpansion = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    // Validate email
    if (!newEmail.includes('@')) {
      setErrorMessage('Email must contain @ symbol');
      return;
    }
    
    try {
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/signup`, {
          username: newUsername,
          password: newPassword,
          email: newEmail,
          role: newRole,
      });
      
      setSuccessMessage(`User "${newUsername}" created successfully!`);
      setNewUsername('');
      setNewPassword('');
      setNewEmail('');
      setNewRole('user');
      
      // Auto-close form after 2 seconds
      setTimeout(() => {
        setShowCreateUserForm(false);
        setSuccessMessage('');
      }, 2000);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Error creating user');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Reported': '#3b82f6',
      'Assigned': '#f59e0b',
      'In Progress': '#6366f1',
      'Completed': '#10b981',
      'Rejected': '#ef4444'
    };
    return colors[status] || '#6b7280';
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Admin Dashboard</h1>
            <p>Full system control - Manage users, monitor all reports, access heatmap, and configure settings</p>
          </div>
          <button 
            onClick={() => { fetchDashboardStats(); fetchAllReports(); fetchContactMessages(); }}
            className="hero-button"
            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '1rem',
        padding: '0.5rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.3) transparent'
      }}>
        {[
          { id: 'dashboard', icon: '📊', label: 'Dashboard' },
          { id: 'manage', icon: '🔧', label: 'Manage' },
          { id: 'reports', icon: '📋', label: 'All Reports' },
          { id: 'master-forms', icon: '⚙️', label: 'Options' },
          { id: 'profiles', icon: '🗂️', label: 'Profiles' },
          { id: 'heatmap', icon: '🗺️', label: 'Heat Map' },
          { id: 'messages', icon: '💬', label: 'Messages' },
          { id: 'your-reports', icon: '📝', label: 'Your Reports' },
          { id: 'analytics', icon: '📈', label: 'Analytics' },
          { id: 'chat', icon: '💬', label: 'Chat' },
          { id: 'database', icon: '🗄️', label: 'Database' }
        ].map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeTab === tab.id 
                ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: activeTab === tab.id ? '600' : '500',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content',
              boxShadow: activeTab === tab.id ? '0 4px 6px rgba(139, 92, 246, 0.3)' : 'none'
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
      {activeTab === 'dashboard' && (
        <>
      {/* Stats Grid */}
      <div className="stats-grid" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{allReports.length || stats?.totalReports || 0}</div>
          <div className="stat-card-label">Total Reports</div>
        </div>

        {Object.entries(stats?.statusCounts || {}).map(([status, count]) => (
          <div className="stat-card" key={status}>
            <div className="stat-card-header">
              <div className="stat-card-icon">
                <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            </div>
            <div className="stat-card-value">{count}</div>
            <div className="stat-card-label">{status}</div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="content-grid">
        {/* Category Distribution Chart */}
        <div className="content-card">
          <div className="content-card-header">
            <h3>Report Categories</h3>
          </div>
          <div className="chart-container">
            {Object.entries(stats?.categoryCounts || {}).map(([category, count]) => {
              const percentage = stats.totalReports > 0 ? (count / stats.totalReports * 100).toFixed(1) : 0;
              return (
                <div key={category} className="chart-bar-item">
                  <div className="chart-bar-label">
                    <span>{category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="chart-bar">
                    <div 
                      className="chart-bar-fill" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: getStatusColor(category)
                      }}
                    ></div>
                  </div>
                  <div className="chart-bar-value">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution Chart */}
        <div className="content-card">
          <div className="content-card-header">
            <h3>Priority Distribution</h3>
          </div>
          <div className="chart-container">
            {Object.entries(stats?.priorityCounts || {}).map(([priority, count]) => {
              const percentage = stats.totalReports > 0 ? (count / stats.totalReports * 100).toFixed(1) : 0;
              const colors = {
                'Low': '#10b981',
                'Medium': '#f59e0b',
                'High': '#ef4444'
              };
              return (
                <div key={priority} className="chart-bar-item">
                  <div className="chart-bar-label">
                    <span>{priority}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="chart-bar">
                    <div 
                      className="chart-bar-fill" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: colors[priority] || '#6b7280'
                      }}
                    ></div>
                  </div>
                  <div className="chart-bar-value">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      {stats?.recentReports && stats.recentReports.length > 0 && (
        <div className="content-card" style={{ marginTop: '2rem' }}>
          <div className="content-card-header">
            <h3>Recent Reports</h3>
            <p>Latest submissions from users</p>
          </div>
          <div className="reports-list">
            {stats.recentReports.map((report) => (
              <div key={report._id} className="report-item">
                <div className="report-item-header">
                  <span className="report-ticket">#{report.ticketNumber}</span>
                  <span className={`status-badge status-${report.status.toLowerCase()}`}>
                    {report.status}
                  </span>
                </div>
                <p className="report-title">{report.title}</p>
                <div className="report-meta">
                  <span>{report.category}</span>
                  <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                  <span><strong>User:</strong> 
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchUserDetails(report.userId, report.username);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        marginLeft: '0.25rem'
                      }}
                    >
                      {report.username}
                    </button>
                  </span>
                  {report.userPriority && (
                    <span style={{ 
                      color: report.userPriority === 'emergency' ? '#dc2626' : 
                            report.userPriority === 'high' ? '#ef4444' : 
                            report.userPriority === 'medium' ? '#f59e0b' : '#10b981',
                      fontWeight: '600'
                    }}>
                      User: {report.userPriority.charAt(0).toUpperCase() + report.userPriority.slice(1)}
                    </span>
                  )}
                </div>
                {report.wasteConditions && report.wasteConditions.length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    <strong>Conditions:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                      {report.wasteConditions.slice(0, 3).map((condition, index) => (
                        <span key={index} style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#93c5fd',
                          padding: '0.125rem 0.25rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.7rem'
                        }}>
                          {condition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                      {report.wasteConditions.length > 3 && (
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                          +{report.wasteConditions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

        </>
      )}

      {activeTab === 'manage' && (
        <TriagePage />
      )}

      {activeTab === 'reports' && (
        <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div className="content-card-header" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>All Reports</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>View and manage all submitted reports</p>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                Showing {(() => {
                  let count = allReports.length;
                  if (reportFilter !== 'All') {
                    count = allReports.filter(r => r.status === reportFilter).length;
                  }
                  if (reportSearchTerm.trim()) {
                    const searchLower = reportSearchTerm.toLowerCase();
                    const filtered = allReports.filter(report => 
                      report.title?.toLowerCase().includes(searchLower) ||
                      report.description?.toLowerCase().includes(searchLower) ||
                      report.ticketNumber?.toLowerCase().includes(searchLower) ||
                      report.username?.toLowerCase().includes(searchLower)
                    );
                    count = reportFilter !== 'All' 
                      ? filtered.filter(r => r.status === reportFilter).length 
                      : filtered.length;
                  }
                  return count;
                })()} of {allReports.length} reports
              </div>
            </div>
          </div>
          
          {/* Professional Compact Search Box */}
          <div style={{ 
            padding: '1.5rem', 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.03)'
          }}>            
            <div style={{ 
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Compact Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                  }}>
                    <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                  </div>
                  <h4 style={{ 
                    margin: 0, 
                    color: 'white', 
                    fontSize: '1.125rem', 
                    fontWeight: '600'
                  }}>
                    Search Reports
                  </h4>
                </div>
                
                {reportSearchTerm && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      background: 'rgba(37, 99, 235, 0.15)',
                      border: '1px solid rgba(37, 99, 235, 0.3)',
                      color: '#93c5fd',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {(() => {
                        const searchLower = reportSearchTerm.toLowerCase();
                        const filtered = allReports.filter(report => 
                          report.title?.toLowerCase().includes(searchLower) ||
                          report.description?.toLowerCase().includes(searchLower) ||
                          report.ticketNumber?.toLowerCase().includes(searchLower) ||
                          report.username?.toLowerCase().includes(searchLower)
                        );
                        return `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Compact Search Input */}
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Search by title, description, ticket number, username, or category..."
                  value={reportSearchTerm}
                  onChange={(e) => setReportSearchTerm(e.target.value)}
                  className="form-input"
                  style={{ 
                    width: '100%', 
                    maxWidth: '100%',
                    fontSize: '1rem',
                    padding: '0.875rem 1rem',
                    paddingLeft: '2.75rem',
                    paddingRight: reportSearchTerm ? '3rem' : '1rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    minHeight: '2.75rem',
                    fontWeight: '400',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)';
                    e.target.style.background = 'rgba(0, 0, 0, 0.35)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    e.target.style.background = 'rgba(0, 0, 0, 0.25)';
                  }}
                />
                
                {/* Compact Search Icon */}
                <svg 
                  width="16" 
                  height="16" 
                  fill="currentColor" 
                  viewBox="0 0 24 24" 
                  style={{ 
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    pointerEvents: 'none'
                  }}
                >
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                
                {/* Compact Clear Button */}
                {reportSearchTerm && (
                  <button
                    onClick={() => setReportSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    title="Clear search"
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                  >
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Compact Search Info */}
              {reportSearchTerm && (
                <div style={{ 
                  marginTop: '0.75rem',
                  fontSize: '0.875rem', 
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Searching for: "{reportSearchTerm}"
                  </div>
                  <button
                    onClick={() => setReportSearchTerm('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      textDecoration: 'underline',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#ef4444';
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Filter Section */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            {/* Filter Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h4 style={{ color: 'white', margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                  🔍 Filter Reports
                </h4>
                {getActiveReportFilterCount() > 0 && (
                  <span style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {getActiveReportFilterCount()} active
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  style={{
                    background: showAdvancedFilters 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
                  </svg>
                  Advanced Filters
                </button>
                
                {getActiveReportFilterCount() > 0 && (
                  <button
                    onClick={clearAllReportFilters}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      border: 'none',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ 
              padding: '1rem 1.5rem',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: showAdvancedFilters ? '0' : '1rem'
            }}>
              {['All', 'Reported', 'Assigned', 'In Progress', 'Completed', 'Rejected'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setReportFilter(filter)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: reportFilter === filter 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: reportFilter === filter ? '600' : '400',
                    transition: 'all 0.3s ease',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => {
                    if (reportFilter !== filter) {
                      e.target.style.background = 'rgba(255,255,255,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (reportFilter !== filter) {
                      e.target.style.background = 'rgba(255,255,255,0.1)';
                    }
                  }}
                >
                  {filter === 'All' ? `All (${allReports.length})` : 
                   `${filter} (${allReports.filter(r => r.status === filter).length})`}
                </button>
              ))}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                padding: '1rem 1.5rem',
                background: 'rgba(255,255,255,0.03)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                marginBottom: '1rem'
              }}>
                {/* Priority Filter */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: '#d1d5db' 
                  }}>
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="all">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: '#d1d5db' 
                  }}>
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="all">All Categories</option>
                    <option value="overflowing_bin">Overflowing Bin</option>
                    <option value="illegal_dumping">Illegal Dumping</option>
                    <option value="uncollected_garbage">Uncollected Garbage</option>
                    <option value="broken_bin">Broken Bin</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: '#d1d5db' 
                  }}>
                    Date Range
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="reports-list">
            {(() => {
              let filteredReports = allReports;
              
              // Apply status filter
              if (reportFilter !== 'All') {
                filteredReports = filteredReports.filter(report => report.status === reportFilter);
              }
              
              // Apply priority filter
              if (priorityFilter !== 'all') {
                filteredReports = filteredReports.filter(report => (report.priority || 'Medium') === priorityFilter);
              }
              
              // Apply category filter
              if (categoryFilter !== 'all') {
                filteredReports = filteredReports.filter(report => report.category === categoryFilter);
              }
              
              // Apply date filter
              if (dateFilter !== 'all') {
                const now = new Date();
                
                filteredReports = filteredReports.filter(report => {
                  const reportDate = new Date(report.timestamp);
                  switch (dateFilter) {
                    case 'today':
                      return reportDate.toDateString() === now.toDateString();
                    case 'week':
                      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      return reportDate >= weekAgo;
                    case 'month':
                      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      return reportDate >= monthAgo;
                    default:
                      return true;
                  }
                });
              }
              
              // Apply search filter
              if (reportSearchTerm.trim()) {
                const searchLower = reportSearchTerm.toLowerCase();
                filteredReports = filteredReports.filter(report => 
                  report.title?.toLowerCase().includes(searchLower) ||
                  report.description?.toLowerCase().includes(searchLower) ||
                  report.ticketNumber?.toLowerCase().includes(searchLower) ||
                  report.username?.toLowerCase().includes(searchLower)
                );
              }
              
              return filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                <div key={report._id} className="report-item">
                  <div className="report-item-header">
                    <span className="report-ticket">#{report.ticketNumber}</span>
                    <span className={`status-badge status-${report.status.toLowerCase()}`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="report-title">{report.title}</p>
                  <div className="report-meta">
                    <span><strong>Category:</strong> {report.category.replace(/_/g, ' ')}</span>
                    <span><strong>Priority:</strong> {report.priority || 'Medium'}</span>
                    <span><strong>Date:</strong> {new Date(report.timestamp).toLocaleDateString()}</span>
                    <span><strong>User:</strong> 
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchUserDetails(report.userId, report.username);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          marginLeft: '0.25rem'
                        }}
                      >
                        {report.username}
                      </button>
                    </span>
                  </div>
                  <p className="report-description">{report.description}</p>
                  {(report.photoPath || report.completionPhotoPath) && (
                    <div className="report-photo" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {report.photoPath && (
                        <div style={{ flex: report.completionPhotoPath ? '1' : 'auto', minWidth: '200px' }}>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: '600', 
                            color: '#60a5fa', 
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            📸 Original Report
                          </div>
                          <img 
                            src={report.photoPath.startsWith('http') ? report.photoPath : `${process.env.REACT_APP_API_BASE_URL}${report.photoPath}`} 
                            alt="Report" 
                            style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '0.5rem', cursor: 'pointer' }}
                            onClick={() => {
                              setSelectedImage({ url: report.photoPath.startsWith('http') ? report.photoPath : `${process.env.REACT_APP_API_BASE_URL}${report.photoPath}`, title: 'Original Report Photo' });
                              setImageModalOpen(true);
                            }}
                          />
                        </div>
                      )}
                      {report.completionPhotoPath && (
                        <div style={{ flex: report.photoPath ? '1' : 'auto', minWidth: '200px' }}>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: '600', 
                            color: '#34d399', 
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            ✅ Completed
                          </div>
                          <img 
                            src={report.completionPhotoPath.startsWith('http') ? report.completionPhotoPath : `${process.env.REACT_APP_API_BASE_URL}${report.completionPhotoPath}`} 
                            alt="Completion" 
                            style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '0.5rem', cursor: 'pointer' }}
                            onClick={() => {
                              setSelectedImage({ url: report.completionPhotoPath.startsWith('http') ? report.completionPhotoPath : `${process.env.REACT_APP_API_BASE_URL}${report.completionPhotoPath}`, title: 'Completion Photo' });
                              setImageModalOpen(true);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Edit and Delete Buttons */}
                  {editingReport?._id === report._id ? (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '0.5rem' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>Title:</label>
                        <input 
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="form-input"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>Description:</label>
                        <textarea 
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="form-input"
                          rows="3"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>Category:</label>
                          <select 
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="form-select"
                            style={{ width: '100%' }}
                          >
                            <option value="" disabled>Select a category</option>
                            {categories.map(cat => (
                              <option key={cat._id} value={cat.value.trim()}>
                                {cat.value.trim().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>Priority:</label>
                          <select 
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value)}
                            className="form-select"
                            style={{ width: '100%' }}
                          >
                            <option value="" disabled>Select a priority</option>
                            {priorities.map(pri => (
                              <option key={pri._id} value={pri.value.trim()}>
                                {pri.value.trim()}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                          }}
                        >
                          💾 Save Changes
                        </button>
                        <button
                          onClick={handleCancelEditReport}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                          }}
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEditReport(report)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: 'none',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.3)';
                        }}
                      >
                        <span>✏️</span>
                        <span>Edit Report</span>
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report._id)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: 'none',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)';
                        }}
                      >
                        <span>🗑️</span>
                        <span>Delete Report</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                {reportSearchTerm.trim() || reportFilter !== 'All' 
                  ? 'No reports match your filters' 
                  : 'No reports found'}
              </div>
            );
            })()}
          </div>
        </div>
      )}

      {activeTab === 'master-forms' && (
        <div className="master-forms-container">
          {optionsMessage && (
            <div style={{ 
              padding: '1rem', 
              marginBottom: '1.5rem', 
              background: optionsMessage.includes('Error') || optionsMessage.includes('select') || optionsMessage.includes('enter') ? '#ef4444' : '#10b981', 
              color: '#fff', 
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              {optionsMessage}
            </div>
          )}
          <div className="forms-grid">
            {/* Master Form 1: Manage Categories */}
            <div className="form-card">
              <div className="form-card-header">
                <h3>📂 Manage Categories</h3>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0.5rem 0 0 0' }}>
                  Configure report categories
                </p>
              </div>
              <div className="form-card-content">
                <label>Existing Categories ({categories.length})</label>
                <select 
                  className="form-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">-- Select to Edit/Delete --</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
                <label>{editingCategory ? 'Edit Category Name' : 'New Category Name'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter category name" 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (editingCategory ? handleUpdateOption('category', editingCategory, newCategory) : handleAddOption('category', newCategory))}
                />
                <div className="form-actions">
                  {editingCategory ? (
                    <>
                      <button 
                        className="hero-button"
                        onClick={() => handleUpdateOption('category', editingCategory, newCategory)}
                      >
                        Update Category
                      </button>
                      <button 
                        className="hero-button" 
                        style={{ backgroundColor: '#6b7280' }}
                        onClick={() => handleCancelEdit('category')}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="hero-button"
                        onClick={() => handleAddOption('category', newCategory)}
                        style={{ 
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                      >
                        Add Category
                      </button>
                      <button 
                        className="hero-button" 
                        style={{ 
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                        onClick={() => handleEditOption('category', selectedCategory)}
                      >
                        Edit Selected
                      </button>
                      <button 
                        className="hero-button" 
                        style={{ 
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                        onClick={() => handleDeleteOption('category', selectedCategory)}
                      >
                        Delete Selected
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Master Form 2: Manage Priorities */}
            <div className="form-card">
              <div className="form-card-header">
                <h3>⚡ Manage Priorities</h3>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0.5rem 0 0 0' }}>
                  Configure priority levels
                </p>
              </div>
              <div className="form-card-content">
                <label>Existing Priorities ({priorities.length})</label>
                <select 
                  className="form-select"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                >
                  <option value="">-- Select to Edit/Delete --</option>
                  {priorities.map((pri) => (
                    <option key={pri._id} value={pri._id}>
                      {pri.value}
                    </option>
                  ))}
                </select>
                <label>{editingPriority ? 'Edit Priority Name' : 'New Priority Name'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter priority name"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (editingPriority ? handleUpdateOption('priority', editingPriority, newPriority) : handleAddOption('priority', newPriority))}
                />
                <div className="form-actions">
                  {editingPriority ? (
                    <>
                      <button 
                        className="hero-button"
                        onClick={() => handleUpdateOption('priority', editingPriority, newPriority)}
                      >
                        Update Priority
                      </button>
                      <button 
                        className="hero-button" 
                        style={{ backgroundColor: '#6b7280' }}
                        onClick={() => handleCancelEdit('priority')}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="hero-button"
                        onClick={() => handleAddOption('priority', newPriority)}
                        style={{ 
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                      >
                        Add Priority
                      </button>
                      <button 
                        className="hero-button" 
                        style={{ 
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                        onClick={() => handleEditOption('priority', selectedPriority)}
                      >
                        Edit Selected
                      </button>
                      <button 
                        className="hero-button" 
                        style={{ 
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                        onClick={() => handleDeleteOption('priority', selectedPriority)}
                      >
                        Delete Selected
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Master Form 3: Manage Status */}
            <div className="form-card">
              <div className="form-card-header">
                <h3>📋 Manage Status</h3>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0.5rem 0 0 0' }}>
                  Configure status workflow
                </p>
              </div>
              <div className="form-card-content">
                <label>Existing Status ({statuses.length})</label>
                <select 
                  className="form-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">-- Select to Edit/Delete --</option>
                  {statuses.map((stat) => (
                    <option key={stat._id} value={stat._id}>
                      {stat.value}
                    </option>
                  ))}
                </select>
                <label>{editingStatus ? 'Edit Status Name' : 'New Status Name'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter status name"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (editingStatus ? handleUpdateOption('status', editingStatus, newStatus) : handleAddOption('status', newStatus))}
                />
                <div className="form-actions">
                  {editingStatus ? (
                    <>
                      <button 
                        className="hero-button"
                        onClick={() => handleUpdateOption('status', editingStatus, newStatus)}
                      >
                        Update Status
                      </button>
                      <button 
                        className="hero-button" 
                        style={{ backgroundColor: '#6b7280' }}
                        onClick={() => handleCancelEdit('status')}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="hero-button"
                        onClick={() => handleAddOption('status', newStatus)}
                        style={{ 
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                      >
                        Add Status
                      </button>
                      <button 
                        className="hero-button" 
                        style={{ 
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                        onClick={() => handleEditOption('status', selectedStatus)}
                      >
                        Edit Selected
                      </button>
                      <button 
                        className="hero-button" 
                        style={{ 
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                        onClick={() => handleDeleteOption('status', selectedStatus)}
                      >
                        Delete Selected
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {activeTab === 'profiles' && (
        <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div className="content-card-header" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>User Profiles</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>View and manage all user accounts</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  onClick={() => setShowCreateUserForm(!showCreateUserForm)}
                  className="hero-button"
                  style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                >
                  {showCreateUserForm ? '❌ Close Form' : '➕ Create New User'}
                </button>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  {allDetails?.users?.length || 0} total users
                </div>
              </div>
            </div>
          </div>
          
          {/* Create User Form */}
          {showCreateUserForm && (
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(102, 126, 234, 0.05)' }}>
              <h4 style={{ marginBottom: '1rem', color: '#fff' }}>👥 Create New User</h4>
              <form onSubmit={handleCreateUser} className="admin-form">
                {successMessage && (
                  <div className="success-message">{successMessage}</div>
                )}
                {errorMessage && (
                  <div className="error-message">{errorMessage}</div>
                )}
            
                <div className="form-group">
                  <label>Username:</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    className="form-input"
                    placeholder="Enter username"
                  />
                </div>

                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="form-input"
                    placeholder="Enter email address"
                    pattern=".+@.+"
                    title="Email must include @ symbol"
                  />
                </div>

                <div className="form-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="form-input"
                    placeholder="Enter password"
                  />
                </div>

                <div className="form-group">
                  <label>Role:</label>
                  <select 
                    value={newRole} 
                    onChange={(e) => setNewRole(e.target.value)}
                    className="form-select"
                  >
                    <option value="user">User</option>
                    <option value="worker">Worker</option>
                    <option value="management">Management</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
            
                <button type="submit" className="hero-button" style={{ width: '100%' }}>
                  Create User
                </button>
              </form>
            </div>
          )}
          
          {/* Search Bar */}
          <div style={{ marginBottom: '2rem' }}>
            <input
              type="text"
              placeholder="Search by username, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #4b5563',
                background: 'rgba(0, 0, 0, 0.3)',
                color: 'white',
                fontSize: '1rem',
                lineHeight: 1.25,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {!allDetails ? (
            <div style={{ color: 'white' }}>Loading profiles...</div>
          ) : (
            <div className="user-reports-list">
              {/* Profile Filters Section */}
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '0.5rem', 
                marginBottom: '1rem',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🔍 Profile Filters
                    {getActiveProfileFilterCount() > 0 && (
                      <span style={{
                        background: '#3b82f6',
                        color: 'white',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {getActiveProfileFilterCount()} active
                      </span>
                    )}
                  </h4>
                  {getActiveProfileFilterCount() > 0 && (
                    <button
                      onClick={clearProfileFilters}
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {/* Role Filter */}
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>Role</label>
                    <select
                      value={profileRoleFilter}
                      onChange={(e) => setProfileRoleFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: '#374151',
                        border: '1px solid #4b5563',
                        borderRadius: '0.375rem',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="all">All Roles</option>
                      <option value="user">User</option>
                      <option value="management">Management</option>
                      <option value="admin">Admin</option>
                      <option value="worker">Worker</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>Status</label>
                    <select
                      value={profileStatusFilter}
                      onChange={(e) => setProfileStatusFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: '#374151',
                        border: '1px solid #4b5563',
                        borderRadius: '0.375rem',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>

                  {/* Profile Image Filter */}
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>Profile Image</label>
                    <select
                      value={profileImageFilter}
                      onChange={(e) => setProfileImageFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: '#374151',
                        border: '1px solid #4b5563',
                        borderRadius: '0.375rem',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="all">All Images</option>
                      <option value="has-image">Has Image</option>
                      <option value="no-image">No Image</option>
                    </select>
                  </div>

                  {/* Search Filter */}
                  <div>
                    <label style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>Search</label>
                    <input
                      type="text"
                      placeholder="Search by name, email, phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: '#374151',
                        border: '1px solid #4b5563',
                        borderRadius: '0.375rem',
                        color: 'white',
                        fontSize: '0.875rem',
                        placeholderColor: '#9ca3af'
                      }}
                    />
                  </div>
                </div>
              </div>

              <h4 style={{ color: 'white' }}>Accounts ({filteredUsers().length})</h4>
              {filteredUsers().map((u) => (
                <div key={u._id} className="user-report-item">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                      {u.profileImage ? (
                        <img 
                          src={u.profileImage.startsWith('http') ? u.profileImage : `${process.env.REACT_APP_API_BASE_URL}${u.profileImage}`} 
                          alt="Profile" 
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            objectFit: 'cover',
                            border: '2px solid #4b5563',
                            flexShrink: 0
                          }} 
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#9ca3af',
                          fontSize: '16px',
                          flexShrink: 0
                        }}>
                          👤
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '600', color: 'white', cursor: 'pointer', textAlign: 'left' }} 
                             onClick={() => toggleUserExpansion(u._id)}>
                          {u.username} {expandedUser === u._id ? '▼' : '▶'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#9ca3af', textAlign: 'left', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>{u.email || '-'}</span>
                          <span>• {u.role}</span>
                          <span
                            style={{
                              padding: '0.125rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: u.isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: u.isBlocked ? '#f87171' : '#6ee7b7',
                              border: `1px solid ${u.isBlocked ? '#ef4444' : '#10b981'}`
                            }}
                          >
                            {u.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        className="hero-button"
                        title={u.isBlocked ? 'Unblock user' : 'Block user'}
                        onClick={() => toggleUserBlockStatus(u._id, u.username, u.isBlocked)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.875rem',
                          minWidth: 'auto',
                          width: 'auto',
                          whiteSpace: 'nowrap',
                          background: u.isBlocked
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                      >
                        {u.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                      <button 
                        className="delete-button"
                        title="Delete account"
                        onClick={() => deleteUserAccount(u._id, u.username)}
                        style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                      >
                        🗑️ Delete
                      </button>
                      <button 
                        className="hero-button"
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          fontSize: '0.875rem', 
                          minWidth: 'auto', 
                          width: 'auto',
                          whiteSpace: 'nowrap',
                          background: editUserId === u._id ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                        title={editUserId === u._id ? 'Stop editing' : 'Edit details'}
                        onClick={() => setEditUserId(editUserId === u._id ? null : u._id)}
                      >
                        {editUserId === u._id ? 'Done' : 'Edit'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded User Details */}
                  {expandedUser === u._id && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '1rem', 
                      background: 'rgba(0, 0, 0, 0.2)', 
                      borderRadius: '0.5rem',
                      border: '1px solid #4b5563'
                    }}>
                      <h5 style={{ color: 'white' }}>Full Details</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div><strong>Username:</strong> {u.username}</div>
                        <div><strong>Email:</strong> {u.email || '-'}</div>
                        <div><strong>Type:</strong> {u.role}</div>
                        <div><strong>Profile Image:</strong> {u.profileImage ? '✅ Uploaded' : '❌ Not uploaded'}</div>
                      </div>
                      
                      {/* Role-specific details */}
                      {u.role === 'user' && allDetails.userDetails?.find(d => d.userId === u._id) && (
                        <div style={{ marginTop: '1rem' }}>
                          <h6 style={{ color: '#3b82f6' }}>User Details:</h6>
                          {(() => {
                            const details = allDetails.userDetails.find(d => d.userId === u._id);
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                              <div><strong>Full Name:</strong> {editUserId === u._id ? (
                                <input defaultValue={details.fullName} pattern="[A-Za-z\s]+" title="Alphabets and spaces only" onBlur={(e)=>updateDetails('user', u._id, { fullName: e.target.value })} />
                              ) : details.fullName}</div>
                              <div><strong>Address:</strong> {editUserId === u._id ? (
                                <input defaultValue={details.address} onBlur={(e)=>updateDetails('user', u._id, { address: e.target.value })} />
                              ) : details.address}</div>
                              <div><strong>Phone:</strong> {editUserId === u._id ? (
                                <input type="tel" defaultValue={details.phone || ''} pattern="\d{10}" maxLength="10" inputMode="numeric" title="10 digits only" onBlur={(e)=>updateDetails('user', u._id, { phone: e.target.value })} />
                              ) : (details.phone || '-')}</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      
                      {u.role === 'management' && allDetails.managementDetails?.find(d => d.userId === u._id) && (
                        <div style={{ marginTop: '1rem' }}>
                          <h6 style={{ color: '#3b82f6' }}>Management Details:</h6>
                          {(() => {
                            const details = allDetails.managementDetails.find(d => d.userId === u._id);
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                              <div><strong>Full Name:</strong> {editUserId === u._id ? (
                                <input defaultValue={details.fullName} pattern="[A-Za-z\s]+" title="Alphabets and spaces only" onBlur={(e)=>updateDetails('management', u._id, { fullName: e.target.value })} />
                              ) : details.fullName}</div>
                              <div><strong>Role:</strong> {editUserId === u._id ? (
                                <input defaultValue={details.roleInManagement} onBlur={(e)=>updateDetails('management', u._id, { roleInManagement: e.target.value })} />
                              ) : details.roleInManagement}</div>
                              <div><strong>Address:</strong> {editUserId === u._id ? (
                                <input defaultValue={details.address} onBlur={(e)=>updateDetails('management', u._id, { address: e.target.value })} />
                              ) : details.address}</div>
                              <div><strong>Phone:</strong> {editUserId === u._id ? (
                                <input type="tel" defaultValue={details.phone || ''} pattern="\d{10}" maxLength="10" inputMode="numeric" title="10 digits only" onBlur={(e)=>updateDetails('management', u._id, { phone: e.target.value })} />
                              ) : (details.phone || '-')}</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      
                      {u.role === 'admin' && allDetails.adminDetails?.find(d => d.userId === u._id) && (
                        <div style={{ marginTop: '1rem' }}>
                          <h6 style={{ color: '#3b82f6' }}>Admin Details:</h6>
                          {(() => {
                            const details = allDetails.adminDetails.find(d => d.userId === u._id);
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                              <div><strong>Full Name:</strong> {editUserId === u._id ? (
                                <input defaultValue={details.fullName} pattern="[A-Za-z\s]+" title="Alphabets and spaces only" onBlur={(e)=>updateDetails('admin', u._id, { fullName: e.target.value })} />
                              ) : details.fullName}</div>
                              <div><strong>Role:</strong> {editUserId === u._id ? (
                                <input defaultValue={details.roleTitle} onBlur={(e)=>updateDetails('admin', u._id, { roleTitle: e.target.value })} />
                              ) : details.roleTitle}</div>
                              <div><strong>Address:</strong> {editUserId === u._id ? (
                                <input defaultValue={details.address} onBlur={(e)=>updateDetails('admin', u._id, { address: e.target.value })} />
                              ) : details.address}</div>
                              <div><strong>Phone:</strong> {editUserId === u._id ? (
                                <input type="tel" defaultValue={details.phone || ''} pattern="\d{10}" maxLength="10" inputMode="numeric" title="10 digits only" onBlur={(e)=>updateDetails('admin', u._id, { phone: e.target.value })} />
                              ) : (details.phone || '-')}</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      
                      {u.role === 'worker' && allDetails.workerDetails?.find(d => d.userId === u._id) && (
                        <div style={{ marginTop: '1rem' }}>
                          <h6 style={{ color: '#3b82f6' }}>Worker Details:</h6>
                          {(() => {
                            const details = allDetails.workerDetails.find(d => d.userId === u._id);
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                <div><strong>Full Name:</strong> {details.fullName}</div>
                                <div><strong>Worker Code:</strong> {details.workerCode}</div>
                                <div><strong>Department:</strong> {details.department || '-'}</div>
                                <div><strong>Address:</strong> {details.address}</div>
                                <div><strong>Phone:</strong> {details.phone || '-'}</div>
                                <div><strong>Status:</strong> {details.currentStatus || 'available'}</div>
                                <div><strong>Pending Jobs:</strong> {details.pendingJobs?.length || 0}</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Combined into Accounts above; inline editing enabled via Edit button */}
              {saving && <div style={{ color: 'white' }}>Saving...</div>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div className="content-card-header" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>🗺️ Interactive Heat Map</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Visualize report clusters and hotspots on the map</p>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                {heatMapReports.length} locations
              </div>
            </div>
          </div>
          <HeatMap 
            reports={heatMapReports} 
            userRole="admin"
            onReportClick={(report) => {
              // Fallback for non-admin users (not used in admin context)
              console.log('Report clicked:', report);
            }}
          />
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="content-card">
          <div className="content-card-header">
            <h3>💬 Shared Messages</h3>
            <p>View conversations shared with admin</p>
          </div>
          <ChatSystem currentUser={JSON.parse(localStorage.getItem('user'))} />
        </div>
      )}

      {activeTab === 'database' && (
        <DatabasePage />
      )}

      {activeTab === 'messages' && (
        <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div className="content-card-header" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>💬 Contact Messages</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Messages from users via the contact form</p>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                {contactMessages.length} messages
              </div>
            </div>
          </div>
          <div className="contact-messages-list">
            {contactMessages.length > 0 ? (
              contactMessages.map((message) => (
                <div key={message._id} className="contact-message-item">
                  <div className="contact-message-header">
                    <div className="contact-message-meta">
                      <div className="contact-info-row">
                        <span className="contact-name">{message.name}</span>
                        <span className={`status-badge status-${message.status || 'new'}`}>
                          {message.status || 'new'}
                        </span>
                        <span className={`priority-badge priority-${message.priority || 'medium'}`}>
                          {message.priority || 'medium'}
                        </span>
                        <span className={`recipient-badge recipient-${message.recipientType || 'general'}`}>
                          {message.recipientType || 'general'}
                        </span>
                        <button 
                          onClick={() => deleteContactMessage(message._id)}
                          className="delete-button"
                          title="Delete message"
                        >
                          🗑️
                        </button>
                      </div>
                      <span className="contact-email">{message.email}</span>
                      <span className="contact-date">
                        {new Date(message.timestamp).toLocaleDateString()} at {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div className="contact-message-content">
                    <h4 className="contact-subject">{message.subject}</h4>
                    <p className="contact-message-text">{message.message}</p>
                    {message.adminNotes && (
                      <div className="admin-notes">
                        <strong>Admin Notes:</strong>
                        <p>{message.adminNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                No contact messages found
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'your-reports' && (
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
              <div className="stat-card-value">{myReports.length}</div>
              <div className="stat-card-label">Total Reports</div>
            </div>

            {['Reported', 'Assigned', 'In Progress', 'Completed', 'Rejected'].map((status) => {
              const count = myReports.filter(r => r.status === status).length;
              return (
                <div className="stat-card" key={status}>
                  <div className="stat-card-header">
                    <div className="stat-card-icon">
                      <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                  </div>
                  <div className="stat-card-value">{count}</div>
                  <div className="stat-card-label">{status}</div>
                </div>
              );
            })}
          </div>

          {/* Reports List */}
          <div className="content-card">
            <div className="content-card-header">
              <h3>Your Reports</h3>
              <p>Reports you have personally submitted to the system</p>
            </div>
            {myReports.length > 0 ? (
              <div className="user-reports-list">
                {myReports.map((report) => (
                  <div key={report._id} className="user-report-item">
                    <div className="user-report-header">
                      <div className="report-info">
                        <h4>#{report.ticketNumber}</h4>
                        <span 
                          className="status-badge" 
                          style={{ backgroundColor: getStatusColor(report.status) }}
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
                        <strong>Priority:</strong>
                        <span>{report.priority || 'Medium'}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Location:</strong>
                        <span>{report.location?.address || 'N/A'}</span>
                      </div>
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
                    
                    <div className="report-actions">
                      <button 
                        className="hero-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(report);
                        }}
                        disabled={report.status !== 'Reported'}
                        title={report.status !== 'Reported' ? 'Can only edit reports with "Reported" status' : 'Edit this report'}
                        style={{ 
                          background: report.status !== 'Reported' ? '#6b7280' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        Edit Report
                      </button>
                      <button 
                        className="delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(report);
                        }}
                        disabled={report.status !== 'Reported'}
                        title={report.status !== 'Reported' ? 'Can only delete reports with "Reported" status' : 'Delete this report'}
                        style={{ 
                          background: report.status !== 'Reported' ? '#6b7280' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        Delete Report
                      </button>
                    </div>
                    
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                <svg fill="currentColor" viewBox="0 0 24 24" width="64" height="64" style={{ opacity: 0.3, margin: '0 auto' }}>
                  <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM4 19V8h5.13C9.2 8.39 9 8.94 9 9.5v.5H7v2h2v2H7v2h2v2H7v2h4.5c.56 0 1.11.2 1.5.37V19H4z"/>
                </svg>
                <h3>No reports yet</h3>
                <p>You haven't submitted any reports yet</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <>
          {analytics ? (
            <>
              {/* System Overview */}
              <div className="stats-grid" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="stat-card">
                  <div className="stat-card-value">{analytics.totalReports}</div>
                  <div className="stat-card-label">Total Reports</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{analytics.totalUsers}</div>
                  <div className="stat-card-label">Total Users</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{analytics.completed}</div>
                  <div className="stat-card-label">Completed</div>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                {/* Report Status Distribution */}
                <div className="content-card">
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
                      <div style={{ maxWidth: '350px', margin: '0 auto' }}>
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
                              legend: { position: 'bottom', labels: { color: '#fff', font: { size: 12 } } },
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

                {/* User Role Distribution */}
                <div className="content-card">
                  <div className="content-card-header">
                    <h3>👥 User Distribution</h3>
                  </div>
                  <div style={{ padding: '2.5rem' }}>
                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                      <Doughnut
                        data={{
                          labels: ['Users', 'Workers', 'Management', 'Admins'],
                          datasets: [{
                            data: [analytics.users, analytics.workers, analytics.management, analytics.admins],
                            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                            borderColor: ['#2563eb', '#059669', '#d97706', '#dc2626'],
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

              {/* Category and Priority Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                {/* Category Breakdown */}
                <div className="content-card">
                  <div className="content-card-header">
                    <h3>🗂️ Reports by Category</h3>
                  </div>
                  <div style={{ padding: '2.5rem' }}>
                    <div style={{ maxWidth: '450px', margin: '0 auto' }}>
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

                {/* Priority Breakdown */}
                <div className="content-card">
                  <div className="content-card-header">
                    <h3>⚡ Reports by Priority</h3>
                  </div>
                  <div style={{ padding: '2.5rem' }}>
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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
              </div>

              {/* Activity Trend */}
              <div className="content-card" style={{ marginTop: '2rem' }}>
                <div className="content-card-header">
                  <h3>📈 Last 30 Days Activity</h3>
                </div>
                <div style={{ padding: '2.5rem' }}>
                  <div className="stats-grid" style={{ marginBottom: '2rem', gap: '1rem' }}>
                    <div className="stat-card">
                      <div className="stat-card-value">{analytics.recentReports}</div>
                      <div className="stat-card-label">Reports Submitted</div>
                    </div>
                  </div>
                  {Object.keys(analytics.reportsByDate).length > 0 ? (
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Line
                        data={{
                          labels: Object.keys(analytics.reportsByDate).sort().map(date => 
                            new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          ),
                          datasets: [{
                            label: 'Reports Created',
                            data: Object.keys(analytics.reportsByDate).sort().map(date => analytics.reportsByDate[date]),
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
                      No reports in the last 30 days
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

      {/* Edit and Delete Modals - Always available */}
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
              onClick={() => {
                setEditModalOpen(false);
                setEditTitle('');
                setEditDescription('');
                setEditCategory('');
                setEditWasteConditions([]);
                setEditUserPriority('medium');
                setEditWasteAmount(50);
              }}
              style={{
                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
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
            <button className="hero-button" onClick={()=>setDeleteModalOpen(false)}>Cancel</button>
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

      {/* Delete Confirmation Modal for All Reports */}
      {showDeleteConfirm && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={cancelDeleteReport}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              padding: '2rem',
              borderRadius: '1rem',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '1.25rem', 
              fontWeight: '600',
              color: '#fff'
            }}>
              ⚠️ Delete Report
            </h3>
            <p style={{ 
              margin: '0 0 1.5rem 0', 
              color: '#9ca3af',
              fontSize: '0.875rem'
            }}>
              Are you sure you want to permanently delete this report? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelDeleteReport}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteReport}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)';
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* User Details Modal */}
      {showUserModal && selectedUserDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            background: '#1f2937',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid #4b5563'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'white', margin: 0 }}>User Details: {selectedUserDetails.username}</h3>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Basic User Info */}
              <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '0.5rem' }}>
                <h4 style={{ color: '#3b82f6', marginBottom: '1rem' }}>Basic Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  <div><strong>Username:</strong> {selectedUserDetails.user?.username || selectedUserDetails.username}</div>
                  <div><strong>Email:</strong> {selectedUserDetails.user?.email || '-'}</div>
                  <div><strong>Role:</strong> {selectedUserDetails.user?.role || '-'}</div>
                  <div><strong>Profile Image:</strong> {selectedUserDetails.user?.profileImage ? '✅ Uploaded' : '❌ Not uploaded'}</div>
                </div>
                {selectedUserDetails.user?.profileImage && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <img 
                      src={selectedUserDetails.user.profileImage.startsWith('http') ? selectedUserDetails.user.profileImage : `${process.env.REACT_APP_API_BASE_URL}${selectedUserDetails.user.profileImage}`} 
                      alt="Profile" 
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '2px solid #4b5563'
                      }} 
                    />
                  </div>
                )}
              </div>

              {/* Role-specific Details */}
              {selectedUserDetails.userDetails && (
                <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '0.5rem' }}>
                  <h4 style={{ color: '#3b82f6', marginBottom: '1rem' }}>User Profile Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    <div><strong>Full Name:</strong> {selectedUserDetails.userDetails.fullName}</div>
                    <div><strong>Address:</strong> {selectedUserDetails.userDetails.address}</div>
                    <div><strong>Phone:</strong> {selectedUserDetails.userDetails.phone || '-'}</div>
                    <div><strong>Email:</strong> {selectedUserDetails.userDetails.email || '-'}</div>
                  </div>
                </div>
              )}

              {selectedUserDetails.managementDetails && (
                <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '0.5rem' }}>
                  <h4 style={{ color: '#3b82f6', marginBottom: '1rem' }}>Management Profile Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    <div><strong>Full Name:</strong> {selectedUserDetails.managementDetails.fullName}</div>
                    <div><strong>Role:</strong> {selectedUserDetails.managementDetails.roleInManagement}</div>
                    <div><strong>Address:</strong> {selectedUserDetails.managementDetails.address}</div>
                    <div><strong>Phone:</strong> {selectedUserDetails.managementDetails.phone || '-'}</div>
                    <div><strong>Email:</strong> {selectedUserDetails.managementDetails.email || '-'}</div>
                  </div>
                </div>
              )}

              {selectedUserDetails.adminDetails && (
                <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '0.5rem' }}>
                  <h4 style={{ color: '#3b82f6', marginBottom: '1rem' }}>Admin Profile Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    <div><strong>Full Name:</strong> {selectedUserDetails.adminDetails.fullName}</div>
                    <div><strong>Role:</strong> {selectedUserDetails.adminDetails.roleTitle}</div>
                    <div><strong>Address:</strong> {selectedUserDetails.adminDetails.address}</div>
                    <div><strong>Phone:</strong> {selectedUserDetails.adminDetails.phone || '-'}</div>
                    <div><strong>Email:</strong> {selectedUserDetails.adminDetails.email || '-'}</div>
                  </div>
                </div>
              )}

              {selectedUserDetails.workerDetails && (
                <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '0.5rem' }}>
                  <h4 style={{ color: '#3b82f6', marginBottom: '1rem' }}>Worker Profile Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    <div><strong>Full Name:</strong> {selectedUserDetails.workerDetails.fullName}</div>
                    <div><strong>Worker Code:</strong> {selectedUserDetails.workerDetails.workerCode}</div>
                    <div><strong>Department:</strong> {selectedUserDetails.workerDetails.department || '-'}</div>
                    <div><strong>Address:</strong> {selectedUserDetails.workerDetails.address}</div>
                    <div><strong>Phone:</strong> {selectedUserDetails.workerDetails.phone || '-'}</div>
                    <div><strong>Email:</strong> {selectedUserDetails.workerDetails.email || '-'}</div>
                    <div><strong>Status:</strong> {selectedUserDetails.workerDetails.currentStatus || 'available'}</div>
                    <div><strong>Pending Jobs:</strong> {selectedUserDetails.workerDetails.pendingJobs?.length || 0}</div>
                  </div>
                  
                  {selectedUserDetails.workerDetails.workHistory && selectedUserDetails.workerDetails.workHistory.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <h5 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Work History</h5>
                      {selectedUserDetails.workerDetails.workHistory.map((job, index) => (
                        <div key={index} style={{ 
                          padding: '0.5rem', 
                          background: 'rgba(16, 185, 129, 0.1)', 
                          borderRadius: '0.25rem',
                          marginBottom: '0.5rem'
                        }}>
                          <div><strong>{job.jobTitle}</strong> at {job.company}</div>
                          <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                            {job.duration} • {job.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
