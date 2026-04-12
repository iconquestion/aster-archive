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
  ],
  coverageProvider: 'v8',
  transform: {},
};
