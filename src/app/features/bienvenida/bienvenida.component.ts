/**
 * Componente de bienvenida para la configuración inicial única de la aplicación Carrito
 * Compatible con Angular 18 + Ionic 8 + Capacitor 7
 * Sistema de selector grid responsivo - sustituto del carrusel 3D
 * 
 * @author DemWolf
 * @version 2.0 - Grid Selector Implementado
 */

import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

// Importar modelos y servicios usando los paths configurados
import { DatosConfiguracionInicial } from '@core/models/usuario.model';
import { Pais } from '@core/models/pais.model';
import { ConfiguracionService } from '@core/services/configuracion.service';
import { UsuarioService } from '@core/services/usuario.service';

// ✅ Importar ScreenOrientation de Capacitor 7 (ya instalado en tu proyecto)
import { ScreenOrientation } from '@capacitor/screen-orientation';

@Component({
  selector: 'app-bienvenida',
  templateUrl: './bienvenida.component.html',
  styleUrls: ['./bienvenida.component.scss']
})
export class BienvenidaComponent implements OnInit, OnDestroy, AfterViewInit {

  // Estados del componente de bienvenida
  private subscriptions: Subscription = new Subscription();
  
  // Control de pasos de configuración
  pasoActual: number = 1; // 1: Splash, 2: Explicación, 3: Selección País, 4: Configuración Personal, 5: Completado
  totalPasos: number = 5;
  
  // Control de splash screen
  mostrarSplash: boolean = true;
  splashAnimacionCompleta: boolean = false;
  
  // Datos de configuración inicial
  datosConfiguracion: DatosConfiguracionInicial = {
    nombre: '',
    codigoPais: '',
    pin: '',
    biometriaDisponible: false,
    biometriaHabilitada: false,
    configuracionesIniciales: {}
  };
  
  // Listas de datos
  paisesDisponibles: Pais[] = [];
  paisSeleccionado: Pais | null = null;
  
  // Estados de carga y validación
  cargando: boolean = false;
  formularioValido: boolean = false;
  
  // Validaciones por campo
  validaciones = {
    nombre: { valido: false, mensaje: '' },
    pais: { valido: false, mensaje: '' },
    pin: { valido: false, mensaje: '' },
    pinConfirmacion: { valido: false, mensaje: '' }
  };
  
  // Campos del formulario
  pinConfirmacion: string = '';
  mostrarPin: boolean = false;
  mostrarPinConfirmacion: boolean = false;

  // Control de orientación y dispositivo
  esTablet: boolean = false;
  esModoVertical: boolean = true;

