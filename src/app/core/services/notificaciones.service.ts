/**
 * Servicio de Notificaciones y Alertas - CORREGIDO
 * 
 * Maneja todas las notificaciones de la aplicación incluyendo alertas
 * de presupuesto, recordatorios, avisos de productos duplicados y
 * notificaciones del sistema. Funciona completamente offline.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, timer, of } from 'rxjs';
import { takeUntil, map, filter } from 'rxjs/operators';

import { Configuracion } from '../models/configuracion.model';
import { SesionCompra } from '../models/sesion-compra.model';
import { Producto } from '../models/producto.model';
import { AlmacenamientoService } from './almacenamiento.service';

/**
 * Tipos de notificación disponibles
 */
export enum TipoNotificacion {
  PRESUPUESTO_EXCEDIDO = 'presupuesto_excedido',
  PRESUPUESTO_ADVERTENCIA = 'presupuesto_advertencia',
  PRODUCTO_DUPLICADO = 'producto_duplicado',
  PRECIO_ALTO = 'precio_alto',
  SESION_LARGA = 'sesion_larga',
  RECORDATORIO_RESPALDO = 'recordatorio_respaldo',
  ACTUALIZACION_DISPONIBLE = 'actualizacion_disponible',
  ERROR_SISTEMA = 'error_sistema',
  INFO_GENERAL = 'info_general',
  EXITO_OPERACION = 'exito_operacion'
}

/**
 * Niveles de prioridad para notificaciones
 */
export enum PrioridadNotificacion {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica'
}

/**
 * Interfaz para notificación
 */
export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  prioridad: PrioridadNotificacion;
  titulo: string;
  mensaje: string;
  timestamp: Date;
  leida: boolean;
  descartada: boolean;
  datos?: any;
  acciones?: AccionNotificacion[];
  tiempoVida?: number;
  persistente: boolean;
  sonido: boolean;
  vibracion: boolean;
}

/**
 * Interfaz para acciones de notificación
 */
export interface AccionNotificacion {
  id: string;
  etiqueta: string;
  icono?: string;
  accion: () => void;
  destructiva?: boolean;
}

/**
 * Interfaz para configuración de recordatorio
 */
export interface ConfiguracionRecordatorio {
  id: string;
  nombre: string;
  tipo: TipoNotificacion;
  intervaloHoras: number;
  activo: boolean;
  ultimaEjecucion?: Date;
  condiciones?: any;
}

/**
 * Interfaz para estadísticas de notificaciones
 */
