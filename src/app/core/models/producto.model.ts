/**
 * Modelo de datos para productos en la aplicación Carrito
 * Define la estructura de productos agregados en sesiones de compra
 * Incluye validaciones, cálculos automáticos y categorías predefinidas
 *
 * @author DemWolf
 * @version 1.0
 */

// Interface principal del producto
export interface Producto {
  id: string;                          // UUID único del producto en la sesión
  nombre: string;                      // Nombre del producto (1-100 caracteres)
  precioUnitario: number;              // Precio por unidad (0 si no definido, 0.01 - 1,000,000)
  cantidad: number;                    // Cantidad a comprar (0 si no definida, 1-100 unidades)
  total: number;                       // Total calculado (precio × cantidad)
  categoria?: CategoriaProducto;       // Categoría opcional del producto
  notas?: string;                      // Notas adicionales opcionales (máximo 200 caracteres)
  fechaAgregado: Date;                 // Cuándo se agregó a la sesión
  ordenEnLista: number;                // Orden en la lista (para sorting)
  esCompleto: boolean;                 // true si tiene precio > 0 y cantidad > 0
}

// Enum con categorías predefinidas de productos
export enum CategoriaProducto {
  COMIDA = 'comida',
  LACTEOS = 'lacteos',
  LIMPIEZA = 'limpieza',
  SERVICIOS_BASICOS = 'servicios_basicos',
  HOGAR = 'hogar',
  ROPA_CALZADO = 'ropa_calzado',
  FARMACIA = 'farmacia',
  ENTRETENIMIENTO = 'entretenimiento',
  TRANSPORTE = 'transporte',
  TECNOLOGIA = 'tecnologia',
  OTROS = 'otros'
}

// Interface para mostrar información de categorías en la UI
export interface InfoCategoria {
  codigo: CategoriaProducto;
  nombre: string;
  icono: string;                       // Nombre del icono de Ionic
  color: string;                       // Color para la UI
  descripcion: string;                 // Descripción de la categoría
}

// Lista de categorías con información para la UI
export const CATEGORIAS_INFO: InfoCategoria[] = [
  {
    codigo: CategoriaProducto.COMIDA,
    nombre: 'Comida',
    icono: 'restaurant-outline',
    color: 'success',
    descripcion: 'Frutas, verduras, carnes, panadería'
  },
  {
    codigo: CategoriaProducto.LACTEOS,
    nombre: 'Lácteos',
    icono: 'cafe-outline',
    color: 'tertiary',
    descripcion: 'Leche, quesos, yogures'
  },
  {
    codigo: CategoriaProducto.LIMPIEZA,
    nombre: 'Limpieza',
    icono: 'sparkles-outline',
    color: 'primary',
    descripcion: 'Detergentes, desinfectantes'
  },
  {
    codigo: CategoriaProducto.SERVICIOS_BASICOS,
    nombre: 'Servicios Básicos',
    icono: 'flash-outline',
    color: 'warning',
    descripcion: 'Luz, agua, gas, teléfono'
  },
  {
    codigo: CategoriaProducto.HOGAR,
    nombre: 'Hogar',
    icono: 'home-outline',
    color: 'medium',
    descripcion: 'Artículos para el hogar'
  },
  {
    codigo: CategoriaProducto.ROPA_CALZADO,
    nombre: 'Ropa y Calzado',
    icono: 'shirt-outline',
    color: 'secondary',
    descripcion: 'Vestimenta personal'
  },
  {
    codigo: CategoriaProducto.FARMACIA,
    nombre: 'Farmacia',
    icono: 'medical-outline',
    color: 'danger',
    descripcion: 'Medicamentos y productos de salud'
  },
  {
    codigo: CategoriaProducto.ENTRETENIMIENTO,
    nombre: 'Entretenimiento',
    icono: 'game-controller-outline',
    color: 'tertiary',
    descripcion: 'Libros, juegos, música'
  },
  {
    codigo: CategoriaProducto.TRANSPORTE,
    nombre: 'Transporte',
    icono: 'car-outline',
    color: 'dark',
    descripcion: 'Combustible, pasajes'
  },
  {
    codigo: CategoriaProducto.TECNOLOGIA,
    nombre: 'Tecnología',
    icono: 'phone-portrait-outline',
    color: 'primary',
    descripcion: 'Dispositivos electrónicos'
  },
  {
    codigo: CategoriaProducto.OTROS,
    nombre: 'Otros',
    icono: 'ellipsis-horizontal-outline',
    color: 'medium',
    descripcion: 'Categoría general'
  }
];

