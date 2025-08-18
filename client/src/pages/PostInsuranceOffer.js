import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { 
  Shield, 
  DollarSign, 
  Calendar, 
  MapPin, 
  FileText, 
  Star,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

const PostInsuranceOffer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'health',
    subcategory: '',
    coverageDetails: {
      minAmount: '',
      maxAmount: '',
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
    features: [{ name: '', description: '', included: true }],
    highlights: [''],
    tags: [''],
    isPublic: false
  });

  // Redirect if not a provider
  if (!user || user.role !== 'provider') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Only insurance providers can post insurance offers.</p>
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
      } else if (section === 'coverageDetails' || section === 'terms' || section === 'pricing' || section === 'eligibility') {
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
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addArrayItem = (section, template = {}) => {
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.coverageDetails.minAmount) newErrors.minAmount = 'Minimum coverage amount is required';
    if (!formData.coverageDetails.maxAmount) newErrors.maxAmount = 'Maximum coverage amount is required';
    if (!formData.pricing.basePremium) newErrors.basePremium = 'Base premium is required';

    if (Number(formData.coverageDetails.minAmount) >= Number(formData.coverageDetails.maxAmount)) {
      newErrors.maxAmount = 'Maximum amount must be greater than minimum amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      console.log('PostInsuranceOffer: Creating offer with data:', formData);
      
      // Prepare the offer data for the backend
      const offerData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory || '',
        coverageDetails: {
          minAmount: Number(formData.coverageDetails.minAmount),
          maxAmount: Number(formData.coverageDetails.maxAmount),
          currency: formData.coverageDetails.currency,
          deductible: formData.coverageDetails.deductible ? Number(formData.coverageDetails.deductible) : 0,
          coPay: formData.coverageDetails.coPay ? Number(formData.coverageDetails.coPay) : 0,
          maxOutOfPocket: formData.coverageDetails.maxOutOfPocket ? Number(formData.coverageDetails.maxOutOfPocket) : 0
        },
        terms: {
          duration: formData.terms.duration,
          waitingPeriod: formData.terms.waitingPeriod || '',
          exclusions: formData.terms.exclusions.filter(exclusion => exclusion.trim()),
          inclusions: formData.terms.inclusions.filter(inclusion => inclusion.trim()),
          specialConditions: formData.terms.specialConditions.filter(condition => condition.trim())
        },
        pricing: {
          basePremium: Number(formData.pricing.basePremium),
          currency: formData.pricing.currency,
          paymentFrequency: formData.pricing.paymentFrequency
        },
        eligibility: {
          minAge: formData.eligibility.minAge ? Number(formData.eligibility.minAge) : 0,
          maxAge: formData.eligibility.maxAge ? Number(formData.eligibility.maxAge) : 100,
          locations: formData.eligibility.locations.filter(loc => loc.trim()),
          preExistingConditions: formData.eligibility.preExistingConditions,
          healthRequirements: formData.eligibility.healthRequirements.filter(req => req.trim()),
          occupationRestrictions: formData.eligibility.occupationRestrictions.filter(occ => occ.trim())
        },
        features: formData.features.filter(feature => feature.name.trim() && feature.description.trim()),
        highlights: formData.highlights.filter(highlight => highlight.trim()),
        tags: formData.tags.filter(tag => tag.trim()),
        isPublic: true,
        status: 'active'
      };

      // Post the offer to the backend
      const result = await apiService.createOffer(offerData);
      
      if (result.message) {
        toast.success('Insurance offer created successfully!');
        navigate('/dashboard');
      } else {
        throw new Error('Failed to create offer');
      }
      
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(error.message || 'Failed to create insurance offer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Post Insurance Offer</h1>
          <p className="text-gray-600 mt-2">Create a new insurance offer for potential clients</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
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
                  placeholder="e.g., Comprehensive Health Insurance Plan"
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
                  <option value="pet">Pet Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
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
                  placeholder="Describe your insurance offer in detail..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
            </div>
          </div>

          {/* Coverage Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Coverage Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Coverage Amount *
                </label>
                <input
                  type="number"
                  value={formData.coverageDetails.minAmount}
                  onChange={(e) => handleChange('coverageDetails', 'minAmount', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.minAmount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="10000"
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
                  onChange={(e) => handleChange('coverageDetails', 'maxAmount', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.maxAmount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="1000000"
                />
                {errors.maxAmount && <p className="mt-1 text-sm text-red-600">{errors.maxAmount}</p>}
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

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Pricing
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Premium *
                </label>
                <input
                  type="number"
                  value={formData.pricing.basePremium}
                  onChange={(e) => handleChange('pricing', 'basePremium', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.basePremium ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="100"
                />
                {errors.basePremium && <p className="mt-1 text-sm text-red-600">{errors.basePremium}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Frequency
                </label>
                <select
                  value={formData.pricing.paymentFrequency}
                  onChange={(e) => handleChange('pricing', 'paymentFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi-annually">Semi-Annually</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.pricing.currency}
                  onChange={(e) => handleChange('pricing', 'currency', e.target.value)}
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

          {/* Terms */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Terms & Conditions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <select
                  value={formData.terms.duration}
                  onChange={(e) => handleChange('terms', 'duration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="6 months">6 months</option>
                  <option value="1 year">1 year</option>
                  <option value="2 years">2 years</option>
                  <option value="5 years">5 years</option>
                  <option value="10 years">10 years</option>
                  <option value="Lifetime">Lifetime</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waiting Period
                </label>
                <input
                  type="text"
                  value={formData.terms.waitingPeriod}
                  onChange={(e) => handleChange('terms', 'waitingPeriod', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 30 days, 90 days"
                />
              </div>
            </div>

            {/* Features */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features
              </label>
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={feature.name}
                    onChange={(e) => handleChange('features', 'name', e.target.value, index)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Feature name"
                  />
                  <input
                    type="text"
                    value={feature.description}
                    onChange={(e) => handleChange('features', 'description', e.target.value, index)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('features', index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('features', { name: '', description: '', included: true })}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Feature
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
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Offer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostInsuranceOffer;