  // Información de la aplicación para el splash
  infoApp = {
    nombre: 'Carrito',
    version: '1.0',
    descripcion: 'Tu compañero inteligente para controlar gastos',
    caracteristicas: [
      {
        icono: 'shield-checkmark-outline',
        titulo: '100% Privado',
        descripcion: 'Tus datos nunca salen de tu dispositivo'
      },
      {
        icono: 'calculator-outline',
        titulo: 'Control Automático',
        descripcion: 'Calcula totales y alertas en tiempo real'
      },
      {
        icono: 'time-outline',
        titulo: 'Súper Rápido',
        descripcion: 'Agrega productos en segundos'
      },
      {
        icono: 'trending-down-outline',
        titulo: 'Limita Gastos',
        descripcion: 'Máximo 2 compras por mes para mejor control'
      }
    ]
  };

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private configuracionService: ConfiguracionService,
    private usuarioService: UsuarioService,
    private platform: Platform
  ) {}

  /**
   * Inicialización del componente
   */
  async ngOnInit(): Promise<void> {
    try {
      // Detectar tipo de dispositivo
      await this.detectarTipoDispositivo();
      
      // Configurar orientación según el dispositivo
      await this.configurarOrientacion();
      
      // Inicializar componente
      await this.inicializarComponente();
      
      // Iniciar secuencia de splash automático
      this.iniciarSplashSequence();
    } catch (error) {
      console.error('Error al inicializar componente de bienvenida:', error);
      await this.mostrarError('Error al cargar la configuración inicial');
    }
  }

  /**
   * Después de que la vista esté inicializada
   */
  ngAfterViewInit(): void {
    // Ya no es necesario configurar carrusel, pero mantenemos para compatibilidad
    setTimeout(() => {
      this.configurarSelectorPaises();
    }, 100);
  }

  /**
   * Limpieza al destruir el componente
   */
  ngOnDestroy(): void {
    // Cancelar todas las suscripciones para evitar memory leaks
    this.subscriptions.unsubscribe();
    
    // Restaurar orientación original si es necesario
    this.restaurarOrientacion();
  }

  /**
   * Detectar tipo de dispositivo (móvil vs tablet)
   */
  private async detectarTipoDispositivo(): Promise<void> {
    const width = this.platform.width();
    const height = this.platform.height();
    
    // Considerar tablet si tiene más de 768px en cualquier dimensión
    this.esTablet = Math.max(width, height) >= 768;
    
    // Detectar orientación actual
    this.esModoVertical = height > width;
    
    console.log(`Dispositivo detectado: ${this.esTablet ? 'Tablet' : 'Móvil'}, Orientación: ${this.esModoVertical ? 'Vertical' : 'Horizontal'}`);
  }

  /**
   * Configurar orientación según el tipo de dispositivo usando Capacitor 7
   */
  private async configurarOrientacion(): Promise<void> {
    // Solo aplicar en dispositivos Capacitor reales
    if (!this.platform.is('capacitor')) {
      console.log('No es un dispositivo Capacitor, saltando configuración de orientación');
      return;
    }

    try {
      if (!this.esTablet) {
        // MÓVILES: Forzar orientación vertical usando Capacitor 7 API
        await ScreenOrientation.lock({ orientation: 'portrait' });
        console.log('Orientación bloqueada a vertical para móvil');
      } else {
        // TABLETS: Permitir ambas orientaciones
        await ScreenOrientation.unlock();
        console.log('Orientación libre para tablet');
      }
    } catch (error) {
      console.warn('No se pudo configurar la orientación (esto es normal en el navegador):', error);
    }
  }

  /**
   * Restaurar orientación original
   */
  private async restaurarOrientacion(): Promise<void> {
    if (!this.platform.is('capacitor')) {
      return;
    }

    try {
      await ScreenOrientation.unlock();
      console.log('Orientación restaurada');
    } catch (error) {
      console.warn('No se pudo restaurar la orientación:', error);
    }
  }

  /**
   * Inicializar datos del componente
   */
  private async inicializarComponente(): Promise<void> {
    // Verificar si ya existe configuración (por seguridad)
    const configuracionCompleta = await this.configuracionService.esConfiguracionCompleta();
    
    if (configuracionCompleta) {
      // Si ya está configurado, redirigir a tabs principales
      await this.router.navigate(['/pantalla-principal']);
      return;
    }

    // Cargar países disponibles desde el servicio
    this.paisesDisponibles = this.configuracionService.obtenerPaisesActivos();
    
    // Verificar disponibilidad de biometría (simulado por ahora)
    this.datosConfiguracion.biometriaDisponible = await this.verificarBiometria();
  }

  /**
   * Configurar selector de países con grid (reemplaza configurarCarrusel)
   */
  private configurarSelectorPaises(): void {
    if (this.paisesDisponibles.length === 0) {
      console.warn('No hay países disponibles para configurar el selector');
      return;
    }
    
    // Seleccionar país por defecto (Chile como ejemplo)
    const paisDefecto = this.paisesDisponibles.find(p => p.codigo === 'CL');
    if (paisDefecto && !this.paisSeleccionado) {
      this.seleccionarPais(paisDefecto);
    }
    
    console.log(`Selector de países configurado. ${this.paisesDisponibles.length} países disponibles`);
  }

  /**
   * Seleccionar país (reemplaza la lógica del carrusel)
   */
  seleccionarPais(pais: Pais): void {
    // Actualizar país seleccionado
    this.paisSeleccionado = pais;
    this.datosConfiguracion.codigoPais = pais.codigo;
    
    // Validar selección
    this.validarSeleccionPais();
    
    // Log para debugging
    console.log(`País seleccionado: ${pais.nombre} (${pais.codigo})`);
    
    // Simular vibración táctil en dispositivos móviles
    this.simularFeedbackTactil();
  }

  /**
   * Simular feedback táctil en dispositivos móviles
   */
  private simularFeedbackTactil(): void {
    // Solo en dispositivos móviles reales
    if (this.platform.is('capacitor') && !this.esTablet) {
      try {
        // Usar Haptic Feedback de Capacitor si está disponible
        // TODO: Implementar con @capacitor/haptics cuando sea necesario
        console.log('Feedback táctil simulado');
      } catch (error) {
        console.log('Feedback táctil no disponible');
      }
    }
  }

  /**
   * Iniciar secuencia animada de splash
   */
  private iniciarSplashSequence(): void {
    // Mostrar splash durante 6 segundos
    setTimeout(() => {
      this.ocultarSplash();
    }, 6000);
  }

  /**
   * Ocultar splash con animación
   */
  private ocultarSplash(): void {
    this.splashAnimacionCompleta = true;
    
    // Esperar a que termine la animación de salida
    setTimeout(() => {
      this.mostrarSplash = false;
      this.pasoActual = 2; // Ir a explicación de la app
    }, 800);
  }

  /**
   * Avanzar al siguiente paso de configuración
   */
  async siguientePaso(): Promise<void> {
    try {
      // Validar paso actual antes de avanzar
      if (!await this.validarPasoActual()) {
        return;
      }

      // Avanzar al siguiente paso
      if (this.pasoActual < this.totalPasos) {
        this.pasoActual++;
        
        // Configurar selector si llegamos al paso de selección de país
        if (this.pasoActual === 3) {
          setTimeout(() => {
            this.configurarSelectorPaises();
          }, 100);
        }
      } else {
        // Último paso - completar configuración
        await this.completarConfiguracion();
      }
    } catch (error) {
      console.error('Error al avanzar paso:', error);
      await this.mostrarError('Error al procesar la configuración');
    }
  }

  /**
   * Retroceder al paso anterior
   */
  pasoAnterior(): void {
    if (this.pasoActual > 2) { // No permitir volver al splash
      this.pasoActual--;
    }
  }

  /**
   * Validar el paso actual antes de continuar
   */
  private async validarPasoActual(): Promise<boolean> {
    switch (this.pasoActual) {
      case 1:
      case 2:
        // Pasos de splash y explicación - siempre válidos
        return true;
        
      case 3:
        // Validar selección de país
        return this.validarSeleccionPais();
        
      case 4:
        // Validar configuración personal
        return this.validarConfiguracionPersonal();
        
      default:
        return true;
    }
  }

  /**
   * Validar que se haya seleccionado un país válido
   */
  private validarSeleccionPais(): boolean {
    // Verificar que hay un país seleccionado
    if (!this.datosConfiguracion.codigoPais) {
      this.validaciones.pais.valido = false;
      this.validaciones.pais.mensaje = 'Debes seleccionar tu país de residencia';
      return false;
    }

    // Verificar que el país es válido
    if (!this.configuracionService.validarCodigoPais(this.datosConfiguracion.codigoPais)) {
      this.validaciones.pais.valido = false;
      this.validaciones.pais.mensaje = 'País seleccionado no válido';
      return false;
    }

    this.validaciones.pais.valido = true;
    this.validaciones.pais.mensaje = '';
    return true;
  }

  /**
   * Validar configuración personal (nombre y PIN)
   */
  private validarConfiguracionPersonal(): boolean {
    let valido = true;

    // Validar nombre
    if (!this.validarNombre()) {
      valido = false;
    }

    // Validar PIN
    if (!this.validarPin()) {
      valido = false;
    }

    // Validar confirmación de PIN
    if (!this.validarPinConfirmacion()) {
      valido = false;
    }

    return valido;
  }

  /**
   * Validar nombre de usuario con sanitización y seguridad
   */
  validarNombre(): boolean {
    const nombre = this.datosConfiguracion.nombre.trim();

    // Verificar longitud
    if (nombre.length < 2) {
      this.validaciones.nombre.valido = false;
      this.validaciones.nombre.mensaje = 'El nombre debe tener al menos 2 caracteres';
      return false;
    }

    if (nombre.length > 30) {
      this.validaciones.nombre.valido = false;
      this.validaciones.nombre.mensaje = 'El nombre no puede tener más de 30 caracteres';
      return false;
    }

    // Verificar caracteres válidos (letras, números, espacios, acentos)
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+$/;
    if (!regex.test(nombre)) {
      this.validaciones.nombre.valido = false;
      this.validaciones.nombre.mensaje = 'Solo se permiten letras, números y espacios';
      return false;
    }

    this.validaciones.nombre.valido = true;
    this.validaciones.nombre.mensaje = '';
    return true;
  }

  /**
   * Validar PIN de seguridad con verificación de patrones
   */
  validarPin(): boolean {
    const pin = this.datosConfiguracion.pin;

    // Verificar longitud exacta
    if (pin.length !== 6) {
      this.validaciones.pin.valido = false;
      this.validaciones.pin.mensaje = 'El PIN debe tener exactamente 6 dígitos';
      return false;
    }

    // Verificar que son solo números
    if (!/^\d{6}$/.test(pin)) {
      this.validaciones.pin.valido = false;
      this.validaciones.pin.mensaje = 'El PIN solo debe contener números';
      return false;
    }

    // Verificar que no sea un patrón obvio
    if (this.esPinInseguro(pin)) {
      this.validaciones.pin.valido = false;
      this.validaciones.pin.mensaje = 'PIN muy simple. Usa una combinación más segura';
      return false;
    }

    this.validaciones.pin.valido = true;
    this.validaciones.pin.mensaje = '';
    return true;
  }

  /**
   * Validar confirmación de PIN
   */
  validarPinConfirmacion(): boolean {
    if (this.pinConfirmacion !== this.datosConfiguracion.pin) {
      this.validaciones.pinConfirmacion.valido = false;
      this.validaciones.pinConfirmacion.mensaje = 'Los PIN no coinciden';
      return false;
    }

    this.validaciones.pinConfirmacion.valido = true;
    this.validaciones.pinConfirmacion.mensaje = '';
    return true;
  }

  /**
   * Verificar si el PIN es inseguro (patrones obvios)
   */
  private esPinInseguro(pin: string): boolean {
    // Patrones inseguros comunes
    const patronesInseguros = [
      '123456', '654321', '111111', '222222', '333333',
      '444444', '555555', '666666', '777777', '888888',
      '999999', '000000', '012345', '543210'
    ];

    return patronesInseguros.includes(pin);
  }

  /**
   * Alternar visibilidad del PIN
   */
  toggleMostrarPin(): void {
    this.mostrarPin = !this.mostrarPin;
  }

  /**
   * Alternar visibilidad de confirmación de PIN
   */
  toggleMostrarPinConfirmacion(): void {
    this.mostrarPinConfirmacion = !this.mostrarPinConfirmacion;
  }

  /**
   * Completar configuración inicial
   */
