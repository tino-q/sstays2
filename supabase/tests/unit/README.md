# Unit Test Utilities

This directory contains shared utilities to reduce boilerplate and standardize test patterns across the backend unit tests.

## Overview

The `test-utils.ts` file provides common utilities for:

- Mock creation (Supabase, OpenAI, Environment Service)
- Test data factories
- Error response factories
- Common assertion helpers
- Test setup helpers
- Reusable test patterns

## Quick Start

```typescript
import {
  createMockSupabaseClient,
  TestDataFactory,
  ErrorResponseFactory,
  setupTestEnvironment,
  AssertionHelpers,
  MockHelpers,
} from "./test-utils";

describe("MyService", () => {
  let service: MyService;
  let mockSupabase: any;

  setupTestEnvironment();

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new MyService(mockSupabase);
  });

  test("should handle successful operation", async () => {
    const testData = TestDataFactory.createAdminUser();
    MockHelpers.setupSuccessfulSupabaseResponse(mockSupabase.from().select().eq().single, testData);

    const result = await service.someMethod();

    AssertionHelpers.expectSuccessfulResponse(result, testData);
  });
});
```

## Available Utilities

### Mock Creation

#### `createMockSupabaseClient()`

Creates a basic mock Supabase client with chainable methods:

```typescript
const mockSupabase = createMockSupabaseClient();
// Provides: from().select().eq().single()
```

#### `createMockSupabaseClientWithChains()`

Creates a more complex mock with additional methods:

```typescript
const mockSupabase = createMockSupabaseClientWithChains();
// Provides: from().insert().select().update().upsert().eq().single().order()
```

#### `createMockEnvService(envVars?)`

Creates a mock environment service:

```typescript
const mockEnv = createMockEnvService({
  CUSTOM_VAR: "custom-value"
});
```

#### `createMockOpenAIClient()`

Creates a mock OpenAI client:

```typescript
const mockOpenAI = createMockOpenAIClient();
// Provides: chat.completions.create()
```

### Test Data Factories

#### `TestDataFactory.createAdminUser(overrides?)`

Creates a standard admin user object:

```typescript
const adminUser = TestDataFactory.createAdminUser({
  id: "custom-admin-id",
  email: "custom@example.com"
});
```

#### `TestDataFactory.createRegularUser(overrides?)`

Creates a standard regular user object:

```typescript
const user = TestDataFactory.createRegularUser({
  user_metadata: { role: "moderator" }
});
```

#### `TestDataFactory.createReservation(overrides?)`

Creates a standard reservation object:

```typescript
const reservation = TestDataFactory.createReservation({
  guest_name: "Jane Doe",
  status: "cancelled"
});
```

### Error Response Factories

#### `ErrorResponseFactory.noRowsFound()`

Creates a "no rows found" error response:

```typescript
const errorResponse = ErrorResponseFactory.noRowsFound();
// Returns: { data: null, error: { code: "PGRST116", message: "No rows found" } }
```

#### `ErrorResponseFactory.databaseError(message?)`

Creates a database error response:

```typescript
const errorResponse = ErrorResponseFactory.databaseError("Custom error message");
```

#### `ErrorResponseFactory.networkError()`

Throws a network error:

```typescript
// Use with mockRejectedValue
mockSingle.mockRejectedValue(ErrorResponseFactory.networkError());
```

### Assertion Helpers

#### `AssertionHelpers.expectSuccessfulResponse(result, expectedData?)`

Asserts a successful response:

```typescript
AssertionHelpers.expectSuccessfulResponse(result, expectedData);
// Checks: result.success === true and optionally result.data === expectedData
```

#### `AssertionHelpers.expectErrorResponse(result, expectedError?)`

Asserts an error response:

```typescript
AssertionHelpers.expectErrorResponse(result, "Expected error message");
// Checks: result.success === false and optionally result.error === expectedError
```

#### `AssertionHelpers.expectSupabaseCall(mockFrom, tableName)`

