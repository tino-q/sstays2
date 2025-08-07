# Integration Test Utilities

Shared utilities to reduce boilerplate and standardize patterns across integration tests.

## Usage

```javascript
const { IntegrationTestHelper } = require("./test-utils");

describe("My Endpoint - Integration Tests", () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new IntegrationTestHelper();
    await testHelper.initializeClients();
    await testHelper.createTestUser({
      testName: "test-my-endpoint",
      isAdmin: true // if endpoint requires admin access
    });
  });

  afterAll(async () => {
    await testHelper.cleanup(["table_name"]); // tables to clean
  });

  beforeEach(async () => {
    await testHelper.cleanTestData("table_name");
  });

  test("should work with authenticated request", async () => {
    const response = await testHelper.authenticatedRequest("/my-endpoint");
    expect(response.status).toBe(200);
  });

  test("should return 401 for unauthenticated requests", async () => {
    await testHelper.testUnauthenticatedAccess("/my-endpoint");
  });

  test("should handle CORS", async () => {
    await testHelper.testCorsHeaders("/my-endpoint");
  });

  test("should reject unsupported methods", async () => {
    await testHelper.testMethodNotAllowed("/my-endpoint");
  });
});
```

## Features Provided

- **Supabase client initialization** - Handles service role and anon clients
- **Test user management** - Creates users with optional admin privileges
- **Authentication** - Handles token generation and authenticated requests  
- **Cleanup** - Automatic cleanup of users and test data
- **Common test patterns** - 401, CORS, method not allowed tests
- **Request helpers** - Authenticated and unauthenticated request methods

## Benefits

- **Reduced boilerplate**: ~60% less setup code per test file
- **Consistency**: Standardized patterns across all integration tests
- **Maintainability**: Single place to update common test logic
- **Reliability**: Proper cleanup prevents test pollution