import dotenv from 'dotenv'

dotenv.config()

// Tests must not use local file storage — unset so code falls back to S3 (mocked in specs).
delete process.env.STORAGE_PROVIDER

const jest = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/client/', '<rootDir>/.worktrees/'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.worktrees/'],
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(module-alias|isomorphic-fetch|uuid|@whiskeysockets/baileys|archiver|archiver-utils|zip-stream|compress-commons|crc32-stream|readdir-glob|is-stream)/)'],
  moduleNameMapper: {
    '^\\.jest(.*)$': '<rootDir>/.jest$1',
    '@models(.*)$': '<rootDir>/src/app/models$1',
    '@controllers(.*)$': '<rootDir>/src/app/controllers$1',
    '@routes(.*)$': '<rootDir>/src/app/routes$1',
    '@config(.*)$': '<rootDir>/src/config$1',
    '@queries(.*)$': '<rootDir>/src/app/queries$1',
    '@helpers(.*)$': '<rootDir>/src/app/helpers$1',
    '@reports(.*)$': '<rootDir>/src/app/reports$1',
    '@factories(.*)$': '<rootDir>/src/app/factories$1',
    '@plugins(.*)$': '<rootDir>/src/app/plugins$1',
    '@repositories(.*)$': '<rootDir>/src/app/repositories$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/app/**/*.{js,ts}',
    '<rootDir>/src/setup/**/*.{js,ts}',
    '!**/config/**',
    '!<rootDir>/src/app/models/index.{js,ts}',
    '!<rootDir>/src/app/plugins/storage/S3.{js,ts}',
    '!<rootDir>/src/app/jobs/*.{js,ts}',
    '!<rootDir>/src/app/services/Backup.{js,ts}',
    '!<rootDir>/src/app/services/ClearBackups.{js,ts}',
  ],
  coverageDirectory: 'coverage',
  setupFiles: ['jest-date-mock'],
  clearMocks: true,
}

export default jest
