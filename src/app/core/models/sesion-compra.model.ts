/**
 * Modelo de datos para sesiones de compra en la aplicación Carrito
 * Maneja el estado completo de una compra: productos, totales, límites y validaciones
 * Incluye control del límite de 2 sesiones por mes
 * 
 * @author DemWolf
 * @version 1.0
 */

import { Producto, CategoriaProducto } from './producto.model';

// Interface principal de sesión de compra
export interface SesionCompra {
  id: string;                          // UUID único de la sesión
  nombreSupermercado: string;          // Nombre del supermercado (1-50 caracteres)
  fechaInicio: Date;                   // Cuándo se creó la sesión
  fechaFinalizacion?: Date;            // Cuándo se completó (null si está activa)
  horaInicio: string;                  // Hora de inicio (HH:mm format)
  horaFinalizacion?: string;           // Hora de finalización (HH:mm format)
  presupuestoEstimado?: number;        // Presupuesto opcional para la compra
  productos: Producto[];               // Lista de productos agregados
  estado: EstadoSesion;                // Estado actual de la sesión
  totales: TotalesSesion;              // Totales calculados automáticamente
  estadisticas: EstadisticasSesion;    // Estadísticas de la sesión
  configuracion: ConfiguracionSesion;  // Configuraciones específicas de la sesión
  metadatos: MetadatosSesion;          // Información adicional y auditoría
}

// Estados posibles de una sesión de compra
export enum EstadoSesion {
  ACTIVA = 'activa',                   // Compra en progreso
  PAUSADA = 'pausada',                 // Temporalmente pausada
  COMPLETADA = 'completada',           // Finalizada exitosamente
  CANCELADA = 'cancelada',             // Cancelada por el usuario
  EXPIRADA = 'expirada'                // Expirada por tiempo (24h)
}

// Interface para totales calculados de la sesión
export interface TotalesSesion {
  subtotal: number;                    // Suma de todos los productos
  descuentos: number;                  // Descuentos aplicados (futuro)
  impuestos: number;                   // Impuestos aplicados (futuro)
  total: number;                       // Total final de la compra
  cantidadProductos: number;           // Número total de productos
  cantidadItems: number;               // Suma de cantidades de todos los productos
  porcentajePresupuesto: number;       // % del presupuesto usado (0-100)
}

// Interface para estadísticas de la sesión
export interface EstadisticasSesion {
  tiempoTranscurrido: number;          // Minutos desde el inicio
  productoMasCaro: Producto | null;    // Producto con mayor precio unitario
  productoMasCaroTotal: Producto | null; // Producto con mayor total
  categoriaConMasProductos: CategoriaProducto | null; // Categoría más comprada
  promedioPrecionPorProducto: number;  // Precio promedio por producto
  velocidadCompra: number;             // Productos por hora
}

// Interface para configuración específica de sesión
export interface ConfiguracionSesion {
  notificarPresupuesto80: boolean;     // Notificar al 80% del presupuesto
  notificarPresupuesto100: boolean;    // Notificar al 100% del presupuesto
  guardarAutomaticamente: boolean;     // Guardado automático cada 30 segundos
  permitirExcederPresupuesto: boolean; // Permitir superar el presupuesto
}

// Interface para metadatos y auditoría
export interface MetadatosSesion {
  version: string;                     // Versión del modelo de datos
  dispositivo: string;                 // Información del dispositivo
  ubicacion?: string;                  // Ubicación opcional del supermercado
  notas?: string;                      // Notas generales de la compra
  ultimaActualizacion: Date;           // Última modificación de la sesión
  numeroRevision: number;              // Número de revisión para control de versiones
}

// Interface para crear nueva sesión
export interface NuevaSesion {
  nombreSupermercado: string;          // Nombre del supermercado (requerido)
  presupuestoEstimado?: number;        // Presupuesto opcional
  ubicacion?: string;                  // Ubicación opcional
  notas?: string;                      // Notas opcionales
}

// Interface para actualizar sesión existente
export interface ActualizacionSesion {
  nombreSupermercado?: string;         // Nuevo nombre supermercado
  presupuestoEstimado?: number;        // Nuevo presupuesto
  ubicacion?: string;                  // Nueva ubicación
  notas?: string;                      // Nuevas notas
  configuracion?: Partial<ConfiguracionSesion>; // Configuraciones a actualizar
}

