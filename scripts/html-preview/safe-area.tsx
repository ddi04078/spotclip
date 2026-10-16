import { View } from 'react-native';
import type { ComponentProps } from 'react';
export function SafeAreaView({ edges: _edges, ...props }: ComponentProps<typeof View> & { edges?: string[] }) { return <View {...props} />; }
export function useSafeAreaInsets() { return { top: 0, right: 0, bottom: 0, left: 0 }; }
