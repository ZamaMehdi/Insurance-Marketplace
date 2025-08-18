const mongoose = require('mongoose');
const InsuranceRequest = require('../models/InsuranceRequest.model');
const User = require('../models/User.model');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const createSampleData = async () => {
  try {
    console.log('🚀 Starting to create sample data...');

    // Find a client user (you can modify this to use a specific email)
    const clientUser = await User.findOne({ role: 'client' });
    
    if (!clientUser) {
      console.log('❌ No client user found. Please create a client account first.');
      return;
    }

    console.log('👤 Found client user:', clientUser.email);

    // Create sample insurance requests
    const sampleRequests = [
      {
        clientId: clientUser._id,
        title: 'Commercial Property Insurance',
        description: 'Need comprehensive coverage for office building in downtown area',
        category: 'property',
        assetDetails: {
          type: 'property',
          name: 'Office Building',
          value: 2500000,
          currency: 'USD',
          location: {
            address: '123 Business Ave',
            city: 'New York',
            state: 'NY',
            country: 'USA'
          }
        },
        insuranceDetails: {
          requestedAmount: 2000000,
          currency: 'USD',
          coverageType: 'full',
          riskLevel: 'medium'
        },
        biddingDetails: {
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          minimumBidPercentage: 10,
          allowPartialBids: true,
          groupInsuranceAllowed: false
        },
        status: 'open',
        isPublic: true,
        tags: ['commercial', 'property', 'office'],
        priority: 'high'
      },
      {
        clientId: clientUser._id,
        title: 'Fleet Auto Insurance',
        description: 'Insurance coverage for company fleet of 25 vehicles',
        category: 'auto',
        assetDetails: {
          type: 'vehicle',
          name: 'Company Fleet',
          value: 1500000,
          currency: 'USD',
          location: {
            address: '456 Fleet Street',
            city: 'Los Angeles',
            state: 'CA',
            country: 'USA'
          }
        },
        insuranceDetails: {
          requestedAmount: 1200000,
          currency: 'USD',
          coverageType: 'full',
          riskLevel: 'medium'
        },
        biddingDetails: {
          deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
          minimumBidPercentage: 15,
          allowPartialBids: true,
          groupInsuranceAllowed: true
        },
        status: 'open',
        isPublic: true,
        tags: ['fleet', 'auto', 'commercial'],
        priority: 'medium'
      },
      {
        clientId: clientUser._id,
        title: 'Employee Health Benefits',
        description: 'Group health insurance for 150 employees with family coverage options',
        category: 'health',
        assetDetails: {
          type: 'health',
          name: 'Employee Health Plan',
          value: 5000000,
          currency: 'USD',
          location: {
            address: '789 Health Plaza',
            city: 'Chicago',
            state: 'IL',
            country: 'USA'
          }
        },
        insuranceDetails: {
          requestedAmount: 4000000,
          currency: 'USD',
          coverageType: 'group',
          riskLevel: 'low'
        },
        biddingDetails: {
          deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
          minimumBidPercentage: 20,
          allowPartialBids: true,
          groupInsuranceAllowed: true
        },
        status: 'open',
        isPublic: true,
        tags: ['health', 'group', 'employees'],
        priority: 'high'
      }
    ];

    // Clear existing sample data (optional)
    await InsuranceRequest.deleteMany({ clientId: clientUser._id });
    console.log('🗑️ Cleared existing requests for this client');

    // Insert sample requests
    const createdRequests = await InsuranceRequest.insertMany(sampleRequests);
    console.log('✅ Created', createdRequests.length, 'sample insurance requests');

    // Display created requests
    createdRequests.forEach((request, index) => {
      console.log(`📋 Request ${index + 1}:`, {
        id: request._id,
        title: request.title,
        category: request.category,
        amount: `$${request.insuranceDetails.requestedAmount.toLocaleString()}`,
        status: request.status
      });
    });

    console.log('🎉 Sample data creation completed successfully!');
    console.log('💡 Now go to your app and check "My Insurance Requests"');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

// Run the script
createSampleData();
