import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  DollarSign, 
  Percent, 
  Calendar, 
  FileText, 
  Upload,
  Save,
  Trash2,
  Plus,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Building,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

const BidSubmission = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [insuranceRequest, setInsuranceRequest] = useState(null);

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    coveragePercentage: '',
    premium: '',
    deductible: '',
    coPay: '',
    maxOutOfPocket: '',
    coverageDetails: '',
    terms: '',
    exclusions: [''],
    inclusions: [''],
    waitingPeriod: '',
    validUntil: '',
    responseTime: 24,
    features: [{ name: '', description: '', included: true }],
    documents: []
  });

  useEffect(() => {
    if (requestId) {
      fetchInsuranceRequest();
      // Set default valid until date (30 days from now)
      const defaultValidUntil = new Date();
      defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        validUntil: defaultValidUntil.toISOString().split('T')[0]
      }));
    }
  }, [requestId]);

  const fetchInsuranceRequest = async () => {
    try {
      console.log('BidSubmission: Loading insurance request in mock mode');
      
      // Since we have static users, just use mock data
      const mockRequest = {
        _id: requestId,
        title: 'Commercial Property Insurance Request',
        description: 'Need comprehensive coverage for office building in downtown area',
        category: 'property',
        coverageAmount: 2000000,
        currency: 'USD',
        assetDetails: {
          type: 'property',
          name: 'Office Building',
          value: 2000000,
          location: {
            city: 'New York',
            state: 'NY',
            country: 'USA'
          }
        },
        insuranceDetails: {
          requestedAmount: 2000000,
          coverageType: 'full',
          riskLevel: 'medium'
        },
        priority: 'high',
        status: 'open',
        timeRemaining: '2 weeks',
        bidCount: 3,
        clientId: 'mock-client-1',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 12,
        biddingDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        location: {
          city: 'New York',
          state: 'NY',
          country: 'USA'
        }
      };
      
      setInsuranceRequest(mockRequest);
      setFormData(prev => ({
        ...prev,
        currency: mockRequest.currency || 'USD'
      }));
      
    } catch (error) {
      console.error('Error setting mock insurance request:', error);
      toast.error('Failed to load insurance request details');
    }
  };

  const handleChange = (section, field, value, index = null) => {
    setFormData(prev => {
      if (index !== null) {
        // Handle array fields
        const newArray = [...prev[section]];
        newArray[index] = { ...newArray[index], [field]: value };
        return { ...prev, [section]: newArray };
      } else if (section === 'features') {
        // Handle features array
        const newFeatures = [...prev.features];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        return { ...prev, features: newFeatures };
      } else {
        // Handle simple fields
        return { ...prev, [field]: value };
      }
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addArrayItem = (section, template = '') => {
    setFormData(prev => ({
      ...prev,
      [section]: [...prev[section], template]
    }));
  };

  const removeArrayItem = (section, index) => {
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      file: file,
      url: URL.createObjectURL(file)
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      return newFiles;
    });
  };

  const calculateCoverageAmount = () => {
    if (insuranceRequest && formData.coveragePercentage && formData.coveragePercentage > 0) {
      return (insuranceRequest.coverageAmount * formData.coveragePercentage) / 100;
    }
    return 0;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount) newErrors.amount = 'Coverage amount is required';
    if (!formData.coveragePercentage) newErrors.coveragePercentage = 'Coverage percentage is required';
    if (!formData.premium) newErrors.premium = 'Premium amount is required';
    if (!formData.coverageDetails.trim()) newErrors.coverageDetails = 'Coverage details are required';
    if (!formData.terms.trim()) newErrors.terms = 'Terms are required';
    if (!formData.validUntil) newErrors.validUntil = 'Valid until date is required';

    if (formData.coveragePercentage && (formData.coveragePercentage <= 0 || formData.coveragePercentage > 100)) {
      newErrors.coveragePercentage = 'Coverage percentage must be between 0 and 100';
    }

    if (formData.amount && formData.amount <= 0) {
      newErrors.amount = 'Coverage amount must be greater than 0';
    }

    if (formData.premium && formData.premium <= 0) {
      newErrors.premium = 'Premium must be greater than 0';
    }

    if (formData.validUntil) {
      const validUntil = new Date(formData.validUntil);
      const today = new Date();
      if (validUntil <= today) {
        newErrors.validUntil = 'Valid until date must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      console.log('BidSubmission: Submitting bid in mock mode');
      
      // Since we have static users, just use mock response
      toast.success('Bid submitted successfully!');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast.error('Failed to submit bid. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

  if (user.role !== 'provider') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Only insurance providers can submit bids.</p>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Submit Insurance Bid</h1>
          <p className="text-gray-600 mt-2">Submit your bid for the insurance request below</p>
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
                <span className="text-sm text-gray-600">{insuranceRequest.category}</span>
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Coverage Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Coverage Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coverage Percentage *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.coveragePercentage}
                    onChange={(e) => {
                      const percentage = parseFloat(e.target.value);
                      handleChange('', 'coveragePercentage', percentage);
                      // Auto-calculate coverage amount
                      if (insuranceRequest && percentage > 0) {
                        const amount = (insuranceRequest.coverageAmount * percentage) / 100;
                        handleChange('', 'amount', amount);
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.coveragePercentage ? 'border-red-300' : 'border-gray-300'
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
                {errors.coveragePercentage && <p className="mt-1 text-sm text-red-600">{errors.coveragePercentage}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coverage Amount *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleChange('', 'amount', parseFloat(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="200000"
                  min="0"
                  step="1000"
                  readOnly
                />
                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Auto-calculated based on percentage
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleChange('', 'currency', e.target.value)}
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

          {/* Premium & Pricing */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Premium & Pricing
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Premium Amount *
                </label>
                <input
                  type="number"
                  value={formData.premium}
                  onChange={(e) => handleChange('', 'premium', parseFloat(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.premium ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="5000"
                  min="0"
                  step="100"
                />
                {errors.premium && <p className="mt-1 text-sm text-red-600">{errors.premium}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deductible
                </label>
                <input
                  type="number"
                  value={formData.deductible}
                  onChange={(e) => handleChange('', 'deductible', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1000"
                  min="0"
                  step="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Co-Pay
                </label>
                <input
                  type="number"
                  value={formData.coPay}
                  onChange={(e) => handleChange('', 'coPay', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                  min="0"
                  step="10"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Out of Pocket
              </label>
              <input
                type="number"
                value={formData.maxOutOfPocket}
                onChange={(e) => handleChange('', 'maxOutOfPocket', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10000"
                min="0"
                step="1000"
              />
            </div>
          </div>

          {/* Coverage Details & Terms */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Coverage Details & Terms
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coverage Details *
                </label>
                <textarea
                  value={formData.coverageDetails}
                  onChange={(e) => handleChange('', 'coverageDetails', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.coverageDetails ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe what is covered under this policy..."
                />
                {errors.coverageDetails && <p className="mt-1 text-sm text-red-600">{errors.coverageDetails}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms & Conditions *
                </label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => handleChange('', 'terms', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.terms ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe the terms and conditions of this policy..."
                />
                {errors.terms && <p className="mt-1 text-sm text-red-600">{errors.terms}</p>}
              </div>
            </div>

            {/* Exclusions & Inclusions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exclusions
                </label>
                {formData.exclusions.map((exclusion, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={exclusion}
                      onChange={(e) => handleChange('exclusions', 'exclusions', e.target.value, index)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Acts of war, nuclear incidents"
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('exclusions', index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('exclusions', '')}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Exclusion
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inclusions
                </label>
                {formData.inclusions.map((inclusion, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={inclusion}
                      onChange={(e) => handleChange('inclusions', 'inclusions', e.target.value, index)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Emergency services, legal defense"
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('inclusions', index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('inclusions', '')}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Inclusion
                </button>
              </div>
            </div>
          </div>

          {/* Policy Features */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Policy Features
            </h2>
            
            <div className="space-y-4">
              {formData.features.map((feature, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <input
                    type="text"
                    value={feature.name}
                    onChange={(e) => handleChange('features', 'name', e.target.value, index)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Feature name"
                  />
                  <input
                    type="text"
                    value={feature.description}
                    onChange={(e) => handleChange('features', 'description', e.target.value, index)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description"
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={feature.included}
                        onChange={(e) => handleChange('features', 'included', e.target.checked, index)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Included</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeArrayItem('features', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('features', { name: '', description: '', included: true })}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Feature
              </button>
            </div>
          </div>

          {/* Timeline & Validity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Timeline & Validity
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until *
                </label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => handleChange('', 'validUntil', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.validUntil ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.validUntil && <p className="mt-1 text-sm text-red-600">{errors.validUntil}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Time (hours)
                </label>
                <input
                  type="number"
                  value={formData.responseTime}
                  onChange={(e) => handleChange('', 'responseTime', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="168"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waiting Period
                </label>
                <input
                  type="text"
                  value={formData.waitingPeriod}
                  onChange={(e) => handleChange('', 'waitingPeriod', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 30 days"
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-indigo-600" />
              Supporting Documents
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Documents
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOC, images (MAX. 10MB each)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    multiple
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  />
                </label>
              </div>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h3>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Submit Bid
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BidSubmission;


