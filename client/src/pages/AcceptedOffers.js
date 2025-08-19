import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import apiService from '../services/api';
import { 
  Shield, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

const AcceptedOffers = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [acceptedOffers, setAcceptedOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const statuses = [
    { id: 'all', name: 'All Statuses' },
    { id: 'active', name: 'Active', color: 'text-green-600' },
    { id: 'cancelled', name: 'Cancelled', color: 'text-red-600' },
    { id: 'expired', name: 'Expired', color: 'text-yellow-600' },
    { id: 'completed', name: 'Completed', color: 'text-blue-600' }
  ];

  useEffect(() => {
    if (user) {
      fetchAcceptedOffers();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      // Listen for offer acceptance notifications
      socket.on('offer_accepted', (data) => {
        toast.success(`Offer accepted: ${data.message || 'Your offer was accepted!'}`);
        fetchAcceptedOffers(); // Refresh to show new accepted offer
      });

      return () => {
        socket.off('offer_accepted');
      };
    }
  }, [socket, user]);

  const fetchAcceptedOffers = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      
      // Resolve userId shape from auth state
      const clientId = user?.user?._id || user?._id;
      
      // Call the real API to get accepted offers
      const response = await apiService.getClientAcceptedOffers(clientId, 50, 1, 'all');
      
      if (response && response.success) {
        setAcceptedOffers(response.data);
      } else {
        setAcceptedOffers([]);
      }
      
    } catch (error) {
      console.error('Error loading accepted offers:', error);
      setAcceptedOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to cancel this insurance offer? This action cannot be undone.')) return;

    try {
      // Update offer status via API
      const response = await apiService.updateAcceptedOfferStatus(offerId, 'cancelled');
      
      if (response && response.success) {
        // Update local state to mark offer as cancelled
        setAcceptedOffers(prev => prev.map(offer => 
          offer._id === offerId 
            ? { ...offer, status: 'cancelled' }
            : offer
        ));
        
        toast.success('Insurance offer cancelled successfully');
      } else {
        toast.error('Failed to cancel offer');
      }
      
    } catch (error) {
      console.error('Error cancelling offer:', error);
      toast.error('Failed to cancel offer');
    }
  };

  const filteredOffers = acceptedOffers.filter(offer => {
    const matchesSearch = offer.offerId?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.offerId?.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || offer.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const statusConfig = {
      active: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      expired: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return statusConfig[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const iconConfig = {
      active: CheckCircle,
      cancelled: XCircle,
      expired: AlertCircle,
      completed: CheckCircle
    };
    return iconConfig[status] || CheckCircle;
  };

  // No need to check authentication - user is always available
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Accepted Offers</h1>
          <p className="text-gray-600 mt-2">Manage your accepted insurance offers and policies</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search offers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statuses.map(status => (
                <option key={status.id} value={status.id}>{status.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Accepted Offers List */}
        <div className="bg-white rounded-lg shadow-md">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading accepted offers...</p>
            </div>
          ) : filteredOffers.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredOffers.map((acceptedOffer) => {
                const StatusIcon = getStatusIcon(acceptedOffer.status);
                return (
                  <div key={acceptedOffer._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {acceptedOffer.offerId?.title || 'Insurance Offer'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(acceptedOffer.status)}`}>
                            {acceptedOffer.status}
                          </span>
                          <StatusIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">{acceptedOffer.offerId?.category || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">
                              {acceptedOffer.coverageAmountFormatted}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">
                              {acceptedOffer.monthlyPremiumFormatted}/month
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {new Date(acceptedOffer.startDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {acceptedOffer.additionalNotes && (
                          <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">Notes:</span> {acceptedOffer.additionalNotes}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Accepted {acceptedOffer.timeSinceAcceptance}
                          </span>
                          {acceptedOffer.providerId?.profile?.companyName && (
                            <span className="font-medium">
                              Provider: {acceptedOffer.providerId.profile.companyName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        {acceptedOffer.status === 'active' && (
                          <button
                            onClick={() => handleCancelOffer(acceptedOffer._id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No accepted offers found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Browse the marketplace to find and accept insurance offers'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptedOffers;
