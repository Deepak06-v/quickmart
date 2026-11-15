import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/authStore';
import { useCartStore } from '../src/store/cartStore';
import { useLocationStore } from '../src/store/locationStore';
import { Colors } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const loadCart = useCartStore((state) => state.loadCart);
  const initLocation = useLocationStore((state) => state.initLocation);

  useEffect(() => {
    initializeAuth();
    loadCart();
    initLocation();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={Colors.surface} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="search"
            options={{
              presentation: 'modal',
              animation: 'fade',
            }}
          />
          <Stack.Screen name="category/[slug]" options={{ headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="checkout" options={{ headerShown: false }} />
          <Stack.Screen
            name="order-otp"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="order-success"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="orders/index" options={{ headerShown: false }} />
          <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="auth/index"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
          <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
          <Stack.Screen name="legal/about" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
