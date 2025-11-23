// src/components/AdminRoute.js (or similar)
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// Function to check auth status and role from localStorage
const useAuth = () => {
  try {
    const userString = localStorage.getItem('user');
    const token = localStorage.getItem('authToken'); // Also check if token exists

    if (userString && token) {
      const user = JSON.parse(userString);
      if (user.role === 'admin' || user.role === 'management') {
        return { isLoggedIn: true, isAdmin: true };
      } else {
        // Logged in, but not admin/management
        return { isLoggedIn: true, isAdmin: false }; 
      }
    }
  } catch (error) {
    console.error("Error reading auth status from localStorage", error);
    // If error parsing, treat as logged out
  }
  // Not logged in or error reading localStorage
  return { isLoggedIn: false, isAdmin: false }; 
};

const AdminRoute = () => {
  const { isLoggedIn, isAdmin } = useAuth();

  if (!isLoggedIn) {
    // If not logged in at all, redirect to auth page
    console.log("AdminRoute: Not logged in, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    // If logged in but NOT admin/management, redirect to home page
    console.log("AdminRoute: Logged in but not admin/management, redirecting to /");
    alert("Access Denied: You do not have admin or management privileges.");
    return <Navigate to="/" replace />; 
  }

  // If logged in AND is admin/management, render the child component
  console.log("AdminRoute: Admin/Management access granted.");
  return <Outlet />; 
};

export default AdminRoute;