// Interface para resumen mensual de sesiones
export interface ResumenMensual {
  ano: number;                         // Año del resumen
  mes: number;                         // Mes del resumen (1-12)
  sesionesCreadas: number;             // Sesiones creadas en el mes
  sesionesCompletadas: number;         // Sesiones completadas exitosamente
  sesionesUsadas: number;              // Sesiones que cuentan para el límite
  limiteAlcanzado: boolean;            // Si alcanzó el límite de 2 sesiones
  totalGastado: number;                // Total gastado en el mes
  promedioGasto: number;               // Promedio de gasto por sesión
  fechaReset: Date;                    // Cuándo se resetea el límite (día 1 del siguiente mes)
}

// Interface para validación de sesión
export interface ValidacionSesion {
  valido: boolean;
  errores: string[];
  advertencias: string[];
}

// Constantes de validación para sesiones
export const VALIDACION_SESION = {
  nombreSupermercado: {
    minLongitud: 1,
    maxLongitud: 50
  },
  presupuesto: {
    minimo: 1,
    maximo: 10000000
  },
  notas: {
    maxLongitud: 200
  },
  productos: {
    maximo: 200                        // Máximo productos por sesión
  },
  tiempoMaximo: 24 * 60 * 60 * 1000,   // 24 horas en milisegundos
  limiteMensual: 2                     // Máximo 2 sesiones por mes
} as const;

// Configuración por defecto para nuevas sesiones
export const CONFIGURACION_SESION_DEFECTO: ConfiguracionSesion = {
  notificarPresupuesto80: true,
  notificarPresupuesto100: true,
  guardarAutomaticamente: true,
  permitirExcederPresupuesto: true
};

// Funciones utilitarias para sesiones de compra

/**
 * Crear nueva sesión de compra con validaciones
 * @param datosSesion Datos para crear la sesión
 * @param idUsuario ID del usuario que crea la sesión
 * @returns Sesión creada o null si hay errores
 */
export function crearSesionCompra(datosSesion: NuevaSesion, idUsuario: string): SesionCompra | null {
  try {
    // Validar datos de entrada
    const validacion = validarDatosSesion(datosSesion);
    if (!validacion.valido) {
      console.error('Datos de sesión inválidos:', validacion.errores);
      return null;
    }

    const ahora = new Date();
    const horaActual = formatearHora(ahora);

    // Crear sesión completa
    const sesion: SesionCompra = {
      id: generarIdSesion(),
      nombreSupermercado: datosSesion.nombreSupermercado.trim(),
      fechaInicio: ahora,
      horaInicio: horaActual,
      presupuestoEstimado: datosSesion.presupuestoEstimado,
      productos: [],
      estado: EstadoSesion.ACTIVA,
      totales: calcularTotalesVacios(),
      estadisticas: calcularEstadisticasVacias(),
      configuracion: { ...CONFIGURACION_SESION_DEFECTO },
      metadatos: {
        version: '1.0.0',
        dispositivo: obtenerInfoDispositivo(),
        ubicacion: datosSesion.ubicacion?.trim(),
        notas: datosSesion.notas?.trim(),
        ultimaActualizacion: ahora,
        numeroRevision: 1
      }
    };

    return sesion;

  } catch (error) {
    console.error('Error al crear sesión de compra:', error);
    return null;
  }
}

/**
 * Validar datos para crear o actualizar sesión
 * @param datos Datos de la sesión a validar
 * @returns Resultado de validación con errores específicos
 */
