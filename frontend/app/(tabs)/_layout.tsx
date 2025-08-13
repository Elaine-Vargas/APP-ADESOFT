import { Tabs, router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TabLayout() {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const checkAuth = async () => {
      try {
        const vendor = await AsyncStorage.getItem('currentVendor');
        if (!vendor && isActive) {
          // No vendor found, ensure we're on the login screen
          // Use a small timeout to ensure navigation is ready
          setTimeout(() => {
            if (router.canGoBack()) {
              router.replace('/(tabs)');
            }
          }, 0);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return null; // Or a loading indicator
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.text,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="(menu_tabs)/Inicio"
        options={{
          title: 'Inicio',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="(menu_tabs)/Dashboard"
        options={{
          title: 'Dashboard',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
