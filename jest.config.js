module.exports = {
  // Test environments for different test types
  projects: [
    {
      displayName: 'backend-unit',
      testMatch: ['<rootDir>/supabase/tests/unit/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      preset: null
    },
    {
      displayName: 'backend-integration', 
      testMatch: ['<rootDir>/supabase/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      preset: null
    },
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/frontend/src/**/*.test.{js,jsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/frontend/jest.setup.js'],
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(gif|ttf|eot|svg|png)$': 'jest-transform-stub'
      }
    }
  ],

  // Global settings
  verbose: true,
  collectCoverage: false
};