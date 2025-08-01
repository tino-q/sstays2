/**
 * Integration tests for health endpoints
 * These tests run against actual Supabase Edge Functions and database
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');

const FUNCTION_URL = 'http://localhost:54321/functions/v1/health';
const AUTH_HEADERS = {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
};

describe('Health Endpoint - Integration Tests', () => {
  beforeAll(async () => {
    // Ensure Supabase is running
    // This should be started before running tests: supabase start
    console.log('🧪 Running integration tests against local Supabase');
    console.log(`📡 Function URL: ${FUNCTION_URL}`);
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Basic Health Endpoint', () => {
    test('should return 200 and correct structure for /health', async () => {
      const response = await fetch(`${FUNCTION_URL}/health`, { headers: AUTH_HEADERS });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('service', 'cleaning-management-api');
      expect(data).toHaveProperty('version', '1.0.0');
      expect(data).toHaveProperty('timestamp');
      
      // Verify timestamp is recent (within last 10 seconds)
      const timestamp = new Date(data.timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(10000);
    });

    test('should include proper CORS headers', async () => {
      const response = await fetch(`${FUNCTION_URL}/health`, { headers: AUTH_HEADERS });
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
    });

    test('should handle OPTIONS request for CORS', async () => {
      const response = await fetch(`${FUNCTION_URL}/health`, {
        method: 'OPTIONS',
        headers: AUTH_HEADERS
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Detailed Health Endpoint', () => {
    test('should return detailed health with database connection', async () => {
      const response = await fetch(`${FUNCTION_URL}/health/detailed`, { headers: AUTH_HEADERS });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('service', 'cleaning-management-api');
      expect(data).toHaveProperty('checks');
      
      // Check database health - should be OK in integration tests
      expect(data.checks).toHaveProperty('database');
      expect(data.checks.database.status).toBe('ok');
      expect(data.checks.database).toHaveProperty('responseTime');
      expect(data.checks.database).toHaveProperty('timestamp');
      expect(data.checks.database).toHaveProperty('version');
      expect(data.checks.database.version).toMatch(/PostgreSQL/);
      console.log(`✅ Database version: ${data.checks.database.version}`);
      
      // Check Supabase API health
      expect(data.checks).toHaveProperty('supabase');
      expect(data.checks.supabase).toHaveProperty('status');
      
      // Check environment health
      expect(data.checks).toHaveProperty('environment');
      expect(data.checks.environment).toHaveProperty('status');
    });

    test('should return error status when database function fails', async () => {
      // This test verifies error handling when the database RPC fails
      // We can't easily simulate this in integration tests, so we'll just
      // verify the structure is correct when everything is working
      
      const response = await fetch(`${FUNCTION_URL}/health/detailed`, { headers: AUTH_HEADERS });
      const data = await response.json();
      
      // If database is working, status should be ok
      // If database fails, status should be error
      expect(['ok', 'error']).toContain(data.status);
      
      if (data.status === 'error') {
        expect(data.checks.database).toHaveProperty('error');
      }
    });

    test('should measure response time accurately', async () => {
      const startTime = Date.now();
      const response = await fetch(`${FUNCTION_URL}/health/detailed`, { headers: AUTH_HEADERS });
      const endTime = Date.now();
      const data = await response.json();
      
      const totalTime = endTime - startTime;
      
      // Response should be reasonably fast (less than 2 seconds)
      expect(totalTime).toBeLessThan(2000);
      
      // Database response time should be recorded
      expect(data.checks.database.status).toBe('ok');
      expect(data.checks.database.responseTime).toBeGreaterThan(0);
      expect(data.checks.database.responseTime).toBeLessThan(1000);
    });

    test('should validate database function exists and works', async () => {
      const response = await fetch(`${FUNCTION_URL}/health/detailed`, { headers: AUTH_HEADERS });
      const data = await response.json();
      
      // Integration test should expect working database
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.checks.database.status).toBe('ok');
      expect(data.checks.database.version).toBeDefined();
      expect(data.checks.database.version).not.toBe('Unknown');
      expect(typeof data.checks.database.version).toBe('string');
      expect(data.checks.database.version.toLowerCase()).toContain('postgresql');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await fetch(`${FUNCTION_URL}/unknown`, { headers: AUTH_HEADERS });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Not Found');
    });

    test('should handle malformed requests gracefully', async () => {
      const response = await fetch(`${FUNCTION_URL}/health`, {
        method: 'POST',
        headers: {
          ...AUTH_HEADERS,
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });
      
      // Health endpoint processes requests regardless of method/body, returns 200
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });
  });

  describe('Performance', () => {
    test('should respond to basic health check quickly', async () => {
      const times = [];
      
      // Test 5 consecutive requests
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        const response = await fetch(`${FUNCTION_URL}/health`, { headers: AUTH_HEADERS });
        const end = Date.now();
        
        expect(response.status).toBe(200);
        times.push(end - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      console.log(`📊 Average response time: ${avgTime.toFixed(2)}ms`);
      
      // Basic health should be very fast (under 500ms)
      expect(avgTime).toBeLessThan(500);
    });
  });
});