// AuthContext.test.jsx
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { FrontendTestHelper } from "./test-utils";

// Mocks for environment config
jest.mock("../utils/environment", () => ({
  getEnvironmentConfig: () => ({
    useLocal: false,
    supabaseUrl: "https://test.supabase.co",
    supabaseAnonKey: "anon-key",
  }),
}));

// Mock Supabase client - simplified
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithOAuth: jest.fn().mockResolvedValue({ error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest
            .fn()
            .mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
        })),
      })),
    })),
  })),
}));

// Now import after mocks
import { AuthProvider, useAuth } from "../contexts/AuthContext";

const TestConsumer = () => {
  const {
    user,
    loading,
    isAdmin,
    adminLoading,
    getAccessToken,
    signInWithGoogle,
    signOut,
    checkAdminStatus,
    supabase,
  } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? user.id : "null"}</div>
      <div data-testid="loading">{loading ? "true" : "false"}</div>
      <div data-testid="isAdmin">{isAdmin ? "true" : "false"}</div>
      <div data-testid="adminLoading">{adminLoading ? "true" : "false"}</div>
      <button onClick={() => signInWithGoogle()}>SignIn</button>
      <button onClick={() => signOut()}>SignOut</button>
      <button
        onClick={async () => {
          const token = await getAccessToken();
          // expose for test
          document.body.dataset.token = token ?? "null";
        }}
      >
        GetToken
      </button>
      <button
        onClick={async () => {
          await checkAdminStatus("user-foo");
        }}
      >
        CheckAdmin
      </button>
      <div data-testid="supabase-ref" style={{ display: "none" }}>
        {/* Store supabase ref for test access */}
        {JSON.stringify({ hasSupabase: !!supabase })}
      </div>
    </div>
  );
};

describe("AuthContext", () => {
  let testHelper;

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("initial state: loading then ready with no user", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // initial loading true
    expect(screen.getByTestId("loading").textContent).toBe("true");
    // resolve initial session
    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    // no user
    expect(screen.getByTestId("user").textContent).toBe("null");
    // isAdmin should be false
    expect(screen.getByTestId("isAdmin").textContent).toBe("false");
  });

  test("provides context values and functions", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Should have access to all context functions
    expect(screen.getByText("SignIn")).toBeInTheDocument();
    expect(screen.getByText("SignOut")).toBeInTheDocument();
    expect(screen.getByText("GetToken")).toBeInTheDocument();
    expect(screen.getByText("CheckAdmin")).toBeInTheDocument();
  });

  test("functions execute without errors", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );

    // Test all functions execute without throwing
    act(() => {
      screen.getByText("GetToken").click();
      screen.getByText("SignIn").click();
      screen.getByText("SignOut").click();
      screen.getByText("CheckAdmin").click();
    });

    // Should not crash and context should still be responsive
    expect(screen.getByTestId("isAdmin")).toBeInTheDocument();
  });
});
