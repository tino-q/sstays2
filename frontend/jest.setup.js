// Frontend-specific Jest setup
import '@testing-library/jest-dom';

// Mock import.meta.env for Vite environment variables
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_USE_LOCAL: 'true',
        VITE_SUPABASE_URL_LOCAL: 'http://localhost:3000',
        VITE_SUPABASE_URL_REMOTE: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY_LOCAL: 'test-local-key',
        VITE_SUPABASE_ANON_KEY: 'test-remote-key'
      }
    }
  }
});

// Mock fetch for frontend tests
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  fetch.mockClear();
});