/**
 * Resolver de Sesión Activa - Verifica y carga sesión activa de compra
 * 
 * Resolver para verificar y cargar sesión activa de compra antes de navegación.
 * Valida integridad de sesión, maneja estados corruptos y redirecciona automáticamente.
 * Integrado con AlmacenamientoService, SeguridadService y guards de navegación.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of, throwError, timer } from 'rxjs';
import { map, catchError, tap, timeout, retryWhen, take, delay, switchMap } from 'rxjs/operators';

import { SesionCompra, EstadoSesion } from '@core-models/sesion-compra.model';
import { AlmacenamientoService } from '@core-services/almacenamiento.service';
import { SeguridadService } from '@core-services/seguridad.service';
import { ValidacionService } from '@core-services/validacion.service';

/**
 * Resultado del resolver de sesión activa
 */
interface ResultadoSesionActivaResolver {
  sesion: SesionCompra | null;
  estado: 'activa' | 'completada' | 'corrupta' | 'inexistente' | 'error';
  accionTomada: string;
  erroresCorregidos: string[];
  advertencias: string[];
  tiempoRespuesta: number;
  requiereRedireccion: boolean;
  urlRedireccion?: string;
}

/**
 * Opciones de configuración del resolver
 */
interface OpcionesSesionResolver {
  /** Timeout en milisegundos */
  timeout: number;
  /** Número máximo de reintentos */
  maxReintentos: number;
  /** Validar integridad de datos de sesión */
  validarIntegridad: boolean;
  /** Limpiar sesión corrupta automáticamente */
  limpiarSesionCorrupta: boolean;
  /** Redirigir automáticamente según estado */
  redireccionAutomatica: boolean;
  /** Permitir navegación sin sesión activa */
  permitirSinSesion: boolean;
  /** Cachear resultado del resolver */
  habilitarCache: boolean;
}

/**
 * Configuración de rutas de redirección
 */
interface ConfiguracionRedireccion {
  sesionCompletada: string;
  sesionCorrupta: string;
  sinSesion: string;
  error: string;
}

@Injectable({
  providedIn: 'root'
})
export class SesionActivaResolver implements Resolve<ResultadoSesionActivaResolver> {

  // Cache del resolver para optimizar navegación
  private cacheSesion: ResultadoSesionActivaResolver | null = null;
  private cacheValidoHasta: Date | null = null;
  private readonly DURACION_CACHE_MS = 2 * 60 * 1000; // 2 minutos

  // Configuración por defecto del resolver
  private readonly OPCIONES_DEFECTO: OpcionesSesionResolver = {
    timeout: 8000, // 8 segundos
    maxReintentos: 3,
    validarIntegridad: true,
    limpiarSesionCorrupta: true,
    redireccionAutomatica: false, // Por defecto false para evitar bucles
    permitirSinSesion: true,
    habilitarCache: true
  };

  // Rutas de redirección por defecto
  private readonly RUTAS_REDIRECCION: ConfiguracionRedireccion = {
    sesionCompletada: '/historial',
    sesionCorrupta: '/nueva-sesion',
    sinSesion: '/inicio',
    error: '/inicio'
  };

  // Métricas del resolver
  private metricas = {
    totalResoluciones: 0,
    sesionesActivasEncontradas: 0,
    sesionesCompletadasEncontradas: 0,
    sesionesCorruptasEncontradas: 0,
    sesionesInexistentes: 0,
    erroresDeResolucion: 0,
    sesionesLimpiadas: 0,
    redirecciones: 0,
    tiempoPromedioMs: 0
  };

  constructor(
    private almacenamientoService: AlmacenamientoService,
    private seguridadService: SeguridadService,
    private validacionService: ValidacionService,
    private router: Router
  ) {
    console.log('🛒 SesionActivaResolver inicializado');
  }

