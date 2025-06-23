/**
 * Servicio para gestionar los datos del usuario de la aplicación Carrito
 * Maneja perfil, configuraciones personales, estadísticas y actividad del usuario
 * 
 * @author DemWolf
 * @version 1.0
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Importar modelos necesarios
import { 
  Usuario, 
  ConfiguracionUsuario,
  EstadisticasUsuario,
  ActualizacionPerfil,
  TemaVisual,
  TamanoFuente,
  Idioma,
  EstadoUsuario,
  CONFIGURACION_DEFECTO,
  ESTADISTICAS_INICIALES,
  validarUsuario,
  actualizarUltimaActividad,
  obtenerEstadoUsuario,
  puedeCrearNuevaSesion
} from '@core/models/usuario.model';

import { 
  Pais,
  buscarPaisPorCodigo,
  obtenerInfoMoneda
} from '@core/models/pais.model';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  // BehaviorSubject para manejar el estado del usuario de forma reactiva
  private usuarioSubject = new BehaviorSubject<Usuario | null>(null);
  public usuario$ = this.usuarioSubject.asObservable();

  // Estado de carga del usuario
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  public cargando$ = this.cargandoSubject.asObservable();

  // Usuario actual en memoria
  private usuarioActual: Usuario | null = null;

  constructor() {
    // Inicializar el servicio cargando datos del usuario
    this.inicializarUsuario();
  }

  /**
   * Inicializar el servicio cargando usuario existente
   */
  private async inicializarUsuario(): Promise<void> {
    try {
      this.cargandoSubject.next(true);
      
      // Intentar cargar usuario existente
      const usuarioExistente = await this.cargarUsuarioAlmacenado();
      
      if (usuarioExistente && validarUsuario(usuarioExistente)) {
        // Actualizar última actividad
        this.usuarioActual = actualizarUltimaActividad(usuarioExistente);
        await this.guardarUsuario(this.usuarioActual);
        this.usuarioSubject.next(this.usuarioActual);
      } else {
        // No hay usuario configurado
        this.usuarioSubject.next(null);
      }
      
    } catch (error) {
      console.error('Error al inicializar usuario:', error);
      this.usuarioSubject.next(null);
    } finally {
      this.cargandoSubject.next(false);
    }
  }

  /**
   * Verificar si existe un usuario configurado
   * @returns Promise<boolean> true si existe usuario
   */
  async existeUsuario(): Promise<boolean> {
    await this.esperarInicializacion();
    return this.usuarioActual !== null;
  }

  /**
   * Obtener datos completos del usuario actual
   * @returns Promise<Usuario | null> usuario actual o null si no existe
   */
  async obtenerUsuarioActual(): Promise<Usuario | null> {
    await this.esperarInicializacion();
    return this.usuarioActual;
  }

  /**
   * Obtener solo información básica del usuario (nombre, país)
   * @returns Promise<{nombre: string, pais: string, moneda: string} | null>
   */
  async obtenerInfoBasica(): Promise<{nombre: string, pais: string, moneda: string} | null> {
    await this.esperarInicializacion();
    
    if (!this.usuarioActual) {
      return null;
    }

    return {
      nombre: this.usuarioActual.nombre,
      pais: this.usuarioActual.pais,
      moneda: this.usuarioActual.moneda
    };
  }

  /**
   * Obtener configuraciones del usuario
   * @returns Promise<ConfiguracionUsuario | null> configuraciones del usuario
   */
  async obtenerConfiguraciones(): Promise<ConfiguracionUsuario | null> {
    await this.esperarInicializacion();
    return this.usuarioActual?.configuraciones || null;
  }

  /**
   * Obtener estadísticas del usuario
   * @returns Promise<EstadisticasUsuario | null> estadísticas del usuario
   */
  async obtenerEstadisticas(): Promise<EstadisticasUsuario | null> {
    await this.esperarInicializacion();
    return this.usuarioActual?.estadisticas || null;
  }

  /**
   * Obtener estado actual del usuario (activo, inactivo, etc.)
   * @returns Promise<EstadoUsuario> estado del usuario
   */
  async obtenerEstadoUsuario(): Promise<EstadoUsuario> {
    await this.esperarInicializacion();
    
    if (!this.usuarioActual) {
      return EstadoUsuario.NUEVO;
    }

    return obtenerEstadoUsuario(this.usuarioActual);
  }

  /**
   * Verificar si el usuario puede crear una nueva sesión de compra
   * @returns Promise<boolean> true si puede crear nueva sesión
   */
  async puedeCrearNuevaSesion(): Promise<boolean> {
    await this.esperarInicializacion();
    
    if (!this.usuarioActual) {
      return false;
    }

    return puedeCrearNuevaSesion(this.usuarioActual);
  }

  /**
   * Obtener información del país del usuario
   * @returns Promise<Pais | null> información del país
   */
  async obtenerInfoPais(): Promise<Pais | null> {
    await this.esperarInicializacion();
    
    if (!this.usuarioActual) {
      return null;
    }

    return buscarPaisPorCodigo(this.usuarioActual.pais);
  }

  /**
   * Obtener información de moneda del usuario
   * @returns Promise<{moneda: string, simbolo: string, formato: string} | null>
   */
  async obtenerInfoMoneda(): Promise<{moneda: string, simbolo: string, formato: string} | null> {
    await this.esperarInicializacion();
    
    if (!this.usuarioActual) {
      return null;
    }

    return obtenerInfoMoneda(this.usuarioActual.pais);
  }

  /**
   * Actualizar perfil básico del usuario
   * @param actualizacion Datos a actualizar
   * @returns Promise<boolean> true si se actualizó correctamente
   */
  async actualizarPerfil(actualizacion: ActualizacionPerfil): Promise<boolean> {
    try {
      await this.esperarInicializacion();
      
      if (!this.usuarioActual) {
        throw new Error('No hay usuario para actualizar');
      }

      // Crear usuario actualizado
      const usuarioActualizado: Usuario = {
        ...this.usuarioActual,
        ultimaActividad: new Date()
      };

      // Actualizar nombre si se proporciona
      if (actualizacion.nombre !== undefined) {
        if (!this.validarNombre(actualizacion.nombre)) {
          throw new Error('Nombre inválido');
        }
        usuarioActualizado.nombre = actualizacion.nombre;
      }

      // Actualizar país si se proporciona
      if (actualizacion.pais !== undefined) {
        const paisInfo = buscarPaisPorCodigo(actualizacion.pais);
        if (!paisInfo) {
          throw new Error('País inválido');
        }
        usuarioActualizado.pais = actualizacion.pais;
        usuarioActualizado.moneda = paisInfo.moneda;
      }

      // Actualizar configuraciones si se proporcionan
      if (actualizacion.configuraciones) {
        usuarioActualizado.configuraciones = {
          ...usuarioActualizado.configuraciones,
          ...actualizacion.configuraciones
        };
      }

      // Validar usuario completo
      if (!validarUsuario(usuarioActualizado)) {
        throw new Error('Usuario actualizado no es válido');
      }

      // Guardar cambios
      await this.guardarUsuario(usuarioActualizado);
      this.usuarioActual = usuarioActualizado;
      this.usuarioSubject.next(usuarioActualizado);

      return true;

    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return false;
    }
  }

  /**
   * Actualizar configuraciones específicas del usuario
   * @param configuraciones Configuraciones a actualizar
   * @returns Promise<boolean> true si se actualizó correctamente
   */
  async actualizarConfiguraciones(configuraciones: Partial<ConfiguracionUsuario>): Promise<boolean> {
    return this.actualizarPerfil({ configuraciones });
  }

  /**
   * Actualizar estadísticas del usuario
   * @param estadisticas Estadísticas a actualizar
   * @returns Promise<boolean> true si se actualizó correctamente
   */
  async actualizarEstadisticas(estadisticas: Partial<EstadisticasUsuario>): Promise<boolean> {
    try {
      await this.esperarInicializacion();
      
      if (!this.usuarioActual) {
        throw new Error('No hay usuario para actualizar estadísticas');
      }

      // Actualizar estadísticas
      this.usuarioActual.estadisticas = {
        ...this.usuarioActual.estadisticas,
        ...estadisticas
      };

      // Actualizar última actividad
      this.usuarioActual.ultimaActividad = new Date();

      // Guardar cambios
      await this.guardarUsuario(this.usuarioActual);
      this.usuarioSubject.next(this.usuarioActual);

      return true;

    } catch (error) {
      console.error('Error al actualizar estadísticas:', error);
      return false;
    }
  }

  /**
   * Registrar nueva actividad del usuario
   * @returns Promise<void>
   */
  async registrarActividad(): Promise<void> {
    try {
      await this.esperarInicializacion();
      
      if (this.usuarioActual) {
        this.usuarioActual = actualizarUltimaActividad(this.usuarioActual);
        await this.guardarUsuario(this.usuarioActual);
        this.usuarioSubject.next(this.usuarioActual);
      }
      
    } catch (error) {
      console.error('Error al registrar actividad:', error);
    }
  }

  /**
   * Cambiar tema visual del usuario
   * @param tema Nuevo tema visual
   * @returns Promise<boolean> true si se cambió correctamente
   */
  async cambiarTema(tema: TemaVisual): Promise<boolean> {
    return this.actualizarConfiguraciones({ temaVisual: tema });
  }

  /**
   * Cambiar tamaño de fuente del usuario
   * @param tamano Nuevo tamaño de fuente
   * @returns Promise<boolean> true si se cambió correctamente
   */
  async cambiarTamanoFuente(tamano: TamanoFuente): Promise<boolean> {
    return this.actualizarConfiguraciones({ tamanoFuente: tamano });
  }

  /**
   * Cambiar idioma del usuario
   * @param idioma Nuevo idioma
   * @returns Promise<boolean> true si se cambió correctamente
   */
  async cambiarIdioma(idioma: Idioma): Promise<boolean> {
    return this.actualizarConfiguraciones({ idioma: idioma });
  }

  /**
   * Habilitar o deshabilitar notificaciones
   * @param habilitadas true para habilitar, false para deshabilitar
   * @returns Promise<boolean> true si se cambió correctamente
   */
  async configurarNotificaciones(habilitadas: boolean): Promise<boolean> {
    return this.actualizarConfiguraciones({ notificacionesHabilitadas: habilitadas });
  }

  /**
   * Eliminar todos los datos del usuario (para reset completo)
   * @returns Promise<boolean> true si se eliminó correctamente
   */
  async eliminarUsuario(): Promise<boolean> {
    try {
      // Eliminar datos almacenados
      await this.eliminarUsuarioAlmacenado();
      
      // Limpiar memoria
      this.usuarioActual = null;
      this.usuarioSubject.next(null);

      return true;

    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      return false;
    }
  }

  // MÉTODOS PRIVADOS

  /**
   * Validar formato del nombre de usuario
   * @param nombre Nombre a validar
   * @returns boolean true si es válido
   */
  private validarNombre(nombre: string): boolean {
    // Validar longitud
    if (nombre.length < 2 || nombre.length > 30) {
      return false;
    }

    // Validar caracteres (solo letras, números y espacios)
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+$/;
    return regex.test(nombre);
  }

  /**
   * Esperar a que termine la inicialización del servicio
   */
  private async esperarInicializacion(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.cargandoSubject.value) {
        resolve();
      } else {
        const subscription = this.cargando$.subscribe((cargando) => {
          if (!cargando) {
            subscription.unsubscribe();
            resolve();
          }
        });
      }
    });
  }

  /**
   * Cargar usuario desde almacenamiento local
   * @returns Promise<Usuario | null> usuario cargado
   */
  private async cargarUsuarioAlmacenado(): Promise<Usuario | null> {
    try {
      // Por ahora cargamos desde localStorage
      // Más adelante esto se conectará con AlmacenamientoService encriptado
      const usuarioString = localStorage.getItem('carrito_usuario');
      
      if (!usuarioString) {
        return null;
      }

      const usuario = JSON.parse(usuarioString);
      
      // Convertir strings de fecha a objetos Date
      usuario.fechaCreacion = new Date(usuario.fechaCreacion);
      usuario.ultimaActividad = new Date(usuario.ultimaActividad);
      
      if (usuario.estadisticas.ultimaCompra) {
        usuario.estadisticas.ultimaCompra = new Date(usuario.estadisticas.ultimaCompra);
      }

      return usuario;
      
    } catch (error) {
      console.error('Error al cargar usuario almacenado:', error);
      return null;
    }
  }

  /**
   * Guardar usuario en almacenamiento local
   * @param usuario Usuario a guardar
   */
  private async guardarUsuario(usuario: Usuario): Promise<void> {
    try {
      // Validar antes de guardar
      if (!validarUsuario(usuario)) {
        throw new Error('Usuario inválido para guardar');
      }

      // Por ahora guardamos en localStorage
      // Más adelante esto se conectará con AlmacenamientoService encriptado
      const usuarioString = JSON.stringify(usuario);
      localStorage.setItem('carrito_usuario', usuarioString);
      
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      throw error;
    }
  }

  /**
   * Eliminar usuario del almacenamiento local
   */
  private async eliminarUsuarioAlmacenado(): Promise<void> {
    try {
      localStorage.removeItem('carrito_usuario');
    } catch (error) {
      console.error('Error al eliminar usuario almacenado:', error);
      throw error;
    }
  }
}