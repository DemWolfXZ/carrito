/**
 * Modelo de datos para una sesión de compra completa
 * 
 * Este modelo representa una visita completa al supermercado, incluyendo
 * todos los productos comprados, información del establecimiento y totales
 * 
 * @author Tu Nombre
 * @version 1.0.0
 * @since 2025-06-19
 */

import { IProducto, Producto } from './producto.model';

export interface ISesionCompra {
  /** Identificador único de la sesión (UUID) */
  id: string;
  
  /** Nombre del supermercado visitado */
  nombreSupermercado: string;
  
  /** Fecha de la compra (YYYY-MM-DD) */
  fecha: string;
  
  /** Hora de inicio de la compra (HH:mm) */
  horaInicio: string;
  
  /** Hora de finalización de la compra (HH:mm) - opcional */
  horaFin?: string;
  
  /** Lista de productos comprados */
  productos: IProducto[];
  
  /** Total general de la compra */
  totalGeneral: number;
  
  /** Indica si la sesión está completada/finalizada */
  completada: boolean;
  
  /** Presupuesto estimado para la compra (opcional) */
  presupuestoEstimado?: number;
  
  /** Notas adicionales sobre la compra */
  notas?: string;
  
  /** Método de pago utilizado */
  metodoPago?: MetodoPago;
  
  /** Descuentos aplicados */
  descuentos?: number;
  
  /** Impuestos aplicados */
  impuestos?: number;
  
  /** Número de boleta o factura */
  numeroDocumento?: string;
  
  /** Ubicación del supermercado */
  ubicacion?: UbicacionSupermercado;
  
  /** Fecha y hora de última modificación */
  fechaModificacion: Date;
  
  /** Versión del registro para control de cambios */
  version: number;
}

/**
 * Métodos de pago disponibles
 */
export enum MetodoPago {
  EFECTIVO = 'efectivo',
  TARJETA_DEBITO = 'tarjeta_debito',
  TARJETA_CREDITO = 'tarjeta_credito',
  TRANSFERENCIA = 'transferencia',
  MIXTO = 'mixto'
}

/**
 * Estados posibles de una sesión de compra
 */
export enum EstadoSesion {
  INICIADA = 'iniciada',
  EN_PROGRESO = 'en_progreso',
  PAUSADA = 'pausada',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada'
}

/**
 * Información de ubicación del supermercado
 */
export interface UbicacionSupermercado {
  direccion?: string;
  comuna?: string;
  region?: string;
  coordenadas?: {
    latitud: number;
    longitud: number;
  };
}

/**
 * Resumen estadístico de una sesión
 */
export interface ResumenSesion {
  cantidadProductos: number;
  totalSinDescuentos: number;
  totalDescuentos: number;
  totalFinal: number;
  tiempoCompra?: string; // Duración en formato HH:mm
  promedioProducto: number;
  categoriaConMasGasto: string;
}

/**
 * Clase concreta que implementa el modelo de sesión de compra
 * Incluye métodos de validación, cálculo y gestión de productos
 */
export class SesionCompra implements ISesionCompra {
  id: string;
  nombreSupermercado: string;
  fecha: string;
  horaInicio: string;
  horaFin?: string;
  productos: Producto[];
  totalGeneral: number;
  completada: boolean;
  presupuestoEstimado?: number;
  notas?: string;
  metodoPago?: MetodoPago;
  descuentos?: number;
  impuestos?: number;
  numeroDocumento?: string;
  ubicacion?: UbicacionSupermercado;
  fechaModificacion: Date;
  version: number;

  constructor(datos: Partial<ISesionCompra>) {
    // Generar ID único si no se proporciona
    this.id = datos.id || this.generarId();
    
    // Validar y asignar datos obligatorios
    this.nombreSupermercado = this.validarNombreSupermercado(datos.nombreSupermercado || '');
    this.fecha = this.validarFecha(datos.fecha || this.obtenerFechaHoy());
    this.horaInicio = this.validarHora(datos.horaInicio || this.obtenerHoraActual());
    
    // Inicializar productos como array vacío o validar los existentes
    this.productos = this.validarProductos(datos.productos || []);
    
    // Calcular total automáticamente
    this.totalGeneral = this.calcularTotalGeneral();
    
    // Asignar datos opcionales
    this.horaFin = datos.horaFin;
    this.completada = datos.completada || false;
    this.presupuestoEstimado = datos.presupuestoEstimado;
    this.notas = datos.notas;
    this.metodoPago = datos.metodoPago;
    this.descuentos = datos.descuentos || 0;
    this.impuestos = datos.impuestos || 0;
    this.numeroDocumento = datos.numeroDocumento;
    this.ubicacion = datos.ubicacion;
    this.fechaModificacion = datos.fechaModificacion || new Date();
    this.version = datos.version || 1;
  }

