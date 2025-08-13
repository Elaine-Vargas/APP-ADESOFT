import { Stack, useFocusEffect } from 'expo-router';
import { StyleSheet, ScrollView, Pressable, Modal, View, ActivityIndicator, TextInput, Dimensions, Platform, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { apiUrl } from '@/config';
import { Text } from 'react-native';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedInput } from '@/components/ThemedInput';
import ThemedPicker from '@/components/ui/ThemedPicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useWindowDimensions } from 'react-native';


interface Transaccion {
  IdTransa: number;
  Documento?: string;
  Tipo?: 'VE' | 'IN';
  Fecha: string;
  FechaCreacion?: string;
  IdCliente: string;
  IdVendedor: string;
  Valor?: number;
  Efectivo?: number;
  Tarjeta?: number;
  Cheque?: number;
  Transferencia?: number;
  Pendiente?: number;
  ValorImp?: number;
  ReferenciaId?: string;
  Concepto?: string;
  FechaSinc?: string;
  Cliente?: {
    IdCliente: string;
    NombreC: string;
    Rnc?: string;
  };
  Vendedor?: {
    IdVendedor: string;
    NombreV: string;
  };
  ReferenciaPago?: Array<{
    IdReferencia: number;
    IdTransa: number;
    DocumentoIN?: string;
    DocumentoVE?: string;
    IdCliente: string;
    IdVendedor: string;
    ValorPago?: number;
    CreatedAt?: string;
    Efectivo?: number;
    Tarjeta?: number;
    Cheque?: number;
    Transferencia?: number;
  }>;
}

export default function Transacciones() {
  // Utilidad para obtener el valor real de un campo de pago de la referencia seleccionada
  function getReferenciaPagoField(field: 'Efectivo' | 'Tarjeta' | 'Cheque' | 'Transferencia' | 'ValorPago') {
    if (!selectedTransaccion || !referenciaSeleccionada || !referenciaSeleccionada.DocumentoIN) return undefined;
    const ref = selectedTransaccion.ReferenciaPago?.find(r => r.DocumentoIN === referenciaSeleccionada.DocumentoIN);
    return ref ? ref[field] : undefined;
  }
  const [showReferenciaDetail, setShowReferenciaDetail] = useState(false);
  const [referenciaSeleccionada, setReferenciaSeleccionada] = useState<any>(null);
  let today = new Date();
   const [date, setDate] = useState(dayjs());
   const defaultStyles = useDefaultStyles();

  const [vendor, setVendor] = useState<{ IdVendedor?: string; NombreV?: string, IdRuta?: string } | null>(null);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaccion, setSelectedTransaccion] = useState<Transaccion | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchInput, setSearchInput] = useState(''); // texto que escribe el usuario
const [searchQuery, setSearchQuery] = useState(''); // query aplicada al filtrar
  const [filterTipo, setFilterTipo] = useState<string>('VE');
  const [filterCliente, setFilterCliente] = useState<string>('');
  const [filterVendedor, setFilterVendedor] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loadingClients, setLoadingClients] = useState(false);
  const [rutasMap, setRutasMap] = useState<{ [key: string]: string }>({});
  const [rutas, setRutas] = useState<any[]>([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState('');
  const [zonas, setZonas] = useState<any[]>([]);
  const [zonaSeleccionada, setZonaSeleccionada] = useState('');
  const [zonasMap, setZonasMap] = useState<{ [key: string]: string }>({});
  const [isNarrow, setIsNarrow] = useState(false);
  const [isMobile, setIsMobile] = useState(Dimensions.get('window').width < 768);
  const [width1, setWidth1] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const updateLayout = () => {
      const { width } = Dimensions.get('window');
      setWidth1(width);
      setIsMobile(width < 768);
      setIsNarrow(width < 500);
    };

    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription?.remove();
  }, []);
  const [isWide, setIsWide] = useState(() => Dimensions.get('window').width > 850);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const [clientesMap, setClientesMap] = useState<{ [key: string]: any }>({});
  const [vendedoresMap, setVendedoresMap] = useState<{ [key: string]: any }>({});
  const [showReferenciaForm, setShowReferenciaForm] = useState(false);
  const { width } = useWindowDimensions();

  // ReferenciaPago form state
  const [referenciaPagoForm, setReferenciaPagoForm] = useState({
    DocumentoVE: '',
    IdCliente: '',
    IdVendedor: '',
    ValorPago: ''
    // DocumentoIN se generará al momento de enviar el formulario
    // IdTransa y CreatedAt se gestionan automáticamente
  });
  const [isSubmittingReferencia, setIsSubmittingReferencia] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastDocumentoIN, setLastDocumentoIN] = useState('');
  const [isGeneratingFactura, setIsGeneratingFactura] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [isPaymentHistoryExpanded, setIsPaymentHistoryExpanded] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [paymentReferences, setPaymentReferences] = useState<any[]>([]);

  // Fetch payment references by document and type
  const fetchPaymentReferences = async (documento: string, tipo: 'VE' | 'IN') => {
    if (!documento) return;
    
    setLoadingReferences(true);
    try {
      const response = await fetch(`${apiUrl}transacciones/referencias/${documento}/${tipo}`);
      if (response.ok) {
        const data = await response.json();
        // If it's an IN type, it returns the transaction with references
        // If it's a VE type, it returns an array of references
        const references = tipo === 'IN' ? (data.ReferenciaPago || []) : data;
        setPaymentReferences(Array.isArray(references) ? references : []);
      } else {
        console.error('Error fetching references:', await response.text());
        setPaymentReferences([]);
      }
    } catch (error) {
      console.error('Error fetching references:', error);
      setPaymentReferences([]);
    } finally {
      setLoadingReferences(false);
    }
  };

  // Formatear fecha al formato DD-MM-YYYY
  const formatDateToDDMMYYYY = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Convertir de DD-MM-YYYY a YYYY-MM-DD para el estado interno
  const formatDateToYYYYMMDD = (dateStr: string) => {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  };

  // Formatear de YYYY-MM-DD a DD-MM-YYYY
  const formatToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  // Formatear de DD-MM-YYYY a YYYY-MM-DD
  const formatToYYYYMMDD = (dateStr: string) => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  };

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fecha, setFecha] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });

  // Format date to display in a more readable format
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`; // Display as DD/MM/YYYY
  };

  // Clear references when closing details modal
  useEffect(() => {
    if (!showDetailsModal) {
      setPaymentReferences([]);
      setIsPaymentHistoryExpanded(false);
    }
  }, [showDetailsModal]);

  // Handle date selection from the picker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    // On Android, the picker is closed after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFecha(formattedDate);
    }
  };
  const [concepto, setConcepto] = useState('');
  // Definir el tipo para el estado de pagos
  type PagosState = {
    efectivo: string;
    tarjeta: string;
    transferencia: string;
    cheque: string;
  };

  const [pagos, setPagos] = useState<PagosState>({
    efectivo: '',
    tarjeta: '',
    transferencia: '',
    cheque: ''
  });
  const [isPaymentValid, setIsPaymentValid] = useState(true);
  
  // Función para resetear el formulario de pago
  const resetPaymentForm = () => {
    setPagos({
      efectivo: '',
      tarjeta: '',
      transferencia: '',
      cheque: ''
    });
    setConcepto('');
  };

  const handleShowReferenciaDetail = async (referencia: any) => {
    setReferenciaSeleccionada(referencia);
    if (referencia.DocumentoIN) {
      await FetchIngresoByDocumento(referencia.DocumentoIN);
    }
    setShowReferenciaDetail(true);
  };

  // Load references when transaction is selected
  useEffect(() => {
    if (selectedTransaccion?.Documento && selectedTransaccion.Tipo) {
      fetchPaymentReferences(selectedTransaccion.Documento, selectedTransaccion.Tipo);
    } else {
      setPaymentReferences([]);
    }
  }, [selectedTransaccion]);
  
  // Función para manejar el cierre del modal
  const handleClosePaymentModal = () => {
    resetPaymentForm();
    setShowPaymentModal(false);
  };
  // Obtener configuración de impuestos
  const [configData, setConfigData] = React.useState<any>(null);
  
  // Cargar configuración al montar el componente
  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await AsyncStorage.getItem('configData');
        if (config) {
          setConfigData(JSON.parse(config));
        } else {
          // Si no hay configuración guardada, usar valores por defecto
          setConfigData({
            TipoImpuesto: 'A', // 'A' para aditivo (impuesto se suma), 'I' para inclusivo (impuesto ya está incluido)
            Impuesto: '18' // Porcentaje de impuesto
          });
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
        // Usar valores por defecto en caso de error
        setConfigData({
          TipoImpuesto: 'A',
          Impuesto: '18'
        });
      }
    };
    
    loadConfig();
  }, []);

  // Calcular el total y el impuesto con useMemo para evitar re-renders innecesarios
  const { total, impuesto, subtotal } = React.useMemo(() => {
    const totalBruto = Object.values(pagos).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const tipoImpuesto = configData?.TipoImpuesto || 'A';
    const porcentajeImpuesto = parseFloat(configData?.Impuesto || '18') / 100;
    
    let subtotalCalculado = 0;
    let impuestoCalculado = 0;
    
    if (totalBruto > 0) {
      if (tipoImpuesto === 'I') {
        // Impuesto incluido en el precio
        subtotalCalculado = totalBruto / (1 + porcentajeImpuesto);
        impuestoCalculado = totalBruto - subtotalCalculado;
      } else {
        // Impuesto aditivo (se suma al subtotal)
        subtotalCalculado = totalBruto;
        impuestoCalculado = subtotalCalculado * porcentajeImpuesto;
      }
    }
    
    return { 
      total: totalBruto, 
      impuesto: impuestoCalculado,
      subtotal: subtotalCalculado
    };
  }, [pagos, configData]);

  const fetchClients = async (query?: string, idruta?: string, idzona?: string) => {
    setLoadingClients(true);
    try {
      let url = `${apiUrl}clientes`;
      const params = [];
      if (query && query.trim() !== '') params.push(`q=${encodeURIComponent(query)}`);
      if (idruta && idruta !== '') params.push(`Idruta=${encodeURIComponent(idruta)}`);
      if (idzona && idzona !== '') params.push(`Idzona=${encodeURIComponent(idzona)}`);
      
      if (params.length > 0) {
        url += '/search?' + params.join('&');
      }

      const response = await fetch(url);
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  // Initialize client search when modal opens or filters change
  useEffect(() => {
    if (modalVisible) {
      fetchClients(search, rutaSeleccionada, zonaSeleccionada);
    }
  }, [modalVisible, rutaSeleccionada, zonaSeleccionada]);

  const handleClientSearch = () => {
    fetchClients(search, rutaSeleccionada, zonaSeleccionada);
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      handleClientSearch();
    }
  };

  const handleCloseClienteModal = () => {
    setModalVisible(false);
    setSearch('');
    setRutaSeleccionada('');
    setZonaSeleccionada('');
  };

  const cargarNombresRutas = async () => {
    try {
      const response = await fetch(`${apiUrl}rutas`);
      const data = await response.json();
      setRutas(data);
      const map = data.reduce((acc: any, ruta: any) => {
        acc[ruta.Idruta] = ruta.Ruta;
        return acc;
      }, {});
      setRutasMap(map);
    } catch (error) {
      console.error('Error fetching rutas:', error);
    }
  };

  const cargarNombresZonas = async () => {
    try {
      const response = await fetch(`${apiUrl}zonas`);
      const data = await response.json();
      setZonas(data);
      const map = data.reduce((acc: any, zona: any) => {
        acc[zona.Idzona] = zona.Zona;
        return acc;
      }, {});
      setZonasMap(map);
    } catch (error) {
      console.error('Error fetching zonas:', error);
    }
  };

  useEffect(() => {
    const updateLayout = () => {
      const width = Dimensions.get('window').width;
      setWindowWidth(width);
      setIsNarrow(width < 600);
      setIsWide(width > 850);
    };

    const subscription = Dimensions.addEventListener('change', updateLayout);
    updateLayout();

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (vendor?.IdRuta) {
      fetchClients(undefined, vendor.IdRuta);
    } else {
      fetchClients();
    }
    cargarNombresRutas();
    cargarNombresZonas();
  }, [vendor]);

  useEffect(() => {
    if (!showDetailsModal) {
      setShowReferenciaForm(false);
    }
  }, [showDetailsModal]);

  useFocusEffect(
    React.useCallback(() => {
      loadVendor();
    }, [])
  );

    // Load vendor from AsyncStorage
    const loadVendor = async () => {
      try {
        const vendorData = await AsyncStorage.getItem('currentVendor');
        if (vendorData && vendorData !== 'undefined') {
          const vendedor = JSON.parse(vendorData);
          setVendor(vendedor);
          return vendedor;
        } else {
          setVendor(null);
          return null;
        }
      } catch (err) {
        console.log('Error loading vendor:', err);
        return null;
      }
    };
    
  const themeBg = useThemeColor({}, 'background');
  const themeBg2 = useThemeColor({}, 'backgroundSecondary');
  const themeText = useThemeColor({}, 'text');
  const themeTextSecondary = useThemeColor({}, 'textSecondary');
  const themeAccent = useThemeColor({}, 'tint');
  const themeBg3 = useThemeColor({}, 'backgroundTertiary');

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Adesoft - Transacciones';
    }
    fetchTransacciones();
  }, []);

  // Llama fetchTransacciones cuando cambia filterTipo
  useEffect(() => {
    fetchTransacciones();
  }, [filterTipo]);


  // Fetch client by ID
  const fetchCliente = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}clientes/${id}`);
      if (response.ok) {
        const cliente = await response.json();
        setClientesMap(prev => ({ ...prev, [id]: cliente }));
      }
    } catch (error) {
      console.error('Error fetching cliente:', error);
    }
  };

  // Fetch vendor by ID
  // Always fetch the logged-in vendor from AsyncStorage
