/**
 * Servicio de Validaciones Avanzadas - COMPLETO CORREGIDO
 * 
 * Proporciona validadores personalizados para formularios Angular,
 * reglas de negocio específicas y validaciones complejas.
 * Complementa al SeguridadService con validaciones de UI.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

import { SeguridadService } from './seguridad.service';
import { AlmacenamientoService } from './almacenamiento.service';
import { CategoriaProducto } from '../models/producto.model';

/**
 * Interfaz para resultado de validación personalizada
 */
export interface ResultadoValidacionPersonalizada {
  valido: boolean;
  errores: { [key: string]: any };
  advertencias: string[];
  sugerencias: string[];
}

/**
 * Interfaz para configuración de validador
 */
export interface ConfiguracionValidador {
  obligatorio?: boolean;
  longitudMinima?: number;
  longitudMaxima?: number;
  patron?: RegExp;
  valorMinimo?: number;
  valorMaximo?: number;
  mensajePersonalizado?: string;
  validacionAsincrona?: boolean;
  debounceMs?: number;
}

/**
 * Tipos de validación específicos para la aplicación
 */
export enum TipoValidacion {
  NOMBRE_PRODUCTO = 'nombre_producto',
  PRECIO_UNITARIO = 'precio_unitario',
  CANTIDAD_PRODUCTO = 'cantidad_producto',
  NOMBRE_SUPERMERCADO = 'nombre_supermercado',
  PRESUPUESTO = 'presupuesto',
  NOTAS = 'notas',
  FECHA_COMPRA = 'fecha_compra',
  HORA_COMPRA = 'hora_compra'
}

@Injectable({
  providedIn: 'root'
})
export class ValidacionService {

  // Patrones de validación predefinidos
  private readonly PATRONES = {
    SOLO_LETRAS: /^[a-zA-ZáéíóúñÑ\s]+$/,
    SOLO_NUMEROS: /^[0-9]+$/,
    ALFANUMERICO: /^[a-zA-ZáéíóúñÑ0-9\s]+$/,
    PRECIO: /^[0-9]+(\.[0-9]{1,2})?$/,
    FECHA: /^\d{4}-\d{2}-\d{2}$/,
    HORA: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    NOMBRE_PRODUCTO: /^[a-zA-ZáéíóúñÑ0-9\s\-\.\(\)%]+$/,
    NOMBRE_SUPERMERCADO: /^[a-zA-ZáéíóúñÑ0-9\s\-\.&]+$/
  };

  // Mensajes de error predefinidos
  private readonly MENSAJES_ERROR = {
    required: 'Este campo es obligatorio',
    minlength: 'Debe tener al menos {requiredLength} caracteres',
    maxlength: 'No puede exceder {actualLength} caracteres',
    min: 'El valor debe ser mayor o igual a {min}',
    max: 'El valor debe ser menor o igual a {max}',
    pattern: 'El formato no es válido',
    email: 'Debe ser un email válido',
    unique: 'Este valor ya existe',
    invalidFormat: 'Formato inválido',
    outOfRange: 'Valor fuera del rango permitido',
    businessRule: 'No cumple con las reglas de negocio',
    security: 'Contiene caracteres no permitidos por seguridad'
  };

  // Cache para validaciones asíncronas
  private cacheValidacionesAsincronas = new Map<string, any>();

  constructor(
    private seguridadService: SeguridadService,
    private almacenamientoService: AlmacenamientoService
  ) {
    console.log('✅ Servicio de validaciones inicializado');
  }

  // ==================== VALIDADORES SÍNCRONOS ====================

