/**
 * Frontend unit tests for the health check component
 * These tests mock the backend API and test React component behavior
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach } from '@jest/globals';
import App from '../App';

// Mock fetch globally
global.fetch = jest.fn();

describe('App Component - Health Check Page', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Page Rendering', () => {
    test('renders health check title', () => {
      // Mock loading state - no fetch calls complete yet
      fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<App />);
      
      expect(screen.getByText('🏥 Health Check')).toBeInTheDocument();
    });

    test('renders basic structure elements', () => {
      fetch.mockImplementation(() => new Promise(() => {}));

      render(<App />);
      
      // Should have main container
      expect(screen.getByText('🏥 Health Check')).toBeInTheDocument();
      // Should show loading initially
      expect(screen.getByText('Loading health status...')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('shows loading state initially', () => {
      // Mock loading state
      fetch.mockImplementation(() => new Promise(() => {}));

      render(<App />);
      
      expect(screen.getByText('Loading health status...')).toBeInTheDocument();
    });
  });

  describe('Successful Health Check Response', () => {
    test('displays complete health page when backend is healthy', async () => {
      // Mock successful API responses that mimic real backend
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'ok',
            service: 'cleaning-management-api',
            version: '1.0.0',
            timestamp: '2024-01-01T12:00:00.000Z'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'ok',
            service: 'cleaning-management-api',
            version: '1.0.0',
            timestamp: '2024-01-01T12:00:00.000Z',
            checks: {
              database: {
                status: 'ok',
                responseTime: 45,
                timestamp: '2024-01-01T12:00:00.000Z',
                version: 'PostgreSQL 15.1'
              },
              supabase: {
                status: 'ok',
                responseTime: '23ms'
              },
              environment: {
                status: 'ok',
                message: 'All required environment variables are set'
              }
            }
          })
        });

      render(<App />);

      // Wait for API calls to complete and verify health page is rendered correctly
      await waitFor(() => {
        expect(screen.getAllByText('✅ OK')).toHaveLength(2); // Basic + Detailed status
      });

      // Verify complete health page structure
      expect(screen.getByText('🏥 Health Check')).toBeInTheDocument();
      expect(screen.getByText('📊 Basic Status')).toBeInTheDocument();
      expect(screen.getByText('🔍 Detailed Status')).toBeInTheDocument();

      // Check basic health info
      expect(screen.getByText('cleaning-management-api')).toBeInTheDocument();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();

      // Check detailed health info shows all components
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Supabase')).toBeInTheDocument();
      expect(screen.getByText('Environment')).toBeInTheDocument();
      expect(screen.getByText('Response time: 23ms')).toBeInTheDocument();
      expect(screen.getByText('All required environment variables are set')).toBeInTheDocument();

      // Verify refresh button is present
      expect(screen.getByText('🔄 Refresh')).toBeInTheDocument();
    });

    test('correctly calls backend health endpoints', async () => {
      // Mock successful responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok', service: 'test', version: '1.0.0', timestamp: new Date().toISOString() })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok', service: 'test', version: '1.0.0', timestamp: new Date().toISOString(), checks: {} })
        });

      render(<App />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      // Verify correct API endpoints are called (these should match the backend routes)
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/health', expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /)
        })
      }));
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/health/detailed', expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /)
        })
      }));
    });
  });

  describe('Error Handling', () => {
    test('displays error state when API fails', async () => {
      // Mock failed API response
      fetch.mockRejectedValue(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument();
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    test('handles backend returning error status', async () => {
      // Mock backend returning error response  
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'ok',
            service: 'cleaning-management-api',
            version: '1.0.0',
            timestamp: '2024-01-01T12:00:00.000Z'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'error',
            service: 'cleaning-management-api',
            version: '1.0.0', 
            timestamp: '2024-01-01T12:00:00.000Z',
            checks: {
              database: {
                status: 'error',
                error: 'Connection failed'
              },
              supabase: {
                status: 'ok',
                responseTime: '23ms'
              },
              environment: {
                status: 'ok',
                message: 'All required environment variables are set'
              }
            }
          })
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('❌ ERROR')).toBeInTheDocument();
      });

      // Should still show the page structure but with error indicators
      expect(screen.getByText('🏥 Health Check')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('refresh button triggers page reload', async () => {
      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });

      // Mock successful API response
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok', service: 'test', version: '1.0.0', timestamp: new Date().toISOString() })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok', service: 'test', version: '1.0.0', timestamp: new Date().toISOString(), checks: {} })
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('🔄 Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('🔄 Refresh');
      refreshButton.click();

      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Health Check Page Validation', () => {
    test('health check page renders completely when backend is OK', async () => {
      // This is the key test - comprehensive validation that health check page works
      const mockHealthResponse = {
        status: 'ok',
        service: 'cleaning-management-api',
        version: '1.0.0',
        timestamp: '2024-01-01T12:00:00.000Z'
      };

      const mockDetailedResponse = {
        status: 'ok',
        service: 'cleaning-management-api',
        version: '1.0.0',
        timestamp: '2024-01-01T12:00:00.000Z',
        checks: {
          database: {
            status: 'ok',
            responseTime: 45,
            timestamp: '2024-01-01T12:00:00.000Z',
            version: 'PostgreSQL 15.1'
          },
          supabase: {
            status: 'ok',
            responseTime: '23ms'
          },
          environment: {
            status: 'ok',
            message: 'All required environment variables are set'
          }
        }
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHealthResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDetailedResponse
        });

      render(<App />);

      // Wait for full page to load
      await waitFor(() => {
        expect(screen.getAllByText('✅ OK')).toHaveLength(2); // Basic + Detailed status
      });

      // Comprehensive validation of health check page
      // 1. Page structure
      expect(screen.getByText('🏥 Health Check')).toBeInTheDocument();
      expect(screen.getByText('📊 Basic Status')).toBeInTheDocument();
      expect(screen.getByText('🔍 Detailed Status')).toBeInTheDocument();
      
      // 2. Basic health data
      expect(screen.getByText('Service:')).toBeInTheDocument();
      expect(screen.getByText('cleaning-management-api')).toBeInTheDocument();
      expect(screen.getByText('Version:')).toBeInTheDocument();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
      
      // 3. Detailed health checks - all services
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Supabase')).toBeInTheDocument();
      expect(screen.getByText('Environment')).toBeInTheDocument();
      
      // 4. Database response time (proves backend integration)
      expect(screen.getByText('Response time: 45')).toBeInTheDocument();
      
      // 5. All status indicators are green
      const successIndicators = screen.getAllByText('✅');
      expect(successIndicators.length).toBeGreaterThanOrEqual(3); // Basic + 3 detailed checks
      
      // 6. Interactive elements
      expect(screen.getByText('🔄 Refresh')).toBeInTheDocument();
      
      // 7. API calls were made correctly
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/health', expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /)
        })
      }));
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/health/detailed', expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /)
        })
      }));
      expect(fetch).toHaveBeenCalledTimes(2);
      
      console.log('✅ Health check page validation: PASSED');
    });
  });
});