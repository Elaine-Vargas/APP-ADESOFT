import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, useColorScheme, Platform, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import {
  FormControl,
  FormControlLabel,
  FormControlError,
  FormControlErrorText,
  FormControlErrorIcon,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { AlertCircleIcon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import {
  Checkbox,
  CheckboxGroup,
  CheckboxIndicator,
  CheckboxLabel,
  CheckboxIcon,
} from '@/components/ui/checkbox';
import { CheckIcon, Heading } from 'lucide-react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from '@/config';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogBody,
  AlertDialogBackdrop,
} from '@/components/ui/alert-dialog';
import { Text as TextUI } from '@/components/ui/text';


export default function App() {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const [isInvalid, setIsInvalid] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(false);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mensajeTipo, setMensajeTipo] = useState<'success' | 'error' | ''>('');
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [showLoginDialog, setShowLoginDialog] = React.useState(false);
  const handleClose = () => setShowLoginDialog(false);
  
  // Estilos para el AlertDialog
  const dialogStyle = StyleSheet.create({
    content: {
      width: 100,
      height: 100,
      backgroundColor: 'red',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      borderRadius: 8,
    },
  });
  // Check if user is already logged in and load saved credentials
  React.useEffect(() => {
    let isActive = true;

    const checkAuth = async () => {
      try {
        // Check if user is already logged in
        const vendor = await AsyncStorage.getItem('currentVendor');
        if (vendor && isActive) {
          // User is already logged in, but redirection is temporarily disabled
          // setTimeout(() => {
          //   router.replace('/(tabs)/(menu_tabs)/Inicio');
          // }, 0);
          return;
        }

        // Load saved username if remember me was checked
        const savedUsername = await AsyncStorage.getItem('savedUsername');
        const rememberMe = await AsyncStorage.getItem('rememberMe');
        
        if (savedUsername && rememberMe === 'true' && isActive) {
          setInputValue(savedUsername);
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };

    checkAuth();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isActive = false;
    };
  }, []);

  // Función para cargar datos de configuración
  const loadConfigData = async () => {
    try {
      const response = await fetch(`${apiUrl}configs`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          // Guardar la configuración en AsyncStorage para uso posterior
          await AsyncStorage.setItem('configData', JSON.stringify(data[0]));
          return data[0];
        }
      } else {
        console.error('Error loading config:', response.status);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    return null;
  };

  const toggleRememberMe = async () => {
    const newValue = !rememberMe;
    setRememberMe(newValue);
    
    try {
      if (newValue) {
        // Save username and remember preference
        await AsyncStorage.setItem('savedUsername', inputValue);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        // Clear saved username if remember me is unchecked
        await AsyncStorage.removeItem('savedUsername');
        await AsyncStorage.removeItem('rememberMe');
      }
    } catch (error) {
      console.error('Error updating remember me preference:', error);
      // Revert state if there's an error
      setRememberMe(!newValue);
    }
  };

  // Removed validateInput as validation is now handled directly in handleLogin

  // Función para validar credenciales de inicio de sesión
  const handleLogin = async () => {
    if (!inputValue) {
      setMensaje('Debes ingresar tu código de acceso');
      setMensajeTipo('error');
      return;
    }
    
    setLoading(true);
    setMensaje('');
    setMensajeTipo('');
    
    try {
      const response = await fetch(`${apiUrl}Vendedores/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: inputValue.trim() })
      });

      const data = await response.json();
      
      if (!response.ok) {
        setMensaje(data.message || 'El código es incorrecto.');
        setMensajeTipo('error');
        return;
      }
      
      // Save vendor data to AsyncStorage
      await AsyncStorage.setItem('currentVendor', JSON.stringify(data.vendedor));
      console.log('Vendedor guardado:', data.vendedor);
      // Handle remember me functionality
      if (rememberMe) {
        await AsyncStorage.setItem('savedUsername', inputValue);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('savedUsername');
        await AsyncStorage.removeItem('rememberMe');
      }
      
      // Preload company configuration
      setMensaje('Cargando configuración...');
      const configData = await loadConfigData();
      setShowLoginDialog(true);
      setMensaje(data.mensaje || '¡Acceso correcto!');
      setMensajeTipo('success');
      setNombre(data.vendedor.NombreV);
      // Redirección temporalmente deshabilitada
      // setTimeout(() => {
      //   router.replace('/(tabs)/(menu_tabs)/Inicio');
      // }, 1200);
      
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      setMensaje('Error de conexión. Intente nuevamente.');
      setMensajeTipo('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showLoginDialog && (
        <AlertDialog isOpen={showLoginDialog} onClose={handleClose}>
          <AlertDialogBackdrop />
          <AlertDialogContent style={dialogStyle.content}>
            <AlertDialogHeader>
              <Heading className="text-typography-950 font-semibold" size="md">
                Haz iniciado sesión correctamente
              </Heading>
            </AlertDialogHeader>
            <AlertDialogBody className="mt-3 mb-4">
              <TextUI size="sm">
                Bienvenido/a {nombre}.
              </TextUI>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                variant="outline"
                action="secondary"
                onPress={handleClose}
                size="sm"
              >
                <ButtonText>Cerrar</ButtonText>
              </Button>
              <Button size="sm" onPress={handleClose}>
                <ButtonText>Ir al Inicio</ButtonText>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}


      <ThemedView style={styles.container}>
       <ThemedText type="title" style={{ color: colors.tint, paddingBottom: 20 }}>INICIO DE SESIÓN</ThemedText>
       <VStack>
      <FormControl
        isInvalid={isInvalid}
        size="md"
        isDisabled={false}
        isReadOnly={false}
        isRequired={false}
      >
        <FormControlLabel>
          <FormControlLabelText style={{ paddingBottom: 5 }}><ThemedText type="default">Código de Acceso</ThemedText></FormControlLabelText>
        </FormControlLabel>
        <Input className="my-1" size="md" style={{ backgroundColor: colors.backgroundSecondary, padding: 0, borderRadius: 10, borderColor: colors.border, borderWidth: 1 }}>
          <InputField
            type="text"
            placeholder="A000"
            placeholderTextColor={colors.textTertiary}
            style={{  backgroundColor: colors.backgroundSecondary, padding: 10, borderRadius: 10, borderColor: 'transparent', color: colors.text, height: '100%', width: '100%'}}
            editable={true}
            readOnly={false}
            maxLength={4}

            value={inputValue}
            onChangeText={async (text) => {
              setInputValue(text);
              // Validate input length and update error state
              const isValid = text.length === 4 || text.length === 0;
              setIsInvalid(!isValid);
              
              if (rememberMe) {
                try {
                  await AsyncStorage.setItem('savedUsername', text);
                } catch (error) {
                  console.error('Error guardando usuario recordado:', error);
                }
              }
            }}
         />
        </Input>
        <FormControlHelper>
          <FormControlHelperText style={{ paddingTop: 5, color: colors.textTertiary, fontSize: 12, textAlign: 'center' }}>
            Introduce tu código de acceso
          </FormControlHelperText>
        </FormControlHelper>
        <FormControlError>
          <FormControlErrorText style={{ color: colors.alert }}>
            El código debe tener 4 dígitos
          </FormControlErrorText>
        </FormControlError>
      </FormControl>
      
      <View style={{ width: '100%', marginTop: 12, marginBottom: 8 }}>
        <Checkbox
          size="md"
          value="remember"
          isChecked={rememberMe}
          onChange={toggleRememberMe}
          style={{ alignItems: 'center', flexDirection: 'row', marginLeft: 10 }}
        >
          <CheckboxIndicator style={{ 
            marginRight: 8, 
            borderColor: rememberMe ? colors.tint : colors.border, 
            borderWidth: 1, 
            borderRadius: 5, 
            width: 20, 
            height: 20, 
            backgroundColor: rememberMe ? colors.tint : colors.backgroundSecondary,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {rememberMe && (
              <CheckboxIcon as={CheckIcon} color={colors.backgroundSecondary} size={14} />
            )}
          </CheckboxIndicator>
          <CheckboxLabel style={{ color: colors.text }}>
            <ThemedText type="default">Recordarme</ThemedText>
          </CheckboxLabel>
        </Checkbox>
      </View>
      <View style={{ width: '100%', alignItems: 'center', marginTop: 10 }}>
        {mensaje ? (
          <ThemedText 
            type="default" 
            style={{ 
              color: mensajeTipo === 'error' ? colors.alert : colors.tint,
              marginBottom: 10,
              textAlign: 'center'
            }}
          >
            {mensaje}
          </ThemedText>
        ) : null}
        <Button
          className="w-fit self-center mt-4"
          size="sm"
          variant="outline"
          onPress={handleLogin}
          disabled={loading}
          style={{ 
            marginTop: 10, 
            padding: 10, 
            borderRadius: 10, 
            backgroundColor: loading ? colors.border : colors.tint, 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 40,
            width: '100%',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <ButtonText style={{ 
              color: colors.text, 
              fontWeight: 'bold', 
              fontSize: 18, 
              letterSpacing: 2, 
              textTransform: 'uppercase'
            }}>
              Ingresar
            </ButtonText>
          )}
        </Button>
      </View>
    </VStack>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});