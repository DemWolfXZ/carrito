/**
 * Servicio de Seguridad y Validaciones
 * 
 * Maneja todas las validaciones de entrada, sanitización de datos,
 * verificación de integridad y protecciones de seguridad.
 * Incluye validadores personalizados y reglas de negocio.
 * 
 * @author Tu Nombre
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

/**
 * Interfaz para resultado de validación
 */
interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
  advertencias: string[];
  valorSanitizado?: any;
  nivelSeguridad: 'bajo' | 'medio' | 'alto';
}

/**
 * Interfaz para configuración de validación
 */
interface ConfiguracionValidacion {
  permitirCaracteresEspeciales: boolean;
  longitudMinima: number;
  longitudMaxima: number;
  requiereValidacionEstricta: boolean;
  patronesPermitidos: RegExp[];
  patronesProhibidos: RegExp[];
}

/**
 * Interfaz para reporte de seguridad
 */
interface ReporteSeguridad {
  timestamp: Date;
  tipoValidacion: string;
  entrada: string;
  resultado: boolean;
  amenazasDetectadas: string[];
  accionTomada: string;
  nivelRiesgo: 'bajo' | 'medio' | 'alto' | 'crítico';
}

/**
 * Enumeración de tipos de amenazas
 */
enum TipoAmenaza {
  INYECCION_SQL = 'inyeccion_sql',
  XSS = 'xss',
  CARACTERES_MALICIOSOS = 'caracteres_maliciosos',
  LONGITUD_EXCESIVA = 'longitud_excesiva',
  FORMATO_INVALIDO = 'formato_invalido',
  DATOS_CORRUPTOS = 'datos_corruptos',
  DESBORDAMIENTO_BUFFER = 'desbordamiento_buffer'
}

@Injectable({
  providedIn: 'root'
})
export class SeguridadService {

