import { Href, router } from 'expo-router';
import { Platform } from 'react-native';

export function safeBack(fallbackHref: Href) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallbackHref);
}
