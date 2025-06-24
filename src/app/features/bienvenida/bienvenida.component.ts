/**
 * Componente de bienvenida para la configuración inicial única de la aplicación Carrito
 * Compatible con Angular 18 + Ionic 8 + Capacitor 7
 * Sistema de selector grid responsivo - sustituto del carrusel 3D
 * 
 * @author DemWolf
 * @version 2.0 - CON DEBUGGING EXTENSIVO - ERRORES TYPESCRIPT CORREGIDOS
 */

import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

// ✅ IMPORTAR MODELOS Y SERVICIOS USANDO RUTAS RELATIVAS (CORREGIDO)
import { DatosConfiguracionInicial } from '../../core/models/usuario.model';
import { Pais } from '../../core/models/pais.model';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { UsuarioService } from '../../core/services/usuario.service';

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
  ) {
    console.log('🏗️ CONSTRUCTOR de BienvenidaComponent ejecutado');
    console.log('🔍 DEBUG - Servicios inyectados:', {
      router: !!this.router,
      configuracionService: !!this.configuracionService,
      usuarioService: !!this.usuarioService,
      platform: !!this.platform
    });
  }

  /**
   * Inicialización del componente
   */
  async ngOnInit(): Promise<void> {
    console.log('🚀 INICIANDO ngOnInit de BienvenidaComponent');
    
    try {
      console.log('🛒 Inicializando componente de bienvenida...');
      
      // Detectar tipo de dispositivo
      console.log('📱 Detectando tipo de dispositivo...');
      await this.detectarTipoDispositivo();
      
      // Configurar orientación según el dispositivo
      console.log('🔄 Configurando orientación...');
      await this.configurarOrientacion();
      
      // Inicializar componente
      console.log('⚙️ Inicializando componente...');
      await this.inicializarComponente();
      
      // Iniciar secuencia de splash automático
      console.log('🎬 Iniciando splash sequence...');
      this.iniciarSplashSequence();
      
      console.log('✅ Componente de bienvenida inicializado correctamente');
    } catch (error) {
      console.error('❌ ERROR CRÍTICO en ngOnInit:', error);
      console.error('❌ Stack trace:', (error as Error)?.stack || 'Stack no disponible');
      await this.mostrarError('Error al cargar la configuración inicial');
    }
  }

  /**
   * Después de que la vista esté inicializada
   */
  ngAfterViewInit(): void {
    console.log('🎨 ngAfterViewInit ejecutado');
    // Ya no es necesario configurar carrusel, pero mantenemos para compatibilidad
    setTimeout(() => {
      this.configurarSelectorPaises();
    }, 100);
  }

  /**
   * Limpieza al destruir el componente
   */
  ngOnDestroy(): void {
    console.log('🧹 Limpiando componente de bienvenida...');
    
    // Cancelar todas las suscripciones para evitar memory leaks
    this.subscriptions.unsubscribe();
    
    // Restaurar orientación original si es necesario
    this.restaurarOrientacion();
  }

  /**
   * Detectar tipo de dispositivo (móvil vs tablet)
   */
  private async detectarTipoDispositivo(): Promise<void> {
    console.log('🔍 Iniciando detección de dispositivo...');
    
    const width = this.platform.width();
    const height = this.platform.height();
    
    console.log(`📏 Dimensiones detectadas: ${width}x${height}`);
    
    // Considerar tablet si tiene más de 768px en cualquier dimensión
    this.esTablet = Math.max(width, height) >= 768;
    
    // Detectar orientación actual
    this.esModoVertical = height > width;
    
    console.log(`📱 Dispositivo detectado: ${this.esTablet ? 'Tablet' : 'Móvil'}, Orientación: ${this.esModoVertical ? 'Vertical' : 'Horizontal'}`);
  }

  /**
   * Configurar orientación según el tipo de dispositivo usando Capacitor 7
   */
  private async configurarOrientacion(): Promise<void> {
    console.log('🔄 Configurando orientación...');
    
    // Solo aplicar en dispositivos Capacitor reales
    if (!this.platform.is('capacitor')) {
      console.log('🌐 No es un dispositivo Capacitor, saltando configuración de orientación');
      return;
    }

    try {
      if (!this.esTablet) {
        // MÓVILES: Forzar orientación vertical usando Capacitor 7 API
        await ScreenOrientation.lock({ orientation: 'portrait' });
        console.log('🔒 Orientación bloqueada a vertical para móvil');
      } else {
        // TABLETS: Permitir ambas orientaciones
        await ScreenOrientation.unlock();
        console.log('🔓 Orientación libre para tablet');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo configurar la orientación (esto es normal en el navegador):', error);
    }
  }

  /**
   * Restaurar orientación original
   */
  private async restaurarOrientacion(): Promise<void> {
    console.log('🔄 Restaurando orientación...');
    
    if (!this.platform.is('capacitor')) {
      return;
    }

    try {
      await ScreenOrientation.unlock();
      console.log('🔄 Orientación restaurada');
    } catch (error) {
      console.warn('⚠️ No se pudo restaurar la orientación:', error);
    }
  }

  /**
   * Inicializar datos del componente
   */
  private async inicializarComponente(): Promise<void> {
    console.log('⚙️ Inicializando datos del componente...');
    
    try {
      // Verificar si ya existe configuración (por seguridad)
      console.log('🔍 Verificando configuración existente...');
      console.log('🔍 DEBUG - configuracionService existe?', !!this.configuracionService);
      
      if (!this.configuracionService) {
        throw new Error('ConfiguracionService no está disponible');
      }
      
      console.log('🔍 Llamando a esConfiguracionCompleta()...');
      const configuracionCompleta = await this.configuracionService.esConfiguracionCompleta();
      console.log('🔍 Resultado de esConfiguracionCompleta():', configuracionCompleta);
      
      if (configuracionCompleta) {
        console.log('⏭️ Configuración ya completada, redirigiendo...');
        // Si ya está configurado, redirigir a pantalla principal
        await this.router.navigate(['/pantalla-principal']);
        return;
      }

      // Cargar países disponibles desde el servicio
      console.log('🌍 Cargando países disponibles...');
      this.paisesDisponibles = this.configuracionService.obtenerPaisesActivos();
      console.log(`🌍 Países cargados: ${this.paisesDisponibles.length}`, this.paisesDisponibles);
      
      // Verificar disponibilidad de biometría (simulado por ahora)
      console.log('🔐 Verificando biometría...');
      this.datosConfiguracion.biometriaDisponible = await this.verificarBiometria();
      console.log('🔐 Biometría disponible:', this.datosConfiguracion.biometriaDisponible);
      
      console.log('✅ Inicialización del componente completada correctamente');
      
    } catch (error) {
      console.error('❌ ERROR en inicializarComponente:', error);
      console.error('❌ Stack trace:', (error as Error)?.stack || 'Stack no disponible');
      throw error;
    }
  }

  /**
   * Configurar selector de países con grid (reemplaza configurarCarrusel)
   */
  private configurarSelectorPaises(): void {
    console.log('🎯 Configurando selector de países...');
    
    if (this.paisesDisponibles.length === 0) {
      console.warn('⚠️ No hay países disponibles para configurar el selector');
      return;
    }
    
    // Seleccionar país por defecto (Chile como ejemplo)
    const paisDefecto = this.paisesDisponibles.find(p => p.codigo === 'CL');
    console.log('🎯 País por defecto encontrado:', paisDefecto);
    
    if (paisDefecto && !this.paisSeleccionado) {
      console.log('🎯 Seleccionando país por defecto...');
      this.seleccionarPais(paisDefecto);
    }
    
    console.log(`🎯 Selector de países configurado. ${this.paisesDisponibles.length} países disponibles`);
  }

  /**
   * Seleccionar país (reemplaza la lógica del carrusel)
   */
  seleccionarPais(pais: Pais): void {
    console.log('🌍 Seleccionando país:', pais);
    
    // Actualizar país seleccionado
    this.paisSeleccionado = pais;
    this.datosConfiguracion.codigoPais = pais.codigo;
    
    // Validar selección
    const validacion = this.validarSeleccionPais();
    console.log('🌍 Resultado de validación:', validacion);
    
    // Log para debugging
    console.log(`🌍 País seleccionado: ${pais.nombre} (${pais.codigo})`);
    
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
        console.log('📳 Feedback táctil simulado');
      } catch (error) {
        console.log('📱 Feedback táctil no disponible');
      }
    }
  }

  /**
   * Iniciar secuencia animada de splash
   */
  private iniciarSplashSequence(): void {
    console.log('🎬 Iniciando secuencia de splash...');
    // Mostrar splash durante 6 segundos
    setTimeout(() => {
      this.ocultarSplash();
    }, 6000);
  }

  /**
   * Ocultar splash con animación
   */
  private ocultarSplash(): void {
    console.log('🎭 Ocultando splash...');
    this.splashAnimacionCompleta = true;
    
    // Esperar a que termine la animación de salida
    setTimeout(() => {
      this.mostrarSplash = false;
      this.pasoActual = 2; // Ir a explicación de la app
      console.log('✅ Splash oculto, paso actual: 2');
    }, 800);
  }

  /**
   * Avanzar al siguiente paso de configuración - CON DEBUGGING EXTENSIVO
   */
  async siguientePaso(): Promise<void> {
    console.log('⏭️ =====================================');
    console.log(`⏭️ MÉTODO siguientePaso() EJECUTADO`);
    console.log(`⏭️ Paso actual: ${this.pasoActual}`);
    console.log('⏭️ =====================================');
    
    try {
      console.log(`⏭️ Intentando avanzar del paso ${this.pasoActual} al ${this.pasoActual + 1}`);
      
      // Validar paso actual antes de avanzar
      console.log('🔍 Validando paso actual...');
      const validacionPaso = await this.validarPasoActual();
      console.log('🔍 Resultado de validación:', validacionPaso);
      
      if (!validacionPaso) {
        console.log('❌ Validación del paso actual falló');
        return;
      }

      // Avanzar al siguiente paso
      if (this.pasoActual < this.totalPasos) {
        console.log(`➡️ Avanzando paso: ${this.pasoActual} -> ${this.pasoActual + 1}`);
        this.pasoActual++;
        console.log(`✅ Avanzado al paso ${this.pasoActual}`);
        
        // Configurar selector si llegamos al paso de selección de país
        if (this.pasoActual === 3) {
          console.log('🌍 Llegamos al paso 3, configurando selector de países...');
          setTimeout(() => {
            this.configurarSelectorPaises();
          }, 100);
        }
      } else {
        // Último paso - completar configuración
        console.log('🏁 =====================================');
        console.log('🏁 ÚLTIMO PASO ALCANZADO');
        console.log('🏁 Ejecutando completarConfiguracion()...');
        console.log('🏁 =====================================');
        await this.completarConfiguracion();
      }
    } catch (error) {
      console.error('❌ ERROR CRÍTICO en siguientePaso:', error);
      console.error('❌ Stack trace:', (error as Error)?.stack || 'Stack no disponible');
      await this.mostrarError('Error al procesar la configuración');
    }
  }

  /**
   * Retroceder al paso anterior
   */
  pasoAnterior(): void {
    console.log(`⏮️ Retrocediendo desde paso ${this.pasoActual}`);
    
    if (this.pasoActual > 2) { // No permitir volver al splash
      this.pasoActual--;
      console.log(`⏮️ Retrocedido al paso ${this.pasoActual}`);
    }
  }

  /**
   * Validar el paso actual antes de continuar
   */
  private async validarPasoActual(): Promise<boolean> {
    console.log(`🔍 Validando paso ${this.pasoActual}...`);
    
    switch (this.pasoActual) {
      case 1:
      case 2:
        // Pasos de splash y explicación - siempre válidos
        console.log('✅ Pasos 1-2 siempre válidos');
        return true;
        
      case 3:
        // Validar selección de país
        const validPais = this.validarSeleccionPais();
        console.log(`🌍 Validación país: ${validPais}`);
        console.log('🌍 Estado de validaciones.pais:', this.validaciones.pais);
        return validPais;
        
      case 4:
        // Validar configuración personal
        const validPersonal = this.validarConfiguracionPersonal();
        console.log(`👤 Validación personal: ${validPersonal}`);
        console.log('👤 Estado de todas las validaciones:', this.validaciones);
        return validPersonal;
        
      default:
        console.log('✅ Paso por defecto - válido');
        return true;
    }
  }

  /**
   * Validar que se haya seleccionado un país válido
   */
  private validarSeleccionPais(): boolean {
    console.log('🌍 Validando selección de país...');
    console.log('🌍 datosConfiguracion.codigoPais:', this.datosConfiguracion.codigoPais);
    console.log('🌍 paisSeleccionado:', this.paisSeleccionado);
    
    // Verificar que hay un país seleccionado
    if (!this.datosConfiguracion.codigoPais) {
      this.validaciones.pais.valido = false;
      this.validaciones.pais.mensaje = 'Debes seleccionar tu país de residencia';
      console.log('❌ No hay país seleccionado');
      return false;
    }

    // Verificar que el país es válido
    const paisValido = this.configuracionService.validarCodigoPais(this.datosConfiguracion.codigoPais);
    console.log('🌍 País válido según servicio:', paisValido);
    
    if (!paisValido) {
      this.validaciones.pais.valido = false;
      this.validaciones.pais.mensaje = 'País seleccionado no válido';
      console.log('❌ País no válido según servicio');
      return false;
    }

    this.validaciones.pais.valido = true;
    this.validaciones.pais.mensaje = '';
    console.log('✅ País válido');
    return true;
  }

  /**
   * Validar configuración personal (nombre y PIN)
   */
  private validarConfiguracionPersonal(): boolean {
    console.log('👤 Validando configuración personal...');
    console.log('👤 Datos actuales:', {
      nombre: this.datosConfiguracion.nombre,
      pin: this.datosConfiguracion.pin,
      pinConfirmacion: this.pinConfirmacion
    });
    
    let valido = true;

    // Validar nombre
    const nombreValido = this.validarNombre();
    console.log('👤 Nombre válido:', nombreValido);
    if (!nombreValido) {
      valido = false;
    }

    // Validar PIN
    const pinValido = this.validarPin();
    console.log('👤 PIN válido:', pinValido);
    if (!pinValido) {
      valido = false;
    }

    // Validar confirmación de PIN
    const pinConfirmacionValido = this.validarPinConfirmacion();
    console.log('👤 PIN confirmación válido:', pinConfirmacionValido);
    if (!pinConfirmacionValido) {
      valido = false;
    }

    console.log('👤 Validación personal final:', valido);
    return valido;
  }

  /**
   * Validar nombre de usuario con sanitización y seguridad
   */
  validarNombre(): boolean {
    const nombre = this.datosConfiguracion.nombre.trim();
    console.log('👤 Validando nombre:', `"${nombre}"`);

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
    console.log('🔐 Validando PIN:', `"${pin}" (longitud: ${pin.length})`);

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
    console.log('🔐 Validando confirmación PIN:', {
      pin: this.datosConfiguracion.pin,
      confirmacion: this.pinConfirmacion,
      coinciden: this.pinConfirmacion === this.datosConfiguracion.pin
    });
    
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
   * ✅ Completar configuración inicial - MÉTODO CRÍTICO CON DEBUGGING EXTENSIVO
   */
  private async completarConfiguracion(): Promise<void> {
    console.log('🚀 =====================================');
    console.log('🚀 EJECUTANDO completarConfiguracion()');
    console.log('🚀 =====================================');
    
    try {
      console.log('🚀 Iniciando proceso de completar configuración...');
      
      // DEBUG: Mostrar estado actual de los datos
      console.log('📊 Estado actual de datosConfiguracion:', this.datosConfiguracion);
      console.log('📊 Estado actual de paisSeleccionado:', this.paisSeleccionado);
      console.log('📊 Estado actual de validaciones:', this.validaciones);
      
      // Mostrar loading
      console.log('⏳ Creando loading...');
      const loading = await this.loadingController.create({
        message: 'Configurando tu cuenta...',
        spinner: 'crescent'
      });
      console.log('⏳ Loading creado, presentando...');
      await loading.present();
      console.log('⏳ Loading presentado correctamente');

      console.log('💾 Guardando configuración inicial...');
      console.log('💾 Datos a guardar:', this.datosConfiguracion);
      
      // DEBUG: Verificar que el servicio existe antes de usarlo
      console.log('🔍 configuracionService existe?', !!this.configuracionService);
      console.log('🔍 Método guardarConfiguracionInicial existe?', typeof this.configuracionService.guardarConfiguracionInicial);
      
      // Guardar configuración inicial
      console.log('💾 Llamando a configuracionService.guardarConfiguracionInicial...');
      const exito = await this.configuracionService.guardarConfiguracionInicial(this.datosConfiguracion);
      console.log('💾 Resultado de guardarConfiguracionInicial:', exito);

      console.log('⏳ Cerrando loading...');
      await loading.dismiss();
      console.log('⏳ Loading cerrado');

      if (exito) {
        console.log('✅ Configuración guardada exitosamente');
        
        // Mostrar mensaje de éxito
        console.log('🎉 Mostrando mensaje de éxito...');
        await this.mostrarExito('¡Configuración completada!', 'Tu cuenta ha sido creada exitosamente');
        console.log('🎉 Mensaje de éxito mostrado');
        
        console.log('🚀 =====================================');
        console.log('🚀 INTENTANDO NAVEGACIÓN A PANTALLA PRINCIPAL');
        console.log('🚀 =====================================');
        console.log('🚀 Router existe?', !!this.router);
        console.log('🚀 Método navigate existe?', typeof this.router.navigate);
        
        console.log('🚀 Ejecutando router.navigate(["/pantalla-principal"])...');
        
        try {
          const navegacionExitosa = await this.router.navigate(['/pantalla-principal']);
          console.log('🚀 Resultado de navegación:', navegacionExitosa);
          
          if (navegacionExitosa) {
            console.log('✅ =====================================');
            console.log('✅ NAVEGACIÓN EXITOSA A PANTALLA PRINCIPAL');
            console.log('✅ =====================================');
          } else {
            console.error('❌ =====================================');
            console.error('❌ NAVEGACIÓN FALLÓ - navigate() retornó false');
            console.error('❌ =====================================');
            await this.mostrarError('Error al navegar a la pantalla principal');
          }
        } catch (errorNavegacion) {
          console.error('❌ =====================================');
          console.error('❌ ERROR CRÍTICO EN NAVEGACIÓN');
          console.error('❌ Error:', errorNavegacion);
          console.error('❌ Stack trace:', (errorNavegacion as Error)?.stack || 'Stack no disponible');
          console.error('❌ =====================================');
          await this.mostrarError('Error crítico de navegación: ' + (errorNavegacion as Error)?.message || 'Error desconocido');
        }
        
      } else {
        console.error('❌ Error al guardar configuración');
        await this.mostrarError('Error al guardar la configuración. Inténtalo de nuevo.');
      }

    } catch (error) {
      console.error('❌ =====================================');
      console.error('❌ ERROR CRÍTICO EN completarConfiguracion');
      console.error('❌ Error:', error);
      console.error('❌ Stack trace:', (error as Error)?.stack || 'Stack no disponible');
      console.error('❌ =====================================');
      await this.mostrarError('Error inesperado al configurar tu cuenta: ' + (error as Error)?.message || 'Error desconocido');
    }
  }

  /**
   * Verificar disponibilidad de biometría (placeholder)
   */
  private async verificarBiometria(): Promise<boolean> {
    // TODO: Implementar verificación real de biometría con Capacitor
    // Por ahora retornamos false
    console.log('🔐 Verificación de biometría simulada - retornando false');
    return false;
  }

  /**
   * Mostrar mensaje de error con sanitización
   */
  private async mostrarError(mensaje: string): Promise<void> {
    console.error('❌ Mostrando error:', mensaje);
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
    console.log('✅ Mostrando éxito:', titulo, mensaje);
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
    const resultado = (() => {
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
    })();
    
    console.log(`🔍 puedeAvanzar (paso ${this.pasoActual}):`, resultado);
    return resultado;
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