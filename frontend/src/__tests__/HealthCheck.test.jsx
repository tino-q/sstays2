import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import HealthCheck from "../components/HealthCheck";
import { FrontendTestHelper } from "./test-utils";

// Mock the auth context
const mockUseAuth = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("HealthCheck", () => {
  let testHelper;

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("shows loading state initially", () => {
    const user = FrontendTestHelper.createMockUser();
    mockUseAuth.mockReturnValue({
      user,
      getAccessToken: jest.fn().mockResolvedValue("mock-token"),
    });

    render(<HealthCheck />);

    expect(screen.getByText("🏥 Health Check")).toBeInTheDocument();
    expect(screen.getByText("Loading health status...")).toBeInTheDocument();
  });

  test("displays health data when loaded successfully", async () => {
    const mockHealthData = {
      status: "ok",
      timestamp: "2025-01-01T12:00:00Z",
      user: { email: "test@example.com" },
      checks: {
        database: { status: "ok", version: "14.0" },
        supabase: { status: "ok" },
        environment: { status: "ok" }
      }
    };

    const user = FrontendTestHelper.createMockUser();
    mockUseAuth.mockReturnValue({
      user,
      getAccessToken: jest.fn().mockResolvedValue("mock-token"),
    });

    testHelper.mockFetch(mockHealthData);

    render(<HealthCheck />);

    await waitFor(() => {
      expect(screen.getByText("System Status")).toBeInTheDocument();
    });

    expect(screen.getByText("✅ Healthy")).toBeInTheDocument();
  });

  test("shows error state with reload button for auth errors", async () => {
    const user = FrontendTestHelper.createMockUser();
    mockUseAuth.mockReturnValue({
      user,
      getAccessToken: jest.fn().mockResolvedValue("mock-token"),
    });

    testHelper.mockFetch({}, { ok: false, status: 401 });

    render(<HealthCheck />);

    await waitFor(() => {
      expect(screen.getByText("❌ Error")).toBeInTheDocument();
    });

    expect(screen.getByText("Authentication failed. Please sign in again.")).toBeInTheDocument();
    expect(screen.getByText("Reload Page")).toBeInTheDocument();
  });

  test("handles no access token error", async () => {
    const user = FrontendTestHelper.createMockUser();
    mockUseAuth.mockReturnValue({
      user,
      getAccessToken: jest.fn().mockResolvedValue(null),
    });

    render(<HealthCheck />);

    await waitFor(() => {
      expect(screen.getByText("No access token available")).toBeInTheDocument();
    });
  });
});