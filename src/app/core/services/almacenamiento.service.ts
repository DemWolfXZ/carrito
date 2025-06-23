/**
 * Servicio de almacenamiento local para la aplicación Carrito
 * Maneja operaciones de lectura/escritura de datos de forma segura
 * Preparado para migrar a SQLite con encriptación en el futuro
 * 
 * @author DemWolf
 * @version 1.0
 */

import { Injectable } from '@angular/core';

// Importar modelos necesarios
import { ConfiguracionApp } from '@core/models/configuracion.model';
import { Usuario } from '@core/models/usuario.model';

// Enum con las claves de almacenamiento
enum ClavesAlmacenamiento {
  CONFIGURACION = 'carrito_configuracion',
  USUARIO = 'carrito_usuario',
  SESIONES = 'carrito_sesiones',
  PRODUCTOS = 'carrito_productos',
  RESPALDOS = 'carrito_respaldos',
  LOGS = 'carrito_logs'
}

// Interface para operaciones de almacenamiento
interface OperacionAlmacenamiento {
  exito: boolean;
  error?: string;
  datos?: any;
}

// Interface para información de almacenamiento
interface InfoAlmacenamiento {
  espacioUsado: number;        // Bytes utilizados
  espacioDisponible: number;   // Bytes disponibles (estimado)
  totalElementos: number;      // Número total de elementos almacenados
  ultimaActualizacion: Date;   // Última modificación
}

@Injectable({
  providedIn: 'root'
})
export class AlmacenamientoService {

  // Versión del esquema de datos para migración futura
  private readonly VERSION_ESQUEMA = '1.0.0';
  
  // Prefijo para todas las claves de la aplicación
  private readonly PREFIJO_APP = 'carrito_';

  constructor() {
    // Inicializar el servicio verificando disponibilidad de almacenamiento
    this.inicializarAlmacenamiento();
  }

  /**
   * Inicializar el servicio de almacenamiento
   */
  private inicializarAlmacenamiento(): void {
    try {
      // Verificar disponibilidad de localStorage
      if (!this.esAlmacenamientoDisponible()) {
        console.error('Almacenamiento local no disponible');
        return;
      }

      // Verificar versión del esquema (para migraciones futuras)
      this.verificarVersionEsquema();

    } catch (error) {
      console.error('Error al inicializar almacenamiento:', error);
    }
  }

  /**
   * Verificar si el almacenamiento local está disponible
   * @returns boolean true si está disponible
   */
  esAlmacenamientoDisponible(): boolean {
    try {
      const test = '__test_storage__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener información general del almacenamiento
   * @returns Promise<InfoAlmacenamiento> información del almacenamiento
   */
  async obtenerInfoAlmacenamiento(): Promise<InfoAlmacenamiento> {
    try {
      let espacioUsado = 0;
      let totalElementos = 0;
      let ultimaActualizacion = new Date(0);

      // Recorrer todas las claves de la aplicación
      for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);
        if (clave && clave.startsWith(this.PREFIJO_APP)) {
          const valor = localStorage.getItem(clave);
          if (valor) {
            espacioUsado += valor.length;
            totalElementos++;

            // Intentar obtener fecha de última modificación
            try {
              const datos = JSON.parse(valor);
              if (datos.ultimaActualizacion) {
                const fecha = new Date(datos.ultimaActualizacion);
                if (fecha > ultimaActualizacion) {
                  ultimaActualizacion = fecha;
                }
              }
            } catch {
              // Ignorar errores de parsing
            }
          }
        }
      }

      // Estimar espacio disponible (5MB es el límite típico de localStorage)
      const espacioMaximo = 5 * 1024 * 1024; // 5MB en bytes
      const espacioDisponible = espacioMaximo - espacioUsado;

      return {
        espacioUsado,
        espacioDisponible: Math.max(0, espacioDisponible),
        totalElementos,
        ultimaActualizacion
      };

    } catch (error) {
      console.error('Error al obtener información de almacenamiento:', error);
      throw error;
    }
  }

  /**
   * Verificar si existen datos de configuración
   * @returns Promise<boolean> true si existe configuración
   */
  async existeConfiguracion(): Promise<boolean> {
    try {
      const datos = await this.obtener(ClavesAlmacenamiento.CONFIGURACION);
      return datos.exito && datos.datos !== null;
    } catch (error) {
      console.error('Error al verificar existencia de configuración:', error);
      return false;
    }
  }

