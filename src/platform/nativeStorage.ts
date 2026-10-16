import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalPlaceStorage } from '../storage/LocalPlaceStorage.ts';
import { LocalAnalysisSettings } from '../storage/LocalAnalysisSettings.ts';
export const placeStorage = new LocalPlaceStorage(AsyncStorage);
export const analysisSettingsStorage = new LocalAnalysisSettings(AsyncStorage);
