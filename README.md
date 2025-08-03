# Cleaning Management App

A comprehensive cleaning management system for tourist properties with real-time task assignment, tracking, and reporting capabilities.

## 🏗️ Architecture

- **Backend**: Supabase Edge Functions (Deno/TypeScript) with CQRS + Event Sourcing
- **Frontend**: React + Vite
- **Database**: PostgreSQL (Supabase)
- **Testing**: Deno native testing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for frontend development)
- Deno (for Edge Functions testing)
- Supabase CLI

### Quick Start with Makefile

```bash
# Complete setup in one command
make quick-start

# Start Edge Functions (in another terminal)
make dev

# Start frontend (in another terminal)  
make frontend
```

### Manual Development Setup

1. **Start Supabase** (database + auth + storage):

  ```bash
  make start
  # or: npm start
  ```

2. **Start Edge Functions** (in another terminal):

  ```bash
  make dev
  # or: npm run dev
  ```

3. **Start frontend** (in another terminal):

  ```bash
  make frontend
  # or: npm run frontend:dev
  ```

4. **Access the application**:

  - Frontend: <http://localhost:5173>
  - Edge Functions: <http://localhost:54321/functions/v1/>
  - Health Check: <http://localhost:5173/health>

### Makefile Commands

```bash
# Stack Management
make start          # Start Supabase
make stop           # Stop all services
make restart        # Restart everything
make status         # Show service status
make health         # Test health endpoints

# Development
make dev            # Start Edge Functions
make frontend       # Start React frontend
make full-dev       # Start everything (experimental)

# Testing
make test           # Run all tests
make test-unit      # Backend unit tests
make test-integration # Backend integration tests  
make test-frontend  # Frontend tests

# Database
make db-reset       # Reset database
make db-migrate     # Apply migrations

# Utilities
make install        # Install dependencies
make clean          # Clean up and stop services
make setup          # Initial project setup
make help           # Show all commands
```

## 🧪 Testing

Run tests:

```bash
make test           # All tests
make test-unit      # Backend unit tests  
make test-integration # Backend integration tests
make test-frontend  # Frontend tests

# Or use npm directly
npm test
npm run test:watch  # Watch mode
```

Test types:

- **Unit Tests**: Pure business logic testing
- **Integration Tests**: HTTP endpoint testing against running Edge Functions

## 📊 Health Monitoring

The application includes comprehensive health checks:

- **Basic Health**: `GET /health`

Health checks verify:

- ✅ Edge Function responsiveness
- ✅ Database connectivity
- ✅ Supabase integration
- ✅ Environment configuration

## 🔧 Environment Variables

Edge Functions automatically use environment variables from your Supabase project. For local development, these are set when you run `supabase start`.

## 📁 Project Structure

```
├── supabase/              # Supabase configuration
│   ├── functions/         # Edge Functions
│   │   ├── health/        # Health check function
│   │   └── _shared/       # Shared business logic
│   └── config.toml        # Supabase config
├── frontend/              # React frontend
│   ├── src/               # Frontend source
│   ├── public/            # Static assets
│   └── vite.config.js     # Vite configuration
├── tests/                 # Deno tests
│   └── functions/         # Edge Function tests
└── package.json           # Node.js dependencies (frontend only)
```

## 🎯 Features

### Current

- ✅ Health monitoring and status checks
- ✅ Supabase Edge Functions
- ✅ Deno test suite with unit and integration tests
- ✅ React frontend with Edge Function integration

### Planned (Implementation Plan)

- 📊 Google Sheets integration
- 📅 Calendar-based task management
- 👥 Role-based access (Admin/Cleaners)
- 📱 Mobile-first responsive design
- 💬 WhatsApp integration
- ⏱️ Time tracking with video uploads
- 📦 Product inventory management
- 📈 Monthly reporting and analytics

## 🤝 Development Workflow

1. **Feature Development**: Create feature branches from main
2. **Testing**: All features must have integration tests
3. **Docker**: Test features in containerized environment
4. **Health Checks**: Ensure health endpoints reflect new services

## 📝 API Documentation

### Health Endpoints

#### GET /health

Basic health status check.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-07-31T10:00:00.000Z",
  "service": "cleaning-management-api",
  "version": "1.0.0"
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Stop existing services with `npm run docker:down`
2. **Database connection**: Ensure Supabase is running with `supabase status`
3. **Container builds**: Rebuild with `npm run docker:build`
4. **Permission issues**: Check Docker permissions and file ownership

### Logs

View container logs:

```bash
docker-compose logs api
docker-compose logs frontend
```

View all logs:

```bash
npm run docker:logs
```

## 📄 License

MIT License - see LICENSE file for details.
