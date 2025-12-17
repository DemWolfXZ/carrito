/**
 * Componente de pantalla principal de la aplicación Carrito
 * Contiene el saludo personalizado, fecha del sistema, tabs principales y publicidad
 * Se muestra después de completar la configuración inicial en bienvenida
 * VERSIÓN CORREGIDA - INICIALIZACIÓN MEJORADA
 *
 * @author DemWolf
 * @version 1.1 - CORREGIDO PARA INICIALIZACIÓN CORRECTA
 */

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations'; // ✅ IMPORTAR ANIMACIONES

// Importar servicios usando rutas relativas (hasta que funcionen los paths @core)
import { UsuarioService } from '../../../core/services/usuario.service';
import { ComprasService } from '../../../core/services/compras.service';
import { MonetizacionService } from '../../../core/services/monetizacion.service';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { AlmacenamientoService } from '../../../core/services/almacenamiento.service';

// Importar modelos usando rutas relativas
import { Usuario } from '../../../core/models/usuario.model';
import { SesionCompra } from '../../../core/models/sesion-compra.model';

// Interface para evento de burbuja (local)
interface EventoBurbuja {
  mostrar: boolean;
  razon: 'tiempo' | 'cambio_tab' | 'compra_finalizada';
  tiempoEspera: number;
}

