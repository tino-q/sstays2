# Health Check System with Google OAuth Authentication

A secure health check system built with Supabase Edge Functions and React, featuring Google OAuth authentication as the only login method.

## 🚀 Features

- **Google OAuth Authentication**: Secure login using Google accounts only
- **Protected Health Check Endpoint**: Backend API requiring valid JWT tokens
- **Mailgun Webhook Integration**: AI-powered Airbnb reservation parsing from email
- **Real-time Health Monitoring**: Database, Supabase API, and environment checks
- **Responsive UI**: Mobile-first design with modern styling
- **Comprehensive Testing**: Unit, integration, and E2E tests
- **Security Focus**: JWT validation, CORS protection, and audit logging

## 🏗️ Architecture

```
Frontend (React) → Google OAuth → Supabase Auth → JWT Token → Backend API (Edge Functions)
```

### Security Layers

- **Frontend**: React with Supabase Auth UI
- **Backend**: Supabase Edge Functions with JWT verification
- **Database**: Row Level Security (RLS) policies
- **API**: Protected endpoints requiring valid JWT

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase CLI
- Google Cloud Console account
- Git

## 🛠️ Setup Instructions

### 1\. Google OAuth Configuration

#### Step 1: Create Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:

  - Go to "APIs & Services" > "Library"
  - Search for "Google+ API"
  - Click "Enable"

#### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure OAuth consent screen:

  - User Type: External
  - App name: "Health Check System"
  - User support email: your email
  - Developer contact information: your email

4. Create OAuth 2.0 Client ID:

  - Application type: Web application
  - Name: "Supabase Auth"
  - Authorized redirect URIs:

    - Local: `http://localhost:54321/auth/v1/callback`
    - Production: `https://your-project.supabase.co/auth/v1/callback`

### 2\. Supabase Configuration

#### Step 1: Initialize Supabase

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Initialize the project
supabase init
```

#### Step 2: Configure Authentication

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Enable Google provider
4. Add your Google OAuth credentials:

  - Client ID: From Google Cloud Console
  - Client Secret: From Google Cloud Console

5. Save configuration

#### Step 3: Environment Variables

Create a `.env` file in the root directory:

```bash
# OpenAI Configuration for Mailgun Webhook Parsing
OPENAI_API_KEY=your-openai-api-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Supabase (get these from your project settings)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Frontend Environment Variables
VITE_SUPABASE_URL_REMOTE=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_USE_LOCAL=false
```

### 3\. Local Development Setup

#### Step 1: Install Dependencies

```bash
npm install
```

#### Step 2: Start Local Supabase

```bash
supabase start
```

#### Step 3: Deploy Edge Functions

```bash
supabase functions deploy
```

#### Step 4: Start Frontend Development Server

```bash
npm run frontend:dev
```

### 4\. Database Setup

The system includes a database function for version checking. Deploy it with:

```bash
supabase db reset
```

### 5\. Mailgun Webhook Setup

The system includes an AI-powered webhook endpoint for processing Airbnb reservation confirmations from Mailgun.

#### Features

- **AI Parsing**: Uses OpenAI GPT-4o-mini to extract reservation data from emails
- **Data Validation**: Joi schema validation and AI-powered critical error detection
- **Database Storage**: Automatically stores parsed reservations in PostgreSQL
- **Duplicate Prevention**: Checks for existing reservations before inserting

#### Setup Steps

1. **Configure OpenAI API Key** (already set up above in environment variables)

2. **Database Migration**: The reservations table is created automatically when you run `supabase db reset`

3. **Webhook Endpoint**: Available at `/mailgun-webhook`

4. **Mailgun Configuration**: Point your Mailgun webhook to:

  - Local: `http://your-ngrok-url.ngrok.io/functions/v1/mailgun-webhook`
  - Production: `https://sqdhegczwwcfnrankyde.supabase.co/functions/v1/mailgun-webhook`

#### Database Schema

The `reservations` table includes:

- Basic info: reservation ID, property details, guest information
- Dates: check-in, check-out, number of nights
- Pricing: nightly rate, fees, totals, host payout
- Metadata: thread ID, AI notes, timestamps

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Backend unit tests
npm run test:backend:unit

