import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Shield,
  Building,
  User,
  CreditCard,
  FileImage,
  MapPin,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const KYCVerification = () => {
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState('pending');
  const [documents, setDocuments] = useState({
    businessLicense: null,
    identityDocument: null,
    addressProof: null,
    financialStatement: null
  });
  const [uploadProgress, setUploadProgress] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationTime, setVerificationTime] = useState(null);

  useEffect(() => {
    if (user) {
      fetchKYCStatus();
    }
  }, [user]);

  const fetchKYCStatus = async () => {
    try {
      const response = await apiService.getKYCStatus();
      if (response && response.kycStatus) {
        setKycStatus(response.kycStatus);
        if (response.verificationTime) {
          setVerificationTime(new Date(response.verificationTime));
        }
      }
    } catch (error) {
      console.error('Error fetching KYC status:', error);
    }
  };

  const handleFileChange = (documentType, file) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload PDF, JPEG, or PNG files only');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setDocuments(prev => ({
        ...prev,
        [documentType]: file
      }));
      
      toast.success(`${documentType.replace(/([A-Z])/g, ' $1').trim()} uploaded successfully`);
    }
  };

  const handleSubmit = async () => {
    // Check if all required documents are uploaded
    const requiredDocs = ['businessLicense', 'identityDocument', 'addressProof'];
    const missingDocs = requiredDocs.filter(doc => !documents[doc]);
    
    if (missingDocs.length > 0) {
      toast.error(`Please upload: ${missingDocs.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('🔐 KYC Frontend: Starting submission...');
      console.log('🔐 KYC Frontend: Documents to submit:', Object.keys(documents).filter(key => documents[key]));
      console.log('🔐 KYC Frontend: Auth token present:', !!apiService.getAuthToken());
      
      const formData = new FormData();
      Object.keys(documents).forEach(key => {
        if (documents[key]) {
          formData.append(key, documents[key]);
          console.log('🔐 KYC Frontend: Added document:', key, documents[key].name);
        }
      });

      console.log('🔐 KYC Frontend: FormData created, submitting...');
      const response = await apiService.submitKYC(formData);
      
      if (response && response.success) {
        toast.success('KYC documents submitted successfully! Verification in progress...');
        setKycStatus('submitted');
        
        // Simulate verification process (1 minute)
        setTimeout(() => {
          setKycStatus('verified');
          setVerificationTime(new Date());
          toast.success('🎉 KYC verification successful! You are now verified.');
        }, 60000); // 1 minute
      }
    } catch (error) {
      console.error('Error submitting KYC:', error);
      toast.error('Failed to submit KYC documents. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = () => {
    switch (kycStatus) {
      case 'verified':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'submitted':
        return <Clock className="h-8 w-8 text-yellow-500" />;
      case 'rejected':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Clock className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (kycStatus) {
      case 'verified':
        return 'KYC Verified';
      case 'submitted':
        return 'Verification in Progress';
      case 'rejected':
        return 'KYC Rejected';
      default:
        return 'KYC Pending';
    }
  };

  const getStatusColor = () => {
    switch (kycStatus) {
      case 'verified':
        return 'text-green-600 bg-green-100';
      case 'submitted':
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (user?.role !== 'provider') {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-500">KYC verification is only available for insurance providers.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">KYC Verification</h1>
        <p className="text-gray-600">Complete your verification to build trust with clients</p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-medium text-gray-900">{getStatusText()}</h3>
              <p className="text-gray-500">
                {kycStatus === 'verified' 
                  ? 'Your account is verified and visible to clients'
                  : kycStatus === 'submitted'
                  ? 'Your documents are being reviewed'
                  : 'Please upload required documents to get verified'
                }
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {kycStatus.toUpperCase()}
          </span>
        </div>
        
        {verificationTime && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-700">
                Verified on {verificationTime.toLocaleDateString()} at {verificationTime.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Document Upload Section */}
      {kycStatus !== 'verified' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload KYC Documents</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business License */}
                         <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-700">
                 <Building className="h-4 w-4 inline mr-2" />
                 Business License *
               </label>
               <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                 {documents.businessLicense ? (
                   <div className="space-y-2">
                     <FileText className="h-8 w-8 text-blue-500 mx-auto" />
                     <p className="text-sm text-gray-600">{documents.businessLicense.name}</p>
                     <button
                       onClick={() => setDocuments(prev => ({ ...prev, businessLicense: null }))}
                       className="text-xs text-red-600 hover:text-red-800 underline"
                     >
                       Remove
                     </button>
                   </div>
                 ) : (
                   <div>
                     <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                     <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                     <p className="text-xs text-gray-500">PDF, JPEG, PNG (max 5MB)</p>
                   </div>
                 )}
                 <input
                   type="file"
                   accept=".pdf,.jpg,.jpeg,.png"
                   onChange={(e) => handleFileChange('businessLicense', e.target.files[0])}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
               </div>
             </div>

            {/* Identity Document */}
                         <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-700">
                 <User className="h-4 w-4 inline mr-2" />
                 Identity Document *
               </label>
               <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                 {documents.identityDocument ? (
                   <div className="space-y-2">
                     <FileImage className="h-8 w-8 text-blue-500 mx-auto" />
                     <p className="text-sm text-gray-600">{documents.identityDocument.name}</p>
                     <button
                       onClick={() => setDocuments(prev => ({ ...prev, identityDocument: null }))}
                       className="text-xs text-red-600 hover:text-red-800 underline"
                     >
                       Remove
                     </button>
                   </div>
                 ) : (
                   <div>
                     <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                     <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                     <p className="text-xs text-gray-500">PDF, JPEG, PNG (max 5MB)</p>
                   </div>
                 )}
                 <input
                   type="file"
                   accept=".pdf,.jpg,.jpeg,.png"
                   onChange={(e) => handleFileChange('identityDocument', e.target.files[0])}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
               </div>
             </div>

            {/* Address Proof */}
                         <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-700">
                 <MapPin className="h-4 w-4 inline mr-2" />
                 Address Proof *
               </label>
               <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                 {documents.addressProof ? (
                   <div className="space-y-2">
                     <FileText className="h-8 w-8 text-blue-500 mx-auto" />
                     <p className="text-sm text-gray-600">{documents.addressProof.name}</p>
                     <button
                       onClick={() => setDocuments(prev => ({ ...prev, addressProof: null }))}
                       className="text-xs text-red-600 hover:text-red-800 underline"
                     >
                       Remove
                     </button>
                   </div>
                 ) : (
                   <div>
                     <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                     <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                     <p className="text-xs text-gray-500">PDF, JPEG, PNG (max 5MB)</p>
                   </div>
                 )}
                 <input
                   type="file"
                   accept=".pdf,.jpg,.jpeg,.png"
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                   onChange={(e) => handleFileChange('addressProof', e.target.files[0])}
                 />
               </div>
             </div>

            {/* Financial Statement (Optional) */}
                         <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-700">
                 <CreditCard className="h-4 w-4 inline mr-2" />
                 Financial Statement (Optional)
               </label>
               <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                 {documents.financialStatement ? (
                   <div className="space-y-2">
                     <FileText className="h-8 w-8 text-blue-500 mx-auto" />
                     <p className="text-sm text-gray-600">{documents.financialStatement.name}</p>
                     <button
                       onClick={() => setDocuments(prev => ({ ...prev, financialStatement: null }))}
                       className="text-xs text-red-600 hover:text-red-800 underline"
                     >
                       Remove
                     </button>
                   </div>
                 ) : (
                   <div>
                     <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                     <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                     <p className="text-xs text-gray-500">PDF, JPEG, PNG (max 5MB)</p>
                   </div>
                 )}
                 <input
                   type="file"
                   accept=".pdf,.jpg,.jpeg,.png"
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                   onChange={(e) => handleFileChange('financialStatement', e.target.files[0])}
                 />
               </div>
             </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 text-center">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || kycStatus === 'verified'}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit KYC Documents'}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Important Information:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Required documents: Business License, Identity Document, Address Proof</li>
                  <li>• File formats: PDF, JPEG, PNG (max 5MB each)</li>
                  <li>• Verification process takes approximately 1 minute</li>
                  <li>• Verified providers are marked with a verification badge</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Benefits */}
      {kycStatus === 'verified' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Verification Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-medium text-green-900">Trust Badge</h3>
              <p className="text-sm text-green-700">Clients see you're verified</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Building className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-medium text-blue-900">Business Credibility</h3>
              <p className="text-sm text-blue-700">Enhanced professional image</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <User className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-medium text-purple-900">Client Confidence</h3>
              <p className="text-sm text-purple-700">Higher trust from potential clients</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCVerification;
