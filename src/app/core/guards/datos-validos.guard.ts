/**
 * Guard para validar datos antes de navegación
 * 
 * Previene navegación si hay datos no guardados o inválidos.
 * Protege contra pérdida de información durante la compra.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 * @file src/app/core/guards/datos-validos.guard.ts
 */

import { Injectable } from '@angular/core';
import { CanActivate, CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { AlmacenamientoService } from '../services/almacenamiento.service';
import { SeguridadService } from '../services/seguridad.service';
import { AlertController } from '@ionic/angular';

/**
 * Interfaz para componentes que pueden tener datos no guardados
 */
export interface ComponenteConDatosNoGuardados {
  tieneDatosNoGuardados(): boolean | Observable<boolean>;
  guardarDatos?(): Observable<boolean>;
}

@Injectable({
  providedIn: 'root'
})
export class DatosValidosGuard implements CanActivate, CanDeactivate<ComponenteConDatosNoGuardados> {

  constructor(
    private almacenamientoService: AlmacenamientoService,
    private seguridadService: SeguridadService,
    private alertController: AlertController
  ) {}

  /**
   * Verifica si se puede activar una ruta
   * @param route Ruta activada
   * @param state Estado del router
   * @returns boolean | Observable<boolean> Si se puede activar
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    
    console.log('🔒 Validando acceso a ruta:', state.url);

    // Verificar si el servicio de almacenamiento está inicializado
    return from(this.almacenamientoService.estaInicializado().then(inicializado => {
      if (!inicializado) {
        console.warn('⚠️ Servicio de almacenamiento no inicializado');
        return false;
      }

      // Verificar integridad de datos críticos
      return this.verificarIntegridadDatos().then(integridadValida => {
        if (!integridadValida) {
          console.error('❌ Integridad de datos comprometida');
          this.mostrarAlertaIntegridad();
          return false;
        }

        // Validaciones específicas por ruta
        return this.validarRutaEspecifica(route, state);
      });
    }).catch(error => {
      console.error('❌ Error validando acceso a ruta:', error);
      return false;
    }));
  }

  /**
   * Verifica si se puede salir de un componente
   * @param component Componente actual
   * @param currentRoute Ruta actual
   * @param currentState Estado actual
   * @param nextState Próximo estado
   * @returns boolean | Observable<boolean> Si se puede desactivar
   */
  canDeactivate(
    component: ComponenteConDatosNoGuardados,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ): Observable<boolean> | boolean {

    console.log('🚪 Verificando si se puede salir de:', currentState.url);

    // Verificar si hay datos no guardados
    const tieneDatosNoGuardados = component.tieneDatosNoGuardados();

    if (typeof tieneDatosNoGuardados === 'boolean') {
      return tieneDatosNoGuardados ? from(this.confirmarSalida(component)) : of(true);
    }

    // Si es Observable, manejarlo apropiadamente
    return tieneDatosNoGuardados.pipe(
      map(tienedatos => tienedatos ? false : true),
      catchError(() => of(true))
    );
  }

  /**
   * Verifica integridad de datos críticos
   * @private
   */
  private async verificarIntegridadDatos(): Promise<boolean> {
    try {
      // Verificar configuración
      const configuracion = await this.almacenamientoService.obtenerConfiguracion().toPromise();
      if (!configuracion || !configuracion.esValida()) {
        return false;
      }

      // Verificar usuario si existe
      const usuario = await this.almacenamientoService.obtenerUsuario().toPromise();
      if (usuario && !usuario.esValido()) {
        return false;
      }

      // Verificar sesión activa si existe
      const sesionActiva = await this.almacenamientoService.obtenerSesionActiva().toPromise();
      if (sesionActiva && !sesionActiva.esValida()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verificando integridad:', error);
      return false;
    }
  }

  /**
   * Validaciones específicas por ruta
   * @private
   */
  private async validarRutaEspecifica(
    route: ActivatedRouteSnapshot, 
    state: RouterStateSnapshot
  ): Promise<boolean> {
    
    const rutaUrl = state.url;

    try {
      // Validación para rutas de compra activa
      if (rutaUrl.includes('/compra-activa')) {
        const sesionActiva = await this.almacenamientoService.obtenerSesionActiva().toPromise();
        if (!sesionActiva) {
          console.warn('⚠️ No hay sesión activa para compra');
          return false;
        }
        return true;
      }

      // Validación para historial (verificar que hay datos)
      if (rutaUrl.includes('/historial')) {
        const sesiones = await this.almacenamientoService.obtenerSesiones().toPromise();
        // Permitir acceso aunque no haya sesiones (puede ser primera vez)
        return true;
      }

      // Para otras rutas, permitir acceso
      return true;

    } catch (error) {
      console.error('Error en validación específica de ruta:', error);
      return false;
    }
  }

  /**
   * Confirma si el usuario quiere salir sin guardar
   * @private
   */
  private async confirmarSalida(component: ComponenteConDatosNoGuardados): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Datos no guardados',
      message: 'Tienes cambios sin guardar. ¿Qué deseas hacer?',
      buttons: [
        {
          text: 'Descartar cambios',
          role: 'destructive',
          handler: () => {
            console.log('🗑️ Usuario decidió descartar cambios');
            return true;
          }
        },
        {
          text: 'Guardar y salir',
          handler: async () => {
            if (component.guardarDatos) {
              try {
                const guardado = await component.guardarDatos().toPromise();
                console.log(guardado ? '💾 Datos guardados exitosamente' : '❌ Error guardando datos');
                return guardado;
              } catch (error) {
                console.error('❌ Error guardando datos:', error);
                return false;
              }
            }
            return true;
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.log('↩️ Usuario canceló la salida');
            return false;
          }
        }
      ]
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role !== 'cancel';
  }

  /**
   * Muestra alerta de integridad comprometida
   * @private
   */
  private async mostrarAlertaIntegridad(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error de integridad',
      message: 'Se detectaron problemas en los datos de la aplicación. ' +
               'Es recomendable reiniciar la aplicación.',
      buttons: [
        {
          text: 'Entendido',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  /**
   * Valida parámetros de ruta
   * @param route Ruta con parámetros
   * @returns boolean Si los parámetros son válidos
   */
  public validarParametrosRuta(route: ActivatedRouteSnapshot): boolean {
    try {
      // Validar ID de sesión si existe
      const sesionId = route.params['sesionId'];
      if (sesionId) {
        // Validar formato de ID (debe ser alfanumérico)
        if (!/^[a-zA-Z0-9_]+$/.test(sesionId)) {
          console.warn('⚠️ ID de sesión con formato inválido:', sesionId);
          return false;
        }

        // Validar longitud del ID
        if (sesionId.length < 5 || sesionId.length > 100) {
          console.warn('⚠️ ID de sesión con longitud inválida:', sesionId);
          return false;
        }
      }

      // Validar otros parámetros si existen
      const productoId = route.params['productoId'];
      if (productoId) {
        if (!/^[a-zA-Z0-9_]+$/.test(productoId)) {
          console.warn('⚠️ ID de producto con formato inválido:', productoId);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error validando parámetros de ruta:', error);
      return false;
    }
  }

  /**
   * Limpia datos temporales antes de navegación
   * @param rutaDestino URL de destino
   */
  public limpiarDatosTemporales(rutaDestino: string): void {
    try {
      // Limpiar solo si no vamos a rutas de compra activa
      if (!rutaDestino.includes('/compra-activa')) {
        console.log('🧹 Limpiando datos temporales para navegación');
        
        // Aquí se podrían limpiar caches específicos
        // Por ejemplo, limpiar cache de autocompletado, etc.
      }
    } catch (error) {
      console.error('❌ Error limpiando datos temporales:', error);
    }
  }

  /**
   * Verifica permisos de usuario para ruta específica
   * @param ruta Ruta a verificar
   * @returns boolean Si tiene permisos
   */
  public verificarPermisos(ruta: string): boolean {
    try {
      // En esta app offline, todos los permisos son locales
      // Se podrían verificar configuraciones específicas del usuario
      
      // Por ejemplo, verificar si el modo debug está habilitado para rutas de debug
      if (ruta.includes('/debug')) {
        // Verificar configuración de debug
        return false; // Por seguridad, deshabilitado por defecto
      }

      return true;
    } catch (error) {
      console.error('❌ Error verificando permisos:', error);
      return false;
    }
  }

  /**
   * Obtiene información de debug del guard
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    return {
      nombre: 'DatosValidosGuard',
      version: '1.0.0',
      ultimaVerificacion: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
  }
}