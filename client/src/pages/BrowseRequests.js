import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import apiService from '../services/api';
import { 
  Search, 
  Filter, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Building, 
  Clock, 
  Users, 
  Shield,
  TrendingUp,
  MessageSquare,
  Plus,
  CheckCircle,
  Eye,
  Send,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import ChatInterface from '../components/ChatInterface';

const BrowseRequests = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('all');
  const [selectedMinAmount, setSelectedMinAmount] = useState('');
  const [selectedMaxAmount, setSelectedMaxAmount] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showBidForm, setShowBidForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [bidFormData, setBidFormData] = useState({
    amount: '',
    percentage: '',
    premium: '',
    terms: '',
    conditions: []
  });

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatRequest, setChatRequest] = useState(null);
  const [chatClient, setChatClient] = useState(null);
  
  // Group insurance states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroupRequest, setSelectedGroupRequest] = useState(null);
  const [groupBidData, setGroupBidData] = useState({
    coverageAmount: '',
    premium: '',
    terms: ''
  });

  const assetTypes = [
    { id: 'all', name: 'All Asset Types' },
    { id: 'property', name: 'Property', icon: Shield },
    { id: 'vehicle', name: 'Vehicle', icon: Shield },
    { id: 'business', name: 'Business', icon: Shield },
    { id: 'health', name: 'Health', icon: Shield },
    { id: 'life', name: 'Life', icon: Shield },
    { id: 'liability', name: 'Liability', icon: Shield },
    { id: 'other', name: 'Other', icon: Shield }
  ];

  useEffect(() => {
    fetchRequests();
  }, []);

  // Debug: Log requests state changes
  useEffect(() => {
    console.log('BrowseRequests: Requests state changed:', requests);
    console.log('Number of requests:', requests.length);
    if (requests.length > 0) {
      console.log('First request structure:', requests[0]);
    }
  }, [requests]);

  useEffect(() => {
    if (socket) {
      // Listen for new insurance request notifications
      socket.on('insurance_request_notification', (data) => {
        console.log('BrowseRequests: New insurance request notification:', data);
        toast.success(`New request available: ${data.title} - $${data.amount?.toLocaleString()}`);
        fetchRequests(); // Refresh the requests list
      });

      return () => {
        socket.off('insurance_request_notification');
      };
    }
  }, [socket]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      console.log('BrowseRequests: Loading available requests from MongoDB API');
      
      // Get requests from MongoDB API - use provider-specific endpoint
      const response = await apiService.getProviderAvailableRequests({
        limit: 50
      });
      
      console.log('API Response:', response);
      
      if (response.requests) {
        setRequests(response.requests);
        console.log('Requests loaded from MongoDB API:', response.requests.length);
      } else {
        console.error('Invalid API response format:', response);
        setRequests([]);
      }
      
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load requests. Please try again.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async (e) => {
    e.preventDefault();
    
    if (!selectedRequest || !user) return;

    try {
      console.log('BrowseRequests: Submitting bid to shared store');
      
      // Submit bid to shared data store
      const newBid = await apiService.submitBid({
        requestId: selectedRequest._id,
        providerId: user._id,
        providerName: user.profile?.companyName || 'Insurance Provider',
        amount: Number(bidFormData.amount),
        percentage: Number(bidFormData.percentage),
        premium: Number(bidFormData.premium),
        terms: bidFormData.terms,
        conditions: bidFormData.conditions
      });
      
      console.log('Bid submitted successfully:', newBid);
      
      // Refresh the requests to show updated bid count
      fetchRequests();
      
        toast.success('Bid submitted successfully!');
        setShowBidForm(false);
        setSelectedRequest(null);
        resetBidForm();
        
        // Emit socket event
        if (socket) {
          socket.emit('new_bid', {
            requestId: selectedRequest._id,
            clientId: selectedRequest.clientId,
            providerId: user._id,
            amount: bidFormData.amount,
            percentage: bidFormData.percentage
          });
        }
      
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast.error('Failed to submit bid');
    }
  };

  const resetBidForm = () => {
    setBidFormData({
      amount: '',
      percentage: '',
      premium: '',
      terms: '',
      conditions: []
    });
  };

  const openBidForm = (request) => {
    setSelectedRequest(request);
    setBidFormData({
      amount: '',
      percentage: '',
      premium: '',
      terms: '',
      conditions: []
    });
    setShowBidForm(true);
  };

  const openChat = (request) => {
    setChatRequest(request);
    setChatClient({ 
      id: request.clientId, 
      name: 'Client', 
      role: 'client' 
    });
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
    setChatRequest(null);
    setChatClient(null);
  };

  // Group insurance functions
  const openGroupModal = (request) => {
    setSelectedGroupRequest(request);
    setGroupBidData({
      coverageAmount: '',
      premium: '',
      terms: ''
    });
    setShowGroupModal(true);
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setSelectedGroupRequest(null);
    setGroupBidData({
      coverageAmount: '',
      premium: '',
      terms: ''
    });
  };

  const handleGroupBidSubmit = async () => {
    if (!groupBidData.coverageAmount || !groupBidData.premium) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const coverageAmount = parseFloat(groupBidData.coverageAmount);
      const premium = parseFloat(groupBidData.premium);
      const requestedAmount = selectedGroupRequest.insuranceDetails?.requestedAmount;
      const minBidPercentage = selectedGroupRequest.biddingDetails?.minimumBidPercentage || 10;
      const minCoverageAmount = (requestedAmount * minBidPercentage) / 100;

      // Calculate percentage for this bid
      const bidPercentage = Math.round((coverageAmount / requestedAmount) * 100);

      // Validate bid amount
      if (coverageAmount < minCoverageAmount) {
        toast.error(`Coverage amount must be at least ${minBidPercentage}% of requested amount ($${minCoverageAmount.toLocaleString()})`);
        return;
      }

      if (coverageAmount > requestedAmount) {
        toast.error('Coverage amount cannot exceed the total requested amount');
        return;
      }

      // Submit the actual bid using the bids API
      const bidData = {
        requestId: selectedGroupRequest._id,
        amount: coverageAmount,
        percentage: bidPercentage,
        premium: premium,
        terms: groupBidData.terms || 'Group insurance participation',
        conditions: ['Group insurance enabled']
      };

      console.log('🔍 Submitting group insurance bid:', bidData);
      
      const bidResponse = await apiService.submitBid(bidData);
      
      if (bidResponse && bidResponse.success) {
        toast.success('Successfully joined group insurance deal! Your bid has been submitted.');
        closeGroupModal();
        
        // Refresh the requests to show updated bid count
        fetchRequests();
        
        // Emit socket event to notify client
        if (socket) {
          socket.emit('bid_submitted', {
            requestId: selectedGroupRequest._id,
            providerId: user._id,
            amount: coverageAmount,
            percentage: bidPercentage
          });
        }
      } else {
        toast.error('Failed to submit bid. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting group bid:', error);
      toast.error('Failed to submit group bid');
    }
  };

  const getGroupStatus = (request) => {
    // For now, return null since group insurance is not fully implemented
    // This prevents the component from crashing
    return null;
  };

  const filteredRequests = requests.filter(request => {
    // Safety check - ensure request has required properties
    if (!request || !request.title || !request.assetDetails || !request.insuranceDetails) {
      console.log('Skipping invalid request in filter:', request);
      return false;
    }

    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (request.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssetType = selectedAssetType === 'all' || (request.assetDetails?.type || '') === selectedAssetType;
    const matchesMinAmount = !selectedMinAmount || (request.insuranceDetails?.requestedAmount || 0) >= Number(selectedMinAmount);
    const matchesMaxAmount = !selectedMaxAmount || (request.insuranceDetails?.requestedAmount || 0) <= Number(selectedMaxAmount);
    const matchesLocation = !selectedLocation || 
                           (request.assetDetails?.location?.city || '').toLowerCase().includes(selectedLocation.toLowerCase()) ||
                           (request.assetDetails?.location?.state || '').toLowerCase().includes(selectedLocation.toLowerCase()) ||
                           (request.assetDetails?.location?.country || '').toLowerCase().includes(selectedLocation.toLowerCase());
    
    return matchesSearch && matchesAssetType && matchesMinAmount && matchesMaxAmount && matchesLocation;
  });

  const getAssetTypeIcon = (type) => {
    const assetType = assetTypes.find(t => t.id === type);
    return assetType ? assetType.icon : Shield;
  };

  const getRiskLevelColor = (riskLevel) => {
    const riskConfig = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      'very-high': 'bg-red-100 text-red-800'
    };
    return riskConfig[riskLevel] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const priorityConfig = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return priorityConfig[priority] || 'bg-gray-100 text-gray-800';
  };

  const formatTimeRemaining = (deadline) => {
    if (!deadline) return 'No deadline';
    const now = new Date();
    const diff = new Date(deadline) - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Browse Insurance Requests
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find insurance requests that match your expertise and submit competitive bids
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Bar */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Asset Type Filter */}
            <select
              value={selectedAssetType}
              onChange={(e) => setSelectedAssetType(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {assetTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>

            {/* Min Amount Filter */}
            <input
              type="number"
              placeholder="Min Amount"
              value={selectedMinAmount}
              onChange={(e) => setSelectedMinAmount(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Max Amount Filter */}
            <input
              type="number"
              placeholder="Max Amount"
              value={selectedMaxAmount}
              onChange={(e) => setSelectedMaxAmount(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Additional Filters */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Location (City, State, or Country)"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Debug Button */}
            <button
              onClick={() => {
                console.log('=== Debug Info ===');
                apiService.debugStore();
                console.log('Current user:', user);
                console.log('Current requests state:', requests);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Debug Store
            </button>
            
            {/* Reset Store Button */}
            <button
              onClick={() => {
                if (window.confirm('This will reset all data and reload sample data. Continue?')) {
                  apiService.resetStore();
                  fetchRequests();
                  toast.success('Store reset complete. Sample data loaded.');
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reset Store
            </button>
            
            {/* Force Reload Button */}
            <button
              onClick={() => {
                apiService.forceReloadFromStorage();
                fetchRequests();
                toast.success('Data force reloaded from localStorage.');
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Force Reload
            </button>
          </div>
        </div>

        {/* Requests Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading requests...</p>
            </div>
          ) : filteredRequests.length > 0 ? (
            filteredRequests.map((request) => {
              const AssetIcon = getAssetTypeIcon(request.assetDetails.type);
              return (
                <div key={request._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AssetIcon className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600 uppercase">
                            {request.assetDetails.type}
                          </span>
                        </div>
                        
                        {/* Request Details */}
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                            {request.priority}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span>${request.insuranceDetails?.requestedAmount?.toLocaleString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Building className="h-4 w-4 text-blue-600" />
                            <span>{request.category}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span>{formatTimeRemaining(request.biddingDetails?.deadline)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <MapPin className="h-4 w-4 text-red-600" />
                            <span>{request.assetDetails?.location?.city}, {request.assetDetails?.location?.country}</span>
                          </div>
                        </div>

                        {/* Group Insurance Status */}
                        {request.biddingDetails?.groupInsuranceAllowed && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">Group Insurance Enabled</span>
                            </div>
                            
                            {(() => {
                              const groupStatus = getGroupStatus(request);
                              if (!groupStatus) {
                                return (
                                  <div className="text-sm text-blue-700">
                                    <p>No group formed yet. Be the first to join!</p>
                                    <p className="text-xs mt-1">
                                      Min: {request.biddingDetails?.minProviders || 2} providers | 
                                      Max: {request.biddingDetails?.maxProviders || 5} providers
                                    </p>
                                  </div>
                                );
                              }
                              
                              const isCoverageMet = groupStatus.totalCoverage >= groupStatus.requestedAmount;
                              const isOverCoverage = groupStatus.totalCoverage > groupStatus.requestedAmount;
                              const canJoinGroup = !isCoverageMet && groupStatus.status === 'forming';
                              
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-blue-700">
                                      Group Status: <span className="font-medium">{groupStatus.status}</span>
                                    </span>
                                    <span className="text-blue-600">
                                      {groupStatus.currentParticipants}/{groupStatus.minParticipants} providers
                                    </span>
                                  </div>
                                  
                                  <div className="w-full bg-blue-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        isOverCoverage ? 'bg-red-500' : 'bg-blue-600'
                                      }`}
                                      style={{ 
                                        width: `${Math.min(
                                          (groupStatus.totalCoverage / groupStatus.requestedAmount) * 100,
                                          (groupStatus.currentParticipants / groupStatus.minParticipants) * 100
                                        )}%` 
                                      }}
                                    ></div>
                                  </div>
                                  
                                  <div className="text-xs text-blue-600">
                                    Coverage: ${groupStatus.totalCoverage?.toLocaleString()} / ${groupStatus.requestedAmount?.toLocaleString()}
                                    {isOverCoverage && (
                                      <span className="text-red-600 font-medium ml-2">
                                        (Exceeds by ${(groupStatus.totalCoverage - groupStatus.requestedAmount).toLocaleString()})
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Coverage Status Message */}
                                  {isCoverageMet && (
                                    <div className={`text-xs font-medium p-2 rounded ${
                                      isOverCoverage 
                                        ? 'bg-red-100 text-red-700 border border-red-200' 
                                        : 'bg-green-100 text-green-700 border border-green-200'
                                    }`}>
                                      {isOverCoverage 
                                        ? '⚠️ Coverage target exceeded - No more providers needed'
                                        : '✅ Coverage target reached - Group is ready for finalization'
                                      }
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status and Priority */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {request.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(request.insuranceDetails.riskLevel)}`}>
                        {request.insuranceDetails.riskLevel} Risk
                      </span>
                    </div>

                    {/* Key Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">
                          ${request.insuranceDetails.requestedAmount?.toLocaleString()} requested
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">
                          ${request.assetDetails.value?.toLocaleString()} asset value
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{request.timeRemaining}</span>
                      </div>

                      {request.assetDetails.location.city && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {[request.assetDetails.location.city, request.assetDetails.location.state, request.assetDetails.location.country]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bidding Info */}
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-800 font-medium">
                          Min Bid: {request.biddingDetails.minimumBidPercentage}%
                        </span>
                        <span className="text-blue-600">
                          {request.bidCount} bids received
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      {request.biddingDetails?.groupInsuranceAllowed ? (
                        (() => {
                          const groupStatus = getGroupStatus(request);
                          const isCoverageMet = groupStatus && groupStatus.totalCoverage >= groupStatus.requestedAmount;
                          const isOverCoverage = groupStatus && groupStatus.totalCoverage > groupStatus.requestedAmount;
                          
                          return (
                            <>
                      <button
                                onClick={() => openGroupModal(request)}
                                disabled={isCoverageMet}
                                className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                  isCoverageMet
                                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                                title={isCoverageMet ? 'Group coverage already met' : 'Join this group insurance deal'}
                              >
                                <Users className="h-4 w-4" />
                                {isOverCoverage ? 'Coverage Exceeded' : 'Join Group'}
                      </button>
                      
                      <button
                        onClick={() => openBidForm(request)}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <TrendingUp className="h-4 w-4" />
                                Individual Bid
                              </button>
                            </>
                          );
                        })()
                      ) : (
                        <button
                          onClick={() => openBidForm(request)}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <TrendingUp className="h-4 w-4" />
                        Submit Bid
                        </button>
                      )}
                      
                      <button
                        onClick={() => openChat(request)}
                        className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Chat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No insurance requests found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || selectedAssetType !== 'all' || selectedMinAmount || selectedMaxAmount || selectedLocation
                  ? 'Try adjusting your search or filters' 
                  : 'Check back later for new requests'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bid Form Modal */}
      {showBidForm && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Submit Bid</h2>
                <button
                  onClick={() => setShowBidForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                Bidding on: <span className="font-medium">{selectedRequest.title}</span>
              </p>
            </div>

            <form onSubmit={handleSubmitBid} className="p-6 space-y-6">
              {/* Request Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Request Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Asset Value:</span>
                    <span className="ml-2 font-medium">
                      ${selectedRequest.assetDetails.value?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Requested Amount:</span>
                    <span className="ml-2 font-medium">
                      ${selectedRequest.insuranceDetails.requestedAmount?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Min Bid %:</span>
                    <span className="ml-2 font-medium">
                      {selectedRequest.biddingDetails.minimumBidPercentage}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Deadline:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedRequest.biddingDetails.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bid Amount *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedRequest.insuranceDetails.requestedAmount}
                    value={bidFormData.amount}
                    onChange={(e) => setBidFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter bid amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max: ${selectedRequest.insuranceDetails.requestedAmount?.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bid Percentage *</label>
                  <input
                    type="number"
                    required
                    min={selectedRequest.biddingDetails.minimumBidPercentage}
                    max="100"
                    step="0.1"
                    value={bidFormData.percentage}
                    onChange={(e) => setBidFormData(prev => ({ ...prev, percentage: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter percentage"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Min: {selectedRequest.biddingDetails.minimumBidPercentage}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Premium *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={bidFormData.premium}
                    onChange={(e) => setBidFormData(prev => ({ ...prev, premium: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter monthly premium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coverage Type</label>
                  <select
                    value={selectedRequest.insuranceDetails.coverageType}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  >
                    <option>{selectedRequest.insuranceDetails.coverageType}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={bidFormData.terms}
                  onChange={(e) => setBidFormData(prev => ({ ...prev, terms: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your terms and any special conditions..."
                />
              </div>

              {/* Form Actions */}
              <div className="border-t pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBidForm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Bid
                </button>
              </div>
            </form>
          </div>
                 </div>
       )}

       {/* Chat Interface */}
       {showChat && chatRequest && chatClient && (
         <ChatInterface
           isOpen={showChat}
           onClose={closeChat}
           requestId={chatRequest._id}
           otherUserId={chatClient.id}
           otherUserName={chatClient.name}
           otherUserRole={chatClient.role}
         />
       )}

       {/* Group Insurance Modal */}
       {showGroupModal && selectedGroupRequest && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-gray-200">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-100 rounded-lg">
                     <Users className="h-6 w-6 text-blue-600" />
                   </div>
                   <div>
                     <h3 className="text-xl font-semibold text-gray-900">Join Group Insurance</h3>
                     <p className="text-sm text-gray-600">
                       {selectedGroupRequest.title}
                     </p>
                   </div>
                 </div>
                 <button
                   onClick={closeGroupModal}
                   className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                 >
                   <XCircle className="h-6 w-6" />
                 </button>
               </div>
             </div>

             <div className="p-6 space-y-6">
               {/* Group Information */}
               <div className="bg-blue-50 rounded-lg p-4">
                 <h4 className="font-medium text-blue-900 mb-3">Group Insurance Details</h4>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="text-blue-700">Total Coverage Needed:</span>
                     <p className="font-medium text-blue-900">
                       ${selectedGroupRequest.insuranceDetails?.requestedAmount?.toLocaleString()}
                     </p>
                   </div>
                   <div>
                     <span className="text-blue-700">Min Providers:</span>
                     <p className="font-medium text-blue-900">
                       {selectedGroupRequest.biddingDetails?.minProviders || 2}
                     </p>
                   </div>
                   <div>
                     <span className="text-blue-700">Max Providers:</span>
                     <p className="font-medium text-blue-900">
                       {selectedGroupRequest.biddingDetails?.maxProviders || 5}
                     </p>
                   </div>
                   <div>
                     <span className="text-blue-700">Min Bid Percentage:</span>
                     <p className="font-medium text-blue-900">
                       {selectedGroupRequest.biddingDetails?.minimumBidPercentage || 10}%
                     </p>
                   </div>
                 </div>
               </div>

               {/* Group Status */}
               {(() => {
                 const groupStatus = getGroupStatus(selectedGroupRequest);
                 if (groupStatus) {
                   return (
                     <div className="bg-green-50 rounded-lg p-4">
                       <h4 className="font-medium text-green-900 mb-3">Current Group Status</h4>
                       <div className="space-y-2">
                         <div className="flex items-center justify-between text-sm">
                           <span className="text-green-700">Status:</span>
                           <span className="font-medium text-green-900 capitalize">{groupStatus.status}</span>
                         </div>
                         <div className="flex items-center justify-between text-sm">
                           <span className="text-green-700">Providers:</span>
                           <span className="font-medium text-green-900">
                             {groupStatus.currentParticipants}/{groupStatus.minParticipants}
                           </span>
                         </div>
                         <div className="flex items-center justify-between text-sm">
                           <span className="text-green-700">Coverage:</span>
                           <span className="font-medium text-green-900">
                             ${groupStatus.totalCoverage?.toLocaleString()} / ${groupStatus.requestedAmount?.toLocaleString()}
                           </span>
                         </div>
                       </div>
                     </div>
                   );
                 }
                 return null;
               })()}

               {/* Bid Form */}
               <div className="space-y-4">
                 <h4 className="font-medium text-gray-900">Your Group Participation</h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Coverage Amount *
                     </label>
                     <div className="relative">
                       <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                       <input
                         type="number"
                         value={groupBidData.coverageAmount}
                         onChange={(e) => setGroupBidData(prev => ({ ...prev, coverageAmount: e.target.value }))}
                         className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Enter coverage amount"
                         min={selectedGroupRequest.insuranceDetails?.requestedAmount * 0.1}
                         max={selectedGroupRequest.insuranceDetails?.requestedAmount}
                       />
                     </div>
                     <p className="text-xs text-gray-500 mt-1">
                       {(() => {
                         const minBidPercentage = selectedGroupRequest.biddingDetails?.minimumBidPercentage || 10;
                         const minAmount = (selectedGroupRequest.insuranceDetails?.requestedAmount * minBidPercentage) / 100;
                         
                         // Check if group exists and has current coverage
                         const groupDeal = apiService.getGroupDealsByRequest(selectedGroupRequest._id);
                         if (groupDeal && groupDeal.length > 0 && groupDeal[0].totalCoverage > 0) {
                           const remainingCoverage = selectedGroupRequest.insuranceDetails?.requestedAmount - groupDeal[0].totalCoverage;
                           return `Min: $${minAmount.toLocaleString()} OR fill gap: $${remainingCoverage.toLocaleString()} | Max: $${selectedGroupRequest.insuranceDetails?.requestedAmount?.toLocaleString()}`;
                         }
                         
                         return `Min: $${minAmount.toLocaleString()} | Max: $${selectedGroupRequest.insuranceDetails?.requestedAmount?.toLocaleString()}`;
                       })()}
                     </p>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Monthly Premium *
                     </label>
                     <div className="relative">
                       <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                       <input
                         type="number"
                         value={groupBidData.premium}
                         onChange={(e) => setGroupBidData(prev => ({ ...prev, premium: e.target.value }))}
                         className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Enter monthly premium"
                         min="0"
                         step="0.01"
                       />
                     </div>
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Terms & Conditions
                   </label>
                   <textarea
                     value={groupBidData.terms}
                     onChange={(e) => setGroupBidData(prev => ({ ...prev, terms: e.target.value }))}
                     rows="3"
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="Describe your terms, coverage details, and any special conditions..."
                   />
                 </div>
               </div>
             </div>

             <div className="p-6 border-t border-gray-200 bg-gray-50">
               <div className="flex items-center justify-between">
                 {(() => {
                   const groupStatus = getGroupStatus(selectedGroupRequest);
                   const isCoverageMet = groupStatus && groupStatus.totalCoverage >= selectedGroupRequest.insuranceDetails?.requestedAmount;
                   const isOverCoverage = groupStatus && groupStatus.totalCoverage > selectedGroupRequest.insuranceDetails?.requestedAmount;
                   
                   if (isCoverageMet) {
                     return (
                       <div className="flex-1">
                         <p className="text-sm text-gray-600 mb-2">
                           {isOverCoverage 
                             ? '⚠️ Group coverage has exceeded the required amount. No more providers can join.'
                             : '✅ Group coverage target has been reached. No more providers can join.'
                           }
                         </p>
                         <p className="text-xs text-gray-500">
                           Current coverage: ${groupStatus?.totalCoverage?.toLocaleString()} / ${selectedGroupRequest.insuranceDetails?.requestedAmount?.toLocaleString()}
                         </p>
                       </div>
                     );
                   }
                   
                   return (
                     <p className="text-sm text-gray-600">
                       By joining this group, you agree to collaborate with other providers
                     </p>
                   );
                 })()}
                 
                 <div className="flex gap-3">
                   <button
                     onClick={closeGroupModal}
                     className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                   >
                     Cancel
                   </button>
                   {(() => {
                     const groupStatus = getGroupStatus(selectedGroupRequest);
                     const isCoverageMet = groupStatus && groupStatus.totalCoverage >= selectedGroupRequest.insuranceDetails?.requestedAmount;
                     
                     if (isCoverageMet) {
                       return (
                         <button
                           disabled
                           className="px-6 py-2 bg-gray-400 text-gray-600 rounded-lg cursor-not-allowed flex items-center gap-2"
                         >
                           <Users className="h-4 w-4" />
                           Coverage Met
                         </button>
                       );
                     }
                     
                     return (
                       <button
                         onClick={handleGroupBidSubmit}
                         disabled={!groupBidData.coverageAmount || !groupBidData.premium}
                         className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                       >
                         <Users className="h-4 w-4" />
                         Join Group
                       </button>
                     );
                   })()}
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseRequests;