  /**
   * Resuelve la sesión activa antes de la navegación
   * @param route Ruta activada
   * @param state Estado del router
   * @returns Observable<ResultadoSesionActivaResolver> Resultado de la resolución
   */
  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ResultadoSesionActivaResolver> {
    const tiempoInicio = Date.now();
    
    console.log(`🔍 Resolviendo sesión activa para ruta: ${state.url}`);
    
    // Incrementar contador de resoluciones
    this.metricas.totalResoluciones++;

    // Verificar cache si está habilitado
    const opciones = this.obtenerOpcionesDeRuta(route);
    if (opciones.habilitarCache && this.esCacheValido()) {
      console.log('💾 Usando sesión activa desde cache');
      return of(this.cacheSesion!);
    }

    // Ejecutar resolución con timeout y reintentos
    return this.ejecutarResolucionConReintentos(opciones)
      .pipe(
        timeout(opciones.timeout),
        tap(resultado => {
          // Calcular tiempo de respuesta
          const tiempoTranscurrido = Date.now() - tiempoInicio;
          resultado.tiempoRespuesta = tiempoTranscurrido;

          // Actualizar métricas
          this.actualizarMetricas(resultado, tiempoTranscurrido);

          // Actualizar cache
          if (opciones.habilitarCache) {
            this.actualizarCache(resultado);
          }

          // Manejar redirección si es necesaria
          if (resultado.requiereRedireccion && opciones.redireccionAutomatica) {
            this.manejarRedireccion(resultado, state.url);
          }

          console.log(`✅ Sesión activa resuelta: ${resultado.estado} en ${tiempoTranscurrido}ms`);
        }),
        catchError(error => {
          // Manejar error de resolución
          const tiempoTranscurrido = Date.now() - tiempoInicio;
          this.metricas.erroresDeResolucion++;
          
          console.error('❌ Error resolviendo sesión activa:', error);
          
          // Crear resultado de error y envolverlo en un Observable
          return of(this.crearResultadoError(tiempoTranscurrido, error));
        })
      );
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Ejecuta la resolución con reintentos automáticos
   * @private
   */
  private ejecutarResolucionConReintentos(opciones: OpcionesSesionResolver): Observable<ResultadoSesionActivaResolver> {
    return this.cargarSesionActiva(opciones)
      .pipe(
        retryWhen(errors => 
          errors.pipe(
            take(opciones.maxReintentos),
            delay(500), // Esperar 500ms entre reintentos
            tap(error => console.warn(`⚠️ Reintentando carga de sesión activa: ${error}`))
          )
        )
      );
  }

  /**
   * Carga la sesión activa desde el almacenamiento
   * @private
   */
  private cargarSesionActiva(opciones: OpcionesSesionResolver): Observable<ResultadoSesionActivaResolver> {
    return this.almacenamientoService.obtenerSesionActiva()
      .pipe(
        switchMap(sesion => {
          if (!sesion) {
            // No hay sesión activa
            this.metricas.sesionesInexistentes++;
            return of(this.crearResultadoSinSesion(opciones));
          }

          // Validar sesión encontrada
          return this.validarYProcesarSesion(sesion, opciones);
        }),
        catchError(error => {
          console.error('Error cargando sesión activa:', error);
          return of(this.crearResultadoError(0, error));
        })
      );
  }

  /**
   * Valida y procesa la sesión activa encontrada
   * @private
   */
  private validarYProcesarSesion(
    sesion: SesionCompra, 
    opciones: OpcionesSesionResolver
  ): Observable<ResultadoSesionActivaResolver> {
    const erroresCorregidos: string[] = [];
    const advertencias: string[] = [];

    try {
      // Verificar si la sesión está completada
      if (sesion.completada) {
        this.metricas.sesionesCompletadasEncontradas++;
        return of({
          sesion,
          estado: 'completada',
          accionTomada: 'Sesión completada detectada',
          erroresCorregidos,
          advertencias: ['Sesión ya está completada'],
          tiempoRespuesta: 0,
          requiereRedireccion: true,
          urlRedireccion: this.RUTAS_REDIRECCION.sesionCompletada
        });
      }

      // Validar integridad si está configurado
      if (opciones.validarIntegridad) {
        const resultadoValidacion = this.validarIntegridadSesion(sesion);
        
        if (!resultadoValidacion.valida) {
          if (opciones.limpiarSesionCorrupta) {
            return this.limpiarSesionCorrupta(sesion, resultadoValidacion.errores);
          } else {
            this.metricas.sesionesCorruptasEncontradas++;
            return of({
              sesion: null,
              estado: 'corrupta',
              accionTomada: 'Sesión corrupta detectada pero no limpiada',
              erroresCorregidos,
              advertencias: resultadoValidacion.errores,
              tiempoRespuesta: 0,
              requiereRedireccion: true,
              urlRedireccion: this.RUTAS_REDIRECCION.sesionCorrupta
            });
          }
        }

        // Aplicar correcciones si las hay
        if (resultadoValidacion.sesionCorregida) {
          sesion = resultadoValidacion.sesionCorregida;
          erroresCorregidos.push(...resultadoValidacion.correcionesAplicadas);
          
          // Guardar sesión corregida
          this.almacenamientoService.guardarSesion(sesion, true).subscribe();
        }
      }

      // Validaciones adicionales de seguridad
      const validacionSeguridad = this.validarSeguridadSesion(sesion);
      if (!validacionSeguridad.valido) {
        advertencias.push(...validacionSeguridad.errores);
      }

      // Sesión activa válida
      this.metricas.sesionesActivasEncontradas++;
      return of({
        sesion,
        estado: 'activa',
        accionTomada: 'Sesión activa válida cargada',
        erroresCorregidos,
        advertencias,
        tiempoRespuesta: 0,
        requiereRedireccion: false
      });

    } catch (error) {
      console.error('Error validando sesión:', error);
      
      if (opciones.limpiarSesionCorrupta) {
        return this.limpiarSesionCorrupta(sesion, ['Error interno de validación']);
      }
      
      return of(this.crearResultadoError(0, error));
    }
  }

  /**
   * Valida integridad de la sesión
   * @private
   */
  private validarIntegridadSesion(sesion: SesionCompra): {
    valida: boolean;
    errores: string[];
    sesionCorregida?: SesionCompra;
    correcionesAplicadas: string[];
  } {
    const errores: string[] = [];
    const correcciones: string[] = [];
    let sesionCorregida: SesionCompra | undefined;

    try {
      // Validar estructura básica
      if (!sesion.esValida()) {
        errores.push('Estructura de sesión inválida');
      }

// Validar coherencia de totales
      const totalCalculado = sesion.productos.reduce((total, producto) => total + producto.total, 0);
      const diferencia = Math.abs(totalCalculado - sesion.totalGeneral);
      
      if (diferencia > 0.01) { // Tolerancia de 1 centavo
        errores.push(`Total incorrecto: calculado ${totalCalculado}, almacenado ${sesion.totalGeneral}`);
        
        // Intentar corregir
        // Crear una nueva instancia de SesionCompra en lugar de un objeto plano
        sesionCorregida = new SesionCompra(sesion);
        sesionCorregida.totalGeneral = totalCalculado;
        correcciones.push('Total general corregido');
      }

      // Validar fechas
      const fechaSesion = new Date(sesion.fecha + ' ' + sesion.horaInicio);
      const ahora = new Date();
      
      if (fechaSesion > ahora) {
        errores.push('Fecha de sesión en el futuro');
      }

      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);
      
      if (fechaSesion < haceUnaSemana) {
        errores.push('Sesión demasiado antigua sin completar');
      }

      // Validar productos
      if (sesion.productos.length === 0) {
        errores.push('Sesión sin productos');
      }

      // Validar IDs únicos de productos
      const idsProductos = sesion.productos.map(p => p.id);
      const idsUnicos = new Set(idsProductos);
      
      if (idsUnicos.size !== idsProductos.length) {
        errores.push('Productos duplicados en sesión');
      }

      // Validar cada producto individualmente
      for (let i = 0; i < sesion.productos.length; i++) {
        const producto = sesion.productos[i];
        
        if (!producto.nombre || producto.nombre.trim().length === 0) {
          errores.push(`Producto ${i + 1} sin nombre`);
        }
        
        if (producto.precioUnitario <= 0) {
          errores.push(`Producto ${i + 1} con precio inválido`);
        }
        
        if (producto.cantidad <= 0) {
          errores.push(`Producto ${i + 1} con cantidad inválida`);
        }
        
        const totalProductoCalculado = producto.precioUnitario * producto.cantidad;
        if (Math.abs(totalProductoCalculado - producto.total) > 0.01) {
          errores.push(`Producto ${i + 1} con total incorrecto`);
        }
      }

      // Validar estado de sesión (si la propiedad existe)
      if ('estado' in sesion && sesion.estado !== 'ACTIVA' && sesion.estado !== 'PAUSADA') {
        errores.push(`Estado de sesión inválido: ${sesion.estado}`);
      }

      return {
        valida: errores.length === 0,
        errores,
        sesionCorregida,
        correcionesAplicadas: correcciones
      };

    } catch (error) {
      console.error('Error validando integridad de sesión:', error);
      return {
        valida: false,
        errores: ['Error interno validando integridad'],
        correcionesAplicadas: []
      };
    }
  }

