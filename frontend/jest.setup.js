// Frontend-specific Jest setup
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Mock import.meta.env for Vite environment variables
Object.defineProperty(globalThis, "import", {
  value: {
    meta: {
      env: {
        VITE_USE_LOCAL: "true",
        VITE_SUPABASE_URL_LOCAL: "http://localhost:5173",
        VITE_SUPABASE_URL_REMOTE: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY_LOCAL: "test-local-key",
        VITE_SUPABASE_ANON_KEY: "test-remote-key",
      },
    },
  },
});

// Mock fetch for frontend tests
global.fetch = jest.fn();

// Add missing globals for React Router and other dependencies
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.location for tests
Object.defineProperty(window, "location", {
  value: {
    origin: "http://localhost:5173",
    href: "http://localhost:5173",
    pathname: "/",
  },
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Reset mocks before each test
beforeEach(() => {
  fetch.mockClear();
});
