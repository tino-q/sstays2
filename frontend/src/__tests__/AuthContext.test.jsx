/**
 * Frontend unit tests for the authentication context
 * Tests authentication state management and user interactions
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

// Mock Supabase client - define before jest.mock
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
  },
};

// Mock @supabase/supabase-js
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Test component to access auth context
const TestComponent = () => {
  const { user, loading, signInWithGoogle, signOut, getAccessToken } =
    useAuth();

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user ? user.email : "no-user"}</div>
      <button onClick={signInWithGoogle} data-testid="signin-btn">
        Sign In
      </button>
      <button onClick={signOut} data-testid="signout-btn">
        Sign Out
      </button>
      <button onClick={getAccessToken} data-testid="token-btn">
        Get Token
      </button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variables
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:5173" },
      writable: true,
    });
  });

  describe("Initial State", () => {
    test("should start with loading state", () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId("loading")).toHaveTextContent("true");
      expect(screen.getByTestId("user")).toHaveTextContent("no-user");
    });

    test("should initialize with existing session", async () => {
      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
      });

      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });
  });

  describe("Authentication Methods", () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });
    });

    test("should call signInWithGoogle with correct parameters", async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId("signin-btn").click();
      });

      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "http://localhost:5173",
        },
      });
    });

    test("should handle signInWithGoogle errors", async () => {
      const error = new Error("Sign in failed");
      mockSupabaseClient.auth.signInWithOAuth.mockRejectedValue(error);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId("signin-btn").click();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error signing in with Google:",
        error
      );
      consoleSpy.mockRestore();
    });

    test("should call signOut correctly", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId("signout-btn").click();
      });

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    test("should handle signOut errors", async () => {
      const error = new Error("Sign out failed");
      mockSupabaseClient.auth.signOut.mockRejectedValue(error);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId("signout-btn").click();
      });

      expect(consoleSpy).toHaveBeenCalledWith("Error signing out:", error);
      consoleSpy.mockRestore();
    });

    test("should get access token from session", async () => {
      const mockSession = {
        access_token: "test-access-token",
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId("token-btn").click();
      });

      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
    });
  });

  describe("Auth State Changes", () => {
    test("should handle auth state changes", async () => {
      let authStateCallback;

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation(
        (callback) => {
          authStateCallback = callback;
          return {
            data: { subscription: { unsubscribe: jest.fn() } },
          };
        }
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
      });

      // Simulate auth state change
      const mockUser = {
        id: "user-123",
        email: "newuser@example.com",
      };

      await act(async () => {
        authStateCallback("SIGNED_IN", { user: mockUser });
      });

      expect(screen.getByTestId("user")).toHaveTextContent(
        "newuser@example.com"
      );
    });

    test("should handle sign out state change", async () => {
      let authStateCallback;

      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation(
        (callback) => {
          authStateCallback = callback;
          return {
            data: { subscription: { unsubscribe: jest.fn() } },
          };
        }
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent(
          "test@example.com"
        );
      });

      // Simulate sign out
      await act(async () => {
        authStateCallback("SIGNED_OUT", null);
      });

      expect(screen.getByTestId("user")).toHaveTextContent("no-user");
    });
  });

  describe("Error Handling", () => {
    test("should handle getSession errors gracefully", async () => {
      const error = new Error("Session error");
      mockSupabaseClient.auth.getSession.mockRejectedValue(error);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error getting initial session:",
        error
      );
      consoleSpy.mockRestore();
    });

    test("should handle getAccessToken errors", async () => {
      const error = new Error("Token error");
      mockSupabaseClient.auth.getSession.mockRejectedValue(error);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId("token-btn").click();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error getting access token:",
        error
      );
      consoleSpy.mockRestore();
    });
  });

  describe("Context Usage", () => {
    test("should throw error when useAuth is used outside provider", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleSpy.mockRestore();
    });
  });
});
