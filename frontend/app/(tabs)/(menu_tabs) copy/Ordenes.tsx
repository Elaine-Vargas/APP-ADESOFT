import { Stack, router } from 'expo-router';
import { StyleSheet, ScrollView, Pressable, Modal, View, ActivityIndicator, Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { apiUrl } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Orden {
  IdOrden: number;
  Fecha: string;
  IdCliente: string;
  IdVendedor: string;
  Subtotal: number;
  Impuesto: number;
  ValorImp: number;
  Total: number;
  Estado: string;
  FechaCreacion?: string;
  Cliente?: {
    IdCliente: string;
    NombreC: string;
  };
  Vendedor?: {
    IdVendedor: string;
    NombreV: string;
  };
  items?: OrdenItem[];
}

interface OrdenItem {
  IdOrden: number;
  IdProducto: number;
  Cantidad: number;
  PrecioV: number;
  Impuesto: number;
  producto?: {
    IdProducto: number;
    NombreP: string;
    CodigoP: string;
  };
}

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrden, setSelectedOrden] = useState<Orden | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isGeneratingFactura, setIsGeneratingFactura] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [vendor, setVendor] = useState<{ IdVendedor?: string; NombreV?: string } | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('A'); // Default to 'A' (Activa)

  const themeBg2 = useThemeColor({}, 'backgroundSecondary');
  const themeBg3 = useThemeColor({}, 'backgroundTertiary');
  const themeText = useThemeColor({}, 'text');
  const themeTextSecondary = useThemeColor({}, 'textSecondary');
  const themeAccent = useThemeColor({}, 'tint');

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

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Adesoft - Órdenes';
    }
    const initializeData = async () => {
      const currentVendor = await loadVendor();
      fetchOrdenes(currentVendor?.IdVendedor, filterEstado);
    };
    initializeData();
  }, []);

  // Refetch orders when filter changes
  useEffect(() => {
    if (vendor) {
      fetchOrdenes(vendor.IdVendedor, filterEstado);
    }
  }, [filterEstado]);

  const fetchOrdenes = async (idVendedor?: string, estado?: string) => {
    setLoading(true);
    try {
      let url = `${apiUrl}ordenes`;
      const params = [];
      if (idVendedor) params.push(`IdVendedor=${encodeURIComponent(idVendedor)}`);
      if (estado) params.push(`Estado=${encodeURIComponent(estado)}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setOrdenes(data);
      } else {
        console.error('Error fetching orders:', response.status);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdenDetails = async (ordenId: number) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`${apiUrl}ordenes/${ordenId}`);
      if (response.ok) {
        const ordenWithDetails = await response.json();
        setSelectedOrden(ordenWithDetails);
      } else {
        console.error('Error fetching order details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = async (orden: Orden) => {
    setSelectedOrden(orden);
    setShowDetailsModal(true);
    await fetchOrdenDetails(orden.IdOrden);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return dateString; // Retornar el string original si no es una fecha válida
    }
    
    // Formatear fecha y hora en formato 12 horas
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

  // Wrapper function for refresh button
  const handleRefresh = () => {
    if (vendor) {
      fetchOrdenes(vendor.IdVendedor, filterEstado);
    }
  };

  // Handle status filter change
  const handleFilterChange = (estado: string) => {
    setFilterEstado(estado);
  };

  // Handle order editing - navigate to Dashboard with order id
  const handleEditOrder = (orden: Orden | null) => {
    if (!orden) return;
    router.push({
      pathname: '/(tabs)/(menu_tabs)/Dashboard',
      params: { orderId: orden.IdOrden },
    });
  };

  // Función para generar e imprimir/descargar factura
  const handlePrintFactura = async (ordenId: number, action: 'open' | 'download' | 'print') => {
    try {
      setIsGeneratingFactura(true);
      
      // Generar PDF de factura
      const response = await fetch(`${apiUrl}facturas/pdf-improved/${ordenId}`);
      
      if (!response.ok) {
        throw new Error(`Error generando factura: ${response.status}`);
      }

      const rawBlob = await response.blob();
      const blob = new Blob([rawBlob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      if (action === 'open') {
        window.open(url, '_blank');
      } else if (action === 'print') {
        // Crear un iframe oculto y disparar print()
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          const removeIframeAndRevoke = () => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            window.URL.revokeObjectURL(url);
          };
          // Manejar el evento afterprint
          const printWindow = iframe.contentWindow;
          if (printWindow) {
            try {
              printWindow.document.title = `FACT-${String(ordenId).padStart(8, '0')}.pdf`;
            } catch (e) {}
            printWindow.focus();
            printWindow.print();
            printWindow.addEventListener('afterprint', removeIframeAndRevoke);
            // Respaldo: quitar después de 30 segundos si afterprint no se dispara
            setTimeout(removeIframeAndRevoke, 30000);
          } else {
            // Si por alguna razón no hay contentWindow, fallback rápido
            setTimeout(removeIframeAndRevoke, 3000);
          }
        };
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `FACT-${String(ordenId).padStart(8, '0')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Limpiar URL para liberar memoria
      setTimeout(() => window.URL.revokeObjectURL(url), 100);

    } catch (error) {
      console.error('Error generando cotización:', error);
      alert('Error al generar la cotización. Por favor, intente nuevamente.');
    } finally {
      setIsGeneratingFactura(false);
      setShowPrintOptions(false); // Ocultar opciones
    }
  };

  return (
    <>
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Ordenes', headerShown: false }} />
        
        <ThemedView style={styles.header}>
          <ThemedText style={[styles.title, { color: themeText }]}>Mis Órdenes</ThemedText>
          <Pressable style={styles.refreshButton} onPress={handleRefresh}>
            <Feather name="refresh-cw" size={20} color={themeAccent} />
          </Pressable>
        </ThemedView>

        {/* Filter buttons */}
        <ThemedView style={[styles.filterContainer, { backgroundColor: themeBg2 }]}>
          <ThemedText style={[styles.filterLabel, { color: themeTextSecondary }]}>Filtrar por estado:</ThemedText>
          <ThemedView style={[styles.filterButtons, { backgroundColor: themeBg2 }]}>
            <Pressable 
              style={[
                styles.filterButton, 
                { 
                  backgroundColor: filterEstado === 'A' ? themeAccent : themeBg3,
                  borderColor: filterEstado === 'A' ? themeAccent : themeTextSecondary
                }
              ]}
              onPress={() => handleFilterChange('A')}
            >
              <ThemedText style={[
                styles.filterButtonText, 
                { color: filterEstado === 'A' ? '#fff' : themeText }
              ]}>
                Activas
              </ThemedText>
            </Pressable>
            <Pressable 
              style={[
                styles.filterButton, 
                { 
                  backgroundColor: filterEstado === 'P' ? themeAccent : themeBg3,
                  borderColor: filterEstado === 'P' ? themeAccent : themeTextSecondary
                }
              ]}
              onPress={() => handleFilterChange('P')}
            >
              <ThemedText style={[
                styles.filterButtonText, 
                { color: filterEstado === 'P' ? '#fff' : themeText }
              ]}>
                Procesadas
              </ThemedText>
            </Pressable>
            <Pressable 
              style={[
                styles.filterButton, 
                { 
                  backgroundColor: filterEstado === 'N' ? themeAccent : themeBg3,
                  borderColor: filterEstado === 'N' ? themeAccent : themeTextSecondary
                }
              ]}
              onPress={() => handleFilterChange('N')}
            >
              <ThemedText style={[
                styles.filterButtonText, 
                { color: filterEstado === 'N' ? '#fff' : themeText }
              ]}>
                Nulas
              </ThemedText>
            </Pressable>
            <Pressable 
              style={[
                styles.filterButton, 
                { 
                  backgroundColor: filterEstado === '' ? themeAccent : themeBg3,
                  borderColor: filterEstado === '' ? themeAccent : themeTextSecondary
                }
              ]}
              onPress={() => handleFilterChange('')}
            >
              <ThemedText style={[
                styles.filterButtonText, 
                { color: filterEstado === '' ? '#fff' : themeText }
              ]}>
                Todas
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>

        {loading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeAccent} />
            <ThemedText style={[styles.loadingText, { color: themeTextSecondary }]}>
              Cargando órdenes...
            </ThemedText>
          </ThemedView>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollViewContent}>
            {ordenes.length === 0 ? (
              <ThemedView style={styles.emptyContainer}>
                <Feather name="inbox" size={48} color={themeTextSecondary} />
                <ThemedText style={[styles.emptyText, { color: themeTextSecondary }]}>
                  No hay órdenes disponibles
                </ThemedText>
              </ThemedView>
            ) : (
              <ThemedView style={styles.ordenesGrid}>
                {ordenes.map((orden, index) => (
                <ThemedView key={orden.IdOrden || index} style={[styles.ordenCard, { backgroundColor: themeBg2 }]}>
                  <ThemedView style={[styles.ordenHeader,  { backgroundColor: themeBg2 }]}>
                    <ThemedView style={[styles.ordenInfo,  { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[styles.ordenId, { color: themeAccent, backgroundColor: themeBg2   }]}>
                        #{orden.IdOrden}
                      </ThemedText>
                      <ThemedText style={[styles.ordenDate, { color: themeTextSecondary, backgroundColor: themeBg2  }]}>
                        {formatDate(orden.FechaCreacion || orden.Fecha)}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={[styles.ordenStatus, { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[
                        styles.statusBadge,
                        { 
                          backgroundColor: orden.Estado === 'A' ? '#A6A6A6' : 
                                         orden.Estado === 'P' ? '#61B863' : '#D14338',
                          color: '#fff'
                        }
                      ]}>
                        {orden.Estado === 'A' ? 'Activa' : orden.Estado === 'P' ? 'Procesada' : 'Nula'}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>

                  <ThemedView style={[styles.ordenDetails, { backgroundColor: themeBg2, padding: 12 }]}>
                    <ThemedView style={[styles.detailRow, { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[styles.detailLabel, { color: themeTextSecondary, backgroundColor: themeBg2 }]}>Cliente:</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: themeText, backgroundColor: themeBg2 }]}>
                        {orden.Cliente?.NombreC || orden.IdCliente}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={[styles.detailRow, { backgroundColor: themeBg2 }]}>
                    
                    </ThemedView>
                    <ThemedView style={[styles.detailRow, { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[styles.detailLabel, { color: themeTextSecondary, backgroundColor: themeBg2 }]}>Total:</ThemedText>
                      <ThemedText style={[styles.detailValue, { color: themeAccent, fontWeight: 'bold', backgroundColor: themeBg2 }]}>
                        {formatCurrency(orden.Total)}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>

                  <ThemedView style={[styles.buttonContainer, { backgroundColor: themeBg2 }]}>
                    <Pressable 
                      style={[styles.viewButton, { backgroundColor: themeAccent }]}
                      onPress={() => handleViewDetails(orden)}
                    >
                      <Feather name="eye" size={16} color={themeText} />
                      <ThemedText style={[styles.viewButtonText, { color: themeText }]}>
                        Ver Detalles
                      </ThemedText>
                    </Pressable>

                  </ThemedView>
                </ThemedView>
                ))}
              </ThemedView>
            )}
          </ScrollView>
        )}
      </ThemedView>

      {/* Modal de detalles de la orden */}
      {selectedOrden && (
        <Modal
          visible={showDetailsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDetailsModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowDetailsModal(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: themeBg2 }]} onPress={(e) => e.stopPropagation()}>
              <ThemedView style={[styles.modalHeader, { backgroundColor: themeBg2 }]}>
                <ThemedText style={[styles.modalTitle, { color: themeText, backgroundColor: themeBg2 }]}>
                  Detalles de la Orden #{selectedOrden?.IdOrden}
                </ThemedText>
                <Pressable onPress={() => setShowDetailsModal(false)}>
                  <Feather name="x" size={24} color={themeText} />
                </Pressable>
              </ThemedView>

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <ThemedView style={[styles.modalSection, { backgroundColor: themeBg2 }]}>
                  <ThemedText style={[styles.sectionTitle, { color: themeAccent, backgroundColor: themeBg2 }]}>
                    Información General
                  </ThemedText>
                  <ThemedView style={[styles.infoGrid, { backgroundColor: themeBg2, padding: 12 }]}>
                    <ThemedView style={[styles.infoItem, { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[styles.infoLabel, { color: themeTextSecondary, backgroundColor: themeBg2 }]}>Fecha de Creación:</ThemedText>
                      <ThemedText style={[styles.infoValue, { color: themeText, backgroundColor: themeBg2 }]}>
                        {formatDate(selectedOrden.FechaCreacion || selectedOrden.Fecha)}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={[styles.infoItem, { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[styles.infoLabel, { color: themeTextSecondary, backgroundColor: themeBg2 }]}>Cliente:</ThemedText>
                      <ThemedText style={[styles.infoValue, { color: themeText, backgroundColor: themeBg2 }]}>
                        {selectedOrden.Cliente?.NombreC || selectedOrden.IdCliente}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={[styles.infoItem, { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[styles.infoLabel, { color: themeTextSecondary, backgroundColor: themeBg2 }]}>Vendedor:</ThemedText>
                      <ThemedText style={[styles.infoValue, { color: themeText, backgroundColor: themeBg2 }]}>
                        {selectedOrden.Vendedor?.NombreV || selectedOrden.IdVendedor}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={[styles.infoItem, { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[styles.infoLabel, { color: themeTextSecondary, backgroundColor: themeBg2 }]}>Estado:</ThemedText>
                      <ThemedText style={[
                        styles.infoValue, 
                        { 
                          color: '#fff',
                          backgroundColor: selectedOrden.Estado === 'A' ? '#A6A6A6' : 
                                         selectedOrden.Estado === 'P' ? '#61B863' : '#D14338',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 'bold',
                          alignSelf: 'flex-start'
                        }
                      ]}>
                        {selectedOrden.Estado === 'A' ? 'Activa' : selectedOrden.Estado === 'P' ? 'Procesada' : 'Nula'}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                </ThemedView>

                <ThemedView style={[styles.modalSection, { backgroundColor: 'themeBg2' }]}>
                  <ThemedText style={[styles.sectionTitle, { color: themeAccent, backgroundColor: 'themeBg2' }]}>
                    Items de la Orden
                  </ThemedText>
                  
                  {loadingDetails ? (
                    <ThemedView style={[styles.loadingContainer, { backgroundColor: 'themeBg2', padding: 12 }]}>
                      <ActivityIndicator size="small" color={themeAccent} />
                      <ThemedText style={[styles.loadingText, { color: themeTextSecondary, backgroundColor: 'themeBg2' }]}>
                        Cargando items...
                      </ThemedText>
                    </ThemedView>
                  ) : selectedOrden.items && selectedOrden.items.length > 0 ? (
                    selectedOrden.items.map((item: any, index: number) => {
                      console.log('Item:', item); // Debug
                      return (
                        <ThemedView key={index} style={[styles.itemCard, { backgroundColor: themeBg3 }]}>
                          <ThemedView style={[styles.itemHeader, { backgroundColor: themeBg3 }]}>
                            <ThemedText style={[styles.itemName, { color: themeText, backgroundColor: themeBg3 }]}>
                              {item.producto?.NombreP || `Producto ${item.IdProducto}`}
                            </ThemedText>
                            <ThemedText style={[styles.itemCode, { color: themeTextSecondary, backgroundColor: themeBg3 }]}>
                              #{item.producto?.CodigoP || item.IdProducto}
                            </ThemedText>
                          </ThemedView>
                          <ThemedView style={[styles.itemDetails, { backgroundColor: themeBg3 }]}>
                            <ThemedView style={[styles.itemDetail, { backgroundColor: themeBg3 }]}>
                              <ThemedText style={[styles.itemLabel, { color: themeTextSecondary, backgroundColor: themeBg3 }]}>Cantidad:</ThemedText>
                              <ThemedText style={[styles.itemValue, { color: themeText, backgroundColor: themeBg3 }]}>
                                {item.Cantidad}
                              </ThemedText>
                            </ThemedView>
                            <ThemedView style={[styles.itemDetail, { backgroundColor: themeBg3 }]}>
                              <ThemedText style={[styles.itemLabel, { color: themeTextSecondary, backgroundColor: themeBg3 }]}>Precio:</ThemedText>
                              <ThemedText style={[styles.itemValue, { color: themeText, backgroundColor: themeBg3 }]}>
                                {formatCurrency(item.PrecioV)}
                              </ThemedText>
                            </ThemedView>
                            <ThemedView style={[styles.itemDetail, { backgroundColor: themeBg3 }]}>
                              <ThemedText style={[styles.itemLabel, { color: themeTextSecondary, backgroundColor: themeBg3 }]}>Subtotal:</ThemedText>
                              <ThemedText style={[styles.itemValue, { color: themeAccent, fontWeight: 'bold', backgroundColor: themeBg3 }]}>
                                {formatCurrency(item.Cantidad * item.PrecioV)}
                              </ThemedText>
                            </ThemedView>
                          </ThemedView>
                        </ThemedView>
                      );
                    })
                  ) : (
                    <ThemedView style={[styles.emptyContainer, { backgroundColor: themeBg2, padding: 12 }]}>
                      <ThemedText style={[styles.emptyText, { color: themeTextSecondary, backgroundColor: themeBg2 }]}>
                        No hay items disponibles
                      </ThemedText>
                    </ThemedView>
                  )}
                </ThemedView>

                <ThemedView style={[styles.modalSection, styles.totalSection, { backgroundColor: themeBg2 }]}>
                  <ThemedView style={[styles.totalContainer, { backgroundColor: themeBg2, padding: 12 }]}>
                    <ThemedView style={[styles.totalRow, { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[styles.totalLabel, { color: themeTextSecondary, backgroundColor: themeBg2 }]}>Subtotal:</ThemedText>
                      <ThemedText style={[styles.totalValue, { color: themeText, backgroundColor: themeBg2 }]}>
                        {formatCurrency(selectedOrden.Subtotal)}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={[styles.totalRow, { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[styles.totalLabel, { color: themeTextSecondary, backgroundColor: themeBg2 }]}>ITBIS:</ThemedText>
                      <ThemedText style={[styles.totalValue, { color: themeText, backgroundColor: themeBg2 }]}>
                        {formatCurrency(selectedOrden.ValorImp)}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={[styles.totalRow, styles.finalTotal, { backgroundColor: themeBg2 }]}>
                      <ThemedText style={[styles.totalLabel, { color: themeText, fontWeight: 'bold', backgroundColor: themeBg2 }]}>Total:</ThemedText>
                      <ThemedText style={[styles.totalValue, { color: themeAccent, fontWeight: 'bold', backgroundColor: themeBg2 }]}>
                        {formatCurrency(selectedOrden.Total)}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                </ThemedView>
              </ScrollView>
              
              {/* Botones fijos en la parte inferior del modal */}
              <ThemedView style={[styles.modalButtonContainer, { backgroundColor: themeBg2 }]}>
                <Pressable
                  style={[
                    styles.modalEditButton,
                    { backgroundColor: '#FF9500' },
                  ]}
                  onPress={() => handleEditOrder(selectedOrden)}
                >
                  <Feather name="edit" size={18} color={themeText} />
                  <ThemedText style={[styles.modalPrintButtonText, { color: themeText }]}>
                    Editar Orden
                  </ThemedText>
                </Pressable>

                <View style={{ flex: 1 }}>
                  <Pressable
                    style={[
                      styles.modalPrintButton,
                      {
                        backgroundColor: isGeneratingFactura ? '#ccc' : '#4CAF50',
                        opacity: isGeneratingFactura ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => setShowPrintOptions(!showPrintOptions)}
                    disabled={isGeneratingFactura}
                  >
                    {isGeneratingFactura ? (
                      <ActivityIndicator size="small" color={themeText} />
                    ) : (
                      <Feather name="printer" size={18} color={themeText} />
                    )}
                    <ThemedText style={[styles.modalPrintButtonText, { color: themeText }]}>
                      {isGeneratingFactura ? 'Generando...' : 'Cotización'}
                    </ThemedText>
                    <Feather name={showPrintOptions ? 'chevron-up' : 'chevron-down'} size={18} color={themeText} style={{ marginLeft: 'auto' }} />
                  </Pressable>

                  {showPrintOptions && (
                    <ThemedView style={[styles.printOptionsContainer, { backgroundColor: themeBg3 }]}>
                      <Pressable style={styles.printOptionButton} onPress={() => handlePrintFactura(selectedOrden.IdOrden, 'download')}>
                        <Feather name="download" size={16} color={themeText} />
                        <ThemedText style={styles.printOptionText}>Descargar Cotización</ThemedText>
                      </Pressable>
                      <Pressable style={styles.printOptionButton} onPress={() => handlePrintFactura(selectedOrden.IdOrden, 'print')}>
                        <Feather name="printer" size={16} color={themeText} />
                        <ThemedText style={styles.printOptionText}>Imprimir Cotización</ThemedText>
                      </Pressable>
                    </ThemedView>
                  )}
                </View>
              </ThemedView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
  },
  filterContainer: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ordenesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
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
  ordenCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 300,
    maxWidth: 400,
    flex: 1,
    justifyContent: 'space-between', // Distribuir contenido verticalmente
  },
  ordenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ordenInfo: {
    flex: 1,
  },
  ordenId: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  ordenDate: {
    fontSize: 14,
    marginTop: 2,
  },
  ordenStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  ordenDetails: {
    marginBottom: 16,
    flex: 1, // Tomar el espacio disponible
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  viewButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  editButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto', // Empujar hacia abajo
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  printButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 'auto', // Empujar hacia abajo
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
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
  },
  modalPrintButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    backgroundColor: 'transparent',
    justifyContent: 'space-between', // Distribuir contenido verticalmente
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalScrollView: {
    flex: 1,
    marginBottom: 16, // Espacio para el botón fijo
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoGrid: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
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
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  totalContainer: {
    // Estilo para el contenedor de totales
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalValue: {
    fontSize: 16,
  },
  finalTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  printOptionsContainer: {
    position: 'absolute',
    bottom: '100%', // Position above the button
    right: 0,
    left: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  printOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  printOptionText: {
    fontSize: 14,
  },
});
