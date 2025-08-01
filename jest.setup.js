// Global Jest setup for all tests
import { beforeAll, afterAll } from '@jest/globals';

// Set up test environment variables
beforeAll(() => {
  // Default test environment variables
  process.env.NODE_ENV = 'test';
  
  // Supabase test environment (will be overridden in integration tests)
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
});

afterAll(() => {
  // Cleanup if needed
});