import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedRoute = ({ children }: { children: React.JSX.Element }) => {
  const { user, isInitialized, operationLoading } = useAuth();
  const location = useLocation();

  // App.tsx handles the !isInitialized state with a global loader.
  // So, when ProtectedRoute renders, isInitialized should be true.
  // For safety or if App.tsx structure changes, you can add a check:
  if (!isInitialized) {
    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <svg className="animate-spin h-10 w-10 text-blue-600" /* ... */ ></svg>
            <p className="ml-3 text-gray-700">Initializing session...</p>
        </div>
    );
  }

  // If an auth operation is in progress while on a protected page (e.g., background token refresh)
  // You might want to show a specific loader for the protected content.
  // This is optional and depends on your app's UX requirements.
  if (operationLoading && user) { // Only show if user still exists but an operation is running
      return (
          <div className="flex justify-center items-center min-h-screen bg-gray-100">
               <svg className="animate-spin h-10 w-10 text-blue-600" /* ... */ ></svg>
              <p className="ml-3 text-gray-700">Processing...</p>
          </div>
      );
  }

  if (!user) {
    // User is not authenticated after initialization
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};