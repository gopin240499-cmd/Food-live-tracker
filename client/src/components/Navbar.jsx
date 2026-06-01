import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SocketStatus from './SocketStatus';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white text-lg">
          🛵
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
          LiveTrack
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <SocketStatus />
        {user && (
          <>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
              <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                {user.name?.[0]?.toUpperCase()}
              </span>
              <span className="font-medium">{user.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">
                {user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
