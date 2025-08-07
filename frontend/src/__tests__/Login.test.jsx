/**
 * Frontend unit tests for the Login component
 * Tests Google OAuth login functionality and core interactions
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import Login from "../components/Login";
import { FrontendTestHelper } from "./test-utils";

// Mock the auth context
const mockSignInWithGoogle = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    signInWithGoogle: mockSignInWithGoogle,
    loading: false,
  }),
}));

describe("Login Component", () => {
  let testHelper;

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("should render login page with correct content", () => {
    render(<Login />);

    expect(screen.getByText("🔐 Authentication Required")).toBeInTheDocument();
    expect(
      screen.getByText("Please sign in to access the health check system.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with google/i })
    ).toBeInTheDocument();
  });

  test("should call signInWithGoogle when button is clicked", async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined);

    render(<Login />);

    const signInButton = screen.getByRole("button", {
      name: /sign in with google/i,
    });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  test("should handle sign-in errors gracefully", async () => {
    const error = new Error("Sign in failed");
    mockSignInWithGoogle.mockRejectedValue(error);

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<Login />);

    const signInButton = screen.getByRole("button", {
      name: /sign in with google/i,
    });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Sign in error:", error);
    });

    consoleSpy.mockRestore();
  });
});