  /**
   * Valida seguridad de la sesión
   * @private
   */
  private validarSeguridadSesion(sesion: SesionCompra): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    try {
      // Validar nombre del supermercado
      if (sesion.nombreSupermercado) {
        const amenazas = this.seguridadService.detectarAmenazas(sesion.nombreSupermercado);
        if (amenazas.length > 0) {
          errores.push('Nombre de supermercado contiene elementos peligrosos');
        }
      }

      // Validar nombres de productos
      for (const producto of sesion.productos) {
        const amenazasProducto = this.seguridadService.detectarAmenazas(producto.nombre);
        if (amenazasProducto.length > 0) {
          errores.push(`Producto "${producto.nombre}" contiene elementos peligrosos`);
        }

        // Validar notas si existen
        if (producto.notas) {
          const amenazasNotas = this.seguridadService.detectarAmenazas(producto.notas);
          if (amenazasNotas.length > 0) {
            errores.push(`Notas del producto "${producto.nombre}" contienen elementos peligrosos`);
          }
        }
      }

      // Validar notas de sesión
      if (sesion.notas) {
        const amenazasNotas = this.seguridadService.detectarAmenazas(sesion.notas);
        if (amenazasNotas.length > 0) {
          errores.push('Notas de sesión contienen elementos peligrosos');
        }
      }

      return {
        valido: errores.length === 0,
        errores
      };

    } catch (error) {
      console.error('Error validando seguridad de sesión:', error);
      return {
        valido: false,
        errores: ['Error interno validando seguridad']
      };
    }
  }

  /**
   * Limpia sesión corrupta del almacenamiento
   * @private
   */
  private limpiarSesionCorrupta(
    sesion: SesionCompra, 
    errores: string[]
  ): Observable<ResultadoSesionActivaResolver> {
    console.warn('🧹 Limpiando sesión corrupta:', errores);
    
    return this.almacenamientoService.limpiarSesionActiva()
      .pipe(
        map(exitoso => {
          if (exitoso) {
            this.metricas.sesionesLimpiadas++;
            this.metricas.sesionesCorruptasEncontradas++;
            
            return {
              sesion: null,
              estado: 'corrupta' as const,
              accionTomada: 'Sesión corrupta limpiada automáticamente',
              erroresCorregidos: ['Sesión corrupta eliminada'],
              advertencias: errores,
              tiempoRespuesta: 0,
              requiereRedireccion: true,
              urlRedireccion: this.RUTAS_REDIRECCION.sesionCorrupta
            };
          } else {
            return {
              sesion: null,
              estado: 'error' as const,
              accionTomada: 'Error limpiando sesión corrupta',
              erroresCorregidos: [],
              advertencias: ['No se pudo limpiar sesión corrupta'],
              tiempoRespuesta: 0,
              requiereRedireccion: true,
              urlRedireccion: this.RUTAS_REDIRECCION.error
            };
          }
        }),
        catchError(error => {
          console.error('Error limpiando sesión corrupta:', error);
          return of(this.crearResultadoError(0, error));
        })
      );
  }

  /**
   * Crea resultado para cuando no hay sesión
   * @private
   */
  private crearResultadoSinSesion(opciones: OpcionesSesionResolver): ResultadoSesionActivaResolver {
    return {
      sesion: null,
      estado: 'inexistente',
      accionTomada: 'No hay sesión activa',
      erroresCorregidos: [],
      advertencias: opciones.permitirSinSesion ? [] : ['Se requiere sesión activa para esta ruta'],
      tiempoRespuesta: 0,
      requiereRedireccion: !opciones.permitirSinSesion,
      urlRedireccion: opciones.permitirSinSesion ? undefined : this.RUTAS_REDIRECCION.sinSesion
    };
  }

  /**
   * Crea resultado de error
   * @private
   */
  private crearResultadoError(tiempoTranscurrido: number, error: any): ResultadoSesionActivaResolver {
    return {
      sesion: null,
      estado: 'error',
      accionTomada: 'Error cargando sesión activa',
      erroresCorregidos: [],
      advertencias: [`Error: ${error.message || error}`],
      tiempoRespuesta: tiempoTranscurrido,
      requiereRedireccion: true,
      urlRedireccion: this.RUTAS_REDIRECCION.error
    };
  }

  /**
   * Obtiene opciones específicas de la ruta
   * @private
   */
  private obtenerOpcionesDeRuta(route: ActivatedRouteSnapshot): OpcionesSesionResolver {
    const opcionesRuta = route.data?.['sesionActivaResolver'] as Partial<OpcionesSesionResolver>;
    return { ...this.OPCIONES_DEFECTO, ...opcionesRuta };
  }

  /**
   * Verifica si el cache es válido
   * @private
   */
  private esCacheValido(): boolean {
    if (!this.cacheSesion || !this.cacheValidoHasta) {
      return false;
    }

    return new Date() <= this.cacheValidoHasta;
  }

  /**
   * Actualiza el cache con nueva sesión
   * @private
   */
  private actualizarCache(resultado: ResultadoSesionActivaResolver): void {
    this.cacheSesion = resultado;
    this.cacheValidoHasta = new Date(Date.now() + this.DURACION_CACHE_MS);
  }

  /**
   * Actualiza métricas del resolver
   * @private
   */
  private actualizarMetricas(resultado: ResultadoSesionActivaResolver, tiempoMs: number): void {
    // Actualizar contadores específicos según el estado
    switch (resultado.estado) {
      case 'activa':
        this.metricas.sesionesActivasEncontradas++;
        break;
      case 'completada':
        this.metricas.sesionesCompletadasEncontradas++;
        break;
      case 'corrupta':
        this.metricas.sesionesCorruptasEncontradas++;
        break;
      case 'inexistente':
        this.metricas.sesionesInexistentes++;
        break;
      case 'error':
        this.metricas.erroresDeResolucion++;
        break;
    }

    // Contar redirecciones
    if (resultado.requiereRedireccion) {
      this.metricas.redirecciones++;
    }

    // Calcular tiempo promedio
    const totalTiempos = (this.metricas.tiempoPromedioMs * (this.metricas.totalResoluciones - 1)) + tiempoMs;
    this.metricas.tiempoPromedioMs = totalTiempos / this.metricas.totalResoluciones;
  }

  /**
   * Maneja redirección automática
   * @private
   */
  private manejarRedireccion(resultado: ResultadoSesionActivaResolver, urlActual: string): void {
    if (!resultado.urlRedireccion) {
      return;
    }

    // Evitar bucles de redirección
    if (urlActual === resultado.urlRedireccion) {
      console.warn(`⚠️ Evitando bucle de redirección a: ${resultado.urlRedireccion}`);
      return;
    }

    console.log(`🔄 Redirigiendo automáticamente a: ${resultado.urlRedireccion}`);
    
    setTimeout(() => {
      this.router.navigate([resultado.urlRedireccion]);
    }, 100); // Pequeño delay para evitar problemas de navegación
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Limpia el cache del resolver
   */
  public limpiarCache(): void {
    this.cacheSesion = null;
    this.cacheValidoHasta = null;
    console.log('🧹 Cache del SesionActivaResolver limpiado');
  }

  /**
   * Fuerza la recarga de sesión sin usar cache
   * @param route Ruta activada
   * @param state Estado del router
   * @returns Observable<ResultadoSesionActivaResolver> Sesión recargada
   */
  public forzarRecarga(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<ResultadoSesionActivaResolver> {
    this.limpiarCache();
    return this.resolve(route, state);
  }

  /**
   * Verifica si hay sesión activa sin cargar todos los datos
   * @returns Observable<boolean> True si hay sesión activa
   */
  public verificarSesionActivaRapida(): Observable<boolean> {
    return this.almacenamientoService.obtenerSesionActiva()
      .pipe(
        map(sesion => !!sesion && !sesion.completada),
        catchError(() => of(false))
      );
  }

  /**
   * Pre-carga sesión activa para optimizar navegación futura
   * @returns Observable<boolean> True si se pre-cargó exitosamente
   */
  public precargarSesionActiva(): Observable<boolean> {
    console.log('⚡ Pre-cargando sesión activa...');
    
    return this.almacenamientoService.obtenerSesionActiva()
      .pipe(
        map(sesion => {
          if (sesion) {
            const resultado: ResultadoSesionActivaResolver = {
              sesion,
              estado: sesion.completada ? 'completada' : 'activa',
              accionTomada: 'Pre-cargada desde cache',
              erroresCorregidos: [],
              advertencias: [],
              tiempoRespuesta: 0,
              requiereRedireccion: false
            };
            
            this.actualizarCache(resultado);
            console.log('✅ Sesión activa pre-cargada exitosamente');
            return true;
          }
          return false;
        }),
        catchError(error => {
          console.warn('⚠️ Error pre-cargando sesión activa:', error);
          return of(false);
        })
      );
  }

  /**
   * Valida sesión activa sin resolver completamente
   * @returns Observable<{ valida: boolean; errores: string[] }> Resultado de validación
   */
  public validarSesionActivaRapida(): Observable<{ valida: boolean; errores: string[] }> {
    return this.almacenamientoService.obtenerSesionActiva()
      .pipe(
        map(sesion => {
          if (!sesion) {
            return { valida: false, errores: ['No hay sesión activa'] };
          }

          if (sesion.completada) {
            return { valida: false, errores: ['Sesión ya completada'] };
          }

          const validacion = this.validarIntegridadSesion(sesion);
          return {
            valida: validacion.valida,
            errores: validacion.errores
          };
        }),
        catchError(error => of({
          valida: false,
          errores: [`Error validando sesión: ${error.message}`]
        }))
      );
  }

  /**
   * Repara sesión activa si está corrupta
   * @returns Observable<boolean> True si se reparó exitosamente
   */
  public repararSesionActiva(): Observable<boolean> {
    console.log('🔧 Iniciando reparación de sesión activa...');
    
    return this.almacenamientoService.obtenerSesionActiva()
      .pipe(
        switchMap(sesion => {
          if (!sesion) {
            console.log('ℹ️ No hay sesión activa para reparar');
            return of(true);
          }

          const validacion = this.validarIntegridadSesion(sesion);
          
          if (validacion.valida) {
            console.log('✅ Sesión activa ya es válida');
            return of(true);
          }

          if (validacion.sesionCorregida) {
            // Guardar sesión reparada
            return this.almacenamientoService.guardarSesion(validacion.sesionCorregida, true)
              .pipe(
                map(exitoso => {
                  if (exitoso) {
                    console.log('🔧 Sesión activa reparada:', validacion.correcionesAplicadas);
                    this.limpiarCache(); // Limpiar cache para forzar recarga
                  }
                  return exitoso;
                })
              );
          } else {
            // Sesión no reparable, limpiar
            console.warn('🗑️ Sesión no reparable, limpiando...');
            return this.almacenamientoService.limpiarSesionActiva();
          }
        }),
        catchError(error => {
          console.error('❌ Error reparando sesión activa:', error);
          return of(false);
        })
      );
  }

  /**
   * Obtiene métricas del resolver
   * @returns object Métricas actuales
   */
  public obtenerMetricas(): object {
    const tasaExito = this.metricas.totalResoluciones > 0 
      ? ((this.metricas.sesionesActivasEncontradas + this.metricas.sesionesInexistentes) / this.metricas.totalResoluciones) * 100 
      : 0;

    const tasaCorrupcion = this.metricas.totalResoluciones > 0
      ? (this.metricas.sesionesCorruptasEncontradas / this.metricas.totalResoluciones) * 100
      : 0;

    return {
      ...this.metricas,
      tasaExitoPercent: Math.round(tasaExito * 100) / 100,
      tasaCorrupcionPercent: Math.round(tasaCorrupcion * 100) / 100,
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
      sesionesActivasEncontradas: 0,
      sesionesCompletadasEncontradas: 0,
      sesionesCorruptasEncontradas: 0,
      sesionesInexistentes: 0,
      erroresDeResolucion: 0,
      sesionesLimpiadas: 0,
      redirecciones: 0,
      tiempoPromedioMs: 0
    };
    
    console.log('📊 Métricas del SesionActivaResolver reiniciadas');
  }

  /**
   * Configura rutas de redirección
   * @param nuevasRutas Nuevas rutas de redirección
   */
  public configurarRutasRedireccion(nuevasRutas: Partial<ConfiguracionRedireccion>): void {
    Object.assign(this.RUTAS_REDIRECCION, nuevasRutas);
    console.log('🛣️ Rutas de redirección actualizadas:', this.RUTAS_REDIRECCION);
  }

  /**
   * Configura opciones por defecto del resolver
   * @param nuevasOpciones Nuevas opciones
   */
  public configurarOpciones(nuevasOpciones: Partial<OpcionesSesionResolver>): void {
    Object.assign(this.OPCIONES_DEFECTO, nuevasOpciones);
    console.log('⚙️ Opciones del SesionActivaResolver actualizadas:', this.OPCIONES_DEFECTO);
  }

  /**
   * Verifica estado de salud del resolver
   * @returns Observable<object> Estado de salud
   */
  public verificarSalud(): Observable<object> {
    const tiempoInicio = Date.now();
    
    return this.almacenamientoService.obtenerSesionActiva()
      .pipe(
        timeout(5000), // 5 segundos máximo
        map(sesion => {
          const tiempoRespuesta = Date.now() - tiempoInicio;
          
          let estadoSesion = 'sin-sesion';
          if (sesion) {
            estadoSesion = sesion.completada ? 'completada' : 'activa';
          }
          
          return {
            estado: 'saludable',
            sesionDisponible: !!sesion,
            estadoSesion,
            sesionValida: sesion ? this.validarIntegridadSesion(sesion).valida : null,
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
            sesionDisponible: false,
            sesionValida: false,
            cacheActivo: false,
            accionRecomendada: 'Verificar almacenamiento y integridad de datos',
            timestamp: new Date().toISOString()
          });
        })
      );
  }

  /**
   * Obtiene información de debug del resolver
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    return {
      opciones: this.OPCIONES_DEFECTO,
      rutasRedireccion: this.RUTAS_REDIRECCION,
      cache: {
        sesionEnCache: !!this.cacheSesion,
        estadoCache: this.cacheSesion?.estado,
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
   * Ejecuta diagnóstico completo del resolver
   * @returns Observable<object> Resultado del diagnóstico
   */
  public ejecutarDiagnostico(): Observable<object> {
    console.log('🔍 Ejecutando diagnóstico completo del SesionActivaResolver...');
    
    return this.verificarSalud()
      .pipe(
        switchMap(saludGeneral => 
          this.validarSesionActivaRapida().pipe(
            map(validacionRapida => ({
              diagnosticoIniciado: new Date().toISOString(),
              saludGeneral,
              validacionRapida,
              resolver: this.obtenerInfoDebug(),
              recomendaciones: this.generarRecomendaciones(saludGeneral, validacionRapida)
            }))
          )
        )
      );
  }

  /**
   * Genera recomendaciones basadas en diagnóstico
   * @private
   */
  private generarRecomendaciones(saludGeneral: any, validacionRapida: any): string[] {
    const recomendaciones: string[] = [];
    
    if (saludGeneral.estado === 'no-saludable') {
      recomendaciones.push('Verificar conectividad con almacenamiento');
    }
    
    if (!validacionRapida.valida && validacionRapida.errores.length > 0) {
      recomendaciones.push('Ejecutar reparación de sesión activa');
    }
    
    if (this.metricas.sesionesCorruptasEncontradas > this.metricas.sesionesActivasEncontradas) {
      recomendaciones.push('Investigar causa de corrupción de sesiones');
    }
    
    if (this.metricas.tiempoPromedioMs > 5000) {
      recomendaciones.push('Optimizar rendimiento del almacenamiento');
    }
    
    return recomendaciones;
  }

  /**
   * Destruye el resolver y limpia recursos
   */
  public destruir(): void {
    this.limpiarCache();
    this.reiniciarMetricas();
    console.log('🧹 SesionActivaResolver destruido y recursos limpiados');
  }
}

