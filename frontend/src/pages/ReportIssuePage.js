import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css'; // <-- Still use HomePage CSS

// --- showToast function remains the same ---
function showToast({ title, description, variant = 'default' }) {
    // ... (keep the existing showToast function code)
     const container = document.getElementById('toast-container');
    if (!container) {
        console.warn("Toast container not found!");
        alert(`${title}: ${description}`);
        return;
    }
    const isDestructive = variant === 'destructive';
    const bgColorClass = isDestructive ? 'toast-destructive' : 'toast-success';
    const icon = isDestructive 
        ? `<svg class="icon-md mr-2" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h18.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>` 
        : `<svg class="icon-md mr-2" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-8.83"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${bgColorClass}`;
    toastElement.innerHTML = `
        <div class="toast-content">
            ${icon}
            <div>
                <h4 style="font-size: 1rem; font-weight: 600;">${title}</h4>
                <p style="font-size: 0.875rem;">${description}</p>
            </div>
            <button class="toast-close-btn" onclick="this.parentNode.parentNode.remove()">
                <svg class="icon-sm" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    `;
    container.appendChild(toastElement);
    setTimeout(() => toastElement.classList.add('toast-visible'), 10);
    setTimeout(() => {
        toastElement.classList.remove('toast-visible');
        setTimeout(() => toastElement.remove(), 300);
    }, 4000);
}


// --- Main Report Issue Page Component ---

