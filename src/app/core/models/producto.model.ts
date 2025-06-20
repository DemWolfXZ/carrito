/**
 * Modelo de datos para un producto individual en el carrito de compras
 * 
 * Este modelo representa un producto que el usuario agrega durante su sesión de compra
 * Incluye validaciones básicas y métodos de utilidad para cálculos
 * 
 * @author DemWolf //Alejandro Villa
 * @version 1.0.0
 * @since 2025-06-19
 */

export interface IProducto {
  /** Identificador único del producto (UUID) */
  id: string;
  
  /** Nombre del producto (ej: "Leche Entera", "Pan Integral") */
  nombre: string;
  
  /** Precio unitario en pesos chilenos (sin formato, solo número) */
  precioUnitario: number;
  
  /** Cantidad de unidades del producto */
  cantidad: number;
  
  /** Total calculado (precioUnitario * cantidad) */
  total: number;
  
  /** Categoría del producto (opcional) */
  categoria?: CategoriaProducto;
  
  /** Notas adicionales del usuario sobre el producto */
  notas?: string;
  
  /** Fecha y hora cuando se agregó el producto */
  fechaAgregado: Date;
  
  /** Indica si el producto está marcado como favorito */
  esFavorito?: boolean;
  
  /** Código de barras del producto (si se escaneó) */
  codigoBarras?: string;
  
  /** URL de imagen del producto (opcional) */
  urlImagen?: string;
}

/**
 * Categorías predefinidas para organizar productos
 */
export enum CategoriaProducto {
  LACTEOS_HUEVOS = 'lacteos_huevos',
  CARNES_PESCADOS = 'carnes_pescados',
  FRUTAS_VERDURAS = 'frutas_verduras',
  PANADERIA = 'panaderia',
  CONSERVAS = 'conservas',
  BEBIDAS = 'bebidas',
  LIMPIEZA_HOGAR = 'limpieza_hogar',
  HIGIENE_PERSONAL = 'higiene_personal',
  CONGELADOS = 'congelados',
  SNACKS_DULCES = 'snacks_dulces',
  OTROS = 'otros'
}

/**
 * Clase concreta que implementa el modelo de producto
 * Incluye métodos de validación y utilidad
 */
export class Producto implements IProducto {
  id: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  total: number;
  categoria?: CategoriaProducto;
  notas?: string;
  fechaAgregado: Date;
  esFavorito?: boolean;
  codigoBarras?: string;
  urlImagen?: string;

  constructor(datos: Partial<IProducto>) {
    // Generar ID único si no se proporciona
    this.id = datos.id || this.generarId();
    
    // Validar y asignar datos obligatorios
    this.nombre = this.validarNombre(datos.nombre || '');
    this.precioUnitario = this.validarPrecio(datos.precioUnitario || 0);
    this.cantidad = this.validarCantidad(datos.cantidad || 1);
    
    // Calcular total automáticamente
    this.total = this.calcularTotal();
    
    // Asignar datos opcionales
    this.categoria = datos.categoria;
    this.notas = datos.notas;
    this.fechaAgregado = datos.fechaAgregado || new Date();
    this.esFavorito = datos.esFavorito || false;
    this.codigoBarras = datos.codigoBarras;
    this.urlImagen = datos.urlImagen;
  }

