import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Href, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { palette } from '@/components/useitup/ui';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <AuthProvider>
        <RootStack />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const router = useRouter();
  const segments = useSegments();
  const { isLoading, session } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const firstSegment = String(segments[0] ?? '');
    const isAuthRoute = firstSegment === 'login' || firstSegment === 'signup';

    if (!session && !isAuthRoute) {
      router.replace('/login' as Href);
      return;
    }

    if (session && isAuthRoute) {
      router.replace('/(tabs)');
    }
  }, [isLoading, router, segments, session]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.blue} size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-item" options={{ headerShown: false }} />
      <Stack.Screen name="edit-item/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="pantry-item/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="update-pantry" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: palette.background,
    flex: 1,
    justifyContent: 'center',
  },
});
