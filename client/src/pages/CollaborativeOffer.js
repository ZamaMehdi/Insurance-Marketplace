import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { 
  Shield, 
  Users, 
  DollarSign, 
  Calendar, 
  MapPin, 
  FileText, 
  Star,
  Save,
  Plus,
  Trash2,
  Search,
  Building,
  Percent,
  Handshake
} from 'lucide-react';

const CollaborativeOffer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Helper function to get user display name
  const getUserDisplayName = (userObj) => {
    if (!userObj) return 'Unknown User';
    
    if (userObj.profile?.companyName) {
      return userObj.profile.companyName;
    } else if (userObj.profile?.firstName && userObj.profile?.lastName) {
      return `${userObj.profile.firstName} ${userObj.profile.lastName}`;
    } else if (userObj.profile?.firstName) {
      return userObj.profile.firstName;
    } else if (userObj.email) {
      return userObj.email.split('@')[0]; // Use email prefix as fallback
    } else {
      return 'Current Provider'; // Final fallback
    }
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'health',
    subcategory: '',
    coverageDetails: {
      minAmount: 100000,
      maxAmount: 1000000,
      currency: 'USD',
      deductible: '',
      coPay: '',
      maxOutOfPocket: ''
    },
    terms: {
      duration: '1 year',
      waitingPeriod: '',
      exclusions: [''],
      inclusions: [''],
      specialConditions: ['']
    },
    pricing: {
      basePremium: '',
      currency: 'USD',
      paymentFrequency: 'monthly',
      discounts: [{ type: '', percentage: '' }]
    },
    eligibility: {
      minAge: '',
      maxAge: '',
      locations: [''],
      preExistingConditions: false,
      healthRequirements: [''],
      occupationRestrictions: ['']
    },
    features: [{ name: '24/7 Customer Support', description: 'Round-the-clock customer service and support', included: true }],
    highlights: [''],
    tags: [''],
    isPublic: false,
    collaboration: {
      isCollaborative: true,
      providers: [],
      leadProvider: '',
      partnershipAgreement: '',
      collaborationType: 'partnership',
      totalCoveragePercentage: 100,
      isFullyCovered: true
    }
  });

  // All hooks must be called before any conditional returns
  useEffect(() => {
    // Set the current user as the lead provider and add them to providers list
    if (user && !formData.collaboration.leadProvider) {
      const currentUserId = user._id || user.user?._id;
      
             const currentUserName = getUserDisplayName(user);
      
      setFormData(prev => ({
        ...prev,
        collaboration: {
          ...prev.collaboration,
          leadProvider: currentUserId,
          providers: [{
            providerId: currentUserId,
            providerName: currentUserName,
            coveragePercentage: 100, // Start with 100% for single provider
            premiumShare: 100,
            responsibilities: ['Lead provider - manages the collaborative offer'],
            expertise: user.profile?.expertise || [],
            contactInfo: {
              email: user.email,
              phone: user.profile?.phone || ''
            }
          }]
        }
      }));
    }
  }, [user, formData.collaboration.leadProvider]);

  // Auto-normalize percentages when providers change
  useEffect(() => {
    if (formData.collaboration.providers.length > 0) {
      normalizePercentages();
    }
  }, [formData.collaboration.providers.length]);

  // Ensure current user is always in providers list
  useEffect(() => {
    if (user && formData.collaboration.leadProvider && formData.collaboration.providers.length > 0) {
      const currentUserId = user._id || user.user?._id;
      const isUserInProviders = formData.collaboration.providers.some(p => p.providerId === currentUserId);
      
             if (!isUserInProviders) {
         const currentUserName = getUserDisplayName(user);
        
        setFormData(prev => ({
          ...prev,
          collaboration: {
            ...prev.collaboration,
            providers: [
              {
                providerId: currentUserId,
                providerName: currentUserName,
                coveragePercentage: 0, // Will be normalized
                premiumShare: 0, // Will be normalized
                responsibilities: ['Lead provider - manages the collaborative offer'],
                expertise: user.profile?.expertise || [],
                contactInfo: {
                  email: user.email,
                  phone: user.profile?.phone || ''
                }
              },
              ...prev.collaboration.providers
            ]
          }
        }));
      }
    }
  }, [user, formData.collaboration.leadProvider, formData.collaboration.providers]);

  // Redirect if not a provider
  if (!user || user.role !== 'provider') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Only insurance providers can create collaborative offers.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (section, field, value, index = null) => {
    setFormData(prev => {
      if (index !== null) {
        // Handle array fields
        const newArray = [...prev[section]];
        newArray[index] = { ...newArray[index], [field]: value };
        return { ...prev, [section]: newArray };
      } else if (section === 'coverageDetails' || section === 'terms' || section === 'pricing' || section === 'eligibility' || section === 'collaboration') {
        // Handle nested objects
        return {
          ...prev,
          [section]: { ...prev[section], [field]: value }
        };
      } else {
        // Handle simple fields
        return { ...prev, [field]: value };
      }
    });
  };

  const searchProviders = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await apiService.searchProviders(searchTerm);
      if (response.success && Array.isArray(response.data)) {
        setSearchResults(response.data.filter(provider => 
          provider._id !== (user._id || user.user?._id) // Exclude current user
        ));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      // console.error('Error searching providers:', error);
      toast.error('Failed to search providers');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addProvider = (provider) => {
    const existingProvider = formData.collaboration.providers.find(p => p.providerId === provider._id);
    if (existingProvider) {
      toast.error('Provider already added to collaboration');
      return;
    }

    const newProvider = {
      providerId: provider._id,
      providerName: getUserDisplayName(provider),
      coveragePercentage: 0,
      premiumShare: 0,
      responsibilities: [''],
      expertise: provider.profile?.expertise || [],
      contactInfo: {
        email: provider.email,
        phone: provider.profile?.phone || ''
      }
    };

    // Add the new provider
    const updatedProviders = [...formData.collaboration.providers, newProvider];
    
    // Automatically distribute percentages evenly
    const totalProviders = updatedProviders.length;
    const equalPercentage = Math.round((100 / totalProviders) * 10) / 10; // Round to 1 decimal place
    
    const distributedProviders = updatedProviders.map((p, index) => ({
      ...p,
      coveragePercentage: equalPercentage,
      premiumShare: equalPercentage
    }));

    setFormData(prev => ({
      ...prev,
      collaboration: {
        ...prev.collaboration,
        providers: distributedProviders
      }
    }));

    setSearchResults([]);
    setSearchTerm('');
    toast.success(`${newProvider.providerName} added to collaboration with ${equalPercentage}% share`);
  };

  const removeProvider = (providerId) => {
    // Prevent removing the lead provider (current user)
    if (providerId === formData.collaboration.leadProvider) {
      toast.error('Cannot remove the lead provider from the collaboration');
      return;
    }
    
    const remainingProviders = formData.collaboration.providers.filter(p => p.providerId !== providerId);
    
    if (remainingProviders.length > 0) {
      // Redistribute percentages evenly among remaining providers
      const equalPercentage = Math.round((100 / remainingProviders.length) * 10) / 10;
      
      const redistributedProviders = remainingProviders.map(provider => ({
        ...provider,
        coveragePercentage: equalPercentage,
        premiumShare: equalPercentage
      }));

      setFormData(prev => ({
        ...prev,
        collaboration: {
          ...prev.collaboration,
          providers: redistributedProviders
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        collaboration: {
          ...prev.collaboration,
          providers: []
        }
      }));
    }
  };

  const updateProviderField = (providerId, field, value, index = null) => {
    setFormData(prev => ({
      ...prev,
      collaboration: {
        ...prev.collaboration,
        providers: prev.collaboration.providers.map(provider => {
          if (provider.providerId === providerId) {
            if (index !== null) {
              // Handle array fields like responsibilities
              const newArray = [...provider[field]];
              newArray[index] = value;
              return { ...provider, [field]: newArray };
            } else {
              return { ...provider, [field]: value };
            }
          }
          return provider;
        })
      }
    }));
  };

  const addResponsibility = (providerId) => {
    updateProviderField(providerId, 'responsibilities', '', formData.collaboration.providers.find(p => p.providerId === providerId)?.responsibilities.length);
  };

  const removeResponsibility = (providerId, index) => {
    const provider = formData.collaboration.providers.find(p => p.providerId === providerId);
    if (provider && provider.responsibilities.length > 1) {
      const newResponsibilities = provider.responsibilities.filter((_, i) => i !== index);
      updateProviderField(providerId, 'responsibilities', newResponsibilities);
    }
  };

  const calculateTotalCoverage = () => {
    return formData.collaboration.providers.reduce((total, provider) => {
      const percentage = parseFloat(provider.coveragePercentage) || 0;
      return total + percentage;
    }, 0);
  };

  const calculateTotalPremiumShare = () => {
    return formData.collaboration.providers.reduce((total, provider) => {
      const percentage = parseFloat(provider.premiumShare) || 0;
      return total + percentage;
    }, 0);
  };

  const normalizePercentages = () => {
    const providers = formData.collaboration.providers;
    if (providers.length === 0) return;

    const totalCoverage = calculateTotalCoverage();
    const totalPremiumShare = calculateTotalPremiumShare();

    if (totalCoverage !== 100 || totalPremiumShare !== 100) {
      // Normalize coverage percentages
      const normalizedCoverageProviders = providers.map(provider => {
        const currentCoverage = parseFloat(provider.coveragePercentage) || 0;
        const normalizedCoverage = totalCoverage > 0 ? Math.round((currentCoverage / totalCoverage) * 100 * 10) / 10 : 0;
        return { ...provider, coveragePercentage: normalizedCoverage };
      });

      // Normalize premium share percentages
      const normalizedPremiumProviders = normalizedCoverageProviders.map(provider => {
        const currentPremium = parseFloat(provider.premiumShare) || 0;
        const normalizedPremium = totalPremiumShare > 0 ? Math.round((currentPremium / totalPremiumShare) * 100 * 10) / 10 : 0;
        return { ...provider, premiumShare: normalizedPremium };
      });

      setFormData(prev => ({
        ...prev,
        collaboration: {
          ...prev.collaboration,
          providers: normalizedPremiumProviders
        }
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic validation
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.coverageDetails.minAmount) newErrors.minAmount = 'Minimum coverage amount is required';
    if (!formData.coverageDetails.maxAmount) newErrors.maxAmount = 'Maximum coverage amount is required';
    if (!formData.pricing.basePremium) newErrors.basePremium = 'Base premium is required';

    // Features validation
    formData.features.forEach((feature, index) => {
      if (!feature.name.trim()) {
        newErrors[`feature_${index}_name`] = 'Feature name is required';
      }
    });

    // Collaboration validation
    if (formData.collaboration.providers.length < 1) {
      newErrors.collaboration = 'At least 1 provider (you) is required for collaboration';
    }

    const totalCoverage = calculateTotalCoverage();
    const totalPremiumShare = calculateTotalPremiumShare();

    if (totalCoverage !== 100) {
      newErrors.coveragePercentage = 'Total coverage percentage must equal 100%';
    }

    if (totalPremiumShare !== 100) {
      newErrors.premiumShare = 'Total premium share percentage must equal 100%';
    }

    // Validate individual providers
    formData.collaboration.providers.forEach((provider, index) => {
      const coveragePercentage = parseFloat(provider.coveragePercentage);
      const premiumShare = parseFloat(provider.premiumShare);
      
      if (isNaN(coveragePercentage) || coveragePercentage <= 0) {
        newErrors[`provider_${index}_coverage`] = 'Coverage percentage is required and must be greater than 0';
      }
      if (isNaN(premiumShare) || premiumShare <= 0) {
        newErrors[`provider_${index}_premium`] = 'Premium share percentage is required and must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Normalize percentages before submission
    normalizePercentages();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiService.createCollaborativeOffer(formData);
      if (response.success) {
        toast.success('Collaborative offer created successfully!');
        navigate('/dashboard');
      } else {
        toast.error(response.message || 'Failed to create collaborative offer');
      }
    } catch (error) {
      // console.error('Error creating collaborative offer:', error);
      toast.error('Failed to create collaborative offer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Handshake className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Create Collaborative Insurance Offer</h1>
          </div>
          <p className="text-gray-600">
            Work with other insurance providers to create comprehensive coverage solutions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Offer Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Basic Offer Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offer Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('', 'title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Comprehensive Business Insurance Package"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('', 'category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="health">Health Insurance</option>
                  <option value="auto">Auto Insurance</option>
                  <option value="life">Life Insurance</option>
                  <option value="property">Property Insurance</option>
                  <option value="business">Business Insurance</option>
                  <option value="travel">Travel Insurance</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('', 'description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the collaborative insurance offer..."
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>
          </div>

          {/* Provider Collaboration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Provider Collaboration
            </h2>

            {/* Search and Add Providers */}
            <div className="mb-6">
              {/* Info about lead provider */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="p-1 bg-blue-100 rounded">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">You are automatically included as the Lead Provider</p>
                    <p className="text-blue-700">Search and add other providers to collaborate with. The lead provider manages the collaborative offer and cannot be removed.</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search for Additional Providers
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by company name or expertise..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={searchProviders}
                      disabled={!searchTerm.trim() || isSearching}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Search Results:</h4>
                  <div className="space-y-2">
                    {searchResults.map((provider) => (
                      <div key={provider._id} className="flex items-center justify-between p-3 bg-white rounded border">
                                                 <div>
                           <p className="font-medium text-gray-900">
                             {getUserDisplayName(provider)}
                           </p>
                           <p className="text-sm text-gray-600">
                             Expertise: {provider.profile?.expertise?.join(', ') || 'Not specified'}
                           </p>
                         </div>
                        <button
                          type="button"
                          onClick={() => addProvider(provider)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Collaboration Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collaboration Type
              </label>
              <select
                value={formData.collaboration.collaborationType}
                onChange={(e) => handleChange('collaboration', 'collaborationType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="partnership">Partnership</option>
                <option value="joint_venture">Joint Venture</option>
                <option value="consortium">Consortium</option>
                <option value="syndicate">Syndicate</option>
              </select>
            </div>

            {/* Partnership Agreement */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partnership Agreement
              </label>
              <textarea
                value={formData.collaboration.partnershipAgreement}
                onChange={(e) => handleChange('collaboration', 'partnershipAgreement', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the terms of collaboration, responsibilities, and revenue sharing..."
              />
            </div>

            {/* Selected Providers */}
            {formData.collaboration.providers.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Collaborating Providers</h4>
                
                
                
                {formData.collaboration.providers.map((provider, index) => (
                  <div key={provider.providerId} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900">{provider.providerName}</h5>
                        {provider.providerId === formData.collaboration.leadProvider && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Lead Provider
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProvider(provider.providerId)}
                        disabled={provider.providerId === formData.collaboration.leadProvider}
                        className={`${
                          provider.providerId === formData.collaboration.leadProvider
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-800'
                        }`}
                        title={provider.providerId === formData.collaboration.leadProvider ? 'Lead provider cannot be removed' : 'Remove provider'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Coverage Percentage *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={provider.coveragePercentage || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? 0 : parseFloat(value);
                              if (!isNaN(numValue)) {
                                updateProviderField(provider.providerId, 'coveragePercentage', numValue);
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`provider_${index}_coverage`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="20"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Percent className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                        {errors[`provider_${index}_coverage`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`provider_${index}_coverage`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Premium Share *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={provider.premiumShare || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? 0 : parseFloat(value);
                              if (!isNaN(numValue)) {
                                updateProviderField(provider.providerId, 'premiumShare', numValue);
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`provider_${index}_premium`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="20"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Percent className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                        {errors[`provider_${index}_premium`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`provider_${index}_premium`]}</p>
                        )}
                      </div>
                    </div>

                    {/* Responsibilities */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Responsibilities
                      </label>
                      {provider.responsibilities.map((responsibility, respIndex) => (
                        <div key={respIndex} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={responsibility}
                            onChange={(e) => updateProviderField(provider.providerId, 'responsibilities', e.target.value, respIndex)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Claims processing, Risk assessment"
                          />
                          <button
                            type="button"
                            onClick={() => removeResponsibility(provider.providerId, respIndex)}
                            className="px-2 py-2 text-red-600 hover:text-red-800"
                            disabled={provider.responsibilities.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addResponsibility(provider.providerId)}
                        className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 inline mr-1" />
                        Add Responsibility
                      </button>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Coverage:</p>
                      <p className={`text-lg font-bold ${calculateTotalCoverage() === 100 ? 'text-green-600' : 'text-red-600'}`}>
                        {calculateTotalCoverage()}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Premium Share:</p>
                      <p className={`text-lg font-bold ${calculateTotalPremiumShare() === 100 ? 'text-green-600' : 'text-red-600'}`}>
                        {calculateTotalPremiumShare()}%
                      </p>
                    </div>
                  </div>
                  
                  {(calculateTotalCoverage() !== 100 || calculateTotalPremiumShare() !== 100) && (
                    <div className="space-y-2">
                      <p className="text-sm text-red-600">
                        ⚠️ Both totals must equal 100% for valid collaboration
                      </p>
                      <button
                        type="button"
                        onClick={normalizePercentages}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Auto-Normalize Percentages
                      </button>
                    </div>
                  )}
                  
                  {calculateTotalCoverage() === 100 && calculateTotalPremiumShare() === 100 && (
                    <p className="text-sm text-green-600">
                      ✅ Percentages are properly distributed
                    </p>
                  )}
                </div>
              </div>
            )}

            {errors.collaboration && (
              <p className="mt-2 text-sm text-red-600">{errors.collaboration}</p>
            )}
          </div>

          {/* Coverage Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Coverage Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Coverage Amount *
                </label>
                <input
                  type="number"
                  value={formData.coverageDetails.minAmount}
                  onChange={(e) => handleChange('coverageDetails', 'minAmount', parseFloat(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.minAmount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="100000"
                  min="0"
                  step="1000"
                />
                {errors.minAmount && <p className="mt-1 text-sm text-red-600">{errors.minAmount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Coverage Amount *
                </label>
                <input
                  type="number"
                  value={formData.coverageDetails.maxAmount}
                  onChange={(e) => handleChange('coverageDetails', 'maxAmount', parseFloat(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.maxAmount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="1000000"
                  min="0"
                  step="1000"
                />
                {errors.maxAmount && <p className="mt-1 text-sm text-red-600">{errors.maxAmount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Premium *
                </label>
                <input
                  type="number"
                  value={formData.pricing.basePremium}
                  onChange={(e) => handleChange('pricing', 'basePremium', parseFloat(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.basePremium ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="50000"
                  min="0"
                  step="100"
                />
                {errors.basePremium && <p className="mt-1 text-sm text-red-600">{errors.basePremium}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.coverageDetails.currency}
                  onChange={(e) => handleChange('coverageDetails', 'currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-600" />
              Insurance Features
            </h2>
            
            {formData.features.map((feature, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feature Name *
                    </label>
                    <input
                      type="text"
                      value={feature.name}
                      onChange={(e) => handleChange('features', 'name', e.target.value, index)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[`feature_${index}_name`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 24/7 Support"
                    />
                    {errors[`feature_${index}_name`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`feature_${index}_name`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={feature.description}
                      onChange={(e) => handleChange('features', 'description', e.target.value, index)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Feature description"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={feature.included}
                        onChange={(e) => handleChange('features', 'included', e.target.checked, index)}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Included</span>
                    </label>
                  </div>
                </div>

                {formData.features.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newFeatures = formData.features.filter((_, i) => i !== index);
                      setFormData(prev => ({ ...prev, features: newFeatures }));
                    }}
                    className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 inline mr-1" />
                    Remove Feature
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  features: [...prev.features, { name: '', description: '', included: true }]
                }));
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 inline mr-1" />
              Add Feature
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || formData.collaboration.providers.length < 1}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating Offer...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Collaborative Offer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollaborativeOffer;
