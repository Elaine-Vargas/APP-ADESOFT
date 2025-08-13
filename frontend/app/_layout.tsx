import { Stack, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

export default function RootLayout() {
  const segments = useSegments();
  useEffect(() => {
    const lastSegment = segments[segments.length - 1];
    const pestaña = lastSegment ? ` - ${lastSegment}` : 'Adesoft';

    if (Platform.OS === 'web') {
      document.title = `AdeSoft${pestaña}`;
    }
  }, [segments]);

  return (
    <Stack>
      <Stack.Screen name="App" options={{ headerShown: false }} />
    </Stack>
  );
}