  /**
   * Genera un ID único para la sesión
   * @returns string ID único generado
   */
  private generarId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `sesion_${timestamp}_${random}`;
  }

  /**
   * Valida el nombre del supermercado
   * @param nombre Nombre a validar
   * @returns string Nombre validado
   * @throws Error si el nombre no es válido
   */
  private validarNombreSupermercado(nombre: string): string {
    if (!nombre || nombre.trim().length === 0) {
      throw new Error('El nombre del supermercado es obligatorio');
    }
    
    if (nombre.trim().length > 50) {
      throw new Error('El nombre del supermercado no puede exceder 50 caracteres');
    }
    
    return nombre.trim().replace(/[<>\"']/g, '');
  }

  /**
   * Valida el formato de fecha (YYYY-MM-DD)
   * @param fecha Fecha a validar
   * @returns string Fecha validada
   * @throws Error si la fecha no es válida
   */
  private validarFecha(fecha: string): string {
    const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!formatoFecha.test(fecha)) {
      throw new Error('El formato de fecha debe ser YYYY-MM-DD');
    }
    
    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) {
      throw new Error('La fecha proporcionada no es válida');
    }
    
    // Validar que no sea una fecha futura
    const hoy = new Date();
    if (fechaObj > hoy) {
      throw new Error('La fecha no puede ser futura');
    }
    
    return fecha;
  }

  /**
   * Valida el formato de hora (HH:mm)
   * @param hora Hora a validar
   * @returns string Hora validada
   * @throws Error si la hora no es válida
   */
  private validarHora(hora: string): string {
    const formatoHora = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!formatoHora.test(hora)) {
      throw new Error('El formato de hora debe ser HH:mm');
    }
    
    return hora;
  }

  /**
   * Valida y convierte productos a instancias de Producto
   * @param productos Array de productos a validar
   * @returns Producto[] Array de productos validados
   */
  private validarProductos(productos: any[]): Producto[] {
    return productos.map(prod => {
      if (prod instanceof Producto) {
        return prod;
      }
      return new Producto(prod);
    });
  }

