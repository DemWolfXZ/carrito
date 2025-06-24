/**
 * Componente de pantalla principal de la aplicación Carrito
 * Contiene el saludo personalizado, fecha del sistema, tabs principales y publicidad
 * Se muestra después de completar la configuración inicial en bienvenida
 * 
 * @author DemWolf
 * @version 1.0
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Importar servicios usando rutas relativas (hasta que funcionen los paths @core)
import { UsuarioService } from '../../../core/services/usuario.service';
import { ComprasService } from '../../../core/services/compras.service';
import { MonetizacionService } from '../../../core/services/monetizacion.service';
import { ConfiguracionService } from '../../../core/services/configuracion.service';

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
  styleUrls: ['./pantalla-principal.component.scss']
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
  
  // Subscripciones
  private subscriptions: Subscription = new Subscription();
  
  // Timer para actualizar hora
  private timerHora: any;

  constructor(
    private router: Router,
    private usuarioService: UsuarioService,
    private comprasService: ComprasService,
    private monetizacionService: MonetizacionService,
    private configuracionService: ConfiguracionService
  ) {}

  /**
   * Inicialización del componente
   */
  async ngOnInit(): Promise<void> {
    try {
      await this.inicializarComponente();
    } catch (error) {
      console.error('Error al inicializar pantalla principal:', error);
      // Si hay error, redirigir a bienvenida
      await this.router.navigate(['/bienvenida']);
    }
  }

  /**
   * Limpieza al destruir el componente
   */
  ngOnDestroy(): void {
    // Cancelar todas las suscripciones
    this.subscriptions.unsubscribe();
    
    // Limpiar timer de hora
    if (this.timerHora) {
      clearInterval(this.timerHora);
    }
  }

  /**
   * Inicializar datos del componente
   */
  private async inicializarComponente(): Promise<void> {
    try {
      this.cargandoDatos = true;

      // Verificar que la configuración esté completa
      const configuracionCompleta = await this.configuracionService.esConfiguracionCompleta();
      if (!configuracionCompleta) {
        // Si no está configurado, redirigir a bienvenida
        await this.router.navigate(['/bienvenida']);
        return;
      }

      // Cargar datos del usuario
      await this.cargarDatosUsuario();

      // Configurar fecha y hora
      this.configurarFechaHora();

      // Verificar sesión activa
      await this.verificarSesionActiva();

      // Configurar suscripciones
      this.configurarSuscripciones();

      // Registrar actividad del usuario
      await this.usuarioService.registrarActividad();

    } catch (error) {
      console.error('Error al inicializar componente:', error);
      throw error;
    } finally {
      this.cargandoDatos = false;
    }
  }

  /**
   * Cargar datos del usuario actual
   */
  private async cargarDatosUsuario(): Promise<void> {
    this.usuario = await this.usuarioService.obtenerUsuarioActual();
    
    if (!this.usuario) {
      throw new Error('Usuario no encontrado');
    }

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
    this.sesionActiva = await this.comprasService.obtenerSesionActiva();
    this.mostrarTabContinuar = this.sesionActiva !== null;
  }

  /**
   * Configurar suscripciones a observables
   */
  private configurarSuscripciones(): void {
    // Suscribirse a cambios en sesión activa
    const sesionSub = this.comprasService.sesionActiva$.subscribe((sesion) => {
      this.sesionActiva = sesion;
      this.mostrarTabContinuar = sesion !== null;
    });
    this.subscriptions.add(sesionSub);

    // Suscribirse a eventos de burbuja de donación
    const burbujaSub = this.monetizacionService.mostrarBurbuja$.subscribe((evento) => {
      this.eventoBurbuja = evento;
      this.mostrarBurbujaDonacion = evento.mostrar;
    });
    this.subscriptions.add(burbujaSub);
  }

  /**
   * Manejar cambio de tab
   * @param tabSeleccionado Tab que se seleccionó
   */
  onCambioTab(tabSeleccionado: string): void {
    // Notificar al servicio de monetización sobre cambio de tab
    this.monetizacionService.activarBurbujaPorCambioTab();

    // Registrar actividad del usuario
    this.usuarioService.registrarActividad();
  }

  /**
   * Navegar a sesión de compra activa
   */
  async irACompraActiva(): Promise<void> {
    if (this.sesionActiva) {
      await this.router.navigate(['/compra-activa']);
    }
  }

  /**
   * Cerrar burbuja de donación
   */
  cerrarBurbujaDonacion(): void {
    this.monetizacionService.cerrarBurbuja();
  }

  /**
   * Abrir modal de donación
   */
  abrirModalDonacion(): void {
    // TODO: Implementar modal de donación
    console.log('Abrir modal de donación');
  }

  /**
   * Incrementar contador de anuncios visualizados
   */
  onAnuncioVisualizado(): void {
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