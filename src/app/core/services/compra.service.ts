/**
 * Servicio de Gestión de Compras - COMPLETO CORREGIDO
 * 
 * Maneja toda la lógica de negocio relacionada con las sesiones de compra.
 * Coordina operaciones entre productos, sesiones y almacenamiento.
 * Incluye validaciones de negocio y notificaciones automáticas.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, combineLatest } from 'rxjs';
import { map, catchError, tap, switchMap, filter } from 'rxjs/operators';

import { SesionCompra, DatosNuevaSesion, MetodoPago, EstadoSesion } from '../models/sesion-compra.model';
import { Producto, DatosNuevoProducto, CategoriaProducto } from '../models/producto.model';
import { Usuario } from '../models/usuario.model'
import { Configuracion } from '../models/configuracion.model';
import { AlmacenamientoService } from './almacenamiento.service';
import { CalculoService } from './calculo.service';

/**
 * Interfaz para resultado de operaciones de compra
 */
interface ResultadoOperacionCompra<T> {
  exito: boolean;
  datos?: T;
  mensaje?: string;
  advertencias?: string[];
  errores?: string[];
}

/**
 * Interfaz para estadísticas de sesión en tiempo real
 */
interface EstadisticasSesionTiempoReal {
  totalProductos: number;
  totalGeneral: number;
  presupuestoRestante: number | null;
  porcentajePresupuestoUsado: number | null;
  tiempoTranscurrido: string;
  promedioProducto: number;
  categoriaConMasGasto: string;
  alertasActivas: AlertaCompra[];
}

/**
 * Interfaz para alertas durante la compra
 */
interface AlertaCompra {
  tipo: 'presupuesto' | 'tiempo' | 'producto_duplicado' | 'precio_alto';
  nivel: 'info' | 'warning' | 'danger';
  mensaje: string;
  timestamp: Date;
  acciones?: string[];
}

/**
 * Interfaz para filtros de productos
 */
interface FiltroProductos {
  nombreProducto?: string;
  categorias?: CategoriaProducto[];
  precioMinimo?: number;
  precioMaximo?: number;
  ordenarPor?: 'nombre' | 'precio' | 'fecha' | 'total';
  ordenAscendente?: boolean;
}

/**
 * Interfaz para sugerencias de productos
 */
interface SugerenciaProducto {
  nombre: string;
  categoria?: CategoriaProducto;
  precioPromedio: number;
  frecuenciaCompra: number;
  ultimaVezComprado: Date;
  supermercadosDisponibles: string[];
  confianza: number; // 0-100
}

@Injectable({
  providedIn: 'root'
})
export class ComprasService {

  // Subjects para notificar cambios en tiempo real
  private readonly estadisticasTiempoRealSubject = new BehaviorSubject<EstadisticasSesionTiempoReal | null>(null);
  private readonly alertasActivasSubject = new BehaviorSubject<AlertaCompra[]>([]);
  private readonly sugerenciasProductosSubject = new BehaviorSubject<SugerenciaProducto[]>([]);

  // Observables públicos
  public readonly estadisticasTiempoReal$: Observable<EstadisticasSesionTiempoReal | null> = 
    this.estadisticasTiempoRealSubject.asObservable();
  public readonly alertasActivas$: Observable<AlertaCompra[]> = 
    this.alertasActivasSubject.asObservable();
  public readonly sugerenciasProductos$: Observable<SugerenciaProducto[]> = 
    this.sugerenciasProductosSubject.asObservable();

  // Estado interno del servicio
  private sesionActualEnMemoria: SesionCompra | null = null;
  private alertasActuales: AlertaCompra[] = [];
  private timerActualizacionEstadisticas: any = null;

  constructor(
    private almacenamientoService: AlmacenamientoService,
    private calculoService: CalculoService
  ) {
    this.inicializarServicio();
  }

  /**
   * Inicializa el servicio y sus observadores
   * @private
   */
  private inicializarServicio(): void {
    console.log('🛒 Inicializando servicio de compras...');

    // Suscribirse a cambios en la sesión activa
    this.almacenamientoService.sesionActiva$.subscribe(sesion => {
      this.sesionActualEnMemoria = sesion;
      this.actualizarEstadisticasTiempoReal();
      this.verificarAlertasAutomaticas();
    });

    // Configurar actualización periódica de estadísticas
    this.iniciarActualizacionPeriodica();

    console.log('✅ Servicio de compras inicializado');
  }

  // ==================== GESTIÓN DE SESIONES ====================

  /**
   * Crea una nueva sesión de compra
   * @param datosNuevaSesion Datos para la nueva sesión
   * @returns Observable<SesionCompra> Nueva sesión creada
   */
  public crearNuevaSesion(datosNuevaSesion: DatosNuevaSesion): Observable<SesionCompra> {
    return this.almacenamientoService.obtenerSesionActiva().pipe(
      switchMap(sesionExistente => {
        if (sesionExistente && !sesionExistente.completada) {
          return throwError(new Error('Ya existe una sesión de compra activa. Debe finalizarla antes de crear una nueva.'));
        }

        try {
          // Crear nueva sesión con validaciones
          const nuevaSesion = new SesionCompra(datosNuevaSesion);

          // Guardar como sesión activa
          return this.almacenamientoService.guardarSesion(nuevaSesion, true).pipe(
            map(exito => {
              if (exito) {
                console.log('🆕 Nueva sesión de compra creada:', nuevaSesion.id);
                
                // Generar sugerencias iniciales
                this.generarSugerenciasProductos(datosNuevaSesion.nombreSupermercado);
                
                return nuevaSesion;
              }
              throw new Error('Error guardando nueva sesión');
            })
          );
        } catch (error) {
          return throwError(error);
        }
      }),
      catchError(error => {
        console.error('❌ Error creando nueva sesión:', error);
        return throwError(error);
      })
    );
  }

  /**
   * Obtiene la sesión de compra activa
   * @returns Observable<SesionCompra | null> Sesión activa actual
   */
  public obtenerSesionActiva(): Observable<SesionCompra | null> {
    return this.almacenamientoService.obtenerSesionActiva();
  }

