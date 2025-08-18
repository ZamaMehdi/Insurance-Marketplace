import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import apiService from '../services/api';
import { 
  Shield, 
  DollarSign, 
  Users, 
  Clock, 
  MapPin, 
  Building,
  CheckCircle,
  XCircle,
  MessageSquare,
  Eye,
  ArrowLeft,
  TrendingUp,
  Calendar,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBidResponseModal, setShowBidResponseModal] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [responseAction, setResponseAction] = useState('');
  const [responseNote, setResponseNote] = useState('');

  useEffect(() => {
    fetchRequestDetail();
  }, [id]);

  useEffect(() => {
    if (socket) {
      socket.on('bid_notification', (data) => {
        if (data.requestId === id) {
          toast.success('New bid received on this request!');
          fetchRequestDetail(); // Refresh to show new bid
        }
      });

      return () => {
        socket.off('bid_notification');
      };
    }
  }, [socket, id]);

  const fetchRequestDetail = async () => {
    try {
      setLoading(true);
      const response = await apiService.request(`/requests/${id}`);
      setRequest(response);
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const handleBidResponse = async (e) => {
    e.preventDefault();
    
    if (!selectedBid || !responseAction) return;

    try {
      const response = await apiService.request(`/requests/${id}/bids/${selectedBid._id}/respond`, {
        method: 'PUT',
        body: JSON.stringify({ action: responseAction, note: responseNote })
      });

      toast.success(`Bid ${responseAction}ed successfully`);
      setShowBidResponseModal(false);
      setSelectedBid(null);
      setResponseAction('');
      setResponseNote('');
      fetchRequestDetail(); // Refresh to show updated status
    } catch (error) {
      console.error('Error responding to bid:', error);
      toast.error(error.message || `Failed to ${responseAction} bid`);
    }
  };

  const openBidResponseModal = (bid, action) => {
    setSelectedBid(bid);
    setResponseAction(action);
    setResponseNote('');
    setShowBidResponseModal(true);
  };

  const handleFinalizeDeal = async () => {
    if (!window.confirm('Are you sure you want to finalize this insurance deal? This action cannot be undone.')) return;

    try {
      const response = await apiService.request(`/requests/${id}/finalize`, {
        method: 'PUT'
      });

      toast.success('Insurance deal finalized successfully!');
      fetchRequestDetail(); // Refresh to show updated status
    } catch (error) {
      console.error('Error finalizing deal:', error);
      toast.error(error.message || 'Failed to finalize deal');
    }
  };

  const getStatusColor = (status) => {
    const statusConfig = {
      open: 'bg-green-100 text-green-800',
      bidding: 'bg-blue-100 text-blue-800',
      reviewing: 'bg-yellow-100 text-yellow-800',
      awarded: 'bg-purple-100 text-purple-800',
      closed: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800'
    };
    return statusConfig[status] || 'bg-gray-100 text-gray-800';
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

  const getRiskLevelColor = (riskLevel) => {
    const riskConfig = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      'very-high': 'bg-red-100 text-red-800'
    };
    return riskConfig[riskLevel] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Request not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/insurance-requests')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Requests
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{request.title}</h1>
              <p className="text-gray-600 mt-2">{request.description}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                {request.status}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(request.priority)}`}>
                {request.priority}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Asset Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="h-6 w-6 text-blue-600" />
                Asset Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="font-medium capitalize">{request.assetDetails.type}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asset Name</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{request.assetDetails.name}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asset Value</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-lg">
                      {request.assetDetails.value?.toLocaleString()} {request.assetDetails.currency}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(request.insuranceDetails.riskLevel)}`}>
                    {request.insuranceDetails.riskLevel} Risk
                  </div>
                </div>
              </div>

              {/* Location */}
              {request.assetDetails.location.city && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-red-600" />
                    <span>
                      {[request.assetDetails.location.address, request.assetDetails.location.city, request.assetDetails.location.state, request.assetDetails.location.country]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                </div>
              )}

              {/* Asset Specifications */}
              {request.assetDetails.specifications && Object.keys(request.assetDetails.specifications).length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(request.assetDetails.specifications, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Insurance Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                Insurance Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Requested Amount</label>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-lg text-blue-900">
                      {request.insuranceDetails.requestedAmount?.toLocaleString()} {request.insuranceDetails.currency}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coverage Type</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium capitalize">{request.insuranceDetails.coverageType}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Frequency</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium capitalize">Monthly</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Coverage</label>
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-lg text-green-900">
                      {request.coveragePercentage || 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Exclusions & Requirements */}
              {(request.insuranceDetails.exclusions?.length > 0 || request.insuranceDetails.specialRequirements?.length > 0) && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {request.insuranceDetails.exclusions?.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exclusions</label>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <ul className="text-sm text-red-800 space-y-1">
                          {request.insuranceDetails.exclusions.map((exclusion, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                              {exclusion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {request.insuranceDetails.specialRequirements?.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Special Requirements</label>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <ul className="text-sm text-yellow-800 space-y-1">
                          {request.insuranceDetails.specialRequirements.map((req, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bidding Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-6 w-6 text-blue-600" />
                Bidding Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-900">
                      {new Date(request.biddingDetails.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Remaining</label>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-blue-900">{request.timeRemaining}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Bid %</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{request.biddingDetails.minimumBidPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Bids Received */}
              {request.bids.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Bids Received ({request.bidCount})</h3>
                  <div className="space-y-3">
                    {request.bids.map((bid, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <span className="text-lg font-semibold text-blue-900">
                                ${bid.amount?.toLocaleString()} ({bid.percentage}%)
                              </span>
                              <span className="text-sm text-gray-600">
                                ${bid.premium?.toLocaleString()}/month
                              </span>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bid.status)}`}>
                                {bid.status}
                              </div>
                            </div>
                            
                            {bid.terms && (
                              <p className="text-gray-700 mb-2">{bid.terms}</p>
                            )}
                            
                            {bid.conditions?.length > 0 && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Conditions:</span>
                                <ul className="mt-1 space-y-1">
                                  {bid.conditions.map((condition, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                      {condition}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500 mt-2">
                              Submitted: {new Date(bid.submittedAt).toLocaleString()}
                            </div>
                          </div>
                          
                          {/* Action buttons for pending bids */}
                          {bid.status === 'pending' && request.status !== 'awarded' && user._id === request.clientId && (
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => openBidResponseModal(bid, 'accept')}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => openBidResponseModal(bid, 'reject')}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coverage Summary */}
              {request.totalAwardedPercentage > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="text-lg font-medium text-green-900 mb-3">Coverage Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-green-700">Total Coverage:</span>
                      <div className="text-2xl font-bold text-green-900">{request.coveragePercentage}%</div>
                    </div>
                    <div>
                      <span className="text-sm text-green-700">Awarded Amount:</span>
                      <div className="text-xl font-semibold text-green-900">
                        ${request.totalAwardedAmount?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-green-700">Awarded Percentage:</span>
                      <div className="text-xl font-semibold text-green-900">
                        {request.totalAwardedPercentage}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Finalize Deal Button */}
                  {request.totalAwardedPercentage >= 100 && request.status !== 'awarded' && user._id === request.clientId && (
                    <button
                      onClick={handleFinalizeDeal}
                      className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Finalize Insurance Deal
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">
                    {request.clientId.profile?.companyName || 
                     `${request.clientId.profile?.firstName} ${request.clientId.profile?.lastName}`}
                  </span>
                </div>
                
                {request.clientId.profile?.bio && (
                  <p className="text-sm text-gray-600">{request.clientId.profile.bio}</p>
                )}
                
                {request.assetDetails.location.city && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {request.assetDetails.location.city}, {request.assetDetails.location.state}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Request Statistics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Views:</span>
                  <span className="font-medium">{request.viewCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bids:</span>
                  <span className="font-medium">{request.bidCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="font-medium">{new Date(request.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {request.tags?.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {request.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bid Response Modal */}
      {showBidResponseModal && selectedBid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {responseAction === 'accept' ? 'Accept' : 'Reject'} Bid
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Bid Details:</p>
                <p className="font-medium">
                  ${selectedBid.amount?.toLocaleString()} ({selectedBid.percentage}%) - ${selectedBid.premium?.toLocaleString()}/month
                </p>
              </div>
              
              <form onSubmit={handleBidResponse}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (Optional)
                  </label>
                  <textarea
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter a note for ${responseAction}ing this bid...`}
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBidResponseModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-white rounded-lg transition-colors ${
                      responseAction === 'accept' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {responseAction === 'accept' ? 'Accept' : 'Reject'} Bid
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetail;
