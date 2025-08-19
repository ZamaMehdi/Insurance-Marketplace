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
  Trash2,
  Eye,
  TrendingUp,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

const PostedOffers = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const statuses = [
    { id: 'all', name: 'All Statuses' },
    { id: 'active', name: 'Active', color: 'text-green-600' },
    { id: 'paused', name: 'Paused', color: 'text-yellow-600' },
    { id: 'expired', name: 'Expired', color: 'text-red-600' },
    { id: 'draft', name: 'Draft', color: 'text-gray-600' },
    { id: 'accepted', name: 'Accepted', color: 'text-green-600' }
  ];

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'health', name: 'Health' },
    { id: 'auto', name: 'Auto' },
    { id: 'life', name: 'Life' },
    { id: 'property', name: 'Property' },
    { id: 'business', name: 'Business' },
    { id: 'travel', name: 'Travel' }
  ];

  useEffect(() => {
    if (user && user.role === 'provider') {
      fetchPostedOffers();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      // Listen for offer acceptance notifications
      socket.on('offer_accepted', (data) => {
        console.log('PostedOffers: Offer accepted notification:', data);
        toast.success(`Your offer "${data.offerTitle || 'Insurance Offer'}" was accepted!`);
        fetchPostedOffers(); // Refresh to show updated status
      });

      return () => {
        socket.off('offer_accepted');
      };
    }
  }, [socket, user]);

  const fetchPostedOffers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('PostedOffers: Loading provider offers from API');
      
      const response = await apiService.getProviderOffers();
      
      if (response && response.offers && Array.isArray(response.offers)) {
        setOffers(response.offers);
        console.log('✅ Provider offers loaded:', response.offers.length);
        console.log('🔍 Offer data structure:', response.offers[0]); // Debug first offer
      } else if (response && Array.isArray(response)) {
        setOffers(response);
        console.log('✅ Provider offers loaded (fallback):', response.length);
        console.log('🔍 Offer data structure:', response[0]); // Debug first offer
      } else {
        setOffers([]);
        console.log('❌ Failed to load provider offers');
        console.log('❌ Response format:', response);
      }
      
    } catch (error) {
      console.error('Error loading provider offers:', error);
      setOffers([]);
      toast.error('Failed to load your posted offers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to delete this insurance offer? This action cannot be undone.')) return;

    try {
      console.log('PostedOffers: Deleting offer via API');
      
      const response = await apiService.deleteOffer(offerId);
      
      if (response && (response.success || response.message)) {
        // Remove from local state
        setOffers(prev => prev.filter(offer => offer._id !== offerId));
        toast.success('Insurance offer deleted successfully');
      } else {
        toast.error('Failed to delete offer');
      }
      
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Failed to delete offer. Please try again.');
    }
  };

  const handleToggleStatus = async (offerId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      console.log('PostedOffers: Toggling offer status to:', newStatus);
      
      const response = await apiService.toggleOfferStatus(offerId, newStatus);
      
      if (response && (response.success || response.message)) {
        // Update local state
        setOffers(prev => prev.map(offer => 
          offer._id === offerId 
            ? { ...offer, status: newStatus }
            : offer
        ));
        toast.success(`Offer ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
      } else {
        toast.error('Failed to update offer status');
      }
      
    } catch (error) {
      console.error('Error toggling offer status:', error);
      toast.error('Failed to update offer status. Please try again.');
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (selectedStatus === 'accepted') {
      matchesStatus = (offer.acceptedCount || 0) > 0;
    } else if (selectedStatus !== 'all') {
      matchesStatus = offer.status === selectedStatus;
    }
    
    const matchesCategory = selectedCategory === 'all' || offer.category === selectedCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status) => {
    const statusConfig = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800'
    };
    return statusConfig[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const iconConfig = {
      active: CheckCircle,
      paused: AlertCircle,
      expired: XCircle,
      draft: Clock
    };
    return iconConfig[status] || Clock;
  };

  // Check if user is a provider
  if (!user || user.role !== 'provider') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only insurance providers can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Posted Offers</h1>
              <p className="text-gray-600 mt-2">Manage your insurance offers and track their performance</p>
            </div>
            {user?.kycStatus === 'verified' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <Shield className="h-4 w-4 mr-2" />
                KYC Verified
              </span>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        {offers.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Offers</p>
                    <p className="text-2xl font-bold text-gray-900">{offers.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Accepted Offers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {offers.reduce((sum, offer) => sum + (offer.acceptedCount || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Coverage</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${offers.reduce((sum, offer) => {
                        // Use offer's own coverage amount (potential coverage)
                        const coverage = offer.offerCoverage || offer.coverageDetails?.maxAmount || 0;
                        return sum + coverage;
                      }, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Accepted: ${offers.reduce((sum, offer) => sum + (offer.totalAcceptedCoverage || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Monthly Premium</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${offers.reduce((sum, offer) => {
                        // Use offer's own premium amount (potential premium)
                        let premium = offer.offerPremium || offer.pricing?.basePremium || 0;
                        
                        // Convert to monthly if needed
                        const frequency = offer.paymentFrequency || offer.pricing?.paymentFrequency || 'monthly';
                        if (frequency === 'annually') {
                          premium = premium / 12;
                        } else if (frequency === 'quarterly') {
                          premium = premium / 3;
                        } else if (frequency === 'semi-annually') {
                          premium = premium / 6;
                        }
                        // If monthly, use as is
                        
                        return sum + premium;
                      }, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Accepted: ${offers.reduce((sum, offer) => sum + (offer.totalAcceptedPremium || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Statistics Explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Understanding Your Statistics</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p><strong>Total Coverage:</strong> Shows the maximum coverage amount your offers can provide (potential).</p>
                    <p><strong>Monthly Premium:</strong> Shows the total monthly premium your offers can generate (potential).</p>
                    <p><strong>Accepted:</strong> Shows the actual coverage and premium from offers that clients have accepted.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

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

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Posted Offers List */}
        <div className="bg-white rounded-lg shadow-md">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your offers...</p>
            </div>
          ) : filteredOffers.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredOffers.map((offer) => {
                const StatusIcon = getStatusIcon(offer.status);
                return (
                  <div key={offer._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {offer.title || 'Insurance Offer'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(offer.status)}`}>
                            {offer.status}
                          </span>
                          <StatusIcon className="h-5 w-5 text-gray-400" />
                          
                          {/* Acceptance Badge */}
                          {offer.acceptedCount > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {offer.acceptedCount} accepted
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-600 mb-4">
                          {offer.description || 'No description available'}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">{offer.category || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">
                              ${offer.pricing?.basePremium?.toLocaleString() || 'N/A'}/month
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">
                              ${offer.coverageDetails?.minAmount?.toLocaleString() || 'N/A'} - ${offer.coverageDetails?.maxAmount?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Eye className="h-4 w-4" />
                            <span>{offer.viewCount || 0} views</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>{offer.inquiryCount || 0} inquiries</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <TrendingUp className="h-4 w-4" />
                            <span>{offer.rating?.average?.toFixed(1) || 'N/A'} rating</span>
                          </div>
                        </div>

                        {/* Acceptance Information */}
                        {offer.acceptedCount > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <h4 className="font-semibold text-green-800">
                                Accepted by {offer.acceptedCount} client{offer.acceptedCount > 1 ? 's' : ''}
                              </h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                              <div className="text-sm">
                                <span className="text-green-700 font-medium">Total Coverage:</span>
                                <span className="text-green-800 ml-2">
                                  ${offer.totalAcceptedCoverage?.toLocaleString() || 'N/A'}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-green-700 font-medium">Total Premium:</span>
                                <span className="text-green-800 ml-2">
                                  ${offer.totalAcceptedPremium?.toLocaleString() || 'N/A'}/month
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-green-700 font-medium">Acceptance Rate:</span>
                                <span className="text-green-800 ml-2">
                                  {((offer.acceptedCount / (offer.acceptedCount + (offer.viewCount || 0))) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>

                            {/* Accepted Clients List */}
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium text-green-700">Accepted Clients:</h5>
                              {offer.acceptedOffers?.map((acceptedOffer, index) => (
                                <div key={index} className="bg-white rounded border border-green-200 p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-green-800">
                                        {acceptedOffer.clientId?.profile?.firstName} {acceptedOffer.clientId?.profile?.lastName}
                                      </div>
                                      <div className="text-sm text-green-600">
                                        {acceptedOffer.clientId?.email}
                                      </div>
                                      <div className="text-sm text-green-600">
                                        Coverage: ${acceptedOffer.coverageAmount?.toLocaleString() || 'N/A'} | 
                                        Premium: ${acceptedOffer.monthlyPremium?.toLocaleString() || 'N/A'}/month
                                      </div>
                                    </div>
                                    <div className="text-right text-sm text-green-600">
                                      <div>Accepted {acceptedOffer.acceptedAt ? new Date(acceptedOffer.acceptedAt).toLocaleDateString() : 'N/A'}</div>
                                      <div className="capitalize">{acceptedOffer.status}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {offer.tags && offer.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {offer.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleToggleStatus(offer._id, offer.status)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            offer.status === 'active' 
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {offer.status === 'active' ? 'Pause' : 'Activate'}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteOffer(offer._id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No offers found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters' 
                  : 'You haven\'t posted any insurance offers yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostedOffers;
                                                                                                                                                                                                                                                                                                                                                                                