  /**
   * Genera un ID único para el producto usando timestamp y número aleatorio
   * @returns string ID único generado
   */
  private generarId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `prod_${timestamp}_${random}`;
  }

  /**
   * Valida que el nombre del producto sea válido
   * @param nombre Nombre a validar
   * @returns string Nombre validado
   * @throws Error si el nombre no es válido
   */
  private validarNombre(nombre: string): string {
    if (!nombre || nombre.trim().length === 0) {
      throw new Error('El nombre del producto es obligatorio');
    }
    
    if (nombre.trim().length > 100) {
      throw new Error('El nombre del producto no puede exceder 100 caracteres');
    }
    
    // Remover caracteres especiales peligrosos
    const nombreLimpio = nombre.trim().replace(/[<>\"']/g, '');
    
    if (nombreLimpio.length === 0) {
      throw new Error('El nombre del producto contiene caracteres no válidos');
    }
    
    return nombreLimpio;
  }

  /**
   * Valida que el precio sea un número positivo válido
   * @param precio Precio a validar
   * @returns number Precio validado
   * @throws Error si el precio no es válido
   */
  private validarPrecio(precio: number): number {
    if (precio <= 0) {
      throw new Error('El precio debe ser mayor a cero');
    }
    
    if (precio > 10000000) { // 10 millones máximo
      throw new Error('El precio excede el límite máximo permitido');
    }
    
    // Redondear a 2 decimales
    return Math.round(precio * 100) / 100;
  }

  /**
   * Valida que la cantidad sea un número entero positivo
   * @param cantidad Cantidad a validar
   * @returns number Cantidad validada
   * @throws Error si la cantidad no es válida
   */
  private validarCantidad(cantidad: number): number {
    if (cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a cero');
    }
    
    if (cantidad > 1000) {
      throw new Error('La cantidad excede el límite máximo de 1000 unidades');
    }
    
    if (!Number.isInteger(cantidad)) {
      throw new Error('La cantidad debe ser un número entero');
    }
    
    return cantidad;
  }

  /**
   * Calcula el total del producto (precio * cantidad)
   * @returns number Total calculado
   */
  private calcularTotal(): number {
    return Math.round(this.precioUnitario * this.cantidad * 100) / 100;
  }

  /**
   * Actualiza la cantidad del producto y recalcula el total
   * @param nuevaCantidad Nueva cantidad a establecer
   */
  public actualizarCantidad(nuevaCantidad: number): void {
    this.cantidad = this.validarCantidad(nuevaCantidad);
    this.total = this.calcularTotal();
  }

  /**
   * Actualiza el precio unitario y recalcula el total
   * @param nuevoPrecio Nuevo precio a establecer
   */
  public actualizarPrecio(nuevoPrecio: number): void {
    this.precioUnitario = this.validarPrecio(nuevoPrecio);
    this.total = this.calcularTotal();
  }

  /**
   * Convierte el producto a formato JSON para almacenamiento
   * @returns string Producto en formato JSON
   */
  public toJSON(): string {
    return JSON.stringify({
      id: this.id,
      nombre: this.nombre,
      precioUnitario: this.precioUnitario,
      cantidad: this.cantidad,
      total: this.total,
      categoria: this.categoria,
      notas: this.notas,
      fechaAgregado: this.fechaAgregado.toISOString(),
      esFavorito: this.esFavorito,
      codigoBarras: this.codigoBarras,
      urlImagen: this.urlImagen
    });
  }

  /**
   * Crea un producto desde datos JSON
   * @param json String JSON con datos del producto
   * @returns Producto Instancia de producto creada
   */
  public static fromJSON(json: string): Producto {
    try {
      const datos = JSON.parse(json);
      datos.fechaAgregado = new Date(datos.fechaAgregado);
      return new Producto(datos);
    } catch (error) {
      throw new Error('Error al parsear datos JSON del producto');
    }
  }

  /**
   * Valida si dos productos son iguales (mismo nombre y precio)
   * @param otroProducto Producto a comparar
   * @returns boolean True si son iguales
   */
  public esIgualA(otroProducto: Producto): boolean {
    return this.nombre.toLowerCase() === otroProducto.nombre.toLowerCase() &&
           this.precioUnitario === otroProducto.precioUnitario;
  }

  /**
   * Crea una copia del producto con nuevo ID
   * @returns Producto Nueva instancia del producto
   */
  public clonar(): Producto {
    return new Producto({
      nombre: this.nombre,
      precioUnitario: this.precioUnitario,
      cantidad: this.cantidad,
      categoria: this.categoria,
      notas: this.notas,
      esFavorito: this.esFavorito,
      codigoBarras: this.codigoBarras,
      urlImagen: this.urlImagen
    });
  }
}

/**
 * Tipo para datos mínimos requeridos para crear un producto
 */
export type DatosNuevoProducto = {
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  categoria?: CategoriaProducto;
  notas?: string;
};

/**
 * Tipo para filtros de búsqueda de productos
 */
export type FiltroProductos = {
  nombre?: string;
  categoria?: CategoriaProducto;
  precioMinimo?: number;
  precioMaximo?: number;
  esFavorito?: boolean;
};