export function validarDatosSesion(datos: NuevaSesion | ActualizacionSesion): ValidacionSesion {
  const errores: string[] = [];
  const advertencias: string[] = [];

  // Validar nombre del supermercado si está presente
  if ('nombreSupermercado' in datos && datos.nombreSupermercado !== undefined) {
    const nombre = datos.nombreSupermercado.trim();
    
    if (nombre.length < VALIDACION_SESION.nombreSupermercado.minLongitud) {
      errores.push('El nombre del supermercado es obligatorio');
    }
    
    if (nombre.length > VALIDACION_SESION.nombreSupermercado.maxLongitud) {
      errores.push(`El nombre del supermercado no puede tener más de ${VALIDACION_SESION.nombreSupermercado.maxLongitud} caracteres`);
    }

    // Validar caracteres permitidos
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.\,\(\)]+$/;
    if (!regex.test(nombre)) {
      errores.push('El nombre del supermercado contiene caracteres no permitidos');
    }
  }

  // Validar presupuesto si está presente
  if (datos.presupuestoEstimado !== undefined && datos.presupuestoEstimado !== null) {
    const presupuesto = Number(datos.presupuestoEstimado);
    
    if (isNaN(presupuesto) || presupuesto <= 0) {
      errores.push('El presupuesto debe ser un número mayor a 0');
    }
    
    if (presupuesto < VALIDACION_SESION.presupuesto.minimo) {
      errores.push(`El presupuesto mínimo es ${VALIDACION_SESION.presupuesto.minimo}`);
    }
    
    if (presupuesto > VALIDACION_SESION.presupuesto.maximo) {
      errores.push(`El presupuesto máximo es ${VALIDACION_SESION.presupuesto.maximo.toLocaleString()}`);
    }

    // Advertencia para presupuestos muy altos
    if (presupuesto > 1000000) {
      advertencias.push('El presupuesto parece muy alto, verifica que sea correcto');
    }
  }

  // Validar notas si están presentes
  if (datos.notas && datos.notas.trim().length > VALIDACION_SESION.notas.maxLongitud) {
    errores.push(`Las notas no pueden tener más de ${VALIDACION_SESION.notas.maxLongitud} caracteres`);
  }

  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Agregar producto a una sesión de compra
 * @param sesion Sesión donde agregar el producto
 * @param producto Producto a agregar
 * @returns Sesión actualizada o null si hay errores
 */
export function agregarProductoASesion(sesion: SesionCompra, producto: Producto): SesionCompra | null {
  try {
    // Verificar que la sesión esté activa
    if (sesion.estado !== EstadoSesion.ACTIVA) {
      console.error('No se puede agregar productos a una sesión no activa');
      return null;
    }

    // Verificar límite de productos
    if (sesion.productos.length >= VALIDACION_SESION.productos.maximo) {
      console.error(`No se pueden agregar más de ${VALIDACION_SESION.productos.maximo} productos por sesión`);
      return null;
    }

    // Crear sesión actualizada
    const sesionActualizada: SesionCompra = {
      ...sesion,
      productos: [...sesion.productos, producto],
      metadatos: {
        ...sesion.metadatos,
        ultimaActualizacion: new Date(),
        numeroRevision: sesion.metadatos.numeroRevision + 1
      }
    };

    // Recalcular totales y estadísticas
    sesionActualizada.totales = calcularTotalesSesion(sesionActualizada);
    sesionActualizada.estadisticas = calcularEstadisticasSesion(sesionActualizada);

    return sesionActualizada;

  } catch (error) {
    console.error('Error al agregar producto a sesión:', error);
    return null;
  }
}

/**
 * Remover producto de una sesión de compra
 * @param sesion Sesión de donde remover el producto
 * @param idProducto ID del producto a remover
 * @returns Sesión actualizada o null si hay errores
 */
export function removerProductoDeSesion(sesion: SesionCompra, idProducto: string): SesionCompra | null {
  try {
    // Verificar que la sesión esté activa
    if (sesion.estado !== EstadoSesion.ACTIVA) {
      console.error('No se puede remover productos de una sesión no activa');
      return null;
    }

    // Verificar que el producto existe
    const indiceProducto = sesion.productos.findIndex(p => p.id === idProducto);
    if (indiceProducto === -1) {
      console.error('Producto no encontrado en la sesión');
      return null;
    }

    // Crear sesión actualizada sin el producto
    const sesionActualizada: SesionCompra = {
      ...sesion,
      productos: sesion.productos.filter(p => p.id !== idProducto),
      metadatos: {
        ...sesion.metadatos,
        ultimaActualizacion: new Date(),
        numeroRevision: sesion.metadatos.numeroRevision + 1
      }
    };

    // Recalcular totales y estadísticas
    sesionActualizada.totales = calcularTotalesSesion(sesionActualizada);
    sesionActualizada.estadisticas = calcularEstadisticasSesion(sesionActualizada);

    return sesionActualizada;

  } catch (error) {
    console.error('Error al remover producto de sesión:', error);
    return null;
  }
}