  /**
   * Finaliza la sesión de compra actual
   * @param datosFinalizacion Datos adicionales para finalizar
   * @returns Observable<boolean> True si se finalizó exitosamente
   */
  public finalizarSesionActiva(datosFinalizacion?: {
    metodoPago?: MetodoPago;
    numeroDocumento?: string;
    descuentos?: number;
    impuestos?: number;
    horaFin?: string;
  }): Observable<boolean> {
    return this.almacenamientoService.obtenerSesionActiva().pipe(
      switchMap(sesionActiva => {
        if (!sesionActiva) {
          return throwError(new Error('No hay sesión activa para finalizar'));
        }

        if (sesionActiva.productos.length === 0) {
          return throwError(new Error('No se puede finalizar una sesión sin productos'));
        }

        try {
          // Aplicar datos de finalización
          if (datosFinalizacion?.metodoPago) {
            sesionActiva.metodoPago = datosFinalizacion.metodoPago;
          }
          if (datosFinalizacion?.numeroDocumento) {
            sesionActiva.numeroDocumento = datosFinalizacion.numeroDocumento;
          }
          if (datosFinalizacion?.descuentos !== undefined) {
            sesionActiva.descuentos = datosFinalizacion.descuentos;
          }
          if (datosFinalizacion?.impuestos !== undefined) {
            sesionActiva.impuestos = datosFinalizacion.impuestos;
          }

          // Finalizar sesión
          sesionActiva.finalizarSesion(
            datosFinalizacion?.horaFin,
            datosFinalizacion?.metodoPago,
            datosFinalizacion?.numeroDocumento
          );

          // Recalcular totales finales
          sesionActiva.recalcularTotales();

          // Guardar sesión finalizada
          return this.almacenamientoService.guardarSesion(sesionActiva, false).pipe(
            switchMap(exitoGuardado => {
              if (!exitoGuardado) {
                throw new Error('Error guardando sesión finalizada');
              }

              // Limpiar sesión activa
              return this.almacenamientoService.limpiarSesionActiva().pipe(
                switchMap(exitoLimpieza => {
                  if (!exitoLimpieza) {
                    throw new Error('Error limpiando sesión activa');
                  }

                  // Actualizar estadísticas del usuario
                  return this.actualizarEstadisticasUsuario(sesionActiva).pipe(
                    map(() => {
                      console.log('✅ Sesión finalizada exitosamente:', sesionActiva.id);
                      
                      // Limpiar estado interno
                      this.limpiarEstadoSesion();
                      
                      return true;
                    })
                  );
                })
              );
            })
          );
        } catch (error) {
          return throwError(error);
        }
      }),
      catchError(error => {
        console.error('❌ Error finalizando sesión:', error);
        return throwError(error);
      })
    );
  }

  /**
   * Cancela la sesión de compra actual
   * @param motivoCancelacion Motivo de la cancelación
   * @returns Observable<boolean> True si se canceló exitosamente
   */
  public cancelarSesionActiva(motivoCancelacion?: string): Observable<boolean> {
    return this.almacenamientoService.obtenerSesionActiva().pipe(
      switchMap(sesionActiva => {
        if (!sesionActiva) {
          return throwError(new Error('No hay sesión activa para cancelar'));
        }

        try {
          // Marcar sesión como cancelada
          sesionActiva.cancelarSesion();
          if (motivoCancelacion) {
            sesionActiva.notas = (sesionActiva.notas || '') + `\nCancelada: ${motivoCancelacion}`;
          }

          // Opcional: guardar sesión cancelada en historial
          return this.almacenamientoService.guardarSesion(sesionActiva, false).pipe(
            switchMap(() => {
              // Limpiar sesión activa
              return this.almacenamientoService.limpiarSesionActiva().pipe(
                map(exito => {
                  if (exito) {
                    console.log('🚫 Sesión cancelada:', sesionActiva.id);
                    this.limpiarEstadoSesion();
                    return true;
                  }
                  throw new Error('Error limpiando sesión cancelada');
                })
              );
            })
          );
        } catch (error) {
          return throwError(error);
        }
      }),
      catchError(error => {
        console.error('❌ Error cancelando sesión:', error);
        return throwError(error);
      })
    );
  }

  /**
   * Pausa la sesión actual (guarda progreso sin finalizar)
   * @returns Observable<boolean> True si se pausó exitosamente
   */
  public pausarSesionActiva(): Observable<boolean> {
    return this.almacenamientoService.obtenerSesionActiva().pipe(
      switchMap(sesionActiva => {
        if (!sesionActiva) {
          return throwError(new Error('No hay sesión activa para pausar'));
        }

        // Agregar nota de pausa
        const timestampPausa = new Date().toLocaleString();
        sesionActiva.notas = (sesionActiva.notas || '') + `\nPausada: ${timestampPausa}`;

        // Guardar progreso actual
        return this.almacenamientoService.guardarSesion(sesionActiva, true).pipe(
          map(exito => {
            if (exito) {
              console.log('⏸️ Sesión pausada:', sesionActiva.id);
              return true;
            }
            throw new Error('Error pausando sesión');
          })
        );
      }),
      catchError(error => {
        console.error('❌ Error pausando sesión:', error);
        return throwError(error);
      })
    );
  }

  // ==================== GESTIÓN DE PRODUCTOS ====================

  /**
   * Agrega un producto a la sesión activa
   * @param datosProducto Datos del producto a agregar
   * @returns Observable<Producto> Producto agregado
   */
  public agregarProducto(datosProducto: DatosNuevoProducto): Observable<Producto> {
    return this.almacenamientoService.obtenerSesionActiva().pipe(
      switchMap(sesionActiva => {
        if (!sesionActiva) {
          return throwError(new Error('No hay sesión activa para agregar productos'));
        }

        try {
          // Crear nuevo producto con validaciones
          const nuevoProducto = new Producto(datosProducto);

          // Verificar límites de configuración
          return this.verificarLimitesProducto(sesionActiva, nuevoProducto).pipe(
            switchMap(verificacion => {
              if (!verificacion.exito) {
                return throwError(new Error(verificacion.mensaje || 'Error en verificación de límites'));
              }

              // Agregar producto a la sesión
              sesionActiva.agregarProducto(nuevoProducto);

              // Guardar sesión actualizada
              return this.almacenamientoService.guardarSesion(sesionActiva, true).pipe(
                switchMap(exito => {
                  if (!exito) {
                    throw new Error('Error guardando sesión con nuevo producto');
                  }

                  // Actualizar producto favorito del usuario
                  return this.actualizarProductoFavorito(nuevoProducto, sesionActiva.nombreSupermercado).pipe(
                    map(() => {
                      console.log('➕ Producto agregado:', nuevoProducto.nombre);
                      
                      // Verificar alertas automáticas
                      this.verificarAlertasProducto(nuevoProducto, sesionActiva);
                      
                      return nuevoProducto;
                    })
                  );
                })
              );
            })
          );
        } catch (error) {
          return throwError(error);
        }
      }),
      catchError(error => {
        console.error('❌ Error agregando producto:', error);
        return throwError(error);
      })
    );
  }

