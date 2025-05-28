import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home'; // Ensure paths are correct
import Login from './pages/Login';
import Register from './pages/Register';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, isInitialized } = useAuth(); // Use isInitialized here

  if (!isInitialized) { // Show global loader ONLY until AuthContext is initialized
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p className="ml-3 text-gray-700">Loading Application...</p>
      </div>
    );
  }

  // Once initialized, render the routes.
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} /> {/* Fallback route */}
    </Routes>
  );
}

export default App;