export interface EstadisticasNotificaciones {
  totalEnviadas: number;
  totalLeidas: number;
  totalDescartadas: number;
  porTipo: Record<TipoNotificacion, number>;
  porPrioridad: Record<PrioridadNotificacion, number>;
  promedioTiempoRespuesta: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {

  // Subjects para notificaciones en tiempo real
  private readonly notificacionesSubject = new BehaviorSubject<Notificacion[]>([]);
  private readonly nuevaNotificacionSubject = new Subject<Notificacion>();
  private readonly notificacionAccionSubject = new Subject<{notificacionId: string, accionId: string}>();

  // Observables públicos
  public readonly notificaciones$: Observable<Notificacion[]> = this.notificacionesSubject.asObservable();
  public readonly nuevaNotificacion$: Observable<Notificacion> = this.nuevaNotificacionSubject.asObservable();
  public readonly notificacionAccion$: Observable<{notificacionId: string, accionId: string}> = 
    this.notificacionAccionSubject.asObservable();

  // Estado interno
  private notificacionesActivas: Notificacion[] = [];
  private recordatorios: ConfiguracionRecordatorio[] = [];
  private configuracion: Configuracion | null = null;
  private estadisticas!: EstadisticasNotificaciones;
  private destroy$ = new Subject<void>();
  private contadorId = 1;

  // Configuraciones por defecto
  private readonly MAX_NOTIFICACIONES_ACTIVAS = 50;
  private readonly TIEMPO_VIDA_DEFECTO = 30000; // 30 segundos
  private readonly DURACION_VIBRACION = [200, 100, 200]; // Patrón de vibración

  constructor(private almacenamientoService: AlmacenamientoService) {
    this.inicializarServicio();
    this.inicializarEstadisticas();
  }

  /**
   * Inicializa el servicio de notificaciones
   * @private
   */
  private inicializarServicio(): void {
    console.log('🔔 Inicializando servicio de notificaciones...');

    // Suscribirse a cambios de configuración
    this.almacenamientoService.configuracion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(configuracion => {
        this.configuracion = configuracion;
        this.actualizarRecordatorios();
      });

    // Configurar recordatorios por defecto
    this.configurarRecordatoriosPorDefecto();

    // Iniciar verificación periódica de recordatorios
    this.iniciarVerificacionRecordatorios();

    console.log('✅ Servicio de notificaciones inicializado');
  }

  /**
   * Inicializa estadísticas de notificaciones
   * @private
   */
  private inicializarEstadisticas(): void {
    this.estadisticas = {
      totalEnviadas: 0,
      totalLeidas: 0,
      totalDescartadas: 0,
      porTipo: {} as Record<TipoNotificacion, number>,
      porPrioridad: {} as Record<PrioridadNotificacion, number>,
      promedioTiempoRespuesta: 0
    };

    // Inicializar contadores por tipo
    Object.values(TipoNotificacion).forEach(tipo => {
      this.estadisticas.porTipo[tipo] = 0;
    });

    // Inicializar contadores por prioridad
    Object.values(PrioridadNotificacion).forEach(prioridad => {
      this.estadisticas.porPrioridad[prioridad] = 0;
    });
  }

  // ==================== MÉTODOS PRINCIPALES ====================

  /**
   * Envía una notificación
   * @param tipo Tipo de notificación
   * @param titulo Título de la notificación
   * @param mensaje Mensaje de la notificación
   * @param opciones Opciones adicionales
   * @returns string ID de la notificación creada
   */
  public enviarNotificacion(
    tipo: TipoNotificacion,
    titulo: string,
    mensaje: string,
    opciones?: {
      prioridad?: PrioridadNotificacion;
      datos?: any;
      acciones?: AccionNotificacion[];
      tiempoVida?: number;
      persistente?: boolean;
      sonido?: boolean;
      vibracion?: boolean;
    }
  ): string {
    try {
      // Verificar si las notificaciones están habilitadas
      if (!this.notificacionesHabilitadas()) {
        console.log('Notificaciones deshabilitadas - omitiendo:', titulo);
        return '';
      }

      // Crear notificación
      const notificacion: Notificacion = {
        id: this.generarIdNotificacion(),
        tipo,
        prioridad: opciones?.prioridad || this.determinarPrioridadPorTipo(tipo),
        titulo: this.sanitizarTexto(titulo),
        mensaje: this.sanitizarTexto(mensaje),
        timestamp: new Date(),
        leida: false,
        descartada: false,
        datos: opciones?.datos,
        acciones: opciones?.acciones || [],
        tiempoVida: opciones?.tiempoVida || this.TIEMPO_VIDA_DEFECTO,
        persistente: opciones?.persistente ?? this.esTipoPersistente(tipo),
        sonido: opciones?.sonido ?? this.configuracion?.notificaciones.sonidoNotificacion ?? true,
        vibracion: opciones?.vibracion ?? this.configuracion?.notificaciones.vibracionNotificacion ?? true
      };

      // Agregar a lista de notificaciones activas
      this.agregarNotificacion(notificacion);

      // Ejecutar efectos de notificación
      this.ejecutarEfectosNotificacion(notificacion);

      // Actualizar estadísticas
      this.actualizarEstadisticas('enviada', notificacion);

      // Notificar a observadores
      this.nuevaNotificacionSubject.next(notificacion);

      console.log(`🔔 Notificación enviada: ${titulo}`);
      return notificacion.id;

    } catch (error) {
      console.error('Error enviando notificación:', error);
      return '';
    }
  }

  /**
   * Notifica exceso de presupuesto
   * @param porcentajeExceso Porcentaje excedido
   * @param presupuesto Presupuesto original
   * @param totalGastado Total gastado
   */
  public notificarExcesoPresupuesto(porcentajeExceso: number, presupuesto: number, totalGastado: number): void {
    // CORREGIDO: Usar método existente
    if (!this.estaHabilitadaNotificacion('presupuesto')) {
      return;
    }

    const titulo = '💸 Presupuesto Excedido';
    const mensaje = `Has excedido tu presupuesto en ${porcentajeExceso.toFixed(1)}%. ` +
                   `Presupuesto: $${presupuesto.toLocaleString()}, ` +
                   `Gastado: $${totalGastado.toLocaleString()}`;

    this.enviarNotificacion(TipoNotificacion.PRESUPUESTO_EXCEDIDO, titulo, mensaje, {
      prioridad: PrioridadNotificacion.ALTA,
      datos: { porcentajeExceso, presupuesto, totalGastado },
      persistente: true,
      acciones: [
        {
          id: 'revisar_compras',
          etiqueta: 'Revisar Compras',
          accion: () => this.accionRevisarCompras()
        },
        {
          id: 'ajustar_presupuesto',
          etiqueta: 'Ajustar Presupuesto',
          accion: () => this.accionAjustarPresupuesto()
        }
      ]
    });
  }

  /**
   * Notifica advertencia de presupuesto
   * @param porcentajeUsado Porcentaje usado del presupuesto
   * @param presupuestoRestante Presupuesto restante
   */
  public notificarAdvertenciaPresupuesto(porcentajeUsado: number, presupuestoRestante: number): void {
    // CORREGIDO: Usar método existente
    if (!this.estaHabilitadaNotificacion('presupuesto')) {
      return;
    }

    const titulo = '⚠️ Presupuesto en Límite';
    const mensaje = `Has usado ${porcentajeUsado.toFixed(1)}% de tu presupuesto. ` +
                   `Te quedan $${presupuestoRestante.toLocaleString()}`;

    this.enviarNotificacion(TipoNotificacion.PRESUPUESTO_ADVERTENCIA, titulo, mensaje, {
      prioridad: PrioridadNotificacion.MEDIA,
      datos: { porcentajeUsado, presupuestoRestante },
      tiempoVida: 15000,
      acciones: [
        {
          id: 'ver_resumen',
          etiqueta: 'Ver Resumen',
          accion: () => this.accionVerResumen()
        }
      ]
    });
  }

  /**
   * Notifica producto duplicado
   * @param nombreProducto Nombre del producto
   * @param cantidadExistente Cantidad ya en el carrito
   */
  public notificarProductoDuplicado(nombreProducto: string, cantidadExistente: number): void {
    // CORREGIDO: Usar método existente
    if (!this.estaHabilitadaNotificacion('productos')) {
      return;
    }

    const titulo = '🔄 Producto Duplicado';
    const mensaje = `Ya tienes "${nombreProducto}" en tu carrito (${cantidadExistente} unidades). ` +
                   `¿Deseas combinarlos?`;

    this.enviarNotificacion(TipoNotificacion.PRODUCTO_DUPLICADO, titulo, mensaje, {
      prioridad: PrioridadNotificacion.MEDIA,
      datos: { nombreProducto, cantidadExistente },
      tiempoVida: 20000,
      acciones: [
        {
          id: 'combinar_productos',
          etiqueta: 'Combinar',
          accion: () => this.accionCombinarProductos(nombreProducto)
        },
        {
          id: 'mantener_separado',
          etiqueta: 'Mantener Separado',
          accion: () => this.accionMantenerSeparado()
        }
      ]
    });
  }

  // ==================== MÉTODOS AUXILIARES CORREGIDOS ====================

  /**
   * NUEVO: Verifica si está habilitada una notificación específica
   * @param tipo Tipo de notificación
   * @returns boolean True si está habilitada
   */
  private estaHabilitadaNotificacion(tipo: 'presupuesto' | 'productos' | 'recordatorio' | 'resumen'): boolean {
    if (!this.configuracion?.notificaciones.habilitadas) {
      return false;
    }

    switch (tipo) {
      case 'presupuesto':
        return this.configuracion.notificaciones.notificarExcesoPresupuesto;
      case 'productos':
        return this.configuracion.notificaciones.productosCompra;
      case 'recordatorio':
        return this.configuracion.notificaciones.recordatoriosCompra;
      case 'resumen':
        return this.configuracion.notificaciones.resumenSemanal;
      default:
        return false;
    }
  }

  /**
   * Verifica si las notificaciones están habilitadas
   * @private
   */
  private notificacionesHabilitadas(): boolean {
    return this.configuracion?.notificaciones.habilitadas ?? true;
  }

  /**
   * Sanitiza texto de notificación
   * @private
   */
  private sanitizarTexto(texto: string): string {
    if (!texto) return '';
    
    // Remover caracteres peligrosos y limitar longitud
    return texto.replace(/[<>]/g, '').substring(0, 200);
  }

  /**
   * Genera ID único para notificación
   * @private
   */
  private generarIdNotificacion(): string {
    const timestamp = Date.now().toString(36);
    const contador = (this.contadorId++).toString(36);
    return `notif_${timestamp}_${contador}`;
  }

  /**
   * Determina prioridad automática según tipo
   * @private
   */
  private determinarPrioridadPorTipo(tipo: TipoNotificacion): PrioridadNotificacion {
    switch (tipo) {
      case TipoNotificacion.ERROR_SISTEMA:
        return PrioridadNotificacion.CRITICA;
      case TipoNotificacion.PRESUPUESTO_EXCEDIDO:
        return PrioridadNotificacion.ALTA;
      case TipoNotificacion.PRESUPUESTO_ADVERTENCIA:
      case TipoNotificacion.PRODUCTO_DUPLICADO:
        return PrioridadNotificacion.MEDIA;
      default:
        return PrioridadNotificacion.BAJA;
    }
  }

  /**
   * Determina si un tipo de notificación es persistente por defecto
   * @private
   */
  private esTipoPersistente(tipo: TipoNotificacion): boolean {
    const tiposPersistentes = [
      TipoNotificacion.ERROR_SISTEMA,
      TipoNotificacion.PRESUPUESTO_EXCEDIDO,
      TipoNotificacion.RECORDATORIO_RESPALDO
    ];
    
    return tiposPersistentes.includes(tipo);
  }

  /**
   * Agrega una notificación a la lista activa
   * @private
   */
  private agregarNotificacion(notificacion: Notificacion): void {
    // Agregar al inicio de la lista
    this.notificacionesActivas.unshift(notificacion);

    // Mantener límite máximo
    if (this.notificacionesActivas.length > this.MAX_NOTIFICACIONES_ACTIVAS) {
      this.notificacionesActivas = this.notificacionesActivas.slice(0, this.MAX_NOTIFICACIONES_ACTIVAS);
    }

    // Configurar auto-descarte si tiene tiempo de vida
    if (notificacion.tiempoVida && notificacion.tiempoVida > 0) {
      setTimeout(() => {
        this.autoDescartarNotificacion(notificacion.id);
      }, notificacion.tiempoVida);
    }

    this.notificarCambios();
  }

  /**
   * Auto-descarta una notificación por tiempo de vida
   * @private
   */
  private autoDescartarNotificacion(notificacionId: string): void {
    const notificacion = this.notificacionesActivas.find(n => n.id === notificacionId);
    
    if (notificacion && !notificacion.leida && !notificacion.descartada) {
      this.descartarNotificacion(notificacionId);
      console.log(`⏰ Notificación auto-descartada: ${notificacionId}`);
    }
  }

  /**
   * Ejecuta efectos de notificación (sonido, vibración)
   * @private
   */
  private ejecutarEfectosNotificacion(notificacion: Notificacion): void {
    try {
      // Ejecutar vibración si está habilitada
      if (notificacion.vibracion && 'vibrate' in navigator) {
        navigator.vibrate(this.DURACION_VIBRACION);
      }

      // Ejecutar sonido si está habilitado
      if (notificacion.sonido) {
        this.reproducirSonidoNotificacion(notificacion.prioridad);
      }
    } catch (error) {
      console.error('Error ejecutando efectos de notificación:', error);
    }
  }

  /**
   * Reproduce sonido de notificación
   * @private
   */
  private reproducirSonidoNotificacion(prioridad: PrioridadNotificacion): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar frecuencia según prioridad
      switch (prioridad) {
        case PrioridadNotificacion.CRITICA:
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          break;
        case PrioridadNotificacion.ALTA:
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          break;
        case PrioridadNotificacion.MEDIA:
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          break;
        default:
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      }

      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error reproduciendo sonido de notificación:', error);
    }
  }

  /**
   * Actualiza estadísticas de notificaciones
   * @private
   */
  private actualizarEstadisticas(accion: 'enviada' | 'leida' | 'descartada', notificacion: Notificacion): void {
    switch (accion) {
      case 'enviada':
        this.estadisticas.totalEnviadas++;
        this.estadisticas.porTipo[notificacion.tipo]++;
        this.estadisticas.porPrioridad[notificacion.prioridad]++;
        break;
      case 'leida':
        this.estadisticas.totalLeidas++;
        break;
      case 'descartada':
        this.estadisticas.totalDescartadas++;
        break;
    }
  }

  /**
   * Notifica cambios a observadores
   * @private
   */
  private notificarCambios(): void {
    this.notificacionesSubject.next([...this.notificacionesActivas]);
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Marca una notificación como leída
   * @param notificacionId ID de la notificación
   * @returns boolean True si se marcó exitosamente
   */
  public marcarComoLeida(notificacionId: string): boolean {
    try {
      const notificacion = this.notificacionesActivas.find(n => n.id === notificacionId);
      
      if (notificacion && !notificacion.leida) {
        notificacion.leida = true;
        this.actualizarEstadisticas('leida', notificacion);
        this.notificarCambios();
        
        console.log(`📖 Notificación marcada como leída: ${notificacionId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      return false;
    }
  }

  /**
   * Descarta una notificación
   * @param notificacionId ID de la notificación
   * @returns boolean True si se descartó exitosamente
   */
  public descartarNotificacion(notificacionId: string): boolean {
    try {
      const indice = this.notificacionesActivas.findIndex(n => n.id === notificacionId);
      
      if (indice >= 0) {
        const notificacion = this.notificacionesActivas[indice];
        notificacion.descartada = true;
        
        this.actualizarEstadisticas('descartada', notificacion);
        
        // Remover de la lista activa
        this.notificacionesActivas.splice(indice, 1);
        this.notificarCambios();
        
        console.log(`🗑️ Notificación descartada: ${notificacionId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error descartando notificación:', error);
      return false;
    }
  }

  // ==================== RECORDATORIOS ====================

  /**
   * Configura recordatorios por defecto
   * @private
   */
  private configurarRecordatoriosPorDefecto(): void {
    this.recordatorios = [
      {
        id: 'respaldo_semanal',
        nombre: 'Respaldo Semanal',
        tipo: TipoNotificacion.RECORDATORIO_RESPALDO,
        intervaloHoras: 24 * 7,
        activo: true
      }
    ];
  }

  /**
   * Inicia verificación periódica de recordatorios
   * @private
   */
  private iniciarVerificacionRecordatorios(): void {
    timer(0, 60 * 60 * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.verificarRecordatorios();
      });
  }

  /**
   * Verifica y ejecuta recordatorios pendientes
   * @private
   */
  private verificarRecordatorios(): void {
    const ahora = new Date();

    for (const recordatorio of this.recordatorios) {
      if (!recordatorio.activo) {
        continue;
      }

      const ultimaEjecucion = recordatorio.ultimaEjecucion || new Date(0);
      const tiempoTranscurrido = ahora.getTime() - ultimaEjecucion.getTime();
      const intervaloMs = recordatorio.intervaloHoras * 60 * 60 * 1000;

      if (tiempoTranscurrido >= intervaloMs) {
        this.ejecutarRecordatorio(recordatorio);
        recordatorio.ultimaEjecucion = ahora;
      }
    }
  }

  /**
   * Ejecuta un recordatorio específico
   * @private
   */
  private ejecutarRecordatorio(recordatorio: ConfiguracionRecordatorio): void {
    switch (recordatorio.tipo) {
      case TipoNotificacion.RECORDATORIO_RESPALDO:
        this.enviarRecordatorioRespaldo();
        break;
      default:
        console.log(`Tipo de recordatorio no implementado: ${recordatorio.tipo}`);
    }
  }

  /**
   * Envía recordatorio de respaldo
   * @private
   */
  private enviarRecordatorioRespaldo(): void {
    if (!this.estaHabilitadaNotificacion('recordatorio')) {
      return;
    }

    const titulo = '💾 Recordatorio de Respaldo';
    const mensaje = 'Es recomendable crear un respaldo de tus datos periódicamente.';

    this.enviarNotificacion(TipoNotificacion.RECORDATORIO_RESPALDO, titulo, mensaje, {
      prioridad: PrioridadNotificacion.BAJA,
      persistente: true,
      acciones: [
        {
          id: 'crear_respaldo',
          etiqueta: 'Crear Respaldo',
          accion: () => this.accionCrearRespaldo()
        },
        {
          id: 'recordar_despues',
          etiqueta: 'Más Tarde',
          accion: () => this.accionRecordarDespues()
        }
      ]
    });
  }

  /**
   * Actualiza configuración de recordatorios
   * @private
   */
  private actualizarRecordatorios(): void {
    if (this.configuracion) {
      const respaldoHabilitado = this.configuracion.seguridad.respaldoAutomatico;
      const recordatorioRespaldo = this.recordatorios.find(r => r.id === 'respaldo_semanal');
      
      if (recordatorioRespaldo) {
        recordatorioRespaldo.activo = respaldoHabilitado;
      }
    }
  }

  // ==================== ACCIONES DE NOTIFICACIONES ====================

  /**
   * Acción: Revisar compras
   * @private
   */
  private accionRevisarCompras(): void {
    console.log('🔍 Acción: Revisar compras');
  }

  /**
   * Acción: Ajustar presupuesto
   * @private
   */
  private accionAjustarPresupuesto(): void {
    console.log('💰 Acción: Ajustar presupuesto');
  }

  /**
   * Acción: Ver resumen
   * @private
   */
  private accionVerResumen(): void {
    console.log('📊 Acción: Ver resumen');
  }

  /**
   * Acción: Combinar productos
   * @private
   */
  private accionCombinarProductos(nombreProducto: string): void {
    console.log('🔄 Acción: Combinar productos:', nombreProducto);
  }

  /**
   * Acción: Mantener productos separados
   * @private
   */
  private accionMantenerSeparado(): void {
    console.log('📋 Acción: Mantener productos separados');
  }

  /**
   * Acción: Crear respaldo
   * @private
   */
  private accionCrearRespaldo(): void {
    console.log('💾 Acción: Crear respaldo');
  }

  /**
   * Acción: Recordar después
   * @private
   */
  private accionRecordarDespues(): void {
    console.log('⏰ Acción: Recordar después');
    const recordatorio = this.recordatorios.find(r => r.id === 'respaldo_semanal');
    if (recordatorio) {
      recordatorio.ultimaEjecucion = new Date(Date.now() - (recordatorio.intervaloHoras * 60 * 60 * 1000) + (4 * 60 * 60 * 1000));
    }
  }

/**
   * Destruye el servicio y limpia recursos
   */
  public destruir(): void {
    try {
      this.destroy$.next();
      this.destroy$.complete();

      // Limpiar notificaciones
      this.notificacionesActivas = [];
      this.recordatorios = [];

      // Cerrar subjects
      this.notificacionesSubject.complete();
      this.nuevaNotificacionSubject.complete();
      this.notificacionAccionSubject.complete();

      console.log('🧹 Servicio de notificaciones destruido');
    } catch (error) {
      console.error('Error destruyendo servicio de notificaciones:', error);
    }
  }

  // ==================== MÉTODOS PÚBLICOS ADICIONALES ====================

  /**
   * Obtiene estadísticas de notificaciones
   * @returns Observable<EstadisticasNotificaciones> Estadísticas actuales
   */
  public obtenerEstadisticas(): Observable<EstadisticasNotificaciones> {
    return of({ ...this.estadisticas });
  }

  /**
   * Configura un nuevo recordatorio
   * @param configuracion Configuración del recordatorio
   * @returns string ID del recordatorio creado
   */
  public configurarRecordatorio(configuracion: Omit<ConfiguracionRecordatorio, 'id'>): string {
    const nuevoRecordatorio: ConfiguracionRecordatorio = {
      ...configuracion,
      id: this.generarIdNotificacion()
    };

    this.recordatorios.push(nuevoRecordatorio);
    console.log('⏰ Recordatorio configurado:', nuevoRecordatorio.nombre);
    
    return nuevoRecordatorio.id;
  }

  /**
   * Elimina un recordatorio
   * @param recordatorioId ID del recordatorio
   * @returns boolean True si se eliminó exitosamente
   */
  public eliminarRecordatorio(recordatorioId: string): boolean {
    const indice = this.recordatorios.findIndex(r => r.id === recordatorioId);
    
    if (indice >= 0) {
      const recordatorio = this.recordatorios.splice(indice, 1)[0];
      console.log('🗑️ Recordatorio eliminado:', recordatorio.nombre);
      return true;
    }
    
    return false;
  }

  /**
   * Obtiene lista de recordatorios configurados
   * @returns ConfiguracionRecordatorio[] Lista de recordatorios
   */
  public obtenerRecordatorios(): ConfiguracionRecordatorio[] {
    return [...this.recordatorios];
  }

  /**
   * Activa o desactiva un recordatorio
   * @param recordatorioId ID del recordatorio
   * @param activo Estado activo
   * @returns boolean True si se cambió exitosamente
   */
  public cambiarEstadoRecordatorio(recordatorioId: string, activo: boolean): boolean {
    const recordatorio = this.recordatorios.find(r => r.id === recordatorioId);
    
    if (recordatorio) {
      recordatorio.activo = activo;
      console.log(`${activo ? '✅' : '❌'} Recordatorio ${activo ? 'activado' : 'desactivado'}:`, recordatorio.nombre);
      return true;
    }
    
    return false;
  }

  /**
   * Obtiene todas las notificaciones activas con filtros opcionales
   * @param filtros Filtros opcionales
   * @returns Observable<Notificacion[]> Lista de notificaciones filtradas
   */
  public obtenerNotificaciones(filtros?: {
    tipo?: TipoNotificacion;
    prioridad?: PrioridadNotificacion;
    leidas?: boolean;
    limite?: number;
  }): Observable<Notificacion[]> {
    return this.notificaciones$.pipe(
      map(notificaciones => {
        let resultado = [...notificaciones];

        // Aplicar filtros
        if (filtros?.tipo) {
          resultado = resultado.filter(n => n.tipo === filtros.tipo);
        }

        if (filtros?.prioridad) {
          resultado = resultado.filter(n => n.prioridad === filtros.prioridad);
        }

        if (filtros?.leidas !== undefined) {
          resultado = resultado.filter(n => n.leida === filtros.leidas);
        }

        // Ordenar por timestamp descendente (más recientes primero)
        resultado.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Aplicar límite
        if (filtros?.limite) {
          resultado = resultado.slice(0, filtros.limite);
        }

        return resultado;
      })
    );
  }

  /**
   * Obtiene conteo de notificaciones no leídas
   * @returns Observable<number> Número de notificaciones no leídas
   */
  public obtenerConteoNoLeidas(): Observable<number> {
    return this.notificaciones$.pipe(
      map(notificaciones => notificaciones.filter(n => !n.leida).length)
    );
  }

  /**
   * Limpia todas las notificaciones leídas
   * @returns number Número de notificaciones eliminadas
   */
  public limpiarNotificacionesLeidas(): number {
    try {
      const cantidadAnterior = this.notificacionesActivas.length;
      
      this.notificacionesActivas = this.notificacionesActivas.filter(n => !n.leida);
      
      const eliminadas = cantidadAnterior - this.notificacionesActivas.length;
      
      if (eliminadas > 0) {
        this.notificarCambios();
        console.log(`🧹 ${eliminadas} notificaciones leídas eliminadas`);
      }
      
      return eliminadas;
    } catch (error) {
      console.error('Error limpiando notificaciones leídas:', error);
      return 0;
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   * @returns number Número de notificaciones marcadas
   */
  public marcarTodasComoLeidas(): number {
    try {
      let marcadas = 0;
      
      this.notificacionesActivas.forEach(notificacion => {
        if (!notificacion.leida) {
          notificacion.leida = true;
          marcadas++;
          this.actualizarEstadisticas('leida', notificacion);
        }
      });
      
      if (marcadas > 0) {
        this.notificarCambios();
        console.log(`📖 ${marcadas} notificaciones marcadas como leídas`);
      }
      
      return marcadas;
    } catch (error) {
      console.error('Error marcando todas las notificaciones como leídas:', error);
      return 0;
    }
  }

  /**
   * Ejecuta una acción de notificación
   * @param notificacionId ID de la notificación
   * @param accionId ID de la acción
   */
  public ejecutarAccion(notificacionId: string, accionId: string): void {
    try {
      const notificacion = this.notificacionesActivas.find(n => n.id === notificacionId);
      
      if (notificacion) {
        const accion = notificacion.acciones?.find(a => a.id === accionId);
        
        if (accion) {
          // Ejecutar la acción
          accion.accion();
          
          // Marcar como leída automáticamente
          this.marcarComoLeida(notificacionId);
          
          // Notificar que se ejecutó una acción
          this.notificacionAccionSubject.next({ notificacionId, accionId });
          
          console.log(`⚡ Acción ejecutada: ${accionId} en notificación ${notificacionId}`);
        }
      }
    } catch (error) {
      console.error('Error ejecutando acción de notificación:', error);
    }
  }

  /**
   * Prueba una notificación para verificar configuración
   * @param tipo Tipo de notificación a probar
   */
  public probarNotificacion(tipo: TipoNotificacion): void {
    const mensajesPrueba: Record<TipoNotificacion, { titulo: string; mensaje: string }> = {
      [TipoNotificacion.PRESUPUESTO_EXCEDIDO]: {
        titulo: '💸 Prueba - Presupuesto Excedido',
        mensaje: 'Esta es una notificación de prueba para exceso de presupuesto.'
      },
      [TipoNotificacion.PRESUPUESTO_ADVERTENCIA]: {
        titulo: '⚠️ Prueba - Advertencia de Presupuesto',
        mensaje: 'Esta es una notificación de prueba para advertencia de presupuesto.'
      },
      [TipoNotificacion.PRODUCTO_DUPLICADO]: {
        titulo: '🔄 Prueba - Producto Duplicado',
        mensaje: 'Esta es una notificación de prueba para producto duplicado.'
      },
      [TipoNotificacion.PRECIO_ALTO]: {
        titulo: '💰 Prueba - Precio Alto',
        mensaje: 'Esta es una notificación de prueba para precio alto.'
      },
      [TipoNotificacion.SESION_LARGA]: {
        titulo: '⏰ Prueba - Sesión Larga',
        mensaje: 'Esta es una notificación de prueba para sesión larga.'
      },
      [TipoNotificacion.RECORDATORIO_RESPALDO]: {
        titulo: '💾 Prueba - Recordatorio Respaldo',
        mensaje: 'Esta es una notificación de prueba para recordatorio de respaldo.'
      },
      [TipoNotificacion.ACTUALIZACION_DISPONIBLE]: {
        titulo: '🔄 Prueba - Actualización Disponible',
        mensaje: 'Esta es una notificación de prueba para actualización disponible.'
      },
      [TipoNotificacion.ERROR_SISTEMA]: {
        titulo: '❌ Prueba - Error del Sistema',
        mensaje: 'Esta es una notificación de prueba para error del sistema.'
      },
      [TipoNotificacion.INFO_GENERAL]: {
        titulo: 'ℹ️ Prueba - Información General',
        mensaje: 'Esta es una notificación de prueba para información general.'
      },
      [TipoNotificacion.EXITO_OPERACION]: {
        titulo: '✅ Prueba - Operación Exitosa',
        mensaje: 'Esta es una notificación de prueba para operación exitosa.'
      }
    };

    const mensajePrueba = mensajesPrueba[tipo] || {
      titulo: '🔔 Prueba - Notificación',
      mensaje: 'Esta es una notificación de prueba.'
    };

    this.enviarNotificacion(tipo, mensajePrueba.titulo, mensajePrueba.mensaje, {
      datos: { esPrueba: true },
      tiempoVida: 10000 // 10 segundos
    });
  }

  /**
   * Notifica éxito de operación
   * @param mensaje Mensaje de éxito
   * @param datos Datos adicionales
   */
  public notificarExito(mensaje: string, datos?: any): void {
    this.enviarNotificacion(TipoNotificacion.EXITO_OPERACION, '✅ Operación Exitosa', mensaje, {
      prioridad: PrioridadNotificacion.BAJA,
      datos,
      tiempoVida: 5000, // 5 segundos
      persistente: false
    });
  }

  /**
   * Notifica error del sistema
   * @param mensaje Mensaje de error
   * @param error Objeto de error
   */
  public notificarError(mensaje: string, error?: any): void {
    this.enviarNotificacion(TipoNotificacion.ERROR_SISTEMA, '❌ Error', mensaje, {
      prioridad: PrioridadNotificacion.ALTA,
      datos: { error: error?.message || error },
      persistente: true,
      acciones: [
        {
          id: 'reintentar',
          etiqueta: 'Reintentar',
          accion: () => this.accionReintentar()
        }
      ]
    });
  }

  /**
   * Notifica precio alto inusual
   * @param nombreProducto Nombre del producto
   * @param precio Precio del producto
   * @param precioPromedio Precio promedio histórico
   */
  public notificarPrecioAlto(nombreProducto: string, precio: number, precioPromedio?: number): void {
    const titulo = '💰 Precio Alto Detectado';
    let mensaje = `"${nombreProducto}" tiene un precio de $${precio.toLocaleString()}`;
    
    if (precioPromedio) {
      const diferencia = ((precio - precioPromedio) / precioPromedio * 100);
      mensaje += ` (${diferencia.toFixed(1)}% más alto que el promedio)`;
    }

    this.enviarNotificacion(TipoNotificacion.PRECIO_ALTO, titulo, mensaje, {
      prioridad: PrioridadNotificacion.BAJA,
      datos: { nombreProducto, precio, precioPromedio },
      tiempoVida: 10000, // 10 segundos
      acciones: [
        {
          id: 'verificar_precio',
          etiqueta: 'Verificar',
          accion: () => this.accionVerificarPrecio(nombreProducto)
        }
      ]
    });
  }

  /**
   * Notifica sesión de compra larga
   * @param tiempoTranscurrido Tiempo transcurrido en minutos
   */
  public notificarSesionLarga(tiempoTranscurrido: number): void {
    const titulo = '⏰ Sesión de Compra Larga';
    const mensaje = `Llevas ${tiempoTranscurrido} minutos comprando. ¿Todo bien?`;

    this.enviarNotificacion(TipoNotificacion.SESION_LARGA, titulo, mensaje, {
      prioridad: PrioridadNotificacion.BAJA,
      datos: { tiempoTranscurrido },
      acciones: [
        {
          id: 'pausar_sesion',
          etiqueta: 'Pausar',
          accion: () => this.accionPausarSesion()
        },
        {
          id: 'finalizar_compra',
          etiqueta: 'Finalizar',
          accion: () => this.accionFinalizarCompra()
        }
      ]
    });
  }

  // ==================== ACCIONES ADICIONALES ====================

  /**
   * Acción: Reintentar operación
   * @private
   */
  private accionReintentar(): void {
    console.log('🔄 Acción: Reintentar operación');
  }

  /**
   * Acción: Verificar precio
   * @private
   */
  private accionVerificarPrecio(nombreProducto: string): void {
    console.log('💵 Acción: Verificar precio de:', nombreProducto);
  }

  /**
   * Acción: Pausar sesión
   * @private
   */
  private accionPausarSesion(): void {
    console.log('⏸️ Acción: Pausar sesión');
  }

  /**
   * Acción: Finalizar compra
   * @private
   */
  private accionFinalizarCompra(): void {
    console.log('🏁 Acción: Finalizar compra');
  }

  /**
   * Obtiene configuración actual de notificaciones
   * @returns object Configuración de notificaciones
   */
  public obtenerConfiguracionNotificaciones(): any {
    return {
      habilitadas: this.configuracion?.notificaciones.habilitadas ?? true,
      sonido: this.configuracion?.notificaciones.sonidoNotificacion ?? true,
      vibracion: this.configuracion?.notificaciones.vibracionNotificacion ?? true,
      presupuesto: this.estaHabilitadaNotificacion('presupuesto'),
      productos: this.estaHabilitadaNotificacion('productos'),
      recordatorios: this.estaHabilitadaNotificacion('recordatorio'),
      resumen: this.estaHabilitadaNotificacion('resumen')
    };
  }

  /**
   * Limpia todas las notificaciones (excepto las críticas)
   * @returns number Número de notificaciones eliminadas
   */
  public limpiarTodasLasNotificaciones(): number {
    const cantidadAnterior = this.notificacionesActivas.length;
    
    // Mantener solo notificaciones críticas no leídas
    this.notificacionesActivas = this.notificacionesActivas.filter(n => 
      n.prioridad === PrioridadNotificacion.CRITICA && !n.leida
    );

    const eliminadas = cantidadAnterior - this.notificacionesActivas.length;
    
    if (eliminadas > 0) {
      this.notificarCambios();
      console.log(`🧹 ${eliminadas} notificaciones eliminadas`);
    }
    
    return eliminadas;
  }

  /**
   * Obtiene información de debug del servicio
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    return {
      notificacionesActivas: this.notificacionesActivas.length,
      recordatoriosConfigurados: this.recordatorios.length,
      estadisticas: this.estadisticas,
      configuracion: this.obtenerConfiguracionNotificaciones(),
      maxNotificaciones: this.MAX_NOTIFICACIONES_ACTIVAS,
      tiempoVidaDefecto: this.TIEMPO_VIDA_DEFECTO,
      timestamp: new Date().toISOString()
    };
  }
}