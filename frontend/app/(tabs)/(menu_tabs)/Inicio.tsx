import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';

const Inicio = () => {
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const colors = useThemeColor({}, 'text');
  const bgColor = useThemeColor({}, 'background');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a logged-in vendor
        const vendorData = await AsyncStorage.getItem('currentVendor');
        
        if (!vendorData) {
          // No vendor data found, redirect to login
          router.replace('/(tabs)');
          return;
        }

        // Parse vendor data and set it in state
        const parsedVendor = JSON.parse(vendorData);
        setVendor(parsedVendor);
      } catch (error) {
        console.error('Error checking auth status:', error);
        // If there's an error, redirect to login
        router.replace('/(tabs)');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors} />
        <ThemedText style={{ marginTop: 10 }}>Verificando sesión...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Bienvenido</ThemedText>
      {vendor && (
        <ThemedText style={styles.welcomeText}>
          {vendor.NombreV || 'Usuario'}
        </ThemedText>
      )}
      <ThemedText style={styles.subtitle}>
        Has iniciado sesión correctamente
      </ThemedText>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default Inicio;