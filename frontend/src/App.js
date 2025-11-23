import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// --- Import Your Pages ---
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ManagementPage from './pages/ManagementPage';
import WorkerPage from './pages/WorkerPage';
import AdminPage from './pages/AdminPage';
import UserPage from './pages/UserPage';
import WorkerRegistrationPage from './pages/WorkerRegistrationPage';
import UserRegistrationPage from './pages/UserRegistrationPage';
import ManagementRegistrationPage from './pages/ManagementRegistrationPage';
import AdminRegistrationPage from './pages/AdminRegistrationPage';
import AuthPage from './pages/AuthPage';  
import AdminRoute from './components/AdminRoute';
import ReportIssuePage from './pages/ReportIssuePage';
import StatusPage from './pages/StatusPage';
import ManagePage from './pages/TriagePage'; // Keep filename as TriagePage.js but use as ManagePage
import ContactUsPage from './pages/ContactUsPage';
import ProfilePage from './pages/ProfilePage';

// --- 1. Import your new Layout component ---
import Layout from './components/Layout';

import './App.css';

function App() {
  useEffect(() => {
    // Warm-up on first load
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/warmup`)
      .then(() => console.log("Backend warmed on load"))
      .catch(() => console.log("Warmup failed on load"));
    
    // Auto warm every 10 minutes
    const interval = setInterval(() => {
      fetch(`${process.env.REACT_APP_API_BASE_URL}/api/warmup`)
        .then(() => console.log("Auto warm-up ping sent"))
        .catch(() => console.log("Auto warm-up failed"));
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        
        {/* --- FULL-SCREEN PAGES --- */}
        {/* These routes are outside the Layout and have NO navbar */}
        
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/report" element={<ReportIssuePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/worker-registration" element={<WorkerRegistrationPage />} />
        <Route path="/user-registration" element={<UserRegistrationPage />} />
        <Route path="/management-registration" element={<ManagementRegistrationPage />} />
        <Route path="/admin-registration" element={<AdminRegistrationPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        


        {/* --- PAGES WITH NAVBAR --- */}
        {/* These routes are *nested* inside the <Layout> component
            and WILL get the main navbar.
        */}
        <Route element={<Layout />}>
          <Route path="/user" element={<UserPage />} />
          <Route path="/management" element={<ManagementPage />} />
          <Route path="/worker" element={<WorkerPage />} />
          {/* --- PROTECTED ADMIN ROUTE --- */}
          <Route element={<AdminRoute />}> 
             <Route path="/admin" element={<AdminPage />} />
             <Route path="/manage" element={<ManagePage />} /> 
          </Route>
          {/* Add any other pages (like a /status page) here */}
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;