// Interface para crear un nuevo producto
export interface NuevoProducto {
  nombre: string;                      // Nombre del producto (requerido)
  precioUnitario?: number;             // Precio unitario (opcional - se puede agregar después)
  cantidad?: number;                   // Cantidad (opcional - se puede agregar después)
  categoria?: CategoriaProducto;       // Categoría (opcional)
  notas?: string;                      // Notas (opcional)
}

// Interface para actualizar un producto existente
export interface ActualizacionProducto {
  nombre?: string;                     // Nuevo nombre (opcional)
  precioUnitario?: number;             // Nuevo precio (opcional)
  cantidad?: number;                   // Nueva cantidad (opcional)
  categoria?: CategoriaProducto;       // Nueva categoría (opcional)
  notas?: string;                      // Nuevas notas (opcional)
}

// Interface para validación de producto
export interface ValidacionProducto {
  valido: boolean;
  errores: string[];
}

// Constantes de validación
export const VALIDACION_PRODUCTO = {
  nombre: {
    minLongitud: 1,
    maxLongitud: 100
  },
  precio: {
    minimo: 0.01,
    maximo: 1000000
  },
  cantidad: {
    minima: 1,
    maxima: 100
  },
  notas: {
    maxLongitud: 200
  }
} as const;

// Funciones utilitarias para productos

/**
 * Crear un nuevo producto con validaciones
 * @param datosProducto Datos del producto a crear
 * @returns Producto creado o null si hay errores
 */
export function crearProducto(datosProducto: NuevoProducto): Producto | null {
  try {
    // Validar datos de entrada
    const validacion = validarDatosProducto(datosProducto);
    if (!validacion.valido) {
      console.error('Datos de producto inválidos:', validacion.errores);
      return null;
    }

    // Crear producto con todos los campos
    const precio = datosProducto.precioUnitario ? Number(datosProducto.precioUnitario) : 0;
    const cantidad = datosProducto.cantidad ? Number(datosProducto.cantidad) : 0;
    const total = precio * cantidad;
    const esCompleto = precio > 0 && cantidad > 0;

    const producto: Producto = {
      id: generarIdProducto(),
      nombre: datosProducto.nombre.trim(),
      precioUnitario: precio,
      cantidad: cantidad,
      total: total,
      categoria: datosProducto.categoria,
      notas: datosProducto.notas?.trim(),
      fechaAgregado: new Date(),
      ordenEnLista: Date.now(), // Usar timestamp como orden inicial
      esCompleto: esCompleto
    };

    return producto;

  } catch (error) {
    console.error('Error al crear producto:', error);
    return null;
  }
}

/**
 * Validar datos de producto antes de crear o actualizar
 * @param datos Datos del producto a validar
 * @returns Resultado de validación con errores específicos
 */
