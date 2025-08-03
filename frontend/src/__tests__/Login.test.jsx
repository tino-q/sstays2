/**
 * Frontend unit tests for the Login component
 * Tests Google OAuth login functionality and UI interactions
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import Login from "../components/Login";

// Mock the auth context
const mockSignInWithGoogle = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    signInWithGoogle: mockSignInWithGoogle,
    loading: false,
  }),
}));

describe("Login Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("should render login page with correct title", () => {
      render(<Login />);

      expect(
        screen.getByText("🔐 Authentication Required")
      ).toBeInTheDocument();
    });

    test("should render login description", () => {
      render(<Login />);

      expect(
        screen.getByText("Please sign in to access the health check system.")
      ).toBeInTheDocument();
    });

    test("should render Google sign-in button", () => {
      render(<Login />);

      const signInButton = screen.getByRole("button", {
        name: /sign in with google/i,
      });
      expect(signInButton).toBeInTheDocument();
    });

    test("should render Google icon in button", () => {
      render(<Login />);

      const signInButton = screen.getByRole("button", {
        name: /sign in with google/i,
      });
      const svg = signInButton.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    test("should render security note", () => {
      render(<Login />);

      expect(
        screen.getByText(
          /This system uses Google OAuth for secure authentication/
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No passwords are stored locally/)
      ).toBeInTheDocument();
    });
  });

  describe("Button States", () => {
    test("should be enabled when not loading", () => {
      render(<Login />);

      const signInButton = screen.getByRole("button", {
        name: /sign in with google/i,
      });
      expect(signInButton).not.toBeDisabled();
    });
  });

  describe("User Interactions", () => {
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

  describe("Accessibility", () => {
    test("should have proper button role and accessible name", () => {
      render(<Login />);

      const signInButton = screen.getByRole("button", {
        name: /sign in with google/i,
      });
      expect(signInButton).toBeInTheDocument();
    });
  });

  describe("Styling and Layout", () => {
    test("should have proper CSS classes", () => {
      render(<Login />);

      expect(
        screen.getByText("🔐 Authentication Required").closest(".card")
      ).toBeInTheDocument();
      expect(
        screen.getByText("🔐 Authentication Required").closest(".container")
      ).toBeInTheDocument();

      const signInButton = screen.getByRole("button", {
        name: /sign in with google/i,
      });
      expect(signInButton).toHaveClass("google-signin-btn");
    });

    test("should have proper container structure", () => {
      render(<Login />);

      const container = screen
        .getByText("🔐 Authentication Required")
        .closest(".container");
      const card = container?.querySelector(".card");
      const loginContent = card?.querySelector(".login-content");

      expect(container).toBeInTheDocument();
      expect(card).toBeInTheDocument();
      expect(loginContent).toBeInTheDocument();
    });
  });

  describe("Security Information", () => {
    test("should display security note about OAuth", () => {
      render(<Login />);

      const securityNote = screen.getByText(
        /This system uses Google OAuth for secure authentication/
      );
      expect(securityNote).toBeInTheDocument();
    });

    test("should mention no local password storage", () => {
      render(<Login />);

      const passwordNote = screen.getByText(/No passwords are stored locally/);
      expect(passwordNote).toBeInTheDocument();
    });

    test("should have security note in info box", () => {
      render(<Login />);

      const infoBox = screen
        .getByText(/This system uses Google OAuth/)
        .closest(".login-info");
      expect(infoBox).toBeInTheDocument();
    });
  });
});