/**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   * @returns string Fecha actual
   */
  private obtenerFechaHoy(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  /**
   * Obtiene la hora actual en formato HH:mm
   * @returns string Hora actual
   */
  private obtenerHoraActual(): string {
    const ahora = new Date();
    return ahora.toTimeString().slice(0, 5);
  }

  /**
   * Calcula el total general de la sesión
   * @returns number Total calculado
   */
  private calcularTotalGeneral(): number {
    const subtotal = this.productos.reduce((total, producto) => total + producto.total, 0);
    const totalConDescuentos = subtotal - (this.descuentos || 0);
    const totalFinal = totalConDescuentos + (this.impuestos || 0);
    return Math.round(totalFinal * 100) / 100;
  }

  /**
   * Agrega un nuevo producto a la sesión
   * @param producto Producto a agregar
   * @throws Error si el producto no es válido
   */
  public agregarProducto(producto: Producto): void {
    if (!producto) {
      throw new Error('El producto es obligatorio');
    }

    // Verificar si ya existe un producto similar
    const productoExistente = this.productos.find(p => p.esIgualA(producto));
    
    if (productoExistente) {
      // Si existe, sumar las cantidades
      productoExistente.actualizarCantidad(productoExistente.cantidad + producto.cantidad);
    } else {
      // Si no existe, agregarlo
      this.productos.push(producto);
    }

    this.recalcularTotales();
    this.actualizarFechaModificacion();
  }

  /**
   * Elimina un producto de la sesión por ID
   * @param idProducto ID del producto a eliminar
   * @returns boolean True si se eliminó exitosamente
   */
  public eliminarProducto(idProducto: string): boolean {
    const indiceProducto = this.productos.findIndex(p => p.id === idProducto);
    
    if (indiceProducto === -1) {
      return false;
    }

    this.productos.splice(indiceProducto, 1);
    this.recalcularTotales();
    this.actualizarFechaModificacion();
    return true;
  }

  /**
   * Actualiza un producto existente en la sesión
   * @param idProducto ID del producto a actualizar
   * @param datosActualizados Datos a actualizar
   * @returns boolean True si se actualizó exitosamente
   */
  public actualizarProducto(idProducto: string, datosActualizados: Partial<IProducto>): boolean {
    const producto = this.productos.find(p => p.id === idProducto);
    
    if (!producto) {
      return false;
    }

    // Actualizar campos permitidos
    if (datosActualizados.cantidad !== undefined) {
      producto.actualizarCantidad(datosActualizados.cantidad);
    }
    
    if (datosActualizados.precioUnitario !== undefined) {
      producto.actualizarPrecio(datosActualizados.precioUnitario);
    }
    
    if (datosActualizados.notas !== undefined) {
      producto.notas = datosActualizados.notas;
    }

    this.recalcularTotales();
    this.actualizarFechaModificacion();
    return true;
  }

  /**
   * Recalcula todos los totales de la sesión
   */
  public recalcularTotales(): void {
    this.totalGeneral = this.calcularTotalGeneral();
  }

  /**
   * Actualiza la fecha de modificación y incrementa la versión
   */
  private actualizarFechaModificacion(): void {
    this.fechaModificacion = new Date();
    this.version += 1;
  }

  /**
   * Finaliza la sesión de compra
   * @param horaFin Hora de finalización (opcional, por defecto hora actual)
   * @param metodoPago Método de pago utilizado
   * @param numeroDocumento Número de documento (boleta/factura)
   */
  public finalizarSesion(
    horaFin?: string,
    metodoPago?: MetodoPago,
    numeroDocumento?: string
  ): void {
    this.horaFin = horaFin || this.obtenerHoraActual();
    this.metodoPago = metodoPago;
    this.numeroDocumento = numeroDocumento;
    this.completada = true;
    this.actualizarFechaModificacion();
  }

  /**
   * Cancela la sesión de compra
   */
  public cancelarSesion(): void {
    this.completada = false;
    this.productos = [];
    this.totalGeneral = 0;
    this.actualizarFechaModificacion();
  }

  /**
   * Obtiene el resumen estadístico de la sesión
   * @returns ResumenSesion Resumen con estadísticas
   */
  public obtenerResumen(): ResumenSesion {
    const cantidadProductos = this.productos.length;
    const totalSinDescuentos = this.productos.reduce((total, p) => total + p.total, 0);
    const totalDescuentos = this.descuentos || 0;
    const totalFinal = this.totalGeneral;
    const promedioProducto = cantidadProductos > 0 ? totalFinal / cantidadProductos : 0;

    // Calcular tiempo de compra si está finalizada
    let tiempoCompra: string | undefined;
    if (this.horaFin && this.horaInicio) {
      const [horaIni, minIni] = this.horaInicio.split(':').map(Number);
      const [horaFin, minFin] = this.horaFin.split(':').map(Number);
      const minutosTotales = (horaFin * 60 + minFin) - (horaIni * 60 + minIni);
      const horas = Math.floor(minutosTotales / 60);
      const minutos = minutosTotales % 60;
      tiempoCompra = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    }

    // Encontrar categoría con más gasto
    const gastosPorCategoria = this.productos.reduce((acc, producto) => {
      const categoria = producto.categoria || 'Sin categoría';
      acc[categoria] = (acc[categoria] || 0) + producto.total;
      return acc;
    }, {} as Record<string, number>);

    const categoriaConMasGasto = Object.keys(gastosPorCategoria).reduce((a, b) => 
      gastosPorCategoria[a] > gastosPorCategoria[b] ? a : b, 'Sin datos');

    return {
      cantidadProductos,
      totalSinDescuentos: Math.round(totalSinDescuentos * 100) / 100,
      totalDescuentos: Math.round(totalDescuentos * 100) / 100,
      totalFinal: Math.round(totalFinal * 100) / 100,
      tiempoCompra,
      promedioProducto: Math.round(promedioProducto * 100) / 100,
      categoriaConMasGasto
    };
  }

  /**
   * Verifica si la sesión excede el presupuesto estimado
   * @returns boolean True si excede el presupuesto
   */
  public excedePresupuesto(): boolean {
    if (!this.presupuestoEstimado) {
      return false;
    }
    return this.totalGeneral > this.presupuestoEstimado;
  }

  /**
   * Obtiene el porcentaje de presupuesto utilizado
   * @returns number Porcentaje usado (0-100+)
   */
  public porcentajePresupuestoUtilizado(): number {
    if (!this.presupuestoEstimado || this.presupuestoEstimado === 0) {
      return 0;
    }
    return Math.round((this.totalGeneral / this.presupuestoEstimado) * 100);
  }

  /**
   * Convierte la sesión a formato JSON para almacenamiento
   * @returns string Sesión en formato JSON
   */
  public toJSON(): string {
    return JSON.stringify({
      id: this.id,
      nombreSupermercado: this.nombreSupermercado,
      fecha: this.fecha,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      productos: this.productos.map(p => JSON.parse(p.toJSON())),
      totalGeneral: this.totalGeneral,
      completada: this.completada,
      presupuestoEstimado: this.presupuestoEstimado,
      notas: this.notas,
      metodoPago: this.metodoPago,
      descuentos: this.descuentos,
      impuestos: this.impuestos,
      numeroDocumento: this.numeroDocumento,
      ubicacion: this.ubicacion,
      fechaModificacion: this.fechaModificacion.toISOString(),
      version: this.version
    });
  }

  /**
   * Crea una sesión desde datos JSON
   * @param json String JSON con datos de la sesión
   * @returns SesionCompra Instancia de sesión creada
   */
  public static fromJSON(json: string): SesionCompra {
    try {
      const datos = JSON.parse(json);
      datos.fechaModificacion = new Date(datos.fechaModificacion);
      datos.productos = datos.productos.map((p: any) => new Producto(p));
      return new SesionCompra(datos);
    } catch (error) {
      throw new Error('Error al parsear datos JSON de la sesión');
    }
  }

  /**
   * Crea una copia de la sesión con nuevo ID
   * @returns SesionCompra Nueva instancia de la sesión
   */
  public clonar(): SesionCompra {
    const datosClonados = {
      nombreSupermercado: this.nombreSupermercado,
      fecha: this.obtenerFechaHoy(),
      horaInicio: this.obtenerHoraActual(),
      productos: this.productos.map(p => p.clonar()),
      presupuestoEstimado: this.presupuestoEstimado,
      notas: this.notas,
      ubicacion: this.ubicacion
    };
    
    return new SesionCompra(datosClonados);
  }

  /**
   * Valida si la sesión está en un estado válido para ser guardada
   * @returns boolean True si es válida
   */
  public esValida(): boolean {
    try {
      // Verificar datos obligatorios
      if (!this.nombreSupermercado || !this.fecha || !this.horaInicio) {
        return false;
      }

      // Verificar que los productos sean válidos
      for (const producto of this.productos) {
        if (!producto.nombre || producto.precioUnitario <= 0 || producto.cantidad <= 0) {
          return false;
        }
      }

      // Verificar que los totales sean coherentes
      const totalCalculado = this.productos.reduce((total, p) => total + p.total, 0);
      const diferenciaTotal = Math.abs(totalCalculado - this.totalGeneral);
      
      if (diferenciaTotal > 0.01) { // Tolerancia de 1 centavo
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene un identificador único basado en fecha y supermercado
   * @returns string Identificador único
   */
  public obtenerIdentificadorUnico(): string {
    return `${this.fecha}_${this.nombreSupermercado.replace(/\s+/g, '_').toLowerCase()}_${this.horaInicio.replace(':', '')}`;
  }
}

/**
 * Tipo para datos mínimos requeridos para crear una sesión
 */
export type DatosNuevaSesion = {
  nombreSupermercado: string;
  fecha?: string;
  horaInicio?: string;
  presupuestoEstimado?: number;
  notas?: string;
  ubicacion?: UbicacionSupermercado;
};

/**
 * Tipo para filtros de búsqueda de sesiones
 */
export type FiltroSesiones = {
  nombreSupermercado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  completada?: boolean;
  montoMinimo?: number;
  montoMaximo?: number;
  metodoPago?: MetodoPago;
};

/**
 * Tipo para estadísticas agrupadas de sesiones
 */
export type EstadisticasSesiones = {
  totalSesiones: number;
  totalGastado: number;
  promedioGasto: number;
  supermercadoMasFrecuente: string;
  categoriaProductoMasComprada: string;
  gastosPorMes: { mes: string; total: number }[];
};