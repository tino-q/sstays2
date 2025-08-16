// Backend integration test setup with console mocking
const { beforeAll, afterAll, beforeEach, afterEach } = require("@jest/globals");

// Mock console methods to reduce verbosity in integration tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

beforeAll(() => {
  // Set up test environment variables
  process.env.NODE_ENV = "test";

  // Supabase test environment
  process.env.SUPABASE_URL =
    process.env.SUPABASE_URL || "http://localhost:54321";
  process.env.SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY || "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-key";

  // Mock console methods to reduce verbosity
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

beforeEach(() => {
  // Clear console mock calls before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Optional: Log test summary if needed
  // Uncomment the following lines if you want to see console output for failed tests only
  // const testFailed = expect.getState().testFailed;
  // if (testFailed) {
  //   console.log = originalConsole.log;
  //   console.error = originalConsole.error;
  //   console.warn = originalConsole.warn;
  //   console.info = originalConsole.info;
  //   console.debug = originalConsole.debug;
  // }
});
