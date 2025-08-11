module.exports = {
  // Test environments for different test types
  projects: [
    {
      displayName: "backend-unit",
      testMatch: ["<rootDir>/supabase/tests/unit/**/*.test.{js,ts}"],
      testEnvironment: "node",
      setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
      transform: {
        "^.+\\.ts$": [
          "ts-jest",
          {
            tsconfig: "<rootDir>/supabase/functions/tsconfig.json",
          },
        ],
      },
      preset: "ts-jest",
    },
    {
      displayName: "backend-integration",
      testMatch: ["<rootDir>/supabase/tests/integration/**/*.test.{js,ts}"],
      testEnvironment: "node",
      setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
      transform: {
        "^.+\\.ts$": [
          "ts-jest",
          {
            tsconfig: "<rootDir>/supabase/tests/integration/tsconfig.json",
          },
        ],
      },
      preset: "ts-jest",
    },
    {
      displayName: "frontend",
      testMatch: ["<rootDir>/frontend/src/**/*.test.{js,jsx}"],
      testEnvironment: "jsdom",
      setupFilesAfterEnv: ["<rootDir>/frontend/jest.setup.js"],
      transform: {
        "^.+\\.(js|jsx)$": "babel-jest",
      },
      moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "\\.(gif|ttf|eot|svg|png)$": "jest-transform-stub",
      },
      transformIgnorePatterns: ["node_modules/(?!(@supabase|isows)/)"],
    },
  ],

  // Global settings
  verbose: true,
  collectCoverage: false,
  testTimeout: 10000,
};