const ReportIssuePage = () => {
    // --- State Management ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreviewURL, setPhotoPreviewURL] = useState('');
    const [locationData, setLocationData] = useState({ lat: null, lng: null });
    const [editableAddress, setEditableAddress] = useState(""); 
    const [isLocationEditable, setIsLocationEditable] = useState(false); 
    const [currentUser, setCurrentUser] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    // New state for waste conditions and priority
    const [wasteConditions, setWasteConditions] = useState([]);
    const [userPriority, setUserPriority] = useState('medium');
    const [wasteAmount, setWasteAmount] = useState(50);

    // Refs
    const photoInputRef = useRef(null);
    const mainHeaderRef = useRef(null); 
    const alertShownRef = useRef(false);
    const navigate = useNavigate();

    // --- Effects ---
    // Check if user is a worker and block access
    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            setCurrentUser(userData);
            
            // Redirect workers to their dashboard
            if (userData.role === 'worker') {
                showToast({
                    title: 'Access Denied',
                    description: 'Workers cannot report issues. Please login with a user account.',
                    variant: 'destructive'
                });
                navigate('/worker');
                return;
            }
        }
    }, [navigate]);

    // Fetch categories from API
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/system-options/category`);
                setCategories(response.data);
            } catch (error) {
                console.error('Error fetching categories:', error);
                // Fallback to defaults if API fails
                setCategories([
                    { _id: '1', value: 'overflowing_bin' },
                    { _id: '2', value: 'illegal_dumping' },
                    { _id: '3', value: 'uncollected_garbage' },
                    { _id: '4', value: 'broken_bin' },
                    { _id: '5', value: 'other' }
                ]);
            }
        };
        fetchCategories();
    }, []);

    // Check Auth & Get Location
    useEffect(() => {
        // ... (Keep the same useEffect logic as before) ...
         const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('authToken'); 
        if (storedUser && token) {
            try {
                setCurrentUser(JSON.parse(storedUser));
                getCurrentLocation(); 
            } catch (e) {
                console.error("Error parsing stored user data", e);
                localStorage.clear(); 
                navigate('/auth'); 
            }
        } else {
            if (!alertShownRef.current) {
                alertShownRef.current = true;
                showToast({ title:"Login Required", description: "You must be logged in to report an issue.", variant: "destructive"});
                navigate('/auth');
            }
        }
        return () => {
            if (photoPreviewURL) URL.revokeObjectURL(photoPreviewURL);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]); 

    // --- Logic Functions ---
    const getCurrentLocation = () => {
        // ... (Keep the same getCurrentLocation logic as before) ...
        setGettingLocation(true);
        setIsLocationEditable(false); 
        setEditableAddress("Fetching location..."); 
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const mockAddress = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (Approx. GPS)`; 
                    setLocationData({ lat, lng });
                    setEditableAddress(mockAddress); 
                    setIsLocationEditable(true); 
                    setGettingLocation(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    showToast({ title: "Location Error", description: `Could not get location: ${error.message}. You can enter it manually.`, variant: "destructive"});
                    setLocationData({ lat: null, lng: null });
                    setEditableAddress(""); 
                    setIsLocationEditable(true); 
                    setGettingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
            );
        } else {
             showToast({ title: "Error", description: "Geolocation is not supported. Please enter the location manually.", variant: "destructive"});
            setEditableAddress("");
            setIsLocationEditable(true); 
            setGettingLocation(false);
        }
    };

    const handlePhotoChange = (event) => {
        // ... (Keep the same handlePhotoChange logic as before) ...
        const file = event.target.files[0];
        if (file) {
            if (photoPreviewURL) URL.revokeObjectURL(photoPreviewURL); 
            setPhoto(file);
            setPhotoPreviewURL(URL.createObjectURL(file));
        }
    };

    const clearPhoto = () => {
        // ... (Keep the same clearPhoto logic as before) ...
        if (photoPreviewURL) URL.revokeObjectURL(photoPreviewURL);
        setPhoto(null);
        setPhotoPreviewURL('');
        if (photoInputRef.current) {
            photoInputRef.current.value = null; 
        }
    };

    // Handle waste condition checkbox changes
    const handleWasteConditionChange = (condition) => {
        setWasteConditions(prev => {
            if (prev.includes(condition)) {
                return prev.filter(c => c !== condition);
            } else {
                return [...prev, condition];
            }
        });
    };

    // Handle priority radio button changes
    const handlePriorityChange = (priority) => {
        setUserPriority(priority);
    };

    const handleSubmit = async (event) => {
        // ... (Keep the same handleSubmit logic as before, including validation and backend call) ...
         event.preventDefault();
        if (!currentUser) { /* ... */ return; }
        if (!title || !description || !category || !photo || !editableAddress) { /* ... */ return; }
        setLoading(true);
        const authToken = localStorage.getItem('authToken'); 
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('latitude', locationData.lat ?? ''); 
        formData.append('longitude', locationData.lng ?? '');
        formData.append('address', editableAddress); 
        formData.append('userId', currentUser._id || currentUser.id); 
        formData.append('username', currentUser.username); 
        formData.append('reportImage', photo);
        formData.append('wasteConditions', JSON.stringify(wasteConditions));
        formData.append('userPriority', userPriority);
        formData.append('wasteAmount', wasteAmount.toString()); 
        try {
            console.log("Submitting report FormData...");
            console.log("User submitting:", currentUser);
            console.log("FormData fields:", {
                title, description, category, 
                latitude: locationData.lat, 
                longitude: locationData.lng,
                address: editableAddress,
                userId: currentUser._id || currentUser.id,
                username: currentUser.username
            });
            const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/reports`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` }
            });
            console.log("Backend Response:", response.data);
            console.log("Success! Report saved with ticket:", response.data.ticketNumber); 
            showToast({ title: "Report Submitted! 🎉", description: `Your report has been successfully recorded. Ticket: ${response.data.ticketNumber || 'N/A'}`, variant: "success"});
            setTitle(''); setDescription(''); setCategory(''); setWasteConditions([]); setUserPriority('medium'); setWasteAmount(50); clearPhoto(); getCurrentLocation(); 
        } catch (error) {
            console.error("Submission Error:", error);
            const errorMsg = error.response?.data?.message || error.message || "An unexpected error occurred.";
            showToast({ title: "Submission Error", description: errorMsg, variant: "destructive"});
        }
        setLoading(false);
    };

    // --- Derived State for UI ---
    const isFormValid = title && description && category && photo && editableAddress;
    const isSubmitDisabled = !isFormValid || loading || gettingLocation; 
    
    // --- Render Component ---
    if (!currentUser && !localStorage.getItem('user')) {
        return <div className="home-page-wrapper report-page-layout"><p>Redirecting to login...</p></div>; 
    }

    return (
        // Use HomePage wrapper class + specific layout class
        <div className="home-page-wrapper report-page-layout"> 
            
            {/* Header */}
            <header id="mainHeader" ref={mainHeaderRef} className="home-header"> 
                <nav className="container nav-bar report-header-nav"> 
                    <Link to="/" className="saniti-logo hero-logo">
                        SanitiWatch
                    </Link>
                    <div className="nav-user-section"> 
                        {currentUser ? (
                            <>
                                <span className="user-greeting">Welcome, {currentUser.username}!</span>
                                <Link to={`/${currentUser.role}`} className="hero-button login-button-nav">Dashboard</Link>
                            </>
                        ) : (
                            <Link to="/auth" className="hero-button login-button-nav">Login</Link>
                        )}
                    </div>
                </nav>
            </header>

            {/* --- Main Content Area - Use container for width --- */}
            {/* REMOVED hero-section */}
            <div className="container report-form-container"> {/* Added specific class */}
                
                 {/* --- MOVED FORM AREA HERE --- */}
                 {/* REMOVED hero-card */}
                 <div className="report-form-area"> {/* New wrapper for styling */}
                    {/* Card Header */}
                    <div className="report-card-header">
                        <h3 className="report-card-title"> 
                            {/* Camera Icon SVG */}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-lg mr-2">
                                <path d="M18 22h-3l-2-2h-4l-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5L12 3.5 14.5 5H18a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2z" />
                                <circle cx="12" cy="13" r="3" />
                            </svg>
                            Report an Issue
                        </h3>
                        <p className="report-card-description">
                           Help keep our community clean. Fill out the details below.
                        </p>
                    </div>
                        
                    {/* Card Content / Form */}
                    <div className="report-card-content">
                        <form onSubmit={handleSubmit} className="space-y-6"> 
                            
                            {/* Issue Title */}
                            <div className="form-group">
                                <label htmlFor="title-input" className="form-label">Issue Title *</label>
                                <input id="title-input" type="text" placeholder="e.g., Overflowing bin at Park Street" value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field"/>
                            </div>

                            {/* Category */}
                            <div className="form-group">
                                <label htmlFor="category-select" className="form-label">Category *</label>
                                <select id="category-select" value={category} onChange={(e) => setCategory(e.target.value)} required className="select-field">
                                    <option value="" disabled>Select a category</option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat.value}>
                                            {cat.value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Waste Conditions */}
                            <div className="form-group">
                                <label className="form-label">Waste Condition (Check all that apply)</label>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                                    gap: '0.75rem', 
                                    marginTop: '0.75rem' 
                                }}>
                                    {[
                                        { value: 'smelly', label: 'Smelly', icon: '🦨' },
                                        { value: 'hazardous', label: 'Hazardous', icon: '⚠️' },
                                        { value: 'blocking_pathway', label: 'Blocking pathway', icon: '🚧' },
                                        { value: 'pest_infestation', label: 'Pest infestation', icon: '🐛' },
                                        { value: 'fire_risk', label: 'Fire risk', icon: '🔥' },
                                        { value: 'spillage', label: 'Spillage', icon: '💧' },
                                        { value: 'other', label: 'Other', icon: '📋' }
                                    ].map((condition) => (
                                        <label key={condition.value} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.75rem', 
                                            cursor: 'pointer', 
                                            padding: '1rem', 
                                            borderRadius: '1rem', 
                                            border: `2px solid ${wasteConditions.includes(condition.value) ? '#1066c1' : '#e2e8f0'}`,
                                            background: wasteConditions.includes(condition.value) 
                                                ? 'linear-gradient(135deg, rgba(16, 102, 193, 0.1) 0%, rgba(16, 102, 193, 0.05) 100%)' 
                                                : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: wasteConditions.includes(condition.value) 
                                                ? '0 8px 16px rgba(16, 102, 193, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                                                : '0 2px 4px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                                            transform: wasteConditions.includes(condition.value) ? 'translateY(-2px)' : 'translateY(0)'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={wasteConditions.includes(condition.value)}
                                                onChange={() => handleWasteConditionChange(condition.value)}
                                                style={{ 
                                                    cursor: 'pointer',
                                                    width: '18px',
                                                    height: '18px',
                                                    accentColor: '#1066c1'
                                                }}
                                            />
                                            <span style={{ fontSize: '1.25rem' }}>{condition.icon}</span>
                                            <span style={{ 
                                                fontSize: '0.9rem', 
                                                fontWeight: '500',
                                                color: wasteConditions.includes(condition.value) ? '#1066c1' : '#374151'
                                            }}>{condition.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Priority Level */}
                            <div className="form-group">
                                <label className="form-label">Priority Level *</label>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                                    gap: '0.75rem', 
                                    marginTop: '0.75rem' 
                                }}>
                                    {[
                                        { value: 'low', label: 'Low', color: '#10b981', icon: '🟢' },
                                        { value: 'medium', label: 'Medium', color: '#f59e0b', icon: '🟡' },
                                        { value: 'high', label: 'High', color: '#ef4444', icon: '🔴' },
                                        { value: 'emergency', label: 'Emergency', color: '#dc2626', icon: '🚨' }
                                    ].map((priority) => (
                                        <label key={priority.value} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.75rem', 
                                            cursor: 'pointer', 
                                            padding: '1rem', 
                                            borderRadius: '0.75rem', 
                                            border: `2px solid ${userPriority === priority.value ? priority.color : '#e5e7eb'}`, 
                                            backgroundColor: userPriority === priority.value ? `${priority.color}15` : '#ffffff', 
                                            transition: 'all 0.2s ease',
                                            boxShadow: userPriority === priority.value ? `0 4px 6px ${priority.color}20` : '0 1px 3px rgba(0, 0, 0, 0.1)'
                                        }}>
                                            <input
                                                type="radio"
                                                name="userPriority"
                                                value={priority.value}
                                                checked={userPriority === priority.value}
                                                onChange={() => handlePriorityChange(priority.value)}
                                                style={{ 
                                                    cursor: 'pointer',
                                                    width: '18px',
                                                    height: '18px',
                                                    accentColor: priority.color
                                                }}
                                            />
                                            <span style={{ fontSize: '1.1rem' }}>{priority.icon}</span>
                                            <span style={{ 
                                                fontSize: '0.9rem', 
                                                fontWeight: '600', 
                                                color: userPriority === priority.value ? priority.color : '#374151'
                                            }}>{priority.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Waste Amount Slider */}
                            <div className="form-group">
                                <label className="form-label">Amount of Waste (0-100) *</label>
                                <div style={{ marginTop: '0.75rem' }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '1rem',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <span style={{ 
                                            fontSize: '0.875rem', 
                                            color: '#6b7280',
                                            minWidth: '20px'
                                        }}>0</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={wasteAmount}
                                            onChange={(e) => setWasteAmount(parseInt(e.target.value))}
                                            style={{
                                                flex: 1,
                                                height: '8px',
                                                borderRadius: '4px',
                                                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${wasteAmount}%, #e5e7eb ${wasteAmount}%, #e5e7eb 100%)`,
                                                outline: 'none',
                                                cursor: 'pointer'
                                            }}
                                        />
                                        <span style={{ 
                                            fontSize: '0.875rem', 
                                            color: '#6b7280',
                                            minWidth: '30px'
                                        }}>100</span>
                                    </div>
                                    <div style={{ 
                                        textAlign: 'center',
                                        padding: '0.75rem',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: '2px solid rgba(245, 158, 11, 0.3)',
                                        borderRadius: '0.5rem',
                                        fontSize: '1.125rem',
                                        fontWeight: '600',
                                        color: '#f59e0b'
                                    }}>
                                        {wasteAmount}%
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label htmlFor="description-textarea" className="form-label">Description *</label>
                                <textarea id="description-textarea" placeholder="Describe the issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} rows="4" required className="textarea-field"></textarea>
                            </div>

                            {/* Photo Evidence */}
                            <div className="form-group">
                                <label className="form-label">Photo Evidence *</label>
                                <div className="photo-dropzone"> 
                                    {photoPreviewURL ? ( /* ... Photo Preview ... */
                                         <div className="photo-preview-container">
                                            <img src={photoPreviewURL} alt="Preview" className="photo-preview" />
                                            <button type="button" onClick={clearPhoto} className="hero-button change-photo-button">Change Photo</button>
                                        </div>
                                    ) : ( /* ... Upload Prompt ... */
                                        <div>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-photo-upload"> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /> <polyline points="17 8 12 3 7 8" /> <line x1="12" y1="3" x2="12" y2="15" /> </svg>
                                            <label htmlFor="photo-input" className="upload-label">Click to upload or take a photo</label>
                                            <input id="photo-input" type="file" accept="image/*" onChange={handlePhotoChange} ref={photoInputRef} style={{ display: 'none' }} required />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Location */}
                            <div className="form-group">
                                <label className="form-label">Location *</label>
                                <div className="location-bar"> 
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-md location-icon"> <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /> <circle cx="12" cy="10" r="3" /> </svg>
                                    <input type="text" className="input-field location-input" value={editableAddress} onChange={(e) => setEditableAddress(e.target.value)} placeholder={gettingLocation ? "Acquiring location..." : "Enter address or refresh GPS"} disabled={!isLocationEditable} required />
                                    <button type="button" onClick={getCurrentLocation} disabled={gettingLocation} className="hero-button refresh-location-button" title="Refresh Location" >
                                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`icon-sm ${gettingLocation ? 'animate-spin' : ''}`}> <polyline points="23 4 23 10 17 10"></polyline> <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path> </svg>
                                    </button>
                                </div>
                                {locationData.lat && locationData.lng && ( <p className="location-coords">Lat: {locationData.lat.toFixed(5)}, Lng: {locationData.lng.toFixed(5)}</p> )}
                            </div>

                            {/* Submit Button */}
                            <button 
                                type="submit" 
                                disabled={isSubmitDisabled} 
                                className="hero-button submit-report-button"
                                style={{
                                    width: '100%',
                                    padding: '1rem 2rem',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    borderRadius: '0.75rem',
                                    background: isSubmitDisabled 
                                        ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' 
                                        : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}>
                                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                        </svg>
                                        Submitting Report...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                                            <path d="M22 2L11 13" />
                                            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                                        </svg>
                                        Submit Report
                                    </>
                                )}
                            </button>
                        </form>
                    </div> {/* End Card Content */}
                 </div> {/* End Form Area */}

            </div> {/* End Content Container */}

            {/* Toast container */}
            <div id="toast-container"></div> 

        </div> // End Wrapper
    );
};

export default ReportIssuePage;