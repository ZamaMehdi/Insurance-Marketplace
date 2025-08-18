# Insurance Marketplace Platform

A comprehensive, real-time insurance marketplace platform built with the MERN stack (MongoDB, Express.js, React, Node.js) featuring Socket.io for real-time communication.

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization** - JWT-based authentication with role-based access control
- **Real-time Marketplace** - Live updates, notifications, and real-time communication
- **Insurance Provider Management** - KYC verification, profiles, and ratings
- **Bidding System** - Flexible bidding for insurance requests
- **Payment Integration** - Stripe payment processing
- **Support System** - Ticket management and customer support

### Advanced Features
- **Audit Logging** - Comprehensive security and compliance logging
- **Encryption** - AES-256 encryption for sensitive data
- **Internationalization** - Multi-language support (i18n)
- **Testing Framework** - Jest and Supertest for comprehensive testing
- **CI/CD Pipeline** - Automated deployment to AWS

## 🏗️ Architecture

### Backend (Server)
- **Node.js/Express** - RESTful API server
- **MongoDB** - NoSQL database with Mongoose ODM
- **Socket.io** - Real-time bidirectional communication
- **JWT** - JSON Web Token authentication
- **Stripe** - Payment processing
- **Security** - Helmet, rate limiting, CORS

### Frontend (Client)
- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time client communication
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **React Hook Form** - Form management

## 📁 Project Structure

```
insurance-marketplace/
├── server/                 # Backend server
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── utils/             # Utility functions
│   ├── server.js          # Main server file
│   ├── package.json       # Server dependencies
│   └── server.env         # Environment variables
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   ├── App.js         # Main app component
│   │   └── App.css        # Global styles
│   └── package.json       # Client dependencies
├── package.json            # Root package.json
└── README.md              # Project documentation
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone <repository-url>
cd insurance-marketplace
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install


### 3. Environment Configuration
**⚠️ IMPORTANT: Never commit your `.env` files to version control!**

Create a `.env` file in the server directory:

```bash
cd server
cp server.env.example .env
```

Update the `.env` file with your actual configuration values. See `server.env.example` for the required environment variables.

**Required Environment Variables:**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A strong secret key for JWT tokens
- `PORT` - Server port (default: 5002)
- `NODE_ENV` - Environment (development/production)

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Configuration
Create a `.env` file in the server directory:

```bash
cd server
cp server.env .env
```

Update the `.env` file with your configuration:

```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
STRIPE_SECRET_KEY=your_stripe_secret_key
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
ENCRYPTION_KEY=your_32_character_encryption_key
NODE_ENV=development
```

### 4. Start the Application

#### Development Mode (Both Server & Client)
```bash
# From root directory
npm run dev
```

#### Production Mode
```bash
# Start server only
npm run server

# Start client only
npm run client
```

## 🔧 Configuration

### MongoDB Setup
1. Create a MongoDB database (local or cloud)
2. Update `MONGODB_URI` in your environment variables
3. The application will automatically create collections and indexes

### Stripe Integration
1. Create a Stripe account and get your API keys
2. Update `STRIPE_SECRET_KEY` in your environment variables
3. Configure webhook endpoints for payment processing

### Email Configuration
1. Set up email credentials for user verification
2. Update `EMAIL_USER` and `EMAIL_PASS` in your environment variables

## 📱 Usage

### User Registration
1. Navigate to `/register`
2. Choose your role (Client or Provider)
3. Fill in your profile information
4. Verify your email address

### Provider KYC Verification
1. Complete your profile as a provider
2. Upload required documents
3. Wait for admin verification
4. Start accepting insurance requests

### Creating Insurance Requests
1. Log in as a client
2. Navigate to your dashboard
3. Create a new insurance request
4. Set coverage amount and requirements
5. Wait for provider bids

### Bidding on Requests
1. Log in as a verified provider
2. Browse available insurance requests
3. Submit competitive bids
4. Include coverage details and terms

## 🧪 Testing

### Backend Testing
```bash
cd server
npm test
```

### Frontend Testing
```bash
cd client
npm test
```

## 🚀 Deployment

### AWS Deployment
The project includes a CI/CD pipeline for AWS deployment:

1. Set up AWS credentials
2. Configure GitHub Actions secrets
3. Push to main branch to trigger deployment

### Manual Deployment
1. Build the client application: `npm run build`
2. Deploy server to your hosting platform
3. Configure environment variables
4. Set up MongoDB connection

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - API request throttling
- **CORS Protection** - Cross-origin resource sharing
- **Input Validation** - Request data sanitization
- **Audit Logging** - Comprehensive activity tracking
- **Data Encryption** - AES-256 for sensitive information

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Users
- `GET /api/users` - Get users (admin only)
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/kyc` - Submit KYC documents

### Insurance Requests
- `GET /api/requests` - Get insurance requests
- `POST /api/requests` - Create insurance request
- `GET /api/requests/:id` - Get specific request
- `PUT /api/requests/:id` - Update request

### Bids
- `GET /api/bids` - Get bids
- `POST /api/bids` - Submit bid
- `PUT /api/bids/:id` - Update bid

### Providers
- `GET /api/providers` - Search providers
- `GET /api/providers/:id` - Get provider profile
- `GET /api/providers/:id/reviews` - Get provider reviews

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact: info@insuremarket.com
- Documentation: [Link to docs]

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Core marketplace functionality
- Real-time communication
- User authentication system
- Provider management
- Bidding system

## 🙏 Acknowledgments

- MongoDB for the database
- Express.js team for the web framework
- React team for the frontend library
- Socket.io for real-time communication
- Tailwind CSS for the styling framework