  /**
   * Verificar si existen datos de usuario
   * @returns Promise<boolean> true si existe usuario
   */
  async existeUsuario(): Promise<boolean> {
    try {
      const datos = await this.obtener(ClavesAlmacenamiento.USUARIO);
      return datos.exito && datos.datos !== null;
    } catch (error) {
      console.error('Error al verificar existencia de usuario:', error);
      return false;
    }
  }

  /**
   * Guardar configuración de la aplicación
   * @param configuracion Configuración a guardar
   * @returns Promise<boolean> true si se guardó correctamente
   */
  async guardarConfiguracion(configuracion: ConfiguracionApp): Promise<boolean> {
    try {
      const resultado = await this.guardar(ClavesAlmacenamiento.CONFIGURACION, configuracion);
      return resultado.exito;
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      return false;
    }
  }

  /**
   * Obtener configuración de la aplicación
   * @returns Promise<ConfiguracionApp | null> configuración o null si no existe
   */
  async obtenerConfiguracion(): Promise<ConfiguracionApp | null> {
    try {
      const resultado = await this.obtener(ClavesAlmacenamiento.CONFIGURACION);
      
      if (!resultado.exito || !resultado.datos) {
        return null;
      }

      // Convertir strings de fecha a objetos Date
      const config = resultado.datos;
      config.fechaInstalacion = new Date(config.fechaInstalacion);
      config.ultimaActualizacion = new Date(config.ultimaActualizacion);

      return config;

    } catch (error) {
      console.error('Error al obtener configuración:', error);
      return null;
    }
  }

  /**
   * Guardar datos del usuario
   * @param usuario Usuario a guardar
   * @returns Promise<boolean> true si se guardó correctamente
   */
  async guardarUsuario(usuario: Usuario): Promise<boolean> {
    try {
      const resultado = await this.guardar(ClavesAlmacenamiento.USUARIO, usuario);
      return resultado.exito;
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      return false;
    }
  }

  /**
   * Obtener datos del usuario
   * @returns Promise<Usuario | null> usuario o null si no existe
   */
  async obtenerUsuario(): Promise<Usuario | null> {
    try {
      const resultado = await this.obtener(ClavesAlmacenamiento.USUARIO);
      
      if (!resultado.exito || !resultado.datos) {
        return null;
      }

      // Convertir strings de fecha a objetos Date
      const usuario = resultado.datos;
      usuario.fechaCreacion = new Date(usuario.fechaCreacion);
      usuario.ultimaActividad = new Date(usuario.ultimaActividad);
      
      if (usuario.estadisticas.ultimaCompra) {
        usuario.estadisticas.ultimaCompra = new Date(usuario.estadisticas.ultimaCompra);
      }

      return usuario;

    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }
  }

  /**
   * Eliminar configuración almacenada
   * @returns Promise<boolean> true si se eliminó correctamente
   */
  async eliminarConfiguracion(): Promise<boolean> {
    try {
      const resultado = await this.eliminar(ClavesAlmacenamiento.CONFIGURACION);
      return resultado.exito;
    } catch (error) {
      console.error('Error al eliminar configuración:', error);
      return false;
    }
  }

  /**
   * Eliminar datos del usuario
   * @returns Promise<boolean> true si se eliminó correctamente
   */
  async eliminarUsuario(): Promise<boolean> {
    try {
      const resultado = await this.eliminar(ClavesAlmacenamiento.USUARIO);
      return resultado.exito;
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      return false;
    }
  }

  /**
   * Eliminar todos los datos de la aplicación
   * @returns Promise<boolean> true si se eliminaron correctamente
   */
  async eliminarTodosDatos(): Promise<boolean> {
    try {
      let todosEliminados = true;

      // Eliminar todas las claves de la aplicación
      Object.values(ClavesAlmacenamiento).forEach(clave => {
        try {
          localStorage.removeItem(clave);
        } catch (error) {
          console.error(`Error al eliminar clave ${clave}:`, error);
          todosEliminados = false;
        }
      });

      return todosEliminados;

    } catch (error) {
      console.error('Error al eliminar todos los datos:', error);
      return false;
    }
  }

  /**
   * Crear respaldo de todos los datos
   * @returns Promise<string | null> JSON con todos los datos o null si error
   */
  async crearRespaldo(): Promise<string | null> {
    try {
      const respaldo: any = {
        version: this.VERSION_ESQUEMA,
        fechaRespaldo: new Date().toISOString(),
        datos: {}
      };

      // Recopilar todos los datos de la aplicación
      for (const clave of Object.values(ClavesAlmacenamiento)) {
        const resultado = await this.obtener(clave);
        if (resultado.exito && resultado.datos) {
          respaldo.datos[clave] = resultado.datos;
        }
      }

      return JSON.stringify(respaldo);

    } catch (error) {
      console.error('Error al crear respaldo:', error);
      return null;
    }
  }

