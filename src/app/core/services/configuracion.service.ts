/**
 * Servicio para gestionar la configuración inicial y general de la aplicación Carrito
 * Maneja la verificación de primer inicio, configuraciones de usuario y países soportados
 *
 * @author DemWolf
 * @version 1.1 - CORREGIDO
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

// Importar servicio de almacenamiento
import { AlmacenamientoService } from './almacenamiento.service';

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

  constructor(
    private almacenamientoService: AlmacenamientoService
  ) {
    // Inicializar el servicio cargando la configuración
    this.inicializarConfiguracion();
  }

  /**
   * Inicializar el servicio cargando configuración existente o creando una nueva
   */
  private async inicializarConfiguracion(): Promise<void> {
    try {
      this.cargandoSubject.next(true);

      // Intentar cargar configuración existente usando AlmacenamientoService
      console.log('🔧 ConfiguracionService: Cargando configuración...');
      const configExistente = await this.almacenamientoService.obtenerConfiguracion();

      if (configExistente && validarConfiguracion(configExistente)) {
        // Usar configuración existente
        console.log('✅ ConfiguracionService: Configuración existente cargada');
        this.configuracionActual = configExistente;
        this.configuracionSubject.next(configExistente);
      } else {
        // Crear configuración inicial
        console.log('🆕 ConfiguracionService: Creando configuración inicial');
        const nuevaConfig = crearConfiguracionInicial();
        await this.almacenamientoService.guardarConfiguracion(nuevaConfig);
        this.configuracionActual = nuevaConfig;
        this.configuracionSubject.next(nuevaConfig);
      }

    } catch (error) {
      console.error('❌ ConfiguracionService: Error al inicializar configuración:', error);
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
    console.log('🔍 ConfiguracionService: esPrimerInicio =', this.configuracionActual?.primerInicio ?? true);
    return this.configuracionActual?.primerInicio ?? true;
  }

  /**
   * Verificar si la configuración inicial está completa
   * @returns Promise<boolean> true si está completa
   */
  async esConfiguracionCompleta(): Promise<boolean> {
    await this.esperarInicializacion();
    const completa = this.configuracionActual?.configuracionCompleta ?? false;
    console.log('🔍 ConfiguracionService: esConfiguracionCompleta =', completa);
    return completa;
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
   * ✅ MÉTODO CRÍTICO CORREGIDO - Guardar configuración inicial completa del usuario
   * @param datosIniciales Datos de la configuración inicial
   * @returns Promise<boolean> true si se guardó correctamente
   */
  async guardarConfiguracionInicial(datosIniciales: DatosConfiguracionInicial): Promise<boolean> {
    try {
      console.log('💾 ConfiguracionService: Iniciando guardarConfiguracionInicial...');
      console.log('💾 Datos recibidos:', datosIniciales);

      // Validar datos de entrada
      if (!this.validarDatosIniciales(datosIniciales)) {
        throw new Error('Datos de configuración inicial inválidos');
      }

      // Crear usuario con los datos iniciales
      console.log('👤 Creando nuevo usuario...');
      const nuevoUsuario = crearNuevoUsuario(datosIniciales);

      // Obtener información de moneda del país seleccionado
      const infoMoneda = this.obtenerInfoMonedaPais(datosIniciales.codigoPais);
      if (infoMoneda) {
        nuevoUsuario.moneda = infoMoneda.moneda;
      }

      // ✅ CRÍTICO: Guardar usuario usando AlmacenamientoService
      console.log('💾 Guardando usuario con AlmacenamientoService...');
      const usuarioGuardado = await this.almacenamientoService.guardarUsuario(nuevoUsuario);

      if (!usuarioGuardado) {
        throw new Error('No se pudo guardar el usuario');
      }

      console.log('✅ Usuario guardado correctamente');

      // Marcar configuración como completa
      if (this.configuracionActual) {
        console.log('📝 Marcando configuración como completa...');
        this.configuracionActual = marcarConfiguracionCompleta(this.configuracionActual);

        // Guardar configuración actualizada
        const configGuardada = await this.almacenamientoService.guardarConfiguracion(this.configuracionActual);

        if (!configGuardada) {
          throw new Error('No se pudo guardar la configuración actualizada');
        }

        this.configuracionSubject.next(this.configuracionActual);
        console.log('✅ Configuración marcada como completa y guardada');
      }

      // ✅ Verificar que todo se guardó correctamente
      const usuarioVerificacion = await this.almacenamientoService.obtenerUsuario();
      const configVerificacion = await this.almacenamientoService.obtenerConfiguracion();

      console.log('🔍 Verificación final:');
      console.log('- Usuario guardado:', !!usuarioVerificacion);
      console.log('- Configuración completa:', configVerificacion?.configuracionCompleta);

      return true;

    } catch (error) {
      console.error('❌ ConfiguracionService: Error al guardar configuración inicial:', error);
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

      // Guardar cambios usando AlmacenamientoService
      await this.almacenamientoService.guardarConfiguracion(this.configuracionActual);
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
      console.log('🔄 Reseteando configuración...');

      // Eliminar datos existentes
      await this.almacenamientoService.eliminarConfiguracion();
      await this.almacenamientoService.eliminarUsuario();

      // Crear nueva configuración
      const nuevaConfig = crearConfiguracionInicial();
      await this.almacenamientoService.guardarConfiguracion(nuevaConfig);

      this.configuracionActual = nuevaConfig;
      this.configuracionSubject.next(nuevaConfig);

      console.log('✅ Configuración reseteada');
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
      console.error('❌ Nombre inválido');
      return false;
    }

    // Validar país
    if (!this.validarCodigoPais(datos.codigoPais)) {
      console.error('❌ País inválido');
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
}
