import { createContext, useContext, useState, type ReactNode } from 'react';
export type Page = 'add' | 'places' | 'settings';
const Navigation = createContext<{ page: Page; setPage: (page: Page) => void } | null>(null);
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>('add');
  return <Navigation.Provider value={{ page, setPage }}>{children}</Navigation.Provider>;
}
export function useNavigation() {
  const value = useContext(Navigation);
  if (!value) throw new Error('NavigationProvider missing');
  return value;
}
/** File URLs have no server routes. Only the navigation adapter differs from Expo Router. */
export function useRouter() {
  const { setPage } = useNavigation();
  const navigate = (route: string) => setPage(route.includes('settings') ? 'settings' : route.includes('places') ? 'places' : 'add');
  return { navigate, push: navigate, back: () => setPage('add') };
}
