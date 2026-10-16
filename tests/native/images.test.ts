import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { pickScreenshots, pruneImages, displayImageUri } from '../../src/platform/images/nativeImages.ts';
test('system photo picker copies multiple selected images into persistent app storage', async () => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({ canceled: false, assets: [
    { uri: 'file:///cache/first.jpg', fileName: 'first.jpg', mimeType: 'image/jpeg', fileSize: 1000 },
    { uri: 'file:///cache/second.png', fileName: 'second.png', mimeType: 'image/png', fileSize: 1000 },
  ] });
  const images = await pickScreenshots();
  expect(images).toHaveLength(2);
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 10 }));
  expect(FileSystem.copyAsync).toHaveBeenCalledWith(expect.objectContaining({ from: 'file:///cache/first.jpg', to: expect.stringMatching(/^file:\/\/\/app\/spotclip-images\//) }));
  expect(images![0].reference).not.toBe('file:///cache/first.jpg');
});
test('cleanup preserves referenced photos and ignores unowned file names', async () => {
  (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValueOnce(['abc.jpg', 'def.png', 'personal-file.jpg']);
  (FileSystem.deleteAsync as jest.Mock).mockClear();
  await pruneImages(['file:///previous-ios-container/spotclip-images/abc.jpg']);
  expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1);
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///app/spotclip-images/def.png', { idempotent: true });
  expect(displayImageUri('file:///old-container/spotclip-images/abc.jpg')).toBe('file:///app/spotclip-images/abc.jpg');
});
