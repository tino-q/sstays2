import { screen, fireEvent } from "@testing-library/react";
import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
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
    const user = FrontendTestHelper.createMockUser({
      email: "user@example.com",
    });
    mockUseAuth.mockReturnValue({
      user,
      signOut: mockSignOut,
      isAdmin: false,
      isCleaner: false,
    });

    testHelper.renderWithProviders(<Navigation />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Health Check")).toBeInTheDocument();
    expect(screen.queryByText("Reservations")).not.toBeInTheDocument();
    expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
    expect(screen.queryByText("My Tasks")).not.toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  test("shows admin links for admin users", () => {
    const adminUser = FrontendTestHelper.createMockAdminUser();
    mockUseAuth.mockReturnValue({
      user: adminUser,
      signOut: mockSignOut,
      isAdmin: true,
      isCleaner: false,
    });

    testHelper.renderWithProviders(<Navigation />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Health Check")).toBeInTheDocument();
    expect(screen.getByText("Reservations")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.queryByText("My Tasks")).not.toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  test("highlights active link correctly", () => {
    const user = FrontendTestHelper.createMockUser({
      email: "user@example.com",
    });
    mockUseAuth.mockReturnValue({
      user,
      signOut: mockSignOut,
      isAdmin: false,
      isCleaner: false,
    });

    testHelper.renderWithProviders(<Navigation />, {
      initialEntries: ["/healthcheck"],
    });

    const healthLink = screen.getByText("Health Check").closest("a");
    const dashboardLink = screen.getByText("Dashboard").closest("a");

    expect(healthLink).toHaveClass("active");
    expect(dashboardLink).not.toHaveClass("active");
  });

  test("calls signOut when sign out button is clicked", () => {
    const user = FrontendTestHelper.createMockUser({
      email: "user@example.com",
    });
    mockUseAuth.mockReturnValue({
      user,
      signOut: mockSignOut,
      isAdmin: false,
      isCleaner: false,
    });

    testHelper.renderWithProviders(<Navigation />);

    const signOutButton = screen.getByText("Sign Out");
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  test("shows cleaner task link for cleaner users", () => {
    const cleanerUser = FrontendTestHelper.createMockUser({
      email: "cleaner@example.com",
    });
    mockUseAuth.mockReturnValue({
      user: cleanerUser,
      signOut: mockSignOut,
      isAdmin: false,
      isCleaner: true,
    });

    testHelper.renderWithProviders(<Navigation />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Health Check")).toBeInTheDocument();
    expect(screen.getByText("My Tasks")).toBeInTheDocument();
    expect(screen.queryByText("Reservations")).not.toBeInTheDocument();
    expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
    expect(screen.getByText("Cleaner")).toBeInTheDocument();
  });

  test("shows both admin and cleaner links for admin-cleaner users", () => {
    const adminCleanerUser = FrontendTestHelper.createMockAdminUser();
    mockUseAuth.mockReturnValue({
      user: adminCleanerUser,
      signOut: mockSignOut,
      isAdmin: true,
      isCleaner: true,
    });

    testHelper.renderWithProviders(<Navigation />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Health Check")).toBeInTheDocument();
    expect(screen.getByText("Reservations")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("My Tasks")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Cleaner")).toBeInTheDocument();
  });
});
