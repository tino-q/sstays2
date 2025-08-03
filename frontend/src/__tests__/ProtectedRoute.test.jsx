/**
 * Frontend unit tests for the ProtectedRoute component
 * Tests authentication-based route protection
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import ProtectedRoute from "../components/ProtectedRoute";

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    test("should show loading state when authentication is loading", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
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

    test("should show loading message with correct styling", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      const loadingElement = screen.getByText("Loading authentication...");
      expect(loadingElement.closest(".loading")).toBeInTheDocument();
    });
  });

  describe("Unauthenticated State", () => {
    test("should render Login component when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId("login-component")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    test("should not show loading state when not loading and not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(
        screen.queryByText("Loading authentication...")
      ).not.toBeInTheDocument();
    });
  });

  describe("Authenticated State", () => {
    test("should render children when user is authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
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

    test("should render complex children components", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      const ComplexComponent = () => (
        <div>
          <h1>Complex Component</h1>
          <p>This is a complex component with multiple elements</p>
          <button>Click me</button>
        </div>
      );

      render(
        <ProtectedRoute>
          <ComplexComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText("Complex Component")).toBeInTheDocument();
      expect(
        screen.getByText("This is a complex component with multiple elements")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Click me" })
      ).toBeInTheDocument();
    });
  });

  describe("State Transitions", () => {
    test("should transition from loading to authenticated", async () => {
      const { rerender } = render(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      // Initial loading state
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      expect(screen.getByText("Loading authentication...")).toBeInTheDocument();

      // Transition to authenticated
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      rerender(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });

      expect(
        screen.queryByText("Loading authentication...")
      ).not.toBeInTheDocument();
    });

    test("should transition from loading to unauthenticated", async () => {
      const { rerender } = render(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      // Initial loading state
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      expect(screen.getByText("Loading authentication...")).toBeInTheDocument();

      // Transition to unauthenticated
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      rerender(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByTestId("login-component")).toBeInTheDocument();
      });

      expect(
        screen.queryByText("Loading authentication...")
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("should handle undefined user object", () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        loading: false,
      });

      render(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId("login-component")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    test("should handle null children", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      render(<ProtectedRoute>{null}</ProtectedRoute>);

      // Should not crash and should not show login
      expect(screen.queryByTestId("login-component")).not.toBeInTheDocument();
    });

    test("should handle empty children", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      render(<ProtectedRoute>{}</ProtectedRoute>);

      // Should not crash and should not show login
      expect(screen.queryByTestId("login-component")).not.toBeInTheDocument();
    });
  });

  describe("Styling and Layout", () => {
    test("should maintain consistent styling during loading", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      const container = screen
        .getByText("🏥 Health Check")
        .closest(".container");
      const card = container?.querySelector(".card");

      expect(container).toBeInTheDocument();
      expect(card).toBeInTheDocument();
    });

    test("should have proper loading message styling", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      const loadingElement = screen.getByText("Loading authentication...");
      expect(loadingElement.closest(".loading")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    test("should not re-render unnecessarily when props don't change", () => {
      const MockChild = jest.fn(() => (
        <div data-testid="protected-content">Protected Content</div>
      ));

      mockUseAuth.mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
      });

      const { rerender } = render(
        <ProtectedRoute>
          <MockChild />
        </ProtectedRoute>
      );

      const initialRenderCount = MockChild.mock.calls.length;

      // Re-render with same props
      rerender(
        <ProtectedRoute>
          <MockChild />
        </ProtectedRoute>
      );

      expect(MockChild.mock.calls.length).toBe(initialRenderCount);
    });
  });
});
