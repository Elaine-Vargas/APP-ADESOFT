import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import React, { useEffect } from 'react';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function NotFoundScreen() {
  useEffect(() => {
    document.title = 'Adesoft - 404 ';
  }, []); 
  return (
    <>
      <Stack.Screen options={{ title: '404 Pestaña inexistente', headerShown: false }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">Esta pestaña no existe</ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">Volver al Inicio</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
