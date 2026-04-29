import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Navbar: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleBadgeColor = {
    student: 'bg-blue-100 text-blue-700',
    canteen_staff: 'bg-green-100 text-green-700',
    canteen_admin: 'bg-purple-100 text-purple-700',
  };

  const roleLabel = {
    student: 'Student',
    canteen_staff: 'Staff',
    canteen_admin: 'Admin',
  };

  const navLinks = userProfile?.role === 'student'
    ? [
        { to: '/dashboard', label: 'Home' },
        { to: '/menu', label: 'Menu' },
        { to: '/orders', label: 'My Orders' },
      ]
    : userProfile?.role === 'canteen_staff'
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/kitchen', label: 'Kitchen Display' },
        { to: '/menu-manage', label: 'Manage Menu' },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/kitchen', label: 'Kitchen' },
        { to: '/menu-manage', label: 'Menu' },
        { to: '/reports', label: 'Reports' },
        { to: '/ai-predict', label: '✨ AI Predict' },
      ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🍽️</span>
            </div>
            <span className="font-bold text-gray-900 hidden sm:block">
              Campus Canteen
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Cart (students only) */}
            {userProfile?.role === 'student' && (
              <Link
                to="/cart"
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-xl">🛒</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt={userProfile.displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                    {userProfile?.displayName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 leading-tight">
                    {userProfile?.displayName}
                  </p>
                  {userProfile?.role && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        roleBadgeColor[userProfile.role]
                      }`}
                    >
                      {roleLabel[userProfile.role]}
                    </span>
                  )}
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userProfile?.displayName}</p>
                    <p className="text-xs text-gray-500">{userProfile?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="text-gray-600">☰</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden pb-3 border-t border-gray-100">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium ${
                  location.pathname === link.to
                    ? 'text-orange-600 bg-orange-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
