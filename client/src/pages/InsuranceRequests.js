import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import apiService from '../services/api';
import { 
  Shield, 
  Building, 
  MapPin, 
  DollarSign, 
  Calendar, 
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  Plus, 
  Search, 
  Filter, 
  Clock, 
  Users, 
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import ChatInterface from '../components/ChatInterface';
import { Link, useNavigate } from 'react-router-dom';

const InsuranceRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestBids, setRequestBids] = useState([]);
  const [bidCounts, setBidCounts] = useState({}); // Store bid counts for each request
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatRequest, setChatRequest] = useState(null);
  const [chatProvider, setChatProvider] = useState(null);

  const statuses = [
    { id: 'all', name: 'All Statuses' },
    { id: 'open', name: 'Open', color: 'text-green-600' },
    { id: 'bidding', name: 'Bidding', color: 'text-blue-600' },
    { id: 'completed', name: 'Completed', color: 'text-purple-600' },
    { id: 'cancelled', name: 'Cancelled', color: 'text-red-600' }
  ];

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'property', name: 'Property' },
    { id: 'vehicle', name: 'Auto' },
    { id: 'health', name: 'Health' },
    { id: 'life', name: 'Life' },
    { id: 'business', name: 'Business' },
    { id: 'other', name: 'Other' }
  ];

  useEffect(() => {
    if (user) {
    fetchRequests();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      // Listen for new bid notifications
      socket.on('new_bid', (data) => {
        console.log('InsuranceRequests: New bid notification:', data);
        toast.success(`New bid received: $${data.amount?.toLocaleString()} from ${data.providerName}`);
        fetchRequests(); // Refresh to show new bid
      });

      return () => {
        socket.off('new_bid');
      };
    }
  }, [socket, user]);

  const fetchRequests = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('InsuranceRequests: Loading client requests from MongoDB API');
      
      // Get requests for the current client from MongoDB API
      const clientId = user?.user?._id || user?._id;
      const response = await apiService.getRequestsByClient(clientId);
      
      if (response && response.success && Array.isArray(response.data)) {
        setRequests(response.data);
        console.log('Client requests loaded from MongoDB API:', response.data.length);
        
        // Fetch bid counts for each request
        const bidCountsData = {};
        for (const request of response.data) {
          try {
            const bidsResponse = await apiService.getBidsForRequest(request._id);
            if (bidsResponse && bidsResponse.success && Array.isArray(bidsResponse.data)) {
              // Only count non-rejected bids
              bidCountsData[request._id] = bidsResponse.data.filter(bid => bid.status !== 'rejected').length;
            } else if (bidsResponse && Array.isArray(bidsResponse)) {
              // Only count non-rejected bids
              bidCountsData[request._id] = bidsResponse.filter(bid => bid.status !== 'rejected').length;
            } else {
              bidCountsData[request._id] = 0;
            }
          } catch (error) {
            console.error(`Error fetching bids for request ${request._id}:`, error);
            bidCountsData[request._id] = 0;
          }
        }
        setBidCounts(bidCountsData);
      } else if (response && Array.isArray(response)) {
        // Fallback for old format
        setRequests(response);
        // console.log('Client requests loaded from MongoDB API (old format):', response.length);
        
        // Fetch bid counts for each request
        const bidCountsData = {};
        for (const request of response) {
          try {
            const bidsResponse = await apiService.getBidsForRequest(request._id);
            if (bidsResponse && bidsResponse.success && Array.isArray(bidsResponse.data)) {
              // Only count non-rejected bids
              bidCountsData[request._id] = bidsResponse.data.filter(bid => bid.status !== 'rejected').length;
            } else if (bidsResponse && Array.isArray(bidsResponse)) {
              // Only count non-rejected bids
              bidCountsData[request._id] = bidsResponse.filter(bid => bid.status !== 'rejected').length;
      } else {
              bidCountsData[request._id] = 0;
      }
    } catch (error) {
            console.error(`Error fetching bids for request ${request._id}:`, error);
            bidCountsData[request._id] = 0;
          }
        }
        setBidCounts(bidCountsData);
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

  const handleCreateRequest = async () => {
    navigate('/insurance-request/new');
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this insurance request? This action cannot be undone.')) return;

    try {
      // console.log('InsuranceRequests: Deleting request via API');
      
      // Call the API to delete the request from the database
      const response = await apiService.deleteRequest(requestId);
      
      // console.log('Delete response:', response);
      
      if (response && (response.success || response.message)) {
        // Remove from local state
        setRequests(prev => prev.filter(req => req._id !== requestId));
        toast.success('Insurance request deleted successfully');
      } else {
        console.error('Delete failed:', response);
        toast.error('Failed to delete request');
      }
      
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request. Please try again.');
    }
  };

  const handleBidResponse = async (requestId, bidId, action) => {
    try {
      // console.log('InsuranceRequests: Processing bid response:', action);
      
      if (action === 'accept') {
        try {
          // Accept the bid via API
          const bidResponse = await apiService.acceptBid(bidId);
          if (bidResponse && bidResponse.success) {
            // Get the request details to create accepted offer
            const request = requests.find(r => r._id === requestId);
            const bid = request.bids.find(b => b._id === bidId);
            
            if (request && bid) {
              // Create accepted offer
              const acceptedOfferData = {
                offerId: requestId, // Using requestId as offerId for now
                clientId: user?.user?._id || user?._id,
                providerId: bid.providerId,
                coverageAmount: request.insuranceDetails.requestedAmount,
                startDate: new Date(),
                monthlyPremium: bid.premium,
                additionalNotes: `Accepted bid from ${bid.terms}`
              };
              
              const acceptedOfferResponse = await apiService.createAcceptedOffer(acceptedOfferData);
              if (acceptedOfferResponse && acceptedOfferResponse.success) {
                console.log('✅ Accepted offer created:', acceptedOfferResponse.data);
              }
            }
            
            // Update request status to awarded (valid status from model)
            await apiService.updateRequestStatus(requestId, 'awarded');
            
            // Refresh requests to show updated status
            fetchRequests();
            
            toast.success('Bid accepted successfully! Insurance offer created.');
          }
        } catch (error) {
          console.error('Error accepting bid:', error);
          toast.error('Failed to accept bid');
        }
      } else if (action === 'reject') {
        // Reject the bid via API
        const response = await apiService.rejectBid(bidId);
        if (response && response.success) {
          // Refresh requests to show updated bid status
          fetchRequests();
          
          // Close the bids modal
          setShowBidsModal(false);
          setSelectedRequest(null);
          setRequestBids([]);
          
          toast.success('Bid rejected successfully');
        }
      }
      
    } catch (error) {
      console.error('Error processing bid response:', error);
      toast.error('Failed to process bid response');
    }
  };

  const viewBids = async (request) => {
    try {
      setSelectedRequest(request);
      const response = await apiService.getBidsForRequest(request._id);
      
      if (response && response.success && Array.isArray(response.data)) {
        setRequestBids(response.data);
      } else if (response && Array.isArray(response)) {
        // Fallback for old format
        setRequestBids(response);
      } else {
        setRequestBids([]);
      }
      
      setShowBidsModal(true);
    } catch (error) {
      console.error('Error loading bids:', error);
      setRequestBids([]);
      setShowBidsModal(true);
    }
  };

  const openChat = (request, providerId, providerName) => {
    setChatRequest(request);
    setChatProvider({ id: providerId, name: providerName, role: 'provider' });
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
    setChatRequest(null);
    setChatProvider(null);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || request.assetDetails?.type === selectedCategory;
    
    // console.log('🔍 Filtering request:', request.title);
    // console.log('🔍 Request category:', request.assetDetails?.type);
    // console.log('🔍 Selected category:', selectedCategory);
    // console.log('🔍 Category match:', matchesCategory);
    // console.log('🔍 Final result:', matchesSearch && matchesStatus && matchesCategory);
    
    return matchesSearch && matchesStatus && matchesCategory;
  });
  
  // console.log('🔍 Total requests:', requests.length);
  // console.log('🔍 Filtered requests:', filteredRequests.length);
  // console.log('🔍 Selected category:', selectedCategory);

  const getStatusColor = (status) => {
    const statusConfig = {
      open: 'bg-green-100 text-green-800',
      bidding: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return statusConfig[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const iconConfig = {
      open: AlertTriangle,
      bidding: TrendingUp,
      completed: CheckCircle,
      cancelled: XCircle
    };
    return iconConfig[status] || AlertTriangle;
  };

  const getCategoryIcon = (category) => {
    const iconConfig = {
      property: Building,
      vehicle: Shield,
      health: Shield,
      life: Shield,
      business: Building,
      other: Shield
    };
    return iconConfig[category] || Shield;
  };

  const calculateTimeRemaining = (deadline) => {
    if (!deadline) return 'No deadline';
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Less than 1h remaining';
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Insurance Requests</h1>
            <p className="text-gray-600 mt-2">Manage your insurance requests and review provider bids</p>
          </div>
          <div className="mt-4 sm:mt-0">
              <button
                onClick={handleCreateRequest}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors mr-2"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Request
              </button>
              

            </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search requests..."
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

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow-md">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading requests...</p>
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredRequests.map((request) => {
                const StatusIcon = getStatusIcon(request.status);
                const CategoryIcon = getCategoryIcon(request.assetDetails?.type);
                const bidCount = bidCounts[request._id] || 0;
                
                return (
                <div key={request._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                          <CategoryIcon className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600 uppercase">
                            {request.assetDetails?.type}
                          </span>
                        <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                          <StatusIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      
                        <p className="text-gray-600 text-sm mb-4">{request.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                          <span className="font-medium">{calculateTimeRemaining(request.biddingDetails?.deadline)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-medium">
                              {bidCount} bids received
                            </span>
                        </div>
                      </div>

                      {request.assetDetails.location.city && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {[request.assetDetails.location.city, request.assetDetails.location.state, request.assetDetails.location.country]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      )}

                        {/* Bidding Info */}
                        <div className="bg-blue-50 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between text-sm">
                                     <span className="text-blue-800 font-medium">
                              Min Bid: {request.biddingDetails.minimumBidPercentage}%
                                     </span>
                            <span className="text-blue-600">
                              {bidCount} bids received
                                   </span>
                                 </div>
                               </div>
                           </div>
                           
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        {bidCount > 0 && (
                                 <button
                            onClick={() => viewBids(request)}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                                 >
                            <Eye className="h-4 w-4" />
                            View Bids ({bidCount})
                                 </button>
                               )}
                        
                        <Link
                          to={`/insurance-request/${request._id}`}
                          className="px-4 py-2 text-blue-600 border border-blue-600 text-sm rounded hover:bg-blue-50 transition-colors flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Edit
                        </Link>
                        
                        {request.status === 'open' && (
                          <button
                            onClick={() => handleDeleteRequest(request._id)}
                            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            Delete
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
              <p className="text-gray-500 text-lg">No insurance requests found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first insurance request to get started'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bids Modal */}
      {showBidsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Bids for: {selectedRequest.title}</h2>
                <button
                  onClick={() => setShowBidsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                Review and respond to provider bids for this insurance request
              </p>
            </div>

            <div className="p-6">
              {requestBids.filter(bid => bid.status !== 'rejected').length > 0 ? (
                <div className="space-y-4">
                  {requestBids.filter(bid => bid.status !== 'rejected').map((bid) => (
                    <div key={bid._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                <div>
                          <h3 className="font-medium text-gray-900">{bid.providerName}</h3>
                          <p className="text-sm text-gray-600">Submitted {new Date(bid.submittedAt).toLocaleDateString()}</p>
                </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bid.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {bid.status}
                        </span>
              </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div>
                          <span className="text-sm text-gray-600">Coverage Amount:</span>
                          <span className="ml-2 font-medium">${bid.amount?.toLocaleString()}</span>
                  </div>
                  <div>
                          <span className="text-sm text-gray-600">Coverage %:</span>
                          <span className="ml-2 font-medium">{bid.percentage}%</span>
                  </div>
                  <div>
                          <span className="text-sm text-gray-600">Monthly Premium:</span>
                          <span className="ml-2 font-medium">${bid.premium}</span>
                  </div>
                </div>

                      <div className="mb-3">
                        <span className="text-sm text-gray-600">Terms:</span>
                        <p className="text-sm text-gray-800 mt-1">{bid.terms}</p>
              </div>

                                             {bid.status === 'pending' && (
                         <div className="flex gap-2">
                           <button
                             onClick={() => handleBidResponse(selectedRequest._id, bid._id, 'accept')}
                             className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                           >
                             Accept Bid
                           </button>
                           <button
                             onClick={() => handleBidResponse(selectedRequest._id, bid._id, 'reject')}
                             className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                           >
                             Reject Bid
                           </button>
                  </div>
                       )}
                       
                       {/* Chat Button */}
                       <div className="mt-3">
                         <button
                           onClick={() => openChat(selectedRequest, bid.providerId, bid.providerName)}
                           className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                         >
                           <MessageSquare className="h-3 w-3" />
                           Chat
                         </button>
                  </div>
                </div>
                  ))}
              </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No bids received yet for this request</p>
                  </div>
              )}
                  </div>
                </div>
              </div>
      )}

      {/* Chat Interface */}
      {showChat && chatRequest && chatProvider && (
        <ChatInterface
          isOpen={showChat}
          onClose={closeChat}
          requestId={chatRequest._id}
          otherUserId={chatProvider.id}
          otherUserName={chatProvider.name}
          otherUserRole={chatProvider.role}
        />
      )}
    </div>
  );
};

export default InsuranceRequests;
