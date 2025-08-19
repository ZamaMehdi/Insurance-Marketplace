// client/src/pages/Marketplace.js
import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Search, Filter, MapPin, Star, Clock, DollarSign, Shield, Users, CheckCircle, AlertCircle, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom'; // Added for navigation

const Marketplace = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [newOffer, setNewOffer] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [acceptFormData, setAcceptFormData] = useState({
    coverageAmount: '',
    startDate: '',
    additionalNotes: ''
  });
  const [acceptedOfferIds, setAcceptedOfferIds] = useState(new Set());
  const [showCollaborativeOnly, setShowCollaborativeOnly] = useState(false);

  const categories = [
    { id: 'all', name: 'All Categories', icon: Shield },
    { id: 'health', name: 'Health Insurance', icon: Shield },
    { id: 'auto', name: 'Auto Insurance', icon: Shield },
    { id: 'life', name: 'Life Insurance', icon: Shield },
    { id: 'property', name: 'Property Insurance', icon: Shield },
    { id: 'business', name: 'Business Insurance', icon: Shield },
    { id: 'travel', name: 'Travel Insurance', icon: Shield }
  ];
  
  console.log('🔍 Available categories:', categories.map(cat => ({ id: cat.id, name: cat.name })));
  console.log('🔍 Current selected category:', selectedCategory);

  useEffect(() => {
    if (socket) {
      // Listen for offer notifications from the server
      socket.on('offer_notification', (data) => {
        setOffers((prevOffers) => [...prevOffers, data]);
        toast.success('New insurance offer received!');
      });

      // Listen for insurance request notifications
      socket.on('insurance_request_notification', (data) => {
        toast.success('New insurance request available!');
      });

      // Listen for bid notifications
      socket.on('bid_notification', (data) => {
        toast.success('New bid received on your request!');
      });

      // Cleanup on component unmount
      return () => {
        socket.off('offer_notification');
        socket.off('insurance_request_notification');
        socket.off('bid_notification');
      };
    }
  }, [socket]);

  useEffect(() => {
    // Fetch providers on component mount
    fetchProviders();
    // Fetch insurance offers on component mount
    fetchOffers();
    // Load offers already accepted by this client (to disable Accept button)
    if (user && user.role === 'client') {
      const clientId = user?.user?._id || user?._id;
      apiService
        .getClientAcceptedOffers(clientId, 100, 1, 'active')
        .then((res) => {
          if (res && res.success && Array.isArray(res.data)) {
            const ids = new Set(res.data.map((o) => (o.offerId?._id || o.offerId))); 
            setAcceptedOfferIds(ids);
          }
        })
        .catch(() => {});
    }
  }, []);

  const fetchOffers = async () => {
    try {
      console.log('🔍 Fetching insurance offers...');
      
      // Fetch regular offers first
      const regularResponse = await apiService.getOffers();
      console.log('🔍 Regular offers response:', regularResponse);
      
      let regularOffers = [];
      if (regularResponse.offers && Array.isArray(regularResponse.offers)) {
        regularOffers = regularResponse.offers;
      } else if (Array.isArray(regularResponse)) {
        regularOffers = regularResponse;
      }
      
      // Check if collaborative offers are already included in regular offers
      const collaborativeOffersInRegular = regularOffers.filter(o => o.collaboration?.isCollaborative);
      console.log('🔍 Collaborative offers found in regular response:', collaborativeOffersInRegular.length);
      
      // Only fetch separate collaborative offers if none were found in regular response
      let collaborativeOffers = [];
      if (collaborativeOffersInRegular.length === 0) {
        try {
          const collaborativeResponse = await apiService.getCollaborativeOffers();
          console.log('🔍 Collaborative offers response:', collaborativeResponse);
          
          if (collaborativeResponse.data && Array.isArray(collaborativeResponse.data)) {
            collaborativeOffers = collaborativeResponse.data;
          } else if (Array.isArray(collaborativeResponse)) {
            collaborativeOffers = collaborativeResponse;
          }
        } catch (collabError) {
          console.warn('⚠️ Could not fetch collaborative offers:', collabError.message);
          console.warn('⚠️ This is expected while we fix the backend issue');
        }
      } else {
        console.log('✅ Collaborative offers already included in regular response');
      }
      
      // Merge all offers and remove duplicates
      const allOffers = [...regularOffers, ...collaborativeOffers];
      
      // Remove duplicate offers based on _id
      const uniqueOffers = allOffers.filter((offer, index, self) => 
        index === self.findIndex(o => o._id === offer._id)
      );
      
      console.log('🔍 Total offers (regular + collaborative):', allOffers.length);
      console.log('🔍 Unique offers after deduplication:', uniqueOffers.length);
      console.log('🔍 Regular offers count:', regularOffers.length);
      console.log('🔍 Collaborative offers count:', collaborativeOffers.length);
      
      // Filter offers based on category and collaboration status
      let filteredOffers = uniqueOffers;
      
      if (selectedCategory !== 'all') {
        filteredOffers = filteredOffers.filter(offer => offer.category === selectedCategory);
      }
      
      if (showCollaborativeOnly) {
        filteredOffers = filteredOffers.filter(offer => offer.collaboration?.isCollaborative);
      }

      setOffers(filteredOffers);
      console.log('✅ Final filtered offers:', filteredOffers.length);
    } catch (error) {
      console.error('❌ Error fetching offers:', error);
      
      // Show more specific error information
      if (error.message) {
        console.error('❌ Error message:', error.message);
      }
      if (error.response) {
        console.error('❌ Error response:', error.response);
      }
      
      toast.error(`Failed to load insurance offers: ${error.message || 'Unknown error'}`);
      setOffers([]);
    }
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await apiService.request('/providers');
      console.log('🔍 Providers response:', response);
      
      if (response.providers && Array.isArray(response.providers)) {
        setProviders(response.providers);
      } else {
        console.log('🔍 No providers found or invalid response format');
        setProviders([]);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to fetch providers.');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOffer = () => {
    if (newOffer.trim()) {
      const offerData = { 
        id: Date.now(), 
        text: newOffer,
        category: selectedCategory,
        timestamp: new Date(),
        provider: user ? user.profile.companyName || user.profile.firstName : 'Anonymous'
      };
      
      if (socket) {
        socket.emit('new_offer', offerData);
      }
      
      setOffers((prevOffers) => [...prevOffers, offerData]);
      setNewOffer('');
      toast.success('Offer submitted successfully!');
    }
  };

  const acceptOffer = async (e) => {
    e.preventDefault();
    
    if (!selectedOffer || !acceptFormData.coverageAmount || !acceptFormData.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      console.log('Marketplace: Accepting offer:', selectedOffer);
      
      // Create the accepted offer data
      const acceptedOfferData = {
        offerId: selectedOffer._id,
        clientId: user?.user?._id || user?._id,
        providerId: selectedOffer.providerId,
        coverageAmount: parseFloat(acceptFormData.coverageAmount),
        startDate: acceptFormData.startDate,
        monthlyPremium: selectedOffer.pricing?.basePremium || 0,
        additionalNotes: acceptFormData.additionalNotes || ''
      };

      console.log('Marketplace: Sending accepted offer data:', acceptedOfferData);
      
      // Call the API to create the accepted offer
      const response = await apiService.createAcceptedOffer(acceptedOfferData);
      
      if (response.success) {
        toast.success('Insurance offer accepted successfully! Check your dashboard for details.');
        
        // Close the modal and reset form
        setShowAcceptModal(false);
        setSelectedOffer(null);
        setAcceptFormData({
          coverageAmount: '',
          startDate: '',
          additionalNotes: ''
        });
        
        // Record accepted offer to disable the button
        setAcceptedOfferIds((prev) => new Set(prev).add(selectedOffer._id));

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit('offer_accepted', {
            offerId: selectedOffer._id,
            clientId: user?.user?._id || user?._id,
            providerId: selectedOffer.providerId
          });
        }
        
        // Refresh the offers list to show updated status
        fetchOffers();
      } else {
        toast.error(response.message || 'Failed to accept insurance offer');
      }
      
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error('Failed to accept insurance offer. Please try again.');
    }
  };

  const openAcceptModal = (offer) => {
    setSelectedOffer(offer);
    setAcceptFormData({
      coverageAmount: offer.coverageDetails?.minAmount || '',
      startDate: '',
      additionalNotes: ''
    });
    setShowAcceptModal(true);
  };

  const closeAcceptModal = () => {
    setShowAcceptModal(false);
    setSelectedOffer(null);
    setAcceptFormData({
      coverageAmount: '',
      startDate: '',
      additionalNotes: ''
    });
  };

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.profile.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.profile.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.profile.expertise?.some(exp => exp.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
                           provider.profile.expertise?.includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  // Filter offers based on selected category
  const filteredOffers = offers.filter(offer => {
    console.log('🔍 Filtering offer:', offer.title, 'Category:', offer.category, 'Selected:', selectedCategory);
    if (selectedCategory === 'all') return true;
    const matches = offer.category?.toLowerCase() === selectedCategory.toLowerCase();
    console.log('🔍 Category match:', matches);
    return matches;
  });
  
  console.log('🔍 Filtered offers count:', filteredOffers.length, 'Total offers:', offers.length);

  const navigate = useNavigate(); // Initialize useNavigate

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Insurance Marketplace</h1>
              <p className="text-gray-600 mt-2">Browse and compare insurance offers from trusted providers</p>
            </div>
            <button
              onClick={fetchOffers}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Refreshing...' : 'Refresh Offers'}</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search offers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Collaboration Filter */}
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showCollaborativeOnly}
                  onChange={(e) => setShowCollaborativeOnly(e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Collaborative Offers Only</span>
              </label>
            </div>
          </div>
        </div>



        {/* Live Offers Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            Live Insurance Offers
          </h2>
          
          <div className="space-y-4 mb-6">
            {filteredOffers.length > 0 ? (
              filteredOffers.map((offer, index) => (
                <div key={`${offer._id}-${index}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Offer Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{offer.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{offer.description}</p>
                        
                        {/* Collaboration Badge */}
                        {offer.collaboration?.isCollaborative && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full mb-3">
                            <Users className="h-3 w-3" />
                            Collaborative Offer
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {offer.providerId?.profile?.companyName || 
                             `${offer.providerId?.profile?.firstName} ${offer.providerId?.profile?.lastName}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {offer.eligibility?.locations?.[0] || 'Multiple locations'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Provider Rating */}
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-900">
                            {offer.providerId?.profile?.avgRating?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {offer.providerId?.profile?.totalReviews || 0} reviews
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Offer Details */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Coverage Details</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Coverage Amount:</span>
                            <span className="font-medium">
                              ${offer.coverageDetails?.maxAmount?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Premium:</span>
                            <span className="font-medium">
                              ${offer.pricing?.basePremium?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span className="font-medium">{offer.terms?.duration || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                        <div className="space-y-1">
                          {offer.features?.slice(0, 3).map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span>{feature.name}</span>
                            </div>
                          ))}
                          {offer.features?.length > 3 && (
                            <p className="text-xs text-gray-500">
                              +{offer.features.length - 3} more features
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Collaboration Details */}
                    {offer.collaboration?.isCollaborative && (
                      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Collaboration Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-green-700 mb-2">
                              <span className="font-medium">Type:</span> {offer.collaboration.collaborationType.replace('_', ' ').toUpperCase()}
                            </p>
                            <p className="text-sm text-green-700">
                              <span className="font-medium">Providers:</span> {offer.collaboration.providers.length}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-green-700 mb-2">
                              <span className="font-medium">Total Coverage:</span> {offer.collaboration.totalCoveragePercentage}%
                            </p>
                            <p className="text-sm text-green-700">
                              <span className="font-medium">Lead Provider:</span> {offer.providerId?.profile?.companyName || 
                                `${offer.providerId?.profile?.firstName} ${offer.providerId?.profile?.lastName}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedOffer(offer);
                            setShowAcceptModal(true);
                          }}
                          disabled={acceptedOfferIds.has(offer._id)}
                          className={`px-4 py-2 rounded-md font-medium transition-colors ${
                            acceptedOfferIds.has(offer._id)
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {acceptedOfferIds.has(offer._id) ? 'Already Accepted' : 'Accept Offer'}
                        </button>
                        
                        <button
                          onClick={() => navigate(`/offer-detail/${offer._id}`)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          View Details
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500">Posted</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(offer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {selectedCategory === 'all' 
                    ? 'No insurance offers available at the moment.' 
                    : `No ${categories.find(cat => cat.id === selectedCategory)?.name} offers available.`
                  }
                </p>
                {selectedCategory !== 'all' && (
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    View all categories
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Submit Offer Form */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Submit Your Offer</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newOffer}
                onChange={(e) => setNewOffer(e.target.value)}
                placeholder="Enter your insurance offer or update..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSendOffer}
                disabled={!newOffer.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Offer
              </button>
            </div>
          </div>
        </div>

        {/* Providers Grid */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="h-6 w-6 text-green-600" />
            Verified Insurance Providers
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({filteredProviders.length} found)
            </span>
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading providers...</p>
            </div>
          ) : filteredProviders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProviders.map((provider) => (
                <div key={provider._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {provider.profile.companyName || `${provider.profile.firstName} ${provider.profile.lastName}`}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {provider.profile.expertise?.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-medium">
                        {provider.profile.avgRating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {provider.profile.bio && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {provider.profile.bio}
                    </p>
                  )}

                  {provider.profile.location && (
                    <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {[provider.profile.location.city, provider.profile.location.state, provider.profile.location.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {provider.profile.totalReviews || 0} reviews
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No providers found matching your criteria</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Accept Offer Modal */}
      {showAcceptModal && selectedOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Accept Insurance Offer</h3>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Offer Details:</p>
                <p className="font-medium text-blue-900">{selectedOffer.title}</p>
                <p className="text-sm text-blue-700 mt-1">
                  ${selectedOffer.pricing?.basePremium}/month - {selectedOffer.category}
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
                      min={selectedOffer.coverageDetails?.minAmount || 1}
                      max={selectedOffer.coverageDetails?.maxAmount || 1000000}
                      value={acceptFormData.coverageAmount}
                      onChange={(e) => setAcceptFormData(prev => ({ ...prev, coverageAmount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter coverage amount"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: ${selectedOffer.coverageDetails?.minAmount?.toLocaleString()} - ${selectedOffer.coverageDetails?.maxAmount?.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
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
                      rows={3}
                      value={acceptFormData.additionalNotes}
                      onChange={(e) => setAcceptFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Any special requirements or notes..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeAcceptModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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

export default Marketplace;


