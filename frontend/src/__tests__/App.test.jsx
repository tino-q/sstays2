/**
 * Frontend unit tests for the main App component with authentication
 * Tests the core routing and authentication structure
 */

import { render, screen } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import App from "../App";
import { FrontendTestHelper, MockComponents } from "./test-utils";

// Mock the auth context
const mockUseAuth = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => mockUseAuth(),
}));

// Mock components using utilities
jest.mock("../components/ProtectedRoute", () => {
  return function MockProtectedRoute({ children }) {
    return <div data-testid="protected-route">{children}</div>;
  };
});

jest.mock("../components/Navigation", () => {
  return function MockNavigation() {
    return <div data-testid="navigation">Navigation Component</div>;
  };
});

jest.mock("../components/HealthCheck", () => {
  return function MockHealthCheck() {
    return <div data-testid="health-check">Health Check Component</div>;
  };
});

jest.mock("../components/AdminRoute", () => {
  return function MockAdminRoute({ children }) {
    return <div data-testid="admin-route">{children}</div>;
  };
});

jest.mock("../components/AdminReservationForm", () => {
  return function MockAdminReservationForm() {
    return <div data-testid="admin-form">Admin Form Component</div>;
  };
});

jest.mock("../components/AuthCallback", () => {
  return function MockAuthCallback() {
    return <div data-testid="auth-callback">Auth Callback Component</div>;
  };
});

describe("App Component", () => {
  let testHelper;

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("should render main route with navigation and placeholder", () => {
    const user = FrontendTestHelper.createMockUser();
    mockUseAuth.mockReturnValue({
      user,
      loading: false,
    });

    render(<App />);

    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
    expect(screen.getByTestId("navigation")).toBeInTheDocument();
    expect(screen.getByText("Main view placeholder")).toBeInTheDocument();
  });

  test("should handle authentication loading state", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().loading,
    });

    render(<App />);

    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });

  test("should handle unauthenticated state", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().unauthenticated,
    });

    render(<App />);

    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });
});
