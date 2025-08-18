// client/src/pages/Marketplace.js
import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Search, Filter, MapPin, Star, Clock, DollarSign, Shield, Users, CheckCircle, AlertCircle, Building } from 'lucide-react';
import toast from 'react-hot-toast';

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
      const response = await apiService.getOffers();
      console.log('🔍 Offers response:', response);
      
      // Handle both response formats: { offers: [...] } or just [...]
      let offersArray = [];
      if (response.offers && Array.isArray(response.offers)) {
        offersArray = response.offers;
      } else if (Array.isArray(response)) {
        offersArray = response;
      } else {
        console.log('🔍 No offers found or invalid response format');
        offersArray = [];
      }
      
      console.log('🔍 Processed offers array:', offersArray);
      setOffers(offersArray);
    } catch (error) {
      console.error('🔍 Error fetching offers:', error);
      toast.error('Failed to fetch insurance offers.');
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Insurance Marketplace
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connect with verified insurance providers and find the perfect coverage for your needs
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search providers, expertise, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      console.log('🔍 Category clicked:', category.id, category.name);
                      setSelectedCategory(category.id);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {category.name}
                  </button>
                );
              })}
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
              filteredOffers.map((offer) => (
                <div key={offer._id} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">{offer.title}</h3>
                      <p className="text-blue-800 mb-3">{offer.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <Shield className="h-4 w-4" />
                          <span className="font-medium">{offer.category}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">${offer.pricing?.basePremium}/month</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm text-blue-600">
                            {new Date(offer.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Provider Information */}
                      {offer.providerId && (
                        <div className="flex items-center justify-between mb-3 p-3 bg-blue-100 rounded-lg">
                          <div className="flex items-center space-x-2 text-sm text-blue-800">
                            <Building className="h-4 w-4" />
                            <span className="font-medium">
                              {offer.providerId.profile?.companyName || 
                               offer.providerId.profile?.firstName || 
                               'Unknown Provider'}
                            </span>
                            {offer.providerId.kycStatus === 'verified' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Shield className="h-3 w-3 mr-1" />
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {offer.coverageDetails && (
                        <div className="text-sm text-blue-600 mb-3">
                          <span className="font-medium">Coverage:</span> ${offer.coverageDetails.minAmount?.toLocaleString()} - ${offer.coverageDetails.maxAmount?.toLocaleString()}
                        </div>
                      )}

                      {/* Accept Offer Button - Only show for clients */}
                      {user && user.role === 'client' && (
                        <button
                          onClick={() => openAcceptModal(offer)}
                          disabled={acceptedOfferIds.has(offer._id)}
                          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${acceptedOfferIds.has(offer._id) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          {acceptedOfferIds.has(offer._id) ? 'Already Accepted' : 'Accept Offer'}
                        </button>
                      )}
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

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {provider.profile.totalReviews || 0} reviews
                      </span>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                      View Profile
                    </button>
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


