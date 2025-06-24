/**
 * Servicio para gestionar compras y sesiones de compra en la aplicación Carrito
 * Maneja la lógica de negocio de sesiones, productos, límites mensuales y validaciones
 * Integrado con almacenamiento offline y servicios de usuario
 * 
 * @author DemWolf
 * @version 1.0
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Importar modelos y servicios
import { 
  SesionCompra, 
  EstadoSesion, 
  NuevaSesion, 
  ActualizacionSesion,
  ResumenMensual,
  crearSesionCompra,
  validarDatosSesion,
  agregarProductoASesion,
  removerProductoDeSesion,
  finalizarSesion,
  calcularTotalesSesion,
  calcularEstadisticasSesion,
  esSesionExpirada,
  obtenerResumenMensual,
  VALIDACION_SESION
} from '@core/models/sesion-compra.model';

import { 
  Producto, 
  NuevoProducto, 
  ActualizacionProducto,
  crearProducto,
  actualizarProducto,
  validarDatosProducto
} from '@core/models/producto.model';

import { AlmacenamientoService } from './almacenamiento.service';
import { UsuarioService } from './usuario.service';

// Interface para clave de almacenamiento de sesiones
interface AlmacenamientoSesiones {
  sesiones: SesionCompra[];
  ultimaActualizacion: Date;
  version: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComprasService {

  // BehaviorSubjects para estado reactivo
  private sesionesSubject = new BehaviorSubject<SesionCompra[]>([]);
  private sesionActivaSubject = new BehaviorSubject<SesionCompra | null>(null);
  private cargandoSubject = new BehaviorSubject<boolean>(false);

  // Observables públicos
  public sesiones$ = this.sesionesSubject.asObservable();
  public sesionActiva$ = this.sesionActivaSubject.asObservable();
  public cargando$ = this.cargandoSubject.asObservable();

  // Estado interno
  private sesiones: SesionCompra[] = [];
  private sesionActiva: SesionCompra | null = null;
  private inicializado: boolean = false;

  // Constantes
  private readonly CLAVE_ALMACENAMIENTO = 'carrito_sesiones';
  private readonly VERSION_DATOS = '1.0.0';

  constructor(
    private almacenamientoService: AlmacenamientoService,
    private usuarioService: UsuarioService
  ) {
    // Inicializar el servicio
    this.inicializarServicio();
  }

  /**
   * Inicializar servicio cargando datos almacenados
   */
  private async inicializarServicio(): Promise<void> {
    try {
      this.cargandoSubject.next(true);

      // Cargar sesiones almacenadas
      await this.cargarSesiones();

      // Verificar sesiones expiradas
      await this.verificarSesionesExpiradas();

      // Buscar sesión activa
      this.buscarSesionActiva();

      this.inicializado = true;

    } catch (error) {
      console.error('Error al inicializar servicio de compras:', error);
    } finally {
      this.cargandoSubject.next(false);
    }
  }

  /**
   * Verificar si el servicio está listo
   */
  async esperarInicializacion(): Promise<void> {
    return new Promise((resolve) => {
      if (this.inicializado) {
        resolve();
      } else {
        const subscription = this.cargando$.subscribe((cargando) => {
          if (!cargando && this.inicializado) {
            subscription.unsubscribe();
            resolve();
          }
        });
      }
    });
  }

  /**
   * Verificar si el usuario puede crear una nueva sesión (límite de 2 por mes)
   * @returns Promise<boolean> true si puede crear nueva sesión
   */
  async puedeCrearNuevaSesion(): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      // Obtener resumen del mes actual
      const ahora = new Date();
      const resumenMensual = this.obtenerResumenMesActual();

      // Verificar límite de 2 sesiones por mes
      return resumenMensual.sesionesUsadas < VALIDACION_SESION.limiteMensual;

    } catch (error) {
      console.error('Error al verificar límite de sesiones:', error);
      return false;
    }
  }

  /**
   * Crear nueva sesión de compra
   * @param datosSesion Datos para crear la sesión
   * @returns Promise<SesionCompra | null> sesión creada o null si hay errores
   */
  async crearNuevaSesion(datosSesion: NuevaSesion): Promise<SesionCompra | null> {
    try {
      await this.esperarInicializacion();

      // Verificar que puede crear nueva sesión
      const puedeCrear = await this.puedeCrearNuevaSesion();
      if (!puedeCrear) {
        console.error('Límite mensual de sesiones alcanzado');
        return null;
      }

      // Verificar que no hay sesión activa
      if (this.sesionActiva) {
        console.error('Ya existe una sesión activa');
        return null;
      }

      // Obtener usuario actual
      const usuario = await this.usuarioService.obtenerUsuarioActual();
      if (!usuario) {
        console.error('Usuario no encontrado');
        return null;
      }

      // Crear nueva sesión
      const nuevaSesion = crearSesionCompra(datosSesion, usuario.id);
      if (!nuevaSesion) {
        console.error('Error al crear sesión de compra');
        return null;
      }

      // Agregar a la lista de sesiones
      this.sesiones.unshift(nuevaSesion); // Agregar al inicio (más reciente)
      this.sesionActiva = nuevaSesion;

      // Guardar cambios
      await this.guardarSesiones();

      // Actualizar observables
      this.sesionesSubject.next([...this.sesiones]);
      this.sesionActivaSubject.next(this.sesionActiva);

      // Actualizar estadísticas del usuario
      await this.actualizarEstadisticasUsuario();

      return nuevaSesion;

    } catch (error) {
      console.error('Error al crear nueva sesión:', error);
      return null;
    }
  }

  /**
   * Obtener sesión activa actual
   * @returns Promise<SesionCompra | null> sesión activa o null
   */
  async obtenerSesionActiva(): Promise<SesionCompra | null> {
    await this.esperarInicializacion();
    return this.sesionActiva;
  }

  /**
   * Obtener todas las sesiones
   * @returns Promise<SesionCompra[]> lista de todas las sesiones
   */
  async obtenerTodasLasSesiones(): Promise<SesionCompra[]> {
    await this.esperarInicializacion();
    return [...this.sesiones];
  }

  /**
   * Obtener sesiones completadas
   * @returns Promise<SesionCompra[]> solo sesiones completadas
   */
  async obtenerSesionesCompletadas(): Promise<SesionCompra[]> {
    await this.esperarInicializacion();
    return this.sesiones.filter(sesion => sesion.estado === EstadoSesion.COMPLETADA);
  }

  /**
   * Agregar producto a la sesión activa
   * @param datosProducto Datos del producto a agregar
   * @returns Promise<boolean> true si se agregó correctamente
   */
  async agregarProducto(datosProducto: NuevoProducto): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      // Verificar que hay sesión activa
      if (!this.sesionActiva) {
        console.error('No hay sesión activa para agregar productos');
        return false;
      }

      // Crear producto
      const nuevoProducto = crearProducto(datosProducto);
      if (!nuevoProducto) {
        console.error('Error al crear producto');
        return false;
      }

      // Agregar producto a la sesión
      const sesionActualizada = agregarProductoASesion(this.sesionActiva, nuevoProducto);
      if (!sesionActualizada) {
        console.error('Error al agregar producto a la sesión');
        return false;
      }

      // Actualizar sesión activa
      this.sesionActiva = sesionActualizada;
      
      // Actualizar en la lista de sesiones
      const indiceSesion = this.sesiones.findIndex(s => s.id === sesionActualizada.id);
      if (indiceSesion >= 0) {
        this.sesiones[indiceSesion] = sesionActualizada;
      }

      // Guardar cambios
      await this.guardarSesiones();

      // Actualizar observables
      this.sesionesSubject.next([...this.sesiones]);
      this.sesionActivaSubject.next(this.sesionActiva);

      return true;

    } catch (error) {
      console.error('Error al agregar producto:', error);
      return false;
    }
  }

  /**
   * Actualizar producto en la sesión activa
   * @param idProducto ID del producto a actualizar
   * @param actualizacion Datos a actualizar
   * @returns Promise<boolean> true si se actualizó correctamente
   */
  async actualizarProducto(idProducto: string, actualizacion: ActualizacionProducto): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      // Verificar que hay sesión activa
      if (!this.sesionActiva) {
        console.error('No hay sesión activa');
        return false;
      }

      // Encontrar producto en la sesión
      const indiceProducto = this.sesionActiva.productos.findIndex(p => p.id === idProducto);
      if (indiceProducto === -1) {
        console.error('Producto no encontrado en la sesión');
        return false;
      }

      // Actualizar producto
      const productoOriginal = this.sesionActiva.productos[indiceProducto];
      const productoActualizado = actualizarProducto(productoOriginal, actualizacion);
      if (!productoActualizado) {
        console.error('Error al actualizar producto');
        return false;
      }

      // Crear sesión actualizada
      const productosActualizados = [...this.sesionActiva.productos];
      productosActualizados[indiceProducto] = productoActualizado;

      const sesionActualizada: SesionCompra = {
        ...this.sesionActiva,
        productos: productosActualizados,
        metadatos: {
          ...this.sesionActiva.metadatos,
          ultimaActualizacion: new Date(),
          numeroRevision: this.sesionActiva.metadatos.numeroRevision + 1
        }
      };

      // Recalcular totales
      sesionActualizada.totales = calcularTotalesSesion(sesionActualizada);
      sesionActualizada.estadisticas = calcularEstadisticasSesion(sesionActualizada);

      // Actualizar sesión activa
      this.sesionActiva = sesionActualizada;
      
      // Actualizar en la lista de sesiones
      const indiceSesion = this.sesiones.findIndex(s => s.id === sesionActualizada.id);
      if (indiceSesion >= 0) {
        this.sesiones[indiceSesion] = sesionActualizada;
      }

      // Guardar cambios
      await this.guardarSesiones();

      // Actualizar observables
      this.sesionesSubject.next([...this.sesiones]);
      this.sesionActivaSubject.next(this.sesionActiva);

      return true;

    } catch (error) {
      console.error('Error al actualizar producto:', error);
      return false;
    }
  }

  /**
   * Remover producto de la sesión activa
   * @param idProducto ID del producto a remover
   * @returns Promise<boolean> true si se removió correctamente
   */
  async removerProducto(idProducto: string): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      // Verificar que hay sesión activa
      if (!this.sesionActiva) {
        console.error('No hay sesión activa');
        return false;
      }

      // Remover producto de la sesión
      const sesionActualizada = removerProductoDeSesion(this.sesionActiva, idProducto);
      if (!sesionActualizada) {
        console.error('Error al remover producto de la sesión');
        return false;
      }

      // Actualizar sesión activa
      this.sesionActiva = sesionActualizada;
      
      // Actualizar en la lista de sesiones
      const indiceSesion = this.sesiones.findIndex(s => s.id === sesionActualizada.id);
      if (indiceSesion >= 0) {
        this.sesiones[indiceSesion] = sesionActualizada;
      }

      // Guardar cambios
      await this.guardarSesiones();

      // Actualizar observables
      this.sesionesSubject.next([...this.sesiones]);
      this.sesionActivaSubject.next(this.sesionActiva);

      return true;

    } catch (error) {
      console.error('Error al remover producto:', error);
      return false;
    }
  }

  /**
   * Finalizar la sesión activa
   * @returns Promise<boolean> true si se finalizó correctamente
   */
  async finalizarSesionActiva(): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      // Verificar que hay sesión activa
      if (!this.sesionActiva) {
        console.error('No hay sesión activa para finalizar');
        return false;
      }

      // Finalizar sesión
      const sesionFinalizada = finalizarSesion(this.sesionActiva);
      if (!sesionFinalizada) {
        console.error('Error al finalizar sesión');
        return false;
      }

      // Actualizar en la lista de sesiones
      const indiceSesion = this.sesiones.findIndex(s => s.id === sesionFinalizada.id);
      if (indiceSesion >= 0) {
        this.sesiones[indiceSesion] = sesionFinalizada;
      }

      // Limpiar sesión activa
      this.sesionActiva = null;

      // Guardar cambios
      await this.guardarSesiones();

      // Actualizar observables
      this.sesionesSubject.next([...this.sesiones]);
      this.sesionActivaSubject.next(null);

      // Actualizar estadísticas del usuario
      await this.actualizarEstadisticasUsuario();

      return true;

    } catch (error) {
      console.error('Error al finalizar sesión:', error);
      return false;
    }
  }

  /**
   * Cancelar la sesión activa
   * @returns Promise<boolean> true si se canceló correctamente
   */
  async cancelarSesionActiva(): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      // Verificar que hay sesión activa
      if (!this.sesionActiva) {
        console.error('No hay sesión activa para cancelar');
        return false;
      }

      // Cambiar estado a cancelada
      const sesionCancelada: SesionCompra = {
        ...this.sesionActiva,
        estado: EstadoSesion.CANCELADA,
        fechaFinalizacion: new Date(),
        horaFinalizacion: new Date().toTimeString().slice(0, 5),
        metadatos: {
          ...this.sesionActiva.metadatos,
          ultimaActualizacion: new Date(),
          numeroRevision: this.sesionActiva.metadatos.numeroRevision + 1
        }
      };

      // Actualizar en la lista de sesiones
      const indiceSesion = this.sesiones.findIndex(s => s.id === sesionCancelada.id);
      if (indiceSesion >= 0) {
        this.sesiones[indiceSesion] = sesionCancelada;
      }

      // Limpiar sesión activa
      this.sesionActiva = null;

      // Guardar cambios
      await this.guardarSesiones();

      // Actualizar observables
      this.sesionesSubject.next([...this.sesiones]);
      this.sesionActivaSubject.next(null);

      return true;

    } catch (error) {
      console.error('Error al cancelar sesión:', error);
      return false;
    }
  }

  /**
   * Obtener resumen del mes actual
   * @returns ResumenMensual resumen calculado
   */
  obtenerResumenMesActual(): ResumenMensual {
    const ahora = new Date();
    return obtenerResumenMensual(this.sesiones, ahora.getFullYear(), ahora.getMonth() + 1);
  }

  /**
   * Obtener resumen de un mes específico
   * @param ano Año del resumen
   * @param mes Mes del resumen (1-12)
   * @returns ResumenMensual resumen calculado
   */
  obtenerResumenMes(ano: number, mes: number): ResumenMensual {
    return obtenerResumenMensual(this.sesiones, ano, mes);
  }

  /**
   * Obtener gasto total del mes actual
   * @returns number total gastado en el mes
   */
  obtenerGastoMesActual(): number {
    const resumen = this.obtenerResumenMesActual();
    return resumen.totalGastado;
  }

  // MÉTODOS PRIVADOS

  /**
   * Cargar sesiones desde almacenamiento usando tu AlmacenamientoService
   */
  private async cargarSesiones(): Promise<void> {
    try {
      // Usar método personalizado para sesiones
      const datosString = localStorage.getItem(this.CLAVE_ALMACENAMIENTO);
      
      if (datosString) {
        const almacenamiento: AlmacenamientoSesiones = JSON.parse(datosString);
        
        // Convertir strings de fecha a objetos Date
        this.sesiones = almacenamiento.sesiones.map(sesion => ({
          ...sesion,
          fechaInicio: new Date(sesion.fechaInicio),
          fechaFinalizacion: sesion.fechaFinalizacion ? new Date(sesion.fechaFinalizacion) : undefined,
          metadatos: {
            ...sesion.metadatos,
            ultimaActualizacion: new Date(sesion.metadatos.ultimaActualizacion)
          },
          productos: sesion.productos.map(producto => ({
            ...producto,
            fechaAgregado: new Date(producto.fechaAgregado)
          }))
        }));
        
        // Ordenar por fecha (más recientes primero)
        this.sesiones.sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime());
      } else {
        this.sesiones = [];
      }

      // Actualizar observable
      this.sesionesSubject.next([...this.sesiones]);

    } catch (error) {
      console.error('Error al cargar sesiones:', error);
      this.sesiones = [];
      this.sesionesSubject.next([]);
    }
  }

  /**
   * Guardar sesiones en almacenamiento usando localStorage directamente
   */
  private async guardarSesiones(): Promise<void> {
    try {
      const datosAlmacenamiento: AlmacenamientoSesiones = {
        sesiones: this.sesiones,
        ultimaActualizacion: new Date(),
        version: this.VERSION_DATOS
      };

      localStorage.setItem(this.CLAVE_ALMACENAMIENTO, JSON.stringify(datosAlmacenamiento));

    } catch (error) {
      console.error('Error al guardar sesiones:', error);
    }
  }

  /**
   * Buscar sesión activa en la lista cargada
   */
  private buscarSesionActiva(): void {
    this.sesionActiva = this.sesiones.find(sesion => 
      sesion.estado === EstadoSesion.ACTIVA || sesion.estado === EstadoSesion.PAUSADA
    ) || null;

    this.sesionActivaSubject.next(this.sesionActiva);
  }

  /**
   * Verificar y marcar sesiones expiradas
   */
  private async verificarSesionesExpiradas(): Promise<void> {
    let hayChangios = false;

    this.sesiones.forEach(sesion => {
      if (esSesionExpirada(sesion)) {
        sesion.estado = EstadoSesion.EXPIRADA;
        sesion.fechaFinalizacion = new Date();
        sesion.horaFinalizacion = new Date().toTimeString().slice(0, 5);
        hayChangios = true;
      }
    });

    if (hayChangios) {
      await this.guardarSesiones();
      this.sesionesSubject.next([...this.sesiones]);
    }
  }

  /**
   * Actualizar estadísticas del usuario
   */
  private async actualizarEstadisticasUsuario(): Promise<void> {
    try {
      const sesionesCompletadas = this.sesiones.filter(s => s.estado === EstadoSesion.COMPLETADA);
      const resumenMensual = this.obtenerResumenMesActual();

      const estadisticas = {
        totalComprasRealizadas: sesionesCompletadas.length,
        totalDineroGastado: sesionesCompletadas.reduce((sum, s) => sum + s.totales.total, 0),
        comprasEsteMes: resumenMensual.sesionesCompletadas,
        comprasEsteAno: sesionesCompletadas.filter(s => s.fechaInicio.getFullYear() === new Date().getFullYear()).length,
        ultimaCompra: sesionesCompletadas.length > 0 ? sesionesCompletadas[0].fechaFinalizacion : undefined
      };

      await this.usuarioService.actualizarEstadisticas(estadisticas);

    } catch (error) {
      console.error('Error al actualizar estadísticas del usuario:', error);
    }
  }
}