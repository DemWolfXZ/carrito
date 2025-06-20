/**
 * Guard para verificar sesión activa de compra
 * 
 * Protege rutas que requieren una sesión de compra activa.
 * Redirige al inicio si no hay sesión activa válida.
 * Valida integridad de la sesión antes de permitir acceso.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

import { AlmacenamientoService } from '../services/almacenamiento.service';
import { SeguridadService } from '../services/seguridad.service';
import { SesionCompra } from '../models/sesion-compra.model';

/**
 * Interfaz para resultado de validación de sesión
 */
interface ResultadoValidacionSesion {
  valida: boolean;
  sesion?: SesionCompra;
  motivo?: string;
  accionRecomendada?: 'crear_nueva' | 'recuperar' | 'limpiar';
}

@Injectable({
  providedIn: 'root'
})
export class SesionActivaGuard implements CanActivate, CanActivateChild {

  constructor(
    private almacenamientoService: AlmacenamientoService,
    private seguridadService: SeguridadService,
    private router: Router
  ) {
    console.log('🛡️ Guard de sesión activa inicializado');
  }

  /**
   * Verifica si se puede activar la ruta
   * @param route Ruta activada
   * @param state Estado del router
   * @returns Observable<boolean> True si puede activar
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('🔍 Verificando sesión activa para ruta:', state.url);
    
    return this.validarSesionActiva().pipe(
      map(resultado => {
        if (resultado.valida) {
          console.log('✅ Sesión activa válida encontrada');
          return true;
        }

        // Manejar sesión inválida
        return this.manejarSesionInvalida(resultado, state.url);
      }),
      catchError(error => {
        console.error('❌ Error validando sesión activa:', error);
        return this.manejarErrorValidacion(error, state.url);
      })
    );
  }

  /**
   * Verifica si se pueden activar rutas hijas
   * @param childRoute Ruta hija
   * @param state Estado del router
   * @returns Observable<boolean> True si puede activar
   */
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.canActivate(childRoute, state);
  }

  /**
   * Valida la sesión activa actual
   * @private
   * @returns Observable<ResultadoValidacionSesion> Resultado de validación
   */
  private validarSesionActiva(): Observable<ResultadoValidacionSesion> {
    return this.almacenamientoService.obtenerSesionActiva().pipe(
      map(sesion => {
        // Verificar si existe sesión
        if (!sesion) {
          return {
            valida: false,
            motivo: 'No hay sesión activa',
            accionRecomendada: 'crear_nueva' as const
          };
        }

        // Validar integridad de la sesión
        const validacionIntegridad = this.validarIntegridadSesion(sesion);
        if (!validacionIntegridad.valida) {
          return {
            valida: false,
            sesion,
            motivo: validacionIntegridad.motivo,
            accionRecomendada: 'limpiar' as const
          };
        }

        // Verificar si la sesión ya está completada
        if (sesion.completada) {
          return {
            valida: false,
            sesion,
            motivo: 'La sesión ya está completada',
            accionRecomendada: 'crear_nueva' as const
          };
        }

        // Verificar si la sesión es del día actual
        const validacionFecha = this.validarFechaSesion(sesion);
        if (!validacionFecha.valida) {
          return {
            valida: false,
            sesion,
            motivo: validacionFecha.motivo,
            accionRecomendada: 'recuperar' as const
          };
        }

        // Sesión válida
        return {
          valida: true,
          sesion,
          motivo: 'Sesión activa válida'
        };
      }),
      tap(resultado => {
        if (resultado.valida) {
          console.log('✅ Validación de sesión exitosa');
        } else {
          console.warn('⚠️ Sesión inválida:', resultado.motivo);
        }
      })
    );
  }

  /**
   * Valida la integridad de datos de la sesión
   * @private
   * @param sesion Sesión a validar
   * @returns {valida: boolean, motivo?: string} Resultado de validación
   */
  private validarIntegridadSesion(sesion: SesionCompra): {valida: boolean, motivo?: string} {
    try {
      // Verificar campos obligatorios
      if (!sesion.id || !sesion.nombreSupermercado || !sesion.fecha || !sesion.horaInicio) {
        return {
          valida: false,
          motivo: 'Faltan campos obligatorios en la sesión'
        };
      }

      // Validar formato de ID
      if (typeof sesion.id !== 'string' || sesion.id.length < 5) {
        return {
          valida: false,
          motivo: 'ID de sesión inválido'
        };
      }

      // Validar nombre del supermercado
      const validacionNombre = this.seguridadService.validarEntrada(
        sesion.nombreSupermercado, 
        'nombreSupermercado'
      );
      
      if (!validacionNombre) {
        return {
          valida: false,
          motivo: 'Nombre de supermercado contiene caracteres no válidos'
        };
      }

      // Validar formato de fecha
      const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;
      if (!formatoFecha.test(sesion.fecha)) {
        return {
          valida: false,
          motivo: 'Formato de fecha inválido'
        };
      }

      // Validar formato de hora
      const formatoHora = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!formatoHora.test(sesion.horaInicio)) {
        return {
          valida: false,
          motivo: 'Formato de hora inválido'
        };
      }

      // Validar productos (que sean válidos si existen)
      if (sesion.productos && sesion.productos.length > 0) {
        for (const producto of sesion.productos) {
          if (!producto.nombre || producto.precioUnitario <= 0 || producto.cantidad <= 0) {
            return {
              valida: false,
              motivo: 'Productos con datos inválidos'
            };
          }
        }
      }

      // Validar total general
      if (typeof sesion.totalGeneral !== 'number' || sesion.totalGeneral < 0) {
        return {
          valida: false,
          motivo: 'Total general inválido'
        };
      }

      return { valida: true };

    } catch (error) {
      console.error('Error validando integridad de sesión:', error);
      return {
        valida: false,
        motivo: 'Error interno de validación'
      };
    }
  }

  /**
   * Valida la fecha de la sesión
   * @private
   * @param sesion Sesión a validar
   * @returns {valida: boolean, motivo?: string} Resultado de validación
   */
  private validarFechaSesion(sesion: SesionCompra): {valida: boolean, motivo?: string} {
    try {
      const fechaSesion = new Date(sesion.fecha);
      const hoy = new Date();
      
      // Establecer horas a 0 para comparar solo fechas
      fechaSesion.setHours(0, 0, 0, 0);
      hoy.setHours(0, 0, 0, 0);

      const diferenciaMs = hoy.getTime() - fechaSesion.getTime();
      const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));

      // Permitir sesiones del día actual y hasta 1 día anterior
      if (diferenciaDias < 0) {
        return {
          valida: false,
          motivo: 'La sesión es de una fecha futura'
        };
      }

      if (diferenciaDias > 1) {
        return {
          valida: false,
          motivo: 'La sesión es muy antigua'
        };
      }

      // Si es de ayer, verificar que no sea muy tarde
      if (diferenciaDias === 1) {
        const [hora, minuto] = sesion.horaInicio.split(':').map(Number);
        const horaInicio = hora + (minuto / 60);
        
        // Si empezó después de las 20:00 de ayer, considerarla válida
        if (horaInicio < 20) {
          return {
            valida: false,
            motivo: 'Sesión de ayer muy antigua'
          };
        }
      }

      return { valida: true };

    } catch (error) {
      console.error('Error validando fecha de sesión:', error);
      return {
        valida: false,
        motivo: 'Error procesando fecha de sesión'
      };
    }
  }

  /**
   * Maneja sesión inválida
   * @private
   * @param resultado Resultado de validación
   * @param urlDestino URL a la que intentaba acceder
   * @returns boolean False (bloquea navegación)
   */
  private manejarSesionInvalida(resultado: ResultadoValidacionSesion, urlDestino: string): boolean {
    console.warn('🚫 Acceso bloqueado:', resultado.motivo);

    switch (resultado.accionRecomendada) {
      case 'crear_nueva':
        this.redirigirANuevaSesion('No hay sesión activa. Inicia una nueva compra.');
        break;

      case 'limpiar':
        this.limpiarSesionCorrupta(resultado.sesion!);
        this.redirigirAInicio('Sesión corrupta eliminada. Inicia una nueva compra.');
        break;

      case 'recuperar':
        this.mostrarOpcionRecuperacion(resultado.sesion!);
        break;

      default:
        this.redirigirAInicio('Acceso denegado. Vuelve al inicio.');
    }

    return false;
  }

  /**
   * Maneja errores durante la validación
   * @private
   * @param error Error ocurrido
   * @param urlDestino URL a la que intentaba acceder
   * @returns Observable<boolean> False (bloquea navegación)
   */
  private manejarErrorValidacion(error: any, urlDestino: string): Observable<boolean> {
    console.error('💥 Error crítico en guard de sesión activa:', error);
    
    // En caso de error, redirigir al inicio por seguridad
    this.redirigirAInicio('Error verificando sesión. Por seguridad, vuelve al inicio.');
    
    return of(false);
  }

  /**
   * Redirige a la página de nueva sesión
   * @private
   * @param mensaje Mensaje para mostrar al usuario
   */
  private redirigirANuevaSesion(mensaje: string): void {
    console.log('🔄 Redirigiendo a nueva sesión:', mensaje);
    
    this.router.navigate(['/nueva-sesion'], {
      queryParams: { 
        mensaje: mensaje,
        razon: 'no_sesion_activa'
      }
    });
  }

  /**
   * Redirige a la página de inicio
   * @private
   * @param mensaje Mensaje para mostrar al usuario
   */
  private redirigirAInicio(mensaje: string): void {
    console.log('🏠 Redirigiendo al inicio:', mensaje);
    
    this.router.navigate(['/inicio'], {
      queryParams: { 
        mensaje: mensaje,
        razon: 'sesion_invalida'
      }
    });
  }

  /**
   * Limpia sesión corrupta del almacenamiento
   * @private
   * @param sesion Sesión a limpiar
   */
  private limpiarSesionCorrupta(sesion: SesionCompra): void {
    try {
      console.log('🧹 Limpiando sesión corrupta:', sesion.id);
      
      this.almacenamientoService.limpiarSesionActiva().subscribe({
        next: (exito) => {
          if (exito) {
            console.log('✅ Sesión corrupta eliminada exitosamente');
          } else {
            console.error('❌ Error eliminando sesión corrupta');
          }
        },
        error: (error) => {
          console.error('💥 Error crítico eliminando sesión corrupta:', error);
        }
      });
    } catch (error) {
      console.error('Error en limpieza de sesión corrupta:', error);
    }
  }

  /**
   * Muestra opciones para recuperar sesión antigua
   * @private
   * @param sesion Sesión a recuperar
   */
  private mostrarOpcionRecuperacion(sesion: SesionCompra): void {
    console.log('🔄 Mostrando opciones de recuperación para sesión:', sesion.id);
    
    // Navegar a página especial de recuperación con datos de la sesión
    this.router.navigate(['/inicio'], {
      queryParams: { 
        recuperar: 'true',
        sesionId: sesion.id,
        mensaje: 'Tienes una sesión de compra pendiente. ¿Deseas continuarla?'
      }
    });
  }

  // ==================== MÉTODOS PÚBLICOS AUXILIARES ====================

  /**
   * Verifica si hay sesión activa válida (sin redirigir)
   * @returns Observable<boolean> True si hay sesión válida
   */
  public verificarSesionActivaSinRedirigir(): Observable<boolean> {
    return this.validarSesionActiva().pipe(
      map(resultado => resultado.valida),
      catchError(() => of(false))
    );
  }

  /**
   * Obtiene información de la sesión activa si es válida
   * @returns Observable<SesionCompra | null> Sesión válida o null
   */
  public obtenerSesionActivaValida(): Observable<SesionCompra | null> {
    return this.validarSesionActiva().pipe(
      map(resultado => resultado.valida ? resultado.sesion || null : null),
      catchError(() => of(null))
    );
  }

  /**
   * Fuerza validación de sesión activa para uso externo
   * @returns Observable<ResultadoValidacionSesion> Resultado detallado
   */
  public forzarValidacionSesion(): Observable<ResultadoValidacionSesion> {
    return this.validarSesionActiva();
  }

  /**
   * Obtiene información de debug del guard
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    return {
      guardActivo: true,
      tipoGuard: 'SesionActivaGuard',
      validacionesRealizadas: 'integridad, fecha, completada',
      accionesDisponibles: ['crear_nueva', 'recuperar', 'limpiar'],
      timestamp: new Date().toISOString()
    };
  }
}