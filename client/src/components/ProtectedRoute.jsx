import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // Redirect to the correct dashboard based on role
    return <Navigate to={user.role === 'customer' ? '/customer' : '/delivery'} replace />;
  }

  return children;
};

export default ProtectedRoute;
