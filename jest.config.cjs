module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/tests/native/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/tests/native/setup.cjs'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native(-community)?|test-renderer|@testing-library/react-native|expo|@expo)/)'],
  testTimeout: 20000,
};
