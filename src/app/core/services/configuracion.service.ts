/**
 * Servicio para gestionar la configuración inicial y general de la aplicación Carrito
 * Maneja la verificación de primer inicio, configuraciones de usuario y países soportados
 * 
 * @author DemWolf
 * @version 1.0
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Importar modelos necesarios
import { 
  ConfiguracionApp, 
  CONFIGURACION_INICIAL, 
  crearConfiguracionInicial,
  validarConfiguracion,
  marcarConfiguracionCompleta,
  EstadoConfiguracion,
  obtenerEstadoConfiguracion,
  ActualizacionConfiguracion
} from '@core/models/configuracion.model';

import { 
  Pais, 
  PAISES_SOPORTADOS, 
  buscarPaisPorCodigo,
  obtenerPaisesActivos,
  validarCodigoPais,
  obtenerInfoMoneda
} from '@core/models/pais.model';

import { 
  Usuario, 
  DatosConfiguracionInicial,
  crearNuevoUsuario,
  validarUsuario
} from '@core/models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {

  // BehaviorSubject para manejar el estado de configuración de forma reactiva
  private configuracionSubject = new BehaviorSubject<ConfiguracionApp | null>(null);
  public configuracion$ = this.configuracionSubject.asObservable();

  // Estado de carga de la configuración
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  public cargando$ = this.cargandoSubject.asObservable();

  // Configuración actual en memoria
  private configuracionActual: ConfiguracionApp | null = null;

  constructor() {
    // Inicializar el servicio cargando la configuración
    this.inicializarConfiguracion();
  }

  /**
   * Inicializar el servicio cargando configuración existente o creando una nueva
   */
  private async inicializarConfiguracion(): Promise<void> {
    try {
      this.cargandoSubject.next(true);
      
      // Intentar cargar configuración existente
      const configExistente = await this.cargarConfiguracionAlmacenada();
      
      if (configExistente && validarConfiguracion(configExistente)) {
        // Usar configuración existente
        this.configuracionActual = configExistente;
        this.configuracionSubject.next(configExistente);
      } else {
        // Crear configuración inicial
        const nuevaConfig = crearConfiguracionInicial();
        await this.guardarConfiguracion(nuevaConfig);
        this.configuracionActual = nuevaConfig;
        this.configuracionSubject.next(nuevaConfig);
      }
      
    } catch (error) {
      console.error('Error al inicializar configuración:', error);
      // En caso de error, usar configuración por defecto
      this.configuracionActual = CONFIGURACION_INICIAL;
      this.configuracionSubject.next(CONFIGURACION_INICIAL);
    } finally {
      this.cargandoSubject.next(false);
    }
  }

  /**
   * Verificar si es la primera vez que se abre la aplicación
   * @returns Promise<boolean> true si es primer inicio
   */
  async esPrimerInicio(): Promise<boolean> {
    await this.esperarInicializacion();
    return this.configuracionActual?.primerInicio ?? true;
  }

  /**
   * Verificar si la configuración inicial está completa
   * @returns Promise<boolean> true si está completa
   */
  async esConfiguracionCompleta(): Promise<boolean> {
    await this.esperarInicializacion();
    return this.configuracionActual?.configuracionCompleta ?? false;
  }

  /**
   * Obtener el estado actual de la configuración
   * @returns Promise<EstadoConfiguracion> estado de la configuración
   */
  async obtenerEstadoConfiguracion(): Promise<EstadoConfiguracion> {
    await this.esperarInicializacion();
    
    if (!this.configuracionActual) {
      return EstadoConfiguracion.ERROR;
    }
    
    return obtenerEstadoConfiguracion(this.configuracionActual);
  }

  /**
   * Obtener lista completa de países soportados
   * @returns Array<Pais> lista de países disponibles
   */
  obtenerPaisesSoportados(): Pais[] {
    return PAISES_SOPORTADOS;
  }

  /**
   * Obtener solo países activos (disponibles para selección)
   * @returns Array<Pais> países activos
   */
  obtenerPaisesActivos(): Pais[] {
    return obtenerPaisesActivos();
  }

  /**
   * Buscar información de un país por su código ISO
   * @param codigo Código ISO del país (ej: 'AR', 'CL')
   * @returns Pais | null país encontrado o null
   */
  obtenerPaisPorCodigo(codigo: string): Pais | null {
    return buscarPaisPorCodigo(codigo);
  }

  /**
   * Validar que un código de país sea válido y esté soportado
   * @param codigo Código ISO del país
   * @returns boolean true si es válido
   */
  validarCodigoPais(codigo: string): boolean {
    return validarCodigoPais(codigo);
  }

  /**
   * Obtener información de moneda para un país específico
   * @param codigoPais Código ISO del país
   * @returns objeto con información de moneda o null
   */
  obtenerInfoMonedaPais(codigoPais: string): { moneda: string; simbolo: string; formato: string } | null {
    return obtenerInfoMoneda(codigoPais);
  }

  /**
   * Guardar configuración inicial completa del usuario
   * @param datosIniciales Datos de la configuración inicial
   * @returns Promise<boolean> true si se guardó correctamente
   */
  async guardarConfiguracionInicial(datosIniciales: DatosConfiguracionInicial): Promise<boolean> {
    try {
      // Validar datos de entrada
      if (!this.validarDatosIniciales(datosIniciales)) {
        throw new Error('Datos de configuración inicial inválidos');
      }

      // Crear usuario con los datos iniciales
      const nuevoUsuario = crearNuevoUsuario(datosIniciales);
      
      // Obtener información de moneda del país seleccionado
      const infoMoneda = this.obtenerInfoMonedaPais(datosIniciales.codigoPais);
      if (infoMoneda) {
        nuevoUsuario.moneda = infoMoneda.moneda;
      }

      // Guardar usuario (esto debería ir al servicio de usuario cuando lo creemos)
      await this.guardarUsuarioInicial(nuevoUsuario);

      // Marcar configuración como completa
      if (this.configuracionActual) {
        this.configuracionActual = marcarConfiguracionCompleta(this.configuracionActual);
        await this.guardarConfiguracion(this.configuracionActual);
        this.configuracionSubject.next(this.configuracionActual);
      }

      return true;

    } catch (error) {
      console.error('Error al guardar configuración inicial:', error);
      return false;
    }
  }

  /**
   * Obtener configuración actual de la aplicación
   * @returns Promise<ConfiguracionApp | null> configuración actual
   */
  async obtenerConfiguracionActual(): Promise<ConfiguracionApp | null> {
    await this.esperarInicializacion();
    return this.configuracionActual;
  }

  /**
   * Actualizar una parte específica de la configuración
   * @param actualizacion Datos de actualización
   * @returns Promise<boolean> true si se actualizó correctamente
   */
  async actualizarConfiguracion(actualizacion: ActualizacionConfiguracion): Promise<boolean> {
    try {
      await this.esperarInicializacion();
      
      if (!this.configuracionActual) {
        throw new Error('No hay configuración actual para actualizar');
      }

      // Actualizar la configuración según el tipo
      switch (actualizacion.tipo) {
        case 'globales':
          this.configuracionActual.configuraciones = {
            ...this.configuracionActual.configuraciones,
            ...actualizacion.configuraciones
          };
          break;
        case 'limites':
          this.configuracionActual.limites = {
            ...this.configuracionActual.limites,
            ...actualizacion.configuraciones
          };
          break;
        case 'seguridad':
          this.configuracionActual.seguridad = {
            ...this.configuracionActual.seguridad,
            ...actualizacion.configuraciones
          };
          break;
        case 'mantenimiento':
          this.configuracionActual.mantenimiento = {
            ...this.configuracionActual.mantenimiento,
            ...actualizacion.configuraciones
          };
          break;
      }

      // Actualizar timestamp
      this.configuracionActual.ultimaActualizacion = new Date();

      // Validar configuración actualizada
      if (!validarConfiguracion(this.configuracionActual)) {
        throw new Error('Configuración actualizada no es válida');
      }

      // Guardar cambios
      await this.guardarConfiguracion(this.configuracionActual);
      this.configuracionSubject.next(this.configuracionActual);

      return true;

    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      return false;
    }
  }

  /**
   * Resetear configuración a valores por defecto (solo para desarrollo/testing)
   * @returns Promise<boolean> true si se reseteó correctamente
   */
  async resetearConfiguracion(): Promise<boolean> {
    try {
      const nuevaConfig = crearConfiguracionInicial();
      await this.guardarConfiguracion(nuevaConfig);
      this.configuracionActual = nuevaConfig;
      this.configuracionSubject.next(nuevaConfig);
      return true;
    } catch (error) {
      console.error('Error al resetear configuración:', error);
      return false;
    }
  }

  // MÉTODOS PRIVADOS

  /**
   * Validar que los datos iniciales sean correctos
   * @param datos Datos a validar
   * @returns boolean true si son válidos
   */
  private validarDatosIniciales(datos: DatosConfiguracionInicial): boolean {
    // Validar nombre
    if (!datos.nombre || datos.nombre.length < 2 || datos.nombre.length > 30) {
      return false;
    }

    // Validar país
    if (!this.validarCodigoPais(datos.codigoPais)) {
      return false;
    }

    // Validar PIN
    if (!datos.pin || datos.pin.length !== 6 || !/^\d{6}$/.test(datos.pin)) {
      return false;
    }

    return true;
  }

  /**
   * Esperar a que termine la inicialización del servicio
   */
  private async esperarInicializacion(): Promise<void> {
    return new Promise((resolve) => {
      if (this.configuracionActual !== null) {
        resolve();
      } else {
        const subscription = this.configuracion$.subscribe((config) => {
          if (config !== null) {
            subscription.unsubscribe();
            resolve();
          }
        });
      }
    });
  }

  /**
   * Cargar configuración desde almacenamiento local
   * @returns Promise<ConfiguracionApp | null> configuración cargada
   */
  private async cargarConfiguracionAlmacenada(): Promise<ConfiguracionApp | null> {
    try {
      // Por ahora simulamos carga desde localStorage
      // Más adelante esto se conectará con AlmacenamientoService
      const configString = localStorage.getItem('carrito_configuracion');
      
      if (!configString) {
        return null;
      }

      const config = JSON.parse(configString);
      
      // Convertir strings de fecha a objetos Date
      config.fechaInstalacion = new Date(config.fechaInstalacion);
      config.ultimaActualizacion = new Date(config.ultimaActualizacion);

      return config;
      
    } catch (error) {
      console.error('Error al cargar configuración almacenada:', error);
      return null;
    }
  }

  /**
   * Guardar configuración en almacenamiento local
   * @param config Configuración a guardar
   */
  private async guardarConfiguracion(config: ConfiguracionApp): Promise<void> {
    try {
      // Por ahora guardamos en localStorage
      // Más adelante esto se conectará con AlmacenamientoService encriptado
      const configString = JSON.stringify(config);
      localStorage.setItem('carrito_configuracion', configString);
      
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      throw error;
    }
  }

  /**
   * Guardar usuario inicial (temporal hasta crear UsuarioService)
   * @param usuario Usuario a guardar
   */
  private async guardarUsuarioInicial(usuario: Usuario): Promise<void> {
    try {
      // Validar usuario antes de guardar
      if (!validarUsuario(usuario)) {
        throw new Error('Usuario inválido');
      }

      // Por ahora guardamos en localStorage
      // Más adelante esto irá al UsuarioService
      const usuarioString = JSON.stringify(usuario);
      localStorage.setItem('carrito_usuario', usuarioString);
      
    } catch (error) {
      console.error('Error al guardar usuario inicial:', error);
      throw error;
    }
  }
}