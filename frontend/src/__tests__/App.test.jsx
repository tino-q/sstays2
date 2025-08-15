/**
 * Frontend unit tests for the main App component with authentication
 * Tests the core routing and authentication structure
 */

import { render, screen } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import App from "../App";
import { FrontendTestHelper, MockComponents } from "./test-utils";

// Mock the auth context
const mockUseAuth = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => mockUseAuth(),
}));

// Mock react-router-dom since App already has Router
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  BrowserRouter: ({ children }) => {
    const { MemoryRouter } = jest.requireActual("react-router-dom");
    return (
      <MemoryRouter initialEntries={["/"]}>
        <div data-testid="browser-router">{children}</div>
      </MemoryRouter>
    );
  },
}));

// Mock components using utilities
jest.mock("../components/ProtectedRoute", () => {
  return function MockProtectedRoute({ children }) {
    return <div data-testid="protected-route">{children}</div>;
  };
});

jest.mock("../components/Navigation", () => {
  return function MockNavigation() {
    return <div data-testid="navigation">Navigation Component</div>;
  };
});

jest.mock("../components/HealthCheck", () => {
  return function MockHealthCheck() {
    return <div data-testid="health-check">Health Check Component</div>;
  };
});

jest.mock("../components/AdminRoute", () => {
  return function MockAdminRoute({ children }) {
    return <div data-testid="admin-route">{children}</div>;
  };
});

jest.mock("../components/AdminReservationForm", () => {
  return function MockAdminReservationForm() {
    return <div data-testid="admin-form">Admin Form Component</div>;
  };
});

jest.mock("../components/AdminTaskView", () => {
  return function MockAdminTaskView() {
    return <div data-testid="admin-task-view">Admin Task View Component</div>;
  };
});

jest.mock("../components/CleanerTaskView", () => {
  return function MockCleanerTaskView() {
    return <div data-testid="cleaner-task-view">Cleaner Task View Component</div>;
  };
});

jest.mock("../components/AuthCallback", () => {
  return function MockAuthCallback() {
    return <div data-testid="auth-callback">Auth Callback Component</div>;
  };
});

describe("App Component", () => {
  let testHelper;

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("should render dashboard route with navigation and content", () => {
    const user = FrontendTestHelper.createMockUser();
    mockUseAuth.mockReturnValue({
      user,
      loading: false,
    });

    render(<App />);

    expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
    expect(screen.getByTestId("navigation")).toBeInTheDocument();
  });

  test("should handle authentication loading state", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().loading,
    });

    render(<App />);

    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });

  test("should handle unauthenticated state", () => {
    mockUseAuth.mockReturnValue({
      ...FrontendTestHelper.createAuthStates().unauthenticated,
    });

    render(<App />);

    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
  });

  test("should render app structure correctly", () => {
    const user = FrontendTestHelper.createMockUser();
    mockUseAuth.mockReturnValue({
      user,
      loading: false,
    });

    render(<App />);

    expect(screen.getByTestId("browser-router")).toBeInTheDocument();
  });




});