@Component({
  selector: 'app-pantalla-principal',
  templateUrl: './pantalla-principal.component.html',
  styleUrls: ['./pantalla-principal.component.scss'],
  // ✅ DEFINIR ANIMACIONES
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class PantallaPrincipalComponent implements OnInit, OnDestroy {

  // Datos del usuario y saludo
  usuario: Usuario | null = null;
  saludo: string = '';
  fechaActual: string = '';
  horaActual: string = '';

  // Estado de sesión activa
  sesionActiva: SesionCompra | null = null;
  mostrarTabContinuar: boolean = false;

  // Estado de monetización
  mostrarBurbujaDonacion: boolean = false;
  eventoBurbuja: EventoBurbuja | null = null;

  // Estados de carga
  cargandoDatos: boolean = true;

  // Tab activo
  tabActivo: string = 'nueva-compra';

  // Subscripciones
  private subscriptions: Subscription = new Subscription();

  // Timer para actualizar hora
  private timerHora: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private usuarioService: UsuarioService,
    private comprasService: ComprasService,
    private monetizacionService: MonetizacionService,
    private configuracionService: ConfiguracionService,
    private almacenamientoService: AlmacenamientoService,
    private cdr: ChangeDetectorRef // ✅ AGREGAR PARA DETECTAR CAMBIOS
  ) {
    console.log('🏗️ PantallaPrincipalComponent constructor ejecutado');
    console.log('🔍 Servicios inyectados:', {
      router: !!this.router,
      usuarioService: !!this.usuarioService,
      comprasService: !!this.comprasService,
      monetizacionService: !!this.monetizacionService,
      configuracionService: !!this.configuracionService,
      almacenamientoService: !!this.almacenamientoService
    });
  }

  /**
   * ✅ INICIALIZACIÓN CORREGIDA: Inicialización del componente
   */
  async ngOnInit(): Promise<void> {
    console.log('🚀 =====================================');
    console.log('🚀 INICIANDO ngOnInit de PantallaPrincipalComponent');
    console.log('🚀 =====================================');

    try {
      await this.inicializarComponente();
      console.log('✅ PantallaPrincipalComponent inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar pantalla principal:', error);
      // Si hay error crítico, redirigir a bienvenida
      console.log('🔄 Redirigiendo a bienvenida debido a error...');
      await this.router.navigate(['/bienvenida'], { replaceUrl: true });
    }
  }

  /**
   * Limpieza al destruir el componente
   */
  ngOnDestroy(): void {
    console.log('🧹 Limpiando PantallaPrincipalComponent...');

    // Cancelar todas las suscripciones
    this.subscriptions.unsubscribe();

    // Limpiar timer de hora
    if (this.timerHora) {
      clearInterval(this.timerHora);
    }
  }

  /**
   * ✅ INICIALIZACIÓN CORREGIDA: Inicializar datos del componente
   */
  private async inicializarComponente(): Promise<void> {
    try {
      console.log('⚙️ Inicializando PantallaPrincipalComponent...');
      this.cargandoDatos = true;

      // ✅ PASO 1: Verificar que la configuración esté completa ANTES de continuar
      console.log('🔍 Verificando configuración completa...');
      const configuracionCompleta = await this.configuracionService.esConfiguracionCompleta();
      console.log('🔍 ¿Configuración completa?', configuracionCompleta);

      if (!configuracionCompleta) {
        console.log('❌ Configuración no completa - redirigiendo a bienvenida');
        await this.router.navigate(['/bienvenida'], { replaceUrl: true });
        return;
      }

      // ✅ PASO 2: Verificar datos directamente en almacenamiento
      console.log('🔍 Verificando datos en almacenamiento...');
      const configuracionExiste = await this.almacenamientoService.existeConfiguracion();
      const usuarioExiste = await this.almacenamientoService.existeUsuario();

      console.log('🔍 Estado de almacenamiento:', {
        configuracionExiste,
        usuarioExiste
      });

      if (!configuracionExiste || !usuarioExiste) {
        console.log('❌ Datos incompletos en almacenamiento - redirigiendo a bienvenida');
        await this.router.navigate(['/bienvenida'], { replaceUrl: true });
        return;
      }

      // ✅ PASO 3: Cargar datos del usuario
      console.log('👤 Cargando datos del usuario...');
      await this.cargarDatosUsuario();

      // ✅ PASO 4: Configurar fecha y hora
      console.log('📅 Configurando fecha y hora...');
      this.configurarFechaHora();

      // ✅ PASO 5: Verificar sesión activa
      console.log('🛒 Verificando sesión activa...');
      await this.verificarSesionActiva();

      // ✅ PASO 6: Configurar suscripciones
      console.log('📡 Configurando suscripciones...');
      this.configurarSuscripciones();

      // ✅ PASO 7: Suscribirse a cambios del usuario para actualizar saludo reactivamente
      console.log('👂 Configurando escucha de cambios de usuario...');
      const sub = this.usuarioService.usuario$.subscribe((usuario) => {
        if (usuario) {
          this.usuario = usuario;
          this.generarSaludo();
          this.cdr.detectChanges();
        }
      });
      this.subscriptions.add(sub);

      // ✅ PASO 8: Registrar actividad del usuario
      console.log('📊 Registrando actividad...');
      await this.usuarioService.registrarActividad();

      console.log('✅ Componente inicializado exitosamente');

    } catch (error) {
      console.error('❌ Error al inicializar componente:', error);
      throw error;
    } finally {
      this.cargandoDatos = false;
    }
  }

  /**
   * Cargar datos del usuario actual
   */
  private async cargarDatosUsuario(): Promise<void> {
    console.log('👤 Cargando datos del usuario...');
    this.usuario = await this.usuarioService.obtenerUsuarioActual();

    if (!this.usuario) {
      console.error('❌ Usuario no encontrado');
      throw new Error('Usuario no encontrado');
    }

    console.log('👤 Usuario cargado:', this.usuario.nombre);
    // Generar saludo personalizado
    this.generarSaludo();
  }

  /**
   * Generar saludo personalizado según la hora del día
   */
  private generarSaludo(): void {
    if (!this.usuario) return;

    const hora = new Date().getHours();
    let saludoBase = '';

    if (hora >= 5 && hora < 12) {
      saludoBase = 'Buenos días';
    } else if (hora >= 12 && hora < 18) {
      saludoBase = 'Buenas tardes';
    } else {
      saludoBase = 'Buenas noches';
    }

    this.saludo = `${saludoBase}, ${this.usuario.nombre}`;
    console.log('👋 Saludo generado:', this.saludo);
  }

  /**
   * Configurar fecha y hora del sistema
   */
  private configurarFechaHora(): void {
    // Configurar fecha inicial
    this.actualizarFechaHora();

    // Timer para actualizar cada minuto
    this.timerHora = setInterval(() => {
      this.actualizarFechaHora();
    }, 60000); // Actualizar cada minuto
  }

  /**
   * Actualizar fecha y hora actuales
   */
  private actualizarFechaHora(): void {
    const ahora = new Date();

    // Formatear fecha según configuración del usuario
    this.fechaActual = this.formatearFecha(ahora);

    // Formatear hora
    this.horaActual = this.formatearHora(ahora);
  }

  /**
   * Formatear fecha según el país del usuario
   */
  private formatearFecha(fecha: Date): string {
    if (!this.usuario) return fecha.toLocaleDateString();

    const opciones: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    };

    // Usar formato según el país del usuario
    const locale = this.obtenerLocaleSegunPais();
    return fecha.toLocaleDateString(locale, opciones);
  }

  /**
   * Formatear hora según configuración del usuario
   */
  private formatearHora(fecha: Date): string {
    if (!this.usuario) return fecha.toLocaleTimeString();

    const formato24h = this.usuario.configuraciones.idioma === 'es'; // Por ahora usar 24h para español

    const opciones: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !formato24h
    };

    const locale = this.obtenerLocaleSegunPais();
    return fecha.toLocaleTimeString(locale, opciones);
  }

  /**
   * Obtener locale según el país del usuario
   */
  private obtenerLocaleSegunPais(): string {
    if (!this.usuario) return 'es-ES';

    const localesPorPais: { [key: string]: string } = {
      'AR': 'es-AR',
      'BO': 'es-BO',
      'CL': 'es-CL',
      'CO': 'es-CO',
      'CR': 'es-CR',
      'CU': 'es-CU',
      'EC': 'es-EC',
      'SV': 'es-SV',
      'ES': 'es-ES',
      'GT': 'es-GT',
      'HN': 'es-HN',
      'MX': 'es-MX',
      'NI': 'es-NI',
      'PA': 'es-PA',
      'PY': 'es-PY',
      'PE': 'es-PE',
      'DO': 'es-DO',
      'UY': 'es-UY',
      'VE': 'es-VE',
      'US': 'en-US'
    };

    return localesPorPais[this.usuario.pais] || 'es-ES';
  }

  /**
   * Verificar si hay sesión de compra activa
   */
  private async verificarSesionActiva(): Promise<void> {
    console.log('🛒 Verificando sesión activa...');
    this.sesionActiva = await this.comprasService.obtenerSesionActiva();
    this.mostrarTabContinuar = this.sesionActiva !== null;
    console.log('🛒 Sesión activa:', this.mostrarTabContinuar);
  }

  /**
   * Configurar suscripciones a observables
   */
  private configurarSuscripciones(): void {
    console.log('📡 Configurando suscripciones...');

    // Suscribirse a cambios en sesión activa
    const sesionSub = this.comprasService.sesionActiva$.subscribe((sesion) => {
      this.sesionActiva = sesion;
      this.mostrarTabContinuar = sesion !== null;
      console.log('📡 Sesión activa actualizada:', this.mostrarTabContinuar);
    });
    this.subscriptions.add(sesionSub);

    // Suscribirse a eventos de burbuja de donación
    const burbujaSub = this.monetizacionService.mostrarBurbuja$.subscribe((evento) => {
      this.eventoBurbuja = evento;
      this.mostrarBurbujaDonacion = evento.mostrar;
      console.log('📡 Evento burbuja actualizado:', evento.mostrar);
      // ✅ FORZAR DETECCIÓN DE CAMBIOS PARA EVITAR NG0100
      this.cdr.detectChanges();
    });
    this.subscriptions.add(burbujaSub);

    console.log('📡 Suscripciones configuradas');
  }

  /**
   * Manejar cambio de tab desde TabBarraPrincipalComponent
   * @param tabSeleccionado Tab que se seleccionó
   */
  onCambioTab(tabSeleccionado: string): void {
    console.log('📱 Cambio de tab:', tabSeleccionado);

    // Actualizar tab activo
    this.tabActivo = tabSeleccionado;

    // Notificar al servicio de monetización sobre cambio de tab
    this.monetizacionService.activarBurbujaPorCambioTab();

    // Registrar actividad del usuario
    this.usuarioService.registrarActividad();
  }

  /**
   * Navegar a sesión de compra activa
   */
  async irACompraActiva(): Promise<void> {
    console.log('🛒 Navegando a compra activa...');
    if (this.sesionActiva) {
      await this.router.navigate(['/compra-activa']);
    }
  }

  /**
   * Cerrar burbuja de donación
   */
  cerrarBurbujaDonacion(): void {
    console.log('❌ Cerrando burbuja de donación');
    this.monetizacionService.cerrarBurbuja();
  }

  /**
   * Abrir modal de donación
   */
  abrirModalDonacion(): void {
    console.log('💝 Abriendo modal de donación');
    // TODO: Implementar modal de donación
  }


  /**
   * Incrementar contador de anuncios visualizados
   */
  onAnuncioVisualizado(): void {
    console.log('👁️ Anuncio visualizado');
    this.monetizacionService.incrementarAnunciosVisualizados();
  }

  /**
   * Obtener texto del tab continuar compra
   */
  get textoTabContinuar(): string {
    if (!this.sesionActiva) return 'Continuar Compra';

    const productos = this.sesionActiva.productos.length;
    const total = this.sesionActiva.totales.total;

    return `Continuar (${productos} productos - $${total.toLocaleString()})`;
  }

  /**
   * Obtener información de moneda del usuario
   */
  get simboloMoneda(): string {
    if (!this.usuario) return '$';

    // Obtener símbolo de moneda según el país
    const simbolosPorPais: { [key: string]: string } = {
      'CL': '$',
      'AR': '$',
      'MX': '$',
      'CO': '$',
      'PE': 'S/',
      'US': 'US$',
      'ES': '€',
      'BO': 'Bs',
      'CR': '₡',
      'CU': '$',
      'EC': 'US$',
      'SV': 'US$',
      'GT': 'Q',
      'HN': 'L',
      'NI': 'C$',
      'PA': 'B/.',
      'PY': '₲',
      'DO': 'RD$',
      'UY': '$U',
      'VE': 'Bs.'
    };

    return simbolosPorPais[this.usuario.pais] || '$';
  }
}
