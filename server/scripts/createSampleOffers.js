const mongoose = require('mongoose');
const InsuranceOffer = require('../models/InsuranceOffer.model');
const User = require('../models/User.model');
require('dotenv').config({ path: './server.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const createSampleOffers = async () => {
  try {
    console.log('🚀 Starting to create sample insurance offers...');

    // Find provider users
    const providerUsers = await User.find({ role: 'provider' });
    
    if (providerUsers.length === 0) {
      console.log('❌ No provider users found. Please create provider accounts first.');
      return;
    }

    console.log('👥 Found provider users:', providerUsers.length);

    // Sample insurance offers
    const sampleOffers = [
      {
        providerId: providerUsers[0]._id,
        title: 'Comprehensive Health Insurance Plan',
        description: 'Complete health coverage including doctor visits, hospital stays, prescription drugs, and preventive care. Perfect for individuals and families seeking comprehensive health protection.',
        category: 'health',
        subcategory: 'comprehensive',
        coverageDetails: {
          minAmount: 10000,
          maxAmount: 1000000,
          currency: 'USD',
          deductible: 500,
          coPay: 25,
          maxOutOfPocket: 5000
        },
        terms: {
          duration: '1 year',
          waitingPeriod: '30 days for pre-existing conditions',
          exclusions: ['Cosmetic surgery', 'Experimental treatments'],
          inclusions: ['Preventive care', 'Mental health services', 'Maternity care'],
          specialConditions: ['Annual wellness check included']
        },
        pricing: {
          basePremium: 299,
          currency: 'USD',
          paymentFrequency: 'monthly'
        },
        eligibility: {
          minAge: 18,
          maxAge: 65,
          locations: ['New York', 'California', 'Texas', 'Florida'],
          preExistingConditions: true,
          healthRequirements: ['No recent major surgeries'],
          occupationRestrictions: []
        },
        features: [
          { name: 'Telemedicine', description: '24/7 virtual doctor consultations', included: true },
          { name: 'Prescription Coverage', description: 'Generic and brand name medications', included: true },
          { name: 'Dental Coverage', description: 'Basic dental procedures included', included: false }
        ],
        highlights: [
          'No waiting period for accidents',
          'Network of 500+ hospitals',
          '24/7 customer support',
          'Mobile app for claims'
        ],
        tags: ['health', 'comprehensive', 'family', 'preventive'],
        isPublic: true,
        status: 'active'
      },
      {
        providerId: providerUsers[0]._id,
        title: 'Premium Auto Insurance Package',
        description: 'Full coverage auto insurance with roadside assistance, rental car coverage, and accident forgiveness. Ideal for drivers who want maximum protection on the road.',
        category: 'auto',
        subcategory: 'full-coverage',
        coverageDetails: {
          minAmount: 25000,
          maxAmount: 500000,
          currency: 'USD',
          deductible: 250,
          coPay: 0,
          maxOutOfPocket: 1000
        },
        terms: {
          duration: '6 months',
          waitingPeriod: 'Immediate coverage',
          exclusions: ['Racing', 'Commercial use'],
          inclusions: ['Liability', 'Collision', 'Comprehensive', 'Uninsured motorist'],
          specialConditions: ['Accident forgiveness after 3 years']
        },
        pricing: {
          basePremium: 89,
          currency: 'USD',
          paymentFrequency: 'monthly'
        },
        eligibility: {
          minAge: 16,
          maxAge: 85,
          locations: ['All US states'],
          preExistingConditions: false,
          healthRequirements: ['Valid driver license'],
          occupationRestrictions: []
        },
        features: [
          { name: 'Roadside Assistance', description: '24/7 towing and emergency services', included: true },
          { name: 'Rental Car Coverage', description: 'Up to $50/day for rental car', included: true },
          { name: 'Gap Insurance', description: 'Covers difference between car value and loan', included: false }
        ],
        highlights: [
          'Accident forgiveness program',
          'New car replacement',
          'Diminished value protection',
          'Mobile app for claims'
        ],
        tags: ['auto', 'full-coverage', 'roadside-assistance', 'accident-forgiveness'],
        isPublic: true,
        status: 'active'
      },
      {
        providerId: providerUsers[0]._id,
        title: 'Term Life Insurance Policy',
        description: 'Affordable term life insurance providing financial security for your family. Choose from 10, 20, or 30-year terms with guaranteed level premiums.',
        category: 'life',
        subcategory: 'term',
        coverageDetails: {
          minAmount: 50000,
          maxAmount: 2000000,
          currency: 'USD',
          deductible: 0,
          coPay: 0,
          maxOutOfPocket: 0
        },
        terms: {
          duration: '20 years',
          waitingPeriod: '2 years for suicide',
          exclusions: ['Suicide within 2 years', 'War zones'],
          inclusions: ['Death benefit', 'Accidental death benefit'],
          specialConditions: ['Convertible to permanent policy']
        },
        pricing: {
          basePremium: 45,
          currency: 'USD',
          paymentFrequency: 'monthly'
        },
        eligibility: {
          minAge: 18,
          maxAge: 60,
          locations: ['All US states'],
          preExistingConditions: false,
          healthRequirements: ['Medical exam required'],
          occupationRestrictions: ['No high-risk occupations']
        },
        features: [
          { name: 'Death Benefit', description: 'Tax-free payout to beneficiaries', included: true },
          { name: 'Accidental Death', description: 'Double benefit for accidental death', included: true },
          { name: 'Living Benefits', description: 'Early access for terminal illness', included: false }
        ],
        highlights: [
          'Guaranteed level premiums',
          'Convertible to permanent policy',
          'No medical exam for small amounts',
          'Fast online application'
        ],
        tags: ['life', 'term', 'affordable', 'family-protection'],
        isPublic: true,
        status: 'active'
      },
      {
        providerId: providerUsers[0]._id,
        title: 'Homeowners Insurance Plus',
        description: 'Comprehensive home insurance covering structure, personal property, liability, and additional living expenses. Protection for your most valuable asset.',
        category: 'property',
        subcategory: 'homeowners',
        coverageDetails: {
          minAmount: 100000,
          maxAmount: 5000000,
          currency: 'USD',
          deductible: 1000,
          coPay: 0,
          maxOutOfPocket: 5000
        },
        terms: {
          duration: '1 year',
          waitingPeriod: 'Immediate coverage',
          exclusions: ['Flood damage', 'Earthquake damage'],
          inclusions: ['Dwelling coverage', 'Personal property', 'Liability protection'],
          specialConditions: ['Replacement cost for dwelling']
        },
        pricing: {
          basePremium: 120,
          currency: 'USD',
          paymentFrequency: 'monthly'
        },
        eligibility: {
          minAge: 18,
          maxAge: 100,
          locations: ['All US states except flood zones'],
          preExistingConditions: false,
          healthRequirements: [],
          occupationRestrictions: []
        },
        features: [
          { name: 'Dwelling Coverage', description: 'Covers structure and attached structures', included: true },
          { name: 'Personal Property', description: 'Covers belongings up to policy limit', included: true },
          { name: 'Liability Protection', description: 'Covers legal expenses and damages', included: true }
        ],
        highlights: [
          'Replacement cost coverage',
          'Identity theft protection',
          'Equipment breakdown coverage',
          '24/7 claims service'
        ],
        tags: ['property', 'homeowners', 'comprehensive', 'liability'],
        isPublic: true,
        status: 'active'
      }
    ];

    // Clear existing sample offers (optional)
    await InsuranceOffer.deleteMany({ providerId: { $in: providerUsers.map(u => u._id) } });
    console.log('🗑️ Cleared existing offers for these providers');

    // Insert sample offers
    const createdOffers = await InsuranceOffer.insertMany(sampleOffers);
    console.log('✅ Created', createdOffers.length, 'sample insurance offers');

    // Display created offers
    createdOffers.forEach((offer, index) => {
      console.log(`📋 Offer ${index + 1}:`, {
        id: offer._id,
        title: offer.title,
        category: offer.category,
        premium: `$${offer.pricing.basePremium}/month`,
        coverage: `$${offer.coverageDetails.minAmount.toLocaleString()} - $${offer.coverageDetails.maxAmount.toLocaleString()}`,
        status: offer.status
      });
    });

    console.log('🎉 Sample insurance offers creation completed successfully!');
    console.log('💡 Now clients can browse and accept these offers in the marketplace');

  } catch (error) {
    console.error('❌ Error creating sample offers:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

// Run the script
createSampleOffers();