/**
 * Finalizar sesión de compra
 * @param sesion Sesión a finalizar
 * @returns Sesión finalizada o null si hay errores
 */
export function finalizarSesion(sesion: SesionCompra): SesionCompra | null {
  try {
    // Verificar que la sesión pueda ser finalizada
    if (sesion.estado === EstadoSesion.COMPLETADA || sesion.estado === EstadoSesion.CANCELADA) {
      console.error('La sesión ya está finalizada');
      return null;
    }

    // Verificar que hay al menos un producto
    if (sesion.productos.length === 0) {
      console.error('No se puede finalizar una sesión sin productos');
      return null;
    }

    const ahora = new Date();

    // Crear sesión finalizada
    const sesionFinalizada: SesionCompra = {
      ...sesion,
      estado: EstadoSesion.COMPLETADA,
      fechaFinalizacion: ahora,
      horaFinalizacion: formatearHora(ahora),
      metadatos: {
        ...sesion.metadatos,
        ultimaActualizacion: ahora,
        numeroRevision: sesion.metadatos.numeroRevision + 1
      }
    };

    // Recalcular estadísticas finales
    sesionFinalizada.estadisticas = calcularEstadisticasSesion(sesionFinalizada);

    return sesionFinalizada;

  } catch (error) {
    console.error('Error al finalizar sesión:', error);
    return null;
  }
}

/**
 * Calcular totales de una sesión
 * @param sesion Sesión para calcular totales
 * @returns Totales calculados
 */
export function calcularTotalesSesion(sesion: SesionCompra): TotalesSesion {
  const productos = sesion.productos;
  
  const subtotal = productos.reduce((sum, producto) => sum + producto.total, 0);
  const cantidadProductos = productos.length;
  const cantidadItems = productos.reduce((sum, producto) => sum + producto.cantidad, 0);
  
  const descuentos = 0; // Por ahora no hay descuentos
  const impuestos = 0;  // Por ahora no hay impuestos
  const total = subtotal - descuentos + impuestos;
  
  let porcentajePresupuesto = 0;
  if (sesion.presupuestoEstimado && sesion.presupuestoEstimado > 0) {
    porcentajePresupuesto = Math.round((total / sesion.presupuestoEstimado) * 100);
  }

  return {
    subtotal: Number(subtotal.toFixed(2)),
    descuentos: Number(descuentos.toFixed(2)),
    impuestos: Number(impuestos.toFixed(2)),
    total: Number(total.toFixed(2)),
    cantidadProductos,
    cantidadItems,
    porcentajePresupuesto
  };
}

/**
 * Calcular estadísticas de una sesión
 * @param sesion Sesión para calcular estadísticas
 * @returns Estadísticas calculadas
 */
export function calcularEstadisticasSesion(sesion: SesionCompra): EstadisticasSesion {
  const productos = sesion.productos;
  const ahora = new Date();
  const tiempoTranscurrido = Math.round((ahora.getTime() - sesion.fechaInicio.getTime()) / (1000 * 60));
  
  let productoMasCaro: Producto | null = null;
  let productoMasCaroTotal: Producto | null = null;
  let categoriaConMasProductos: CategoriaProducto | null = null;
  let promedioPrecionPorProducto = 0;
  let velocidadCompra = 0;

  if (productos.length > 0) {
    // Producto más caro por precio unitario
    productoMasCaro = productos.reduce((max, producto) => 
      producto.precioUnitario > max.precioUnitario ? producto : max
    );

    // Producto más caro por total
    productoMasCaroTotal = productos.reduce((max, producto) => 
      producto.total > max.total ? producto : max
    );

    // Promedio de precio por producto
    const sumaPrecios = productos.reduce((sum, producto) => sum + producto.precioUnitario, 0);
    promedioPrecionPorProducto = Number((sumaPrecios / productos.length).toFixed(2));

    // Velocidad de compra (productos por hora)
    if (tiempoTranscurrido > 0) {
      velocidadCompra = Number(((productos.length / tiempoTranscurrido) * 60).toFixed(1));
    }

    // Categoría con más productos
    const conteoCategoras = new Map<CategoriaProducto, number>();
    productos.forEach(producto => {
      const categoria = producto.categoria || CategoriaProducto.OTROS;
      conteoCategoras.set(categoria, (conteoCategoras.get(categoria) || 0) + 1);
    });

    let maxCount = 0;
    conteoCategoras.forEach((count, categoria) => {
      if (count > maxCount) {
        maxCount = count;
        categoriaConMasProductos = categoria;
      }
    });
  }

  return {
    tiempoTranscurrido,
    productoMasCaro,
    productoMasCaroTotal,
    categoriaConMasProductos,
    promedioPrecionPorProducto,
    velocidadCompra
  };
}

