import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { 
  Shield, 
  DollarSign, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Building,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const BidManagement = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [insuranceRequest, setInsuranceRequest] = useState(null);
  const [bids, setBids] = useState([]);
  const [selectedBids, setSelectedBids] = useState([]);
  const [showBidDetails, setShowBidDetails] = useState(null);
  const [totalCoverage, setTotalCoverage] = useState(0);
  const [totalPremium, setTotalPremium] = useState(0);

  useEffect(() => {
    if (requestId) {
      fetchInsuranceRequest();
      fetchBids();
    }
  }, [requestId]);

  useEffect(() => {
    // Calculate total coverage and premium from selected bids
    const coverage = selectedBids.reduce((sum, bid) => sum + bid.amount, 0);
    const premium = selectedBids.reduce((sum, bid) => sum + bid.premium, 0);
    setTotalCoverage(coverage);
    setTotalPremium(premium);
  }, [selectedBids]);

  const fetchInsuranceRequest = async () => {
    try {
      const response = await apiService.request(`/requests/${requestId}`);
      setInsuranceRequest(response);
    } catch (error) {
      console.error('Error fetching insurance request:', error);
      toast.error('Failed to load insurance request details');
    }
  };

  const fetchBids = async () => {
    try {
      const response = await apiService.request(`/bids/request/${requestId}`);
      setBids(response.bids || []);
    } catch (error) {
      console.error('Error fetching bids:', error);
      toast.error('Failed to load bids');
    }
  };

  const handleBidSelection = (bidId, checked) => {
    if (checked) {
      const bid = bids.find(b => b._id === bidId);
      if (bid) {
        setSelectedBids(prev => [...prev, bid]);
      }
    } else {
      setSelectedBids(prev => prev.filter(b => b._id !== bidId));
    }
  };

  const handleAcceptBid = async (bidId) => {
    try {
      setIsLoading(true);
      const response = await apiService.request(`/bids/${bidId}/accept`, {
        method: 'PUT'
      });

      toast.success('Bid accepted successfully!');
      fetchBids(); // Refresh bids
    } catch (error) {
      console.error('Error accepting bid:', error);
      toast.error(error.message || 'Failed to accept bid');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectBid = async (bidId) => {
    try {
      setIsLoading(true);
      const response = await apiService.request(`/bids/${bidId}/reject`, {
        method: 'PUT'
      });

      toast.success('Bid rejected successfully!');
      fetchBids(); // Refresh bids
    } catch (error) {
      console.error('Error rejecting bid:', error);
      toast.error(error.message || 'Failed to reject bid');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeDeal = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.request(`/requests/${requestId}/finalize`, {
        method: 'PUT',
        body: JSON.stringify({
          selectedBids: selectedBids.map(bid => bid._id),
          totalCoverage,
          totalPremium
        })
      });

      toast.success('Deal finalized successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error finalizing deal:', error);
      toast.error(error.message || 'Failed to finalize deal');
    } finally {
      setIsLoading(false);
    }
  };

  const getBidStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'withdrawn': return 'text-gray-600 bg-gray-100';
      case 'expired': return 'text-orange-600 bg-orange-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getBidStatusText = (status) => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'withdrawn': return 'Withdrawn';
      case 'expired': return 'Expired';
      default: return 'Active';
    }
  };

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to manage bids.</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!insuranceRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading insurance request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bid Management</h1>
          <p className="text-gray-600 mt-2">Review and manage bids for your insurance request</p>
        </div>

        {/* Insurance Request Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            Insurance Request Summary
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{insuranceRequest.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{insuranceRequest.description}</p>
              
              <div className="flex items-center mb-2">
                <Building className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600 capitalize">{insuranceRequest.category}</span>
              </div>
              
              <div className="flex items-center mb-2">
                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  {insuranceRequest.location.city}, {insuranceRequest.location.country}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Coverage:</span>
                <span className="text-sm font-medium text-gray-900">
                  {insuranceRequest.currency} {insuranceRequest.coverageAmount?.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="text-sm font-medium text-gray-900">{insuranceRequest.duration} months</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Priority:</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{insuranceRequest.priority}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Bidding Deadline:</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(insuranceRequest.biddingDeadline).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bid Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-green-600" />
            Bid Summary
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{bids.length}</div>
              <div className="text-sm text-gray-600">Total Bids</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {bids.filter(bid => bid.status === 'accepted').length}
              </div>
              <div className="text-sm text-gray-600">Accepted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {bids.filter(bid => bid.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {bids.filter(bid => bid.status === 'rejected').length}
              </div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>
        </div>

        {/* Selected Bids Summary */}
        {selectedBids.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Selected Bids for Group Deal
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <div className="text-sm text-blue-600">Total Coverage</div>
                <div className="text-2xl font-bold text-blue-900">
                  {insuranceRequest.currency} {totalCoverage.toLocaleString()}
                </div>
                <div className="text-sm text-blue-600">
                  ({((totalCoverage / insuranceRequest.coverageAmount) * 100).toFixed(1)}% of requested)
                </div>
              </div>
              <div>
                <div className="text-sm text-blue-600">Total Premium</div>
                <div className="text-2xl font-bold text-blue-900">
                  {insuranceRequest.currency} {totalPremium.toLocaleString()}
                </div>
                <div className="text-sm text-blue-600">Combined cost</div>
              </div>
              <div>
                <div className="text-sm text-blue-600">Providers</div>
                <div className="text-2xl font-bold text-blue-900">{selectedBids.length}</div>
                <div className="text-sm text-blue-600">Selected</div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleFinalizeDeal}
                disabled={isLoading || totalCoverage < insuranceRequest.coverageAmount * 0.8}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Finalizing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalize Group Deal
                  </>
                )}
              </button>
            </div>
            
            {totalCoverage < insuranceRequest.coverageAmount * 0.8 && (
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded-md">
                <div className="flex items-center text-yellow-800">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    Selected bids must cover at least 80% of the requested amount to finalize the deal.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bids List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Bids</h2>
          </div>
          
          {bids.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bids yet</h3>
              <p className="text-gray-600">Bids will appear here once providers submit them.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {bids.map((bid) => (
                <div key={bid._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {bid.providerId?.profile?.companyName || bid.providerId?.profile?.firstName}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBidStatusColor(bid.status)}`}>
                            {getBidStatusText(bid.status)}
                          </span>
                          {bid.providerId?.profile?.avgRating && (
                            <div className="flex items-center">
                              <Shield className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="text-sm text-gray-600 ml-1">
                                {bid.providerId.profile.avgRating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {bid.status === 'active' && (
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedBids.some(b => b._id === bid._id)}
                                onChange={(e) => handleBidSelection(bid._id, e.target.checked)}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">Select for Group Deal</span>
                            </label>
                          )}
                          
                          <button
                            onClick={() => setShowBidDetails(showBidDetails === bid._id ? null : bid._id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <div className="text-sm text-gray-600">Coverage</div>
                          <div className="font-medium text-gray-900">
                            {bid.currency} {bid.amount?.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            ({((bid.amount / insuranceRequest.coverageAmount) * 100).toFixed(1)}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Premium</div>
                          <div className="font-medium text-gray-900">
                            {bid.currency} {bid.premium?.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Deductible</div>
                          <div className="font-medium text-gray-900">
                            {bid.currency} {bid.deductible?.toLocaleString() || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Valid Until</div>
                          <div className="font-medium text-gray-900">
                            {new Date(bid.validUntil).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      {showBidDetails === bid._id && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-md">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Coverage Details</h4>
                              <p className="text-sm text-gray-600">{bid.coverageDetails}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Terms</h4>
                              <p className="text-sm text-gray-600">{bid.terms}</p>
                            </div>
                          </div>
                          
                          {bid.exclusions && bid.exclusions.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-900 mb-2">Exclusions</h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {bid.exclusions.map((exclusion, index) => (
                                  <li key={index} className="flex items-center">
                                    <XCircle className="h-3 w-3 text-red-500 mr-2" />
                                    {exclusion}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {bid.inclusions && bid.inclusions.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-900 mb-2">Inclusions</h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {bid.inclusions.map((inclusion, index) => (
                                  <li key={index} className="flex items-center">
                                    <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                                    {inclusion}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {bid.features && bid.features.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {bid.features.map((feature, index) => (
                                  <div key={index} className="flex items-center text-sm">
                                    {feature.included ? (
                                      <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                                    ) : (
                                      <XCircle className="h-3 w-3 text-red-500 mr-2" />
                                    )}
                                    <span className={feature.included ? 'text-gray-900' : 'text-gray-500'}>
                                      {feature.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {bid.status === 'active' && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleAcceptBid(bid._id)}
                          disabled={isLoading}
                          className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectBid(bid._id)}
                          disabled={isLoading}
                          className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BidManagement;