  /**
   * Restaurar datos desde respaldo
   * @param respaldoJson JSON con los datos de respaldo
   * @returns Promise<boolean> true si se restauró correctamente
   */
  async restaurarRespaldo(respaldoJson: string): Promise<boolean> {
    try {
      const respaldo = JSON.parse(respaldoJson);

      // Validar formato del respaldo
      if (!respaldo.version || !respaldo.datos) {
        throw new Error('Formato de respaldo inválido');
      }

      // Restaurar cada tipo de datos
      let todosRestaurados = true;

      for (const [clave, datos] of Object.entries(respaldo.datos)) {
        try {
          const resultado = await this.guardar(clave as ClavesAlmacenamiento, datos);
          if (!resultado.exito) {
            todosRestaurados = false;
          }
        } catch (error) {
          console.error(`Error al restaurar datos de ${clave}:`, error);
          todosRestaurados = false;
        }
      }

      return todosRestaurados;

    } catch (error) {
      console.error('Error al restaurar respaldo:', error);
      return false;
    }
  }

  // MÉTODOS PRIVADOS

  /**
   * Operación genérica de guardado
   * @param clave Clave de almacenamiento
   * @param datos Datos a guardar
   * @returns Promise<OperacionAlmacenamiento> resultado de la operación
   */
  private async guardar(clave: ClavesAlmacenamiento, datos: any): Promise<OperacionAlmacenamiento> {
    try {
      if (!this.esAlmacenamientoDisponible()) {
        return { exito: false, error: 'Almacenamiento no disponible' };
      }

      // Serializar datos
      const datosString = JSON.stringify(datos);
      
      // Verificar tamaño (límite de 5MB aproximado)
      if (datosString.length > 5 * 1024 * 1024) {
        return { exito: false, error: 'Datos demasiado grandes para almacenar' };
      }

      // Guardar en localStorage
      localStorage.setItem(clave, datosString);

      return { exito: true, datos };

    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      return { exito: false, error: mensaje };
    }
  }

  /**
   * Operación genérica de obtención
   * @param clave Clave de almacenamiento
   * @returns Promise<OperacionAlmacenamiento> resultado de la operación
   */
  private async obtener(clave: ClavesAlmacenamiento): Promise<OperacionAlmacenamiento> {
    try {
      if (!this.esAlmacenamientoDisponible()) {
        return { exito: false, error: 'Almacenamiento no disponible' };
      }

      const datosString = localStorage.getItem(clave);
      
      if (!datosString) {
        return { exito: true, datos: null };
      }

      const datos = JSON.parse(datosString);
      return { exito: true, datos };

    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      return { exito: false, error: mensaje };
    }
  }

  /**
   * Operación genérica de eliminación
   * @param clave Clave de almacenamiento
   * @returns Promise<OperacionAlmacenamiento> resultado de la operación
   */
  private async eliminar(clave: ClavesAlmacenamiento): Promise<OperacionAlmacenamiento> {
    try {
      if (!this.esAlmacenamientoDisponible()) {
        return { exito: false, error: 'Almacenamiento no disponible' };
      }

      localStorage.removeItem(clave);
      return { exito: true };

    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      return { exito: false, error: mensaje };
    }
  }

  /**
   * Verificar versión del esquema para migraciones futuras
   */
  private verificarVersionEsquema(): void {
    try {
      const versionAlmacenada = localStorage.getItem(`${this.PREFIJO_APP}version_esquema`);
      
      if (!versionAlmacenada) {
        // Primera instalación, guardar versión actual
        localStorage.setItem(`${this.PREFIJO_APP}version_esquema`, this.VERSION_ESQUEMA);
      } else if (versionAlmacenada !== this.VERSION_ESQUEMA) {
        // Versión diferente - aquí se harían migraciones en el futuro
        console.log(`Migración de esquema: ${versionAlmacenada} -> ${this.VERSION_ESQUEMA}`);
        localStorage.setItem(`${this.PREFIJO_APP}version_esquema`, this.VERSION_ESQUEMA);
      }

    } catch (error) {
      console.error('Error al verificar versión del esquema:', error);
    }
  }
}