/**
 * Frontend unit tests for the main App component with authentication
 * Tests the core routing and authentication structure
 */

import { render, screen } from "@testing-library/react";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import App from "../App";

// Mock the auth context
const mockUseAuth = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
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

// Mock the AuthCallback component
jest.mock("../components/AuthCallback", () => {
  return function MockAuthCallback() {
    return <div data-testid="auth-callback">Auth Callback Component</div>;
  };
});

describe("App Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render with proper routing structure", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-123", email: "test@example.com" },
      loading: false,
    });

    render(<App />);

    // Should render the main protected route
    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
    expect(screen.getByTestId("health-check")).toBeInTheDocument();
  });

  test("should handle authentication loading state", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(<App />);

    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });

  test("should handle unauthenticated state", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<App />);

    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });
});