private async completarConfiguracion(): Promise<void> {
  try {
    // Mostrar loading
    const loading = await this.loadingController.create({
      message: 'Configurando tu cuenta...',
      spinner: 'crescent'
    });
    await loading.present();

    // Guardar configuración inicial
    const exito = await this.configuracionService.guardarConfiguracionInicial(this.datosConfiguracion);

    await loading.dismiss();

    if (exito) {
      // Mostrar mensaje de éxito
      await this.mostrarExito('¡Configuración completada!', 'Tu cuenta ha sido creada exitosamente');
      
      // CAMBIAR ESTA LÍNEA: Redirigir a pantalla principal
      await this.router.navigate(['/pantalla-principal']);
    } else {
      await this.mostrarError('Error al guardar la configuración. Inténtalo de nuevo.');
    }

  } catch (error) {
    console.error('Error al completar configuración:', error);
    await this.mostrarError('Error inesperado al configurar tu cuenta');
  }
}

  /**
   * Verificar disponibilidad de biometría (placeholder)
   */
  private async verificarBiometria(): Promise<boolean> {
    // TODO: Implementar verificación real de biometría con Capacitor
    // Por ahora retornamos false
    return false;
  }

  /**
   * Mostrar mensaje de error con sanitización
   */
  private async mostrarError(mensaje: string): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }

  /**
   * Mostrar mensaje de éxito con sanitización
   */
  private async mostrarExito(titulo: string, mensaje: string): Promise<void> {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Obtener título del paso actual
   */
  get tituloPasoActual(): string {
    switch (this.pasoActual) {
      case 1:
        return '¡Bienvenido!';
      case 2:
        return '¿Qué es Carrito?';
      case 3:
        return 'Selecciona el país donde resides actualmente';
      case 4:
        return 'Configura tu perfil';
      case 5:
        return '¡Todo listo!';
      default:
        return 'Configuración';
    }
  }

  /**
   * Obtener descripción del paso actual
   */
  get descripcionPasoActual(): string {
    switch (this.pasoActual) {
      case 1:
        return 'Tu compañero inteligente para controlar gastos';
      case 2:
        return 'Descubre cómo Carrito te ayudará a controlar tus gastos de supermercado';
      case 3:
        return 'Esto nos ayudará a configurar la moneda y formato correcto para tu región';
      case 4:
        return 'Personaliza tu experiencia y configura tu PIN de seguridad';
      case 5:
        return 'Tu cuenta ha sido configurada exitosamente';
      default:
        return '';
    }
  }

  /**
   * Verificar si se puede continuar al siguiente paso
   */
  get puedeAvanzar(): boolean {
    switch (this.pasoActual) {
      case 1:
      case 2:
        return true; // Siempre se puede avanzar desde splash y explicación
      case 3:
        return this.validaciones.pais.valido;
      case 4:
        return this.validaciones.nombre.valido && 
               this.validaciones.pin.valido && 
               this.validaciones.pinConfirmacion.valido;
      default:
        return false;
    }
  }

  /**
   * Obtener texto del botón principal
   */
  get textoBotonPrincipal(): string {
    switch (this.pasoActual) {
      case 1:
        return 'Empezar';
      case 2:
        return 'Entendido';
      case 3:
        return 'Continuar';
      case 4:
        return 'Completar configuración';
      case 5:
        return 'Ir a la aplicación';
      default:
        return 'Continuar';
    }
  }

  /**
   * Obtener formato de moneda legible para mostrar
   */
  get formatoMonedaLegible(): string {
    if (!this.paisSeleccionado) return '';
    
    // Convertir formato técnico a ejemplo legible
    // De "$ #,##0.00" a "Ejemplo: $1,234.56"
    const formato = this.paisSeleccionado.formatoMoneda;
    const simbolo = this.paisSeleccionado.simboloMoneda;
    
    // Generar ejemplo basado en el formato
    if (formato.includes('.00')) {
      return `Ejemplo: ${simbolo}1,234.56`;
    } else if (formato.includes(',##0')) {
      return `Ejemplo: ${simbolo}1,234`;
    } else {
      return `Formato: ${simbolo}`;
    }
  }

  // ============================
  // MÉTODOS LEGACY PARA COMPATIBILIDAD (ya no se usan pero se mantienen por si acaso)
  // ============================

  /**
   * @deprecated - Ya no se usa, el grid no necesita navegación manual
   */
  paisAnterior(): void {
    console.warn('paisAnterior() está deprecated - el grid no necesita navegación manual');
  }

  /**
   * @deprecated - Ya no se usa, el grid no necesita navegación manual
   */
  paisSiguiente(): void {
    console.warn('paisSiguiente() está deprecated - el grid no necesita navegación manual');
  }

  /**
   * @deprecated - Ya no se usa, reemplazado por seleccionarPais()
   */
  onPaisSeleccionado(codigoPais: string): void {
    console.warn('onPaisSeleccionado() está deprecated - usar seleccionarPais() directamente');
    const pais = this.paisesDisponibles.find(p => p.codigo === codigoPais);
    if (pais) {
      this.seleccionarPais(pais);
    }
  }
}