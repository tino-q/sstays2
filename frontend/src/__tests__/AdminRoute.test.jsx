import { render, screen } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import AdminRoute from "../components/AdminRoute";
import { FrontendTestHelper } from "./test-utils";

// Mock the auth context
const mockUseAuth = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("AdminRoute", () => {
  let testHelper;
  const TestComponent = () => <div>Admin Content</div>;

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("renders children for admin users", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().authenticatedAdmin,
      user: FrontendTestHelper.createMockAdminUser(),
    });

    render(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  test("shows access denied for non-admin users", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().authenticatedUser,
    });

    render(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByText("🚫 Admin Access Required")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  test("shows loading state during admin check", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().adminLoading,
    });

    render(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByText("Checking admin access...")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  test("shows auth required for unauthenticated users", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().unauthenticated,
    });

    render(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByText("❌ Authentication Required")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });
});