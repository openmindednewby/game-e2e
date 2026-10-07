/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/boxes.ts',
    'src/pixel-diff-math.ts',
    'src/touch-report.ts',
    'src/overflow-report.ts',
    'src/devices.ts'
  ],
  coverageThreshold: { global: { branches: 95, functions: 100, lines: 100, statements: 100 } },
  coverageReporters: ['text-summary'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] }
};