  // Patrones de seguridad predefinidos
  private readonly PATRONES_PELIGROSOS = [
    // Inyección SQL básica
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(--|;|\||&)/g,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    
    // XSS básico
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    
    // Caracteres potencialmente peligrosos
    /[<>\"']/g,
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, // Caracteres de control
    
    // Patrones de desbordamiento
    /.{1000,}/g // Más de 1000 caracteres seguidos
  ];

  // Configuraciones por defecto para diferentes tipos de datos
  private readonly CONFIGURACIONES_DEFECTO = {
    nombreProducto: {
      permitirCaracteresEspeciales: false,
      longitudMinima: 1,
      longitudMaxima: 100,
      requiereValidacionEstricta: true,
      patronesPermitidos: [/^[a-zA-ZáéíóúñÑ0-9\s\-\.]+$/],
      patronesProhibidos: this.PATRONES_PELIGROSOS
    },
    nombreSupermercado: {
      permitirCaracteresEspeciales: false,
      longitudMinima: 1,
      longitudMaxima: 50,
      requiereValidacionEstricta: true,
      patronesPermitidos: [/^[a-zA-ZáéíóúñÑ0-9\s\-\.&]+$/],
      patronesProhibidos: this.PATRONES_PELIGROSOS
    },
    notas: {
      permitirCaracteresEspeciales: true,
      longitudMinima: 0,
      longitudMaxima: 500,
      requiereValidacionEstricta: false,
      patronesPermitidos: [/^[a-zA-ZáéíóúñÑ0-9\s\-\.\,\!\?\(\)]+$/],
      patronesProhibidos: [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ]
    },
    valorNumerico: {
      permitirCaracteresEspeciales: false,
      longitudMinima: 1,
      longitudMaxima: 15,
      requiereValidacionEstricta: true,
      patronesPermitidos: [/^[0-9\.\,]+$/],
      patronesProhibidos: this.PATRONES_PELIGROSOS
    }
  };

  // Registro de reportes de seguridad
  private reportesSeguridad: ReporteSeguridad[] = [];
  private readonly MAX_REPORTES = 1000;

  constructor() {
    console.log('🔒 Servicio de seguridad inicializado');
  }

  // ==================== VALIDACIÓN PRINCIPAL ====================

  /**
   * Valida y sanitiza una entrada de texto
   * @param entrada Texto a validar
   * @param tipoValidacion Tipo de validación a aplicar
   * @returns Observable<ResultadoValidacion> Resultado de la validación
   */
  public validarEntrada(
    entrada: string, 
    tipoValidacion: 'nombreProducto' | 'nombreSupermercado' | 'notas' | 'valorNumerico'
  ): Observable<ResultadoValidacion> {
    try {
      const configuracion = this.CONFIGURACIONES_DEFECTO[tipoValidacion];
      const resultado = this.ejecutarValidacion(entrada, configuracion, tipoValidacion);
      
      // Registrar reporte de seguridad
      this.registrarReporteSeguridad({
        timestamp: new Date(),
        tipoValidacion,
        entrada: entrada.substring(0, 50) + '...', // Limitar para log
        resultado: resultado.valido,
        amenazasDetectadas: resultado.errores.filter(e => e.includes('amenaza')),
        accionTomada: resultado.valido ? 'permitido' : 'bloqueado',
        nivelRiesgo: this.calcularNivelRiesgo(resultado)
      });

      return of(resultado);
    } catch (error) {
      console.error('Error en validación de entrada:', error);
      return of({
        valido: false,
        errores: ['Error interno de validación'],
        advertencias: [],
        nivelSeguridad: 'alto'
      });
    }
  }

  /**
   * Sanitiza una cadena eliminando caracteres peligrosos
   * @param entrada Cadena a sanitizar
   * @param agresivo Si debe aplicar sanitización agresiva
   * @returns string Cadena sanitizada
   */
  public sanitizarCadena(entrada: string, agresivo: boolean = true): string {
    if (!entrada || typeof entrada !== 'string') {
      return '';
    }

    let sanitizada = entrada;

    try {
      // Sanitización básica
      sanitizada = sanitizada.trim();
      
      // Eliminar caracteres de control
      sanitizada = sanitizada.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Escapar caracteres HTML básicos
      sanitizada = sanitizada
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

      if (agresivo) {
        // Eliminar scripts y otros elementos peligrosos
        sanitizada = sanitizada.replace(/<script[^>]*>.*?<\/script>/gi, '');
        sanitizada = sanitizada.replace(/javascript:/gi, '');
        sanitizada = sanitizada.replace(/on\w+\s*=/gi, '');
        
        // Eliminar caracteres especiales adicionales
        sanitizada = sanitizada.replace(/[<>\"']/g, '');
      }

      // Limitar longitud máxima
      if (sanitizada.length > 1000) {
        sanitizada = sanitizada.substring(0, 1000);
      }

      return sanitizada;
    } catch (error) {
      console.error('Error sanitizando cadena:', error);
      return '';
    }
  }

  /**
   * Valida un número con rangos de seguridad
   * @param valor Valor a validar
   * @param minimo Valor mínimo permitido
   * @param maximo Valor máximo permitido
   * @param entero Si debe ser un número entero
   * @returns ResultadoValidacion Resultado de la validación
   */
  public validarNumero(
    valor: any, 
    minimo: number = 0, 
    maximo: number = 999999999, 
    entero: boolean = false
  ): ResultadoValidacion {
    const errores: string[] = [];
    const advertencias: string[] = [];

    try {
      // Verificar que el valor existe
      if (valor === null || valor === undefined || valor === '') {
        errores.push('El valor es obligatorio');
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      // Convertir a número si es string
      let numeroValidado: number;
      if (typeof valor === 'string') {
        // Sanitizar string numérico
        const valorSanitizado = this.sanitizarNumeroString(valor);
        numeroValidado = parseFloat(valorSanitizado);
      } else if (typeof valor === 'number') {
        numeroValidado = valor;
      } else {
        errores.push('El valor debe ser un número válido');
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      // Validar que es un número válido
      if (isNaN(numeroValidado) || !isFinite(numeroValidado)) {
        errores.push('El valor no es un número válido');
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      // Validar si debe ser entero
      if (entero && !Number.isInteger(numeroValidado)) {
        errores.push('El valor debe ser un número entero');
        return this.crearResultadoValidacion(false, errores, advertencias, 'medio');
      }

      // Validar rango
      if (numeroValidado < minimo) {
        errores.push(`El valor debe ser mayor o igual a ${minimo}`);
        return this.crearResultadoValidacion(false, errores, advertencias, 'medio');
      }

      if (numeroValidado > maximo) {
        errores.push(`El valor debe ser menor o igual a ${maximo}`);
        return this.crearResultadoValidacion(false, errores, advertencias, 'medio');
      }

      // Advertencias para valores extremos
      if (numeroValidado > maximo * 0.9) {
        advertencias.push('El valor está cerca del límite máximo');
      }

      return this.crearResultadoValidacion(
        true, 
        errores, 
        advertencias, 
        'bajo', 
        numeroValidado
      );

    } catch (error) {
      console.error('Error validando número:', error);
      errores.push('Error interno validando número');
      return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
    }
  }

  /**
   * Valida formato de fecha
   * @param fecha Fecha a validar (string o Date)
   * @param permitirFuturo Si se permiten fechas futuras
   * @returns ResultadoValidacion Resultado de la validación
   */
  public validarFecha(fecha: any, permitirFuturo: boolean = false): ResultadoValidacion {
    const errores: string[] = [];
    const advertencias: string[] = [];

    try {
      if (!fecha) {
        errores.push('La fecha es obligatoria');
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      let fechaValidada: Date;

      if (typeof fecha === 'string') {
        // Sanitizar string de fecha
        const fechaSanitizada = this.sanitizarCadena(fecha, false);
        
        // Validar formato de fecha (YYYY-MM-DD)
        const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;
        if (!formatoFecha.test(fechaSanitizada)) {
          errores.push('Formato de fecha inválido. Use YYYY-MM-DD');
          return this.crearResultadoValidacion(false, errores, advertencias, 'medio');
        }

        fechaValidada = new Date(fechaSanitizada);
      } else if (fecha instanceof Date) {
        fechaValidada = fecha;
      } else {
        errores.push('Tipo de fecha inválido');
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      // Validar que la fecha es válida
      if (isNaN(fechaValidada.getTime())) {
        errores.push('Fecha inválida');
        return this.crearResultadoValidacion(false, errores, advertencias, 'medio');
      }

      // Validar rango de fechas razonable
      const fechaMinima = new Date('1900-01-01');
      const fechaMaxima = new Date('2100-12-31');

      if (fechaValidada < fechaMinima || fechaValidada > fechaMaxima) {
        errores.push('Fecha fuera del rango válido (1900-2100)');
        return this.crearResultadoValidacion(false, errores, advertencias, 'medio');
      }

      // Validar fecha futura si no está permitida
      if (!permitirFuturo) {
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999); // Final del día
        
        if (fechaValidada > hoy) {
          errores.push('No se permiten fechas futuras');
          return this.crearResultadoValidacion(false, errores, advertencias, 'medio');
        }
      }

      // Advertencia para fechas muy antiguas
      const haceUnAno = new Date();
      haceUnAno.setFullYear(haceUnAno.getFullYear() - 1);
      
      if (fechaValidada < haceUnAno) {
        advertencias.push('La fecha es de hace más de un año');
      }

      return this.crearResultadoValidacion(
        true, 
        errores, 
        advertencias, 
        'bajo', 
        fechaValidada.toISOString().split('T')[0]
      );

    } catch (error) {
      console.error('Error validando fecha:', error);
      errores.push('Error interno validando fecha');
      return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
    }
  }

  // ==================== VALIDACIONES ESPECÍFICAS ====================

  /**
   * Valida nombre de producto con reglas específicas
   * @param nombre Nombre del producto
   * @returns ResultadoValidacion Resultado de la validación
   */
  public validarNombreProducto(nombre: string): ResultadoValidacion {
    return this.validarEntrada(nombre, 'nombreProducto').pipe().subscribe();
  }

  /**
   * Valida datos de un producto completo
   * @param datosProducto Datos del producto a validar
   * @returns Observable<ResultadoValidacion> Resultado de la validación
   */
  public validarProductoCompleto(datosProducto: {
    nombre: string;
    precioUnitario: number;
    cantidad: number;
    notas?: string;
  }): Observable<ResultadoValidacion> {
    try {
      const errores: string[] = [];
      const advertencias: string[] = [];

      // Validar nombre
      const validacionNombre = this.ejecutarValidacion(
        datosProducto.nombre, 
        this.CONFIGURACIONES_DEFECTO.nombreProducto, 
        'nombreProducto'
      );
      errores.push(...validacionNombre.errores);
      advertencias.push(...validacionNombre.advertencias);

      // Validar precio
      const validacionPrecio = this.validarNumero(datosProducto.precioUnitario, 0.01, 10000000);
      errores.push(...validacionPrecio.errores);
      advertencias.push(...validacionPrecio.advertencias);

      // Validar cantidad
      const validacionCantidad = this.validarNumero(datosProducto.cantidad, 1, 1000, true);
      errores.push(...validacionCantidad.errores);
      advertencias.push(...validacionCantidad.advertencias);

      // Validar notas si existen
      if (datosProducto.notas) {
        const validacionNotas = this.ejecutarValidacion(
          datosProducto.notas,
          this.CONFIGURACIONES_DEFECTO.notas,
          'notas'
        );
        errores.push(...validacionNotas.errores);
        advertencias.push(...validacionNotas.advertencias);
      }

      // Crear resultado consolidado
      const valido = errores.length === 0;
      const nivelSeguridad = this.determinarNivelSeguridad(errores, advertencias);

      const resultado: ResultadoValidacion = {
        valido,
        errores,
        advertencias,
        nivelSeguridad,
        valorSanitizado: valido ? {
          nombre: this.sanitizarCadena(datosProducto.nombre),
          precioUnitario: validacionPrecio.valorSanitizado,
          cantidad: validacionCantidad.valorSanitizado,
          notas: datosProducto.notas ? this.sanitizarCadena(datosProducto.notas) : undefined
        } : undefined
      };

      return of(resultado);
    } catch (error) {
      console.error('Error validando producto completo:', error);
      return of({
        valido: false,
        errores: ['Error interno validando producto'],
        advertencias: [],
        nivelSeguridad: 'alto'
      });
    }
  }

  /**
   * Valida integridad de datos JSON
   * @param datosJSON String JSON a validar
   * @param esquemaEsperado Esquema esperado (opcional)
   * @returns ResultadoValidacion Resultado de la validación
   */
  public validarIntegridadJSON(datosJSON: string, esquemaEsperado?: any): ResultadoValidacion {
    const errores: string[] = [];
    const advertencias: string[] = [];

    try {
      // Validar que es un string válido
      if (typeof datosJSON !== 'string') {
        errores.push('Los datos deben ser una cadena JSON válida');
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      // Verificar longitud razonable
      if (datosJSON.length > 10000000) { // 10MB máximo
        errores.push('Los datos JSON exceden el tamaño máximo permitido');
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      // Verificar caracteres peligrosos en JSON
      const amenazasDetectadas = this.detectarAmenazas(datosJSON);
      if (amenazasDetectadas.length > 0) {
        errores.push(`Amenazas detectadas: ${amenazasDetectadas.join(', ')}`);
        return this.crearResultadoValidacion(false, errores, advertencias, 'crítico');
      }

      // Intentar parsear JSON
      let datosParseados: any;
      try {
        datosParseados = JSON.parse(datosJSON);
      } catch (parseError) {
        errores.push('Formato JSON inválido');
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      // Validar estructura si se proporciona esquema
      if (esquemaEsperado) {
        const validacionEstructura = this.validarEstructuraObjeto(datosParseados, esquemaEsperado);
        errores.push(...validacionEstructura.errores);
        advertencias.push(...validacionEstructura.advertencias);
      }

      // Verificar profundidad del objeto (prevenir ataques de DoS)
      const profundidad = this.calcularProfundidadObjeto(datosParseados);
      if (profundidad > 50) {
        errores.push('La estructura JSON es demasiado profunda');
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      if (profundidad > 30) {
        advertencias.push('La estructura JSON tiene alta profundidad');
      }

      return this.crearResultadoValidacion(
        errores.length === 0,
        errores,
        advertencias,
        errores.length === 0 ? 'bajo' : 'medio',
        datosParseados
      );

    } catch (error) {
      console.error('Error validando integridad JSON:', error);
      errores.push('Error interno validando JSON');
      return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
    }
  }

  // ==================== DETECCIÓN DE AMENAZAS ====================

  /**
   * Detecta amenazas en una cadena de texto
   * @param entrada Cadena a analizar
   * @returns string[] Lista de amenazas detectadas
   */
  public detectarAmenazas(entrada: string): string[] {
    const amenazas: string[] = [];

    if (!entrada || typeof entrada !== 'string') {
      return amenazas;
    }

    try {
      // Detectar inyección SQL
      if (this.detectarInyeccionSQL(entrada)) {
        amenazas.push(TipoAmenaza.INYECCION_SQL);
      }

      // Detectar XSS
      if (this.detectarXSS(entrada)) {
        amenazas.push(TipoAmenaza.XSS);
      }

      // Detectar caracteres maliciosos
      if (this.detectarCaracteresMaliciosos(entrada)) {
        amenazas.push(TipoAmenaza.CARACTERES_MALICIOSOS);
      }

      // Detectar longitud excesiva
      if (entrada.length > 10000) {
        amenazas.push(TipoAmenaza.LONGITUD_EXCESIVA);
      }

      // Detectar posible desbordamiento de buffer
      if (this.detectarDesbordamientoBuffer(entrada)) {
        amenazas.push(TipoAmenaza.DESBORDAMIENTO_BUFFER);
      }

    } catch (error) {
      console.error('Error detectando amenazas:', error);
      amenazas.push('error_deteccion');
    }

    return amenazas;
  }

  /**
   * Verifica si una cadena contiene patrones de inyección SQL
   * @private
   */
  private detectarInyeccionSQL(entrada: string): boolean {
    const patronesSQL = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--|;|\||&)/g,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /('.*?')|(".*?")/g
    ];

    return patronesSQL.some(patron => patron.test(entrada));
  }

  /**
   * Verifica si una cadena contiene patrones XSS
   * @private
   */
  private detectarXSS(entrada: string): boolean {
    const patronesXSS = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<[^>]*>/g
    ];

    return patronesXSS.some(patron => patron.test(entrada));
  }

  /**
   * Verifica si una cadena contiene caracteres maliciosos
   * @private
   */
  private detectarCaracteresMaliciosos(entrada: string): boolean {
    const caracteresProhibidos = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    return caracteresProhibidos.test(entrada);
  }

  /**
   * Verifica patrones de desbordamiento de buffer
   * @private
   */
  private detectarDesbordamientoBuffer(entrada: string): boolean {
    // Detectar repetición excesiva de caracteres
    const repeticionExcesiva = /(.)\1{100,}/g;
    return repeticionExcesiva.test(entrada);
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Ejecuta validación con configuración específica
   * @private
   */
  private ejecutarValidacion(
    entrada: string,
    configuracion: ConfiguracionValidacion,
    tipo: string
  ): ResultadoValidacion {
    const errores: string[] = [];
    const advertencias: string[] = [];

    try {
      // Validar entrada básica
      if (!entrada) {
        errores.push(`${tipo} es obligatorio`);
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      if (typeof entrada !== 'string') {
        errores.push(`${tipo} debe ser una cadena de texto`);
        return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
      }

      // Detectar amenazas
      const amenazas = this.detectarAmenazas(entrada);
      if (amenazas.length > 0) {
        errores.push(`Amenazas detectadas en ${tipo}: ${amenazas.join(', ')}`);
        return this.crearResultadoValidacion(false, errores, advertencias, 'crítico');
      }

      // Validar longitud
      if (entrada.length < configuracion.longitudMinima) {
        errores.push(`${tipo} debe tener al menos ${configuracion.longitudMinima} caracteres`);
      }

      if (entrada.length > configuracion.longitudMaxima) {
        errores.push(`${tipo} no puede exceder ${configuracion.longitudMaxima} caracteres`);
      }

      // Validar patrones permitidos
      if (configuracion.patronesPermitidos.length > 0) {
        const cumplePatron = configuracion.patronesPermitidos.some(patron => patron.test(entrada));
        if (!cumplePatron) {
          errores.push(`${tipo} contiene caracteres no permitidos`);
        }
      }

      // Verificar patrones prohibidos
      const patronProhibido = configuracion.patronesProhibidos.find(patron => patron.test(entrada));
      if (patronProhibido) {
        errores.push(`${tipo} contiene patrones prohibidos`);
      }

      // Sanitizar valor si es válido
      const valorSanitizado = errores.length === 0 ? this.sanitizarCadena(entrada, !configuracion.permitirCaracteresEspeciales) : undefined;

      return this.crearResultadoValidacion(
        errores.length === 0,
        errores,
        advertencias,
        this.determinarNivelSeguridad(errores, advertencias),
        valorSanitizado
      );

    } catch (error) {
      console.error(`Error ejecutando validación para ${tipo}:`, error);
      errores.push(`Error interno validando ${tipo}`);
      return this.crearResultadoValidacion(false, errores, advertencias, 'alto');
    }
  }

  /**
   * Sanitiza un string numérico
   * @private
   */
  private sanitizarNumeroString(valor: string): string {
    return valor
      .replace(/[^0-9\.\,\-]/g, '') // Solo números, punto, coma y signo menos
      .replace(/,/g, '.') // Cambiar comas por puntos
      .replace(/\.{2,}/g, '.') // Eliminar múltiples puntos
      .replace(/^\./, '0.') // Agregar 0 antes del punto inicial
      .substring(0, 15); // Limitar longitud
  }

  /**
   * Calcula la profundidad de un objeto
   * @private
   */
  private calcularProfundidadObjeto(obj: any, profundidadActual: number = 0): number {
    if (profundidadActual > 100) return 100; // Límite de seguridad

    if (obj === null || typeof obj !== 'object') {
      return profundidadActual;
    }

    let maxProfundidad = profundidadActual;

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const profundidadHija = this.calcularProfundidadObjeto(obj[key], profundidadActual + 1);
        maxProfundidad = Math.max(maxProfundidad, profundidadHija);
      }
    }

    return maxProfundidad;
  }

/**
   * Valida estructura de objeto contra esquema
   * @private
   */
  private validarEstructuraObjeto(objeto: any, esquema: any): {errores: string[], advertencias: string[]} {
    const errores: string[] = [];
    const advertencias: string[] = [];

    try {
      if (!objeto || typeof objeto !== 'object') {
        errores.push('El objeto no tiene una estructura válida');
        return { errores, advertencias };
      }

      if (!esquema || typeof esquema !== 'object') {
        advertencias.push('No se proporcionó esquema de validación');
        return { errores, advertencias };
      }

      // Validar propiedades requeridas del esquema
      for (const propiedad in esquema) {
        if (esquema[propiedad].requerido && !(propiedad in objeto)) {
          errores.push(`Propiedad requerida faltante: ${propiedad}`);
        }

        if (propiedad in objeto) {
          const tipoEsperado = esquema[propiedad].tipo;
          const tipoActual = typeof objeto[propiedad];

          if (tipoEsperado && tipoActual !== tipoEsperado) {
            errores.push(`Tipo incorrecto para ${propiedad}: esperado ${tipoEsperado}, recibido ${tipoActual}`);
          }
        }
      }

      // Verificar propiedades adicionales no esperadas
      for (const propiedad in objeto) {
        if (!(propiedad in esquema)) {
          advertencias.push(`Propiedad no esperada encontrada: ${propiedad}`);
        }
      }

    } catch (error) {
      errores.push('Error validando estructura del objeto');
    }

    return { errores, advertencias };
  }

  /**
   * Crea un resultado de validación estándar
   * @private
   */
  private crearResultadoValidacion(
    valido: boolean,
    errores: string[],
    advertencias: string[],
    nivelSeguridad: 'bajo' | 'medio' | 'alto',
    valorSanitizado?: any
  ): ResultadoValidacion {
    return {
      valido,
      errores,
      advertencias,
      valorSanitizado,
      nivelSeguridad
    };
  }

  /**
   * Determina el nivel de seguridad basado en errores y advertencias
   * @private
   */
  private determinarNivelSeguridad(errores: string[], advertencias: string[]): 'bajo' | 'medio' | 'alto' {
    if (errores.length > 0) {
      // Verificar si hay errores críticos
      const erroresCriticos = errores.some(error => 
        error.includes('amenaza') || 
        error.includes('inyección') || 
        error.includes('XSS') ||
        error.includes('malicioso')
      );
      
      return erroresCriticos ? 'alto' : 'medio';
    }

    if (advertencias.length > 2) {
      return 'medio';
    }

    return 'bajo';
  }

  /**
   * Calcula el nivel de riesgo para reportes
   * @private
   */
  private calcularNivelRiesgo(resultado: ResultadoValidacion): 'bajo' | 'medio' | 'alto' | 'crítico' {
    if (!resultado.valido) {
      const tieneAmenazasCriticas = resultado.errores.some(error =>
        error.includes('amenaza') || 
        error.includes('inyección') ||
        error.includes('XSS')
      );
      
      if (tieneAmenazasCriticas) {
        return 'crítico';
      }
      
      return resultado.nivelSeguridad === 'alto' ? 'alto' : 'medio';
    }

    return 'bajo';
  }

  /**
   * Registra un reporte de seguridad
   * @private
   */
  private registrarReporteSeguridad(reporte: ReporteSeguridad): void {
    try {
      this.reportesSeguridad.push(reporte);

      // Mantener solo los últimos reportes para no consumir demasiada memoria
      if (this.reportesSeguridad.length > this.MAX_REPORTES) {
        this.reportesSeguridad = this.reportesSeguridad.slice(-this.MAX_REPORTES);
      }

      // Log para amenazas críticas
      if (reporte.nivelRiesgo === 'crítico' || reporte.nivelRiesgo === 'alto') {
        console.warn('🚨 Amenaza de seguridad detectada:', {
          tipo: reporte.tipoValidacion,
          amenazas: reporte.amenazasDetectadas,
          nivel: reporte.nivelRiesgo
        });
      }

    } catch (error) {
      console.error('Error registrando reporte de seguridad:', error);
    }
  }

  // ==================== MÉTODOS PÚBLICOS ADICIONALES ====================

  /**
   * Obtiene reportes de seguridad recientes
   * @param limite Número máximo de reportes a retornar
   * @param soloAmenazas Si debe retornar solo reportes con amenazas
   * @returns ReporteSeguridad[] Lista de reportes
   */
  public obtenerReportesSeguridad(limite: number = 50, soloAmenazas: boolean = false): ReporteSeguridad[] {
    try {
      let reportes = [...this.reportesSeguridad];

      if (soloAmenazas) {
        reportes = reportes.filter(reporte => 
          !reporte.resultado || reporte.amenazasDetectadas.length > 0
        );
      }

      // Ordenar por timestamp descendente (más recientes primero)
      reportes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return reportes.slice(0, limite);
    } catch (error) {
      console.error('Error obteniendo reportes de seguridad:', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de seguridad
   * @param periodoHoras Período en horas para calcular estadísticas
   * @returns object Estadísticas de seguridad
   */
  public obtenerEstadisticasSeguridad(periodoHoras: number = 24): Observable<any> {
    try {
      const fechaLimite = new Date();
      fechaLimite.setHours(fechaLimite.getHours() - periodoHoras);

      const reportesRecientes = this.reportesSeguridad.filter(
        reporte => reporte.timestamp >= fechaLimite
      );

      const totalValidaciones = reportesRecientes.length;
      const validacionesExitosas = reportesRecientes.filter(r => r.resultado).length;
      const validacionesFallidas = totalValidaciones - validacionesExitosas;
      const amenazasDetectadas = reportesRecientes.filter(r => r.amenazasDetectadas.length > 0).length;

      // Contar por tipo de amenaza
      const amenazasPorTipo: Record<string, number> = {};
      reportesRecientes.forEach(reporte => {
        reporte.amenazasDetectadas.forEach(amenaza => {
          amenazasPorTipo[amenaza] = (amenazasPorTipo[amenaza] || 0) + 1;
        });
      });

      // Contar por nivel de riesgo
      const riesgosPorNivel: Record<string, number> = {};
      reportesRecientes.forEach(reporte => {
        riesgosPorNivel[reporte.nivelRiesgo] = (riesgosPorNivel[reporte.nivelRiesgo] || 0) + 1;
      });

      const estadisticas = {
        periodoAnalizado: `${periodoHoras} horas`,
        totalValidaciones,
        validacionesExitosas,
        validacionesFallidas,
        amenazasDetectadas,
        tasaExito: totalValidaciones > 0 ? ((validacionesExitosas / totalValidaciones) * 100).toFixed(2) + '%' : '0%',
        amenazasPorTipo,
        riesgosPorNivel,
        timestamp: new Date()
      };

      return of(estadisticas);
    } catch (error) {
      console.error('Error obteniendo estadísticas de seguridad:', error);
      return of({
        error: 'Error calculando estadísticas',
        timestamp: new Date()
      });
    }
  }

  /**
   * Limpia reportes de seguridad antiguos
   * @param diasAntiguedad Días de antigüedad para limpiar reportes
   * @returns number Número de reportes eliminados
   */
  public limpiarReportesAntiguos(diasAntiguedad: number = 30): number {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

      const reportesAntiguos = this.reportesSeguridad.length;
      this.reportesSeguridad = this.reportesSeguridad.filter(
        reporte => reporte.timestamp >= fechaLimite
      );

      const reportesEliminados = reportesAntiguos - this.reportesSeguridad.length;
      
      if (reportesEliminados > 0) {
        console.log(`🧹 Limpiados ${reportesEliminados} reportes de seguridad antiguos`);
      }

      return reportesEliminados;
    } catch (error) {
      console.error('Error limpiando reportes antiguos:', error);
      return 0;
    }
  }

  /**
   * Verifica si una IP está en lista negra (funcionalidad futura)
   * @param ip Dirección IP a verificar
   * @returns boolean True si está bloqueada
   */
  public verificarIPBloqueada(ip: string): boolean {
    // Implementación futura para verificación de IPs
    // Por ahora retorna false ya que es una app offline
    return false;
  }

  /**
   * Genera hash seguro para verificación de integridad
   * @param datos Datos para generar hash
   * @returns string Hash generado
   */
  public generarHashIntegridad(datos: string): string {
    try {
      if (!datos || typeof datos !== 'string') {
        return '';
      }

      // Implementación simple de hash (en producción usar crypto más robusto)
      let hash = 0;
      for (let i = 0; i < datos.length; i++) {
        const char = datos.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir a 32bit integer
      }

      return Math.abs(hash).toString(16);
    } catch (error) {
      console.error('Error generando hash de integridad:', error);
      return 'hash_error';
    }
  }

  /**
   * Verifica integridad de datos usando hash
   * @param datos Datos a verificar
   * @param hashEsperado Hash esperado
   * @returns boolean True si la integridad es válida
   */
  public verificarIntegridad(datos: string, hashEsperado: string): boolean {
    try {
      const hashCalculado = this.generarHashIntegridad(datos);
      return hashCalculado === hashEsperado;
    } catch (error) {
      console.error('Error verificando integridad:', error);
      return false;
    }
  }

  /**
   * Encripta datos sensibles (implementación básica)
   * @param datos Datos a encriptar
   * @param clave Clave de encriptación
   * @returns string Datos encriptados
   */
  public encriptarDatos(datos: string, clave: string): string {
    try {
      if (!datos || !clave) {
        return '';
      }

      // Implementación simple de XOR (en producción usar AES u otro algoritmo robusto)
      let resultado = '';
      for (let i = 0; i < datos.length; i++) {
        const charCode = datos.charCodeAt(i) ^ clave.charCodeAt(i % clave.length);
        resultado += String.fromCharCode(charCode);
      }

      // Convertir a base64 para almacenamiento seguro
      return btoa(resultado);
    } catch (error) {
      console.error('Error encriptando datos:', error);
      return '';
    }
  }

  /**
   * Desencripta datos sensibles
   * @param datosEncriptados Datos encriptados
   * @param clave Clave de desencriptación
   * @returns string Datos desencriptados
   */
  public desencriptarDatos(datosEncriptados: string, clave: string): string {
    try {
      if (!datosEncriptados || !clave) {
        return '';
      }

      // Decodificar de base64
      const datosDecodificados = atob(datosEncriptados);

      // Desencriptar usando XOR
      let resultado = '';
      for (let i = 0; i < datosDecodificados.length; i++) {
        const charCode = datosDecodificados.charCodeAt(i) ^ clave.charCodeAt(i % clave.length);
        resultado += String.fromCharCode(charCode);
      }

      return resultado;
    } catch (error) {
      console.error('Error desencriptando datos:', error);
      return '';
    }
  }

  /**
   * Valida configuración de seguridad del sistema
   * @returns Observable<ResultadoValidacion> Resultado de la validación
   */
  public validarConfiguracionSeguridad(): Observable<ResultadoValidacion> {
    try {
      const errores: string[] = [];
      const advertencias: string[] = [];

      // Verificar configuraciones críticas
      if (this.PATRONES_PELIGROSOS.length === 0) {
        errores.push('No hay patrones de seguridad configurados');
      }

      if (Object.keys(this.CONFIGURACIONES_DEFECTO).length === 0) {
        errores.push('No hay configuraciones de validación por defecto');
      }

      // Verificar límites de seguridad
      if (this.MAX_REPORTES < 100) {
        advertencias.push('Límite de reportes de seguridad muy bajo');
      }

      // Verificar estado de reportes
      if (this.reportesSeguridad.length === 0) {
        advertencias.push('No hay reportes de seguridad registrados');
      }

      const resultado: ResultadoValidacion = {
        valido: errores.length === 0,
        errores,
        advertencias,
        nivelSeguridad: errores.length > 0 ? 'alto' : 'bajo'
      };

      return of(resultado);
    } catch (error) {
      console.error('Error validando configuración de seguridad:', error);
      return of({
        valido: false,
        errores: ['Error interno validando configuración de seguridad'],
        advertencias: [],
        nivelSeguridad: 'alto'
      });
    }
  }

  /**
   * Obtiene información de debug del servicio de seguridad
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    try {
      return {
        patronesPeligrosos: this.PATRONES_PELIGROSOS.length,
        configuracionesDefecto: Object.keys(this.CONFIGURACIONES_DEFECTO).length,
        reportesEnMemoria: this.reportesSeguridad.length,
        maxReportes: this.MAX_REPORTES,
        ultimoReporte: this.reportesSeguridad.length > 0 
          ? this.reportesSeguridad[this.reportesSeguridad.length - 1].timestamp 
          : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error obteniendo información de debug:', error);
      return {
        error: 'Error obteniendo información de debug',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Reinicia configuraciones de seguridad a valores por defecto
   * @returns boolean True si se reinició exitosamente
   */
  public reiniciarConfiguracionSeguridad(): boolean {
    try {
      // Limpiar reportes
      this.reportesSeguridad = [];

      console.log('🔒 Configuración de seguridad reiniciada');
      return true;
    } catch (error) {
      console.error('Error reiniciando configuración de seguridad:', error);
      return false;
    }
  }

  /**
   * Destruye el servicio y limpia recursos
   */
  public destruir(): void {
    try {
      this.reportesSeguridad = [];
      console.log('🧹 Servicio de seguridad destruido');
    } catch (error) {
      console.error('Error destruyendo servicio de seguridad:', error);
    }
  }
}