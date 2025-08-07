/**
 * Frontend unit tests for the ProtectedRoute component
 * Tests authentication-based route protection
 */

import { render, screen } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import ProtectedRoute from "../components/ProtectedRoute";
import { FrontendTestHelper, MockComponents } from "./test-utils";

// Mock the auth context
const mockUseAuth = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the Login component
jest.mock("../components/Login", () => {
  return function MockLogin() {
    return <div data-testid="login-component">Login Component</div>;
  };
});

describe("ProtectedRoute Component", () => {
  let testHelper;

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("should show loading state when authentication is loading", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().loading,
    });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("🏥 Health Check")).toBeInTheDocument();
    expect(screen.getByText("Loading authentication...")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.queryByTestId("login-component")).not.toBeInTheDocument();
  });

  test("should render Login component when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().unauthenticated,
    });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId("login-component")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  test("should render children when user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().authenticatedUser,
    });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.queryByTestId("login-component")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Loading authentication...")
    ).not.toBeInTheDocument();
  });
});