/**
 * Verificar si una sesión ha expirado (más de 24 horas)
 * @param sesion Sesión a verificar
 * @returns true si la sesión ha expirado
 */
export function esSesionExpirada(sesion: SesionCompra): boolean {
  if (sesion.estado !== EstadoSesion.ACTIVA && sesion.estado !== EstadoSesion.PAUSADA) {
    return false; // Sesiones finalizadas no expiran
  }

  const ahora = new Date();
  const tiempoTranscurrido = ahora.getTime() - sesion.fechaInicio.getTime();
  return tiempoTranscurrido > VALIDACION_SESION.tiempoMaximo;
}

/**
 * Obtener resumen mensual de sesiones
 * @param sesiones Lista de todas las sesiones
 * @param ano Año del resumen
 * @param mes Mes del resumen (1-12)
 * @returns Resumen mensual calculado
 */
export function obtenerResumenMensual(sesiones: SesionCompra[], ano: number, mes: number): ResumenMensual {
  // Filtrar sesiones del mes específico
  const sesionesMes = sesiones.filter(sesion => {
    const fecha = sesion.fechaInicio;
    return fecha.getFullYear() === ano && fecha.getMonth() + 1 === mes;
  });

  const sesionesCreadas = sesionesMes.length;
  const sesionesCompletadas = sesionesMes.filter(s => s.estado === EstadoSesion.COMPLETADA).length;
  
  // Solo cuentan para el límite las sesiones completadas y canceladas (que se usaron)
  const sesionesUsadas = sesionesMes.filter(s => 
    s.estado === EstadoSesion.COMPLETADA || s.estado === EstadoSesion.CANCELADA
  ).length;

  const limiteAlcanzado = sesionesUsadas >= VALIDACION_SESION.limiteMensual;

  // Calcular totales solo de sesiones completadas
  const sesionesConGasto = sesionesMes.filter(s => s.estado === EstadoSesion.COMPLETADA);
  const totalGastado = sesionesConGasto.reduce((sum, sesion) => sum + sesion.totales.total, 0);
  const promedioGasto = sesionesConGasto.length > 0 ? totalGastado / sesionesConGasto.length : 0;

  // Fecha de reset (primer día del siguiente mes)
  const fechaReset = new Date(ano, mes, 1); // mes ya está en formato 1-12, JavaScript espera 0-11

  return {
    ano,
    mes,
    sesionesCreadas,
    sesionesCompletadas,
    sesionesUsadas,
    limiteAlcanzado,
    totalGastado: Number(totalGastado.toFixed(2)),
    promedioGasto: Number(promedioGasto.toFixed(2)),
    fechaReset
  };
}

// Funciones auxiliares privadas

/**
 * Calcular totales vacíos para nueva sesión
 */
function calcularTotalesVacios(): TotalesSesion {
  return {
    subtotal: 0,
    descuentos: 0,
    impuestos: 0,
    total: 0,
    cantidadProductos: 0,
    cantidadItems: 0,
    porcentajePresupuesto: 0
  };
}

/**
 * Calcular estadísticas vacías para nueva sesión
 */
function calcularEstadisticasVacias(): EstadisticasSesion {
  return {
    tiempoTranscurrido: 0,
    productoMasCaro: null,
    productoMasCaroTotal: null,
    categoriaConMasProductos: null,
    promedioPrecionPorProducto: 0,
    velocidadCompra: 0
  };
}

/**
 * Generar ID único para sesión
 */
function generarIdSesion(): string {
  return `sesion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formatear hora en formato HH:mm
 */
function formatearHora(fecha: Date): string {
  return fecha.toTimeString().slice(0, 5);
}

/**
 * Obtener información básica del dispositivo
 */
function obtenerInfoDispositivo(): string {
  return `${navigator.platform} - ${navigator.userAgent.split(' ')[0]}`;
}