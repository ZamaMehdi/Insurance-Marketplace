import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { 
  Shield, 
  Building, 
  MapPin, 
  DollarSign, 
  Calendar, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  X,
  Save,
  Trash2,
  Upload,
  TrendingUp,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

const InsuranceRequest = () => {
  console.log('InsuranceRequest component rendered');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'business',
    assetDetails: {
      type: 'property',
      name: '',
      value: '',
      location: {
        city: '',
        country: '',
        address: ''
      }
    },
    insuranceDetails: {
      requestedAmount: '',
      currency: 'USD',
      coverageType: 'full',
      riskLevel: 'medium'
    },
    biddingDetails: {
      minimumBidPercentage: 10,
      deadline: '',
      allowPartialBids: true,
      groupInsuranceAllowed: false,
      minProviders: 2,
      maxProviders: 5,
      groupDeadline: ''
    },
    requirements: {
      minProviderRating: 4.0,
      experienceYears: 5,
      financialStrength: 'A'
    }
  });

  console.log('InsuranceRequest: Current formData:', formData);
  console.log('InsuranceRequest: Current errors:', errors);

  const categories = [
    { id: 'business', name: 'Business Insurance', icon: Building, color: 'text-blue-600' },
    { id: 'health', name: 'Health Insurance', icon: Shield, color: 'text-red-600' },
    { id: 'auto', name: 'Auto Insurance', icon: Shield, color: 'text-green-600' },
    { id: 'property', name: 'Property Insurance', icon: Building, color: 'text-purple-600' },
    { id: 'travel', name: 'Travel Insurance', icon: Shield, color: 'text-yellow-600' },
    { id: 'life', name: 'Life Insurance', icon: Shield, color: 'text-indigo-600' },
    { id: 'pet', name: 'Pet Insurance', icon: Shield, color: 'text-pink-600' }
  ];

  const priorities = [
    { id: 'low', name: 'Low', color: 'text-green-600', bgColor: 'bg-green-100' },
    { id: 'medium', name: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { id: 'high', name: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { id: 'urgent', name: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' }
  ];

  useEffect(() => {
    console.log('InsuranceRequest: useEffect triggered with requestId:', requestId);
    if (requestId && requestId !== 'new') {
      fetchRequest();
    } else {
      // Set default deadline for new requests (30 days from now)
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        biddingDeadline: defaultDeadline.toISOString().split('T')[0]
      }));
    }
  }, [requestId]);

  // Debug useEffect to log formData changes
  useEffect(() => {
    console.log('InsuranceRequest: formData changed:', formData);
  }, [formData]);

  // Auto-adjust maxProviders when minProviders changes
  useEffect(() => {
    const minProviders = formData.biddingDetails?.minProviders || 2;
    const maxProviders = formData.biddingDetails?.maxProviders || 5;
    
    if (maxProviders <= minProviders) {
      setFormData(prev => ({
        ...prev,
        biddingDetails: {
          ...prev.biddingDetails,
          maxProviders: minProviders + 1
        }
      }));
    }
  }, [formData.biddingDetails?.minProviders]);

  const fetchRequest = async () => {
    try {
      console.log('InsuranceRequest: Loading request from shared store');
      
      // For now, we'll use default data since we're not storing individual requests in the shared store
      // In a real system, this would fetch from the store
      const defaultData = {
        title: 'Commercial Property Insurance',
        description: 'Need comprehensive coverage for office building in downtown area',
        category: 'property',
        assetDetails: {
          type: 'property',
          name: 'Office Building',
          value: '2000000',
          currency: 'USD',
          location: {
            street: '123 Business Ave',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          }
        },
        insuranceDetails: {
          requestedAmount: '2000000',
          coverageType: 'full',
          riskLevel: 'medium'
        },
        biddingDetails: {
          minimumBidPercentage: 10,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          allowPartialBids: true,
          groupInsuranceAllowed: false,
          minProviders: 2,
          maxProviders: 5,
          groupDeadline: ''
        },
        priority: 'high',
        requirements: ['Fire protection', 'Natural disaster coverage', 'Liability protection']
      };
      
      setFormData(defaultData);
      
    } catch (error) {
      console.error('Error loading request:', error);
      toast.error('Failed to load request details');
    }
  };

  const handleChange = (section, field, value, index = null) => {
    console.log('handleChange called with:', { section, field, value, index });
    
    try {
      setFormData(prev => {
        if (index !== null) {
          // Handle array fields - ensure the section is an array
          if (section === 'specialRequirements') {
            // Handle nested array in requirements
            const currentArray = Array.isArray(prev.requirements) 
              ? prev.requirements 
              : [];
            const newArray = [...currentArray];
            newArray[index] = value;
            return {
              ...prev,
              requirements: newArray
            };
          } else if (section === 'tags') {
            // Handle tags array
            if (!Array.isArray(prev[section])) {
              console.warn(`Section ${section} is not an array, initializing as empty array`);
              return { ...prev, [section]: [value] };
            }
            const newArray = [...prev[section]];
            newArray[index] = value;
            return { ...prev, [section]: newArray };
          } else {
            // Handle other array fields
            if (!Array.isArray(prev[section])) {
              console.warn(`Section ${section} is not an array, initializing as empty array`);
              return { ...prev, [section]: [value] };
            }
            const newArray = [...prev[section]];
            newArray[index] = value;
            return { ...prev, [section]: newArray };
          }
        } else if (section === 'requirements' || section === 'location' || section === 'assetDetails' || section === 'insuranceDetails' || section === 'biddingDetails') {
          // Handle nested objects
          console.log('Handling nested object:', section, field, value);
          console.log('Previous state:', prev);
          const result = {
            ...prev,
            [section]: { ...prev[section], [field]: value }
          };
          console.log('New state:', result);
          return result;
        } else if (section === '') {
          // Handle top-level fields (when section is empty string)
          return { ...prev, [field]: value };
        } else {
          // Handle simple fields (when section is the field name)
          return { ...prev, [section]: value };
        }
      });
    } catch (error) {
      console.error('Error in handleChange:', error);
      console.error('Section:', section, 'Field:', field, 'Value:', value, 'Index:', index);
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    } else if (section === 'assetDetails' && field === 'value' && errors.assetValue) {
      // Clear assetValue error when typing in asset value field
      setErrors(prev => ({ ...prev, assetValue: '' }));
    } else if (section === 'location' && field === 'city' && errors.city) {
      // Clear city error when typing in city field
      setErrors(prev => ({ ...prev, city: '' }));
    } else if (section === 'location' && field === 'country' && errors.country) {
      // Clear country error when typing in country field
      setErrors(prev => ({ ...prev, country: '' }));
    }
  };

  const addArrayItem = (section, template = '') => {
    console.log('addArrayItem called with:', { section, template });
    
    setFormData(prev => {
      const currentArray = Array.isArray(prev[section]) ? prev[section] : [];
      return {
        ...prev,
        [section]: [...currentArray, template]
      };
    });
  };

  const removeArrayItem = (section, index) => {
    console.log('removeArrayItem called with:', { section, index });
    
    setFormData(prev => {
      const currentArray = Array.isArray(prev[section]) ? prev[section] : [];
      return {
        ...prev,
        [section]: currentArray.filter((_, i) => i !== index)
      };
    });
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
    setUploadedFiles(prev => {
      if (!Array.isArray(prev)) return newFiles;
      return [...prev, ...newFiles];
    });
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => {
      if (!Array.isArray(prev)) return [];
      const newFiles = prev.filter((_, i) => i !== index);
      return newFiles;
    });
  };

  const validateForm = () => {
    console.log('validateForm called with formData:', formData);
    console.log('Asset Details:', formData.assetDetails);
    console.log('Asset Value:', formData.assetDetails?.value, 'Type:', typeof formData.assetDetails?.value);
    
    const newErrors = {};

    if (!formData.title?.trim()) newErrors.title = 'Title is required';
    if (!formData.description?.trim()) newErrors.description = 'Description is required';
    
    // Validate insurance amount
    const requestedAmount = Number(formData.insuranceDetails?.requestedAmount);
    if (!formData.insuranceDetails?.requestedAmount || isNaN(requestedAmount) || requestedAmount <= 0) {
      newErrors.requestedAmount = 'Coverage amount is required and must be greater than 0';
    }
    
    // Validate asset value
    const assetValue = Number(formData.assetDetails?.value);
    console.log('Asset value validation:', {
      rawValue: formData.assetDetails?.value,
      convertedValue: assetValue,
      isNaN: isNaN(assetValue),
      isGreaterThanZero: assetValue > 0
    });
    
    if (!formData.assetDetails?.value || isNaN(assetValue) || assetValue <= 0) {
      newErrors.assetValue = 'Asset value is required and must be greater than 0';
    }
    
    if (!formData.biddingDeadline) {
      newErrors.biddingDeadline = 'Bidding deadline is required';
    } else {
      const deadline = new Date(formData.biddingDeadline);
      const today = new Date();
      if (deadline <= today) {
        newErrors.biddingDeadline = 'Bidding deadline must be in the future';
      }
    }
    if (!formData.location?.city) newErrors.city = 'City is required';
    if (!formData.location?.country) newErrors.country = 'Country is required';

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    console.log('=== FORM SUBMIT STARTED ===');
    console.log('Event:', e);
    console.log('Event target:', e.target);
    console.log('Event type:', e.type);
    console.log('Form action:', e.target.action);
    console.log('Form method:', e.target.method);
    
    e.preventDefault(); // Prevent form from submitting normally
    
    console.log('After preventDefault');
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    console.log('Form validation passed, proceeding with submission');
    
    try {
      setIsLoading(true);
      console.log('InsuranceRequest: Creating request in mock mode');
      
      // Prepare data for submission
      const submitData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        assetDetails: {
          type: formData.assetDetails?.type || formData.category, // Fallback to category if type is missing
          name: formData.assetDetails?.name || formData.title,
          value: Number(formData.assetDetails?.value || formData.insuranceDetails?.requestedAmount || 0),
          currency: 'USD', // Default currency
          location: {
            city: formData.location?.city || '',
            state: formData.location?.state || '',
            country: formData.location?.country || '',
            address: formData.location?.address || ''
          }
        },
        insuranceDetails: {
          requestedAmount: Number(formData.insuranceDetails?.requestedAmount || 0),
          coverageType: formData.insuranceDetails?.coverageType || 'full',
          riskLevel: formData.insuranceDetails?.riskLevel || 'medium'
        },
        biddingDetails: {
          minimumBidPercentage: formData.biddingDetails?.minimumBidPercentage || 10,
          deadline: formData.biddingDeadline,
          allowPartialBids: formData.biddingDetails?.allowPartialBids || true,
          groupInsuranceAllowed: formData.biddingDetails?.groupInsuranceAllowed || false,
          minProviders: formData.biddingDetails?.minProviders || 2,
          maxProviders: formData.biddingDetails?.maxProviders || 5,
          groupDeadline: formData.biddingDetails?.groupDeadline
        },
        priority: formData.priority || 'medium',
        requirements: Array.isArray(formData.requirements) ? formData.requirements : [],
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        // Remove custom _id - let mockDataStore handle it
        updatedAt: new Date().toISOString()
      };

      console.log('Submitting data:', submitData);
      
      // Create new request via MongoDB API
      const newRequest = await apiService.createRequest({
        ...submitData,
        clientId: user._id,
        status: 'open',
        isPublic: true
      });

      console.log('New request created via MongoDB API:', newRequest);
      console.log('Request structure check:', {
        hasId: !!newRequest._id,
        hasTitle: !!newRequest.title,
        hasStatus: !!newRequest.status,
        hasClientId: !!newRequest.clientId,
        hasAssetDetails: !!newRequest.assetDetails,
        hasInsuranceDetails: !!newRequest.insuranceDetails
      });
      
      toast.success('Insurance request created successfully!');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create insurance request. Please try again.');
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {requestId && requestId !== 'new' ? 'Edit Insurance Request' : 'Create Insurance Request'}
          </h1>
          <p className="text-gray-600 mt-2">
            {requestId && requestId !== 'new' ? 'Update your insurance request details' : 'Describe what you need insured and let providers bid on your request'}
          </p>
        </div>

        <form onSubmit={handleSubmit} method="post" className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request Title *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleChange('', 'title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Commercial Property Insurance"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category || 'business'}
                  onChange={(e) => handleChange('', 'category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  rows={4}
                  value={formData.description || ''}
                  onChange={(e) => handleChange('', 'description', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe what you need insured, any specific requirements, and additional details..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
            </div>
          </div>

          {/* Coverage Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Coverage Details
              </h2>
              <button
                type="button"
                onClick={() => {
                  console.log('=== DEBUG COVERAGE DETAILS ===');
                  console.log('Insurance Details:', formData.insuranceDetails);
                  console.log('Requested Amount:', formData.insuranceDetails?.requestedAmount, 'Type:', typeof formData.insuranceDetails?.requestedAmount);
                  console.log('Errors:', errors);
                  console.log('Validation Test:', {
                    hasValue: !!formData.insuranceDetails?.requestedAmount,
                    isNumber: typeof formData.insuranceDetails?.requestedAmount === 'number',
                    isGreaterThanZero: Number(formData.insuranceDetails?.requestedAmount) > 0,
                    convertedValue: Number(formData.insuranceDetails?.requestedAmount)
                  });
                }}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                Debug
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coverage Amount *
                </label>
                <input
                  type="number"
                  value={formData.insuranceDetails?.requestedAmount || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('Coverage amount input change:', { value, type: typeof value });
                    
                    // Handle empty string case
                    if (value === '') {
                      handleChange('insuranceDetails', 'requestedAmount', '');
                      return;
                    }
                    
                    // Convert to number and validate
                    const numValue = Number(value);
                    console.log('Converted coverage amount:', { numValue, isNaN: isNaN(numValue) });
                    
                    if (!isNaN(numValue) && numValue > 0) {
                      handleChange('insuranceDetails', 'requestedAmount', numValue);
                      // Clear error if validation passes
                      if (errors.requestedAmount) {
                        setErrors(prev => ({ ...prev, requestedAmount: '' }));
                      }
                    } else {
                      // Set error for invalid input
                      setErrors(prev => ({ ...prev, requestedAmount: 'Please enter a valid number greater than 0' }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.requestedAmount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 1000000"
                  min="0"
                  step="1000"
                />
                {errors.requestedAmount && <p className="mt-1 text-sm text-red-600">{errors.requestedAmount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coverage Type *
                </label>
                <select
                  value={formData.insuranceDetails?.coverageType || 'full'}
                  onChange={(e) => handleChange('insuranceDetails', 'coverageType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full">Full Coverage</option>
                  <option value="partial">Partial Coverage</option>
                  <option value="group">Group Coverage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency || 'USD'}
                  onChange={(e) => handleChange('', 'currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Level
                </label>
                <select
                  value={formData.insuranceDetails?.riskLevel || 'medium'}
                  onChange={(e) => handleChange('insuranceDetails', 'riskLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="very-high">Very High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (months)
                </label>
                <input
                  type="number"
                  value={formData.duration || 12}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Convert to number only if there's a value, otherwise use default
                    const numValue = value === '' ? 12 : Number(value);
                    handleChange('', 'duration', numValue);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="60"
                />
              </div>
            </div>
          </div>

          {/* Asset Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Building className="h-5 w-5 mr-2 text-blue-600" />
                Asset Details
              </h2>
              <button
                type="button"
                onClick={() => {
                  console.log('=== DEBUG ASSET DETAILS ===');
                  console.log('Form Data:', formData);
                  console.log('Asset Details:', formData.assetDetails);
                  console.log('Asset Value:', formData.assetDetails?.value, 'Type:', typeof formData.assetDetails?.value);
                  console.log('Errors:', errors);
                  console.log('Validation Test:', {
                    hasValue: !!formData.assetDetails?.value,
                    isNumber: typeof formData.assetDetails?.value === 'number',
                    isGreaterThanZero: Number(formData.assetDetails?.value) > 0,
                    convertedValue: Number(formData.assetDetails?.value)
                  });
                }}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                Debug
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Type
                </label>
                <select
                  value={formData.assetDetails?.type || 'property'}
                  onChange={(e) => handleChange('assetDetails', 'type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="property">Property</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="business">Business</option>
                  <option value="health">Health</option>
                  <option value="life">Life</option>
                  <option value="liability">Liability</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Name
                </label>
                <input
                  type="text"
                  value={formData.assetDetails?.name || ''}
                  onChange={(e) => handleChange('assetDetails', 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Office Building, Warehouse, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Value *
                </label>
                <input
                  type="number"
                  value={formData.assetDetails?.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('Asset value input change:', { value, type: typeof value });
                    
                    // Handle empty string case
                    if (value === '') {
                      handleChange('assetDetails', 'value', '');
                      return;
                    }
                    
                    // Convert to number and validate
                    const numValue = Number(value);
                    console.log('Converted asset value:', { numValue, isNaN: isNaN(numValue) });
                    
                    if (!isNaN(numValue) && numValue > 0) {
                      handleChange('assetDetails', 'value', numValue);
                      // Clear error if validation passes
                      if (errors.assetValue) {
                        setErrors(prev => ({ ...prev, assetValue: '' }));
                      }
                    } else {
                      // Set error for invalid input
                      setErrors(prev => ({ ...prev, assetValue: 'Please enter a valid number greater than 0' }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.assetValue ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 2000000"
                  min="0"
                  step="1000"
                />
                {errors.assetValue && <p className="mt-1 text-sm text-red-600">{errors.assetValue}</p>}
              </div>
            </div>
          </div>

          {/* Bidding Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
              Bidding Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Bid Percentage
                </label>
                <input
                  type="number"
                  value={formData.biddingDetails?.minimumBidPercentage || 10}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Convert to number only if there's a value, otherwise use default
                    const numValue = value === '' ? 10 : Number(value);
                    handleChange('biddingDetails', 'minimumBidPercentage', numValue);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="100"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum percentage of coverage providers must offer</p>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.biddingDetails?.allowPartialBids || false}
                    onChange={(e) => handleChange('biddingDetails', 'allowPartialBids', e.target.checked)}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Allow Partial Bids</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.biddingDetails?.groupInsuranceAllowed || false}
                    onChange={(e) => handleChange('biddingDetails', 'groupInsuranceAllowed', e.target.checked)}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Group Insurance Allowed</span>
                </label>
              </div>
            </div>
          </div>

          {/* Group Insurance Configuration */}
          {formData.biddingDetails.groupInsuranceAllowed && (
            <div className="space-y-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-blue-900">Group Insurance Configuration</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    Minimum Providers Required
                  </label>
                  <input
                    type="number"
                    name="biddingDetails.minProviders"
                    value={formData.biddingDetails.minProviders || 2}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string or valid numbers greater than 2
                      if (value === '' || (parseInt(value) > 2 && parseInt(value) <= 10)) {
                        handleChange('biddingDetails', 'minProviders', value === '' ? 2 : parseInt(value));
                      }
                    }}
                    onKeyDown={(e) => {
                      // Allow backspace, delete, arrow keys, and numbers
                      if (e.key === 'Backspace' || e.key === 'Delete' || 
                          e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
                          /[0-9]/.test(e.key) || e.key === 'Tab') {
                        return;
                      }
                      e.preventDefault();
                    }}
                    min="2"
                    max="10"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="2"
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    Minimum number of providers needed to form a group (2 or more)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    Maximum Providers Allowed
                  </label>
                  <input
                    type="number"
                    name="biddingDetails.maxProviders"
                    value={formData.biddingDetails.maxProviders || 5}
                    onChange={(e) => {
                      const value = e.target.value;
                      const minProviders = formData.biddingDetails.minProviders || 2;
                      // Allow empty string or valid numbers greater than minProviders
                      if (value === '' || (parseInt(value) > minProviders && parseInt(value) <= 15)) {
                        handleChange('biddingDetails', 'maxProviders', value === '' ? (minProviders + 1) : parseInt(value));
                      }
                    }}
                    onKeyDown={(e) => {
                      // Allow backspace, delete, arrow keys, and numbers
                      if (e.key === 'Backspace' || e.key === 'Delete' || 
                          e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
                          /[0-9]/.test(e.key) || e.key === 'Tab') {
                        return;
                      }
                      e.preventDefault();
                    }}
                    min={Math.max(2, (formData.biddingDetails.minProviders || 2) + 1)}
                    max="15"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="5"
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    Maximum number of providers that can participate (must be greater than minimum)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Group Formation Deadline
                </label>
                <input
                  type="datetime-local"
                  name="biddingDetails.groupDeadline"
                  value={formData.biddingDetails.groupDeadline || ''}
                  onChange={(e) => handleChange('biddingDetails', 'groupDeadline', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <p className="text-xs text-blue-600 mt-1">
                  Extended deadline for providers to form a group (after bidding deadline)
                </p>
              </div>

              <div className="bg-blue-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-200 rounded">
                    <Shield className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Group Insurance Benefits</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Multiple providers can collaborate on large coverage amounts</li>
                      <li>• Risk is distributed across multiple insurance companies</li>
                      <li>• Often results in better pricing and terms</li>
                      <li>• Faster coverage for high-value insurance needs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline & Priority */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Timeline & Priority
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => handleChange('', 'startDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bidding Deadline *
                </label>
                <input
                  type="date"
                  value={formData.biddingDeadline || ''}
                  onChange={(e) => handleChange('', 'biddingDeadline', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.biddingDeadline ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.biddingDeadline && <p className="mt-1 text-sm text-red-600">{errors.biddingDeadline}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  value={formData.priority || 'medium'}
                  onChange={(e) => handleChange('', 'priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {priorities.map(priority => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-red-600" />
              Location
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.location?.city || ''}
                  onChange={(e) => handleChange('location', 'city', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.city ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., New York"
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  value={formData.location?.state || ''}
                  onChange={(e) => handleChange('location', 'state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., NY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <input
                  type="text"
                  value={formData.location?.country || ''}
                  onChange={(e) => handleChange('location', 'country', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.country ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., United States"
                />
                {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP/Postal Code
                </label>
                <input
                  type="text"
                  value={formData.location?.zipCode || ''}
                  onChange={(e) => handleChange('location', 'zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 10001"
                />
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Requirements & Preferences
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory
                </label>
                <input
                  type="text"
                  value={formData.subcategory || ''}
                  onChange={(e) => handleChange('', 'subcategory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Warehouse, Office Building, etc."
                />
              </div>
            </div>

            {/* Special Requirements */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requirements
              </label>
              {Array.isArray(formData.requirements) && formData.requirements.map((req, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => handleChange('requirements', null, e.target.value, index)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 24/7 claims support, specific coverage exclusions"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('requirements', index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('requirements', '')}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Requirement
              </button>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-indigo-600" />
              Documents & Attachments
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
            {Array.isArray(uploadedFiles) && uploadedFiles.length > 0 && (
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

          {/* Tags */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Tags & Keywords
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (help providers find your request)
              </label>
              {Array.isArray(formData.tags) && formData.tags.map((tag, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => handleChange('tags', null, e.target.value, index)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., commercial, property, warehouse, fire-protection"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('tags', index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('tags', '')}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Tag
              </button>
            </div>
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
              onClick={() => console.log('Submit button clicked!')}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {requestId && requestId !== 'new' ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {requestId && requestId !== 'new' ? 'Update Request' : 'Create Request'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InsuranceRequest;

