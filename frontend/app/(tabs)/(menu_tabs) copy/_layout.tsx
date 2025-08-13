import { useEffect, useState } from 'react';
import { Stack, Tabs, router, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Modal, Pressable, View, ActivityIndicator } from 'react-native';
import { apiUrl } from '@/config';

export default function TabLayout() {
  const [showOrderInProgressModal, setShowOrderInProgressModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [configData, setConfigData] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  // Cargar configuración automáticamente al montar el componente
  useEffect(() => {
    loadConfigData();
  }, []);

  const checkAuth = async () => {
    try {
      const currentVendor = await AsyncStorage.getItem('currentVendor');
      if (!currentVendor) {
        router.replace('/');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      router.replace('/');
    }
  };

  // Función para cargar datos de configuración
  const loadConfigData = async () => {
    setLoadingConfig(true);
    try {
      // Primero intentar cargar desde AsyncStorage
      const storedConfig = await AsyncStorage.getItem('configData');
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        setConfigData(parsedConfig);
        setLoadingConfig(false);
        return;
      }

      // Si no existe en AsyncStorage, cargar desde el API
      const response = await fetch(`${apiUrl}configs`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const configData = data[0];
          setConfigData(configData);
          // Guardar en AsyncStorage para uso futuro
          await AsyncStorage.setItem('configData', JSON.stringify(configData));
        } else {
          console.error('Error loading config:', response.status);
        }
      } else {
        console.error('Error loading config:', response.status);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Función para verificar si hay una orden en proceso
  const hasOrderInProgress = async () => {
    // Obtener el estado de la orden desde AsyncStorage
    try {
      const orderState = await AsyncStorage.getItem('orderInProgress');
      return orderState !== null;
    } catch {
      return false;
    }
  };

  // Función para limpiar la orden en proceso
  const clearOrderInProgress = async () => {
    try {
      await AsyncStorage.removeItem('orderInProgress');
      await AsyncStorage.removeItem('selectedClient');
      await AsyncStorage.removeItem('selectedProducts');
    } catch (error) {
      console.error('Error clearing order:', error);
    }
  };

  // Función para manejar el cierre de sesión
  const handleLogout = async () => {
    try {
      // Limpiar todos los datos de la sesión
      await AsyncStorage.removeItem('currentVendor');
      await AsyncStorage.removeItem('configData');
      await clearOrderInProgress(); // Limpia cualquier orden en progreso

      // Redirigir al login
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
      // Opcional: mostrar un mensaje de error al usuario
    }
  };

  // Interceptar navegación cuando hay orden en proceso
  useEffect(() => {
    const checkOrderAndNavigate = async () => {
      const currentSegment = segments[segments.length - 1];
      
      // Solo mostrar advertencia si se intenta salir de las pestañas principales
      // No mostrar advertencia entre Dashboard, Ordenes, Transacciones
      const mainTabs = ['Dashboard', 'Ordenes', 'Transacciones'];
      
      if (await hasOrderInProgress() && !mainTabs.includes(currentSegment)) {
        setPendingRoute(currentSegment);
        setShowOrderInProgressModal(true);
        // Revertir la navegación
        router.back();
      }
    };
    
    checkOrderAndNavigate();
  }, [segments]);

  const themeBg = useThemeColor({}, 'background');
  const themeBg2 = useThemeColor({}, 'backgroundSecondary');
  const themeSecondaryBg = useThemeColor({}, 'backgroundSecondary');
  const themeBorder = useThemeColor({}, 'border');
  const themeActive = useThemeColor({}, 'tint');
  const themeInactive = useThemeColor({}, 'textDim');
  const themeText = useThemeColor({}, 'text');
  const themeTextSecondary = useThemeColor({}, 'textSecondary');

  return (
    <ThemedView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Stack.Screen
        options={{
          title: configData?.Compania || 'Adesoft',
          headerTitleStyle: { color: themeText },
          headerTitleAlign: 'center',
          headerShown: true,
          headerLeft: () => (
            <Feather
              name="log-out"
              size={24}
              color={themeText}
              style={{ paddingLeft: 12 }}
              onPress={async () => {
                if (await hasOrderInProgress()) {
                  setPendingRoute('/');
                  setShowOrderInProgressModal(true);
                } else {
                  setShowLogoutModal(true);
                }
              }}
            />
          ),
          headerRight: () => (
            <Feather
              name="info"
              size={24}
              color={themeText}
              style={{ paddingRight: 12 }}
              onPress={async () => {
                setShowInfoModal(true);
                await loadConfigData();
              }}
            />
          ),
          headerStyle: {
            backgroundColor: themeBg,
          },
        }}
      />

      <Tabs
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: themeActive,
          tabBarInactiveTintColor: themeInactive,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: themeBorder,
            elevation: 0,
            height: 60,
            paddingBottom: 8,
            backgroundColor: themeSecondaryBg,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Dashboard') {
              return <Feather name="inbox" size={size} color={color} />;
            }
            if (route.name === 'Ordenes') {
              return <Feather name="list" size={size} color={color} />;
            }
            if (route.name === 'Transacciones') {
              return <Feather name="dollar-sign" size={size} color={color} />;
            }
            return null;
          },
        })}
      >
        <Tabs.Screen name="Dashboard" />
        <Tabs.Screen name="Ordenes" />
        <Tabs.Screen name="Transacciones" />
      </Tabs>

      {/* Modal de advertencia de orden en proceso */}
      <Modal
        visible={showOrderInProgressModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOrderInProgressModal(false)}
      >
        <Pressable 
          style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.3)', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }} 
          onPress={() => setShowOrderInProgressModal(false)}
        >
          <Pressable
            style={{ 
              backgroundColor: themeBg2, 
              borderRadius: 16, 
              padding: 24, 
              minWidth: 300, 
              maxWidth: 400,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#ff6b6b'
            }}
            onPress={e => e.stopPropagation()}
          >
            <Feather name="alert-triangle" size={48} color="#ff6b6b" style={{ marginBottom: 16 }} />
            <ThemedText style={{ 
              fontSize: 16, 
              color: themeText, 
              marginBottom: 16, 
              textAlign: 'center',
              lineHeight: 22
            }}>
              ¡Tiene una orden en proceso!
            </ThemedText>
            <ThemedText style={{ 
              fontSize: 14, 
              color: themeTextSecondary, 
              marginBottom: 20, 
              textAlign: 'center',
              lineHeight: 20
            }}>
              {pendingRoute === '/' 
                ? 'Está intentando cerrar sesión'
                : pendingRoute === '/config'
                  ? 'Está intentando ir a configuración'
                  : `Está intentando navegar a ${pendingRoute}`
              }
            </ThemedText>
            <ThemedText style={{ 
              fontSize: 14, 
              color: themeTextSecondary, 
              marginBottom: 20, 
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              Si continúa, perderá el progreso de la orden.
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                style={{ 
                  backgroundColor: '#ff6b6b', 
                  borderRadius: 8, 
                  paddingVertical: 12, 
                  paddingHorizontal: 20 
                }}
                onPress={async () => {
                  await clearOrderInProgress();
                  setShowOrderInProgressModal(false);
                  if (pendingRoute) {
                    if (pendingRoute === '/') {
                      await AsyncStorage.removeItem('currentVendor');
                      router.replace('/');
                    } else {
                      // Para otras rutas, usar el segmento directamente
                      router.push(pendingRoute as any);
                    }
                    setPendingRoute(null);
                  }
                }}
              >
                <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Descartar y Continuar</ThemedText>
              </Pressable>
              <Pressable
                style={{ 
                  backgroundColor: themeActive, 
                  borderRadius: 8, 
                  paddingVertical: 12, 
                  paddingHorizontal: 20 
                }}
                onPress={() => {
                  setShowOrderInProgressModal(false);
                  setPendingRoute(null);
                }}
              >
                <ThemedText style={{ color: themeText, fontWeight: 'bold', fontSize: 16 }}>Cancelar</ThemedText>
              </Pressable>
            </View>
          </Pressable>
                  </Pressable>
        </Modal>

        {/* Modal de información */}
        <Modal
          visible={showInfoModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfoModal(false)}
        >
          <Pressable 
            style={{ 
              flex: 1, 
              backgroundColor: 'rgba(0,0,0,0.3)', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }} 
            onPress={() => setShowInfoModal(false)}
          >
            <Pressable
              style={{ 
                backgroundColor: themeBg2, 
                borderRadius: 16, 
                padding: 24, 
                minWidth: 300, 
                maxWidth: 400,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: themeActive
              }}
              onPress={e => e.stopPropagation()}
            >
              <Feather name="info" size={48} color={themeActive} style={{ marginBottom: 16 }} />
              <ThemedText style={{ 
                fontSize: 18, 
                color: themeText, 
                marginBottom: 16, 
                textAlign: 'center',
                lineHeight: 22,
                fontWeight: 'bold'
              }}>
                Información de la Empresa
              </ThemedText>
              
              {loadingConfig ? (
                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                  <ActivityIndicator color={themeActive} size="large" />
                  <ThemedText style={{ 
                    fontSize: 14, 
                    color: themeTextSecondary, 
                    marginTop: 8 
                  }}>
                    Cargando información...
                  </ThemedText>
                </View>
              ) : configData ? (
                <View style={{ width: '100%', alignItems: 'center' }}>
                  <ThemedText style={{ 
                    fontSize: 16, 
                    color: themeText, 
                    marginBottom: 8, 
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    {configData?.Compania || 'Adesoft'}
                  </ThemedText>
                  {(configData?.Direccion1 || configData?.Direccion2) && (
                    <ThemedText style={{ 
                      fontSize: 14, 
                      color: themeTextSecondary, 
                      marginBottom: 4, 
                      textAlign: 'center'
                    }}>
                      Dirección: {configData?.Direccion1 || ''}{configData?.Direccion1 && configData?.Direccion2 ? ', ' : ''}{configData?.Direccion2 || ''}
                    </ThemedText>
                  )}
                  
                  {configData?.Telefono && (
                    <ThemedText style={{ 
                      fontSize: 14, 
                      color: themeTextSecondary, 
                      marginBottom: 4, 
                      textAlign: 'center'
                    }}>
                      Tel: <a href={`tel:${configData?.Telefono}`} style={{ color: themeActive, textDecorationLine: 'underline' }}>{configData?.Telefono}</a>
                    </ThemedText>
                  )}
                  {configData?.Rnc && (
                    <ThemedText style={{ 
                      fontSize: 14, 
                      color: themeTextSecondary, 
                      marginBottom: 4, 
                      textAlign: 'center'
                    }}>
                      RNC: {configData?.Rnc}
                    </ThemedText>
                  )}
                  {configData?.Email && (
                    <ThemedText style={{ 
                      fontSize: 14, 
                      color: themeTextSecondary, 
                      marginBottom: 8, 
                      textAlign: 'center'
                    }}>
                     <a href={`mailto:${configData?.Email}`} style={{ color: themeActive, textDecorationLine: 'underline' }}>{configData?.Email}</a>
                    </ThemedText>
                  )}
                  <ThemedText style={{ 
                    fontSize: 14, 
                    color: themeTextSecondary, 
                    marginTop: 12, 
                    textAlign: 'center',
                    fontStyle: 'italic',
                    fontWeight: '500'
                  }}>
                    Impuesto: {configData?.Impuesto ?? ''}%
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={{ 
                  fontSize: 14, 
                  color: themeTextSecondary, 
                  marginBottom: 20, 
                  textAlign: 'center',
                  lineHeight: 20
                }}>
                  No se pudo cargar la información de la empresa
                </ThemedText>
              )}
              
              <Pressable
                style={{ 
                  backgroundColor: themeActive, 
                  borderRadius: 8, 
                  paddingVertical: 12, 
                  paddingHorizontal: 24,
                  marginTop: 20
                }}
                onPress={() => setShowInfoModal(false)}
              >
                <ThemedText style={{ color: themeText, fontWeight: 'bold', fontSize: 16 }}>Cerrar</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Modal de confirmación de cierre de sesión */}
        <Modal
          visible={showLogoutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.3)',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onPress={() => setShowLogoutModal(false)}
          >
            <Pressable
              style={{
                backgroundColor: themeBg2,
                borderRadius: 16,
                padding: 24,
                minWidth: 300,
                maxWidth: 400,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: themeActive
              }}
              onPress={e => e.stopPropagation()}
            >
              <Feather name="log-out" size={48} color={themeActive} style={{ marginBottom: 16 }} />
              <ThemedText style={{
                fontSize: 16,
                color: themeText,
                marginBottom: 20,
                textAlign: 'center',
                lineHeight: 22
              }}>
                ¿Seguro que quieres cerrar sesión?
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  style={{
                    backgroundColor: '#ff6b6b',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20
                  }}
                  onPress={handleLogout}
                >
                  <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Confirmar</ThemedText>
                </Pressable>
                <Pressable
                  style={{
                    backgroundColor: themeInactive,
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20
                  }}
                  onPress={() => setShowLogoutModal(false)}
                >
                  <ThemedText style={{ color: themeText, fontWeight: 'bold', fontSize: 16 }}>Cancelar</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    );
  }