Asserts a Supabase table call:

```typescript
AssertionHelpers.expectSupabaseCall(mockSupabase.from, "roles");
// Checks: mockFrom was called with tableName
```

### Mock Helpers

#### `MockHelpers.setupSuccessfulSupabaseResponse(mockSingle, data)`

Sets up a successful Supabase response:

```typescript
MockHelpers.setupSuccessfulSupabaseResponse(mockSingle, testData);
// Equivalent to: mockSingle.mockResolvedValue({ data: testData, error: null })
```

#### `MockHelpers.setupErrorSupabaseResponse(mockSingle, error)`

Sets up an error Supabase response:

```typescript
MockHelpers.setupErrorSupabaseResponse(mockSingle, errorResponse.error);
// Equivalent to: mockSingle.mockResolvedValue({ data: null, error: errorResponse.error })
```

#### `MockHelpers.setupNetworkError(mockSingle)`

Sets up a network error:

```typescript
MockHelpers.setupNetworkError(mockSingle);
// Equivalent to: mockSingle.mockRejectedValue(new Error("Network error"))
```

### Test Setup

#### `setupTestEnvironment()`

Sets up common test environment:

```typescript
setupTestEnvironment();
// Provides: beforeEach(jest.clearAllMocks) and afterEach(jest.restoreAllMocks)
```

## Common Test Patterns

### Testing Successful Operations

```typescript
test("should successfully perform operation", async () => {
  const testData = TestDataFactory.createAdminUser();
  MockHelpers.setupSuccessfulSupabaseResponse(mockSingle, testData);

  const result = await service.someMethod();

  AssertionHelpers.expectSuccessfulResponse(result, testData);
  AssertionHelpers.expectSupabaseCall(mockSupabase.from, "roles");
});
```

### Testing Error Cases

```typescript
test("should handle database error", async () => {
  MockHelpers.setupErrorSupabaseResponse(mockSingle, ErrorResponseFactory.databaseError().error);

  const result = await service.someMethod();

  AssertionHelpers.expectErrorResponse(result, "Database error");
});
```

### Testing Network Errors

```typescript
test("should handle network error", async () => {
  MockHelpers.setupNetworkError(mockSingle);

  const result = await service.someMethod();

  AssertionHelpers.expectErrorResponse(result);
});
```

## Migration Guide

### Before (Original Pattern)

```typescript
// Lots of boilerplate
const mockSingle = jest.fn() as jest.MockedFunction<() => Promise<SupabaseResponse<any>>>;
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

const mockSupabaseClient = {
  from: mockFrom,
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  service = new Service(mockSupabaseClient);
});

test("should handle success", async () => {
  mockSingle.mockResolvedValue({
    data: { id: "test" },
    error: null,
  });
  // ... test logic
});
```

### After (Using Utilities)

```typescript
// Clean and concise
import { createMockSupabaseClient, MockHelpers, AssertionHelpers } from "./test-utils";

beforeEach(() => {
  mockSupabase = createMockSupabaseClient();
  service = new Service(mockSupabase);
});

test("should handle success", async () => {
  MockHelpers.setupSuccessfulSupabaseResponse(mockSupabase.from().select().eq().single, { id: "test" });
  // ... test logic
});
```

## Benefits

1. **Reduced Boilerplate**: Eliminates repetitive mock setup code
2. **Consistent Patterns**: Standardizes test structure across the codebase
3. **Type Safety**: Provides proper TypeScript interfaces
4. **Maintainability**: Centralizes common test logic
5. **Readability**: Makes tests more focused on business logic
6. **Reusability**: Easy to extend and reuse across different services

## Best Practices

1. **Use the utilities consistently** across all unit tests
2. **Extend the utilities** when new common patterns emerge
3. **Keep test data factories simple** and focused
4. **Use descriptive test names** that explain the scenario being tested
5. **Group related tests** using `describe` blocks
6. **Test both success and error cases** for each method
