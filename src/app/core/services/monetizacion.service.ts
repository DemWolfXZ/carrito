/**
 * Servicio para gestionar la monetización de la aplicación Carrito
 * Maneja publicidad, sistema de donaciones y configuraciones relacionadas
 * Incluye control de tiempo, sistema de donaciones y estadísticas
 *
 * @author DemWolf
 * @version 1.0
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';

// Importar servicios necesarios
import { UsuarioService } from './usuario.service';
import { AlmacenamientoService } from './almacenamiento.service';

// Interface para configuración de monetización
export interface ConfiguracionMonetizacion {
  publicidadHabilitada: boolean;        // Si se muestran anuncios
  posicionBanner: 'arriba' | 'abajo';   // Posición del banner
  intervaloRotacionAds: number;         // Segundos entre rotación de ads
  donacionesHabilitadas: boolean;       // Si se permite donar
  intervaloBurbuja: number;             // Minutos entre apariciones de burbuja
  montosSugeridos: number[];            // Montos sugeridos según país
  ultimaAparicionBurbuja: Date | null;  // Última vez que apareció la burbuja
  donacionesRealizadas: number;         // Contador de donaciones hechas
  totalDonado: number;                  // Total donado en moneda local
}

// Interface para datos de donación
export interface DatosDonacion {
  monto: number;                        // Monto a donar
  moneda: string;                       // Código de moneda
  fechaDonacion: Date;                  // Cuándo se realizó
  metodoPago: string;                   // Método usado para donar
  transaccionId?: string;               // ID de transacción (si aplica)
}

// Interface para estadísticas de monetización
export interface EstadisticasMonetizacion {
  totalDonaciones: number;              // Número total de donaciones
  totalMontoDonado: number;             // Suma total donada
  promedioDonaicon: number;             // Promedio por donación
  ultimaDonacion: Date | null;          // Fecha última donación
  vecesAparecioBurbuja: number;         // Cuántas veces apareció la burbuja
  tasaConversion: number;               // % de apariciones que terminan en donación
  anunciosVisualizados: number;         // Contador de ads mostrados
}

// Interface para evento de burbuja
export interface EventoBurbuja {
  mostrar: boolean;                     // Si debe mostrarse la burbuja
  razon: 'tiempo' | 'cambio_tab' | 'compra_finalizada'; // Por qué apareció
  tiempoEspera: number;                 // Minutos hasta próxima aparición
}

@Injectable({
  providedIn: 'root'
})
export class MonetizacionService {

  // BehaviorSubjects para estado reactivo
  private configuracionSubject = new BehaviorSubject<ConfiguracionMonetizacion | null>(null);
  private mostrarBurbujaSubject = new BehaviorSubject<EventoBurbuja>({ mostrar: false, razon: 'tiempo', tiempoEspera: 15 });
  private estadisticasSubject = new BehaviorSubject<EstadisticasMonetizacion | null>(null);

  // Observables públicos
  public configuracion$ = this.configuracionSubject.asObservable();
  public mostrarBurbuja$ = this.mostrarBurbujaSubject.asObservable();
  public estadisticas$ = this.estadisticasSubject.asObservable();

  // Estado interno
  private configuracion: ConfiguracionMonetizacion | null = null;
  private estadisticas: EstadisticasMonetizacion | null = null;
  private timerBurbuja: Subscription | null = null;
  private inicializado: boolean = false;

  // Constantes
  private readonly CLAVE_CONFIGURACION = 'carrito_monetizacion_config';
  private readonly CLAVE_ESTADISTICAS = 'carrito_monetizacion_stats';
  private readonly INTERVALO_DEFECTO = 15; // 15 minutos

  // Montos sugeridos por país (en moneda local)
  private readonly MONTOS_POR_PAIS: { [key: string]: number[] } = {
    'CL': [1000, 2000, 5000],           // Chile - Pesos chilenos
    'AR': [500, 1000, 2000],            // Argentina - Pesos argentinos
    'MX': [20, 50, 100],                // México - Pesos mexicanos
    'CO': [2000, 5000, 10000],          // Colombia - Pesos colombianos
    'PE': [5, 10, 20],                  // Perú - Soles
    'US': [1, 3, 5],                    // Estados Unidos - Dólares
    'ES': [1, 2, 5],                    // España - Euros
    'BO': [5, 10, 20],                  // Bolivia - Bolivianos
    'CR': [500, 1000, 2000],            // Costa Rica - Colones
    'CU': [25, 50, 100],                // Cuba - Pesos cubanos
    'EC': [1, 3, 5],                    // Ecuador - Dólares
    'SV': [1, 3, 5],                    // El Salvador - Dólares
    'GT': [5, 10, 20],                  // Guatemala - Quetzales
    'HN': [25, 50, 100],                // Honduras - Lempiras
    'NI': [30, 60, 120],                // Nicaragua - Córdobas
    'PA': [1, 3, 5],                    // Panamá - Balboas
    'PY': [5000, 10000, 20000],         // Paraguay - Guaraníes
    'DO': [50, 100, 200],               // República Dominicana - Pesos dominicanos
    'UY': [50, 100, 200],               // Uruguay - Pesos uruguayos
    'VE': [10, 20, 50]                  // Venezuela - Bolívares soberanos
  };

  constructor(
    private usuarioService: UsuarioService,
    private almacenamientoService: AlmacenamientoService
  ) {
    // Inicializar el servicio
    this.inicializarServicio();
  }

  /**
   * Inicializar servicio cargando configuración y estadísticas
   */
  private async inicializarServicio(): Promise<void> {
    try {
      // Cargar configuración almacenada
      await this.cargarConfiguracion();

      // Cargar estadísticas almacenadas
      await this.cargarEstadisticas();

      // Configurar timer para burbuja de donación
      this.configurarTimerBurbuja();

      this.inicializado = true;

    } catch (error) {
      console.error('Error al inicializar servicio de monetización:', error);
    }
  }

  /**
   * Obtener configuración actual de monetización
   * @returns Promise<ConfiguracionMonetizacion | null>
   */
  async obtenerConfiguracion(): Promise<ConfiguracionMonetizacion | null> {
    await this.esperarInicializacion();
    return this.configuracion;
  }

  /**
   * Obtener estadísticas de monetización
   * @returns Promise<EstadisticasMonetizacion | null>
   */
  async obtenerEstadisticas(): Promise<EstadisticasMonetizacion | null> {
    await this.esperarInicializacion();
    return this.estadisticas;
  }

  /**
   * Activar burbuja de donación por cambio de tab
   */
  activarBurbujaPorCambioTab(): void {
    if (!this.configuracion?.donacionesHabilitadas) return;

    // Verificar si puede aparecer la burbuja
    if (this.puedeAparecerBurbuja()) {
      this.mostrarBurbuja('cambio_tab');
    }
  }

  /**
   * Activar burbuja de donación por compra finalizada
   */
  activarBurbujaPorCompraFinalizada(): void {
    if (!this.configuracion?.donacionesHabilitadas) return;

    // Siempre mostrar después de finalizar compra exitosa
    this.mostrarBurbuja('compra_finalizada');
  }

  /**
   * Cerrar burbuja de donación
   */
  cerrarBurbuja(): void {
    // Actualizar última aparición
    if (this.configuracion) {
      this.configuracion.ultimaAparicionBurbuja = new Date();
      this.guardarConfiguracion();
    }

    // Incrementar estadística de apariciones
    if (this.estadisticas) {
      this.estadisticas.vecesAparecioBurbuja += 1;
      this.estadisticas.tasaConversion = this.calcularTasaConversion();
      this.guardarEstadisticas();
    }

    // Ocultar burbuja
    const evento: EventoBurbuja = {
      mostrar: false,
      razon: 'tiempo',
      tiempoEspera: this.configuracion?.intervaloBurbuja || this.INTERVALO_DEFECTO
    };
    this.mostrarBurbujaSubject.next(evento);

    // Reiniciar timer
    this.configurarTimerBurbuja();
  }

  /**
   * Procesar donación realizada
   * @param datosDonacion Datos de la donación
   * @returns Promise<boolean> true si se procesó correctamente
   */
  async procesarDonacion(datosDonacion: DatosDonacion): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      if (!this.configuracion || !this.estadisticas) {
        console.error('Configuración o estadísticas no disponibles');
        return false;
      }

      // Actualizar configuración
      this.configuracion.donacionesRealizadas += 1;
      this.configuracion.totalDonado += datosDonacion.monto;
      this.configuracion.ultimaAparicionBurbuja = new Date();

      // Actualizar estadísticas
      this.estadisticas.totalDonaciones += 1;
      this.estadisticas.totalMontoDonado += datosDonacion.monto;
      this.estadisticas.promedioDonaicon = this.estadisticas.totalMontoDonado / this.estadisticas.totalDonaciones;
      this.estadisticas.ultimaDonacion = datosDonacion.fechaDonacion;
      this.estadisticas.tasaConversion = this.calcularTasaConversion();

      // Guardar cambios
      await this.guardarConfiguracion();
      await this.guardarEstadisticas();

      // Ocultar burbuja por 24 horas como agradecimiento
      this.ocultarBurbujaPorDonacion();

      return true;

    } catch (error) {
      console.error('Error al procesar donación:', error);
      return false;
    }
  }

  /**
   * Incrementar contador de anuncios visualizados
   */
  incrementarAnunciosVisualizados(): void {
    if (this.estadisticas) {
      this.estadisticas.anunciosVisualizados += 1;
      this.guardarEstadisticas();
    }
  }

  /**
   * Actualizar configuración de monetización
   * @param nuevaConfiguracion Configuración a actualizar
   * @returns Promise<boolean> true si se actualizó correctamente
   */
  async actualizarConfiguracion(nuevaConfiguracion: Partial<ConfiguracionMonetizacion>): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      if (!this.configuracion) {
        console.error('Configuración no disponible');
        return false;
      }

      // Actualizar configuración
      this.configuracion = {
        ...this.configuracion,
        ...nuevaConfiguracion
      };

      // Guardar cambios
      await this.guardarConfiguracion();

      // Reconfigurar timer si cambió el intervalo
      if (nuevaConfiguracion.intervaloBurbuja) {
        this.configurarTimerBurbuja();
      }

      return true;

    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      return false;
    }
  }

  /**
   * Obtener montos sugeridos para el país del usuario
   * @returns Promise<number[]> montos sugeridos
   */
  async obtenerMontosSugeridosPais(): Promise<number[]> {
    try {
      const usuario = await this.usuarioService.obtenerUsuarioActual();
      if (!usuario) {
        return [1, 3, 5]; // Valores por defecto en USD
      }

      return this.MONTOS_POR_PAIS[usuario.pais] || [1, 3, 5];

    } catch (error) {
      console.error('Error al obtener montos sugeridos:', error);
      return [1, 3, 5];
    }
  }

  // MÉTODOS PRIVADOS

  /**
   * Esperar a que el servicio esté inicializado
   */
  private async esperarInicializacion(): Promise<void> {
    return new Promise((resolve) => {
      if (this.inicializado) {
        resolve();
      } else {
        const checkInterval = setInterval(() => {
          if (this.inicializado) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      }
    });
  }

  /**
   * Cargar configuración desde almacenamiento usando localStorage directamente
   */
  private async cargarConfiguracion(): Promise<void> {
    try {
      const datosString = localStorage.getItem(this.CLAVE_CONFIGURACION);

      if (datosString) {
        const datos = JSON.parse(datosString);
        this.configuracion = {
          ...datos,
          ultimaAparicionBurbuja: datos.ultimaAparicionBurbuja ?
            new Date(datos.ultimaAparicionBurbuja) : null
        };
      } else {
        // Crear configuración por defecto
        this.configuracion = await this.crearConfiguracionDefecto();
        await this.guardarConfiguracion();
      }

      this.configuracionSubject.next(this.configuracion);

    } catch (error) {
      console.error('Error al cargar configuración de monetización:', error);
      this.configuracion = await this.crearConfiguracionDefecto();
      this.configuracionSubject.next(this.configuracion);
    }
  }

  /**
   * Crear configuración por defecto basada en el usuario
   */
  private async crearConfiguracionDefecto(): Promise<ConfiguracionMonetizacion> {
    const montosSugeridos = await this.obtenerMontosSugeridosPais();

    return {
      publicidadHabilitada: true,
      posicionBanner: 'abajo',
      intervaloRotacionAds: 60,
      donacionesHabilitadas: true,
      intervaloBurbuja: this.INTERVALO_DEFECTO,
      montosSugeridos,
      ultimaAparicionBurbuja: null,
      donacionesRealizadas: 0,
      totalDonado: 0
    };
  }

  /**
   * Guardar configuración en almacenamiento usando localStorage directamente
   */
  private async guardarConfiguracion(): Promise<void> {
    try {
      if (!this.configuracion) return;

      localStorage.setItem(this.CLAVE_CONFIGURACION, JSON.stringify(this.configuracion));
      this.configuracionSubject.next(this.configuracion);

    } catch (error) {
      console.error('Error al guardar configuración:', error);
    }
  }

  /**
   * Cargar estadísticas desde almacenamiento usando localStorage directamente
   */
  private async cargarEstadisticas(): Promise<void> {
    try {
      const datosString = localStorage.getItem(this.CLAVE_ESTADISTICAS);

      if (datosString) {
        const datos = JSON.parse(datosString);
        this.estadisticas = {
          ...datos,
          ultimaDonacion: datos.ultimaDonacion ?
            new Date(datos.ultimaDonacion) : null
        };
      } else {
        // Crear estadísticas por defecto
        this.estadisticas = this.crearEstadisticasDefecto();
        await this.guardarEstadisticas();
      }

      this.estadisticasSubject.next(this.estadisticas);

    } catch (error) {
      console.error('Error al cargar estadísticas de monetización:', error);
      this.estadisticas = this.crearEstadisticasDefecto();
      this.estadisticasSubject.next(this.estadisticas);
    }
  }

  /**
   * Crear estadísticas por defecto
   */
  private crearEstadisticasDefecto(): EstadisticasMonetizacion {
    return {
      totalDonaciones: 0,
      totalMontoDonado: 0,
      promedioDonaicon: 0,
      ultimaDonacion: null,
      vecesAparecioBurbuja: 0,
      tasaConversion: 0,
      anunciosVisualizados: 0
    };
  }

  /**
   * Guardar estadísticas en almacenamiento usando localStorage directamente
   */
  private async guardarEstadisticas(): Promise<void> {
    try {
      if (!this.estadisticas) return;

      localStorage.setItem(this.CLAVE_ESTADISTICAS, JSON.stringify(this.estadisticas));
      this.estadisticasSubject.next(this.estadisticas);

    } catch (error) {
      console.error('Error al guardar estadísticas:', error);
    }
  }

  /**
   * Configurar timer para mostrar burbuja automáticamente
   */
  private configurarTimerBurbuja(): void {
    // Limpiar timer anterior si existe
    if (this.timerBurbuja) {
      this.timerBurbuja.unsubscribe();
    }

    if (!this.configuracion?.donacionesHabilitadas) return;

    const intervaloBurbuja = this.configuracion.intervaloBurbuja * 60 * 1000; // Convertir a milisegundos

    // Configurar nuevo timer
    this.timerBurbuja = interval(intervaloBurbuja).subscribe(() => {
      if (this.puedeAparecerBurbuja()) {
        this.mostrarBurbuja('tiempo');
      }
    });
  }

  /**
   * Verificar si puede aparecer la burbuja
   */
  private puedeAparecerBurbuja(): boolean {
    if (!this.configuracion?.donacionesHabilitadas) return false;

    const ahora = new Date();
    const ultimaAparicion = this.configuracion.ultimaAparicionBurbuja;

    // Si nunca ha aparecido, puede aparecer
    if (!ultimaAparicion) return true;

    // Verificar si han pasado suficientes minutos
    const minutosTranscurridos = (ahora.getTime() - ultimaAparicion.getTime()) / (1000 * 60);
    return minutosTranscurridos >= this.configuracion.intervaloBurbuja;
  }

  /**
   * Mostrar burbuja de donación
   */
  private mostrarBurbuja(razon: 'tiempo' | 'cambio_tab' | 'compra_finalizada'): void {
    const evento: EventoBurbuja = {
      mostrar: true,
      razon,
      tiempoEspera: this.configuracion?.intervaloBurbuja || this.INTERVALO_DEFECTO
    };

    this.mostrarBurbujaSubject.next(evento);
  }

  /**
   * Ocultar burbuja por 24 horas después de donación
   */
  private ocultarBurbujaPorDonacion(): void {
    // Configurar para que no aparezca por 24 horas
    if (this.configuracion) {
      const ahora = new Date();
      const en24Horas = new Date(ahora.getTime() + (24 * 60 * 60 * 1000));
      this.configuracion.ultimaAparicionBurbuja = en24Horas;
    }

    // Ocultar burbuja actual
    const evento: EventoBurbuja = {
      mostrar: false,
      razon: 'tiempo',
      tiempoEspera: 24 * 60 // 24 horas en minutos
    };
    this.mostrarBurbujaSubject.next(evento);

    // Reconfigurar timer
    this.configurarTimerBurbuja();
  }

  /**
   * Calcular tasa de conversión (donaciones / apariciones)
   */
  private calcularTasaConversion(): number {
    if (!this.estadisticas || this.estadisticas.vecesAparecioBurbuja === 0) return 0;

    return Number(((this.estadisticas.totalDonaciones / this.estadisticas.vecesAparecioBurbuja) * 100).toFixed(2));
  }

  /**
   * Cleanup al destruir el servicio
   */
  ngOnDestroy(): void {
    if (this.timerBurbuja) {
      this.timerBurbuja.unsubscribe();
    }
  }
}
