// client/src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import SocketConnector from './components/SocketConnector';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import InsuranceRequests from './pages/InsuranceRequests';
import InsuranceRequest from './pages/InsuranceRequest';
import AcceptedOffers from './pages/AcceptedOffers';
import PostedOffers from './pages/PostedOffers';
import BrowseRequests from './pages/BrowseRequests';
import PostInsuranceOffer from './pages/PostInsuranceOffer';
import BidSubmission from './pages/BidSubmission';
import BidManagement from './pages/BidManagement';
import RequestDetail from './pages/RequestDetail';
import GroupInsuranceDashboard from './components/GroupInsuranceDashboard';
import KYCVerification from './components/KYCVerification';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import ChatPage from './pages/ChatPage';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  // Clear MockDataStore localStorage data since we're no longer using it
  useEffect(() => {
    // console.log('🧹 App: Clearing MockDataStore localStorage data');
    localStorage.removeItem('insurance_requests');
    localStorage.removeItem('insurance_bids');
    localStorage.removeItem('insurance_accepted_offers');
    localStorage.removeItem('insurance_chat_rooms');
    localStorage.removeItem('insurance_messages');
    localStorage.removeItem('insurance_chat_participants');
    localStorage.removeItem('insurance_group_deals');
    localStorage.removeItem('insurance_group_bids');
    localStorage.removeItem('insurance_group_participants');
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <SocketProvider>
          <Router>
            <div className="App">
              <SocketConnector />
              <Navbar />
              <main>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/login" element={<Login />} />

                  {/* Protected Routes - All Users */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />

                  {/* Protected Routes - Clients Only */}
                  <Route path="/insurance-requests" element={
                    <ProtectedRoute requiredRole="client">
                      <InsuranceRequests />
                    </ProtectedRoute>
                  } />
                  <Route path="/accepted-offers" element={
                    <ProtectedRoute requiredRole="client">
                      <AcceptedOffers />
                    </ProtectedRoute>
                  } />
                  <Route path="/posted-offers" element={
                    <ProtectedRoute requiredRole="provider">
                      <PostedOffers />
                    </ProtectedRoute>
                  } />
                  <Route path="/group-insurance-dashboard" element={
                    <ProtectedRoute requiredRole="client">
                      <GroupInsuranceDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/insurance-request/new" element={
                    <ProtectedRoute requiredRole="client">
                      <InsuranceRequest />
                    </ProtectedRoute>
                  } />
                  <Route path="/insurance-request/:requestId" element={
                    <ProtectedRoute requiredRole="client">
                      <InsuranceRequest />
                    </ProtectedRoute>
                  } />

                  {/* Protected Routes - Providers Only */}
                  <Route path="/browse-requests" element={
                    <ProtectedRoute requiredRole="provider">
                      <BrowseRequests />
                    </ProtectedRoute>
                  } />
                  <Route path="/post-insurance-offer" element={
                    <ProtectedRoute requiredRole="provider">
                      <PostInsuranceOffer />
                    </ProtectedRoute>
                  } />
                  <Route path="/kyc" element={
                    <ProtectedRoute requiredRole="provider">
                      <KYCVerification />
                    </ProtectedRoute>
                  } />
                  <Route path="/bid-submission/:requestId" element={
                    <ProtectedRoute requiredRole="provider">
                      <BidSubmission />
                    </ProtectedRoute>
                  } />
                  <Route path="/bid-management/:requestId" element={
                    <ProtectedRoute>
                      <BidManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/request-detail/:id" element={
                    <ProtectedRoute>
                      <RequestDetail />
                    </ProtectedRoute>
                  } />

                  {/* Chat Routes */}
                  <Route path="/chat/:chatId" element={
                    <ProtectedRoute>
                      <ChatPage />
                    </ProtectedRoute>
                  } />
                </Routes>
              </main>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </div>
          </Router>
        </SocketProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