const fetchVendedor = async () => {
  try {
    const vendorData = await AsyncStorage.getItem('currentVendor');
    const vendedorActual = vendorData && vendorData !== 'undefined' ? JSON.parse(vendorData) : null;
    const vendedorId = vendedorActual?.IdVendedor;
    if (!vendedorId) {
      console.warn('No se pudo determinar el IdVendedor para fetchVendedor');
      return;
    }
    console.log('Fetching vendedor con ID:', vendedorId);
    const response = await fetch(`${apiUrl}vendedores/${vendedorId}`);
    if (response.ok) {
      const vendedor = await response.json();
    } else {
      // Si el vendedor no existe (404), solo mostramos un warning y NO lanzamos error, así no entra al catch
      if (response.status === 404) {
        console.warn(`El vendedor con ID ${vendedorId} no tiene ruta o no existe.`);
        // Aquí puedes agregar lógica adicional si necesitas manejar este caso en la UI
        return;
      } else {
        const errorText = await response.text();
        throw new Error(`Error al obtener vendedor: ${response.status} - ${errorText}`);
      }
    }
  } catch (error: any) {
    console.log('Error fetching vendedor:', error.message || error);
  }
};

// Fetch all vendedores and update the vendedoresMap
const fetchAllVendedores = async () => {
  try {
    const response = await fetch(`${apiUrl}vendedores`);
    if (response.ok) {
      const vendedores = await response.json();
      // Create a new map with all vendors
      const newVendedoresMap = vendedores.reduce((acc: { [key: string]: any }, vendedor: any) => {
        acc[vendedor.IdVendedor] = vendedor;
        return acc;
      }, {});
      setVendedoresMap(newVendedoresMap);
    } else {
      const errorText = await response.text();
      console.error('Error al obtener la lista de vendedores:', errorText);
    }
  } catch (error: any) {
    console.error('Error fetching vendedores:', error.message || error);
  }
};
  // Fetch client and vendor data for transactions
  const fetchClientesYVendedores = async (transacciones: Transaccion[]) => {
    try {
      // Get unique client and vendor IDs
      const clienteIds = [...new Set(transacciones.map(t => t.IdCliente))];
      const vendedorIds = [...new Set(transacciones.map(t => t.IdVendedor))];

      // Filter out already fetched clients and vendors
      const newClienteIds = clienteIds.filter(id => !clientesMap[id]);
      const newVendedorIds = vendedorIds.filter(id => !vendedoresMap[id]);

      // Fetch new clients and vendors in parallel
      await Promise.all([
        ...newClienteIds.map(id => fetchCliente(id)),
        ...newVendedorIds.map(id => fetchVendedor()),
        fetchAllVendedores(),
      ]);
    } catch (error) {
      console.error('Error fetching clientes y vendedores:', error);
    }
  };

  // Fetch transactions when selectedClient changes
  useEffect(() => {
    fetchTransacciones();
  }, [selectedClient, searchQuery, filterTipo]);

  // Aplicar filtros automáticamente
  useEffect(() => {
    if (vendor) { // Solo ejecutar si el vendedor ya se ha cargado
      const debouncedFetch = setTimeout(() => {
        fetchTransacciones();
      }, 500);

      return () => clearTimeout(debouncedFetch);
    }
  }, [searchQuery, filterTipo, vendor]);

  const fetchTransacciones = async () => {
    setLoading(true);
    try {
      // Si el filtro es IN, llamar a la ruta de ingresos
      if (filterTipo === 'IN') {
  let url = `${apiUrl}transacciones/ingresos`;
  const params = new URLSearchParams();

  if (selectedClient) {
    url = `${apiUrl}transacciones/ingresos`;
    params.append('IdCliente', selectedClient.IdCliente);
  }
  if (searchQuery && searchQuery.trim() !== '') {
    params.append('Documento', searchQuery.trim());
  }

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await fetch(url);
  if (response.ok) {
    let data = await response.json();
    setTransacciones(data);
    if (data.length > 0) {
      await fetchClientesYVendedores(data);
    }
  } else {
    setTransacciones([]);
  }
  setLoading(false);
  return;
}
      // Lógica original para VE
      if (!vendor?.IdVendedor) {
        setLoading(false);
        return;
      }

      let url: string | undefined;
      // Si el vendedor no tiene ruta, trae todas las transacciones pendientes y desactiva búsqueda por id
      if (!vendor?.IdRuta) {
        url = `${apiUrl}transacciones/pendientes`;
      } else if (selectedClient) {
        url = `${apiUrl}transacciones/pendientes/cliente/${selectedClient.IdCliente}`;
      }  if (vendor?.IdRuta !== null) {
        url = `${apiUrl}transacciones/pendientes/vendedor/${vendor?.IdVendedor}`;
      }

      if (!url) {
        setLoading(false);
        throw new Error('No se pudo determinar la URL para obtener transacciones.');
      }
      
      const params = new URLSearchParams();

      // Siempre agrega los filtros de búsqueda (Documento y Tipo) si existen
      if (searchQuery) {
        params.append('Documento', searchQuery);
      }
      if (filterTipo) {
        params.append('Tipo', filterTipo);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setTransacciones(data);
        // Fetch related client and vendor data
        if (data.length > 0) {
          await fetchClientesYVendedores(data);
        }
      } else {
        console.error('Error fetching transacciones:', response.statusText);
        setTransacciones([]);
      }
    } catch (error) {
      console.error('Error fetching transacciones:', error);
      setTransacciones([]);
    } finally {
      setLoading(false);
    }
  };

  const FetchIngresoByDocumento = async (documento: string) => {
    try {
      const response = await fetch(`${apiUrl}transacciones/info-ingreso/${documento}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTransaccion(data);
        console.log(data);
      } else {
        console.error('Error fetching transaccion:', response.statusText);
        setSelectedTransaccion(null);
      }
    } catch (error) {
      console.error('Error fetching transaccion:', error);
      setSelectedTransaccion(null);
    }
  };

  // Function to check if payment is valid (total <= pending amount)
  const validatePayment = (pagos: PagosState): boolean => {
    if (!selectedTransaccion || selectedTransaccion.Pendiente === undefined) return false;
    
    const totalPago = Object.values(pagos).reduce((sum, val) => {
      return sum + (parseFloat(val) || 0);
    }, 0);
    
    return totalPago > 0 && totalPago <= (selectedTransaccion.Pendiente || 0);
  };

  // Update payment validation whenever pagos or selected transaction changes
  useEffect(() => {
    if (showPaymentModal) {
      // Buscar el último IdTransa y formatear como DocumentoIN
      if (transacciones.length > 0) {
        const maxId = Math.max(...transacciones.map(t => t.IdTransa));
        const nextId = maxId + 1;
        const nextDocumentoIN = nextId.toString().padStart(8, '0');
        setLastDocumentoIN(nextDocumentoIN);
      } else {
        setLastDocumentoIN('00000001');
      }
    }
  }, [showPaymentModal, transacciones]);

  useEffect(() => {
    if (selectedTransaccion) {
      setIsPaymentValid(validatePayment(pagos));
    }
  }, [pagos, selectedTransaccion]);

  const handlePaymentChange = (method: keyof PagosState, value: string) => {
    // Allow only numbers and one decimal point
    const regex = /^\d*\.?\d{0,2}$/;
    
    if (value === '' || regex.test(value)) {
      setPagos(prevPagos => {
        const newPagos = {
          ...prevPagos,
          [method]: value
        };
        
        // Update validation state
        setIsPaymentValid(validatePayment(newPagos));
        
        return newPagos;
      });
    }
  };

  
  // Utilidad para obtener el siguiente Documento IN (8 dígitos, basado en el mayor IdReferencia)
  const getNextDocumentoIN = () => {
    let maxId = 0;
    transacciones.forEach(tr => {
      tr.ReferenciaPago?.forEach(ref => {
        if (typeof ref.IdReferencia === 'number' && ref.IdReferencia > maxId) {
          maxId = ref.IdReferencia;
        }
      });
    });
    // Siguiente número secuencial
    const nextId = maxId + 1;
    // Retornar como string de 8 dígitos, rellenando con ceros a la izquierda
    return nextId.toString().padStart(8, '0');
  };

  const handleViewDetails = async (transaccion: Transaccion) => {
    setSelectedTransaccion(transaccion);
    // Usar estado vendor para IdVendedor
    setReferenciaPagoForm({
      DocumentoVE: '',
      IdCliente: transaccion.IdCliente,
      IdVendedor: vendor?.IdVendedor || '',
      ValorPago: ''
    });
    setShowDetailsModal(true);
  };

  

  // Utilidad para formatear fecha y hora con AM/PM como en Ordenes.tsx
  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const formattedDate = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const formattedTime = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${formattedDate} ${formattedTime}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  const getTipoLabel = (tipo?: string) => {
    switch (tipo) {
      case 'VE': return 'Venta';
      case 'IN': return 'Ingreso';
      default: return 'N/A';
    }
  };

  const getTipoColor = (tipo?: string) => {
    switch (tipo) {
      case 'VE': return '#4CAF50';
      case 'IN': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterTipo('');
    setFilterCliente('');
    setFilterVendedor('');
    setSelectedClient(null); // Clear the selected client when clearing filters
    // Also clear the client search filters
    setSearch('');
    setRutaSeleccionada('');
    setZonaSeleccionada('');
  };

  const handleReferenciaPagoSubmit = async () => {
    if (!selectedTransaccion) {
      alert('No se ha seleccionado ninguna transacción');
      return;
    }

    // Calculate total payment from all payment methods
    const totalPago = parseFloat(pagos.efectivo || '0') +
                     parseFloat(pagos.tarjeta || '0') +
                     parseFloat(pagos.transferencia || '0') +
                     parseFloat(pagos.cheque || '0');

    if (totalPago <= 0 || (selectedTransaccion?.Pendiente !== undefined && totalPago > selectedTransaccion.Pendiente)) {
      alert('El monto total del pago no puede exceder el monto pendiente');
      return;
    }

    setIsSubmittingReferencia(true);

    try {
      // Get tax configuration
      const config = configData || { TipoImpuesto: 'A', Impuesto: '18' };
      const tipoImpuesto = config.TipoImpuesto || 'A';
      const porcentajeImpuesto = parseFloat(config.Impuesto || '18') / 100;
      
      // Calculate tax based on tax type
      let valorImp = 0;
      if (tipoImpuesto === 'I') {
        // Inclusivo: el impuesto ya está incluido en el total
        valorImp = totalPago - (totalPago / (1 + porcentajeImpuesto));
      } else {
        // Aditivo: el impuesto se suma al subtotal
        valorImp = totalPago * porcentajeImpuesto;
      }

      let result: any = null;
      const fetchBody = {
        transaccionData: {
          Fecha: new Date().toISOString(),
          IdCliente: selectedTransaccion.IdCliente,
          IdVendedor: vendor?.IdVendedor || '',
          Valor: totalPago,
          ValorImp: parseFloat(valorImp.toFixed(2)),
          Concepto: concepto || `Pago de factura ${selectedTransaccion.Documento || ''}`,
          Efectivo: parseFloat(pagos.efectivo) || 0,
          Tarjeta: parseFloat(pagos.tarjeta) || 0,
          Transferencia: parseFloat(pagos.transferencia) || 0,
          Cheque: parseFloat(pagos.cheque) || 0,
        },
        transaccionOriginalId: selectedTransaccion.IdTransa,
        montoPago: totalPago
      };
      console.log('Body enviado al backend:', fetchBody);
      const response = await fetch(`${apiUrl}transacciones/ingreso-pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fetchBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar el pago');
      }

      result = await response.json();
      console.log('Respuesta recibida del backend:', result);

      // Validar que el backend devolvió la transacción IN creada
      if (!result.ingreso || typeof result.ingreso.IdTransa === 'undefined' || result.ingreso.IdTransa === null) {
        throw new Error('No se recibió la transacción IN creada del backend. Por favor verifique la respuesta del servidor.');
      }
      // Guardar el IdTransa de la transacción IN creada
      const idTransaIN = result.ingreso.IdTransa;

      // Update the pending amount in the current transaction to reflect the payment
      if (selectedTransaccion.Pendiente !== undefined) {
        const updatedPendiente = selectedTransaccion.Pendiente - totalPago;
        const newReferencia = {
          IdReferencia: result.referencia.IdReferencia,
          IdTransa: idTransaIN, // Usar el id de la transacción IN creada
          DocumentoIN: result.ingreso.Documento, // SIEMPRE usar el valor del backend
          DocumentoVE: selectedTransaccion.Documento || '',
          IdCliente: selectedTransaccion.IdCliente,
          IdVendedor: vendor?.IdVendedor || '',
          ValorPago: totalPago,
          CreatedAt: new Date().toISOString()
        };

        // Si quieres que la transacción seleccionada sea ahora la IN creada:
        const updatedSelectedTransaccion = {
          ...selectedTransaccion,
          IdTransa: idTransaIN, // Actualiza el id a la transacción IN creada
          Pendiente: updatedPendiente > 0 ? updatedPendiente : 0,
          ReferenciaPago: [
            ...(selectedTransaccion.ReferenciaPago || []),
            newReferencia
          ]
        };

        // Update the selected transaction state
        setSelectedTransaccion(updatedSelectedTransaccion);

        // Update the transaction in the transacciones list
        setTransacciones(prevTransacciones =>
          prevTransacciones.map(t =>
            t.IdTransa === selectedTransaccion.IdTransa
              ? {
                  ...t,
                  IdTransa: idTransaIN, // Actualiza también en la lista
                  Pendiente: updatedPendiente > 0 ? updatedPendiente : 0,
                  ReferenciaPago: [
                    ...(t.ReferenciaPago || []),
                    newReferencia
                  ]
                }
              : t
          )
        );
      }
      
      // Close payment modal
      setShowPaymentModal(false);
      // Mostrar solo el modal de éxito primero
      setLastDocumentoIN(result.ingreso.Documento || '');
      setShowSuccessModal(true);
      // El modal de detalles se abrirá cuando se cierre el de éxito
      
      // Refresh transactions from server in the background
      fetchTransacciones().catch(console.error);
      
      // Reset forms
      resetPaymentForm();
      // Usar estado vendor para IdVendedor
      setReferenciaPagoForm({
        DocumentoVE: '',
        IdCliente: selectedTransaccion.IdCliente,
        IdVendedor: vendor?.IdVendedor || '',
        ValorPago: ''
      });
      
    } catch (error: any) {
      console.error('Error al procesar el pago:', error);
      alert(`Error: ${error.message || 'No se pudo procesar el pago'}`);
    } finally {
      setIsSubmittingReferencia(false);
    }
  };


  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Transacciones', headerShown: false }} />
      
      <ThemedView style={styles.header}>
        <ThemedText style={[styles.title, { color: themeText }]}>Transacciones</ThemedText>
        <Pressable style={styles.refreshButton} onPress={fetchTransacciones}>
          <Feather name="refresh-cw" size={20} color={themeAccent} />
        </Pressable>
      </ThemedView>

      {vendor && (
        <View style={[styles.infoBanner, { backgroundColor: themeBg2, borderColor: themeAccent }]}> 
          <Feather name="info" size={18} color={themeAccent} style={{ marginRight: 8 }} />
          { !vendor.IdRuta ? (
            <ThemedText style={{ color: themeText, flex: 1 }}>
              El vendedor no tiene una ruta asignada. Se mostrarán todas las transacciones con valor pendiente.
            </ThemedText>
          ) : (
            <ThemedText style={{ color: themeText, flex: 1 }}>
              Mostrando transacciones pendientes para la ruta: {rutasMap[vendor.IdRuta] || vendor.IdRuta}
            </ThemedText>
          ) }
        </View>
      )}

  

             
          
              {/* Modal para seleccionar cliente */}
                          <Modal
                            visible={modalVisible}
                            animationType="slide"
                            transparent={true}
                            onRequestClose={handleCloseClienteModal}
                          >
                             <Pressable style={[styles.modalOverlay]} onPress={handleCloseClienteModal}>
                              <Pressable
                                style={[
                                  styles.modalContent,
                                  {
                                    backgroundColor: themeBg2,
                                    width: '98%',
                                    minWidth: 350,
                                    padding: 16,
                                  },
                                ]}
                                {...(Platform.OS === 'web' ? { className: 'modal-maxwidth-99vw modal-width-98vw' } : {})}
                                onPress={e => e.stopPropagation()}
                              >
                                {/* Cabecera del modal igual a Dashboard */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                  <ThemedText style={{ color: themeText, fontSize: 18 }}>Seleccionar Cliente</ThemedText>
                                  <Pressable onPress={handleCloseClienteModal}>
                                    <Feather name="x" size={24} color={themeText} />
                                  </Pressable>
                                </View>
                                {/* Mensaje de ruta o de no ruta, igual a Dashboard */}
                                {vendor?.IdRuta ? (
                                  <ThemedText style={{ color: themeAccent, fontStyle: 'italic', textAlign: 'center', marginBottom: 10, fontSize: 14 }}>
                                    Mostrando clientes de la ruta: {rutasMap[vendor.IdRuta] || vendor.IdRuta}
                                  </ThemedText>
                                ) : (
                                  <ThemedText style={{ color: themeTextSecondary, fontStyle: 'italic', textAlign: 'center', marginBottom: 10, fontSize: 14 }}>
                                    El vendedor no tiene una ruta asignada. Se mostrarán todos los clientes.
                                  </ThemedText>
                                )}
                                {/* Buscador y filtros igual a Dashboard */}
                                <View
                                  style={{
                                    flexDirection: isNarrow ? 'column' : 'row',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    marginBottom: isNarrow ? 4 : 8,
                                    gap: isNarrow ? 2 : 8,
                                  }}
                                >
                                  <View style={[styles.searchInputContainer, { borderColor: themeAccent, flex: 1, minWidth: 150, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'transparent', borderWidth: 1, paddingVertical: 0, paddingHorizontal: 2 }]}> 
                                    <ThemedInput
                                      placeholder="Buscar cliente..."
                                      value={search}
                                      onChangeText={setSearch}
                                      editable={!loadingClients}
                                      style={[styles.searchInput, {borderWidth: 0, height: '100%', transform: [{ translateY: 5 }] }]}
                                      onSubmitEditing={handleClientSearch}
                                    />
                                    <Pressable onPress={handleClientSearch} style={styles.searchIcon}>
                                      <Feather name="search" size={20} color={themeAccent} />
                                    </Pressable>
                                  </View>
                                  {isWide ? (
                                    <View style={{ flexDirection: 'row', flex: 1, gap: 8 }}>
                                      <ThemedPicker
                                        selectedValue={rutaSeleccionada}
                                        onValueChange={setRutaSeleccionada}
                                      >
                                        <Picker.Item label="FILTRAR POR RUTA" value="" />
                                        {rutas.map((ruta: any) => (
                                          <Picker.Item key={ruta.Idruta} label={ruta.Ruta || ruta.Idruta} value={ruta.Idruta} />
                                        ))}
                                      </ThemedPicker>
                                      <ThemedPicker
                                        selectedValue={zonaSeleccionada}
                                        onValueChange={setZonaSeleccionada}
                                      >
                                        <Picker.Item label="FILTRAR POR ZONA" value="" />
                                        {zonas.map((zona: any) => (
                                          <Picker.Item key={zona.Idzona} label={zona.Zona || zona.Idzona} value={zona.Idzona} />
                                        ))}
                                      </ThemedPicker>
                                    </View>
                                  ) : (
                                    <>
                                      <ThemedPicker
                                        selectedValue={rutaSeleccionada}
                                        onValueChange={setRutaSeleccionada}
                                      >
                                        <Picker.Item label="FILTRAR POR RUTA" value="" />
                                        {rutas.map((ruta: any) => (
                                          <Picker.Item key={ruta.Idruta} label={ruta.Ruta || ruta.Idruta} value={ruta.Idruta} />
                                        ))}
                                      </ThemedPicker>
                                      <ThemedPicker
                                        selectedValue={zonaSeleccionada}
                                        onValueChange={setZonaSeleccionada}
                                        style={{ marginTop: isNarrow ? 0 : undefined }}
                                      >
                                        <Picker.Item label="FILTRAR POR ZONA" value="" />
                                        {zonas.map((zona: any) => (
                                          <Picker.Item key={zona.Idzona} label={zona.Zona || zona.Idzona} value={zona.Idzona} />
                                        ))}
                                      </ThemedPicker>
                                    </>
                                  )}
                                </View>
                                {/* FIN bloque buscador y filtros cliente */}

                                {loadingClients ? (
                                  <ActivityIndicator color={themeAccent} style={{ marginVertical: 20 }} />
                                ) : (
                                  <ScrollView
                                    style={styles.clientList}
                                    {...(Platform.OS === 'web' ? { className: 'custom-scrollbar' } : {})}
                                    contentContainerStyle={{ paddingBottom: 12 }}
                                    showsVerticalScrollIndicator={true}
                                    indicatorStyle={themeAccent === '#fff' ? 'white' : 'black'}
                                  >
                                    {clients.length === 0 ? (
                                      <ThemedText style={{ color: themeText, textAlign: 'center', marginTop: 16 }}>No hay clientes.</ThemedText>
                                    ) : (
                                      clients.slice(0, 20).map((client, idx) => (
                                        <Pressable
                                          key={client.IdCliente || client.id || idx}
                                          style={[styles.clientItem, selectedClient && selectedClient.IdCliente === client.IdCliente ? { borderColor: themeAccent, borderWidth: 2 } : {}]}
                                          onPress={() => {
                                            setSelectedClient(client);
                                            setModalVisible(false);
                                          }}
                                        >
                                          <ThemedText style={{ color: themeAccent, fontWeight: 'bold', fontSize: 15, marginLeft: 8, flexWrap: 'wrap' }}>
                                            RNC: {client.Rnc}
                                          </ThemedText>
                                          <ThemedText style={{  fontWeight: '500', fontSize: 15, marginLeft: 8, flexWrap: 'wrap' }}>
                                            {client.NombreC} <ThemedText style={{ fontWeight: 'bold', color: themeTextSecondary }}>({client.IdCliente})</ThemedText>
                                          </ThemedText>
                                          <ThemedText style={{ color: themeText, fontSize: 13, marginLeft: 8, flexWrap: 'wrap' }}>
                                            Zona: {zonasMap[client.Idzona] !== undefined ? zonasMap[client.Idzona] : ''}, Ruta: {rutasMap[client.Idruta] !== undefined ? rutasMap[client.Idruta] : ''} 
                                          </ThemedText>
                                          <ThemedText style={{ color: themeText, fontSize: 13, marginLeft: 8, flexWrap: 'wrap' }}>
                                            Tel: {client.TelefonoC}
                                          </ThemedText>
                                          <ThemedText style={{ color: themeText, fontSize: 13, marginLeft: 8, flexWrap: 'wrap' }}>
                                            Dirección: {client.DireccionC1}
                                          </ThemedText>
                                        </Pressable>
                                      ))
                                    )}
                                  </ScrollView>
                                )}
              
                              </Pressable>
                            </Pressable>
                          </Modal>

          
        

      {/* Barra de búsqueda dinámica solo ejecuta búsqueda con Enter o icono */}
<View
  style={{
    flexDirection: isNarrow ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
    width: '100%',
  }}
>
  {/* Filtros de tipo */}
  <View style={{ flexDirection: isNarrow ? 'row' : 'row', width: isNarrow ? '100%' : undefined, justifyContent: isNarrow ? 'center' : undefined, marginBottom: isNarrow ? 6 : 0 }}>
    <Pressable
      onPress={() => setFilterTipo('VE')}
      style={{ height: 40, width: 110, borderRadius: 8, backgroundColor: filterTipo === 'VE' ? themeAccent : themeBg2, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
      <ThemedText style={{ color: filterTipo === 'VE' ? '#fff' : themeText, fontWeight: 'bold' }}>Ventas</ThemedText>
    </Pressable>
    <Pressable
      onPress={() => setFilterTipo('IN')}
      style={{ height: 40, width: 110, borderRadius: 8, backgroundColor: filterTipo === 'IN' ? themeAccent : themeBg2, alignItems: 'center', justifyContent: 'center', marginRight: isNarrow ? 0 : 12 }}>
      <ThemedText style={{ color: filterTipo === 'IN' ? '#fff' : themeText, fontWeight: 'bold' }}>Ingresos</ThemedText>
    </Pressable>
  </View>

  {/* Buscar por cliente (abre modal de clientes) */}
  <View style={{ flexDirection: 'row', alignItems: 'center', width: isNarrow ? '80%' : 200, height: 40, backgroundColor: themeBg2, borderRadius: 8, borderWidth: 1, borderColor: themeAccent, marginBottom: isNarrow ? 6 : 0, paddingHorizontal: 8 }}>
  <Pressable
    onPress={() => setModalVisible(true)}
    style={{ flexDirection: 'row', alignItems: 'center', flex: 1, height: '100%' }}
    disabled={!!selectedClient} // Deshabilitar si hay cliente seleccionado
  >
    <Feather name="users" size={20} color={themeAccent} style={{ marginRight: 8 }} />
    <ThemedText
      style={{
        color: themeText,
        fontWeight: 'bold',
        flex: 1,
        overflow: 'hidden',
        textAlignVertical: 'center',
      }}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {selectedClient ? selectedClient.NombreC : 'Buscar cliente...'}
    </ThemedText>
  </Pressable>
  {selectedClient && (
    <Pressable
      onPress={() => setSelectedClient(null)}
      style={{ marginLeft: 8, padding: 2, borderRadius: 16, backgroundColor: 'transparent', height: 28, width: 28, alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel="Quitar cliente seleccionado"
    >
      <Feather name="x" size={18} color={themeAccent} />
    </Pressable>
  )}
</View>

  {/* Barra de búsqueda dinámica solo ejecuta búsqueda con Enter o icono */}
  <View
  style={{
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: isNarrow ? 'center' : 'flex-start',
    width: isNarrow ? '100%' : 220,
    minHeight: 40,
    marginBottom: isNarrow ? 6 : 0,
    paddingVertical: 0,
    paddingHorizontal: isNarrow ? 0 : 2,
    backgroundColor: 'transparent',
    marginTop: 18,

  }}
>
  <ThemedInput
    placeholder="Buscar transacción..."
    value={searchInput}
    onChangeText={setSearchInput}
    style={{
      minWidth: 110,
      maxWidth: 150,
      height: 40,
      borderRadius: 8,
      marginRight: 4,
      backgroundColor: themeBg2,
      borderWidth: 0,
      borderColor: themeAccent,
      textAlignVertical: 'center',
      paddingVertical: 0,
      paddingHorizontal: 10,
      textAlign: 'left',
      alignSelf: 'center',
    }}
    editable={!loading}
    autoCorrect={false}
    autoCapitalize="none"
    clearButtonMode="while-editing"
    onSubmitEditing={() => setSearchQuery(searchInput)}
    returnKeyType="search"
  />
  <Pressable onPress={() => setSearchQuery(searchInput)} style={{ height: 40, width: 36, alignItems: 'center', justifyContent: 'center', marginRight: 2, alignSelf: 'center' }}>
    <Feather name="search" size={20} color={themeAccent} />
  </Pressable>
  <Pressable onPress={() => { setSearchInput(''); setSearchQuery(''); }} style={{ height: 40, width: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
    <Feather name="x" size={20} color={themeAccent} />
  </Pressable>
</View>
</View>

{loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeAccent} />
          <ThemedText style={styles.loadingText}>Cargando transacciones...</ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {transacciones.length > 0 ? (
            <View style={styles.transaccionesContainer}>
              <View style={styles.transaccionesGrid}>
                {[...transacciones]
                  .filter((t) => {
                    if (filterTipo === 'VE' && selectedClient) {
                      return t.IdCliente === selectedClient.IdCliente && (t.Pendiente ?? 0) > 0;
                    }
                    if (filterTipo === 'IN') {
                      // No filtrar localmente por cliente, ya viene filtrado del backend
                      return true;
                    }
                    const query = searchQuery.trim().toLowerCase();
                    if (!query) return true;
                    const doc = (t.Documento || '').toLowerCase();
                    const cliente = (clientesMap?.[t.IdCliente]?.NombreC || '').toLowerCase();
                    const id = String(t.IdTransa);
                    return (
                      doc.includes(query) ||
                      cliente.includes(query) ||
                      id.includes(query)
                    );
                  })
                  .sort((a, b) => b.IdTransa - a.IdTransa)
                  .slice(0, 20)
                  .map((transaccion) => (
                <ThemedView 
                  key={transaccion.IdTransa} 
                  style={[
                    styles.transaccionCard, 
                    isMobile && (width < 600 ? styles.transaccionCardMobile : styles.transaccionCardNarrow),
                    { backgroundColor: themeBg2 }
                  ]}
                >
                  <View style={[styles.transaccionHeader, { borderBottomColor: themeTextSecondary + '20' }]}>
                    <View style={styles.transaccionInfo}>
                      <ThemedText style={[styles.transaccionId, { color: themeText }]}>
                        Transacción #{transaccion.IdTransa}
                      </ThemedText>
                      <ThemedText style={[styles.transaccionDate, { color: themeTextSecondary }]}>
                        {formatDateTime(transaccion.Fecha)}
                      </ThemedText>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      { 
                        backgroundColor: getTipoColor(transaccion.Tipo),
                        marginLeft: 8
                      }
                    ]}>
                      <ThemedText style={styles.statusBadgeText}>
                        {getTipoLabel(transaccion.Tipo)}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.transaccionDetails}>
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: themeTextSecondary }]}>Documento</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: themeText }]}>
                        {transaccion.Documento || 'N/A'}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: themeTextSecondary }]}>Cliente</ThemedText>
                      <ThemedText 
                        style={[styles.detailValue, { 
                          color: themeText,
                          textAlign: 'right'
                        }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {clientesMap[transaccion.IdCliente]?.NombreC || 'Cargando...'}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: themeTextSecondary }]}>Vendedor</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: themeText }]}>
                        {vendedoresMap[transaccion.IdVendedor]?.NombreV || 'Cargando...'}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: themeTextSecondary }]}>
                        {transaccion?.Pendiente !== undefined && transaccion?.Pendiente > 0 ? 'Pendiente' : 'Valor'}
                      </ThemedText>
                      <ThemedText style={[
                        styles.detailValue, 
                        { 
                          color: transaccion?.Pendiente !== undefined && transaccion?.Pendiente > 0 ? '#FF3B30' : '#34C759',
                          fontWeight: 'bold',
                          fontSize: 15
                        }
                      ]}>
                        {formatCurrency(transaccion?.Pendiente !== undefined && transaccion?.Pendiente > 0 ? transaccion?.Pendiente : transaccion?.Valor || 0)}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.buttonContainer, { borderTopColor: themeTextSecondary + '20' }]}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.viewButton, 
                        { 
                          backgroundColor: 'transparent',
                          borderColor: themeAccent,
                          opacity: pressed ? 0.7 : 1
                        }
                      ]}
                      onPress={() => handleViewDetails(transaccion)}
                    >
                      <Feather name="eye" size={16} color={themeAccent} />
                      <ThemedText style={[styles.viewButtonText, { color: themeAccent }]}>
                        Ver Detalles
                      </ThemedText>
                    </Pressable>
                  </View>
                  </ThemedView>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="file-text" size={48} color={themeTextSecondary} />
              <ThemedText style={[styles.emptyText, { color: themeTextSecondary }]}>No se encontraron transacciones.</ThemedText>
            </View>
          )}
        </ScrollView>
      )}

      {selectedTransaccion && (
        <Modal
          visible={showDetailsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDetailsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: themeBg2 }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={[styles.modalTitle, { color: themeText }]}>Detalles de Transacción</ThemedText>
                <Pressable onPress={() => { setShowDetailsModal(false); fetchTransacciones(); }}>
                  <Feather name="x" size={24} color={themeText} />
                </Pressable>
              </View>

              <ScrollView 
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <View style={styles.detailsContainer}>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <ThemedText style={[styles.infoLabel, { color: themeTextSecondary }]}>Documento:</ThemedText>
                      <ThemedText style={styles.infoValue}>{selectedTransaccion.Documento || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoItem}>
                      <ThemedText style={[styles.infoLabel, { color: themeTextSecondary }]}>Tipo:</ThemedText>
                      <ThemedText style={[styles.infoValue, { color: getTipoColor(selectedTransaccion.Tipo) }]}>
                        {getTipoLabel(selectedTransaccion.Tipo)}
                      </ThemedText>
                    </View>
                    <View style={styles.infoItem}>
                      <ThemedText style={[styles.infoLabel, { color: themeTextSecondary }]}>Fecha:</ThemedText>
                      <ThemedText style={styles.infoValue}>
                        {selectedTransaccion.Fecha ? formatDateTime(selectedTransaccion.Fecha) : 'N/A'}
                      </ThemedText>
                    </View>
                    <View style={styles.infoItem}>
                      <ThemedText style={[styles.infoLabel, { color: themeTextSecondary }]}>Cliente:</ThemedText>
                      <ThemedText style={styles.infoValue}>
                        {clientesMap[selectedTransaccion.IdCliente]?.NombreC || 'Desconocido'} ({selectedTransaccion.IdCliente})
                      </ThemedText>
                    </View>
                    <View style={styles.infoItem}>
                      <ThemedText style={[styles.infoLabel, { color: themeTextSecondary }]}>Vendedor:</ThemedText>
                      <ThemedText style={styles.infoValue}>
                        {vendedoresMap[selectedTransaccion.IdVendedor]?.NombreV || 'Desconocido'} ({selectedTransaccion.IdVendedor})
                      </ThemedText>
                    </View>
         
                     {(selectedTransaccion?.Tipo ?? 'IN') !== 'IN' && (<View style={styles.infoItem}>
                      <ThemedText style={[styles.infoLabel, { color: themeTextSecondary }]}>Pendiente:</ThemedText>
                     
                      <ThemedText 
                        style={[ 
                        styles.infoValue, 
                        { 
                          fontWeight: 'bold',
                          color: (selectedTransaccion.Pendiente ?? 0) > 0 ? '#ff3b30' : '#34c759'
                        }
                      ]}>
                        {formatCurrency(selectedTransaccion.Pendiente ?? 0)}
                      </ThemedText>
                   
                    </View> )}
                  </View>
                  
                  {(selectedTransaccion?.Tipo ?? 'IN') !== 'IN' && (
    <Pressable
      style={[styles.viewButton, { backgroundColor: 'green', maxWidth: 200, alignSelf: 'flex-end' }]}
      onPress={() => {
        setShowDetailsModal(false);
        setShowPaymentModal(true);
      }}
    >
      <Feather name="dollar-sign" size={16} color={themeText} />
      {(selectedTransaccion?.Pendiente ?? 0) > 0 ? (
        <ThemedText style={[styles.viewButtonText, { color: themeText }]}>Realizar Pago</ThemedText>
      ) : (
        <ThemedText style={[styles.viewButtonText, { color: themeText }]}>No hay saldo pendiente</ThemedText>
      )}
    </Pressable>
  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
  {(selectedTransaccion?.Tipo ?? 'IN') === 'IN' ? (
    <View style={{ width: '100%' }}>
      <ThemedText style={[styles.sectionTitle, { marginBottom: 12 }]}>
        Pago Asociado (TOTAL: {selectedTransaccion?.Valor ? formatCurrency(selectedTransaccion.Valor) : formatCurrency(0)})
      </ThemedText>
      
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: themeTextSecondary }]}>Efectivo:</ThemedText>
          <ThemedText style={styles.infoValue}>
            {selectedTransaccion?.Efectivo ? formatCurrency(selectedTransaccion.Efectivo) : formatCurrency(0)}
          </ThemedText>
        </View>
        
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: themeTextSecondary }]}>Tarjeta:</ThemedText>
          <ThemedText style={styles.infoValue}>
            {selectedTransaccion?.Tarjeta ? formatCurrency(selectedTransaccion.Tarjeta) : formatCurrency(0)}
          </ThemedText>
        </View>
        
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: themeTextSecondary }]}>Transferencia:</ThemedText>
          <ThemedText style={styles.infoValue}>
            {selectedTransaccion?.Transferencia ? formatCurrency(selectedTransaccion.Transferencia) : formatCurrency(0)}
          </ThemedText>
        </View>
        
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: themeTextSecondary }]}>Cheque:</ThemedText>
          <ThemedText style={styles.infoValue}>
            {selectedTransaccion?.Cheque ? formatCurrency(selectedTransaccion.Cheque) : formatCurrency(0)}
          </ThemedText>
        </View>
      </View>
    </View>
  ) : (
    <View style={{ flex: 1}}>
      <View style={{  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable 
          onPress={() => setIsPaymentHistoryExpanded(!isPaymentHistoryExpanded)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <ThemedText style={[styles.sectionTitle, { marginBottom: 0, marginRight: 8 }]}> 
            Historial de Pagos
            {paymentReferences.length > 0 && (
              <ThemedText style={{ color: themeTextSecondary, fontSize: 14 }}>
                {' '}({paymentReferences.length})
              </ThemedText>
            )}
          </ThemedText>
          <Feather 
            name={isPaymentHistoryExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={themeText} 
            style={{ marginLeft: 8 }}
          />
        </Pressable>
        {loadingReferences && (
          <ActivityIndicator size="small" color={themeAccent} />
        )}
      </View>
      
      {isPaymentHistoryExpanded && paymentReferences.length > 0 && (
        <View style={{ marginTop: 12, borderWidth: 1, borderColor: themeTextSecondary, borderRadius: 8, overflow: 'hidden' }}>
          <View style={[styles.referenciaHeader, { backgroundColor: themeBg2 }]}>
            <ThemedText style={[styles.referenciaHeaderText, { flex: 0.5 }]}>#</ThemedText>
            <ThemedText style={[styles.referenciaHeaderText, { flex: 2 }]}>Doc. IN</ThemedText>
            <ThemedText style={[styles.referenciaHeaderText, { flex: 2 }]}>Fecha</ThemedText>
            <ThemedText style={[styles.referenciaHeaderText, { flex: 1, textAlign: 'right' }]}>Monto</ThemedText>
            <ThemedText style={[styles.referenciaHeaderText, { flex: 0.5 }]}></ThemedText>
          </View>
          <View>
            {paymentReferences.map((ref, index) => {
              const formattedDate = ref.CreatedAt 
                ? new Date(ref.CreatedAt).toLocaleDateString('es-DO') 
                : 'N/A';
                
              return (
                <View key={ref.IdReferencia} style={[styles.referenciaRow, { 
                  backgroundColor: themeBg2,
                  borderBottomWidth: index === paymentReferences.length - 1 ? 0 : 1,
                  borderBottomColor: themeTextSecondary + '20'
                }]}>
                  <ThemedText style={[styles.referenciaText, { flex: 0.5 }]}>
                    {index + 1}
                  </ThemedText>
                  <ThemedText style={[styles.referenciaText, { flex: 2 }]}>
                    {ref.DocumentoIN || 'N/A'}
                  </ThemedText>
                  <ThemedText style={[styles.referenciaText, { flex: 2 }]}>
                    {formattedDate}
                  </ThemedText>
                  <ThemedText style={[styles.referenciaText, { 
                    flex: 1, 
                    textAlign: 'right',
                    color: (ref.ValorPago ?? 0) > 0 ? '#34c759' : undefined
                  }]}>
                    {formatCurrency(ref.ValorPago ?? 0)}
                  </ThemedText>
                  <ThemedText style={[styles.referenciaText, { flex: 0.5, textAlign: 'right' }]}>
                    <Pressable onPress={() => handleShowReferenciaDetail(ref)}>
                      <Feather name="eye" size={18} color={themeAccent} />
                    </Pressable>
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>
      )}
      
      {isPaymentHistoryExpanded && paymentReferences.length === 0 && !loadingReferences && (
        <ThemedText style={{ color: themeTextSecondary, textAlign: 'center', marginTop: 16 }}>
          No hay referencias de pago registradas
        </ThemedText>
      )}
    </View>
  )}
  
</View>
                  
                </View>
              </ScrollView>
            </ThemedView>
          </View>
        </Modal>
      )}
      
      {/* Modal de éxito al guardar pago */}
<Modal
  visible={showSuccessModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowSuccessModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, { backgroundColor: themeBg2, maxWidth: 400, width: '90%' }]}>  
      <Feather name="check-circle" size={48} color="#4CAF50" style={{ alignSelf: 'center', marginBottom: 12 }} />
      <ThemedText style={{ color: themeText, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
        ¡Pago guardado exitosamente!
      </ThemedText>
      <ThemedText style={{ fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
        Número de Documento IN:
      </ThemedText>
      <ThemedText style={{ fontSize: 28, fontWeight: 'bold', color: themeAccent, textAlign: 'center', marginBottom: 24 }}>
        {lastDocumentoIN}
      </ThemedText>
      
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton, 
            { 
              backgroundColor: pressed ? themeAccent : themeAccent,
              marginRight: 8
            }
          ]}
          onPress={async () => {
            if (!lastDocumentoIN) return;
            
            try {
              setIsGeneratingFactura(true);
              // Generate PDF invoice
              const response = await fetch(`${apiUrl}facturas/transaccion-in/${lastDocumentoIN}`);
              
              if (!response.ok) {
                throw new Error(`Error generando factura: ${response.status}`);
              }

              const rawBlob = await response.blob();
              const blob = new Blob([rawBlob], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);

              // Create a hidden iframe and trigger print()
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              iframe.src = url;
              document.body.appendChild(iframe);
              
              iframe.onload = () => {
                const removeIframeAndRevoke = () => {
                  if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                  window.URL.revokeObjectURL(url);
                };
                
                // Handle afterprint event
                const printWindow = iframe.contentWindow;
                if (printWindow) {
                  try {
                    printWindow.document.title = `FACT-${String(lastDocumentoIN).padStart(8, '0')}.pdf`;
                  } catch (e) {}
                  
                  printWindow.focus();
                  printWindow.print();
                  printWindow.addEventListener('afterprint', removeIframeAndRevoke);
                  
                  // Fallback: remove after 30 seconds if afterprint doesn't fire
                  setTimeout(removeIframeAndRevoke, 30000);
                } else {
                  // If there's no contentWindow, quick fallback
                  setTimeout(removeIframeAndRevoke, 3000);
                }
              };
              
              // Fallback in case iframe fails to load
              iframe.onerror = () => {
                console.error('Failed to load PDF in iframe');
                window.open(url, '_blank');
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                window.URL.revokeObjectURL(url);
              };
              
              // Clean up URL to free memory
              setTimeout(() => window.URL.revokeObjectURL(url), 100);
              
            } catch (error) {
              console.error('Error generating factura:', error);
              alert('Error al generar la factura. Por favor, intente nuevamente.');
            } finally {
              setIsGeneratingFactura(false);
            }
          }}
          disabled={isGeneratingFactura}
        >
          {isGeneratingFactura ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              Imprimir
            </ThemedText>
          )}
        </Pressable>
        
        <Pressable
          style={({ pressed }) => [
            styles.actionButton, 
            { 
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: themeAccent,
              marginLeft: 8
            }
          ]}
          onPress={async () => {
            if (!lastDocumentoIN) return;
            
            try {
              setIsGeneratingFactura(true);
              const response = await fetch(`${apiUrl}facturas/transaccion-in/${lastDocumentoIN}`);
              
              if (!response.ok) {
                throw new Error(`Error generando factura: ${response.status}`);
              }

              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              
              // Create a temporary anchor element to trigger download
              const a = document.createElement('a');
              a.href = url;
              a.download = `RECIBO-${lastDocumentoIN}.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              
              // Clean up the URL object
              setTimeout(() => window.URL.revokeObjectURL(url), 100);
              
            } catch (error) {
              console.error('Error generating factura:', error);
              alert('Error al generar la factura. Por favor, intente nuevamente.');
            } finally {
              setIsGeneratingFactura(false);
            }
          }}
          disabled={isGeneratingFactura}
        >
          {isGeneratingFactura ? (
            <ActivityIndicator color={themeAccent} size="small" />
          ) : (
            <ThemedText style={[styles.actionButtonText, { color: themeAccent }]}>
              Descargar
            </ThemedText>
          )}
        </Pressable>
      </View>
      
      <Pressable
        style={({ pressed }) => [
          styles.closeButton, 
          { 
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: themeText,
            opacity: pressed ? 0.7 : 1
          }
        ]}
        onPress={() => {
          setShowSuccessModal(false);
          setShowDetailsModal(true);
        }}
      >
        <ThemedText style={[styles.closeButtonText, { color: themeText }]}>
          Cerrar
        </ThemedText>
      </Pressable>
    </View>
  </View>
</Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClosePaymentModal}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: themeBg2 }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: themeText }]}>Transacción de Ingreso</ThemedText>
              <Pressable onPress={handleClosePaymentModal}>
                <Feather name="x" size={24} color={themeText} />
              </Pressable>
            </View>
            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <View style={{ position: 'relative' }}>
                <View style={{ position: 'relative' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <ThemedText style={[styles.label, { color: themeText }]}>Fecha</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ThemedText style={[styles.input, { borderColor: themeText, marginRight: 10 }]}>
                        {formatDisplayDate(date.toISOString().split('T')[0])}
                      </ThemedText>
                      <Pressable onPress={() => setShowDatePicker(true)}>
                        <Feather name="calendar" size={24} color={themeText} />
                      </Pressable>
                    </View>
                  </View>
                  {showDatePicker && (
                    <Modal
                      visible={showDatePicker}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => setShowDatePicker(false)}
                    >
                      <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)'
                      }}>
                        <View style={{
                          backgroundColor: themeBg,
                          borderRadius: 10,
                          padding: 20,
                          width: '90%',
                          maxWidth: 400
                        }}>
                          <DateTimePicker
                            mode="single"
                            date={dayjs(date).toDate()}
                            onChange={(params) => {
                              if (params.date) {
                                setDate(dayjs(params.date));
                                setShowDatePicker(false);
                              }
                            }}
                            styles={{...defaultStyles, 
                              today: { borderColor: themeText },
                              selected: { backgroundColor: themeAccent },
                              selected_label: { color: themeText }}}       
                          />
                          <Pressable
                            onPress={() => setShowDatePicker(false)}
                            style={{
                              marginTop: 15,
                              padding: 10,
                              backgroundColor: themeAccent,
                              borderRadius: 5,
                              alignItems: 'center'
                            }}
                          >
                            <ThemedText style={{ color: '#fff' }}>Aceptar</ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    </Modal>
                  )}
                </View>
                </View>
              </View>

              <View style={styles.formGroup}>
              <ThemedText style={[
                        styles.infoValue, 
                        { 
                          fontWeight: 'bold',
                          color: (selectedTransaccion?.Pendiente ?? 0) > 0 ? '#ff3b30' : '#34c759'
                        }
                      ]}>Valor Pendiente: {formatCurrency(selectedTransaccion?.Pendiente ?? 0)}</ThemedText>
                <ThemedText style={[styles.label, { color: themeText }]}>Tipo de Pago</ThemedText>
                {Object.entries(pagos).map(([tipo, monto]) => (
                  <View key={tipo} style={styles.paymentRow}>
                    <ThemedText style={[styles.paymentLabel, { color: themeText }]}>
                      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}:
                    </ThemedText>
                    <TextInput
                      style={[styles.paymentInput, { color: themeText, borderColor: themeText }]}
                      value={monto}
                      onChangeText={(value) => {
                        // Allow only numbers and at most one decimal point
                        let sanitized = value.replace(/[^0-9.]/g, '');
                        // Prevent more than one decimal point
                        const parts = sanitized.split('.');
                        if (parts.length > 2) {
                          sanitized = parts[0] + '.' + parts.slice(1).join('');
                        }
                        setPagos(prev => ({
                          ...prev,
                          [tipo]: sanitized
                        }));
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                    />
                  </View>
                ))}
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={[styles.label, { color: themeText }]}>Concepto</ThemedText>
                <TextInput
                  style={[
                    styles.textArea, 
                    { 
                      color: themeText, 
                      borderColor: themeText,
                      textAlignVertical: 'top'
                    }
                  ]}
                  value={concepto}
                  onChangeText={setConcepto}
                  multiline
                  numberOfLines={3}
                  placeholder="Ingrese el concepto del pago"
                />
              </View>

              <View style={styles.totalContainer}>
                <View style={styles.totalRow}>
                  <ThemedText style={[styles.totalLabel, { color: themeText }]}>Subtotal:</ThemedText>
                  <ThemedText style={[styles.totalValue, { color: themeText }]}>
                    {formatCurrency(subtotal)}
                  </ThemedText>
                </View>
                <View style={styles.totalRow}>
                  <ThemedText style={[styles.totalLabel, { color: themeText }]}>
                    Impuesto ({configData?.Impuesto || '18'}%):
                  </ThemedText>
                  <ThemedText style={[styles.totalValue, { color: themeText }]}>
                    {formatCurrency(impuesto)}
                  </ThemedText>
                </View>
                <View style={[styles.totalRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: themeText + '40', paddingTop: 5 }]}>
                  <ThemedText style={[styles.totalLabel, { color: themeText, fontWeight: 'bold', fontSize: 18 }]}>
                    Total:
                  </ThemedText>
                  <ThemedText style={[styles.totalValue, { fontWeight: 'bold', fontSize: 18 }]}>
                    {formatCurrency(total)}
                  </ThemedText>
                </View>
              </View>

              <Pressable
                style={[styles.submitButton, { 
                  backgroundColor: isPaymentValid && !isSubmittingReferencia ? '#007AFF' : '#999',
                  opacity: isSubmittingReferencia ? 0.7 : 1 
                }]}
                onPress={handleReferenciaPagoSubmit}
                disabled={!isPaymentValid || isSubmittingReferencia}
              >
                {isSubmittingReferencia ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>
                    {isSubmittingReferencia ? 'Procesando...' : 'Guardar Pago'}
                  </ThemedText>
                )}
                {!isPaymentValid && selectedTransaccion?.Pendiente !== undefined && total > selectedTransaccion.Pendiente && (
                  <ThemedText style={[styles.errorText, { color: '#ff3b30', fontSize: 12, marginTop: 4 }]}>
                    El monto total no puede exceder el pendiente
                  </ThemedText>
                )}
                 {!isPaymentValid && (total <= 0) && (
                  <ThemedText style={[styles.errorText, { color: '#ff3b30', fontSize: 12, marginTop: 4 }]}>
                    El monto total debe ser mayor a 0
                  </ThemedText>
                )}
              </Pressable>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

</ThemedView>
);
}

const styles = StyleSheet.create({
  // Form Elements
  label: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  // Layout
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  
  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  
  // Buttons
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Form Elements
  formGroup: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    width: '100%',
    fontSize: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  searchIcon: {
    marginRight: 8,
  },
  
  // Client List
  clientList: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  clientItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  
  // Transaction List
  scrollView: {
    flex: 1,
  },
  transaccionesContainer: {
    width: '100%',
    padding: 8,
  },
  transaccionesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  
  // Transaction Card
  transaccionCard: {
    width: '32%', // Three cards per row on larger screens
    minWidth: 280, // Minimum width for each card
    maxWidth: '32%', // Ensure cards don't get too wide
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 12,
    flexGrow: 1,
  },
  // For tablet view
  transaccionCardNarrow: {
    width: '48%', // Two cards per row on tablets
    maxWidth: '48%',
    minWidth: 0, // Allow cards to be smaller on tablets
    marginHorizontal: 0,
  },
  // For mobile view
  transaccionCardMobile: {
    width: '100%',
    maxWidth: '100%',
    marginHorizontal: 0,
  },
  transaccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    minHeight: 40, // Reduced height for compact look
  },
  transaccionInfo: {
    flex: 1,
  },
  transaccionId: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  transaccionDate: {
    fontSize: 11,
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    minWidth: 70,
    alignItems: 'center',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transaccionDetails: {
    marginTop: 12,
    flex: 1,
    minHeight: 120, // Ensure consistent height for details section
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    marginRight: 6,
    color: '#666',
  },
  detailValue: {
    fontSize: 12,
    textAlign: 'right',
    flex: 1,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  viewButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 'auto', 
  },
  viewButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  datePickerContainer: {
    marginTop: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  datePicker: {
    width: '100%',
    backgroundColor: 'white',
  },
  iosButtonContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  iosButton: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  iosButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // Date picker styles are handled by the native component
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
    fontSize: 14,
    padding: 8,
    maxWidth: '100%',
    width: '100%',
    borderWidth: 1,
    borderRadius: 6,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    maxWidth: '100%',
  },
  paymentLabel: {
    flex: 0.5,
    fontSize: 14,
    minWidth: 100,
  },
  paymentInput: {
    flex: 0.5,
    borderWidth: 1,
    borderRadius: 6,
    padding: 6,
    marginLeft: 8,
    textAlign: 'right',
    minHeight: 36,
    fontSize: 14,
    maxWidth: 150,
  },
  totalContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  // submitButton and submitButtonText styles are defined later in the file
  // to avoid duplicate property errors
 
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filtersContainer: {
    borderRadius: 12,
    padding: 16,
    margin: 16, 
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  filterScroller: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  filterSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalScrollView: {
    flex: 1,
  },
  detailsContainer: {
    padding: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flexBasis: '48%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  referenciasContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  referenciaHeader: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  referenciaHeaderText: {
    fontWeight: '600',
    fontSize: 14,
  },
  referenciaItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  referenciaText: {
    fontSize: 14,
  },
  noReferenciasContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    elevation: 3,
    justifyContent: 'space-between', 
  },
  modalTwoColumnContainer: {
    flexDirection: 'row',
    flex: 1,
    gap: 16,
  },
  modalLeftColumn: {
    flex: 1,
    paddingRight: 8,
  },
  modalRightColumn: {
    flex: 0.5,
    paddingLeft: 8,
  },
  formContainer: {
    padding: 12,
    borderRadius: 12,
    height: '100%',
  },
  formScrollView: {
    flex: 1,
  },
  formContent: {
    paddingBottom: 16,
  },
  formField: {
    marginBottom: 4,
    width: '100%',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
    paddingLeft: 12,
  },
  formInput: {
    borderWidth: 0,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    minHeight: 32,
    width: '100%',
  },
  itemCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  itemCode: {
    fontSize: 12,
  },
  itemDetails: {
    gap: 4,
  },
  itemDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemLabel: {
    fontSize: 12,
  },
  itemValue: {
    fontSize: 12,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalPrintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
  },
  modalEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
 
  referenciaRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },

});
