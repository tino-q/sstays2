/**
 * Frontend unit tests for the health check component
 * These tests mock the backend API and test React component behavior
 */

import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { describe, test, expect, beforeEach } from "@jest/globals";
import App from "../App";

// Mock fetch globally
global.fetch = jest.fn();

describe("App Component - Health Check Page", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe("Page Rendering", () => {
    test("renders health check title", () => {
      // Mock loading state - no fetch calls complete yet
      fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<App />);

      expect(screen.getByText("🏥 Health Check")).toBeInTheDocument();
    });

    test("renders basic structure elements", () => {
      fetch.mockImplementation(() => new Promise(() => {}));

      render(<App />);

      // Should have main container
      expect(screen.getByText("🏥 Health Check")).toBeInTheDocument();
      // Should show loading initially
      expect(screen.getByText("Loading health status...")).toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    test("shows loading state initially", () => {
      // Mock loading state
      fetch.mockImplementation(() => new Promise(() => {}));

      render(<App />);

      expect(screen.getByText("Loading health status...")).toBeInTheDocument();
    });
  });

  describe("Successful Health Check Response", () => {
    test("displays health data when backend is healthy", async () => {
      // Mock successful API response
      const mockHealthData = {
        status: "ok",
        service: "cleaning-management-api",
        version: "1.0.0",
        timestamp: "2024-01-01T12:00:00.000Z",
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      await act(async () => {
        render(<App />);
      });

      // Wait for API call to complete and verify health data is displayed
      await waitFor(() => {
        expect(
          screen.getByText(JSON.stringify(mockHealthData))
        ).toBeInTheDocument();
      });

      // Verify basic page structure
      expect(screen.getByText("🏥 Health Check")).toBeInTheDocument();
    });

    test("correctly calls backend health endpoint", async () => {
      // Mock successful response
      const mockData = {
        status: "ok",
        service: "test",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      // Verify correct API endpoint is called
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/health"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer /),
          }),
        })
      );
    });
  });

  describe("Error Handling", () => {
    test("displays error state when API fails", async () => {
      // Mock failed API response
      fetch.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText("❌ Error")).toBeInTheDocument();
      });

      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    test("handles backend returning error status", async () => {
      // Mock backend returning error response
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText("❌ Error")).toBeInTheDocument();
      });

      // Should still show the page structure but with error indicators
      expect(screen.getByText("🏥 Health Check")).toBeInTheDocument();
      expect(screen.getByText("HTTP error! status: 500")).toBeInTheDocument();
    });
  });

  describe("Health Check Page Validation", () => {
    test("health check page renders completely when backend is OK", async () => {
      // This is the key test - comprehensive validation that health check page works
      const mockHealthData = {
        status: "ok",
        service: "cleaning-management-api",
        version: "1.0.0",
        timestamp: "2024-01-01T12:00:00.000Z",
        checks: {
          database: {
            status: "ok",
            responseTime: 45,
            timestamp: "2024-01-01T12:00:00.000Z",
            version: "PostgreSQL 15.1",
          },
          supabase: {
            status: "ok",
            responseTime: "23ms",
          },
          environment: {
            status: "ok",
            message: "All required environment variables are set",
          },
        },
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockHealthData,
      });

      await act(async () => {
        render(<App />);
      });

      // Wait for full page to load
      await waitFor(() => {
        expect(
          screen.getByText(JSON.stringify(mockHealthData))
        ).toBeInTheDocument();
      });

      // Comprehensive validation of health check page
      // 1. Page structure
      expect(screen.getByText("🏥 Health Check")).toBeInTheDocument();

      // 2. Health data is displayed as JSON
      expect(
        screen.getByText(JSON.stringify(mockHealthData))
      ).toBeInTheDocument();

      // 3. API call was made correctly
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/health"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer /),
          }),
        })
      );

      console.log("✅ Health check page validation: PASSED");
    });
  });
});
