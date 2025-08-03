# Google OAuth Authentication Implementation Plan

## Overview

Implement Google OAuth authentication as the only login method for accessing the health check endpoint. This plan focuses on security, proper authentication flow, and comprehensive test coverage.

## Security Architecture

### 1\. Authentication Flow

```
User → Frontend → Google OAuth → Supabase Auth → JWT Token → Backend API
```

### 2\. Security Layers

- **Frontend**: React with Supabase Auth UI
- **Backend**: Supabase Edge Functions with JWT verification
- **Database**: Row Level Security (RLS) policies
- **API**: Protected endpoints requiring valid JWT

## Implementation Steps

### Phase 1: Supabase Configuration & Google OAuth Setup

#### 1.1 Google OAuth Configuration

1. **Create Google OAuth App**:

  - Go to [Google Cloud Console](https://console.cloud.google.com/)
  - Create new project or select existing
  - Enable Google+ API
  - Create OAuth 2.0 credentials
  - Add authorized redirect URIs:

    - Local: `http://localhost:54321/auth/v1/callback`
    - Production: `https://your-project.supabase.co/auth/v1/callback`

2. **Configure Supabase Auth**:

  - Enable Google provider in Supabase Dashboard
  - Add Google OAuth credentials (Client ID & Secret)
  - Configure redirect URLs

#### 1.2 Environment Variables Setup

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Supabase (existing)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Phase 2: Backend Authentication Implementation

#### 2.1 Create Authentication Service

- **File**: `supabase/functions/_shared/auth-service.ts`
- **Purpose**: JWT verification and user authentication
- **Features**:

  - JWT token validation
  - User session verification
  - Role-based access control

#### 2.2 Update Health Endpoint

- **File**: `supabase/functions/health/index.ts`
- **Changes**:

  - Add authentication middleware
  - Require valid JWT token
  - Return user-specific health data

#### 2.3 Database Security

- **RLS Policies**: Protect health check data
- **User Profiles**: Store user information
- **Audit Logging**: Track authentication events

### Phase 3: Frontend Authentication Implementation

#### 3.1 Install Dependencies

```bash
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
```

#### 3.2 Create Authentication Components

- **Login Component**: Google OAuth button
- **Protected Route**: Wrapper for authenticated content
- **User Context**: React context for user state

#### 3.3 Update App Component

- **Authentication State**: Handle login/logout
- **Protected Health Check**: Only show when authenticated
- **Loading States**: Handle auth loading

### Phase 4: Testing Implementation

#### 4.1 Backend Unit Tests

- **Auth Service Tests**: JWT validation, user verification
- **Health Service Tests**: Authentication integration
- **Error Handling**: Invalid tokens, expired sessions

#### 4.2 Backend Integration Tests

- **Protected Endpoints**: Test with valid/invalid tokens
- **Authentication Flow**: End-to-end auth testing
- **Error Scenarios**: Network failures, invalid credentials

#### 4.3 Frontend Unit Tests

- **Auth Components**: Login/logout functionality
- **Protected Routes**: Authentication state handling
- **User Context**: State management testing

#### 4.4 Frontend E2E Tests

- **Authentication Flow**: Complete login/logout process
- **Protected Content**: Verify health check access
- **Error Scenarios**: Invalid credentials, network issues

## Security Considerations

### 1\. JWT Security

- **Token Expiration**: Short-lived access tokens
- **Refresh Tokens**: Secure refresh mechanism
- **Token Storage**: Secure browser storage (httpOnly cookies)

### 2\. CORS Configuration

- **Restricted Origins**: Only allow trusted domains
- **Credentials**: Include credentials in requests
- **Headers**: Proper authorization headers

### 3\. Rate Limiting

- **Authentication Endpoints**: Prevent brute force
- **API Endpoints**: Protect against abuse
- **IP-based Limits**: Geographic restrictions if needed

### 4\. Data Protection

- **User Data**: Minimal data collection
- **Audit Logs**: Track authentication events
- **GDPR Compliance**: User consent and data rights

## Test Coverage Requirements

### Backend Tests (90%+ coverage)

- [ ] Auth service unit tests
- [ ] JWT validation tests
- [ ] Health endpoint with auth tests
- [ ] Error handling tests
- [ ] Integration tests with real auth flow

### Frontend Tests (90%+ coverage)

- [ ] Authentication components
- [ ] Protected route wrapper
- [ ] User context provider
- [ ] Login/logout flow
- [ ] Error state handling

### E2E Tests (Critical paths)

- [ ] Complete authentication flow
- [ ] Protected content access
- [ ] Logout functionality
- [ ] Error scenarios
- [ ] Cross-browser compatibility

## Configuration Steps for Google OAuth

### Step 1: Google Cloud Console Setup

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing project
3. Enable Google+ API:

  - Go to "APIs & Services" > "Library"
  - Search for "Google+ API"
  - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure OAuth consent screen:

  - User Type: External
  - App name: "Your App Name"
  - User support email: your email
  - Developer contact information: your email

4. Create OAuth 2.0 Client ID:

  - Application type: Web application
  - Name: "Supabase Auth"
  - Authorized redirect URIs:

    - Local: `http://localhost:54321/auth/v1/callback`
    - Production: `https://your-project.supabase.co/auth/v1/callback`

### Step 3: Supabase Dashboard Configuration

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Enable Google provider
4. Add credentials:

  - Client ID: From Google Cloud Console
  - Client Secret: From Google Cloud Console

5. Save configuration

### Step 4: Environment Variables

1. Add to your local `.env` file:

  ```bash
  GOOGLE_CLIENT_ID=your_client_id_here
  GOOGLE_CLIENT_SECRET=your_client_secret_here
  ```

2. Add to Supabase project settings:

  - Go to "Settings" > "API"
  - Add environment variables in Edge Functions

### Step 5: Test Configuration

1. Test local development:

  - Start Supabase: `supabase start`
  - Test auth flow locally

2. Test production:

  - Deploy functions: `supabase functions deploy`
  - Test auth flow in production

## Success Criteria

### Functional Requirements

- [ ] Users can login with Google OAuth
- [ ] Health check endpoint requires authentication
- [ ] Users can logout successfully
- [ ] Session persistence across page reloads
- [ ] Proper error handling for auth failures

### Security Requirements

- [ ] JWT tokens are properly validated
- [ ] No sensitive data exposed in frontend
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Audit logging in place

### Performance Requirements

- [ ] Authentication response time < 2 seconds
- [ ] Health check response time < 1 second
- [ ] Smooth user experience during auth flow

### Test Requirements

- [ ] All tests passing (backend, frontend, e2e)
- [ ] 90%+ code coverage
- [ ] Security tests included
- [ ] Performance tests included

## Risk Mitigation

### High Priority Risks

1. **Token Security**: Implement proper JWT handling
2. **CORS Misconfiguration**: Test cross-origin requests
3. **Rate Limiting**: Prevent abuse of auth endpoints
4. **Error Handling**: Don't expose sensitive information

### Medium Priority Risks

1. **Session Management**: Proper logout and cleanup
2. **User Experience**: Smooth auth flow
3. **Mobile Compatibility**: Test on mobile devices
4. **Browser Compatibility**: Test across browsers

### Low Priority Risks

1. **Performance**: Optimize auth flow
2. **Accessibility**: Ensure auth is accessible
3. **Internationalization**: Support multiple languages
4. **Analytics**: Track auth metrics

## Timeline Estimate

- **Phase 1**: 2-3 days (Configuration & Setup)
- **Phase 2**: 3-4 days (Backend Implementation)
- **Phase 3**: 2-3 days (Frontend Implementation)
- **Phase 4**: 3-4 days (Testing & Security)
- **Total**: 10-14 days

## Next Steps

1. **Immediate**: Set up Google OAuth credentials
2. **Day 1-2**: Configure Supabase auth settings
3. **Day 3-5**: Implement backend authentication
4. **Day 6-8**: Implement frontend authentication
5. **Day 9-12**: Comprehensive testing
6. **Day 13-14**: Security review and deployment
