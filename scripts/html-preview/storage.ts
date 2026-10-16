// Same async boundary as AsyncStorage, backed by this browser's local storage.
export default {
  async getItem(key: string): Promise<string | null> { return localStorage.getItem(key); },
  async setItem(key: string, value: string): Promise<void> { localStorage.setItem(key, value); },
};
