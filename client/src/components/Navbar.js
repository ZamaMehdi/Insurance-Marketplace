import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building, 
  User, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Shield
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import ChatInterface from './ChatInterface';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatData, setChatData] = useState(null);

  const handleLogout = () => {
    logout();
    toast.success('You have been logged out successfully');
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const handleOpenChat = (chatInfo) => {
    setChatData(chatInfo);
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setChatData(null);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Insurance Marketplace</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated() ? (
              <>
                {/* Authenticated User Navigation */}
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                
                {user?.role === 'client' && (
                  <>
                    <Link
                      to="/insurance-requests"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      My Insurance Requests
                    </Link>

                    <Link
                      to="/group-insurance-dashboard"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Group Insurance
                    </Link>
                  </>
                )}

                {user?.role === 'provider' && (
                  <>
                    <Link
                      to="/posted-offers"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      My Offers
                    </Link>
                    <Link
                      to="/browse-requests"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Browse Requests
                    </Link>
                    <Link
                      to="/post-insurance-offer"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Post Offer
                    </Link>
                    <Link
                      to="/kyc"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      KYC
                    </Link>
                  </>
                )}

                <Link
                  to="/marketplace"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Marketplace
                </Link>

                {/* Notification Bell */}
                <NotificationBell onOpenChat={handleOpenChat} />

                {/* User Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {user?.role === 'provider' ? (
                        <Building className="h-4 w-4 text-blue-600" />
                      ) : (
                        <User className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <span>{user?.profile?.firstName || user?.email}</span>
                    {user?.role === 'provider' && user?.kycStatus === 'verified' && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </span>
                    )}
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <p className="font-medium">{user?.profile?.firstName} {user?.profile?.lastName}</p>
                      <p className="text-gray-500">{user?.email}</p>
                      <p className="text-blue-600 capitalize">{user?.role}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Guest Navigation */}
                <Link
                  to="/marketplace"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Browse Marketplace
                </Link>
                
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600 p-2 rounded-md"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated() ? (
              <>
                <Link
                  to="/dashboard"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                  onClick={closeMobileMenu}
                >
                  Dashboard
                </Link>
                
                {user?.role === 'client' && (
                  <>
                    <Link
                      to="/insurance-requests"
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                      onClick={closeMobileMenu}
                    >
                      My Insurance Requests
                    </Link>
                    <Link
                      to="/accepted-offers"
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                      onClick={closeMobileMenu}
                    >
                      My Accepted Offers
                    </Link>
                    <Link
                      to="/group-insurance-dashboard"
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                      onClick={closeMobileMenu}
                    >
                      Group Insurance
                    </Link>
                  </>
                )}

                {user?.role === 'provider' && (
                  <>
                    <Link
                      to="/posted-offers"
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                      onClick={closeMobileMenu}
                    >
                      My Offers
                    </Link>
                    <Link
                      to="/browse-requests"
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                      onClick={closeMobileMenu}
                    >
                      Browse Requests
                    </Link>
                    <Link
                      to="/post-insurance-offer"
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                      onClick={closeMobileMenu}
                    >
                      Post Offer
                    </Link>
                    <Link
                      to="/kyc"
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                      onClick={closeMobileMenu}
                    >
                      KYC
                    </Link>
                  </>
                )}

                <Link
                  to="/marketplace"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                  onClick={closeMobileMenu}
                >
                  Marketplace
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/marketplace"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                  onClick={closeMobileMenu}
                >
                  Browse Marketplace
                </Link>
                <Link
                  to="/login"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                  onClick={closeMobileMenu}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="block px-3 py-2 text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                  onClick={closeMobileMenu}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {showChat && chatData && (
        <ChatInterface
          isOpen={showChat}
          onClose={handleCloseChat}
          requestId={chatData.requestId}
          otherUserId={chatData.otherUserId}
          otherUserName={chatData.otherUserName}
          otherUserRole={chatData.otherUserRole}
        />
      )}
    </nav>
  );
};

export default Navbar;

