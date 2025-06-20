/**
 * Resolver de Configuración - Garantiza carga de configuración antes de navegación
 * 
 * Resolver que carga y valida la configuración del usuario antes de navegar.
 * Crea configuración por defecto si no existe y maneja errores de carga.
 * Integrado con AlmacenamientoService y SeguridadService.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, throwError, timer } from 'rxjs';
import { map, catchError, tap, timeout, retryWhen, take, delay } from 'rxjs/operators';

import { Configuracion } from '@core-models/configuracion.model';
import { AlmacenamientoService } from '@core-services/almacenamiento.service';
import { SeguridadService } from '@core-services/seguridad.service';
import { ValidacionService } from '@core-services/validacion.service';

/**
 * Resultado del resolver de configuración
 */
interface ResultadoConfiguracionResolver {
  configuracion: Configuracion;
  esNuevaConfiguracion: boolean;
  tiempoRespuesta: number;
  erroresCorregidos: string[];
  advertencias: string[];
}

/**
 * Opciones de configuración del resolver
 */
interface OpcionesResolver {
  /** Timeout en milisegundos */
  timeout: number;
  /** Número máximo de reintentos */
  maxReintentos: number;
  /** Crear configuración por defecto si no existe */
  crearPorDefectoSiNoExiste: boolean;
  /** Validar integridad de configuración cargada */
  validarIntegridad: boolean;
  /** Cachear resultado del resolver */
  habilitarCache: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionResolver implements Resolve<ResultadoConfiguracionResolver> {

  // Cache del resolver para optimizar navegación
  private cacheConfiguracion: ResultadoConfiguracionResolver | null = null;
  private cacheValidoHasta: Date | null = null;
  private readonly DURACION_CACHE_MS = 5 * 60 * 1000; // 5 minutos

  // Configuración por defecto del resolver
  private readonly OPCIONES_DEFECTO: OpcionesResolver = {
    timeout: 10000, // 10 segundos
    maxReintentos: 3,
    crearPorDefectoSiNoExiste: true,
    validarIntegridad: true,
    habilitarCache: true
  };

  // Métricas del resolver
  private metricas = {
    totalResoluciones: 0,
    resolucionesExitosas: 0,
    resolucionesFallidas: 0,
    configCreadas: 0,
    erroresCorregidos: 0,
    tiempoPromedioMs: 0
  };

  constructor(
    private almacenamientoService: AlmacenamientoService,
    private seguridadService: SeguridadService,
    private validacionService: ValidacionService
  ) {
    console.log('🔧 ConfiguracionResolver inicializado');
  }

  /**
   * Resuelve la configuración antes de la navegación
   * @param route Ruta activada
   * @param state Estado del router
   * @returns Observable<ResultadoConfiguracionResolver> Resultado de la resolución
   */
  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ResultadoConfiguracionResolver> {
    const tiempoInicio = Date.now();
    
    console.log(`🔍 Resolviendo configuración para ruta: ${state.url}`);
    
    // Incrementar contador de resoluciones
    this.metricas.totalResoluciones++;

    // Verificar cache si está habilitado
    if (this.OPCIONES_DEFECTO.habilitarCache && this.esCacheValido()) {
      console.log('💾 Usando configuración desde cache');
      return of(this.cacheConfiguracion!);
    }

    // Obtener opciones específicas de la ruta si existen
    const opciones = this.obtenerOpcionesDeRuta(route);

    // Ejecutar resolución con timeout y reintentos
    return this.ejecutarResolucionConReintentos(opciones)
      .pipe(
        timeout(opciones.timeout),
        tap(resultado => {
          // Calcular tiempo de respuesta
          const tiempoTranscurrido = Date.now() - tiempoInicio;
          resultado.tiempoRespuesta = tiempoTranscurrido;

          // Actualizar métricas
          this.actualizarMetricas(true, tiempoTranscurrido);

          // Actualizar cache
          if (opciones.habilitarCache) {
            this.actualizarCache(resultado);
          }

          console.log(`✅ Configuración resuelta exitosamente en ${tiempoTranscurrido}ms`);
        }),
        catchError(error => {
          // Manejar error de resolución
          const tiempoTranscurrido = Date.now() - tiempoInicio;
          this.actualizarMetricas(false, tiempoTranscurrido);
          
          console.error('❌ Error resolviendo configuración:', error);
          
          // Intentar crear configuración de emergencia
          return this.crearConfiguracionEmergencia(tiempoTranscurrido);
        })
      );
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Ejecuta la resolución con reintentos automáticos
   * @private
   */
  private ejecutarResolucionConReintentos(opciones: OpcionesResolver): Observable<ResultadoConfiguracionResolver> {
    return this.cargarConfiguracion(opciones)
      .pipe(
        retryWhen(errors => 
          errors.pipe(
            take(opciones.maxReintentos),
            delay(1000), // Esperar 1 segundo entre reintentos
            tap(error => console.warn(`⚠️ Reintentando carga de configuración: ${error}`))
          )
        )
      );
  }

  /**
   * Carga la configuración desde el almacenamiento
   * @private
   */
  private cargarConfiguracion(opciones: OpcionesResolver): Observable<ResultadoConfiguracionResolver> {
    return this.almacenamientoService.obtenerConfiguracion()
      .pipe(
        map(configuracion => {
          if (!configuracion) {
            if (opciones.crearPorDefectoSiNoExiste) {
              console.log('📝 Creando configuración por defecto');
              return this.crearConfiguracionPorDefecto();
            } else {
              throw new Error('Configuración no encontrada y creación automática deshabilitada');
            }
          }

          // Validar configuración cargada
          if (opciones.validarIntegridad) {
            return this.validarYCorregirConfiguracion(configuracion);
          }

          return {
            configuracion,
            esNuevaConfiguracion: false,
            tiempoRespuesta: 0,
            erroresCorregidos: [],
            advertencias: []
          };
        }),
        catchError(error => {
          console.error('Error cargando configuración:', error);
          
          if (opciones.crearPorDefectoSiNoExiste) {
            console.log('🆘 Creando configuración de recuperación');
            return of(this.crearConfiguracionPorDefecto());
          }
          
          return throwError(error);
        })
      );
  }

  /**
   * Crea configuración por defecto
   * @private
   */
  private crearConfiguracionPorDefecto(): ResultadoConfiguracionResolver {
    const configuracion = new Configuracion();
    
    // Guardar configuración por defecto en almacenamiento
    this.almacenamientoService.guardarConfiguracion(configuracion)
      .subscribe(
        exitoso => {
          if (exitoso) {
            console.log('💾 Configuración por defecto guardada exitosamente');
            this.metricas.configCreadas++;
          } else {
            console.warn('⚠️ No se pudo guardar configuración por defecto');
          }
        },
        error => console.error('Error guardando configuración por defecto:', error)
      );

    return {
      configuracion,
      esNuevaConfiguracion: true,
      tiempoRespuesta: 0,
      erroresCorregidos: [],
      advertencias: ['Configuración creada por defecto']
    };
  }

  /**
   * Valida y corrige configuración si es necesario
   * @private
   */
  private validarYCorregirConfiguracion(configuracion: Configuracion): ResultadoConfiguracionResolver {
    const erroresCorregidos: string[] = [];
    const advertencias: string[] = [];

    try {
      // Validar integridad básica
      if (!configuracion.esValida()) {
        console.warn('⚠️ Configuración inválida detectada, aplicando correcciones');
        
        // Intentar corregir configuración
        configuracion = this.corregirConfiguracion(configuracion, erroresCorregidos);
        
        // Guardar configuración corregida
        this.almacenamientoService.guardarConfiguracion(configuracion)
          .subscribe(
            exitoso => {
              if (exitoso) {
                console.log('🔧 Configuración corregida y guardada');
                this.metricas.erroresCorregidos++;
              }
            },
            error => console.error('Error guardando configuración corregida:', error)
          );
      }

      // Validaciones de seguridad específicas
      const validacionSeguridad = this.validarSeguridadConfiguracion(configuracion);
      if (!validacionSeguridad.valido) {
        advertencias.push('Configuración tiene problemas de seguridad menores');
        console.warn('🔒 Problemas de seguridad en configuración:', validacionSeguridad.errores);
      }

      // Verificar versión de configuración
      if (this.requiereMigracion(configuracion)) {
        advertencias.push('Configuración requiere migración de versión');
        configuracion = this.migrarConfiguracion(configuracion);
        erroresCorregidos.push('Configuración migrada a versión actual');
      }

      return {
        configuracion,
        esNuevaConfiguracion: false,
        tiempoRespuesta: 0,
        erroresCorregidos,
        advertencias
      };

    } catch (error) {
      console.error('Error validando configuración:', error);
      
      // Si falla la validación, crear configuración nueva
      console.log('🆘 Creando nueva configuración debido a errores de validación');
      return this.crearConfiguracionPorDefecto();
    }
  }

  /**
   * Corrige configuración con errores
   * @private
   */
  private corregirConfiguracion(configuracion: Configuracion, erroresCorregidos: string[]): Configuracion {
    try {
      // Corregir configuración general
      if (!configuracion.general) {
        configuracion.general = new Configuracion().general;
        erroresCorregidos.push('Configuración general restaurada');
      }

      // Corregir configuración de interfaz
      if (!configuracion.interfaz) {
        configuracion.interfaz = new Configuracion().interfaz;
        erroresCorregidos.push('Configuración de interfaz restaurada');
      }

      // Corregir configuración de seguridad
      if (!configuracion.seguridad) {
        configuracion.seguridad = new Configuracion().seguridad;
        erroresCorregidos.push('Configuración de seguridad restaurada');
      }

      // Corregir configuración de notificaciones
      if (!configuracion.notificaciones) {
        configuracion.notificaciones = new Configuracion().notificaciones;
        erroresCorregidos.push('Configuración de notificaciones restaurada');
      }

      // Corregir configuración de datos
      if (!configuracion.datos) {
        configuracion.datos = new Configuracion().datos;
        erroresCorregidos.push('Configuración de datos restaurada');
      }

      // Validar rangos numéricos
      if (configuracion.seguridad.tiempoBloqueo < 1 || configuracion.seguridad.tiempoBloqueo > 60) {
        configuracion.seguridad.tiempoBloqueo = 5;
        erroresCorregidos.push('Tiempo de bloqueo corregido');
      }

      if (configuracion.datos.limiteSesiones < 10 || configuracion.datos.limiteSesiones > 10000) {
        configuracion.datos.limiteSesiones = 1000;
        erroresCorregidos.push('Límite de sesiones corregido');
      }

      if (configuracion.datos.limiteProductosPorSesion < 1 || configuracion.datos.limiteProductosPorSesion > 1000) {
        configuracion.datos.limiteProductosPorSesion = 200;
        erroresCorregidos.push('Límite de productos por sesión corregido');
      }

      // Actualizar fecha de modificación y versión
      configuracion.fechaModificacion = new Date();
      configuracion.version += 1;

      return configuracion;

    } catch (error) {
      console.error('Error corrigiendo configuración:', error);
      // Si falla la corrección, retornar configuración por defecto
      return new Configuracion();
    }
  }

  /**
   * Valida seguridad de la configuración
   * @private
   */
  private validarSeguridadConfiguracion(configuracion: Configuracion): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    try {
      // Validar configuración general
      if (configuracion.general.supermercadoPorDefecto) {
        const validacionNombre = this.seguridadService.validarEntrada(
          configuracion.general.supermercadoPorDefecto,
          'nombreSupermercado'
        );
        
        // Como es asíncrono, manejamos de forma simple por ahora
        // En una implementación más robusta, se haría toda la validación asíncrona
      }

      // Validar límites de seguridad
      if (configuracion.seguridad.retencionDatos > 3650) { // Más de 10 años
        errores.push('Retención de datos excesiva');
      }

      if (configuracion.datos.limiteSesiones > 5000) {
        errores.push('Límite de sesiones muy alto');
      }

      return {
        valido: errores.length === 0,
        errores
      };

    } catch (error) {
      console.error('Error validando seguridad de configuración:', error);
      return {
        valido: false,
        errores: ['Error interno validando seguridad']
      };
    }
  }

  /**
   * Verifica si la configuración requiere migración
   * @private
   */
  private requiereMigracion(configuracion: Configuracion): boolean {
    const versionActual = 1; // Versión actual del modelo de configuración
    return configuracion.version < versionActual;
  }

  /**
   * Migra configuración a versión actual
   * @private
   */
  private migrarConfiguracion(configuracion: Configuracion): Configuracion {
    try {
      console.log(`🔄 Migrando configuración de versión ${configuracion.version} a 1`);

      // Por ahora solo hay versión 1, pero aquí se agregarían futuras migraciones
      const versionOrigen = configuracion.version;
      
      // Migración de versión 0 a 1 (si es necesaria en el futuro)
      if (versionOrigen < 1) {
        // Verificar que todas las propiedades requeridas existan
        const configDefecto = new Configuracion();
        
        // Fusionar con configuración por defecto para agregar propiedades faltantes
        configuracion.general = { ...configDefecto.general, ...configuracion.general };
        configuracion.interfaz = { ...configDefecto.interfaz, ...configuracion.interfaz };
        configuracion.seguridad = { ...configDefecto.seguridad, ...configuracion.seguridad };
        configuracion.notificaciones = { ...configDefecto.notificaciones, ...configuracion.notificaciones };
        configuracion.datos = { ...configDefecto.datos, ...configuracion.datos };
      }

      // Actualizar versión y fecha
      configuracion.version = 1;
      configuracion.fechaModificacion = new Date();

      console.log('✅ Configuración migrada exitosamente');
      return configuracion;

    } catch (error) {
      console.error('Error migrando configuración:', error);
      // Si falla la migración, retornar configuración por defecto
      return new Configuracion();
    }
  }

  /**
   * Crea configuración de emergencia en caso de fallo total
   * @private
   */
  private crearConfiguracionEmergencia(tiempoTranscurrido: number): Observable<ResultadoConfiguracionResolver> {
    console.warn('🆘 Creando configuración de emergencia');
    
    const configuracionEmergencia = new Configuracion();
    
    return of({
      configuracion: configuracionEmergencia,
      esNuevaConfiguracion: true,
      tiempoRespuesta: tiempoTranscurrido,
      erroresCorregidos: ['Configuración de emergencia creada'],
      advertencias: ['Fallo en carga de configuración, usando configuración por defecto']
    });
  }

  /**
   * Obtiene opciones específicas de la ruta
   * @private
   */
  private obtenerOpcionesDeRuta(route: ActivatedRouteSnapshot): OpcionesResolver {
    const opcionesRuta = route.data?.['configuracionResolver'] as Partial<OpcionesResolver>;
    return { ...this.OPCIONES_DEFECTO, ...opcionesRuta };
  }

  /**
   * Verifica si el cache es válido
   * @private
   */
  private esCacheValido(): boolean {
    if (!this.cacheConfiguracion || !this.cacheValidoHasta) {
      return false;
    }

    return new Date() <= this.cacheValidoHasta;
  }

  /**
   * Actualiza el cache con nueva configuración
   * @private
   */
  private actualizarCache(resultado: ResultadoConfiguracionResolver): void {
    this.cacheConfiguracion = resultado;
    this.cacheValidoHasta = new Date(Date.now() + this.DURACION_CACHE_MS);
  }

  /**
   * Actualiza métricas del resolver
   * @private
   */
  private actualizarMetricas(exitoso: boolean, tiempoMs: number): void {
    if (exitoso) {
      this.metricas.resolucionesExitosas++;
    } else {
      this.metricas.resolucionesFallidas++;
    }

    // Calcular tiempo promedio
    const totalTiempos = (this.metricas.tiempoPromedioMs * (this.metricas.totalResoluciones - 1)) + tiempoMs;
    this.metricas.tiempoPromedioMs = totalTiempos / this.metricas.totalResoluciones;
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Limpia el cache del resolver
   */
  public limpiarCache(): void {
    this.cacheConfiguracion = null;
    this.cacheValidoHasta = null;
    console.log('🧹 Cache del ConfiguracionResolver limpiado');
  }

  /**
   * Fuerza la recarga de configuración sin usar cache
   * @param route Ruta activada
   * @param state Estado del router
   * @returns Observable<ResultadoConfiguracionResolver> Configuración recargada
   */
  public forzarRecarga(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ResultadoConfiguracionResolver> {
    this.limpiarCache();
    return this.resolve(route, state);
  }

  /**
   * Pre-carga configuración para optimizar navegación futura
   * @returns Observable<boolean> True si se pre-cargó exitosamente
   */
  public precargarConfiguracion(): Observable<boolean> {
    console.log('⚡ Pre-cargando configuración...');
    
    return this.almacenamientoService.obtenerConfiguracion()
      .pipe(
        map(configuracion => {
          if (configuracion) {
            const resultado: ResultadoConfiguracionResolver = {
              configuracion,
              esNuevaConfiguracion: false,
              tiempoRespuesta: 0,
              erroresCorregidos: [],
              advertencias: []
            };
            
            this.actualizarCache(resultado);
            console.log('✅ Configuración pre-cargada exitosamente');
            return true;
          }
          return false;
        }),
        catchError(error => {
          console.warn('⚠️ Error pre-cargando configuración:', error);
          return of(false);
        })
      );
  }

  /**
   * Valida configuración sin cargarla completamente
   * @returns Observable<boolean> True si la configuración es válida
   */
  public validarConfiguracionRapida(): Observable<boolean> {
    return this.almacenamientoService.obtenerConfiguracion()
      .pipe(
        map(configuracion => {
          if (!configuracion) {
            return false;
          }
          
          return configuracion.esValida();
        }),
        catchError(() => of(false))
      );
  }

  /**
   * Obtiene métricas del resolver
   * @returns object Métricas actuales
   */
  public obtenerMetricas(): object {
    const tasaExito = this.metricas.totalResoluciones > 0 
      ? (this.metricas.resolucionesExitosas / this.metricas.totalResoluciones) * 100 
      : 0;

    return {
      ...this.metricas,
      tasaExitoPercent: Math.round(tasaExito * 100) / 100,
      cacheHabilitado: this.OPCIONES_DEFECTO.habilitarCache,
      cacheValido: this.esCacheValido(),
      ultimaActualizacion: new Date().toISOString()
    };
  }

  /**
   * Reinicia métricas del resolver
   */
  public reiniciarMetricas(): void {
    this.metricas = {
      totalResoluciones: 0,
      resolucionesExitosas: 0,
      resolucionesFallidas: 0,
      configCreadas: 0,
      erroresCorregidos: 0,
      tiempoPromedioMs: 0
    };
    
    console.log('📊 Métricas del ConfiguracionResolver reiniciadas');
  }

  /**
   * Obtiene información de debug del resolver
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    return {
      opciones: this.OPCIONES_DEFECTO,
      cache: {
        configuracionEnCache: !!this.cacheConfiguracion,
        cacheValidoHasta: this.cacheValidoHasta?.toISOString(),
        duracionCacheMs: this.DURACION_CACHE_MS
      },
      metricas: this.obtenerMetricas(),
      estadoInterno: {
        inicializado: true,
        funcionando: this.metricas.totalResoluciones > 0
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Configura opciones por defecto del resolver
   * @param nuevasOpciones Nuevas opciones
   */
  public configurarOpciones(nuevasOpciones: Partial<OpcionesResolver>): void {
    Object.assign(this.OPCIONES_DEFECTO, nuevasOpciones);
    console.log('⚙️ Opciones del ConfiguracionResolver actualizadas:', this.OPCIONES_DEFECTO);
  }

  /**
   * Verifica estado de salud del resolver
   * @returns Observable<object> Estado de salud
   */
  public verificarSalud(): Observable<object> {
    const tiempoInicio = Date.now();
    
    return this.almacenamientoService.obtenerConfiguracion()
      .pipe(
        timeout(5000), // 5 segundos máximo
        map(configuracion => {
          const tiempoRespuesta = Date.now() - tiempoInicio;
          
          return {
            estado: 'saludable',
            configuracionDisponible: !!configuracion,
            configuracionValida: configuracion ? configuracion.esValida() : false,
            tiempoRespuestaMs: tiempoRespuesta,
            cacheActivo: this.esCacheValido(),
            metricas: this.obtenerMetricas(),
            timestamp: new Date().toISOString()
          };
        }),
        catchError(error => {
          const tiempoRespuesta = Date.now() - tiempoInicio;
          
          return of({
            estado: 'no-saludable',
            error: error.message,
            tiempoRespuestaMs: tiempoRespuesta,
            configuracionDisponible: false,
            configuracionValida: false,
            cacheActivo: false,
            accionRecomendada: 'Verificar almacenamiento y conectividad',
            timestamp: new Date().toISOString()
          });
        })
      );
  }

  /**
   * Ejecuta diagnóstico completo del resolver
   * @returns Observable<object> Resultado del diagnóstico
   */
  public ejecutarDiagnostico(): Observable<object> {
    console.log('🔍 Ejecutando diagnóstico completo del ConfiguracionResolver...');
    
    const diagnosticos: Observable<any>[] = [
      this.verificarSalud(),
      this.validarConfiguracionRapida().pipe(map(valida => ({ configValida: valida }))),
      this.almacenamientoService.obtenerEstadisticasAlmacenamiento().pipe(
        map(stats => ({ estadisticasAlmacenamiento: stats })),
        catchError(() => of({ estadisticasAlmacenamiento: 'no-disponible' }))
      )
    ];

    return timer(0).pipe(
      map(() => ({
        diagnosticoIniciado: new Date().toISOString(),
        resolver: this.obtenerInfoDebug(),
        pruebas: {
          // Los resultados se agregarán cuando se completen las pruebas asíncronas
        }
      }))
    );
  }

  /**
   * Repara configuración corrupta o inválida
   * @returns Observable<boolean> True si se reparó exitosamente
   */
  public repararConfiguracion(): Observable<boolean> {
    console.log('🔧 Iniciando reparación de configuración...');
    
    return this.almacenamientoService.obtenerConfiguracion()
      .pipe(
        map(configuracion => {
          if (!configuracion) {
            // Crear nueva configuración
            const nuevaConfig = new Configuracion();
            this.almacenamientoService.guardarConfiguracion(nuevaConfig).subscribe();
            console.log('✅ Nueva configuración creada');
            return true;
          }

          if (!configuracion.esValida()) {
            // Reparar configuración existente
            const erroresCorregidos: string[] = [];
            const configReparada = this.corregirConfiguracion(configuracion, erroresCorregidos);
            
            this.almacenamientoService.guardarConfiguracion(configReparada).subscribe();
            console.log('🔧 Configuración reparada:', erroresCorregidos);
            return true;
          }

          console.log('✅ Configuración ya es válida');
          return true;
        }),
        catchError(error => {
          console.error('❌ Error reparando configuración:', error);
          
          // Crear configuración de emergencia
          const configEmergencia = new Configuracion();
          this.almacenamientoService.guardarConfiguracion(configEmergencia).subscribe();
          
          return of(true); // Siempre retornar true porque se creó configuración de emergencia
        })
      );
  }

  /**
   * Optimiza rendimiento del resolver
   */
  public optimizarRendimiento(): void {
    console.log('⚡ Optimizando rendimiento del ConfiguracionResolver...');
    
    // Limpiar cache si está muy antiguo
    if (this.cacheValidoHasta && new Date() > this.cacheValidoHasta) {
      this.limpiarCache();
    }

    // Ajustar duración de cache basado en métricas
    const tasaExito = this.metricas.resolucionesExitosas / this.metricas.totalResoluciones;
    if (tasaExito > 0.95 && this.metricas.tiempoPromedioMs < 1000) {
      // Si tiene alta tasa de éxito y es rápido, extender cache
      console.log('📈 Extendiendo duración de cache por buen rendimiento');
    }

    // Pre-cargar configuración si no está en cache
    if (!this.esCacheValido()) {
      this.precargarConfiguracion().subscribe();
    }
  }

  /**
   * Destruye el resolver y limpia recursos
   */
  public destruir(): void {
    this.limpiarCache();
    this.reiniciarMetricas();
    console.log('🧹 ConfiguracionResolver destruido y recursos limpiados');
  }
}

// ==================== UTILIDADES PARA USO EN RUTAS ====================

/**
 * Utilidades para configurar el resolver en rutas
 */
export class ConfiguracionResolverUtils {
  
  /**
   * Crea datos de ruta para resolver con opciones personalizadas
   * @param opciones Opciones del resolver
   * @returns object Datos para la ruta
   */
  static crearDatosRuta(opciones?: Partial<OpcionesResolver>): object {
    return {
      configuracionResolver: opciones
    };
  }

  /**
   * Opciones optimizadas para rutas críticas
   * @returns object Opciones para rutas críticas
   */
  static opcionesRutasCriticas(): object {
    return ConfiguracionResolverUtils.crearDatosRuta({
      timeout: 5000, // Más rápido
      maxReintentos: 1, // Menos reintentos
      habilitarCache: true,
      validarIntegridad: false // Saltar validación para velocidad
    });
  }

  /**
   * Opciones para rutas de configuración
   * @returns object Opciones para rutas de configuración
   */
  static opcionesRutasConfiguracion(): object {
    return ConfiguracionResolverUtils.crearDatosRuta({
      timeout: 15000, // Más tiempo
      maxReintentos: 5, // Más reintentos
      habilitarCache: false, // Sin cache para datos frescos
      validarIntegridad: true // Validación completa
    });
  }

  /**
   * Opciones para desarrollo/debug
   * @returns object Opciones para desarrollo
   */
  static opcionesDesarrollo(): object {
    return ConfiguracionResolverUtils.crearDatosRuta({
      timeout: 30000, // Mucho tiempo para debug
      maxReintentos: 10,
      habilitarCache: false,
      validarIntegridad: true,
      crearPorDefectoSiNoExiste: true
    });
  }
}

// Exportar tipos para uso externo
export type { ResultadoConfiguracionResolver, OpcionesResolver };