  /**
   * Validador para nombres de productos
   * @param config Configuración del validador
   * @returns ValidatorFn Función validadora
   */
  public validadorNombreProducto(config?: ConfiguracionValidador): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && !config?.obligatorio) {
        return null;
      }

      const valor = control.value as string;
      const errores: ValidationErrors = {};

      // Validación básica
      if (!valor || valor.trim().length === 0) {
        errores['required'] = true;
        return errores;
      }

      // Validación de longitud
      if (config?.longitudMinima && valor.length < config.longitudMinima) {
        errores['minlength'] = { 
          requiredLength: config.longitudMinima, 
          actualLength: valor.length 
        };
      }

      if (config?.longitudMaxima && valor.length > config.longitudMaxima) {
        errores['maxlength'] = { 
          requiredLength: config.longitudMaxima, 
          actualLength: valor.length 
        };
      }

      // Validación de patrón
      if (!this.PATRONES.NOMBRE_PRODUCTO.test(valor)) {
        errores['pattern'] = { 
          requiredPattern: this.PATRONES.NOMBRE_PRODUCTO.source,
          actualValue: valor 
        };
      }

      // Validación de palabras prohibidas
      if (this.contieneTextoProhibido(valor)) {
        errores['security'] = { message: 'Contiene texto no permitido' };
      }

      return Object.keys(errores).length > 0 ? errores : null;
    };
  }

  /**
   * Validador para precios unitarios
   * @param config Configuración del validador
   * @returns ValidatorFn Función validadora
   */
  public validadorPrecioUnitario(config?: ConfiguracionValidador): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && !config?.obligatorio) {
        return null;
      }

      const valor = control.value;
      const errores: ValidationErrors = {};

      // Convertir a número si es string
      let precio: number;
      if (typeof valor === 'string') {
        precio = parseFloat(valor.replace(',', '.'));
      } else {
        precio = valor;
      }

      // Validar que es un número válido
      if (isNaN(precio) || !isFinite(precio)) {
        errores['invalidFormat'] = { message: 'Debe ser un número válido' };
        return errores;
      }

      // Validar rango mínimo
      const minimo = config?.valorMinimo ?? 0.01;
      if (precio < minimo) {
        errores['min'] = { min: minimo, actual: precio };
      }

      // Validar rango máximo
      const maximo = config?.valorMaximo ?? 10000000;
      if (precio > maximo) {
        errores['max'] = { max: maximo, actual: precio };
      }

      // Validar decimales (máximo 2)
      const decimales = (precio.toString().split('.')[1] || '').length;
      if (decimales > 2) {
        errores['invalidFormat'] = { message: 'Máximo 2 decimales permitidos' };
      }

      return Object.keys(errores).length > 0 ? errores : null;
    };
  }

  /**
   * Validador para cantidades de productos
   * @param config Configuración del validador
   * @returns ValidatorFn Función validadora
   */
  public validadorCantidadProducto(config?: ConfiguracionValidador): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && !config?.obligatorio) {
        return null;
      }

      const valor = control.value;
      const errores: ValidationErrors = {};

      // Convertir a número
      const cantidad = Number(valor);

      // Validar que es un número válido
      if (isNaN(cantidad) || !isFinite(cantidad)) {
        errores['invalidFormat'] = { message: 'Debe ser un número válido' };
        return errores;
      }

      // Validar que es entero
      if (!Number.isInteger(cantidad)) {
        errores['invalidFormat'] = { message: 'Debe ser un número entero' };
      }

      // Validar rango mínimo
      const minimo = config?.valorMinimo ?? 1;
      if (cantidad < minimo) {
        errores['min'] = { min: minimo, actual: cantidad };
      }

      // Validar rango máximo
      const maximo = config?.valorMaximo ?? 1000;
      if (cantidad > maximo) {
        errores['max'] = { max: maximo, actual: cantidad };
      }

      return Object.keys(errores).length > 0 ? errores : null;
    };
  }

  /**
   * Validador para nombres de supermercados
   * @param config Configuración del validador
   * @returns ValidatorFn Función validadora
   */
  public validadorNombreSupermercado(config?: ConfiguracionValidador): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && !config?.obligatorio) {
        return null;
      }

      const valor = control.value as string;
      const errores: ValidationErrors = {};

      // Validación básica
      if (!valor || valor.trim().length === 0) {
        errores['required'] = true;
        return errores;
      }

      // Validación de longitud
      if (valor.length < 2) {
        errores['minlength'] = { requiredLength: 2, actualLength: valor.length };
      }

      if (valor.length > 50) {
        errores['maxlength'] = { requiredLength: 50, actualLength: valor.length };
      }

      // Validación de patrón
      if (!this.PATRONES.NOMBRE_SUPERMERCADO.test(valor)) {
        errores['pattern'] = { 
          requiredPattern: this.PATRONES.NOMBRE_SUPERMERCADO.source,
          actualValue: valor 
        };
      }

      return Object.keys(errores).length > 0 ? errores : null;
    };
  }

  /**
   * Validador para presupuestos
   * @param config Configuración del validador
   * @returns ValidatorFn Función validadora
   */
  public validadorPresupuesto(config?: ConfiguracionValidador): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && !config?.obligatorio) {
        return null;
      }

      const valor = control.value;
      const errores: ValidationErrors = {};

      // Convertir a número
      const presupuesto = Number(valor);

      // Validar que es un número válido
      if (isNaN(presupuesto) || !isFinite(presupuesto)) {
        errores['invalidFormat'] = { message: 'Debe ser un número válido' };
        return errores;
      }

      // Validar que es positivo
      if (presupuesto <= 0) {
        errores['min'] = { min: 0.01, actual: presupuesto };
      }

      // Validar límite máximo razonable
      const maximo = config?.valorMaximo ?? 100000000; // 100 millones
      if (presupuesto > maximo) {
        errores['max'] = { max: maximo, actual: presupuesto };
      }

      return Object.keys(errores).length > 0 ? errores : null;
    };
  }

  /**
   * Validador para fechas de compra
   * @param permitirFuturo Si permite fechas futuras
   * @returns ValidatorFn Función validadora
   */
  public validadorFechaCompra(permitirFuturo: boolean = false): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const valor = control.value as string;
      const errores: ValidationErrors = {};

      // Validar formato
      if (!this.PATRONES.FECHA.test(valor)) {
        errores['pattern'] = { message: 'Formato debe ser YYYY-MM-DD' };
        return errores;
      }

      // Validar que es una fecha válida
      const fecha = new Date(valor);
      if (isNaN(fecha.getTime())) {
        errores['invalidFormat'] = { message: 'Fecha inválida' };
        return errores;
      }

      // Validar que no es futura (si no está permitido)
      if (!permitirFuturo) {
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        
        if (fecha > hoy) {
          errores['futureDate'] = { message: 'No se permiten fechas futuras' };
        }
      }

      // Validar rango razonable (no muy antigua)
      const fechaMinima = new Date('1900-01-01');
      if (fecha < fechaMinima) {
        errores['outOfRange'] = { message: 'Fecha fuera del rango válido' };
      }

      return Object.keys(errores).length > 0 ? errores : null;
    };
  }

  /**
   * Validador para horas de compra
   * @returns ValidatorFn Función validadora
   */
  public validadorHoraCompra(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const valor = control.value as string;
      const errores: ValidationErrors = {};

      // Validar formato HH:mm
      if (!this.PATRONES.HORA.test(valor)) {
        errores['pattern'] = { message: 'Formato debe ser HH:mm (ej: 14:30)' };
      }

      return Object.keys(errores).length > 0 ? errores : null;
    };
  }

  // ==================== VALIDADORES ASÍNCRONOS ====================

  /**
   * Validador asíncrono para nombres de productos únicos en sesión
   * @param sessionId ID de la sesión actual
   * @param productoId ID del producto actual (para excluir en edición)
   * @returns AsyncValidatorFn Función validadora asíncrona
   */
  public validadorProductoUnicoEnSesion(sessionId?: string, productoId?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || !sessionId) {
        return of(null);
      }

      const nombreProducto = control.value as string;
      const cacheKey = `producto_unico_${sessionId}_${nombreProducto.toLowerCase()}`;

      // Verificar cache
      if (this.cacheValidacionesAsincronas.has(cacheKey)) {
        const resultado = this.cacheValidacionesAsincronas.get(cacheKey);
        return of(resultado);
      }

      // Debounce para evitar muchas consultas
      return timer(300).pipe(
        switchMap(() => this.almacenamientoService.obtenerSesionActiva()),
        map(sesion => {
          if (!sesion || sesion.id !== sessionId) {
            return null;
          }

          // Buscar productos con el mismo nombre (excluyendo el actual)
          const productosConMismoNombre = sesion.productos.filter(producto => 
            producto.nombre.toLowerCase() === nombreProducto.toLowerCase() &&
            producto.id !== productoId
          );

          const resultado = productosConMismoNombre.length > 0 
            ? { productoExistente: { 
                mensaje: 'Ya existe un producto con este nombre en la sesión',
                productosExistentes: productosConMismoNombre.length 
              }}
            : null;

          // Guardar en cache
          this.cacheValidacionesAsincronas.set(cacheKey, resultado);
          
          return resultado;
        }),
        catchError(() => of(null))
      );
    };
  }

  /**
   * Validador asíncrono para verificación de seguridad avanzada
   * @returns AsyncValidatorFn Función validadora asíncrona
   */
  public validadorSeguridadAvanzada(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      const valor = control.value as string;
      const cacheKey = `seguridad_${valor.substring(0, 10)}`;

      // Verificar cache
      if (this.cacheValidacionesAsincronas.has(cacheKey)) {
        return of(this.cacheValidacionesAsincronas.get(cacheKey));
      }

      // Validación asíncrona de seguridad
      return timer(200).pipe(
        switchMap(() => this.seguridadService.validarEntrada(valor, 'nombreProducto')),
        map(resultado => {
          if (!resultado || !resultado.valido) {
            const errores = {
              seguridadAvanzada: {
                mensaje: 'El texto contiene elementos no seguros',
                errores: resultado?.errores || ['Validación de seguridad falló']
              }
            };

            this.cacheValidacionesAsincronas.set(cacheKey, errores);
            return errores;
          }

          this.cacheValidacionesAsincronas.set(cacheKey, null);
          return null;
        }),
        catchError(() => {
          const errorGenerico = {
            seguridadAvanzada: {
              mensaje: 'Error verificando seguridad del texto'
            }
          };
          this.cacheValidacionesAsincronas.set(cacheKey, errorGenerico);
          return of(errorGenerico);
        })
      );
    };
  }

  /**
   * Validador asíncrono para verificar límites de productos por sesión
   * @param sessionId ID de la sesión actual
   * @returns AsyncValidatorFn Función validadora asíncrona
   */
  public validadorLimiteProductosPorSesion(sessionId?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!sessionId) {
        return of(null);
      }

      return this.almacenamientoService.obtenerConfiguracion().pipe(
        switchMap(configuracion => {
          const limite = configuracion?.datos.limiteProductosPorSesion || 200;
          
          return this.almacenamientoService.obtenerSesionActiva().pipe(
            map(sesion => {
              if (!sesion || sesion.id !== sessionId) {
                return null;
              }

              if (sesion.productos.length >= limite) {
                return {
                  limiteProductos: {
                    mensaje: `Se ha alcanzado el límite de ${limite} productos por sesión`,
                    limite,
                    actual: sesion.productos.length
                  }
                };
              }

              return null;
            })
          );
        }),
        catchError(() => of(null))
      );
    };
  }

  // ==================== VALIDADORES COMPUESTOS ====================

  /**
   * Crea un validador compuesto para productos completos
   * @param config Configuración del validador
   * @returns ValidatorFn Función validadora compuesta
   */
  public validadorProductoCompleto(config?: {
    sessionId?: string;
    productoId?: string;
    validarUniqueness?: boolean;
    validarSeguridad?: boolean;
  }): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const grupoFormulario = control;
      const errores: ValidationErrors = {};

      // Validar nombre del producto
      const nombreControl = grupoFormulario.get('nombre');
      if (nombreControl) {
        const validadorNombre = this.validadorNombreProducto({ obligatorio: true, longitudMaxima: 100 });
        const erroresNombre = validadorNombre(nombreControl);
        if (erroresNombre) {
          errores['nombre'] = erroresNombre;
        }
      }

      // Validar precio
      const precioControl = grupoFormulario.get('precioUnitario');
      if (precioControl) {
        const validadorPrecio = this.validadorPrecioUnitario({ obligatorio: true, valorMinimo: 0.01 });
        const erroresPrecio = validadorPrecio(precioControl);
        if (erroresPrecio) {
          errores['precioUnitario'] = erroresPrecio;
        }
      }

      // Validar cantidad
      const cantidadControl = grupoFormulario.get('cantidad');
      if (cantidadControl) {
        const validadorCantidad = this.validadorCantidadProducto({ obligatorio: true, valorMinimo: 1 });
        const erroresCantidad = validadorCantidad(cantidadControl);
        if (erroresCantidad) {
          errores['cantidad'] = erroresCantidad;
        }
      }

      // Validaciones de reglas de negocio
      if (nombreControl && precioControl && cantidadControl) {
        const erroresNegocio = this.validarReglasNegocioProducto(
          nombreControl.value,
          precioControl.value,
          cantidadControl.value
        );
        
        if (erroresNegocio) {
          errores['reglasNegocio'] = erroresNegocio;
        }
      }

      return Object.keys(errores).length > 0 ? errores : null;
    };
  }

  /**
   * Crea un validador compuesto para sesiones de compra
   * @returns ValidatorFn Función validadora compuesta
   */
  public validadorSesionCompleta(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const grupoFormulario = control;
      const errores: ValidationErrors = {};

      // Validar nombre del supermercado
      const supermercadoControl = grupoFormulario.get('nombreSupermercado');
      if (supermercadoControl) {
        const validadorSupermercado = this.validadorNombreSupermercado({ obligatorio: true });
        const erroresSupermercado = validadorSupermercado(supermercadoControl);
        if (erroresSupermercado) {
          errores['nombreSupermercado'] = erroresSupermercado;
        }
      }

      // Validar fecha
      const fechaControl = grupoFormulario.get('fecha');
      if (fechaControl) {
        const validadorFecha = this.validadorFechaCompra(false);
        const erroresFecha = validadorFecha(fechaControl);
        if (erroresFecha) {
          errores['fecha'] = erroresFecha;
        }
      }

      // Validar hora
      const horaControl = grupoFormulario.get('horaInicio');
      if (horaControl) {
        const validadorHora = this.validadorHoraCompra();
        const erroresHora = validadorHora(horaControl);
        if (erroresHora) {
          errores['horaInicio'] = erroresHora;
        }
      }

      // Validar presupuesto si existe
      const presupuestoControl = grupoFormulario.get('presupuestoEstimado');
      if (presupuestoControl && presupuestoControl.value) {
        const validadorPresupuesto = this.validadorPresupuesto();
        const erroresPresupuesto = validadorPresupuesto(presupuestoControl);
        if (erroresPresupuesto) {
          errores['presupuestoEstimado'] = erroresPresupuesto;
        }
      }

      return Object.keys(errores).length > 0 ? errores : null;
    };
  }

  // ==================== VALIDACIONES DE REGLAS DE NEGOCIO ====================

  /**
   * Valida reglas de negocio específicas para productos
   * @param nombre Nombre del producto
   * @param precio Precio del producto
   * @param cantidad Cantidad del producto
   * @returns ValidationErrors | null Errores de validación
   */
  public validarReglasNegocioProducto(
    nombre: string,
    precio: number,
    cantidad: number
  ): ValidationErrors | null {
    const errores: any = {};

    // Regla: Productos caros en cantidad alta
    if (precio > 50000 && cantidad > 5) {
      errores.productoCaro = {
        mensaje: 'Producto caro en cantidad alta - revisar si es correcto',
        advertencia: true
      };
    }

    // Regla: Nombres muy cortos para precios altos
    if (nombre && nombre.trim().length < 3 && precio > 10000) {
      errores.nombreCorto = {
        mensaje: 'Nombre muy corto para un producto de precio alto',
        sugerencia: 'Considera un nombre más descriptivo'
      };
    }

    // Regla: Cantidad excesiva para productos perecederos
    const categoriasPerecederas = ['lácteos', 'frutas', 'verduras', 'carnes'];
    const esPerecidero = categoriasPerecederas.some(cat => 
      nombre.toLowerCase().includes(cat)
    );
    
    if (esPerecidero && cantidad > 10) {
      errores.cantidadExcesiva = {
        mensaje: 'Cantidad alta para producto perecedero',
        advertencia: true,
        sugerencia: 'Verifica la fecha de vencimiento'
      };
    }

    // Regla: Precios inusuales (muy bajos o muy altos)
    if (precio < 100 && !nombre.toLowerCase().includes('unidad')) {
      errores.precioMuyBajo = {
        mensaje: 'Precio inusualmente bajo - verificar si es correcto',
        advertencia: true
      };
    }

    if (precio > 100000) {
      errores.precioMuyAlto = {
        mensaje: 'Precio inusualmente alto - verificar si es correcto',
        advertencia: true
      };
    }

    return Object.keys(errores).length > 0 ? errores : null;
  }

  /**
   * Valida coherencia entre fecha y hora
   * @param fecha Fecha de la sesión
   * @param hora Hora de la sesión
   * @returns ValidationErrors | null Errores de validación
   */
  public validarCoherenciaFechaHora(fecha: string, hora: string): ValidationErrors | null {
    if (!fecha || !hora) {
      return null;
    }

    const errores: any = {};

    try {
      const fechaHoraCompleta = new Date(`${fecha}T${hora}:00`);
      const ahora = new Date();

      // Validar que no sea futuro
      if (fechaHoraCompleta > ahora) {
        errores.fechaHoraFutura = {
          mensaje: 'La fecha y hora no pueden ser futuras'
        };
      }

      // Validar horarios comerciales razonables
      const [horas] = hora.split(':').map(Number);
      if (horas < 6 || horas > 23) {
        errores.horarioInusual = {
          mensaje: 'Horario de compra inusual',
          advertencia: true,
          sugerencia: 'Verifica si la hora es correcta'
        };
      }

    } catch (error) {
      errores.formatoInvalido = {
        mensaje: 'Error procesando fecha y hora'
      };
    }

    return Object.keys(errores).length > 0 ? errores : null;
  }

 /**
   * Valida límites de presupuesto según configuración
   * @param presupuesto Presupuesto propuesto
   * @returns Observable<ValidationErrors | null> Resultado de validación
   */
  public validarLimitesPresupuesto(presupuesto: number): Observable<ValidationErrors | null> {
    return this.almacenamientoService.obtenerConfiguracion().pipe(
      map(configuracion => {
        if (!configuracion) {
          return null;
        }

        const errores: any = {};
        
        // Validar contra presupuesto mensual por defecto si existe
        const presupuestoMensual = configuracion.general.presupuestoMensualDefecto;
        if (presupuestoMensual && presupuesto > presupuestoMensual * 1.5) {
          errores.excedeLimite = {
            mensaje: `Presupuesto muy alto comparado con el mensual (${presupuestoMensual})`,
            advertencia: true
          };
        }

        return Object.keys(errores).length > 0 ? errores : null;
      }),
      catchError(() => of(null))
    );
  }

  // ==================== UTILIDADES DE VALIDACIÓN ====================

  /**
   * Obtiene mensaje de error personalizado
   * @param error Error de validación
   * @param campo Nombre del campo
   * @returns string Mensaje de error legible
   */
  public obtenerMensajeError(error: ValidationErrors, campo: string): string {
    const tipoError = Object.keys(error)[0];
    const detalleError = error[tipoError];

    // Mensajes personalizados específicos
    if (detalleError?.mensaje) {
      return detalleError.mensaje;
    }

    // Mensajes genéricos
    switch (tipoError) {
      case 'required':
        return `${campo} es obligatorio`;
      case 'minlength':
        return `${campo} debe tener al menos ${detalleError.requiredLength} caracteres`;
      case 'maxlength':
        return `${campo} no puede exceder ${detalleError.actualLength} caracteres`;
      case 'min':
        return `${campo} debe ser mayor o igual a ${detalleError.min}`;
      case 'max':
        return `${campo} debe ser menor o igual a ${detalleError.max}`;
      case 'pattern':
        return `${campo} tiene un formato inválido`;
      case 'productoExistente':
        return `Ya existe un producto con este nombre`;
      default:
        return this.MENSAJES_ERROR[tipoError as keyof typeof this.MENSAJES_ERROR] || `${campo} no es válido`;
    }
  }

  /**
   * Valida si un texto contiene contenido prohibido
   * @param texto Texto a validar
   * @returns boolean True si contiene texto prohibido
   */
  public contieneTextoProhibido(texto: string): boolean {
    if (!texto) return false;

    const textosProhibidos = [
      'script',
      'javascript',
      'onload',
      'onerror',
      'eval(',
      'function(',
      '<iframe',
      '<object',
      '<embed'
    ];

    const textoLower = texto.toLowerCase();
    return textosProhibidos.some(prohibido => textoLower.includes(prohibido));
  }

  /**
   * Sanitiza un valor para uso seguro
   * @param valor Valor a sanitizar
   * @returns any Valor sanitizado
   */
  public sanitizarValor(valor: any): any {
    if (typeof valor === 'string') {
      return this.seguridadService.sanitizarCadena(valor, true);
    }
    
    if (typeof valor === 'number') {
      return isFinite(valor) ? valor : 0;
    }

    return valor;
  }

  /**
   * Verifica si un valor está en un rango válido
   * @param valor Valor a verificar
   * @param minimo Valor mínimo
   * @param maximo Valor máximo
   * @returns boolean True si está en rango
   */
  public estaEnRango(valor: number, minimo: number, maximo: number): boolean {
    return valor >= minimo && valor <= maximo;
  }

  /**
   * Valida formato de categoría de producto
   * @param categoria Categoría a validar
   * @returns boolean True si es válida
   */
  public validarCategoriaProducto(categoria: string): boolean {
    if (!categoria) return true; // Categoría es opcional

    const categoriasValidas = Object.values(CategoriaProducto);
    return categoriasValidas.includes(categoria as CategoriaProducto);
  }

  /**
   * Obtiene sugerencias de mejora para un campo
   * @param campo Nombre del campo
   * @param valor Valor actual
   * @param errores Errores de validación
   * @returns string[] Lista de sugerencias
   */
  public obtenerSugerenciasMejora(campo: string, valor: any, errores?: ValidationErrors): string[] {
    const sugerencias: string[] = [];

    if (!valor) {
      sugerencias.push(`Completa el campo ${campo}`);
      return sugerencias;
    }

    switch (campo) {
      case 'nombre':
        if (typeof valor === 'string' && valor.length < 5) {
          sugerencias.push('Considera un nombre más descriptivo');
        }
        if (typeof valor === 'string' && !valor.includes(' ')) {
          sugerencias.push('Agrega marca o detalles del producto');
        }
        break;

      case 'precio':
        if (typeof valor === 'number' && valor % 1 !== 0) {
          sugerencias.push('Los precios suelen ser números redondos');
        }
        break;

      case 'cantidad':
        if (typeof valor === 'number' && valor > 10) {
          sugerencias.push('Verifica si necesitas realmente esta cantidad');
        }
        break;
    }

    // Sugerencias basadas en errores
    if (errores) {
      if (errores['pattern']) {
        sugerencias.push('Revisa que no contengas caracteres especiales');
      }
      if (errores['minlength']) {
        sugerencias.push('Agrega más información');
      }
      if (errores['maxlength']) {
        sugerencias.push('Simplifica el texto');
      }
    }

    return sugerencias;
  }

  /**
   * Limpia cache de validaciones asíncronas
   * @param patron Patrón de claves a limpiar (opcional)
   */
  public limpiarCacheValidaciones(patron?: string): void {
    if (patron) {
      const clavesAEliminar = Array.from(this.cacheValidacionesAsincronas.keys())
        .filter(clave => clave.includes(patron));
      
      clavesAEliminar.forEach(clave => {
        this.cacheValidacionesAsincronas.delete(clave);
      });
      
      console.log(`🧹 ${clavesAEliminar.length} entradas de cache eliminadas`);
    } else {
      this.cacheValidacionesAsincronas.clear();
      console.log('🧹 Cache de validaciones limpiado completamente');
    }
  }

  /**
   * Obtiene estadísticas del cache de validaciones
   * @returns object Estadísticas del cache
   */
  public obtenerEstadisticasCache(): object {
    return {
      totalEntradas: this.cacheValidacionesAsincronas.size,
      tiposEntradas: this.analizarTiposCache(),
      memoriaAproximada: this.calcularMemoriaCache(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analiza tipos de entradas en cache
   * @private
   */
  private analizarTiposCache(): Record<string, number> {
    const tipos: Record<string, number> = {};
    
    for (const clave of this.cacheValidacionesAsincronas.keys()) {
      const tipo = clave.split('_')[0];
      tipos[tipo] = (tipos[tipo] || 0) + 1;
    }
    
    return tipos;
  }

  /**
   * Calcula memoria aproximada del cache
   * @private
   */
  private calcularMemoriaCache(): number {
    try {
      const datosSerializados = JSON.stringify(Array.from(this.cacheValidacionesAsincronas.entries()));
      return new Blob([datosSerializados]).size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Obtiene información de debug del servicio
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    return {
      patronesDefinidos: Object.keys(this.PATRONES).length,
      mensajesError: Object.keys(this.MENSAJES_ERROR).length,
      cacheSize: this.cacheValidacionesAsincronas.size,
      estadisticasCache: this.obtenerEstadisticasCache(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Destruye el servicio y limpia recursos
   */
  public destruir(): void {
    this.limpiarCacheValidaciones();
    console.log('🧹 Servicio de validaciones destruido');
  }
}