module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 30000,
  testEnvironmentOptions: {},
  globals: {
    'ts-jest': { tsconfig: { strict: true } },
  },
  moduleNameMapper: {
    '^@em/shared$': '<rootDir>/../shared/src/index.ts',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
