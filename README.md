# Insurance Marketplace Platform

A comprehensive, real-time insurance marketplace platform built with the MERN stack (MongoDB, Express.js, React, Node.js) featuring Socket.io for real-time communication allowing group insurances offers and requests.

##  Features

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

##  Architecture

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

##  Project Structure

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

##  Installation & Setup

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

### 3. Start the Application

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

### Manual Deployment
1. Build the client application: `npm run build`
2. Deploy server to your hosting platform
3. Configure environment variables
4. Set up MongoDB connection

## 📄 License
This project is licensed under Peaky Blienders.

##  Tech Stack

- MongoDB for the database
- Express.js team for the web framework
- React team for the frontend library
- Socket.io for real-time communication
- Tailwind CSS for the styling framework