  /**
   * Actualiza un producto existente en la sesión
   * @param idProducto ID del producto a actualizar
   * @param datosActualizados Datos a actualizar
   * @returns Observable<boolean> True si se actualizó exitosamente
   */
  public actualizarProducto(idProducto: string, datosActualizados: Partial<DatosNuevoProducto>): Observable<boolean> {
    return this.almacenamientoService.obtenerSesionActiva().pipe(
      switchMap(sesionActiva => {
        if (!sesionActiva) {
          return throwError(new Error('No hay sesión activa'));
        }

        const exito = sesionActiva.actualizarProducto(idProducto, datosActualizados);
        if (!exito) {
          return throwError(new Error('Producto no encontrado para actualizar'));
        }

        // Guardar sesión actualizada
        return this.almacenamientoService.guardarSesion(sesionActiva, true).pipe(
          map(exitoGuardado => {
            if (exitoGuardado) {
              console.log('✏️ Producto actualizado:', idProducto);
              return true;
            }
            throw new Error('Error guardando producto actualizado');
          })
        );
      }),
      catchError(error => {
        console.error('❌ Error actualizando producto:', error);
        return throwError(error);
      })
    );
  }

  /**
   * Elimina un producto de la sesión activa
   * @param idProducto ID del producto a eliminar
   * @returns Observable<boolean> True si se eliminó exitosamente
   */
  public eliminarProducto(idProducto: string): Observable<boolean> {
    return this.almacenamientoService.obtenerSesionActiva().pipe(
      switchMap(sesionActiva => {
        if (!sesionActiva) {
          return throwError(new Error('No hay sesión activa'));
        }

        const exito = sesionActiva.eliminarProducto(idProducto);
        if (!exito) {
          return throwError(new Error('Producto no encontrado para eliminar'));
        }

        // Guardar sesión actualizada
        return this.almacenamientoService.guardarSesion(sesionActiva, true).pipe(
          map(exitoGuardado => {
            if (exitoGuardado) {
              console.log('🗑️ Producto eliminado:', idProducto);
              return true;
            }
            throw new Error('Error guardando tras eliminar producto');
          })
        );
      }),
      catchError(error => {
        console.error('❌ Error eliminando producto:', error);
        return throwError(error);
      })
    );
  }

  /**
   * Busca productos en la sesión actual
   * @param filtros Filtros de búsqueda
   * @returns Observable<Producto[]> Productos que cumplen los filtros
   */
  public buscarProductosEnSesion(filtros: FiltroProductos): Observable<Producto[]> {
    return this.almacenamientoService.obtenerSesionActiva().pipe(
      map(sesionActiva => {
        if (!sesionActiva) {
          return [];
        }

        let productos = [...sesionActiva.productos];

        // Aplicar filtros
        if (filtros.nombreProducto) {
          const busqueda = filtros.nombreProducto.toLowerCase();
          productos = productos.filter(p => 
            p.nombre.toLowerCase().includes(busqueda)
          );
        }

        if (filtros.categorias && filtros.categorias.length > 0) {
          productos = productos.filter(p => 
            p.categoria && filtros.categorias!.includes(p.categoria)
          );
        }

        if (filtros.precioMinimo !== undefined) {
          productos = productos.filter(p => p.precioUnitario >= filtros.precioMinimo!);
        }

        if (filtros.precioMaximo !== undefined) {
          productos = productos.filter(p => p.precioUnitario <= filtros.precioMaximo!);
        }

// Aplicar ordenamiento
        if (filtros.ordenarPor) {
          productos.sort((a, b) => {
            let valorA: any, valorB: any;

            switch (filtros.ordenarPor) {
              case 'nombre':
                valorA = a.nombre.toLowerCase();
                valorB = b.nombre.toLowerCase();
                break;
              case 'precio':
                valorA = a.precioUnitario;
                valorB = b.precioUnitario;
                break;
              case 'fecha':
                valorA = a.fechaAgregado.getTime();
                valorB = b.fechaAgregado.getTime();
                break;
              case 'total':
                valorA = a.total;
                valorB = b.total;
                break;
              default:
                return 0;
            }

            if (valorA < valorB) return filtros.ordenAscendente ? -1 : 1;
            if (valorA > valorB) return filtros.ordenAscendente ? 1 : -1;
            return 0;
          });
        }

        return productos;
      }),
      catchError(error => {
        console.error('❌ Error buscando productos:', error);
        return of([]);
      })
    );
  }

  // ==================== SUGERENCIAS Y RECOMENDACIONES ====================

