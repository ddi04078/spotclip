jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function TestIcon({ name }) { return React.createElement(Text, { testID: `icon-${name}` }, ''); };
});
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => `uuid-${Math.random()}`) }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///app/',
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 1234 })),
  makeDirectoryAsync: jest.fn(async () => undefined), copyAsync: jest.fn(async () => undefined),
  readDirectoryAsync: jest.fn(async () => []), deleteAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));
jest.mock('react-native-safe-area-context', () => {
  const React = require('react'); const { View } = require('react-native');
  return { SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children), useSafeAreaInsets: () => ({ top: 47, left: 0, right: 0, bottom: 34 }) };
});

// Expo Go has no custom OCR module. Native recognition is separately validated on device.
jest.mock('expo-modules-core', () => ({ requireOptionalNativeModule: () => null }));
