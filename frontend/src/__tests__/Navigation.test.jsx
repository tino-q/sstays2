import { screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import Navigation from "../components/Navigation";
import { FrontendTestHelper } from "./test-utils";

// Mock the auth context
const mockUseAuth = jest.fn();
const mockSignOut = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Navigation", () => {
  let testHelper;

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
    mockSignOut.mockClear();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("renders navigation links for regular users", () => {
    const user = FrontendTestHelper.createMockUser({ email: "user@example.com" });
    mockUseAuth.mockReturnValue({
      user,
      signOut: mockSignOut,
      isAdmin: false,
    });

    testHelper.renderWithRouter(<Navigation />);

    expect(screen.getByText("📋 Reservations")).toBeInTheDocument();
    expect(screen.getByText("🏥 Health Check")).toBeInTheDocument();
    expect(screen.queryByText("🔧 Admin")).not.toBeInTheDocument();
    expect(screen.getByText("Welcome, user@example.com")).toBeInTheDocument();
  });

  test("shows admin link for admin users", () => {
    const adminUser = FrontendTestHelper.createMockAdminUser();
    mockUseAuth.mockReturnValue({
      user: adminUser,
      signOut: mockSignOut,
      isAdmin: true,
    });

    testHelper.renderWithRouter(<Navigation />);

    expect(screen.getByText("📋 Reservations")).toBeInTheDocument();
    expect(screen.getByText("🏥 Health Check")).toBeInTheDocument();
    expect(screen.getByText("🔧 Admin")).toBeInTheDocument();
  });

  test("highlights active link correctly", () => {
    const user = FrontendTestHelper.createMockUser({ email: "user@example.com" });
    mockUseAuth.mockReturnValue({
      user,
      signOut: mockSignOut,
      isAdmin: false,
    });

    testHelper.renderWithRouter(<Navigation />, {
      initialEntries: ["/healthcheck"]
    });

    const healthLink = screen.getByText("🏥 Health Check").closest("a");
    const reservationsLink = screen.getByText("📋 Reservations").closest("a");

    expect(healthLink).toHaveClass("active");
    expect(reservationsLink).not.toHaveClass("active");
  });

  test("calls signOut when sign out button is clicked", () => {
    const user = FrontendTestHelper.createMockUser({ email: "user@example.com" });
    mockUseAuth.mockReturnValue({
      user,
      signOut: mockSignOut,
      isAdmin: false,
    });

    testHelper.renderWithRouter(<Navigation />);

    const signOutButton = screen.getByText("Sign Out");
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});