export function validarDatosProducto(datos: NuevoProducto | ActualizacionProducto): ValidacionProducto {
  const errores: string[] = [];

  // Validar nombre si está presente
  if ('nombre' in datos && datos.nombre !== undefined) {
    const nombre = datos.nombre.trim();

    if (nombre.length < VALIDACION_PRODUCTO.nombre.minLongitud) {
      errores.push('El nombre del producto es obligatorio');
    }

    if (nombre.length > VALIDACION_PRODUCTO.nombre.maxLongitud) {
      errores.push(`El nombre no puede tener más de ${VALIDACION_PRODUCTO.nombre.maxLongitud} caracteres`);
    }

    // Validar caracteres permitidos (sin caracteres especiales peligrosos)
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.\,\(\)]+$/;
    if (!regex.test(nombre)) {
      errores.push('El nombre contiene caracteres no permitidos');
    }
  }

  // Validar precio unitario si está presente (pero es OPCIONAL)
  if ('precioUnitario' in datos && datos.precioUnitario !== undefined && datos.precioUnitario !== null) {
    const precio = Number(datos.precioUnitario);

    // Solo validar si el precio es un número válido y > 0
    if (!isNaN(precio) && precio > 0) {
      if (precio < VALIDACION_PRODUCTO.precio.minimo) {
        errores.push(`El precio mínimo es ${VALIDACION_PRODUCTO.precio.minimo}`);
      }

      if (precio > VALIDACION_PRODUCTO.precio.maximo) {
        errores.push(`El precio máximo es ${VALIDACION_PRODUCTO.precio.maximo.toLocaleString()}`);
      }

      // Validar máximo 2 decimales
      const decimales = (precio.toString().split('.')[1] || '').length;
      if (decimales > 2) {
        errores.push('El precio no puede tener más de 2 decimales');
      }
    } else if (!isNaN(precio) && precio < 0) {
      errores.push('El precio no puede ser negativo');
    }
  }

  // Validar cantidad si está presente (pero es OPCIONAL)
  if ('cantidad' in datos && datos.cantidad !== undefined && datos.cantidad !== null) {
    const cantidad = Number(datos.cantidad);

    // Solo validar si la cantidad es un número válido y > 0
    if (!isNaN(cantidad) && cantidad > 0) {
      if (!Number.isInteger(cantidad)) {
        errores.push('La cantidad debe ser un número entero');
      }

      if (cantidad < VALIDACION_PRODUCTO.cantidad.minima) {
        errores.push(`La cantidad mínima es ${VALIDACION_PRODUCTO.cantidad.minima}`);
      }

      if (cantidad > VALIDACION_PRODUCTO.cantidad.maxima) {
        errores.push(`La cantidad máxima es ${VALIDACION_PRODUCTO.cantidad.maxima}`);
      }
    } else if (!isNaN(cantidad) && cantidad < 0) {
      errores.push('La cantidad no puede ser negativa');
    }
  }

  // Validar notas si están presentes
  if (datos.notas && datos.notas.trim().length > VALIDACION_PRODUCTO.notas.maxLongitud) {
    errores.push(`Las notas no pueden tener más de ${VALIDACION_PRODUCTO.notas.maxLongitud} caracteres`);
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Actualizar un producto existente
 * @param producto Producto original
 * @param actualizacion Datos a actualizar
 * @returns Producto actualizado o null si hay errores
 */
export function actualizarProducto(producto: Producto, actualizacion: ActualizacionProducto): Producto | null {
  try {
    // Validar datos de actualización
    const validacion = validarDatosProducto(actualizacion);
    if (!validacion.valido) {
      console.error('Datos de actualización inválidos:', validacion.errores);
      return null;
    }

    // Crear producto actualizado
    const productoActualizado: Producto = {
      ...producto,
      nombre: actualizacion.nombre?.trim() ?? producto.nombre,
      precioUnitario: actualizacion.precioUnitario ?? producto.precioUnitario,
      cantidad: actualizacion.cantidad ?? producto.cantidad,
      categoria: actualizacion.categoria ?? producto.categoria,
      notas: actualizacion.notas?.trim() ?? producto.notas
    };

    // Recalcular total
    productoActualizado.total = productoActualizado.precioUnitario * productoActualizado.cantidad;

    // Recalcular esCompleto
    productoActualizado.esCompleto = productoActualizado.precioUnitario > 0 && productoActualizado.cantidad > 0;

    return productoActualizado;

  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return null;
  }
}

/**
 * Calcular total de un producto
 * @param precioUnitario Precio por unidad
 * @param cantidad Cantidad de unidades
 * @returns Total calculado
 */
export function calcularTotalProducto(precioUnitario: number, cantidad: number): number {
  return Number((precioUnitario * cantidad).toFixed(2));
}

/**
 * Obtener información de una categoría
 * @param categoria Código de la categoría
 * @returns Información de la categoría o null si no existe
 */
export function obtenerInfoCategoria(categoria: CategoriaProducto): InfoCategoria | null {
  return CATEGORIAS_INFO.find(info => info.codigo === categoria) || null;
}

/**
 * Validar que una categoría sea válida
 * @param categoria Categoría a validar
 * @returns true si la categoría es válida
 */
export function esCategoriaValida(categoria: string): categoria is CategoriaProducto {
  return Object.values(CategoriaProducto).includes(categoria as CategoriaProducto);
}

/**
 * Generar ID único para producto
 * @returns String único para identificar el producto
 */
function generarIdProducto(): string {
  return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Comparar productos para ordenamiento
 * @param a Primer producto
 * @param b Segundo producto
 * @param criterio Criterio de ordenamiento
 * @returns Número para Array.sort()
 */
export function compararProductos(
  a: Producto,
  b: Producto,
  criterio: 'nombre' | 'precio' | 'total' | 'fecha' | 'categoria' = 'fecha'
): number {
  switch (criterio) {
    case 'nombre':
      return a.nombre.localeCompare(b.nombre);
    case 'precio':
      return b.precioUnitario - a.precioUnitario; // Mayor a menor
    case 'total':
      return b.total - a.total; // Mayor a menor
    case 'fecha':
      return b.fechaAgregado.getTime() - a.fechaAgregado.getTime(); // Más reciente primero
    case 'categoria':
      const categoriaA = a.categoria || CategoriaProducto.OTROS;
      const categoriaB = b.categoria || CategoriaProducto.OTROS;
      return categoriaA.localeCompare(categoriaB);
    default:
      return 0;
  }
}
