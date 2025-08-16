/**
 * Shared utilities for frontend React component tests
 * Reduces boilerplate and standardizes test patterns
 */

import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { LanguageProvider } from "../contexts/LanguageContext";
import i18n from "../i18n";

/**
 * Frontend test helper class for React component testing
 */
export class FrontendTestHelper {
  constructor() {
    this.mockFunctions = new Map();
  }

  /**
   * Create a mock useAuth function with common defaults
   * @param {Object} overrides - Override specific auth values
   * @returns {Function} Mock useAuth function
   */
  createMockUseAuth(overrides = {}) {
    const defaults = {
      user: null,
      loading: false,
      isAdmin: false,
      adminLoading: false,
      signInWithGoogle: jest.fn().mockResolvedValue(undefined),
      signOut: jest.fn().mockResolvedValue(undefined),
      getAccessToken: jest.fn().mockResolvedValue("mock-token"),
      checkAdminStatus: jest.fn().mockResolvedValue(false),
      supabase: { auth: {}, from: jest.fn() },
    };

    return jest.fn().mockReturnValue({ ...defaults, ...overrides });
  }

  /**
   * Create common user objects for tests
   */
  static createMockUser(overrides = {}) {
    return {
      id: "user-123",
      email: "test@example.com",
      ...overrides,
    };
  }

  /**
   * Create mock admin user
   */
  static createMockAdminUser(overrides = {}) {
    return {
      id: "admin-123",
      email: "admin@example.com",
      ...overrides,
    };
  }

  /**
   * Render component with router context for navigation tests
   * @param {ReactElement} component - Component to render
   * @param {Object} routerOptions - Router configuration
   */
  renderWithRouter(component, routerOptions = {}) {
    const { initialEntries = ["/"], ...otherOptions } = routerOptions;

    return render(
      <MemoryRouter initialEntries={initialEntries} {...otherOptions}>
        {component}
      </MemoryRouter>
    );
  }

  /**
   * Render component with i18n context for internationalization tests
   * @param {ReactElement} component - Component to render
   * @param {string} language - Language to use for tests (default: 'en')
   */
  renderWithI18n(component, language = "en") {
    // Set the language for the test
    i18n.changeLanguage(language);

    return render(
      <LanguageProvider>
        <I18nextProvider i18n={i18n}>{component}</I18nextProvider>
      </LanguageProvider>
    );
  }

  /**
   * Render component with both router and i18n context
   * @param {ReactElement} component - Component to render
   * @param {Object} options - Options for router and i18n
   */
  renderWithProviders(component, options = {}) {
    const {
      initialEntries = ["/"],
      language = "en",
      ...routerOptions
    } = options;

    // Set the language for the test
    i18n.changeLanguage(language);

    return render(
      <LanguageProvider>
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={initialEntries} {...routerOptions}>
            {component}
          </MemoryRouter>
        </I18nextProvider>
      </LanguageProvider>
    );
  }

  /**
   * Mock fetch for API calls
   * @param {Object} mockResponse - Response to mock
   * @param {Object} options - Mock options
   */
  mockFetch(mockResponse = {}, options = {}) {
    const { ok = true, status = 200, statusText = "OK" } = options;

    const defaultResponse = {
      ok,
      status,
      statusText,
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    };

    global.fetch = jest.fn().mockResolvedValue(defaultResponse);
    return global.fetch;
  }

  /**
   * Mock fetch with error
   * @param {Object} error - Error to throw
   */
  mockFetchError(error = new Error("Network error")) {
    global.fetch = jest.fn().mockRejectedValue(error);
    return global.fetch;
  }

  /**
   * Setup common auth context mock
   * @param {Object} authState - Auth state to mock
   */
  setupAuthContextMock(authState = {}) {
    const mockUseAuth = this.createMockUseAuth(authState);

    jest.doMock("../contexts/AuthContext", () => ({
      useAuth: () => mockUseAuth(),
      AuthProvider: ({ children }) => children,
    }));

    return mockUseAuth;
  }

  /**
   * Create a test user in different states
   */
  static createAuthStates() {
    return {
      loading: {
        user: null,
        loading: true,
        isAdmin: false,
        adminLoading: false,
      },
      unauthenticated: {
        user: null,
        loading: false,
        isAdmin: false,
        adminLoading: false,
      },
      authenticatedUser: {
        user: FrontendTestHelper.createMockUser(),
        loading: false,
        isAdmin: false,
        adminLoading: false,
      },
      authenticatedAdmin: {
        user: FrontendTestHelper.createMockAdminUser(),
        loading: false,
        isAdmin: true,
        adminLoading: false,
      },
      adminLoading: {
        user: FrontendTestHelper.createMockUser(),
        loading: false,
        isAdmin: false,
        adminLoading: true,
      },
    };
  }

  /**
   * Cleanup all mocks
   */
  cleanup() {
    jest.clearAllMocks();
    if (global.fetch && global.fetch.mockClear) {
      global.fetch.mockClear();
    }
  }
}

/**
 * Common test patterns as reusable functions
 */
export const TestPatterns = {
  /**
   * Test loading state display
   * @param {ReactElement} component - Component to test
   * @param {string} loadingText - Expected loading text
   */
  async testLoadingState(component, loadingText = "Loading") {
    const { getByText } = render(component);
    expect(getByText(new RegExp(loadingText, "i"))).toBeInTheDocument();
  },

  /**
   * Test authenticated vs unauthenticated rendering
   * @param {Function} renderComponent - Function that renders component with auth state
   * @param {string} authenticatedSelector - Selector for authenticated content
   * @param {string} unauthenticatedSelector - Selector for unauthenticated content
   */
  testAuthenticationStates(
    renderComponent,
    authenticatedSelector,
    unauthenticatedSelector
  ) {
    return {
      testAuthenticated: () => {
        const { getByTestId, queryByTestId } = renderComponent({
          user: FrontendTestHelper.createMockUser(),
        });
        expect(getByTestId(authenticatedSelector)).toBeInTheDocument();
        expect(queryByTestId(unauthenticatedSelector)).not.toBeInTheDocument();
      },
      testUnauthenticated: () => {
        const { getByTestId, queryByTestId } = renderComponent({
          user: null,
        });
        expect(getByTestId(unauthenticatedSelector)).toBeInTheDocument();
        expect(queryByTestId(authenticatedSelector)).not.toBeInTheDocument();
      },
    };
  },
};

/**
 * Common mock components for testing
 */
export const MockComponents = {
  createMockComponent: (name, testId) => {
    return function MockComponent(props) {
      return (
        <div data-testid={testId || `mock-${name.toLowerCase()}`}>
          Mock {name} Component
          {props.children}
        </div>
      );
    };
  },

  // Common mocks
  MockLogin: () => <div data-testid="login-component">Login Component</div>,
  MockNavigation: () => (
    <div data-testid="navigation">Navigation Component</div>
  ),
  MockHealthCheck: () => (
    <div data-testid="health-check">Health Check Component</div>
  ),
  MockProtectedRoute: ({ children }) => (
    <div data-testid="protected-route">{children}</div>
  ),
  MockAdminRoute: ({ children }) => (
    <div data-testid="admin-route">{children}</div>
  ),
};
