/**
 * Unit tests for health service business logic
 * These tests mock external dependencies and focus on pure logic
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// Import the health service logic
// Note: We'll need to adapt this from TypeScript to JavaScript for Jest
const healthService = {
  getBasicHealth: () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cleaning-management-api',
    version: '1.0.0'
  }),

  getDetailedHealth: async (mockSupabaseClient) => {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cleaning-management-api',
      version: '1.0.0',
      checks: {}
    };

    let hasErrors = false;

    // Check database connection
    try {
      const startTime = Date.now();
      const { data, error } = await mockSupabaseClient.rpc('get_db_version');
      const responseTime = Date.now() - startTime;
      
      if (error) {
        throw error;
      }
      
      healthStatus.checks.database = {
        status: 'ok',
        responseTime,
        timestamp: new Date().toISOString(),
        version: data || 'Unknown'
      };
    } catch (error) {
      hasErrors = true;
      healthStatus.checks.database = {
        status: 'error',
        error: error.message
      };
    }

    // Check Supabase API connection
    try {
      const startTime = Date.now();
      const { data, error } = await mockSupabaseClient.auth.getSession();
      const responseTime = Date.now() - startTime;
      
      if (error) {
        throw error;
      }
      
      healthStatus.checks.supabase = {
        status: 'ok',
        responseTime: `${responseTime}ms`
      };
    } catch (error) {
      hasErrors = true;
      healthStatus.checks.supabase = {
        status: 'error',
        error: error.message
      };
    }

    // Check environment variables
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      hasErrors = true;
      healthStatus.checks.environment = {
        status: 'error',
        missing: missingEnvVars
      };
    } else {
      healthStatus.checks.environment = {
        status: 'ok',
        message: 'All required environment variables are set'
      };
    }

    // Overall status
    if (hasErrors) {
      healthStatus.status = 'error';
    }

    return healthStatus;
  }
};

describe('Health Service - Unit Tests', () => {
  describe('Basic Health Check', () => {
    test('should return correct basic health status', () => {
      const health = healthService.getBasicHealth();
      
      expect(health.status).toBe('ok');
      expect(health.service).toBe('cleaning-management-api');
      expect(health.version).toBe('1.0.0');
      expect(health.timestamp).toBeDefined();
      
      // Verify timestamp is a valid ISO string
      const timestamp = new Date(health.timestamp);
      expect(timestamp instanceof Date && !isNaN(timestamp.getTime())).toBe(true);
    });

    test('should return timestamp within last second', () => {
      const beforeTime = Date.now();
      const health = healthService.getBasicHealth();
      const afterTime = Date.now();
      
      const healthTime = new Date(health.timestamp).getTime();
      expect(healthTime).toBeGreaterThanOrEqual(beforeTime);
      expect(healthTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Detailed Health Check', () => {
    let mockSupabaseClient;

    beforeEach(() => {
      // Set up mock environment variables
      process.env.SUPABASE_URL = 'http://localhost:54321';
      process.env.SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    });

    test('should return healthy status when all checks pass', async () => {
      mockSupabaseClient = {
        rpc: jest.fn().mockResolvedValue({ 
          data: 'PostgreSQL 17.4 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit', 
          error: null 
        }),
        auth: {
          getSession: jest.fn().mockResolvedValue({ 
            data: { session: null }, 
            error: null 
          })
        }
      };

      const health = await healthService.getDetailedHealth(mockSupabaseClient);
      
      expect(health.status).toBe('ok');
      expect(health.service).toBe('cleaning-management-api');
      expect(health.checks.database.status).toBe('ok');
      expect(health.checks.database.version).toContain('PostgreSQL');
      expect(health.checks.supabase.status).toBe('ok');
      expect(health.checks.environment.status).toBe('ok');
      expect(health.checks.database.responseTime).toBeDefined();
      expect(health.checks.supabase.responseTime).toMatch(/\d+ms/);
    });

    test('should return error status when database check fails', async () => {
      mockSupabaseClient = {
        rpc: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Connection failed' } 
        }),
        auth: {
          getSession: jest.fn().mockResolvedValue({ 
            data: { session: null }, 
            error: null 
          })
        }
      };

      const health = await healthService.getDetailedHealth(mockSupabaseClient);
      
      expect(health.status).toBe('error');
      expect(health.checks.database.status).toBe('error');
      expect(health.checks.database.error).toBe('Connection failed');
      expect(health.checks.supabase.status).toBe('ok');
    });

    test('should return error status when auth check fails', async () => {
      mockSupabaseClient = {
        rpc: jest.fn().mockResolvedValue({ 
          data: 'PostgreSQL 17.4 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit', 
          error: null 
        }),
        auth: {
          getSession: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Auth service unavailable' } 
          })
        }
      };

      const health = await healthService.getDetailedHealth(mockSupabaseClient);
      
      expect(health.status).toBe('error');
      expect(health.checks.database.status).toBe('ok');
      expect(health.checks.supabase.status).toBe('error');
      expect(health.checks.supabase.error).toBe('Auth service unavailable');
    });

    test('should return error status when environment variables are missing', async () => {
      // Clear environment variables
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      mockSupabaseClient = {
        rpc: jest.fn().mockResolvedValue({ 
          data: 'PostgreSQL 17.4 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit', 
          error: null 
        }),
        auth: {
          getSession: jest.fn().mockResolvedValue({ 
            data: { session: null }, 
            error: null 
          })
        }
      };

      const health = await healthService.getDetailedHealth(mockSupabaseClient);
      
      expect(health.status).toBe('error');
      expect(health.checks.environment.status).toBe('error');
      expect(health.checks.environment.missing).toContain('SUPABASE_URL');
      expect(health.checks.environment.missing).toContain('SUPABASE_ANON_KEY');
    });

    test('should measure response time correctly', async () => {
      // Mock with delay
      mockSupabaseClient = {
        rpc: jest.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ data: 'PostgreSQL 17.4 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit', error: null }), 50)
          )
        ),
        auth: {
          getSession: jest.fn().mockResolvedValue({ 
            data: { session: null }, 
            error: null 
          })
        }
      };

      const health = await healthService.getDetailedHealth(mockSupabaseClient);
      
      expect(health.checks.database.responseTime).toBeGreaterThan(40);
      expect(health.checks.database.responseTime).toBeLessThan(100);
    });
  });
});