# Backend integration tests
npm run test:backend:integration

# Frontend tests
npm run test:frontend

# E2E tests
npm run test:e2e
```

### Test Coverage

- **Backend Unit Tests**: 90%+ coverage for auth service and health endpoints
- **Backend Integration Tests**: Authentication flow and protected endpoints
- **Frontend Tests**: Component behavior and user interactions
- **E2E Tests**: Complete authentication flow and user experience

## 🔐 Security Features

### Authentication Security

- **JWT Token Validation**: All API requests require valid JWT tokens
- **Email Confirmation**: Users must confirm their email before access
- **Role-based Access**: Support for different user roles
- **Session Management**: Secure session handling and cleanup

### API Security

- **CORS Protection**: Properly configured cross-origin requests
- **Rate Limiting**: Protection against abuse
- **Input Validation**: All inputs are validated and sanitized
- **Error Handling**: Secure error messages without information leakage

### Data Protection

- **No Local Storage**: No sensitive data stored in browser
- **Audit Logging**: Track authentication events
- **GDPR Compliance**: User consent and data rights
- **Secure Headers**: Proper security headers in responses

## 🚀 Deployment

### Production Deployment

#### Step 1: Deploy Edge Functions

```bash
supabase functions deploy --project-ref your-project-ref
```

#### Step 2: Build Frontend

```bash
npm run frontend:build
```

#### Step 3: Deploy Frontend

Deploy the `frontend/dist` folder to your hosting provider (Vercel, Netlify, etc.)

#### Step 4: Update Environment Variables

Ensure your production environment has the correct environment variables set.

## 📱 Usage

### For Users

1. Navigate to the application
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Access the health check dashboard
5. View system status and health information

### For Developers

1. Clone the repository
2. Follow setup instructions above
3. Run tests to ensure everything works
4. Make changes and test thoroughly
5. Deploy to production

## 🔧 Configuration

### Environment Variables

#### Required Variables

- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

#### Optional Variables

- `VITE_USE_LOCAL`: Set to "true" to use local Supabase instance
- `VITE_SUPABASE_URL_LOCAL`: Local Supabase URL
- `VITE_SUPABASE_ANON_KEY_LOCAL`: Local Supabase anonymous key

### Customization

#### Styling

Modify `frontend/src/App.css` to customize the appearance.

#### Authentication

Update `supabase/functions/_shared/auth-service.ts` to modify authentication logic.

#### Health Checks

Modify `supabase/functions/_shared/health-service.ts` to add custom health checks.

## 🐛 Troubleshooting

### Common Issues

#### Google OAuth Not Working

1. Verify redirect URIs are correct
2. Check that Google+ API is enabled
3. Ensure OAuth consent screen is configured
4. Verify client ID and secret are correct

#### Supabase Connection Issues

1. Check environment variables
2. Verify Supabase project is active
3. Ensure Edge Functions are deployed
4. Check network connectivity

#### Authentication Errors

1. Verify JWT token is valid
2. Check user email is confirmed
3. Ensure proper CORS configuration
4. Review authentication logs

### Debug Mode

Enable debug logging by setting environment variables:

```bash
DEBUG=true
NODE_ENV=development
```

## 📊 Monitoring

### Health Check Endpoints

- `GET /health`: Protected health check endpoint
- Requires valid JWT token
- Returns system status and user information

### Logging

- Authentication events are logged
- Health check access is tracked
- Error events are recorded

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the troubleshooting section
2. Review the test files for examples
3. Check Supabase and Google Cloud documentation
4. Open an issue on GitHub

## 🔄 Updates

### Recent Changes

- Added Google OAuth authentication
- Protected health check endpoint
- Comprehensive test coverage
- Security improvements
- Mobile-responsive design

### Planned Features

- Multi-factor authentication
- Advanced role management
- Real-time notifications
- Performance monitoring
- API rate limiting

--------------------------------------------------------------------------------

**Note**: This system is designed for security and reliability. Always follow security best practices when deploying to production.
