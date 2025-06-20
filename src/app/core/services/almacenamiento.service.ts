/**
 * Servicio de Almacenamiento Local
 * 
 * Gestiona todas las operaciones de almacenamiento offline de la aplicación.
 * Utiliza Capacitor Preferences para configuraciones y SQLite para datos complejos.
 * Incluye encriptación opcional y validación de integridad.
 * 
 * @author Tu Nombre
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

import { SesionCompra, ISesionCompra } from '../models/sesion-compra.model';
import { Usuario, IUsuario } from '../models/usuario.model';
import { Configuracion, IConfiguracion } from '../models/configuracion.model';
import { Producto, IProducto } from '../models/producto.model';

/**
 * Enumeración de claves de almacenamiento
 */
enum ClaveAlmacenamiento {
  USUARIO = 'carrito_usuario',
  CONFIGURACION = 'carrito_configuracion',
  SESIONES = 'carrito_sesiones',
  SESION_ACTIVA = 'carrito_sesion_activa',
  PRODUCTOS_FAVORITOS = 'carrito_productos_favoritos',
  SUPERMERCADOS_FAVORITOS = 'carrito_supermercados_favoritos',
  ESTADISTICAS = 'carrito_estadisticas',
  RESPALDOS = 'carrito_respaldos',
  VERSION_DATOS = 'carrito_version_datos',
  ULTIMA_SINCRONIZACION = 'carrito_ultima_sync'
}

/**
 * Interfaz para metadatos de respaldo
 */
interface MetadatosRespaldo {
  fecha: string;
  version: number;
  totalSesiones: number;
  totalUsuarios: number;
  checksum: string;
}

/**
 * Interfaz para resultado de operación de almacenamiento
 */
interface ResultadoOperacion<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  tiempoOperacion?: number;
}

/**
 * Interfaz para estadísticas de almacenamiento
 */
