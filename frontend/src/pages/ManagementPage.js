import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/Layout.css';
import './ManagementPage.css';
import HeatMap from '../components/HeatMap';
import Modal from '../components/Modal';
import TriagePage from './TriagePage';
import ChatSystem from '../components/ChatSystem';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

// Load Google Maps API
const loadGoogleMapsAPI = () => {
  return new Promise((resolve, reject) => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      resolve();
      return;
    }
    
    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      // Wait for the existing script to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Google Maps API loading timeout'));
      }, 10000);
      
      return;
    }
    
    const script = document.createElement('script');
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization&callback=initMap`;
    script.async = true;
    script.defer = true;
    
    // Set up callback
    window.initMap = () => {
      delete window.initMap;
      resolve();
    };
    
    script.onerror = () => {
      delete window.initMap;
      reject(new Error('Failed to load Google Maps API'));
    };
    
    document.head.appendChild(script);
  });
};

const ManagementPage = () => {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'map', 'analytics', 'messages', 'your-reports', 'chat'
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [contactMessages, setContactMessages] = useState([]);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportToEdit, setReportToEdit] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState({ url: '', title: '' });
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  // const [editPriority, setEditPriority] = useState('Medium'); // Unused
  const [editWasteConditions, setEditWasteConditions] = useState([]);
  const [editUserPriority, setEditUserPriority] = useState('medium');
  const [editWasteAmount, setEditWasteAmount] = useState(50);
  const [categories, setCategories] = useState([]);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  
  // Report Generation states
  const [generatedReports, setGeneratedReports] = useState([]);
  const [period, setPeriod] = useState('Weekly');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeekDate, setSelectedWeekDate] = useState('');
  const [selectedDayDate, setSelectedDayDate] = useState('');
  const [exportType, setExportType] = useState('PDF');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [selectedGeneratedReport, setSelectedGeneratedReport] = useState(null);
  const [editingGeneratedReport, setEditingGeneratedReport] = useState(null);
  const [editPeriod, setEditPeriod] = useState('');
  const [editExportType, setEditExportType] = useState('');
  const [editFromDate, setEditFromDate] = useState('');
  const [editToDate, setEditToDate] = useState('');
  const [editSelectedMonth, setEditSelectedMonth] = useState('');
  const [editSelectedWeekDate, setEditSelectedWeekDate] = useState('');
  const [editSelectedDayDate, setEditSelectedDayDate] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'management' && !user.registrationComplete) {
      navigate('/management-registration');
      return;
    }
    fetchData();
    fetchContactMessages();
    fetchMyReports();
    fetchSystemOptions();
    loadGoogleMapsAPI().then(() => {
      console.log('Google Maps API loaded successfully');
      setMapsLoaded(true);
    }).catch((err) => {
      console.error('Failed to load Google Maps API:', err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'map' && mapsLoaded && window.google && window.google.maps) {
      setTimeout(() => {
        initializeHeatmap();
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, reports, mapsLoaded]);

  // Refresh my reports whenever Your Reports tab is opened
  useEffect(() => {
    if (activeTab === 'your-reports') {
      fetchMyReports();
    }
  }, [activeTab]);

  // Fetch generated reports when report-generation tab is opened
  useEffect(() => {
    if (activeTab === 'report-generation') {
      fetchGeneratedReports();
    }
  }, [activeTab]);

  const initializeHeatmap = () => {
    if (!mapRef.current) return;
    
    // Clear existing map if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }

    // Default to first report's location or a default location
    const defaultCenter = reports.length > 0 && reports[0].location?.latitude
      ? { lat: parseFloat(reports[0].location.latitude), lng: parseFloat(reports[0].location.longitude) }
      : { lat: 11.0168, lng: 76.9558 }; // Coimbatore default

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: defaultCenter,
        mapTypeId: 'roadmap',
      });

      mapInstanceRef.current = map;

      // Prepare heatmap data
      const heatmapData = reports
        .filter(r => r.location?.latitude && r.location?.longitude)
        .map(report => ({
          location: new window.google.maps.LatLng(
            parseFloat(report.location.latitude),
            parseFloat(report.location.longitude)
          ),
          weight: report.priority === 'High' ? 3 : report.priority === 'Medium' ? 2 : 1,
        }));

      if (heatmapData.length > 0) {
        const heatmap = new window.google.maps.visualization.HeatmapLayer({
          data: heatmapData,
          map: map,
        });

        heatmapLayerRef.current = heatmap;

        // Add markers for individual reports
        reports.forEach((report) => {
          if (report.location?.latitude && report.location?.longitude) {
            const marker = new window.google.maps.Marker({
              position: {
                lat: parseFloat(report.location.latitude),
                lng: parseFloat(report.location.longitude),
              },
              map: map,
              title: report.title,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#${getMarkerColor(report.status)}" stroke="white" stroke-width="2"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                `),
              },
            });

            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 0.5rem; max-width: 200px;">
                  <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: bold;">
                    #${report.ticketNumber}
                  </h4>
                  <p style="margin: 0; font-size: 0.75rem;">${report.title}</p>
                  <p style="margin: 0.25rem 0 0 0; font-size: 0.7rem; color: #666;">
                    ${report.status} - ${report.priority || 'Medium'}
                  </p>
                </div>
              `,
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
              setSelectedReport(report);
            });
          }
        });
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const fetchMyReports = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const uid = user?.id || user?._id;
      if (!uid) return;
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports/user/${uid}`);
      setMyReports(res.data || []);
    } catch (e) {
      console.error('Error fetching my reports:', e);
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

  const openEditModal = (report) => {
    if (report.status !== 'Reported') return;
    setReportToEdit(report);
    setEditTitle(report.title || '');
    setEditDescription(report.description || '');
    setEditCategory(report.category || '');
    // setEditPriority(report.priority || 'Medium'); // Commented out since setEditPriority is unused
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
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/reports/edit/${reportToEdit._id}`,
        { 
          userId: user.id, 
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
      // setEditPriority('Medium'); // Commented out since setEditPriority is unused
      setEditWasteConditions([]);
      setEditUserPriority('medium');
      setEditWasteAmount(50);
      await fetchMyReports();
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
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/reports/${reportToEdit._id}?userId=${user.id}`);
      setDeleteModalOpen(false);
      setReportToEdit(null);
      await fetchMyReports();
      alert('Report deleted successfully!');
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete report. Please try again.');
    }
  };

  const getMarkerColor = (status) => {
    const colors = {
      'Reported': '3b82f6',
      'Assigned': 'f59e0b',
      'In Progress': '6366f1',
      'Completed': '10b981',
      'Rejected': 'ef4444',
    };
    return colors[status] || '6b7280';
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const [statsRes, reportsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/dashboard/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      setStats(statsRes.data);
      setReports(reportsRes.data);
      console.log(`Fetched ${reportsRes.data?.length || 0} reports`);
      console.log('Reports data:', reportsRes.data);
      // Fallback: derive myReports here using current user
      const user = JSON.parse(localStorage.getItem('user')) || {};
      const uid = user.id || user._id;
      if (uid) {
        const mine = (reportsRes.data || []).filter(r => String(r.userId) === String(uid) || r.username === user.username);
        setMyReports(mine);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContactMessages = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/management/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setContactMessages(response.data.contacts || []);
    } catch (error) {
      console.error('Error fetching contact messages:', error);
    }
  };

  const fetchGeneratedReports = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setGeneratedReports(response.data);
    } catch (error) {
      console.error('Error fetching generated reports:', error);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setFromDate('');
    setToDate('');
    setSelectedMonth('');
    setSelectedWeekDate('');
    setSelectedDayDate('');
  };

  const calculateDates = () => {
    let from, to;

    if (period === 'Monthly' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      from = new Date(year, month - 1, 1);
      to = new Date(year, month, 0);
    } else if (period === 'Weekly' && selectedWeekDate) {
      from = new Date(selectedWeekDate);
      to = new Date(from);
      to.setDate(to.getDate() + 6);
    } else if (period === 'Daily' && selectedDayDate) {
      from = new Date(selectedDayDate);
      to = new Date(selectedDayDate);
    } else if (period === 'Custom' && fromDate && toDate) {
      from = new Date(fromDate);
      to = new Date(toDate);
    } else {
      return null;
    }

    return { from, to };
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    
    const dates = calculateDates();
    if (!dates) {
      setReportMessage('Please select the required date fields');
      setTimeout(() => setReportMessage(''), 3000);
      return;
    }

    setGeneratingReport(true);
    setReportMessage('');
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('authToken');
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports`, {
        period,
        fromDate: dates.from.toISOString(),
        toDate: dates.to.toISOString(),
        exportType,
        generatedBy: user?.username || 'Management',
        generatedById: user?.id || user?._id
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setReportMessage('Report generated successfully!');
      setTimeout(() => setReportMessage(''), 3000);
      setPeriod('Weekly');
      setFromDate('');
      setToDate('');
      setSelectedMonth('');
      setSelectedWeekDate('');
      setSelectedDayDate('');
      setExportType('PDF');
      await fetchGeneratedReports();
    } catch (error) {
      setReportMessage(error.response?.data?.message || 'Error generating report');
      setTimeout(() => setReportMessage(''), 3000);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDeleteGeneratedReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setReportMessage('Report deleted successfully!');
      setTimeout(() => setReportMessage(''), 3000);
      await fetchGeneratedReports();
    } catch (error) {
      setReportMessage('Error deleting report');
      setTimeout(() => setReportMessage(''), 3000);
    }
  };

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

  const handleDownloadPDF = async (reportId, reportIdText) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports/${reportId}/download/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportIdText}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setReportMessage('PDF downloaded successfully!');
      setTimeout(() => setReportMessage(''), 3000);
    } catch (error) {
      setReportMessage('Error downloading PDF');
      setTimeout(() => setReportMessage(''), 3000);
    }
  };

  const handleDownloadExcel = async (reportId, reportIdText) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports/${reportId}/download/excel`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportIdText}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setReportMessage('Excel downloaded successfully!');
      setTimeout(() => setReportMessage(''), 3000);
    } catch (error) {
      setReportMessage('Error downloading Excel');
      setTimeout(() => setReportMessage(''), 3000);
    }
  };

  const handleDownloadReport = async (reportId, reportIdText, exportType) => {
    if (exportType === 'PDF') {
      await handleDownloadPDF(reportId, reportIdText);
    } else {
      await handleDownloadExcel(reportId, reportIdText);
    }
  };

  const handleEditGeneratedReport = (report) => {
    setEditingGeneratedReport(report);
    setEditPeriod(report.period);
    setEditExportType(report.exportType);
    setEditFromDate(report.fromDate ? new Date(report.fromDate).toISOString().split('T')[0] : '');
    setEditToDate(report.toDate ? new Date(report.toDate).toISOString().split('T')[0] : '');
    
    // Set appropriate date fields based on period
    if (report.period === 'Monthly') {
      const date = new Date(report.fromDate);
      setEditSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    } else if (report.period === 'Weekly') {
      setEditSelectedWeekDate(new Date(report.fromDate).toISOString().split('T')[0]);
    } else if (report.period === 'Daily') {
      setEditSelectedDayDate(new Date(report.fromDate).toISOString().split('T')[0]);
    }
  };

  const handleEditPeriodChange = (newPeriod) => {
    setEditPeriod(newPeriod);
    setEditFromDate('');
    setEditToDate('');
    setEditSelectedMonth('');
    setEditSelectedWeekDate('');
    setEditSelectedDayDate('');
  };

  const calculateEditDates = () => {
    let from = '';
    let to = '';

    if (editPeriod === 'Monthly' && editSelectedMonth) {
      const [year, month] = editSelectedMonth.split('-');
      from = new Date(year, month - 1, 1).toISOString();
      to = new Date(year, month, 0).toISOString();
    } else if (editPeriod === 'Weekly' && editSelectedWeekDate) {
      from = new Date(editSelectedWeekDate).toISOString();
      const endDate = new Date(editSelectedWeekDate);
      endDate.setDate(endDate.getDate() + 6);
      to = endDate.toISOString();
    } else if (editPeriod === 'Daily' && editSelectedDayDate) {
      from = new Date(editSelectedDayDate).toISOString();
      to = new Date(editSelectedDayDate).toISOString();
    } else if (editPeriod === 'Custom' && editFromDate && editToDate) {
      from = new Date(editFromDate).toISOString();
      to = new Date(editToDate).toISOString();
    }

    return { from, to };
  };

  const handleSaveEditGeneratedReport = async () => {
    try {
      const { from, to } = calculateEditDates();
      
      if (!from || !to) {
        setReportMessage('Please select valid dates for the period');
        setTimeout(() => setReportMessage(''), 3000);
        return;
      }

      const token = localStorage.getItem('authToken');
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/generated-reports/${editingGeneratedReport._id}`, {
        period: editPeriod,
        fromDate: from,
        toDate: to,
        exportType: editExportType
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setReportMessage('Report updated successfully!');
      setTimeout(() => setReportMessage(''), 3000);
      setEditingGeneratedReport(null);
      setEditPeriod('');
      setEditExportType('');
      setEditFromDate('');
      setEditToDate('');
      setEditSelectedMonth('');
      setEditSelectedWeekDate('');
      setEditSelectedDayDate('');
      await fetchGeneratedReports();
    } catch (error) {
      console.error('Error updating report:', error);
      setReportMessage('Error updating report');
      setTimeout(() => setReportMessage(''), 3000);
    }
  };

  const handleCancelEditGeneratedReport = () => {
    setEditingGeneratedReport(null);
    setEditPeriod('');
    setEditExportType('');
    setEditFromDate('');
    setEditToDate('');
    setEditSelectedMonth('');
    setEditSelectedWeekDate('');
    setEditSelectedDayDate('');
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

  const deleteContactMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this contact message?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/management/contacts/${messageId}`, {
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

  const clearAllFilters = () => {
    setFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setDateFilter('all');
    setSearchTerm('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (dateFilter !== 'all') count++;
    if (searchTerm.trim()) count++;
    return count;
  };

  const applyPresetFilter = (preset) => {
    // Check if the preset is already active and toggle it off
    const isPresetActive = (preset) => {
      switch (preset) {
        case 'urgent':
          return filter === 'Reported' && priorityFilter === 'High';
        case 'today':
          return dateFilter === 'today';
        case 'pending':
          return filter === 'Reported' && priorityFilter === 'all' && categoryFilter === 'all' && dateFilter === 'all';
        case 'completed-recent':
          return filter === 'Completed' && dateFilter === 'week';
        default:
          return false;
      }
    };

    if (isPresetActive(preset)) {
      // If preset is active, clear all filters (toggle off)
      clearAllFilters();
    } else {
      // Apply the preset filter
      clearAllFilters();
      switch (preset) {
        case 'urgent':
          setFilter('Reported');
          setPriorityFilter('High');
          break;
        case 'today':
          setDateFilter('today');
          break;
        case 'pending':
          setFilter('Reported');
          break;
        case 'completed-recent':
          setFilter('Completed');
          setDateFilter('week');
          break;
        default:
          break;
      }
    }
  };

  const isPresetActive = (preset) => {
    switch (preset) {
      case 'urgent':
        return filter === 'Reported' && priorityFilter === 'High';
      case 'today':
        return dateFilter === 'today';
      case 'pending':
        return filter === 'Reported' && priorityFilter === 'all' && categoryFilter === 'all' && dateFilter === 'all';
      case 'completed-recent':
        return filter === 'Completed' && dateFilter === 'week';
      default:
        return false;
    }
  };

  const filteredReports = reports
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => priorityFilter === 'all' || (r.priority || 'Medium') === priorityFilter)
    .filter(r => categoryFilter === 'all' || r.category === categoryFilter)
    .filter(r => {
      if (dateFilter === 'all') return true;
      const reportDate = new Date(r.timestamp);
      const now = new Date();
      
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
    })
    .filter(r => {
      if (!searchTerm.trim()) return true;
      const search = searchTerm.toLowerCase();
      return (
        r.title?.toLowerCase().includes(search) ||
        r.description?.toLowerCase().includes(search) ||
        r.ticketNumber?.toLowerCase().includes(search) ||
        r.username?.toLowerCase().includes(search) ||
        r.category?.toLowerCase().includes(search)
      );
    });

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
            <h1>Management Dashboard</h1>
            <p>Monitor and manage all reported issues</p>
          </div>
          <button 
            onClick={() => { fetchData(); }}
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
        flexWrap: 'wrap',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {[
          { id: 'dashboard', icon: '📊', label: 'Dashboard' },
          { id: 'report-generation', icon: '🎯', label: 'Report generation' },
          { id: 'manage', icon: '📋', label: 'Manage' },
          { id: 'map', icon: '🗺️', label: 'Heat Map' },
          { id: 'analytics', icon: '📈', label: 'Analytics' },
          { id: 'messages', icon: '📧', label: 'Contacts' },
          { id: 'your-reports', icon: '📝', label: 'My Reports' },
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
      {activeTab === 'dashboard' && (
        <>
          {/* Enhanced Filter Section */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {/* Filter Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
                  🔍 Filter Reports
                </h3>
                {getActiveFilterCount() > 0 && (
                  <span style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {getActiveFilterCount()} active
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
                
                {getActiveFilterCount() > 0 && (
                  <button
                    onClick={clearAllFilters}
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
            <div className="filter-tabs" style={{ marginBottom: showAdvancedFilters ? '1.5rem' : '0' }}>
              <button 
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                All Reports
              </button>
              <button 
                className={filter === 'Reported' ? 'active' : ''}
                onClick={() => setFilter('Reported')}
              >
                Reported
              </button>
              <button 
                className={filter === 'Assigned' ? 'active' : ''}
                onClick={() => setFilter('Assigned')}
              >
                Assigned
              </button>
              <button 
                className={filter === 'In Progress' ? 'active' : ''}
                onClick={() => setFilter('In Progress')}
              >
                In Progress
              </button>
              <button 
                className={filter === 'Completed' ? 'active' : ''}
                onClick={() => setFilter('Completed')}
              >
                Completed
              </button>
              <button 
                className={filter === 'Rejected' ? 'active' : ''}
                onClick={() => setFilter('Rejected')}
              >
                Rejected
              </button>
            </div>

            {/* Quick Filter Presets */}
            <div 
              className="quick-filters-container"
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '1rem',
                marginTop: '1rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
              <span style={{ 
                fontSize: '0.875rem', 
                color: '#d1d5db', 
                fontWeight: '600',
                marginRight: '0.5rem'
              }}>
                Quick filters:
              </span>
              {[
                { key: 'urgent', label: '🚨 Urgent', desc: 'High priority reported issues' },
                { key: 'today', label: '📅 Today', desc: 'Reports from today' },
                { key: 'pending', label: '⏳ Pending', desc: 'Unassigned reports' },
                { key: 'completed-recent', label: '✅ Recent Completed', desc: 'Completed in last 7 days' }
              ].map(preset => (
                <button
                  key={preset.key}
                  onClick={() => applyPresetFilter(preset.key)}
                  title={preset.desc}
                  style={{
                    background: isPresetActive(preset.key) 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                      : 'rgba(255,255,255,0.1)',
                    border: isPresetActive(preset.key)
                      ? '1px solid #3b82f6'
                      : '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: isPresetActive(preset.key) 
                      ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                      : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isPresetActive(preset.key)) {
                      e.target.style.background = 'rgba(255,255,255,0.15)';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPresetActive(preset.key)) {
                      e.target.style.background = 'rgba(255,255,255,0.1)';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {preset.label}
                  {isPresetActive(preset.key) && (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255,255,255,0.05)'
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
          <div className="stat-card-value">{reports.length || 0}</div>
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

      {/* Search Box */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '1.5rem', 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '1rem',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          marginBottom: '0.75rem'
        }}>
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#9ca3af' }}>
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <h4 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: '600' }}>
            Search Reports
          </h4>
        </div>
        <input
          type="text"
          placeholder="Search by title, description, ticket number, username, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ 
            width: '100%', 
            fontSize: '1rem',
            padding: '0.875rem 1rem',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '0.5rem',
            color: '#fff',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,0.2)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {searchTerm && (
          <div style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.875rem', 
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Searching for: "{searchTerm}"
            <button
              onClick={() => setSearchTerm('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '0.25rem',
                marginLeft: 'auto'
              }}
              title="Clear search"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Reports List */}
      <div className="content-card">
        <div className="content-card-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>
              All Reports ({filteredReports.length})
            </h3>
            {getActiveFilterCount() > 0 && (
              <p style={{ 
                margin: 0, 
                fontSize: '0.875rem', 
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
                </svg>
                Showing {filteredReports.length} of {reports.length} reports
                {filter !== 'all' && ` • Status: ${filter}`}
                {priorityFilter !== 'all' && ` • Priority: ${priorityFilter}`}
                {categoryFilter !== 'all' && ` • Category: ${categoryFilter.replace(/_/g, ' ')}`}
                {dateFilter !== 'all' && ` • ${dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'Last 7 days' : 'Last 30 days'}`}
              </p>
            )}
          </div>
          
          {filteredReports.length > 0 && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: '#9ca3af'
            }}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 18h6v-2H3v2zM3 6v2h6V6H3zm0 7h6v-2H3v2zm7-7v2h11V6H10zm0 5h11v-2H10v2zm0 5h11v-2H10v2z"/>
              </svg>
              {filteredReports.length} {filteredReports.length === 1 ? 'result' : 'results'}
            </div>
          )}
        </div>
        <div className="reports-list">
          {filteredReports && filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <div 
                key={report._id} 
                className={`report-item ${selectedReport?._id === report._id ? 'selected' : ''}`}
                onClick={() => setSelectedReport(report)}
              >
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
                  <span>
                    <strong>User:</strong> 
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
                <div className="report-location">
                  <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {report.location?.address || 'Location not specified'}
                </div>
                {report.completionPhotoPath && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Completion Photo:</strong>
                    <img 
                      src={report.completionPhotoPath.startsWith('http') ? report.completionPhotoPath : `${process.env.REACT_APP_API_BASE_URL}${report.completionPhotoPath}`} 
                      alt="Completion" 
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '0.5rem' }}
                    />
                  </div>
                )}
            </div>
          ))
        ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              <p>No reports found</p>
              {reports.length === 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                  <p>No reports in database yet.</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Reports will appear here once users submit issues.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

        </>
      )}

      {activeTab === 'manage' && (
        <TriagePage />
      )}

      {activeTab === 'map' && (
        <div className="content-card">
          <div className="content-card-header">
            <h3>🗺️ Heat Map</h3>
            <p>View complaint locations and grouped reports by area</p>
          </div>
          <HeatMap 
            reports={reports} 
            userRole="management"
            onReportClick={(report) => {
              // Fallback for non-management users (not used in management context)
              console.log('Report clicked:', report);
            }}
          />
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="content-card">
          <div className="content-card-header">
            <h3>💬 Shared Messages</h3>
            <p>View conversations shared with management</p>
          </div>
          <ChatSystem currentUser={JSON.parse(localStorage.getItem('user'))} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <>
          {/* Key Metrics */}
          <div className="stats-grid" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-card-value">{stats?.totalReports || 0}</div>
              <div className="stat-card-label">Total Reports</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">{stats?.statusCounts?.Completed || 0}</div>
              <div className="stat-card-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">{stats?.statusCounts?.['In Progress'] || 0}</div>
              <div className="stat-card-label">In Progress</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">{stats?.statusCounts?.Assigned || 0}</div>
              <div className="stat-card-label">Assigned</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">
                {stats?.totalReports > 0 ? ((stats?.statusCounts?.Completed / stats.totalReports) * 100).toFixed(0) : 0}%
              </div>
              <div className="stat-card-label">Completion Rate</div>
            </div>
          </div>

          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* Status Distribution with Pie Chart */}
            <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <div className="content-card-header" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>📊 Report Status Distribution</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Current status of all reports</p>
              </div>
              <div style={{ padding: '2rem' }}>
                {/* Progress Bars */}
                <div style={{ marginBottom: '2rem' }}>
                  {Object.entries(stats?.statusCounts || {}).map(([status, count]) => {
                    const percentage = stats?.totalReports > 0 ? (count / stats.totalReports * 100).toFixed(0) : 0;
                    const colors = {
                      'Completed': '#10b981',
                      'In Progress': '#6366f1',
                      'Assigned': '#f59e0b',
                      'Reported': '#3b82f6',
                      'Rejected': '#ef4444'
                    };
                    return (
                      <div key={status} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          <span style={{ fontWeight: '600' }}>{status}</span>
                          <span style={{ fontWeight: '600' }}>{count} ({percentage}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${percentage}%`, 
                            height: '100%', 
                            background: colors[status] || '#6b7280', 
                            transition: 'width 0.8s ease',
                            borderRadius: '10px'
                          }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pie Chart */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                  <h4 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1rem', color: '#e5e7eb' }}>Visual Distribution</h4>
                  <div style={{ maxWidth: '350px', margin: '0 auto' }}>
                    <Pie
                      data={{
                        labels: Object.keys(stats?.statusCounts || {}),
                        datasets: [{
                          data: Object.values(stats?.statusCounts || {}),
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

            {/* Category Distribution with Doughnut Chart */}
            <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <div className="content-card-header" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>🗂️ Reports by Category</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Breakdown by issue type</p>
              </div>
              <div style={{ padding: '2.5rem' }}>
                <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                  <Doughnut
                    data={{
                      labels: Object.keys(stats?.categoryCounts || {}).map(cat => 
                        cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      ),
                      datasets: [{
                        data: Object.values(stats?.categoryCounts || {}),
                        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
                        borderColor: ['#dc2626', '#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777'],
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

          {/* Priority Bar Chart */}
          <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
            <div className="content-card-header" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>⚡ Reports by Priority Level</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Distribution across priority levels</p>
            </div>
            <div style={{ padding: '2.5rem' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <Bar
                  data={{
                    labels: Object.keys(stats?.priorityCounts || {}),
                    datasets: [{
                      label: 'Number of Reports',
                      data: Object.values(stats?.priorityCounts || {}),
                      backgroundColor: Object.keys(stats?.priorityCounts || {}).map(p => {
                        const colors = { 'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#10b981' };
                        return colors[p] || '#6b7280';
                      }),
                      borderColor: Object.keys(stats?.priorityCounts || {}).map(p => {
                        const colors = { 'High': '#dc2626', 'Medium': '#d97706', 'Low': '#059669' };
                        return colors[p] || '#4b5563';
                      }),
                      borderWidth: 2,
                      borderRadius: 8
                    }]
                  }}
                  options={{
                    responsive: true,
                    scales: {
                      y: { 
                        beginAtZero: true, 
                        ticks: { color: '#9ca3af', stepSize: 1 }, 
                        grid: { color: 'rgba(255,255,255,0.1)' }
                      },
                      x: { 
                        ticks: { color: '#fff', font: { size: 14 } }, 
                        grid: { display: false } 
                      }
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#667eea',
                        borderWidth: 1,
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

          {/* Recent Activity */}
          {stats?.recentReports && stats.recentReports.length > 0 && (
            <div className="content-card" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <div className="content-card-header" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>🕐 Recent Activity</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Latest reports in the system</p>
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
                      <span><strong>Category:</strong> {report.category.replace(/_/g, ' ')}</span>
                      <span><strong>Priority:</strong> {report.priority || 'Medium'}</span>
                      <span><strong>Date:</strong> {new Date(report.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report Details</h2>
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
                <strong>Title:</strong> {selectedReport.title}
              </div>
              <div className="detail-row">
                <strong>Description:</strong> {selectedReport.description}
              </div>
              <div className="detail-row">
                <strong>Category:</strong> {selectedReport.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
              <div className="detail-row">
                <strong>Priority:</strong> {selectedReport.priority || 'Medium'}
              </div>
              <div className="detail-row">
                <strong>Location:</strong> {selectedReport.location?.address}
              </div>
              <div className="detail-row">
                <strong>Coordinates:</strong> {selectedReport.location?.latitude}, {selectedReport.location?.longitude}
              </div>
              <div className="detail-row">
                <strong>Reported by:</strong> {selectedReport.username}
              </div>
              <div className="detail-row">
                <strong>Date:</strong> {new Date(selectedReport.timestamp).toLocaleString()}
              </div>
              {selectedReport.photoPath && (
                <div className="detail-row">
                  <strong>Photo:</strong>
                  <img 
                    src={selectedReport.photoPath.startsWith('http') ? selectedReport.photoPath : `${process.env.REACT_APP_API_BASE_URL}${selectedReport.photoPath}`} 
                    alt="Report" 
                    style={{ maxWidth: '100%', marginTop: '0.5rem', borderRadius: '0.5rem' }}
                  />
                </div>
              )}
              {selectedReport.internalNotes && (
                <div className="detail-row">
                  <strong>Internal Notes:</strong> {selectedReport.internalNotes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="content-card">
          <div className="content-card-header">
            <h3>💬 Contact Messages</h3>
            <p>View and manage contact form submissions directed to management</p>
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

      {/* Report Generation Tab */}
      {activeTab === 'report-generation' && (
        <div>
          {reportMessage && (
            <div style={{ 
              padding: '1rem', 
              marginBottom: '1.5rem', 
              background: reportMessage.includes('Error') || reportMessage.includes('Please') ? '#ef4444' : '#10b981', 
              color: '#fff', 
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              {reportMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Left: Generation Form */}
            <div className="content-card">
              <div className="content-card-header" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>📄 Generate New Report</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
                  Create performance reports for sanitation management
                </p>
              </div>
              <form onSubmit={handleGenerateReport} style={{ padding: '1.5rem' }}>
                {/* Period Selection - Radio Buttons */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#fff' }}>
                    Period Type:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    {['Monthly', 'Weekly', 'Daily', 'Custom'].map((periodType) => (
                      <label
                        key={periodType}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.75rem',
                          background: period === periodType ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255,255,255,0.05)',
                          borderRadius: '0.5rem',
                          border: period === periodType ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="radio"
                          name="period"
                          value={periodType}
                          checked={period === periodType}
                          onChange={(e) => handlePeriodChange(e.target.value)}
                          style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                        />
                        <span style={{ color: '#fff', fontSize: '0.875rem' }}>{periodType}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Conditional Date Inputs based on Period */}
                {period === 'Monthly' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                      Select Month:
                    </label>
                    <input 
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="form-input"
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                    />
                  </div>
                )}

                {period === 'Weekly' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                      Select Week Start Date:
                    </label>
                    <input 
                      type="date"
                      value={selectedWeekDate}
                      onChange={(e) => setSelectedWeekDate(e.target.value)}
                      className="form-input"
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                    />
                    {selectedWeekDate && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                        Week: {new Date(selectedWeekDate).toLocaleDateString()} - {new Date(new Date(selectedWeekDate).setDate(new Date(selectedWeekDate).getDate() + 6)).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

                {period === 'Daily' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                      Select Date:
                    </label>
                    <input 
                      type="date"
                      value={selectedDayDate}
                      onChange={(e) => setSelectedDayDate(e.target.value)}
                      className="form-input"
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                    />
                  </div>
                )}

                {period === 'Custom' && (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                        From Date:
                      </label>
                      <input 
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="form-input"
                        required
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                      />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                        To Date:
                      </label>
                      <input 
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="form-input"
                        required
                        min={fromDate}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                      />
                    </div>
                  </>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                    Export Type:
                  </label>
                  <select 
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value)}
                    className="form-select"
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                  >
                    <option value="PDF">PDF</option>
                    <option value="Excel">Excel</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="hero-button"
                  disabled={generatingReport}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  {generatingReport ? 'Generating...' : '🔄 Generate Report'}
                </button>
              </form>
            </div>

            {/* Right: Generated Reports List */}
            <div className="content-card">
              <div className="content-card-header" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>📊 Past Reports</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
                  {generatedReports.length} report(s) generated
                </p>
              </div>
              <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1rem' }}>
                {generatedReports.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                    <p>No reports generated yet</p>
                    <p style={{ fontSize: '0.875rem' }}>Create your first report using the form</p>
                  </div>
                ) : (
                  generatedReports.map((report) => (
                    <div 
                      key={report._id}
                      style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setSelectedGeneratedReport(
                        selectedGeneratedReport?._id === report._id ? null : report
                      )}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#fff' }}>
                            {report.reportId}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                            {report.period} | {report.exportType}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {new Date(report.fromDate).toLocaleDateString()} - {new Date(report.toDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadReport(report._id, report.reportId, report.exportType);
                            }}
                            className="hero-button"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#10b981' }}
                            title={`Download ${report.exportType}`}
                          >
                            📥 Download
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditGeneratedReport(report);
                            }}
                            className="hero-button"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#667eea' }}
                            title="Edit"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGeneratedReport(report._id);
                            }}
                            className="hero-button"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#ef4444' }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Edit Form */}
                      {editingGeneratedReport?._id === report._id && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '0.5rem' }}>
                          <h4 style={{ color: '#fff', marginBottom: '1rem' }}>Edit Report</h4>
                          
                          {/* Period Selection */}
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                              Period Type:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                              {['Monthly', 'Weekly', 'Daily', 'Custom'].map((periodType) => (
                                <label
                                  key={periodType}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0.5rem',
                                    background: editPeriod === periodType ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '0.5rem',
                                    border: editPeriod === periodType ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="editPeriod"
                                    value={periodType}
                                    checked={editPeriod === periodType}
                                    onChange={(e) => handleEditPeriodChange(e.target.value)}
                                    style={{ marginRight: '0.5rem' }}
                                  />
                                  <span style={{ color: '#fff' }}>{periodType}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Conditional Date Inputs */}
                          {editPeriod === 'Monthly' && (
                            <div style={{ marginBottom: '1rem' }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                                Select Month:
                              </label>
                              <input 
                                type="month"
                                value={editSelectedMonth}
                                onChange={(e) => setEditSelectedMonth(e.target.value)}
                                className="form-input"
                                required
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                              />
                            </div>
                          )}

                          {editPeriod === 'Weekly' && (
                            <div style={{ marginBottom: '1rem' }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                                Select Week Start Date:
                              </label>
                              <input 
                                type="date"
                                value={editSelectedWeekDate}
                                onChange={(e) => setEditSelectedWeekDate(e.target.value)}
                                className="form-input"
                                required
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                              />
                              {editSelectedWeekDate && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                                  Week: {new Date(editSelectedWeekDate).toLocaleDateString()} - {new Date(new Date(editSelectedWeekDate).setDate(new Date(editSelectedWeekDate).getDate() + 6)).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          )}

                          {editPeriod === 'Daily' && (
                            <div style={{ marginBottom: '1rem' }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                                Select Date:
                              </label>
                              <input 
                                type="date"
                                value={editSelectedDayDate}
                                onChange={(e) => setEditSelectedDayDate(e.target.value)}
                                className="form-input"
                                required
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                              />
                            </div>
                          )}

                          {editPeriod === 'Custom' && (
                            <>
                              <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                                  From Date:
                                </label>
                                <input 
                                  type="date"
                                  value={editFromDate}
                                  onChange={(e) => setEditFromDate(e.target.value)}
                                  className="form-input"
                                  required
                                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                                />
                              </div>
                              <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                                  To Date:
                                </label>
                                <input 
                                  type="date"
                                  value={editToDate}
                                  onChange={(e) => setEditToDate(e.target.value)}
                                  className="form-input"
                                  required
                                  min={editFromDate}
                                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                                />
                              </div>
                            </>
                          )}

                          {/* Export Type */}
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#fff' }}>
                              Export Type:
                            </label>
                            <select 
                              value={editExportType}
                              onChange={(e) => setEditExportType(e.target.value)}
                              className="form-select"
                              required
                              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem' }}
                            >
                              <option value="PDF">PDF</option>
                              <option value="Excel">Excel</option>
                            </select>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={handleSaveEditGeneratedReport}
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
                              onClick={handleCancelEditGeneratedReport}
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
                      )}

                      {/* Expanded Details */}
                      {selectedGeneratedReport?._id === report._id && (
                        <div style={{ 
                          marginTop: '1rem', 
                          paddingTop: '1rem', 
                          borderTop: '1px solid rgba(255,255,255,0.1)' 
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Total Issues</div>
                              <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#3b82f6' }}>
                                {report.totalIssues}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Completed</div>
                              <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>
                                {report.completedIssues}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Pending</div>
                              <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f59e0b' }}>
                                {report.pendingIssues}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ marginTop: '1rem' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#fff' }}>
                              Worker Performance:
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              {JSON.parse(report.workerPerformance || '[]').length > 0 ? (
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                  {JSON.parse(report.workerPerformance).map((worker, idx) => (
                                    <div key={idx} style={{ 
                                      padding: '0.5rem', 
                                      background: 'rgba(0,0,0,0.2)', 
                                      borderRadius: '0.25rem' 
                                    }}>
                                      <strong>{worker.worker}:</strong> {worker.completed}/{worker.assigned} completed 
                                      ({worker.completionRate})
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div>No worker data available</div>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem' }}>
                            Generated by: {report.generatedBy} | {new Date(report.createdAt).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
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
                        <span className={`status-badge status-${report.status.toLowerCase().replace(/\s+/g, '-')}`}>
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
                                e.currentTarget.style.transform = 'scale(1)';                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
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
          
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            justifyContent: 'flex-end',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button 
              className="hero-button" 
              onClick={submitEdit}
              style={{ 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Save Changes
            </button>
            <button 
              className="delete-button" 
              onClick={() => {
                setEditModalOpen(false);
                setEditTitle('');
                setEditDescription('');
                setEditCategory('');
                // setEditPriority('Medium'); // Commented out since setEditPriority is unused
                setEditWasteConditions([]);
                setEditUserPriority('medium');
                setEditWasteAmount(50);
              }}
              style={{
                background: 'rgba(107, 114, 128, 0.5)',
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
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reportToEdit && (
            <div style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              color: '#fca5a5'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <strong>Warning: This action cannot be undone</strong>
              </div>
              <div>You are about to delete report <strong>#{reportToEdit.ticketNumber}</strong></div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
                Title: "{reportToEdit.title}"
              </div>
            </div>
          )}
          
          <div style={{ fontSize: '1rem', color: '#d1d5db', lineHeight: '1.5' }}>
            Are you sure you want to permanently delete this report? This action cannot be undone.
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            justifyContent: 'flex-end',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button 
              className="hero-button" 
              onClick={confirmDelete}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              Delete Report
            </button>
            <button 
              className="hero-button" 
              onClick={() => setDeleteModalOpen(false)}
              style={{
                background: 'rgba(107, 114, 128, 0.5)',
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
    </div>
  );
};

export default ManagementPage;