// ==================== UTILIDADES PARA USO EN RUTAS ====================

/**
 * Utilidades para configurar el resolver en rutas
 */
export class SesionActivaResolverUtils {
  
  /**
   * Crea datos de ruta para resolver con opciones personalizadas
   * @param opciones Opciones del resolver
   * @returns object Datos para la ruta
   */
  static crearDatosRuta(opciones?: Partial<OpcionesSesionResolver>): object {
    return {
      sesionActivaResolver: opciones
    };
  }

  /**
   * Opciones para rutas que requieren sesión activa
   * @returns object Opciones para rutas con sesión requerida
   */
  static opcionesRutasConSesionRequerida(): object {
    return SesionActivaResolverUtils.crearDatosRuta({
      permitirSinSesion: false,
      validarIntegridad: true,
      limpiarSesionCorrupta: true,
      redireccionAutomatica: true
    });
  }

  /**
   * Opciones para rutas de gestión de sesión
   * @returns object Opciones para rutas de gestión
   */
  static opcionesRutasGestionSesion(): object {
    return SesionActivaResolverUtils.crearDatosRuta({
      permitirSinSesion: true,
      validarIntegridad: true,
      limpiarSesionCorrupta: false, // No limpiar automáticamente en rutas de gestión
      redireccionAutomatica: false,
      habilitarCache: false // Datos frescos para gestión
    });
  }

  /**
   * Opciones para rutas de solo lectura
   * @returns object Opciones para rutas de lectura
   */
  static opcionesRutasSoloLectura(): object {
    return SesionActivaResolverUtils.crearDatosRuta({
      permitirSinSesion: true,
      validarIntegridad: false, // Solo lectura, no validar
      limpiarSesionCorrupta: false,
      redireccionAutomatica: false,
      habilitarCache: true,
      timeout: 3000 // Más rápido para lectura
    });
  }

  /**
   * Opciones para desarrollo/debug
   * @returns object Opciones para desarrollo
   */
  static opcionesDesarrollo(): object {
    return SesionActivaResolverUtils.crearDatosRuta({
      timeout: 30000, // Mucho tiempo para debug
      maxReintentos: 1, // Menos reintentos en desarrollo
      validarIntegridad: true,
      limpiarSesionCorrupta: false, // No limpiar automáticamente en desarrollo
      redireccionAutomatica: false, // Control manual en desarrollo
      habilitarCache: false // Sin cache para desarrollo
    });
  }
}

// Exportar tipos para uso externo
export type { 
  ResultadoSesionActivaResolver, 
  OpcionesSesionResolver, 
  ConfiguracionRedireccion 
};