  /**
   * Genera sugerencias de productos basadas en historial
   * @param nombreSupermercado Supermercado actual
   * @returns Observable<SugerenciaProducto[]> Lista de sugerencias
   */
  public generarSugerenciasProductos(nombreSupermercado: string): Observable<SugerenciaProducto[]> {
    return combineLatest([
      this.almacenamientoService.obtenerUsuario(),
      this.almacenamientoService.obtenerSesiones()
    ]).pipe(
      map(([usuario, sesiones]) => {
        const sugerencias: SugerenciaProducto[] = [];

        if (!usuario || !sesiones) {
          return sugerencias;
        }

        // Obtener productos favoritos del usuario
        const productosFavoritos = usuario.obtenerProductosFavoritosOrdenados(20);

        for (const productoFav of productosFavoritos) {
          // Verificar si está disponible en este supermercado
          const disponibleEnSuper = productoFav.supermercadosDisponibles.includes(nombreSupermercado);
          
          // Calcular confianza basada en frecuencia y disponibilidad
          let confianza = Math.min(productoFav.frecuenciaCompra * 10, 100);
          if (disponibleEnSuper) {
            confianza = Math.min(confianza + 20, 100);
          }

          // Solo incluir sugerencias con confianza mínima
          if (confianza >= 30) {
            sugerencias.push({
              nombre: productoFav.nombre,
              categoria: productoFav.categoria as CategoriaProducto,
              precioPromedio: productoFav.precioPromedio,
              frecuenciaCompra: productoFav.frecuenciaCompra,
              ultimaVezComprado: productoFav.fechaUltimaCompra,
              supermercadosDisponibles: productoFav.supermercadosDisponibles,
              confianza: Math.round(confianza)
            });
          }
        }

        // Ordenar por confianza descendente
        sugerencias.sort((a, b) => b.confianza - a.confianza);

        // Actualizar subject
        this.sugerenciasProductosSubject.next(sugerencias.slice(0, 10));

        return sugerencias;
      }),
      catchError(error => {
        console.error('❌ Error generando sugerencias:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene productos similares basados en categoría y precio
   * @param producto Producto de referencia
   * @returns Observable<SugerenciaProducto[]> Productos similares
   */
  public obtenerProductosSimilares(producto: Producto): Observable<SugerenciaProducto[]> {
    return this.almacenamientoService.obtenerSesiones().pipe(
      map(sesiones => {
        const productosSimilares: Map<string, SugerenciaProducto> = new Map();

        if (!sesiones) {
          return [];
        }

        // Rango de precio similar (±20%)
        const precioMin = producto.precioUnitario * 0.8;
        const precioMax = producto.precioUnitario * 1.2;

        // Buscar en historial de sesiones
        for (const sesion of sesiones) {
          for (const prodHistorial of sesion.productos) {
            // Excluir el mismo producto
            if (prodHistorial.nombre.toLowerCase() === producto.nombre.toLowerCase()) {
              continue;
            }

            // Filtrar por categoría similar
            if (producto.categoria && prodHistorial.categoria !== producto.categoria) {
              continue;
            }

            // Filtrar por rango de precio
            if (prodHistorial.precioUnitario < precioMin || prodHistorial.precioUnitario > precioMax) {
              continue;
            }

            // Agregar o actualizar sugerencia
            const key = prodHistorial.nombre.toLowerCase();
            if (productosSimilares.has(key)) {
              const existente = productosSimilares.get(key)!;
              existente.frecuenciaCompra += 1;
              existente.precioPromedio = (existente.precioPromedio + prodHistorial.precioUnitario) / 2;
            } else {
              productosSimilares.set(key, {
                nombre: prodHistorial.nombre,
                categoria: prodHistorial.categoria,
                precioPromedio: prodHistorial.precioUnitario,
                frecuenciaCompra: 1,
                ultimaVezComprado: new Date(sesion.fecha),
                supermercadosDisponibles: [sesion.nombreSupermercado],
                confianza: 60 // Confianza media para productos similares
              });
            }
          }
        }

        // Convertir a array y ordenar por frecuencia
        const resultado = Array.from(productosSimilares.values())
          .sort((a, b) => b.frecuenciaCompra - a.frecuenciaCompra)
          .slice(0, 5);

        return resultado;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo productos similares:', error);
        return of([]);
      })
    );
  }

  // ==================== ESTADÍSTICAS Y ALERTAS ====================

  /**
   * Actualiza estadísticas en tiempo real de la sesión
   * @private
   */
  private actualizarEstadisticasTiempoReal(): void {
    if (!this.sesionActualEnMemoria) {
      this.estadisticasTiempoRealSubject.next(null);
      return;
    }

    const sesion = this.sesionActualEnMemoria;
    const resumen = sesion.obtenerResumen();

    // Calcular tiempo transcurrido
    const ahora = new Date();
    const inicioHoy = new Date();
    const [hora, minuto] = sesion.horaInicio.split(':').map(Number);
    inicioHoy.setHours(hora, minuto, 0, 0);
    
    const tiempoTranscurridoMs = ahora.getTime() - inicioHoy.getTime();
    const horas = Math.floor(tiempoTranscurridoMs / (1000 * 60 * 60));
    const minutos = Math.floor((tiempoTranscurridoMs % (1000 * 60 * 60)) / (1000 * 60));
    const tiempoTranscurrido = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;

    // Calcular presupuesto restante
    let presupuestoRestante: number | null = null;
    let porcentajePresupuestoUsado: number | null = null;

    if (sesion.presupuestoEstimado) {
      presupuestoRestante = sesion.presupuestoEstimado - sesion.totalGeneral;
      porcentajePresupuestoUsado = sesion.porcentajePresupuestoUtilizado();
    }

    const estadisticas: EstadisticasSesionTiempoReal = {
      totalProductos: resumen.cantidadProductos,
      totalGeneral: resumen.totalFinal,
      presupuestoRestante,
      porcentajePresupuestoUsado,
      tiempoTranscurrido,
      promedioProducto: resumen.promedioProducto,
      categoriaConMasGasto: resumen.categoriaConMasGasto,
      alertasActivas: this.alertasActuales
    };

    this.estadisticasTiempoRealSubject.next(estadisticas);
  }

  /**
   * Verifica alertas automáticas durante la compra
   * @private
   */
  private verificarAlertasAutomaticas(): void {
    if (!this.sesionActualEnMemoria) {
      this.alertasActuales = [];
      this.alertasActivasSubject.next(this.alertasActuales);
      return;
    }

    const sesion = this.sesionActualEnMemoria;
    const nuevasAlertas: AlertaCompra[] = [];

    // Alerta de presupuesto
    if (sesion.presupuestoEstimado) {
      const porcentajeUsado = sesion.porcentajePresupuestoUtilizado();
      
      if (porcentajeUsado >= 100) {
        nuevasAlertas.push({
          tipo: 'presupuesto',
          nivel: 'danger',
          mensaje: `¡Presupuesto excedido! Has gastado ${porcentajeUsado.toFixed(1)}% del presupuesto.`,
          timestamp: new Date(),
          acciones: ['Revisar productos', 'Ajustar presupuesto']
        });
      } else if (porcentajeUsado >= 90) {
        nuevasAlertas.push({
          tipo: 'presupuesto',
          nivel: 'warning',
          mensaje: `Te queda solo ${(100 - porcentajeUsado).toFixed(1)}% del presupuesto.`,
          timestamp: new Date(),
          acciones: ['Revisar productos restantes']
        });
      } else if (porcentajeUsado >= 80) {
        nuevasAlertas.push({
          tipo: 'presupuesto',
          nivel: 'info',
          mensaje: `Has usado ${porcentajeUsado.toFixed(1)}% de tu presupuesto.`,
          timestamp: new Date()
        });
      }
    }

    // Alerta de tiempo excesivo
    const tiempoTranscurridoMs = this.calcularTiempoTranscurrido(sesion);
    const horasTranscurridas = tiempoTranscurridoMs / (1000 * 60 * 60);
    
    if (horasTranscurridas > 2) {
      nuevasAlertas.push({
        tipo: 'tiempo',
        nivel: 'warning',
        mensaje: `Llevas más de 2 horas comprando. ¿Todo bien?`,
        timestamp: new Date(),
        acciones: ['Pausar sesión', 'Finalizar compra']
      });
    }

    this.alertasActuales = nuevasAlertas;
    this.alertasActivasSubject.next(this.alertasActuales);
  }

  /**
   * Verifica alertas específicas de un producto
   * @private
   */
  private verificarAlertasProducto(producto: Producto, sesion: SesionCompra): void {
    const nuevasAlertas: AlertaCompra[] = [...this.alertasActuales];

    // Verificar productos duplicados
    const productosIguales = sesion.productos.filter(p => 
      p.id !== producto.id && p.esIgualA(producto)
    );

    if (productosIguales.length > 0) {
      nuevasAlertas.push({
        tipo: 'producto_duplicado',
        nivel: 'warning',
        mensaje: `Ya tienes "${producto.nombre}" en tu carrito. ¿Deseas agregar más cantidad?`,
        timestamp: new Date(),
        acciones: ['Combinar productos', 'Mantener separado']
      });
    }

    // Verificar precio inusualmente alto
    // (Esta lógica se puede expandir comparando con historial de precios)
    if (producto.precioUnitario > 50000) { // Ejemplo: más de $50,000
      nuevasAlertas.push({
        tipo: 'precio_alto',
        nivel: 'info',
        mensaje: `"${producto.nombre}" tiene un precio alto ($${producto.precioUnitario.toLocaleString()}). ¿Es correcto?`,
        timestamp: new Date(),
        acciones: ['Verificar precio', 'Continuar']
      });
    }

    this.alertasActuales = nuevasAlertas;
    this.alertasActivasSubject.next(this.alertasActuales);
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Verifica límites de configuración para agregar producto
   * @private
   */
  private verificarLimitesProducto(sesion: SesionCompra, producto: Producto): Observable<ResultadoOperacionCompra<void>> {
    return this.almacenamientoService.obtenerConfiguracion().pipe(
      map(configuracion => {
        const advertencias: string[] = [];

        // Verificar límite de productos por sesión
        if (sesion.productos.length >= configuracion.datos.limiteProductosPorSesion) {
          return {
            exito: false,
            mensaje: `Has alcanzado el límite de ${configuracion.datos.limiteProductosPorSesion} productos por sesión.`,
            errores: ['Límite de productos excedido']
          };
        }

        // Advertencias adicionales
        if (sesion.productos.length > configuracion.datos.limiteProductosPorSesion * 0.8) {
          advertencias.push('Te acercas al límite de productos por sesión');
        }

        return {
          exito: true,
          advertencias
        };
      })
    );
  }

  /**
   * Actualiza el producto favorito del usuario
   * @private
   */
  private actualizarProductoFavorito(producto: Producto, nombreSupermercado: string): Observable<boolean> {
    return this.almacenamientoService.obtenerUsuario().pipe(
      switchMap(usuario => {
        if (!usuario) {
          return of(false);
        }

        usuario.actualizarProductoFavorito(
          producto.nombre,
          producto.precioUnitario,
          producto.categoria,
          nombreSupermercado
        );

        return this.almacenamientoService.guardarUsuario(usuario);
      }),
      catchError(error => {
        console.error('Error actualizando producto favorito:', error);
        return of(false);
      })
    );
  }

  /**
   * Actualiza estadísticas del usuario después de finalizar sesión
   * @private
   */
  private actualizarEstadisticasUsuario(sesion: SesionCompra): Observable<boolean> {
    return this.almacenamientoService.obtenerUsuario().pipe(
      switchMap(usuario => {
        if (!usuario) {
          return of(false);
        }

        // Calcular tiempo de sesión
        let tiempoSesion = 0;
        if (sesion.horaFin && sesion.horaInicio) {
          const [horaIni, minIni] = sesion.horaInicio.split(':').map(Number);
          const [horaFin, minFin] = sesion.horaFin.split(':').map(Number);
          tiempoSesion = (horaFin * 60 + minFin) - (horaIni * 60 + minIni);
        }

        // Actualizar estadísticas
        usuario.actualizarEstadisticasConSesion(
          sesion.totalGeneral,
          sesion.productos.length,
          sesion.nombreSupermercado,
          tiempoSesion
        );

        return this.almacenamientoService.guardarUsuario(usuario);
      }),
      catchError(error => {
        console.error('Error actualizando estadísticas de usuario:', error);
        return of(false);
      })
    );
  }

  /**
   * Calcula tiempo transcurrido desde inicio de sesión
   * @private
   */
  private calcularTiempoTranscurrido(sesion: SesionCompra): number {
    const ahora = new Date();
    const inicioHoy = new Date();
    const [hora, minuto] = sesion.horaInicio.split(':').map(Number);
    inicioHoy.setHours(hora, minuto, 0, 0);
    
    return ahora.getTime() - inicioHoy.getTime();
  }

  /**
   * Inicia actualización periódica de estadísticas
   * @private
   */
  private iniciarActualizacionPeriodica(): void {
    // Actualizar estadísticas cada 30 segundos
    this.timerActualizacionEstadisticas = setInterval(() => {
      if (this.sesionActualEnMemoria && !this.sesionActualEnMemoria.completada) {
        this.actualizarEstadisticasTiempoReal();
        this.verificarAlertasAutomaticas();
      }
    }, 30000);
  }

  /**
   * Limpia estado interno de la sesión
   * @private
   */
  private limpiarEstadoSesion(): void {
    this.sesionActualEnMemoria = null;
    this.alertasActuales = [];
    this.estadisticasTiempoRealSubject.next(null);
    this.alertasActivasSubject.next([]);
    this.sugerenciasProductosSubject.next([]);
  }

  // ==================== MÉTODOS PÚBLICOS ADICIONALES ====================

  /**
   * Obtiene historial de sesiones con filtros
   * @param filtros Filtros de búsqueda
   * @returns Observable<SesionCompra[]> Sesiones filtradas
   */
  public obtenerHistorialSesiones(filtros?: {
    nombreSupermercado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    completada?: boolean;
    montoMinimo?: number;
    montoMaximo?: number;
    limite?: number;
  }): Observable<SesionCompra[]> {
    return this.almacenamientoService.obtenerSesiones().pipe(
      map(sesiones => {
        if (!sesiones) {
          return [];
        }

        let resultado = [...sesiones];

        // Aplicar filtros si se proporcionan
        if (filtros) {
          if (filtros.nombreSupermercado) {
            const busqueda = filtros.nombreSupermercado.toLowerCase();
            resultado = resultado.filter(s => 
              s.nombreSupermercado.toLowerCase().includes(busqueda)
            );
          }

          if (filtros.fechaDesde) {
            resultado = resultado.filter(s => s.fecha >= filtros.fechaDesde!);
          }

          if (filtros.fechaHasta) {
            resultado = resultado.filter(s => s.fecha <= filtros.fechaHasta!);
          }

          if (filtros.completada !== undefined) {
            resultado = resultado.filter(s => s.completada === filtros.completada);
          }

          if (filtros.montoMinimo !== undefined) {
            resultado = resultado.filter(s => s.totalGeneral >= filtros.montoMinimo!);
          }

          if (filtros.montoMaximo !== undefined) {
            resultado = resultado.filter(s => s.totalGeneral <= filtros.montoMaximo!);
          }

          if (filtros.limite && filtros.limite > 0) {
            resultado = resultado.slice(0, filtros.limite);
          }
        }

        return resultado;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo historial:', error);
        return of([]);
      })
    );
  }

  /**
   * Duplica una sesión existente como nueva sesión
   * @param idSesionOriginal ID de la sesión a duplicar
   * @param nuevosNombreSupermercado Nuevo nombre de supermercado (opcional)
   * @returns Observable<SesionCompra> Nueva sesión duplicada
   */
  public duplicarSesion(idSesionOriginal: string, nuevosNombreSupermercado?: string): Observable<SesionCompra> {
    return this.almacenamientoService.obtenerSesiones().pipe(
      switchMap(sesiones => {
        const sesionOriginal = sesiones?.find(s => s.id === idSesionOriginal);
        
        if (!sesionOriginal) {
          return throwError(new Error('Sesión original no encontrada'));
        }

        // Verificar que no hay sesión activa
        return this.almacenamientoService.obtenerSesionActiva().pipe(
          switchMap(sesionActiva => {
            if (sesionActiva && !sesionActiva.completada) {
              return throwError(new Error('Debe finalizar la sesión activa antes de duplicar otra'));
            }

            try {
              // Crear nueva sesión basada en la original
              const datosNuevaSesion: DatosNuevaSesion = {
                nombreSupermercado: nuevosNombreSupermercado || sesionOriginal.nombreSupermercado,
                presupuestoEstimado: sesionOriginal.presupuestoEstimado,
                notas: `Duplicada de sesión del ${sesionOriginal.fecha}`,
                ubicacion: sesionOriginal.ubicacion
              };

              return this.crearNuevaSesion(datosNuevaSesion).pipe(
                switchMap(nuevaSesion => {
                  // Agregar productos de la sesión original
                  const productosOriginales = sesionOriginal.productos.map(p => ({
                    nombre: p.nombre,
                    precioUnitario: p.precioUnitario,
                    cantidad: p.cantidad,
                    categoria: p.categoria,
                    notas: p.notas
                  }));

                  // Agregar productos uno por uno
                  const agregados$ = productosOriginales.map(prodData => 
                    this.agregarProducto(prodData)
                  );

                  // Ejecutar todas las adiciones en secuencia
                  let chain$ = of(null as null | Producto);
                  for (const agregado$ of agregados$) {
                    chain$ = chain$.pipe(switchMap(() => agregado$));
                  }

                  return chain$.pipe(
                    map(() => {
                      console.log('📋 Sesión duplicada exitosamente:', nuevaSesion.id);
                      return nuevaSesion;
                    })
                  );
                })
              );
            } catch (error) {
              return throwError(error);
            }
          })
        );
      }),
      catchError(error => {
        console.error('❌ Error duplicando sesión:', error);
        return throwError(error);
      })
    );
  }

  /**
   * Obtiene estadísticas comparativas entre supermercados
   * @param limite Número máximo de supermercados a comparar
   * @returns Observable<any[]> Estadísticas comparativas
   */
  public obtenerEstadisticasComparativas(limite: number = 5): Observable<any[]> {
    return this.almacenamientoService.obtenerSesiones().pipe(
      map(sesiones => {
        if (!sesiones || sesiones.length === 0) {
          return [];
        }

        // Agrupar por supermercado
        const estadisticasPorSuper = new Map<string, {
          nombre: string;
          totalSesiones: number;
          totalGastado: number;
          promedioGasto: number;
          totalProductos: number;
          ultimaVisita: string;
        }>();

        for (const sesion of sesiones) {
          if (!sesion.completada) continue;

          const nombre = sesion.nombreSupermercado;
          
          if (estadisticasPorSuper.has(nombre)) {
            const stats = estadisticasPorSuper.get(nombre)!;
            stats.totalSesiones += 1;
            stats.totalGastado += sesion.totalGeneral;
            stats.totalProductos += sesion.productos.length;
            
            // Actualizar última visita si es más reciente
            if (sesion.fecha > stats.ultimaVisita) {
              stats.ultimaVisita = sesion.fecha;
            }
          } else {
            estadisticasPorSuper.set(nombre, {
              nombre,
              totalSesiones: 1,
              totalGastado: sesion.totalGeneral,
              promedioGasto: 0,
              totalProductos: sesion.productos.length,
              ultimaVisita: sesion.fecha
            });
          }
        }

        // Calcular promedios
        for (const stats of estadisticasPorSuper.values()) {
          stats.promedioGasto = stats.totalGastado / stats.totalSesiones;
        }

        // Convertir a array y ordenar por total gastado
        const resultado = Array.from(estadisticasPorSuper.values())
          .sort((a, b) => b.totalGastado - a.totalGastado)
          .slice(0, limite);

        return resultado;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo estadísticas comparativas:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene tendencias de precios de un producto específico
   * @param nombreProducto Nombre del producto
   * @returns Observable<any[]> Historial de precios
   */
  public obtenerTendenciasPrecio(nombreProducto: string): Observable<any[]> {
    return this.almacenamientoService.obtenerSesiones().pipe(
      map(sesiones => {
        if (!sesiones) {
          return [];
        }

        const historialPrecios: any[] = [];
        const busqueda = nombreProducto.toLowerCase();

        for (const sesion of sesiones) {
          if (!sesion.completada) continue;

          for (const producto of sesion.productos) {
            if (producto.nombre.toLowerCase().includes(busqueda)) {
              historialPrecios.push({
                fecha: sesion.fecha,
                precio: producto.precioUnitario,
                cantidad: producto.cantidad,
                total: producto.total,
                supermercado: sesion.nombreSupermercado,
                nombreExacto: producto.nombre
              });
            }
          }
        }

        // Ordenar por fecha
        historialPrecios.sort((a, b) => a.fecha.localeCompare(b.fecha));

        return historialPrecios;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo tendencias de precio:', error);
        return of([]);
      })
    );
  }

  /**
   * Calcula el ahorro potencial comparando precios entre supermercados
   * @param productosActuales Lista de productos actuales
   * @returns Observable<any> Análisis de ahorro potencial
   */
  public calcularAhorroPotencial(productosActuales: Producto[]): Observable<any> {
    return this.almacenamientoService.obtenerSesiones().pipe(
      map(sesiones => {
        if (!sesiones || productosActuales.length === 0) {
          return { ahorroTotal: 0, sugerencias: [] };
        }

        const sugerenciasAhorro: any[] = [];
        let ahorroTotal = 0;

        for (const productoActual of productosActuales) {
          const mejoresPreciosEnSupers = new Map<string, number>();

          // Buscar mejores precios en historial
          for (const sesion of sesiones) {
            if (!sesion.completada) continue;

            for (const prodHistorial of sesion.productos) {
              if (prodHistorial.nombre.toLowerCase() === productoActual.nombre.toLowerCase()) {
                const supermercado = sesion.nombreSupermercado;
                const precio = prodHistorial.precioUnitario;

                if (!mejoresPreciosEnSupers.has(supermercado) || mejoresPreciosEnSupers.get(supermercado)! > precio) {
                  mejoresPreciosEnSupers.set(supermercado, precio);
                }
              }
            }
          }

          // Encontrar el mejor precio
          let mejorPrecio = productoActual.precioUnitario;
          let mejorSupermercado = 'Actual';

          for (const [supermarket, precio] of mejoresPreciosEnSupers.entries()) {
            if (precio < mejorPrecio) {
              mejorPrecio = precio;
              mejorSupermercado = supermarket;
            }
          }

          // Calcular ahorro potencial
          if (mejorPrecio < productoActual.precioUnitario) {
            const ahorro = (productoActual.precioUnitario - mejorPrecio) * productoActual.cantidad;
            ahorroTotal += ahorro;

            sugerenciasAhorro.push({
              producto: productoActual.nombre,
              precioActual: productoActual.precioUnitario,
              mejorPrecio,
              mejorSupermercado,
              cantidad: productoActual.cantidad,
              ahorroUnitario: productoActual.precioUnitario - mejorPrecio,
              ahorroTotal: ahorro
            });
          }
        }

        return {
          ahorroTotal: Math.round(ahorroTotal),
          sugerencias: sugerenciasAhorro.sort((a, b) => b.ahorroTotal - a.ahorroTotal)
        };
      }),
      catchError(error => {
        console.error('❌ Error calculando ahorro potencial:', error);
        return of({ ahorroTotal: 0, sugerencias: [] });
      })
    );
  }

/**
   * Obtiene resumen de gastos por categoría - CORREGIDO
   * @param periodoMeses Número de meses hacia atrás a considerar
   * @returns Observable<any[]> Gastos por categoría
   */
  public obtenerGastosPorCategoria(periodoMeses: number = 3): Observable<any[]> {
    return this.almacenamientoService.obtenerSesiones().pipe(
      map(sesiones => {
        if (!sesiones) {
          return [];
        }

        // Calcular fecha límite
        const fechaLimite = new Date();
        fechaLimite.setMonth(fechaLimite.getMonth() - periodoMeses);
        const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];

        // Agrupar gastos por categoría
        const gastosPorCategoria = new Map<string, {
          categoria: string;
          totalGastado: number;
          cantidadProductos: number;
          sesionesConCategoria: number;
          promedioPorProducto: number;
        }>();

        for (const sesion of sesiones) {
          if (!sesion.completada || sesion.fecha < fechaLimiteStr) {
            continue;
          }

          const categoriasEnSesion = new Set<string>();

          for (const producto of sesion.productos) {
            const categoria = producto.categoria || 'Sin categoría';
            categoriasEnSesion.add(categoria);

            if (gastosPorCategoria.has(categoria)) {
              const stats = gastosPorCategoria.get(categoria)!;
              stats.totalGastado += producto.total;
              stats.cantidadProductos += producto.cantidad;
            } else {
              gastosPorCategoria.set(categoria, {
                categoria,
                totalGastado: producto.total,
                cantidadProductos: producto.cantidad,
                sesionesConCategoria: 0,
                promedioPorProducto: 0
              });
            }
          }

          // Contar sesiones que incluyeron cada categoría
          for (const categoria of categoriasEnSesion) {
            gastosPorCategoria.get(categoria)!.sesionesConCategoria += 1;
          }
        }

        // Calcular promedios y convertir a array
        const resultado = Array.from(gastosPorCategoria.values()).map(stats => {
          stats.promedioPorProducto = stats.totalGastado / stats.cantidadProductos;
          return {
            ...stats,
            totalGastado: Math.round(stats.totalGastado),
            promedioPorProducto: Math.round(stats.promedioPorProducto)
          };
        });

        // Ordenar por total gastado descendente
        resultado.sort((a, b) => b.totalGastado - a.totalGastado);

        return resultado;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo gastos por categoría:', error);
        return of([]);
      })
    );
  }

  /**
   * Limpia alertas activas
   * @param tipoAlerta Tipo específico de alerta a limpiar (opcional)
   * @returns void
   */
  public limpiarAlertas(tipoAlerta?: 'presupuesto' | 'tiempo' | 'producto_duplicado' | 'precio_alto'): void {
    if (tipoAlerta) {
      this.alertasActuales = this.alertasActuales.filter(alerta => alerta.tipo !== tipoAlerta);
    } else {
      this.alertasActuales = [];
    }
    
    this.alertasActivasSubject.next(this.alertasActuales);
  }

  /**
   * Fuerza actualización de estadísticas en tiempo real
   * @returns void
   */
  public forzarActualizacionEstadisticas(): void {
    this.actualizarEstadisticasTiempoReal();
    this.verificarAlertasAutomaticas();
  }

  /**
   * Obtiene información de debug del servicio - CORREGIDO
   * @returns Observable<any> Información de debug
   */
  public obtenerInfoDebug(): Observable<any> {
    return combineLatest([
      this.almacenamientoService.obtenerSesionActiva(),
      this.estadisticasTiempoReal$,
      this.alertasActivas$,
      this.sugerenciasProductos$
    ]).pipe(
      map(([sesionActiva, estadisticas, alertas, sugerencias]) => ({
        servicioInicializado: true,
        sesionActivaEnMemoria: !!this.sesionActualEnMemoria,
        sesionActivaEnStorage: !!sesionActiva,
        estadisticasGeneradas: !!estadisticas,
        alertasActivas: alertas.length,
        sugerenciasDisponibles: sugerencias.length,
        timerActivo: !!this.timerActualizacionEstadisticas,
        timestamp: new Date().toISOString()
      })),
      catchError(error => {
        console.error('Error obteniendo info de debug:', error);
        return of({
          servicioInicializado: true,
          sesionActivaEnMemoria: !!this.sesionActualEnMemoria,
          sesionActivaEnStorage: false,
          estadisticasGeneradas: false,
          alertasActivas: 0,
          sugerenciasDisponibles: 0,
          timerActivo: !!this.timerActualizacionEstadisticas,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      })
    );
  }

  /**
   * Obtiene estadísticas de rendimiento del servicio
   * @returns Observable<any> Estadísticas de rendimiento
   */
  public obtenerEstadisticasRendimiento(): Observable<any> {
    return this.almacenamientoService.obtenerSesiones().pipe(
      map(sesiones => {
        const totalSesiones = sesiones?.length || 0;
        const sesionesCompletadas = sesiones?.filter(s => s.completada).length || 0;
        const sesionesEnProgreso = sesiones?.filter(s => !s.completada).length || 0;
        
        let totalProductos = 0;
        let tiempoPromedioSesion = 0;
        
        if (sesiones) {
          for (const sesion of sesiones) {
            totalProductos += sesion.productos.length;
            
            if (sesion.horaInicio && sesion.horaFin) {
              const [horaIni, minIni] = sesion.horaInicio.split(':').map(Number);
              const [horaFin, minFin] = sesion.horaFin.split(':').map(Number);
              const duracion = (horaFin * 60 + minFin) - (horaIni * 60 + minIni);
              tiempoPromedioSesion += duracion;
            }
          }
          
          tiempoPromedioSesion = sesionesCompletadas > 0 ? 
            Math.round(tiempoPromedioSesion / sesionesCompletadas) : 0;
        }

        return {
          totalSesiones,
          sesionesCompletadas,
          sesionesEnProgreso,
          totalProductos,
          promedioProductosPorSesion: totalSesiones > 0 ? 
            Math.round(totalProductos / totalSesiones) : 0,
          tiempoPromedioSesion,
          alertasActivas: this.alertasActuales.length,
          cacheSize: this.sugerenciasProductosSubject.value.length,
          timestamp: new Date().toISOString()
        };
      }),
      catchError(error => {
        console.error('Error obteniendo estadísticas de rendimiento:', error);
        return of({
          error: 'Error calculando estadísticas de rendimiento',
          timestamp: new Date().toISOString()
        });
      })
    );
  }

  /**
   * Exporta datos de sesión actual para respaldo
   * @returns Observable<any> Datos de la sesión actual
   */
  public exportarSesionActual(): Observable<any> {
    return this.almacenamientoService.obtenerSesionActiva().pipe(
      map(sesionActiva => {
        if (!sesionActiva) {
          return null;
        }

        return {
          sesion: JSON.parse(sesionActiva.toJSON()),
          estadisticas: this.estadisticasTiempoRealSubject.value,
          alertas: this.alertasActuales,
          sugerencias: this.sugerenciasProductosSubject.value,
          metadata: {
            exportadoEn: new Date().toISOString(),
            version: '1.0.0',
            aplicacion: 'Carrito'
          }
        };
      }),
      catchError(error => {
        console.error('Error exportando sesión actual:', error);
        return of(null);
      })
    );
  }

  /**
   * Valida la integridad de una sesión
   * @param sesion Sesión a validar
   * @returns boolean True si la sesión es válida
   */
  public validarIntegridadSesion(sesion: SesionCompra): boolean {
    try {
      // Validar estructura básica
      if (!sesion.id || !sesion.nombreSupermercado || !sesion.fecha) {
        return false;
      }

      // Validar productos
      for (const producto of sesion.productos) {
        if (!producto.nombre || producto.precioUnitario <= 0 || producto.cantidad <= 0) {
          return false;
        }

        // Verificar cálculo del total
        const totalCalculado = producto.precioUnitario * producto.cantidad;
        if (Math.abs(totalCalculado - producto.total) > 0.01) {
          return false;
        }
      }

      // Validar total general
      const totalCalculado = sesion.productos.reduce((total, p) => total + p.total, 0);
      if (Math.abs(totalCalculado - sesion.totalGeneral) > 0.01) {
        return false;
      }

      // Validar fechas y horas
      const fecha = new Date(sesion.fecha);
      if (isNaN(fecha.getTime())) {
        return false;
      }

      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(sesion.horaInicio)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validando integridad de sesión:', error);
      return false;
    }
  }

  /**
   * Repara inconsistencias menores en una sesión
   * @param sesion Sesión a reparar
   * @returns boolean True si se reparó exitosamente
   */
  public repararSesion(sesion: SesionCompra): boolean {
    try {
      let reparacionesRealizadas = false;

      // Reparar totales de productos
      for (const producto of sesion.productos) {
        const totalCalculado = Math.round(producto.precioUnitario * producto.cantidad * 100) / 100;
        if (Math.abs(totalCalculado - producto.total) > 0.01) {
          producto.total = totalCalculado;
          reparacionesRealizadas = true;
        }
      }

      // Reparar total general
      const totalCalculado = sesion.productos.reduce((total, p) => total + p.total, 0);
      if (Math.abs(totalCalculado - sesion.totalGeneral) > 0.01) {
        sesion.totalGeneral = Math.round(totalCalculado * 100) / 100;
        reparacionesRealizadas = true;
      }

      // Actualizar fecha de modificación si se hicieron reparaciones
      if (reparacionesRealizadas) {
        sesion.fechaModificacion = new Date();
        sesion.version += 1;
        console.log(`🔧 Sesión ${sesion.id} reparada exitosamente`);
      }

      return true;
    } catch (error) {
      console.error('Error reparando sesión:', error);
      return false;
    }
  }

  /**
   * Optimiza el rendimiento del servicio
   * @returns void
   */
  public optimizarRendimiento(): void {
    try {
      // Limpiar alertas antiguas (más de 1 hora)
      const ahora = new Date();
      this.alertasActuales = this.alertasActuales.filter(alerta => 
        (ahora.getTime() - alerta.timestamp.getTime()) < 3600000 // 1 hora
      );

      // Notificar cambios
      this.alertasActivasSubject.next(this.alertasActuales);

      // Forzar garbage collection de variables no utilizadas
      if (this.sesionActualEnMemoria?.completada) {
        this.limpiarEstadoSesion();
      }

      console.log('⚡ Rendimiento del servicio optimizado');
    } catch (error) {
      console.error('Error optimizando rendimiento:', error);
    }
  }

  /**
   * Resetea el estado del servicio a valores iniciales
   * @returns void
   */
  public resetearEstado(): void {
    try {
      // Limpiar estado interno
      this.limpiarEstadoSesion();

      // Detener timer si existe
      if (this.timerActualizacionEstadisticas) {
        clearInterval(this.timerActualizacionEstadisticas);
        this.timerActualizacionEstadisticas = null;
      }

      // Reiniciar servicios
      this.iniciarActualizacionPeriodica();

      console.log('🔄 Estado del servicio reseteado');
    } catch (error) {
      console.error('Error reseteando estado del servicio:', error);
    }
  }

  /**
   * Destruye el servicio y limpia recursos
   */
  public destruir(): void {
    try {
      // Detener timer de actualización
      if (this.timerActualizacionEstadisticas) {
        clearInterval(this.timerActualizacionEstadisticas);
        this.timerActualizacionEstadisticas = null;
      }

      // Limpiar estado interno
      this.limpiarEstadoSesion();

      // Completar subjects
      this.estadisticasTiempoRealSubject.complete();
      this.alertasActivasSubject.complete();
      this.sugerenciasProductosSubject.complete();

      console.log('🧹 Servicio de compras destruido');
    } catch (error) {
      console.error('Error destruyendo servicio de compras:', error);
    }
  }
}