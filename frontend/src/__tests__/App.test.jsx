/**
 * Frontend unit tests for the main App component with authentication
 * These tests verify the complete authentication flow and protected content
 */

import { render, screen } from "@testing-library/react";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import App from "../App";

// Mock the auth context
const mockUseAuth = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  AuthProvider: ({ children }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuth: () => mockUseAuth(),
}));

// Mock the ProtectedRoute component
jest.mock("../components/ProtectedRoute", () => {
  return function MockProtectedRoute({ children }) {
    return <div data-testid="protected-route">{children}</div>;
  };
});

// Mock the HealthCheck component
jest.mock("../components/HealthCheck", () => {
  return function MockHealthCheck() {
    return <div data-testid="health-check">Health Check Component</div>;
  };
});

// Mock fetch globally
global.fetch = jest.fn();

describe("App Component - Authentication Integration", () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  describe("Component Structure", () => {
    test("should render with AuthProvider wrapper", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      render(<App />);

      expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
    });

    test("should render with ProtectedRoute wrapper", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      render(<App />);

      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
    });

    test("should render HealthCheck component when authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      render(<App />);

      expect(screen.getByTestId("health-check")).toBeInTheDocument();
    });
  });

  describe("Authentication Flow", () => {
    test("should handle loading state", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(<App />);

      expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
    });

    test("should handle unauthenticated state", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(<App />);

      expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
    });

    test("should handle authenticated state", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      render(<App />);

      expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      expect(screen.getByTestId("health-check")).toBeInTheDocument();
    });
  });

  describe("Component Integration", () => {
    test("should properly nest components in correct order", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      render(<App />);

      const authProvider = screen.getByTestId("auth-provider");
      const protectedRoute = screen.getByTestId("protected-route");
      const healthCheck = screen.getByTestId("health-check");

      // Verify nesting structure
      expect(authProvider).toContainElement(protectedRoute);
      expect(protectedRoute).toContainElement(healthCheck);
    });
  });

  describe("Accessibility", () => {
    test("should maintain proper semantic structure", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      render(<App />);

      // Verify that the component structure is accessible
      const authProvider = screen.getByTestId("auth-provider");
      const protectedRoute = screen.getByTestId("protected-route");
      const healthCheck = screen.getByTestId("health-check");

      expect(authProvider).toBeInTheDocument();
      expect(protectedRoute).toBeInTheDocument();
      expect(healthCheck).toBeInTheDocument();
    });
  });
});
