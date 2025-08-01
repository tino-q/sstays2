# 🏠 Cleaning Management App - Implementation Plan

## 📋 Project Overview

A comprehensive cleaning management system for 6 tourist properties with real-time task assignment, tracking, and reporting capabilities.

### 🎯 Core Features
- Google Sheets integration for reservation import
- Calendar-based task visualization
- Mobile-first design
- Role-based access (Admin/Cleaners)
- WhatsApp integration
- Time tracking with video uploads
- Product inventory management
- Monthly reporting and payroll

## 🏗️ Technical Architecture

### Backend Stack
- **Database**: PostgreSQL (Supabase for production, local PostgreSQL for development)
- **API**: Node.js/Express with CQRS + Event Sourcing pattern
- **Authentication**: Google SSO via Supabase Auth
- **Testing**: Integration tests (not unit tests)
- **File Storage**: Supabase Storage for videos/media

### Frontend Stack
- **Framework**: React with Vite
- **Calendar**: FullCalendar.js
- **UI Library**: TailwindCSS + Headless UI
- **State Management**: React Query + Zustand
- **Hosting**: GitHub Pages with custom domain

### External Integrations
- **Google Sheets API**: OAuth for reservation import
- **WhatsApp**: Deep linking for notifications
- **File Compression**: Client-side video compression

## 📊 Database Schema (Event Sourced)

### Core Tables
```sql
-- Main task state (simplified)
tasks (id, property, type, date, status, assigned_cleaner_id, created_at, updated_at)

-- Event sourcing snapshots
task_events (snapshot_id, task_id, [all_task_fields], snapshot_timestamp, changed_by)

-- Specialized event tables
task_comments (id, task_id, user_id, comment, timestamp, comment_type)
task_rejections (id, task_id, user_id, rejection_reason, timestamp)
task_proposals (id, task_id, user_id, proposed_time, proposal_reason, status)
task_timings (id, task_id, user_id, event_type, timestamp, recorded_at)
task_product_usage (id, task_id, user_id, product_id, quantity, notes)
```

### Task Status Flow
```
URGENTE (🔴) → ESP_OK (🟡) → CONFIR (🟢) → COMPLETED (🟣)
                     ↓
                REJECTED (🟠) / TENTATIVO (🔵)
```

## 🚀 Development Phases

### Phase 1: Foundation (Weeks 1-2)
**Priority: High | Dependencies: None**

#### Backend Setup
- [ ] PostgreSQL database setup (local + Supabase)
- [ ] Express.js API with CQRS pattern
- [ ] Event sourcing infrastructure
- [ ] Google OAuth integration
- [ ] Basic CRUD operations for tasks

#### Frontend Setup
- [ ] React + Vite project initialization
- [ ] TailwindCSS configuration
- [ ] Authentication flow with Supabase
- [ ] Basic routing and layout

#### Integration Tests
- [ ] Database integration tests
- [ ] Authentication flow tests
- [ ] Basic API endpoint tests

### Phase 2: Core Task Management (Weeks 3-4)
**Priority: High | Dependencies: Phase 1**

#### Google Sheets Integration
- [ ] Google Sheets API connection
- [ ] Reservation import functionality
- [ ] Automatic task generation from check-outs
- [ ] Manual task creation form

#### Calendar Implementation
- [ ] FullCalendar.js integration
- [ ] Task visualization with color coding
- [ ] Mobile-responsive calendar
- [ ] Property/cleaner filters

#### Task Assignment
- [ ] Cleaner dropdown assignment
- [ ] Real-time status updates
- [ ] Task state management with event sourcing

### Phase 3: Cleaner Panel (Weeks 5-6)
**Priority: High | Dependencies: Phase 2**

#### Task Confirmation System
- [ ] Cleaner dashboard for assigned tasks
- [ ] Accept/Reject/Propose alternative functionality
- [ ] Real-time status sync with admin panel
- [ ] Time proposal workflow

#### WhatsApp Integration
- [ ] Message template generation
- [ ] Deep link creation for task notifications
- [ ] Cleaner contact management

### Phase 4: Time & Media Tracking (Weeks 7-8)
**Priority: High | Dependencies: Phase 3**

#### Time Registration
- [ ] Entry/exit time logging
- [ ] Automatic duration calculation
- [ ] Time validation and corrections

