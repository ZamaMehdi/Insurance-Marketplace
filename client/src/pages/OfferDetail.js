import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { 
  ArrowLeft, 
  Shield, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Star, 
  Users, 
  CheckCircle, 
  Building,
  Clock,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const OfferDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptFormData, setAcceptFormData] = useState({
    coverageAmount: '',
    startDate: '',
    additionalNotes: ''
  });

  useEffect(() => {
    if (id) {
      fetchOfferDetails();
    }
  }, [id]);

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      
      const response = await apiService.getOfferById(id);
      
      if (response.success && response.data) {
        setOffer(response.data);
      } else if (response.offer) {
        setOffer(response.offer);
      } else if (response._id) {
        // Direct offer object
        setOffer(response);
      } else {
        toast.error('Offer not found');
        navigate('/marketplace');
      }
    } catch (error) {
      console.error('❌ Error fetching offer details:', error);
      
      // Try to get offer from localStorage or context as fallback
      const storedOffers = localStorage.getItem('marketplace_offers');
      if (storedOffers) {
        try {
          const offers = JSON.parse(storedOffers);
          const fallbackOffer = offers.find(o => o._id === id);
          if (fallbackOffer) {
            setOffer(fallbackOffer);
            return;
          }
        } catch (parseError) {
          // Could not parse stored offers
        }
      }
      
      toast.error('Failed to load offer details');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const acceptOffer = async (e) => {
    e.preventDefault();
    
    if (!offer || !acceptFormData.coverageAmount || !acceptFormData.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const acceptedOfferData = {
        offerId: offer._id,
        clientId: user?.user?._id || user?._id,
        providerId: offer.providerId,
        coverageAmount: parseFloat(acceptFormData.coverageAmount),
        startDate: acceptFormData.startDate,
        monthlyPremium: offer.pricing?.basePremium || 0,
        additionalNotes: acceptFormData.additionalNotes || ''
      };

      const response = await apiService.createAcceptedOffer(acceptedOfferData);
      
      if (response.success) {
        toast.success('Insurance offer accepted successfully! Check your dashboard for details.');
        setShowAcceptModal(false);
        navigate('/accepted-offers');
      } else {
        toast.error(response.message || 'Failed to accept offer');
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error('Failed to accept offer. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading offer details...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Offer not found</p>
          <button 
            onClick={() => navigate('/marketplace')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{offer.title}</h1>
              <p className="text-gray-600 text-lg">{offer.description}</p>
              
              {/* Collaboration Badge */}
              {offer.collaboration?.isCollaborative && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full mt-3">
                  <Users className="h-4 w-4" />
                  Collaborative Offer
                </div>
              )}
            </div>
            
            {user?.role === 'client' && (
              <button
                onClick={() => setShowAcceptModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Accept Offer
              </button>
            )}
          </div>
        </div>

        {/* Offer Details */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Coverage Details</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Coverage Amount</span>
                  <span className="font-semibold text-gray-900">
                    ${offer.coverageDetails?.maxAmount?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Monthly Premium</span>
                  <span className="font-semibold text-gray-900">
                    ${offer.pricing?.basePremium?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-semibold text-gray-900">
                    {offer.terms?.duration || 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Category</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {offer.category || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Provider Information</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Provider</span>
                  <span className="font-semibold text-gray-900">
                    {offer.providerId?.profile?.companyName || 
                     `${offer.providerId?.profile?.firstName} ${offer.providerId?.profile?.lastName}`}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Rating</span>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-semibold text-gray-900">
                      {offer.providerId?.profile?.avgRating?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Reviews</span>
                  <span className="font-semibold text-gray-900">
                    {offer.providerId?.profile?.totalReviews || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Posted</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(offer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        {offer.features && offer.features.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offer.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">{feature.name}</p>
                    {feature.description && (
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collaboration Details */}
        {offer.collaboration?.isCollaborative && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 mb-8">
            <h2 className="text-xl font-semibold text-green-900 mb-4 flex items-center gap-2">
              <Users className="h-6 w-6" />
              Collaboration Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-green-800 mb-3">Partnership Information</h3>
                <div className="space-y-2 text-sm text-green-700">
                  <p><span className="font-medium">Type:</span> {offer.collaboration.collaborationType.replace('_', ' ').toUpperCase()}</p>
                  <p><span className="font-medium">Total Providers:</span> {offer.collaboration.providers.length}</p>
                  <p><span className="font-medium">Coverage Percentage:</span> {offer.collaboration.totalCoveragePercentage}%</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-green-800 mb-3">Provider Details</h3>
                <div className="space-y-2">
                  {offer.collaboration.providers.map((provider, index) => (
                    <div key={index} className="text-sm text-green-700">
                      <p><span className="font-medium">{provider.providerName}:</span> {provider.coveragePercentage}% coverage</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Terms and Conditions */}
        {offer.terms && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Terms & Conditions</h2>
            <div className="space-y-4">
              {offer.terms.waitingPeriod && (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">Waiting Period</p>
                    <p className="text-gray-600">{offer.terms.waitingPeriod}</p>
                  </div>
                </div>
              )}
              
              {offer.terms.exclusions && offer.terms.exclusions.length > 0 && (
                <div>
                  <p className="font-medium text-gray-900 mb-2">Exclusions</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {offer.terms.exclusions.map((exclusion, index) => (
                      <li key={index}>{exclusion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {offer.terms.inclusions && offer.terms.inclusions.length > 0 && (
                <div>
                  <p className="font-medium text-gray-900 mb-2">Inclusions</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {offer.terms.inclusions.map((inclusion, index) => (
                      <li key={index}>{inclusion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Accept Offer Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Accept Insurance Offer</h3>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Offer Details:</p>
                <p className="font-medium text-blue-900">{offer.title}</p>
                <p className="text-sm text-blue-700 mt-1">
                  ${offer.pricing?.basePremium}/month - {offer.category}
                </p>
              </div>
              
              <form onSubmit={acceptOffer}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coverage Amount * <span className="text-gray-500">(USD)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={offer.coverageDetails?.minAmount || 1}
                      max={offer.coverageDetails?.maxAmount || 1000000}
                      value={acceptFormData.coverageAmount}
                      onChange={(e) => setAcceptFormData(prev => ({ ...prev, coverageAmount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter coverage amount"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: ${offer.coverageDetails?.minAmount?.toLocaleString()} - ${offer.coverageDetails?.maxAmount?.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={acceptFormData.startDate}
                      onChange={(e) => setAcceptFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={acceptFormData.additionalNotes}
                      onChange={(e) => setAcceptFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Any additional information..."
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAcceptModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Accept Offer
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

export default OfferDetail;
