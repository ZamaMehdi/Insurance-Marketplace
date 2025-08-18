import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { 
  Users, 
  DollarSign, 
  Clock, 
  Building,
  Shield,
  Eye,
  TrendingUp,
  CheckCircle,
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const GroupInsuranceDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groupRequests, setGroupRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadGroupRequests();
    }
  }, [user]);

  const loadGroupRequests = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Debug: Starting to fetch group insurance requests...');
      console.log('🔍 Debug: API call parameters:', { status: ['open', 'bidding'], groupInsurance: 'true' });
      
      // Fetch group insurance requests directly from the backend
      const response = await apiService.getRequests({
        status: ['open', 'bidding'],
        groupInsurance: 'true'
      });
      
      console.log('🔍 Debug: Full API response:', response);
      console.log('🔍 Debug: Response type:', typeof response);
      console.log('🔍 Debug: Response keys:', Object.keys(response || {}));
      
      if (response && response.requests && Array.isArray(response.requests)) {
        // Check if current user has already bid on each request
        const requestsWithBidStatus = response.requests.map(request => {
          const hasUserBid = request.bids && request.bids.some(bid => 
            bid.providerId === user?._id || bid.providerId === user?.user?._id
          );
          return {
            ...request,
            hasUserBid
          };
        });
        
        setGroupRequests(requestsWithBidStatus);
        console.log('✅ Group insurance requests loaded:', requestsWithBidStatus.length);
        console.log('✅ Requests data:', requestsWithBidStatus);
      } else {
        console.log('❌ No group insurance requests found in response');
        console.log('❌ Response structure:', {
          hasResponse: !!response,
          hasRequests: !!(response && response.requests),
          isArray: !!(response && response.requests && Array.isArray(response.requests)),
          requestsLength: response?.requests?.length || 'undefined'
        });
        setGroupRequests([]);
      }
    } catch (error) {
      console.error('❌ Error loading group requests:', error);
      toast.error('Failed to load group insurance requests');
      setGroupRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (deadline) => {
    if (!deadline) return 'No deadline set';
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

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
            Group Insurance Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            Monitor insurance requests that allow multiple provider participation and group insurance
          </p>
          <button
            onClick={loadGroupRequests}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
          >
            <div className={`w-4 h-4 ${loading ? 'animate-spin rounded-full border-b-2 border-white' : ''}`}></div>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {groupRequests.filter(r => r.status === 'open' || r.status === 'bidding').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bids</p>
                <p className="text-2xl font-bold text-gray-900">
                  {groupRequests.reduce((sum, request) => sum + (request.bids?.length || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Coverage</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${groupRequests.reduce((sum, request) => sum + (request.insuranceDetails?.requestedAmount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Bids/Request</p>
                <p className="text-2xl font-bold text-gray-900">
                  {groupRequests.length > 0 
                    ? Math.round(groupRequests.reduce((sum, request) => sum + (request.bids?.length || 0), 0) / groupRequests.length)
                    : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Group Deals List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Group Insurance Requests</h2>
            <p className="text-gray-600 mt-2">
              Monitor insurance requests that allow multiple providers to participate
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading group insurance requests...</p>
            </div>
          ) : groupRequests.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {groupRequests.map((request) => {
                const timeRemaining = formatTimeRemaining(request.biddingDetails?.deadline);
                const bidCount = request.bids?.length || 0;
                
                return (
                  <div key={request._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600 uppercase">
                            Group Insurance Request
                          </span>
                          {request.biddingDetails?.groupInsuranceAllowed && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                              Group Insurance Enabled
                            </span>
                          )}
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === 'open' ? 'bg-green-100 text-green-800' :
                            request.status === 'bidding' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{request.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">
                              ${request.insuranceDetails?.requestedAmount?.toLocaleString()} requested
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">
                              {bidCount} bids received
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{timeRemaining}</span>
                          </div>
                        </div>

                        {/* Asset Details */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                            <Building className="h-4 w-4" />
                            <span className="font-medium">Asset: {request.assetDetails?.type} - {request.assetDetails?.name}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Location: {request.assetDetails?.location?.city || 'N/A'}, {request.assetDetails?.location?.state || 'N/A'}
                          </div>
                        </div>

                        {/* Bidding Progress */}
                        {request.biddingDetails && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-blue-800 font-medium">
                                Bidding Deadline: {new Date(request.biddingDetails.deadline).toLocaleDateString()}
                              </span>
                              <span className="text-blue-600">
                                {bidCount} providers participating
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => navigate(`/request-detail/${request._id}`)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </button>
                        
                        {user.role === 'provider' && (
                          request.hasUserBid ? (
                            <button
                              disabled
                              className="px-4 py-2 bg-gray-400 text-white text-sm rounded cursor-not-allowed flex items-center gap-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Bid Submitted
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/bid-submission/${request._id}`)}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                              <TrendingUp className="h-4 w-4" />
                              Submit Bid
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No group insurance requests found</p>
              <p className="text-gray-400 text-sm mt-2 mb-4">
                {user.role === 'client' 
                  ? 'Create insurance requests with group insurance enabled to see them here'
                  : 'No insurance requests with multiple provider participation found'
                }
              </p>
              {user.role === 'client' && (
                <button
                  onClick={() => navigate('/insurance-request/new')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Insurance Request
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupInsuranceDashboard;