#### Media Upload
- [ ] Video upload functionality
- [ ] Client-side video compression (50MB limit)
- [ ] Supabase Storage integration
- [ ] Progress indicators for uploads

#### Comments System
- [ ] Task comments functionality
- [ ] Real-time comment updates
- [ ] Comment search and filtering

### Phase 5: Product Management (Weeks 9-10)
**Priority: Medium | Dependencies: Phase 4**

#### Inventory Integration
- [ ] Google Sheets product sync
- [ ] Product shortage reporting
- [ ] Quantity tracking per task
- [ ] Admin product request dashboard

### Phase 6: Reporting & Analytics (Weeks 11-12)
**Priority: High | Dependencies: Phase 5**

#### Monthly Reports
- [ ] Hours calculation by cleaner
- [ ] Task completion statistics
- [ ] Payroll calculations (hours + expenses)
- [ ] Excel/Google Sheets export

#### Advanced Analytics
- [ ] Rejection rate analysis
- [ ] Performance metrics per cleaner
- [ ] Property-specific statistics
- [ ] Historical trend analysis

### Phase 7: Optimization & Polish (Weeks 13-14)
**Priority: Medium | Dependencies: All phases**

#### Performance
- [ ] API response optimization
- [ ] Frontend bundle optimization
- [ ] Image/video lazy loading
- [ ] Caching strategies

#### User Experience
- [ ] Error handling and user feedback
- [ ] Loading states and skeletons
- [ ] Offline capability research
- [ ] Accessibility improvements

## 🧪 Testing Strategy

### Integration Tests (Backend)
```javascript
// Example test structure
describe('Task Management API', () => {
  test('Should create task from Google Sheets data')
  test('Should assign cleaner and update status')
  test('Should handle cleaner response (accept/reject)')
  test('Should log time entries and calculate duration')
  test('Should generate monthly reports')
})
```

### E2E Testing
- Critical user flows
- Authentication scenarios
- Mobile responsiveness
- Cross-browser compatibility

## 📱 Mobile-First Considerations

### Design Priorities
- Touch-friendly interface (44px+ touch targets)
- Optimized calendar view for mobile
- Fast video upload with progress
- Offline data persistence for critical actions
- PWA capabilities for app-like experience

### Performance Targets
- First Contentful Paint < 2s
- Time to Interactive < 3s
- Video compression to <50MB
- Lazy loading for non-critical resources

## 🔐 Security & Privacy

### Authentication
- Google SSO only (no password management)
- JWT tokens with appropriate expiration
- Role-based access control (Admin/Cleaner)

### Data Protection
- Task data isolation per cleaner
- Secure video storage with access controls
- GDPR-compliant data handling
- Regular security audits

## 🚀 Deployment Strategy

### Development Environment
- Local PostgreSQL database
- Local React dev server
- Environment variables for API keys

### Production Environment
- Supabase PostgreSQL + Auth + Storage
- GitHub Pages for frontend hosting
- Custom domain configuration
- CI/CD pipeline with GitHub Actions

## 📈 Success Metrics

### Functional Metrics
- Task assignment time < 30 seconds
- 95% uptime for critical operations
- Video upload success rate > 90%
- Mobile usability score > 80

### Business Metrics
- Reduced manual coordination time
- Improved cleaner response rates
- Accurate time tracking for payroll
- Enhanced property management efficiency

## 🛠️ Development Tools

### Required Setup
```bash
# Backend
node.js >= 18
postgresql >= 14
npm/yarn

# Frontend
node.js >= 18
vite
tailwindcss

# Testing
jest
supertest
playwright (for E2E)
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://localhost:5432/cleaning_app
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# Google Integration
GOOGLE_SHEETS_CLIENT_ID=your_client_id
GOOGLE_SHEETS_CLIENT_SECRET=your_client_secret

# App Configuration
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
```

## 📝 Next Steps

1. **Environment Setup**: Set up local development environment
2. **Database Design**: Create detailed schema with migrations
3. **API Design**: Define OpenAPI specification
4. **UI Mockups**: Create mobile-first wireframes
5. **Sprint Planning**: Break down phases into 2-week sprints

---

**📅 Estimated Timeline**: 14 weeks
**👥 Team Size**: 1-2 developers
**🎯 MVP Target**: End of Phase 4 (8 weeks)
**🚀 Full Release**: End of Phase 7 (14 weeks)