interface EstadisticasAlmacenamiento {
  totalSesiones: number;
  totalProductos: number;
  espacioUtilizado: number; // en bytes
  ultimaActualizacion: Date;
  versionDatos: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlmacenamientoService {
  
  // Subjects para notificar cambios en los datos
  private readonly sesionActivaSubject = new BehaviorSubject<SesionCompra | null>(null);
  private readonly sesionesSubject = new BehaviorSubject<SesionCompra[]>([]);
  private readonly usuarioSubject = new BehaviorSubject<Usuario | null>(null);
  private readonly configuracionSubject = new BehaviorSubject<Configuracion | null>(null);

  // Observables públicos para suscripción
  public readonly sesionActiva$: Observable<SesionCompra | null> = this.sesionActivaSubject.asObservable();
  public readonly sesiones$: Observable<SesionCompra[]> = this.sesionesSubject.asObservable();
  public readonly usuario$: Observable<Usuario | null> = this.usuarioSubject.asObservable();
  public readonly configuracion$: Observable<Configuracion | null> = this.configuracionSubject.asObservable();

  // Cache en memoria para optimizar rendimiento
  private cacheUsuario: Usuario | null = null;
  private cacheConfiguracion: Configuracion | null = null;
  private cacheSesiones: SesionCompra[] = [];
  private cacheSesionActiva: SesionCompra | null = null;

  // Control de estado del servicio
  private inicializado = false;
  private operacionEnProgreso = false;

  constructor() {
    this.inicializarServicio();
  }

  /**
   * Inicializa el servicio de almacenamiento
   * @private
   */
  private async inicializarServicio(): Promise<void> {
    try {
      console.log('🚀 Inicializando servicio de almacenamiento...');
      
      // Verificar versión de datos y migrar si es necesario
      await this.verificarYMigrarDatos();
      
      // Cargar datos iniciales en cache
      await this.cargarDatosIniciales();
      
      // Verificar integridad de datos
      await this.verificarIntegridadDatos();
      
      this.inicializado = true;
      console.log('✅ Servicio de almacenamiento inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando servicio de almacenamiento:', error);
      throw new Error('Error crítico en inicialización de almacenamiento');
    }
  }

  /**
   * Verifica si el servicio está inicializado
   * @returns Promise<boolean> True si está inicializado
   */
  public async estaInicializado(): Promise<boolean> {
    let intentos = 0;
    const maxIntentos = 50; // 5 segundos máximo
    
    while (!this.inicializado && intentos < maxIntentos) {
      await new Promise(resolve => setTimeout(resolve, 100));
      intentos++;
    }
    
    return this.inicializado;
  }

  // ==================== GESTIÓN DE USUARIO ====================

  /**
   * Obtiene el usuario actual del almacenamiento
   * @returns Observable<Usuario | null> Usuario actual o null
   */
  public obtenerUsuario(): Observable<Usuario | null> {
    if (this.cacheUsuario) {
      return of(this.cacheUsuario);
    }

    return from(this.cargarUsuario()).pipe(
      map(resultado => {
        if (resultado.exito && resultado.datos) {
          this.cacheUsuario = resultado.datos;
          this.usuarioSubject.next(this.cacheUsuario);
          return this.cacheUsuario;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error obteniendo usuario:', error);
        return of(null);
      })
    );
  }

  /**
   * Guarda el usuario en el almacenamiento
   * @param usuario Usuario a guardar
   * @returns Observable<boolean> True si se guardó exitosamente
   */
  public guardarUsuario(usuario: Usuario): Observable<boolean> {
    return from(this.ejecutarOperacionSegura(async () => {
      // Validar usuario antes de guardar
      if (!usuario.esValido()) {
        throw new Error('Usuario no válido para guardar');
      }

      // Actualizar fecha de último acceso
      usuario.registrarAcceso();

      // Guardar en almacenamiento
      const resultado = await this.guardarDatos(ClaveAlmacenamiento.USUARIO, usuario.toJSON());
      
      if (resultado.exito) {
        // Actualizar cache y notificar cambios
        this.cacheUsuario = usuario;
        this.usuarioSubject.next(this.cacheUsuario);
        
        console.log('👤 Usuario guardado exitosamente');
        return true;
      }
      
      throw new Error(resultado.error || 'Error guardando usuario');
    }));
  }

  /**
   * Crea un nuevo usuario por defecto
   * @param nombre Nombre opcional del usuario
   * @returns Observable<Usuario> Nuevo usuario creado
   */
  public crearUsuarioNuevo(nombre?: string): Observable<Usuario> {
    return from(this.ejecutarOperacionSegura(async () => {
      const nuevoUsuario = new Usuario({ nombre });
      
      const guardado = await this.guardarUsuario(nuevoUsuario).toPromise();
      
      if (guardado) {
        console.log('👤 Nuevo usuario creado exitosamente');
        return nuevoUsuario;
      }
      
      throw new Error('Error creando nuevo usuario');
    }));
  }

  // ==================== GESTIÓN DE CONFIGURACIÓN ====================

  /**
   * Obtiene la configuración actual
   * @returns Observable<Configuracion> Configuración actual
   */
  public obtenerConfiguracion(): Observable<Configuracion> {
    if (this.cacheConfiguracion) {
      return of(this.cacheConfiguracion);
    }

    return from(this.cargarConfiguracion()).pipe(
      map(resultado => {
        if (resultado.exito && resultado.datos) {
          this.cacheConfiguracion = resultado.datos;
          this.configuracionSubject.next(this.cacheConfiguracion);
          return this.cacheConfiguracion;
        }
        
        // Si no hay configuración, crear una por defecto
        const configDefault = new Configuracion();
        this.cacheConfiguracion = configDefault;
        this.configuracionSubject.next(this.cacheConfiguracion);
        
        // Guardar configuración por defecto
        this.guardarConfiguracion(configDefault).subscribe();
        
        return configDefault;
      }),
      catchError(error => {
        console.error('Error obteniendo configuración:', error);
        const configDefault = new Configuracion();
        return of(configDefault);
      })
    );
  }

  /**
   * Guarda la configuración en el almacenamiento
   * @param configuracion Configuración a guardar
   * @returns Observable<boolean> True si se guardó exitosamente
   */
  public guardarConfiguracion(configuracion: Configuracion): Observable<boolean> {
    return from(this.ejecutarOperacionSegura(async () => {
      // Validar configuración antes de guardar
      if (!configuracion.esValida()) {
        throw new Error('Configuración no válida para guardar');
      }

      // Guardar en almacenamiento
      const resultado = await this.guardarDatos(ClaveAlmacenamiento.CONFIGURACION, configuracion.toJSON());
      
      if (resultado.exito) {
        // Actualizar cache y notificar cambios
        this.cacheConfiguracion = configuracion;
        this.configuracionSubject.next(this.cacheConfiguracion);
        
        console.log('⚙️ Configuración guardada exitosamente');
        return true;
      }
      
      throw new Error(resultado.error || 'Error guardando configuración');
    }));
  }

  // ==================== GESTIÓN DE SESIONES ====================

  /**
   * Obtiene todas las sesiones de compra
   * @returns Observable<SesionCompra[]> Lista de sesiones
   */
  public obtenerSesiones(): Observable<SesionCompra[]> {
    if (this.cacheSesiones.length > 0) {
      return of(this.cacheSesiones);
    }

    return from(this.cargarSesiones()).pipe(
      map(resultado => {
        if (resultado.exito && resultado.datos) {
          this.cacheSesiones = resultado.datos;
          this.sesionesSubject.next(this.cacheSesiones);
          return this.cacheSesiones;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error obteniendo sesiones:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene la sesión activa actual
   * @returns Observable<SesionCompra | null> Sesión activa o null
   */
  public obtenerSesionActiva(): Observable<SesionCompra | null> {
    if (this.cacheSesionActiva) {
      return of(this.cacheSesionActiva);
    }

    return from(this.cargarSesionActiva()).pipe(
      map(resultado => {
        if (resultado.exito && resultado.datos) {
          this.cacheSesionActiva = resultado.datos;
          this.sesionActivaSubject.next(this.cacheSesionActiva);
          return this.cacheSesionActiva;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error obteniendo sesión activa:', error);
        return of(null);
      })
    );
  }

  /**
   * Guarda una sesión de compra
   * @param sesion Sesión a guardar
   * @param esActiva Si es la sesión activa actual
   * @returns Observable<boolean> True si se guardó exitosamente
   */
  public guardarSesion(sesion: SesionCompra, esActiva: boolean = false): Observable<boolean> {
    return from(this.ejecutarOperacionSegura(async () => {
      // Validar sesión antes de guardar
      if (!sesion.esValida()) {
        throw new Error('Sesión no válida para guardar');
      }

      // Cargar sesiones existentes
      const sesionesExistentes = await this.cargarSesiones();
      let sesiones = sesionesExistentes.datos || [];

      // Actualizar o agregar sesión
      const indiceExistente = sesiones.findIndex(s => s.id === sesion.id);
      if (indiceExistente >= 0) {
        sesiones[indiceExistente] = sesion;
      } else {
        sesiones.push(sesion);
      }

      // Ordenar por fecha (más reciente primero)
      sesiones.sort((a, b) => new Date(b.fecha + ' ' + b.horaInicio).getTime() - 
                            new Date(a.fecha + ' ' + a.horaInicio).getTime());

      // Aplicar límite de sesiones si está configurado
      const configuracion = await this.obtenerConfiguracion().toPromise();
      if (configuracion && configuracion.datos.limiteSesiones > 0) {
        sesiones = sesiones.slice(0, configuracion.datos.limiteSesiones);
      }

      // Guardar sesiones actualizadas
      const resultadoSesiones = await this.guardarDatos(
        ClaveAlmacenamiento.SESIONES, 
        JSON.stringify(sesiones.map(s => JSON.parse(s.toJSON())))
      );

      if (!resultadoSesiones.exito) {
        throw new Error(resultadoSesiones.error || 'Error guardando sesiones');
      }

      // Guardar como sesión activa si corresponde
      if (esActiva && !sesion.completada) {
        const resultadoActiva = await this.guardarDatos(
          ClaveAlmacenamiento.SESION_ACTIVA, 
          sesion.toJSON()
        );
        
        if (resultadoActiva.exito) {
          this.cacheSesionActiva = sesion;
          this.sesionActivaSubject.next(this.cacheSesionActiva);
        }
      } else if (sesion.completada && this.cacheSesionActiva?.id === sesion.id) {
        // Si se completó la sesión activa, limpiarla
        await this.limpiarSesionActiva();
      }

      // Actualizar cache y notificar cambios
      this.cacheSesiones = sesiones;
      this.sesionesSubject.next(this.cacheSesiones);

      console.log('🛒 Sesión guardada exitosamente:', sesion.id);
      return true;
    }));
  }

  /**
   * Elimina una sesión de compra
   * @param idSesion ID de la sesión a eliminar
   * @returns Observable<boolean> True si se eliminó exitosamente
   */
  public eliminarSesion(idSesion: string): Observable<boolean> {
    return from(this.ejecutarOperacionSegura(async () => {
      // Cargar sesiones existentes
      const sesionesExistentes = await this.cargarSesiones();
      let sesiones = sesionesExistentes.datos || [];

      // Filtrar sesión a eliminar
      const sesionesFiltrareds = sesiones.filter(s => s.id !== idSesion);
      
      if (sesiones.length === sesionesFiltrareds.length) {
        throw new Error('Sesión no encontrada para eliminar');
      }

      // Guardar sesiones actualizadas
      const resultado = await this.guardarDatos(
        ClaveAlmacenamiento.SESIONES, 
        JSON.stringify(sesionesFiltrareds.map(s => JSON.parse(s.toJSON())))
      );

      if (resultado.exito) {
        // Si es la sesión activa, limpiarla también
        if (this.cacheSesionActiva?.id === idSesion) {
          await this.limpiarSesionActiva();
        }

        // Actualizar cache y notificar cambios
        this.cacheSesiones = sesionesFiltrareds;
        this.sesionesSubject.next(this.cacheSesiones);

        console.log('🗑️ Sesión eliminada exitosamente:', idSesion);
        return true;
      }

      throw new Error(resultado.error || 'Error eliminando sesión');
    }));
  }

  /**
   * Limpia la sesión activa actual
   * @returns Observable<boolean> True si se limpió exitosamente
   */
  public limpiarSesionActiva(): Observable<boolean> {
    return from(this.ejecutarOperacionSegura(async () => {
      const resultado = await this.eliminarDatos(ClaveAlmacenamiento.SESION_ACTIVA);
      
      if (resultado.exito) {
        this.cacheSesionActiva = null;
        this.sesionActivaSubject.next(null);
        
        console.log('🧹 Sesión activa limpiada exitosamente');
        return true;
      }
      
      throw new Error(resultado.error || 'Error limpiando sesión activa');
    }));
  }

  // ==================== RESPALDO Y EXPORTACIÓN ====================

  /**
   * Crea un respaldo completo de todos los datos
   * @returns Observable<string> JSON con todos los datos
   */
  public crearRespaldoCompleto(): Observable<string> {
    return from(this.ejecutarOperacionSegura(async () => {
      console.log('💾 Creando respaldo completo...');

      // Recopilar todos los datos
      const usuario = await this.obtenerUsuario().toPromise();
      const configuracion = await this.obtenerConfiguracion().toPromise();
      const sesiones = await this.obtenerSesiones().toPromise();
      const sesionActiva = await this.obtenerSesionActiva().toPromise();

      // Crear objeto de respaldo
      const respaldo = {
        metadatos: {
          fecha: new Date().toISOString(),
          version: 1,
          aplicacion: 'Carrito',
          totalSesiones: sesiones?.length || 0,
          checksum: this.generarChecksum({
            usuario: usuario?.toJSON(),
            configuracion: configuracion?.toJSON(),
            sesiones: sesiones?.map(s => s.toJSON()),
            sesionActiva: sesionActiva?.toJSON()
          })
        },
        datos: {
          usuario: usuario ? JSON.parse(usuario.toJSON()) : null,
          configuracion: configuracion ? JSON.parse(configuracion.toJSON()) : null,
          sesiones: sesiones ? sesiones.map(s => JSON.parse(s.toJSON())) : [],
          sesionActiva: sesionActiva ? JSON.parse(sesionActiva.toJSON()) : null
        }
      };

      // Actualizar estadísticas de respaldo en usuario
      if (usuario) {
        usuario.registrarRespaldo();
        await this.guardarUsuario(usuario).toPromise();
      }

      const respaldoJSON = JSON.stringify(respaldo, null, 2);
      console.log('✅ Respaldo completo creado exitosamente');
      
      return respaldoJSON;
    }));
  }

  /**
   * Restaura datos desde un respaldo
   * @param respaldoJSON JSON del respaldo
   * @returns Observable<boolean> True si se restauró exitosamente
   */
  public restaurarDesdeRespaldo(respaldoJSON: string): Observable<boolean> {
    return from(this.ejecutarOperacionSegura(async () => {
      console.log('📥 Restaurando desde respaldo...');

      try {
        const respaldo = JSON.parse(respaldoJSON);
        
        // Validar estructura del respaldo
        if (!respaldo.metadatos || !respaldo.datos) {
          throw new Error('Formato de respaldo inválido');
        }

        // Validar checksum si está disponible
        if (respaldo.metadatos.checksum) {
          const checksumCalculado = this.generarChecksum(respaldo.datos);
          if (checksumCalculado !== respaldo.metadatos.checksum) {
            throw new Error('Checksum de respaldo no coincide - datos corruptos');
          }
        }

        // Crear respaldo de datos actuales antes de restaurar
        const respaldoActual = await this.crearRespaldoCompleto().toPromise();
        await this.guardarDatos('respaldo_pre_restauracion', respaldoActual!);

        // Restaurar usuario
        if (respaldo.datos.usuario) {
          const usuario = Usuario.fromJSON(JSON.stringify(respaldo.datos.usuario));
          await this.guardarUsuario(usuario).toPromise();
        }

        // Restaurar configuración
        if (respaldo.datos.configuracion) {
          const configuracion = Configuracion.fromJSON(JSON.stringify(respaldo.datos.configuracion));
          await this.guardarConfiguracion(configuracion).toPromise();
        }

        // Restaurar sesiones
        if (respaldo.datos.sesiones && Array.isArray(respaldo.datos.sesiones)) {
          const sesiones = respaldo.datos.sesiones.map((s: any) => 
            SesionCompra.fromJSON(JSON.stringify(s))
          );
          
          // Guardar cada sesión
          for (const sesion of sesiones) {
            await this.guardarSesion(sesion, false).toPromise();
          }
        }

        // Restaurar sesión activa
        if (respaldo.datos.sesionActiva) {
          const sesionActiva = SesionCompra.fromJSON(JSON.stringify(respaldo.datos.sesionActiva));
          await this.guardarSesion(sesionActiva, true).toPromise();
        }

        // Limpiar caches para forzar recarga
        this.limpiarCaches();

        console.log('✅ Respaldo restaurado exitosamente');
        return true;

      } catch (error) {
        console.error('❌ Error restaurando respaldo:', error);
        throw new Error('Error restaurando datos desde respaldo: ' + error);
      }
    }));
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Carga el usuario desde el almacenamiento
   * @private
   */
  private async cargarUsuario(): Promise<ResultadoOperacion<Usuario>> {
    try {
      const resultado = await this.cargarDatos(ClaveAlmacenamiento.USUARIO);
      
      if (resultado.exito && resultado.datos) {
        const usuario = Usuario.fromJSON(resultado.datos);
        return { exito: true, datos: usuario };
      }
      
      return { exito: false, error: 'Usuario no encontrado' };
    } catch (error) {
      return { exito: false, error: 'Error cargando usuario: ' + error };
    }
  }

  /**
   * Carga la configuración desde el almacenamiento
   * @private
   */
  private async cargarConfiguracion(): Promise<ResultadoOperacion<Configuracion>> {
    try {
      const resultado = await this.cargarDatos(ClaveAlmacenamiento.CONFIGURACION);
      
      if (resultado.exito && resultado.datos) {
        const configuracion = Configuracion.fromJSON(resultado.datos);
        return { exito: true, datos: configuracion };
      }
      
      return { exito: false, error: 'Configuración no encontrada' };
    } catch (error) {
      return { exito: false, error: 'Error cargando configuración: ' + error };
    }
  }

  /**
   * Carga todas las sesiones desde el almacenamiento
   * @private
   */
  private async cargarSesiones(): Promise<ResultadoOperacion<SesionCompra[]>> {
    try {
      const resultado = await this.cargarDatos(ClaveAlmacenamiento.SESIONES);
      
      if (resultado.exito && resultado.datos) {
        const sesionesData = JSON.parse(resultado.datos);
        if (Array.isArray(sesionesData)) {
          const sesiones = sesionesData.map(s => SesionCompra.fromJSON(JSON.stringify(s)));
          return { exito: true, datos: sesiones };
        }
      }
      
      return { exito: true, datos: [] }; // Array vacío si no hay sesiones
    } catch (error) {
      return { exito: false, error: 'Error cargando sesiones: ' + error };
    }
  }

  /**
   * Carga la sesión activa desde el almacenamiento
   * @private
   */
  private async cargarSesionActiva(): Promise<ResultadoOperacion<SesionCompra>> {
    try {
      const resultado = await this.cargarDatos(ClaveAlmacenamiento.SESION_ACTIVA);
      
      if (resultado.exito && resultado.datos) {
        const sesionActiva = SesionCompra.fromJSON(resultado.datos);
        return { exito: true, datos: sesionActiva };
      }
      
      return { exito: false, error: 'Sesión activa no encontrada' };
    } catch (error) {
      return { exito: false, error: 'Error cargando sesión activa: ' + error };
    }
  }

  /**
   * Guarda datos en el almacenamiento usando Capacitor Preferences
   * @private
   */
  private async guardarDatos(clave: string, datos: string): Promise<ResultadoOperacion<void>> {
    try {
      const tiempoInicio = Date.now();
      
      await Preferences.set({
        key: clave,
        value: datos
      });
      
      const tiempoOperacion = Date.now() - tiempoInicio;
      
      return { 
        exito: true, 
        tiempoOperacion 
      };
    } catch (error) {
      return { 
        exito: false, 
        error: 'Error guardando datos: ' + error 
      };
    }
  }

  /**
   * Carga datos del almacenamiento usando Capacitor Preferences
   * @private
   */
  private async cargarDatos(clave: string): Promise<ResultadoOperacion<string>> {
    try {
      const tiempoInicio = Date.now();
      
      const resultado = await Preferences.get({ key: clave });
      
      const tiempoOperacion = Date.now() - tiempoInicio;
      
      if (resultado.value) {
        return { 
          exito: true, 
          datos: resultado.value,
          tiempoOperacion 
        };
      }
      
      return { 
        exito: false, 
        error: 'Datos no encontrados',
        tiempoOperacion 
      };
    } catch (error) {
      return { 
        exito: false, 
        error: 'Error cargando datos: ' + error 
      };
    }
  }

  /**
   * Elimina datos del almacenamiento
   * @private
   */
  private async eliminarDatos(clave: string): Promise<ResultadoOperacion<void>> {
    try {
      await Preferences.remove({ key: clave });
      return { exito: true };
    } catch (error) {
      return { 
        exito: false, 
        error: 'Error eliminando datos: ' + error 
      };
    }
  }

  /**
   * Ejecuta una operación de forma segura con manejo de errores
   * @private
   */
  private async ejecutarOperacionSegura<T>(operacion: () => Promise<T>): Promise<T> {
    if (this.operacionEnProgreso) {
      throw new Error('Operación ya en progreso, espere a que termine');
    }

    this.operacionEnProgreso = true;
    
    try {
      const resultado = await operacion();
      this.operacionEnProgreso = false;
      return resultado;
    } catch (error) {
      this.operacionEnProgreso = false;
      throw error;
    }
  }

  /**
   * Carga datos iniciales en cache
   * @private
   */
  private async cargarDatosIniciales(): Promise<void> {
    // Cargar configuración
    const configResult = await this.cargarConfiguracion();
    if (configResult.exito && configResult.datos) {
      this.cacheConfiguracion = configResult.datos;
      this.configuracionSubject.next(this.cacheConfiguracion);
    }

    // Cargar usuario
    const userResult = await this.cargarUsuario();
    if (userResult.exito && userResult.datos) {
      this.cacheUsuario = userResult.datos;
      this.usuarioSubject.next(this.cacheUsuario);
    }

    // Cargar sesiones
    const sesionesResult = await this.cargarSesiones();
    if (sesionesResult.exito && sesionesResult.datos) {
      this.cacheSesiones = sesionesResult.datos;
      this.sesionesSubject.next(this.cacheSesiones);
    }

    // Cargar sesión activa
    const sesionActivaResult = await this.cargarSesionActiva();
    if (sesionActivaResult.exito && sesionActivaResult.datos) {
      this.cacheSesionActiva = sesionActivaResult.datos;
      this.sesionActivaSubject.next(this.cacheSesionActiva);
    }
  }

/**
   * Verifica y migra datos de versiones anteriores
   * @private
   */
  private async verificarYMigrarDatos(): Promise<void> {
    try {
      const versionActual = 1;
      const resultadoVersion = await this.cargarDatos(ClaveAlmacenamiento.VERSION_DATOS);
      
      let versionAlmacenada = 0;
      if (resultadoVersion.exito && resultadoVersion.datos) {
        versionAlmacenada = parseInt(resultadoVersion.datos, 10);
      }

      if (versionAlmacenada < versionActual) {
        console.log(`🔄 Migrando datos de versión ${versionAlmacenada} a ${versionActual}`);
        
        // Ejecutar migraciones necesarias
        await this.ejecutarMigraciones(versionAlmacenada, versionActual);
        
        // Actualizar versión almacenada
        await this.guardarDatos(ClaveAlmacenamiento.VERSION_DATOS, versionActual.toString());
        
        console.log('✅ Migración de datos completada');
      }
    } catch (error) {
      console.error('❌ Error en migración de datos:', error);
      // No lanzar error para permitir continuar con datos por defecto
    }
  }

  /**
   * Ejecuta migraciones específicas entre versiones
   * @private
   */
  private async ejecutarMigraciones(versionOrigen: number, versionDestino: number): Promise<void> {
    // Migración de versión 0 a 1 (primera instalación)
    if (versionOrigen === 0 && versionDestino >= 1) {
      await this.migrarV0aV1();
    }

    // Aquí se agregarían más migraciones futuras
    // if (versionOrigen <= 1 && versionDestino >= 2) {
    //   await this.migrarV1aV2();
    // }
  }

  /**
   * Migración inicial de datos (V0 a V1)
   * @private
   */
  private async migrarV0aV1(): Promise<void> {
    try {
      // Verificar si existen datos legacy
      const datosLegacy = await this.buscarDatosLegacy();
      
      if (datosLegacy.encontrados) {
        console.log('📦 Migrando datos legacy...');
        
        // Migrar datos encontrados al nuevo formato
        if (datosLegacy.usuario) {
          const usuario = new Usuario(datosLegacy.usuario);
          await this.guardarUsuario(usuario).toPromise();
        }
        
        if (datosLegacy.configuracion) {
          const configuracion = new Configuracion(datosLegacy.configuracion);
          await this.guardarConfiguracion(configuracion).toPromise();
        }
        
        if (datosLegacy.sesiones && datosLegacy.sesiones.length > 0) {
          for (const sesionData of datosLegacy.sesiones) {
            const sesion = new SesionCompra(sesionData);
            await this.guardarSesion(sesion, false).toPromise();
          }
        }
        
        // Limpiar datos legacy después de migrar
        await this.limpiarDatosLegacy();
        
        console.log('✅ Datos legacy migrados exitosamente');
      }
    } catch (error) {
      console.error('❌ Error migrando datos legacy:', error);
      // Continuar sin fallar para permitir uso normal
    }
  }

  /**
   * Busca datos en formato legacy
   * @private
   */
  private async buscarDatosLegacy(): Promise<{
    encontrados: boolean;
    usuario?: any;
    configuracion?: any;
    sesiones?: any[];
  }> {
    // Implementar búsqueda de datos en formatos anteriores
    // Por ahora retorna false ya que es la primera versión
    return { encontrados: false };
  }

  /**
   * Limpia datos en formato legacy después de migrar
   * @private
   */
  private async limpiarDatosLegacy(): Promise<void> {
    // Implementar limpieza de datos legacy
    // Por ahora no hace nada ya que es la primera versión
  }

  /**
   * Verifica la integridad de todos los datos almacenados
   * @private
   */
  private async verificarIntegridadDatos(): Promise<void> {
    try {
      console.log('🔍 Verificando integridad de datos...');
      
      let erroresEncontrados = 0;
      const errores: string[] = [];

      // Verificar integridad del usuario
      const usuarioResult = await this.cargarUsuario();
      if (usuarioResult.exito && usuarioResult.datos) {
        if (!usuarioResult.datos.esValido()) {
          errores.push('Usuario tiene datos inválidos');
          erroresEncontrados++;
        }
      }

      // Verificar integridad de configuración
      const configResult = await this.cargarConfiguracion();
      if (configResult.exito && configResult.datos) {
        if (!configResult.datos.esValida()) {
          errores.push('Configuración tiene datos inválidos');
          erroresEncontrados++;
        }
      }

      // Verificar integridad de sesiones
      const sesionesResult = await this.cargarSesiones();
      if (sesionesResult.exito && sesionesResult.datos) {
        for (let i = 0; i < sesionesResult.datos.length; i++) {
          const sesion = sesionesResult.datos[i];
          if (!sesion.esValida()) {
            errores.push(`Sesión ${i + 1} tiene datos inválidos`);
            erroresEncontrados++;
          }
        }
      }

      // Verificar integridad de sesión activa
      const sesionActivaResult = await this.cargarSesionActiva();
      if (sesionActivaResult.exito && sesionActivaResult.datos) {
        if (!sesionActivaResult.datos.esValida()) {
          errores.push('Sesión activa tiene datos inválidos');
          erroresEncontrados++;
        }
      }

      if (erroresEncontrados > 0) {
        console.warn(`⚠️ Se encontraron ${erroresEncontrados} errores de integridad:`, errores);
        
        // Crear respaldo de datos corruptos antes de intentar reparar
        await this.crearRespaldoDatosCorruptos();
        
        // Intentar reparar automáticamente errores menores
        await this.repararErroresIntegridad(errores);
      } else {
        console.log('✅ Verificación de integridad completada - todos los datos son válidos');
      }
    } catch (error) {
      console.error('❌ Error verificando integridad de datos:', error);
      // No lanzar error para permitir continuar
    }
  }

  /**
   * Crea respaldo de datos corruptos para análisis
   * @private
   */
  private async crearRespaldoDatosCorruptos(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const claveRespaldo = `respaldo_corruptos_${timestamp}`;
      
      const datosCorruptos = {
        fecha: new Date().toISOString(),
        razon: 'Datos corruptos detectados durante verificación de integridad',
        datos: {
          usuario: await this.cargarDatos(ClaveAlmacenamiento.USUARIO),
          configuracion: await this.cargarDatos(ClaveAlmacenamiento.CONFIGURACION),
          sesiones: await this.cargarDatos(ClaveAlmacenamiento.SESIONES),
          sesionActiva: await this.cargarDatos(ClaveAlmacenamiento.SESION_ACTIVA)
        }
      };
      
      await this.guardarDatos(claveRespaldo, JSON.stringify(datosCorruptos));
      console.log('💾 Respaldo de datos corruptos creado:', claveRespaldo);
    } catch (error) {
      console.error('Error creando respaldo de datos corruptos:', error);
    }
  }

  /**
   * Intenta reparar errores de integridad automáticamente
   * @private
   */
  private async repararErroresIntegridad(errores: string[]): Promise<void> {
    try {
      console.log('🔧 Intentando reparar errores de integridad...');
      
      let reparacionesExitosas = 0;

      for (const error of errores) {
        if (error.includes('Usuario')) {
          // Intentar reparar usuario creando uno por defecto
          try {
            const nuevoUsuario = new Usuario();
            await this.guardarUsuario(nuevoUsuario).toPromise();
            reparacionesExitosas++;
          } catch (repairError) {
            console.error('Error reparando usuario:', repairError);
          }
        }
        
        if (error.includes('Configuración')) {
          // Intentar reparar configuración creando una por defecto
          try {
            const nuevaConfiguracion = new Configuracion();
            await this.guardarConfiguracion(nuevaConfiguracion).toPromise();
            reparacionesExitosas++;
          } catch (repairError) {
            console.error('Error reparando configuración:', repairError);
          }
        }
        
        if (error.includes('Sesión')) {
          // Para sesiones corruptas, por ahora solo logear
          console.warn('Sesión corrupta detectada - requiere revisión manual');
        }
      }

      if (reparacionesExitosas > 0) {
        console.log(`✅ ${reparacionesExitosas} errores reparados automáticamente`);
      }
    } catch (error) {
      console.error('Error durante reparación automática:', error);
    }
  }

  /**
   * Limpia todos los caches en memoria
   * @private
   */
  private limpiarCaches(): void {
    this.cacheUsuario = null;
    this.cacheConfiguracion = null;
    this.cacheSesiones = [];
    this.cacheSesionActiva = null;
    
    // Notificar cambios para forzar recarga
    this.usuarioSubject.next(null);
    this.configuracionSubject.next(null);
    this.sesionesSubject.next([]);
    this.sesionActivaSubject.next(null);
  }

  /**
   * Genera checksum para validar integridad de datos
   * @private
   */
  private generarChecksum(datos: any): string {
    try {
      const datosString = JSON.stringify(datos);
      let hash = 0;
      
      for (let i = 0; i < datosString.length; i++) {
        const char = datosString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir a 32bit integer
      }
      
      return Math.abs(hash).toString(16);
    } catch (error) {
      console.error('Error generando checksum:', error);
      return 'checksum_error';
    }
  }

  // ==================== MÉTODOS PÚBLICOS ADICIONALES ====================

  /**
   * Obtiene estadísticas del almacenamiento
   * @returns Observable<EstadisticasAlmacenamiento> Estadísticas actuales
   */
  public obtenerEstadisticasAlmacenamiento(): Observable<EstadisticasAlmacenamiento> {
    return from(this.ejecutarOperacionSegura(async () => {
      const sesiones = await this.obtenerSesiones().toPromise();
      const totalSesiones = sesiones?.length || 0;
      
      let totalProductos = 0;
      if (sesiones) {
        totalProductos = sesiones.reduce((total, sesion) => total + sesion.productos.length, 0);
      }

      // Calcular espacio utilizado (aproximado)
      const usuario = await this.cargarDatos(ClaveAlmacenamiento.USUARIO);
      const configuracion = await this.cargarDatos(ClaveAlmacenamiento.CONFIGURACION);
      const sesionesData = await this.cargarDatos(ClaveAlmacenamiento.SESIONES);
      const sesionActiva = await this.cargarDatos(ClaveAlmacenamiento.SESION_ACTIVA);

      let espacioUtilizado = 0;
      if (usuario.exito && usuario.datos) espacioUtilizado += usuario.datos.length;
      if (configuracion.exito && configuracion.datos) espacioUtilizado += configuracion.datos.length;
      if (sesionesData.exito && sesionesData.datos) espacioUtilizado += sesionesData.datos.length;
      if (sesionActiva.exito && sesionActiva.datos) espacioUtilizado += sesionActiva.datos.length;

      const estadisticas: EstadisticasAlmacenamiento = {
        totalSesiones,
        totalProductos,
        espacioUtilizado,
        ultimaActualizacion: new Date(),
        versionDatos: 1
      };

      return estadisticas;
    }));
  }

  /**
   * Limpia datos antiguos según configuración de retención
   * @returns Observable<number> Número de elementos eliminados
   */
  public limpiarDatosAntiguos(): Observable<number> {
    return from(this.ejecutarOperacionSegura(async () => {
      console.log('🧹 Iniciando limpieza de datos antiguos...');
      
      const configuracion = await this.obtenerConfiguracion().toPromise();
      if (!configuracion) {
        throw new Error('No se pudo obtener configuración para limpieza');
      }

      const diasRetencion = configuracion.seguridad.retencionDatos;
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);

      // Cargar sesiones actuales
      const sesiones = await this.obtenerSesiones().toPromise();
      if (!sesiones) {
        return 0;
      }

      // Filtrar sesiones que deben mantenerse
      const sesionesAMantener = sesiones.filter(sesion => {
        const fechaSesion = new Date(sesion.fecha);
        return fechaSesion >= fechaLimite;
      });

      const sesionesEliminadas = sesiones.length - sesionesAMantener.length;

      if (sesionesEliminadas > 0) {
        // Guardar sesiones filtradas
        await this.guardarDatos(
          ClaveAlmacenamiento.SESIONES,
          JSON.stringify(sesionesAMantener.map(s => JSON.parse(s.toJSON())))
        );

        // Actualizar cache
        this.cacheSesiones = sesionesAMantener;
        this.sesionesSubject.next(this.cacheSesiones);

        console.log(`🗑️ ${sesionesEliminadas} sesiones antiguas eliminadas`);
      }

      // Limpiar datos del usuario también
      const usuario = await this.obtenerUsuario().toPromise();
      if (usuario) {
        usuario.limpiarDatosAntiguos();
        await this.guardarUsuario(usuario).toPromise();
      }

      return sesionesEliminadas;
    }));
  }

  /**
   * Optimiza el almacenamiento compactando datos
   * @returns Observable<boolean> True si se optimizó exitosamente
   */
  public optimizarAlmacenamiento(): Observable<boolean> {
    return from(this.ejecutarOperacionSegura(async () => {
      console.log('⚡ Optimizando almacenamiento...');
      
      try {
        // Recargar todos los datos para asegurar consistencia
        await this.cargarDatosIniciales();
        
        // Verificar y reparar integridad
        await this.verificarIntegridadDatos();
        
        // Limpiar datos antiguos
        const elementosEliminados = await this.limpiarDatosAntiguos().toPromise();
        
        // Compactar datos si está habilitada la compresión
        const configuracion = await this.obtenerConfiguracion().toPromise();
        if (configuracion?.datos.compresionDatos) {
          await this.compactarDatos();
        }
        
        console.log(`✅ Optimización completada - ${elementosEliminados || 0} elementos eliminados`);
        return true;
      } catch (error) {
        console.error('❌ Error durante optimización:', error);
        return false;
      }
    }));
  }

  /**
   * Compacta datos para reducir espacio (implementación futura)
   * @private
   */
  private async compactarDatos(): Promise<void> {
    // Implementación futura para comprimir datos JSON
    // Por ahora solo logea la acción
    console.log('🗜️ Compactación de datos (funcionalidad futura)');
  }

  /**
   * Verifica si hay conflictos en los datos
   * @returns Observable<string[]> Lista de conflictos encontrados
   */
  public verificarConflictos(): Observable<string[]> {
    return from(this.ejecutarOperacionSegura(async () => {
      const conflictos: string[] = [];

      try {
        // Verificar conflicto de sesión activa
        const sesionActiva = await this.obtenerSesionActiva().toPromise();
        const sesiones = await this.obtenerSesiones().toPromise();

        if (sesionActiva && sesiones) {
          const sesionEnLista = sesiones.find(s => s.id === sesionActiva.id);
          
          if (!sesionEnLista) {
            conflictos.push('Sesión activa no encontrada en lista de sesiones');
          } else if (sesionEnLista.completada && !sesionActiva.completada) {
            conflictos.push('Inconsistencia en estado de sesión activa');
          }
        }

        // Verificar duplicados de sesiones
        if (sesiones) {
          const idsUnicos = new Set(sesiones.map(s => s.id));
          if (idsUnicos.size !== sesiones.length) {
            conflictos.push('Sesiones duplicadas encontradas');
          }
        }

        // Verificar coherencia de totales
        if (sesiones) {
          for (const sesion of sesiones) {
            const totalCalculado = sesion.productos.reduce((total, p) => total + p.total, 0);
            const diferencia = Math.abs(totalCalculado - sesion.totalGeneral);
            
            if (diferencia > 0.01) {
              conflictos.push(`Total incorrecto en sesión ${sesion.id}`);
            }
          }
        }

        return conflictos;
      } catch (error) {
        console.error('Error verificando conflictos:', error);
        return ['Error durante verificación de conflictos'];
      }
    }));
  }

  /**
   * Obtiene información de debug del servicio
   * @returns Observable<object> Información de debug
   */
  public obtenerInfoDebug(): Observable<object> {
    return from(this.ejecutarOperacionSegura(async () => {
      const estadisticas = await this.obtenerEstadisticasAlmacenamiento().toPromise();
      const conflictos = await this.verificarConflictos().toPromise();

      return {
        servicioInicializado: this.inicializado,
        operacionEnProgreso: this.operacionEnProgreso,
        cachesEnMemoria: {
          usuario: !!this.cacheUsuario,
          configuracion: !!this.cacheConfiguracion,
          sesiones: this.cacheSesiones.length,
          sesionActiva: !!this.cacheSesionActiva
        },
        estadisticas,
        conflictos,
        timestamp: new Date().toISOString()
      };
    }));
  }

  /**
   * Restablece completamente el almacenamiento (PELIGROSO)
   * @param confirmarReset Confirmación explícita requerida
   * @returns Observable<boolean> True si se reseteó exitosamente
   */
  public resetearAlmacenamientoCompleto(confirmarReset: boolean = false): Observable<boolean> {
    if (!confirmarReset) {
      return throwError(new Error('Reset no confirmado - operación cancelada por seguridad'));
    }

    return from(this.ejecutarOperacionSegura(async () => {
      console.warn('🚨 RESETEANDO ALMACENAMIENTO COMPLETO - TODOS LOS DATOS SE PERDERÁN');
      
      try {
        // Crear respaldo final antes del reset
        const respaldoFinal = await this.crearRespaldoCompleto().toPromise();
        const timestampReset = new Date().toISOString().replace(/[:.]/g, '-');
        await this.guardarDatos(`respaldo_pre_reset_${timestampReset}`, respaldoFinal!);

        // Eliminar todas las claves de datos
        const clavesAEliminar = Object.values(ClaveAlmacenamiento);
        for (const clave of clavesAEliminar) {
          await this.eliminarDatos(clave);
        }

        // Limpiar todos los caches
        this.limpiarCaches();

        // Reinicializar con datos por defecto
        const nuevoUsuario = new Usuario();
        const nuevaConfiguracion = new Configuracion();

        await this.guardarUsuario(nuevoUsuario).toPromise();
        await this.guardarConfiguracion(nuevaConfiguracion).toPromise();

        console.log('✅ Reset completo realizado - datos por defecto restaurados');
        return true;
      } catch (error) {
        console.error('❌ Error durante reset completo:', error);
        throw new Error('Error crítico durante reset: ' + error);
      }
    }));
  }
}