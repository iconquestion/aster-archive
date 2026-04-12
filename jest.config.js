// jest.config.js
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/logs/',
    '<rootDir>/coverage/',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/logs/',
    '<rootDir>/coverage/',
    '<rootDir>/test/jest/',
  ],
  coverageProvider: 'v8',
  transform: {},

  bail: 1,
  testTimeout: 10000,
  maxWorkers: '25%',
  workerIdleMemoryLimit: '512MB',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
