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
  ultimoTimestampObservado?: number;
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
  private ultimoTimestampObservado = 0;

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
      await this.verificarSesionesExpiradas();

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
    console.log('📋 [OBTENER_SESION] Retornando sesión activa con', this.sesionActiva?.productos.length || 0, 'productos');
    console.log('📋 [OBTENER_SESION] Sesión activa ID:', this.sesionActiva?.id);
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
   * Obtener sesiones en estado borrador
   * @returns Promise<SesionCompra[]> solo sesiones en estado borrador
   */
  async obtenerSesionesBorrador(): Promise<SesionCompra[]> {
    await this.esperarInicializacion();
    await this.verificarSesionesExpiradas();
    return this.sesiones.filter(sesion => sesion.estado === EstadoSesion.BORRADOR);
  }

  async obtenerSesionesGuardadas(): Promise<SesionCompra[]> {
    await this.esperarInicializacion();
    await this.verificarSesionesExpiradas();
    return this.sesiones.filter(sesion => sesion.estado === EstadoSesion.GUARDADA);
  }

  obtenerTiempoRestanteBorrador(sesion: SesionCompra): number | null {
    if (!sesion.fechaPrimerGuardadoTemporal || sesion.estado === EstadoSesion.GUARDADA) {
      return null;
    }

    return Math.max(
      0,
      VALIDACION_SESION.tiempoMaximoBorrador -
      (this.obtenerTiempoInterno() - new Date(sesion.fechaPrimerGuardadoTemporal).getTime())
    );
  }

  async verificarVigenciaSesiones(): Promise<void> {
    await this.esperarInicializacion();
    await this.verificarSesionesExpiradas();
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

      console.log('🔄 [ACTUALIZAR] Iniciando actualización del producto:', idProducto);
      console.log('🔄 [ACTUALIZAR] Datos a actualizar:', actualizacion);

      // Verificar que hay sesión activa
      if (!this.sesionActiva) {
        console.error('❌ [ACTUALIZAR] No hay sesión activa');
        return false;
      }

      console.log('🔄 [ACTUALIZAR] Sesión activa encontrada, productos antes:', this.sesionActiva.productos.length);

      // Encontrar producto en la sesión
      const indiceProducto = this.sesionActiva.productos.findIndex(p => p.id === idProducto);
      console.log('🔄 [ACTUALIZAR] Índice del producto encontrado:', indiceProducto);

      if (indiceProducto === -1) {
        console.error('❌ [ACTUALIZAR] Producto no encontrado en la sesión');
        return false;
      }

      // Actualizar producto
      const productoOriginal = this.sesionActiva.productos[indiceProducto];
      console.log('🔄 [ACTUALIZAR] Producto original:', productoOriginal);

      const productoActualizado = actualizarProducto(productoOriginal, actualizacion);
      if (!productoActualizado) {
        console.error('❌ [ACTUALIZAR] Error al actualizar producto');
        return false;
      }

      console.log('✅ [ACTUALIZAR] Producto actualizado:', productoActualizado);

      // Crear sesión actualizada
      const productosActualizados = [...this.sesionActiva.productos];
      console.log('🔄 [ACTUALIZAR] Copia de productos creada, longitud:', productosActualizados.length);

      productosActualizados[indiceProducto] = productoActualizado;
      console.log('🔄 [ACTUALIZAR] Producto reemplazado en índice:', indiceProducto);

      const sesionActualizada: SesionCompra = {
        ...this.sesionActiva,
        productos: productosActualizados,
        metadatos: {
          ...this.sesionActiva.metadatos,
          ultimaActualizacion: new Date(),
          numeroRevision: this.sesionActiva.metadatos.numeroRevision + 1
        }
      };

      console.log('🔄 [ACTUALIZAR] Nueva sesión creada, productos:', sesionActualizada.productos.length);

      // Recalcular totales
      sesionActualizada.totales = calcularTotalesSesion(sesionActualizada);
      sesionActualizada.estadisticas = calcularEstadisticasSesion(sesionActualizada);

      // Actualizar sesión activa
      this.sesionActiva = sesionActualizada;
      console.log('🔄 [ACTUALIZAR] Sesión activa actualizada, productos ahora:', this.sesionActiva.productos.length);

      // Actualizar en la lista de sesiones
      const indiceSesion = this.sesiones.findIndex(s => s.id === sesionActualizada.id);
      console.log('🔄 [ACTUALIZAR] Índice de sesión en lista:', indiceSesion);

      if (indiceSesion >= 0) {
        this.sesiones[indiceSesion] = sesionActualizada;
        console.log('🔄 [ACTUALIZAR] Sesión actualizada en lista de sesiones');
      }

      // Guardar cambios
      console.log('💾 [ACTUALIZAR] PRE-GUARDAR - Sesión actual tiene:', this.sesionActiva.productos.length, 'productos');
      console.log('💾 [ACTUALIZAR] PRE-GUARDAR - Contenido de sesiones a guardar:', this.sesiones.length, 'sesiones');
      this.sesiones.forEach((s, i) => {
        console.log(`💾 [ACTUALIZAR] PRE-GUARDAR - Sesión ${i}:`, s.id, 'tiene', s.productos.length, 'productos');
      });

      await this.guardarSesiones();
      console.log('✅ [ACTUALIZAR] Cambios guardados en localStorage');

      // Actualizar observables
      this.sesionesSubject.next([...this.sesiones]);
      this.sesionActivaSubject.next(this.sesionActiva);
      console.log('🔄 [ACTUALIZAR] Observables notificados');

      console.log('✅ [ACTUALIZAR] Actualización completada exitosamente');
      console.log('✅ [ACTUALIZAR] Sesión activa final tiene', this.sesionActiva.productos.length, 'productos');
      return true;

    } catch (error) {
      console.error('❌ [ACTUALIZAR] Error al actualizar producto:', error);
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
   * Guardar la sesión activa como borrador
   * Permite al usuario guardar una lista incompleta para completarla después
   * @returns Promise<boolean> true si se guardó correctamente como borrador
   */
  async guardarSesionComoBorrador(): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      // Verificar que hay sesión activa
      if (!this.sesionActiva) {
        console.error('No hay sesión activa para guardar como borrador');
        return false;
      }

      // Cambiar estado a BORRADOR sin finalizar
      const sesionBorrador: SesionCompra = {
        ...this.sesionActiva,
        estado: EstadoSesion.BORRADOR,
        fechaPrimerGuardadoTemporal: this.sesionActiva.fechaPrimerGuardadoTemporal
          ?? new Date(this.obtenerTiempoInterno()),
        fechaFinalizacion: undefined
      };

      // Actualizar en la lista de sesiones
      const indiceSesion = this.sesiones.findIndex(s => s.id === sesionBorrador.id);
      if (indiceSesion >= 0) {
        this.sesiones[indiceSesion] = sesionBorrador;
      }

      // Limpiar sesión activa
      this.sesionActiva = null;

      // Guardar cambios
      await this.guardarSesiones();

      // Actualizar observables
      this.sesionesSubject.next([...this.sesiones]);
      this.sesionActivaSubject.next(null);

      console.log('💾 Sesión guardada como borrador:', sesionBorrador.id);

      return true;

    } catch (error) {
      console.error('Error al guardar sesión como borrador:', error);
      return false;
    }
  }

  /**
   * Cancelar la sesión activa (descartar sin guardar)
   * Elimina la sesión activa completamente
   */
  async cancelarSesionActiva(): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      if (!this.sesionActiva) {
        console.error('No hay sesión activa para cancelar');
        return false;
      }

      // Usar eliminarSesion para borrar la sesión activa
      const sesionId = this.sesionActiva.id;
      const cancelada = await this.eliminarSesion(sesionId);

      if (cancelada) {
        console.log('❌ Sesión activa cancelada:', sesionId);
      }

      return cancelada;

    } catch (error) {
      console.error('Error al cancelar sesión activa:', error);
      return false;
    }
  }

  /**
   * Eliminar la sesión activa completamente
   * Similar a cancelarSesionActiva pero se puede llamar después de guardar
   */
  async eliminarSesionActiva(): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      if (!this.sesionActiva) {
        console.error('No hay sesión activa para eliminar');
        return false;
      }

      // Usar eliminarSesion para borrar la sesión activa
      const sesionId = this.sesionActiva.id;
      const eliminada = await this.eliminarSesion(sesionId);

      if (eliminada) {
        console.log('🗑️ Sesión activa eliminada:', sesionId);
      }

      return eliminada;

    } catch (error) {
      console.error('Error al eliminar sesión activa:', error);
      return false;
    }
  }

  /**
   * Activar un borrador para editarlo y completarlo
   * Cambiar estado de BORRADOR a ACTIVA
   */
  async activarBorrador(sesionId: string): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      // Buscar el borrador
      const borrador = this.sesiones.find(s => s.id === sesionId && s.estado === EstadoSesion.BORRADOR);
      if (!borrador) {
        console.error('Borrador no encontrado:', sesionId);
        return false;
      }

      // Cambiar estado a ACTIVA
      const sesionActivada: SesionCompra = {
        ...borrador,
        estado: EstadoSesion.ACTIVA,
        fechaFinalizacion: undefined
      };

      // Actualizar en la lista de sesiones
      const indiceSesion = this.sesiones.findIndex(s => s.id === sesionId);
      if (indiceSesion >= 0) {
        this.sesiones[indiceSesion] = sesionActivada;
      }

      // Establecer como sesión activa
      this.sesionActiva = sesionActivada;

      // Guardar cambios
      await this.guardarSesiones();

      // Actualizar observables
      this.sesionesSubject.next([...this.sesiones]);
      this.sesionActivaSubject.next(this.sesionActiva);

      console.log('✅ Borrador activado:', sesionId);

      return true;

    } catch (error) {
      console.error('Error al activar borrador:', error);
      return false;
    }
  }

  /**
   * Eliminar una sesión (cualquier estado)
   */
  async eliminarSesion(sesionId: string): Promise<boolean> {
    try {
      await this.esperarInicializacion();

      // Buscar la sesión
      const indice = this.sesiones.findIndex(s => s.id === sesionId);
      if (indice < 0) {
        console.error('Sesión no encontrada:', sesionId);
        return false;
      }

      // Eliminar de la lista
      const sesionEliminada = this.sesiones.splice(indice, 1)[0];

      // Si era la sesión activa, limpiarla
      if (this.sesionActiva?.id === sesionId) {
        this.sesionActiva = null;
        this.sesionActivaSubject.next(null);
      }

      // Guardar cambios
      await this.guardarSesiones();

      // Actualizar observables
      this.sesionesSubject.next([...this.sesiones]);

      console.log('🗑️ Sesión eliminada:', sesionEliminada.nombreSupermercado);

      return true;

    } catch (error) {
      console.error('Error al eliminar sesión:', error);
      return false;
    }
    try {
      await this.esperarInicializacion();

      // Verificar que hay sesión activa
      if (!this.sesionActiva) {
        console.error('No hay sesión activa para cancelar');
        return false;
      }

      // Usar aserción de tipo ya que validamos que no es null
      const sesionActiva = this.sesionActiva!;

      // Cambiar estado a cancelada
      const sesionCancelada: SesionCompra = {
        ...sesionActiva,
        id: sesionActiva.id,
        estado: EstadoSesion.CANCELADA,
        fechaFinalizacion: new Date(),
        horaFinalizacion: new Date().toTimeString().slice(0, 5),
        metadatos: {
          ...sesionActiva.metadatos,
          ultimaActualizacion: new Date(),
          numeroRevision: sesionActiva.metadatos.numeroRevision + 1
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
        this.ultimoTimestampObservado = almacenamiento.ultimoTimestampObservado || 0;

        // Convertir strings de fecha a objetos Date
        this.sesiones = almacenamiento.sesiones.map(sesion => ({
          ...sesion,
          fechaInicio: new Date(sesion.fechaInicio),
          fechaFinalizacion: sesion.fechaFinalizacion ? new Date(sesion.fechaFinalizacion) : undefined,
          fechaPrimerGuardadoTemporal: sesion.fechaPrimerGuardadoTemporal
            ? new Date(sesion.fechaPrimerGuardadoTemporal)
            : undefined,
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

      this.actualizarRelojInterno();

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
        ultimoTimestampObservado: this.actualizarRelojInterno(),
        version: this.VERSION_DATOS
      };

      console.log('💾 [GUARDAR] Datos a guardar en localStorage:', {
        cantidadSesiones: this.sesiones.length,
        version: this.VERSION_DATOS,
        clave: this.CLAVE_ALMACENAMIENTO,
        sesionActiva: this.sesionActiva?.id,
        productosEnSesion: this.sesionActiva?.productos.length || 0
      });

      // Mostrar la sesión completa antes de guardar
      if (this.sesionActiva) {
        console.log('💾 [GUARDAR] Sesión activa completa antes de guardar:', {
          id: this.sesionActiva.id,
          productos: this.sesionActiva.productos.length,
          productosDetalles: this.sesionActiva.productos.map(p => ({
            id: p.id,
            nombre: p.nombre,
            precio: p.precioUnitario,
            cantidad: p.cantidad
          }))
        });
      }

      const jsonString = JSON.stringify(datosAlmacenamiento);
      console.log('💾 [GUARDAR] String JSON a guardar - primeros 500 chars:', jsonString.substring(0, 500));

      localStorage.setItem(this.CLAVE_ALMACENAMIENTO, jsonString);

      console.log('✅ [GUARDAR] Datos guardados exitosamente en localStorage');

      // Verificar que realmente se guardó
      const datosVerificacion = localStorage.getItem(this.CLAVE_ALMACENAMIENTO);
      if (datosVerificacion) {
        const sesionesGuardadas = JSON.parse(datosVerificacion);
        console.log('✅ [GUARDAR] Verificación - Sesiones guardadas en localStorage:', sesionesGuardadas.sesiones.length);
        console.log('✅ [GUARDAR] Verificación - Primera sesión tiene:', sesionesGuardadas.sesiones[0]?.productos.length || 0, 'productos');
        if (sesionesGuardadas.sesiones[0]?.productos.length > 0) {
          console.log('✅ [GUARDAR] Verificación - Primer producto:', sesionesGuardadas.sesiones[0].productos[0]);
        }
      } else {
        console.error('❌ [GUARDAR] ERROR: Los datos NO se guardaron en localStorage');
      }

    } catch (error) {
      console.error('❌ [GUARDAR] Error al guardar sesiones:', error);
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
      if (esSesionExpirada(sesion, new Date(this.obtenerTiempoInterno()))) {
        sesion.estado = EstadoSesion.GUARDADA;
        hayChangios = true;
      }
    });

    if (hayChangios) {
      await this.guardarSesiones();
      this.sesionesSubject.next([...this.sesiones]);
    }
  }

  private actualizarRelojInterno(): number {
    this.ultimoTimestampObservado = Math.max(this.ultimoTimestampObservado, Date.now());
    return this.ultimoTimestampObservado;
  }

  private obtenerTiempoInterno(): number {
    return this.actualizarRelojInterno();
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
