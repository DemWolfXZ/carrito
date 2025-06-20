/**
 * Interceptor de Validación HTTP
 * 
 * Intercepta todas las peticiones HTTP para validar datos automáticamente,
 * sanitizar entradas, verificar seguridad y mantener logs de validación.
 * Se integra con SeguridadService y ValidacionService.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 * @file src/app/core/interceptors/validacion.interceptor.ts
 */

import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';

import { SeguridadService } from '../services/seguridad.service';
import { ValidacionService } from '../services/validacion.service';
import { NotificacionesService, TipoNotificacion, PrioridadNotificacion } from '../services/notificaciones.service';

/**
 * Interfaz para configuración del interceptor
 */
interface ConfiguracionInterceptor {
  validarRequest: boolean;
  validarResponse: boolean;
  sanitizarDatos: boolean;
  verificarSeguridad: boolean;
  logearOperaciones: boolean;
  bloquearAmenazas: boolean;
  notificarErrores: boolean;
}

/**
 * Interfaz para resultado de validación de request
 */
interface ResultadoValidacionRequest {
  valido: boolean;
  datosSanitizados?: any;
  errores: string[];
  advertencias: string[];
  amenazasDetectadas: string[];
  accionTomada: 'permitir' | 'bloquear' | 'sanitizar';
}

/**
 * Interfaz para log de operación
 */
interface LogOperacion {
  timestamp: Date;
  metodo: string;
  url: string;
  tipo: 'request' | 'response' | 'error';
  validacionExitosa: boolean;
  amenazasDetectadas: string[];
  errores: string[];
  tiempoValidacion: number;
  tamanoDatos: number;
}

/**
 * Rutas que requieren validación especial
 */
const RUTAS_VALIDACION_ESPECIAL = [
  '/api/productos',
  '/api/sesiones',
  '/api/usuarios',
  '/api/configuracion',
  '/api/respaldos'
];

/**
 * Tipos de contenido que requieren validación
 */
const TIPOS_CONTENIDO_VALIDAR = [
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data'
];

@Injectable()
export class ValidacionInterceptor implements HttpInterceptor {

  // Configuración del interceptor
  private configuracion: ConfiguracionInterceptor = {
    validarRequest: true,
    validarResponse: true,
    sanitizarDatos: true,
    verificarSeguridad: true,
    logearOperaciones: true,
    bloquearAmenazas: true,
    notificarErrores: true
  };

  // Log de operaciones en memoria
  private logsOperaciones: LogOperacion[] = [];
  private readonly MAX_LOGS = 1000;

  // Contadores de estadísticas
  private estadisticas = {
    totalRequests: 0,
    requestsValidados: 0,
    requestsBloqueados: 0,
    amenazasDetectadas: 0,
    erroresValidacion: 0,
    tiempoTotalValidacion: 0
  };

  constructor(
    private seguridadService: SeguridadService,
    private validacionService: ValidacionService,
    private notificacionesService: NotificacionesService
  ) {
    console.log('🛡️ Interceptor de validación inicializado');
  }

  /**
   * Intercepta peticiones HTTP
   * @param request Petición HTTP
   * @param next Siguiente handler en la cadena
   * @returns Observable<HttpEvent<any>> Evento HTTP procesado
   */
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const tiempoInicio = Date.now();
    this.estadisticas.totalRequests++;

    // Verificar si la ruta requiere validación
    if (!this.requiereValidacion(request)) {
      return next.handle(request);
    }

    try {
      // Validar request si está habilitado
      if (this.configuracion.validarRequest) {
        return this.validarRequest(request).pipe(
          switchMap(resultadoValidacion => {
            const tiempoValidacion = Date.now() - tiempoInicio;

            // Registrar log de operación
            this.registrarLogOperacion({
              timestamp: new Date(),
              metodo: request.method,
              url: request.url,
              tipo: 'request',
              validacionExitosa: resultadoValidacion.valido,
              amenazasDetectadas: resultadoValidacion.amenazasDetectadas,
              errores: resultadoValidacion.errores,
              tiempoValidacion,
              tamanoDatos: this.calcularTamanoDatos(request.body)
            });

            // Manejar resultado de validación
            if (!resultadoValidacion.valido) {
              return this.manejarValidacionFallida(request, resultadoValidacion);
            }

            // Crear request sanitizado si es necesario
            const requestProcesado = resultadoValidacion.datosSanitizados 
              ? request.clone({ body: resultadoValidacion.datosSanitizados })
              : request;

            this.estadisticas.requestsValidados++;
            this.estadisticas.tiempoTotalValidacion += tiempoValidacion;

            // Continuar con la petición y validar response
            return next.handle(requestProcesado).pipe(
              map(event => this.validarResponse(event, tiempoInicio)),
              catchError(error => this.manejarErrorHttp(error, request, tiempoInicio))
            );
          })
        );
      } else {
        // Sin validación de request, solo procesar response
        return next.handle(request).pipe(
          map(event => this.validarResponse(event, tiempoInicio)),
          catchError(error => this.manejarErrorHttp(error, request, tiempoInicio))
        );
      }
    } catch (error) {
      console.error('❌ Error en interceptor de validación:', error);
      return this.manejarErrorInterceptor(error, request, next);
    }
  }

  /**
   * Valida una petición HTTP
   * @private
   */
  private validarRequest(request: HttpRequest<any>): Observable<ResultadoValidacionRequest> {
    return new Observable(observer => {
      try {
        const resultado: ResultadoValidacionRequest = {
          valido: true,
          errores: [],
          advertencias: [],
          amenazasDetectadas: [],
          accionTomada: 'permitir'
        };

        // Validar headers
        const validacionHeaders = this.validarHeaders(request.headers);
        if (!validacionHeaders.valido) {
          resultado.valido = false;
          resultado.errores.push(...validacionHeaders.errores);
          resultado.amenazasDetectadas.push(...validacionHeaders.amenazas);
        }

        // Validar URL
        const validacionUrl = this.validarUrl(request.url);
        if (!validacionUrl.valido) {
          resultado.valido = false;
          resultado.errores.push(...validacionUrl.errores);
          resultado.amenazasDetectadas.push(...validacionUrl.amenazas);
        }

        // Validar body si existe
        if (request.body) {
          const validacionBody = this.validarBody(request.body, request.method);
          if (!validacionBody.valido) {
            if (this.configuracion.bloquearAmenazas && validacionBody.amenazas.length > 0) {
              resultado.valido = false;
              resultado.errores.push(...validacionBody.errores);
              resultado.amenazasDetectadas.push(...validacionBody.amenazas);
              resultado.accionTomada = 'bloquear';
            } else if (this.configuracion.sanitizarDatos) {
              // Intentar sanitizar datos
              const datosSanitizados = this.sanitizarDatos(request.body);
              resultado.datosSanitizados = datosSanitizados;
              resultado.advertencias.push(...validacionBody.errores);
              resultado.accionTomada = 'sanitizar';
            }
          }
        }

        // Validar tamaño de petición
        const tamano = this.calcularTamanoDatos(request.body);
        if (tamano > 10 * 1024 * 1024) { // 10MB límite
          resultado.valido = false;
          resultado.errores.push('Tamaño de petición excede el límite permitido');
          resultado.accionTomada = 'bloquear';
        }

        observer.next(resultado);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Valida headers de la petición
   * @private
   */
  private validarHeaders(headers: any): { valido: boolean; errores: string[]; amenazas: string[] } {
    const errores: string[] = [];
    const amenazas: string[] = [];

    try {
      // Validar Content-Type si existe
      const contentType = headers.get('Content-Type');
      if (contentType) {
        const amenazasContentType = this.seguridadService.detectarAmenazas(contentType);
        amenazas.push(...amenazasContentType);
      }

      // Validar User-Agent si existe
      const userAgent = headers.get('User-Agent');
      if (userAgent) {
        const amenazasUserAgent = this.seguridadService.detectarAmenazas(userAgent);
        amenazas.push(...amenazasUserAgent);
        
        // Detectar user agents sospechosos
        if (this.esUserAgentSospechoso(userAgent)) {
          amenazas.push('user_agent_sospechoso');
        }
      }

      // Validar headers personalizados
      const headersPersonalizados = ['X-Requested-With', 'X-Custom-Header'];
      headersPersonalizados.forEach(headerName => {
        const headerValue = headers.get(headerName);
        if (headerValue) {
          const amenazasHeader = this.seguridadService.detectarAmenazas(headerValue);
          amenazas.push(...amenazasHeader);
        }
      });

    } catch (error) {
      errores.push('Error validando headers');
    }

    return {
      valido: amenazas.length === 0 && errores.length === 0,
      errores,
      amenazas
    };
  }

  /**
   * Valida URL de la petición
   * @private
   */
  private validarUrl(url: string): { valido: boolean; errores: string[]; amenazas: string[] } {
    const errores: string[] = [];
    const amenazas: string[] = [];

    try {
      // Detectar amenazas en URL
      const amenazasUrl = this.seguridadService.detectarAmenazas(url);
      amenazas.push(...amenazasUrl);

      // Validar longitud de URL
      if (url.length > 2048) {
        errores.push('URL excede longitud máxima permitida');
      }

      // Detectar patrones sospechosos en URL
      if (this.contienePatronSospechoso(url)) {
        amenazas.push('patron_url_sospechoso');
      }

      // Validar caracteres prohibidos
      const caracteresProhibidos = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
      if (caracteresProhibidos.test(url)) {
        amenazas.push('caracteres_control_url');
      }

    } catch (error) {
      errores.push('Error validando URL');
    }

    return {
      valido: amenazas.length === 0 && errores.length === 0,
      errores,
      amenazas
    };
  }

  /**
   * Valida body de la petición
   * @private
   */
  private validarBody(body: any, metodo: string): { valido: boolean; errores: string[]; amenazas: string[] } {
    const errores: string[] = [];
    const amenazas: string[] = [];

    try {
      // Solo validar para métodos que pueden tener body
      if (!['POST', 'PUT', 'PATCH'].includes(metodo.toUpperCase())) {
        return { valido: true, errores, amenazas };
      }

      // Convertir a string para validación
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

      // Detectar amenazas en el contenido
      const amenazasBody = this.seguridadService.detectarAmenazas(bodyString);
      amenazas.push(...amenazasBody);

      // Validar estructura JSON si corresponde
      if (typeof body === 'object') {
        const validacionJSON = this.seguridadService.validarIntegridadJSON(JSON.stringify(body));
        if (!validacionJSON.valido) {
          errores.push(...validacionJSON.errores);
        }
      }

      // Validaciones específicas según el contenido
      if (body && typeof body === 'object') {
        // Validar datos de producto
        if (body.nombre || body.precio || body.cantidad) {
          const validacionProducto = this.validarDatosProducto(body);
          if (!validacionProducto.valido) {
            errores.push(...validacionProducto.errores);
          }
        }

        // Validar datos de sesión
        if (body.nombreSupermercado || body.fecha) {
          const validacionSesion = this.validarDatosSesion(body);
          if (!validacionSesion.valido) {
            errores.push(...validacionSesion.errores);
          }
        }
      }

    } catch (error) {
      errores.push('Error validando body de la petición');
    }

    return {
      valido: amenazas.length === 0 && errores.length === 0,
      errores,
      amenazas
    };
  }

  /**
   * Valida datos específicos de producto
   * @private
   */
  private validarDatosProducto(datos: any): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    try {
      // Validar nombre del producto
      if (datos.nombre) {
        const validacionNombre = this.seguridadService.validarEntrada(datos.nombre, 'nombreProducto');
        validacionNombre.subscribe(resultado => {
          if (!resultado.valido) {
            errores.push(`Nombre de producto inválido: ${resultado.errores.join(', ')}`);
          }
        });
      }

      // Validar precio
      if (datos.precio !== undefined) {
        const validacionPrecio = this.seguridadService.validarNumero(datos.precio, 0.01, 10000000);
        if (!validacionPrecio.valido) {
          errores.push(`Precio inválido: ${validacionPrecio.errores.join(', ')}`);
        }
      }

      // Validar cantidad
      if (datos.cantidad !== undefined) {
        const validacionCantidad = this.seguridadService.validarNumero(datos.cantidad, 1, 1000, true);
        if (!validacionCantidad.valido) {
          errores.push(`Cantidad inválida: ${validacionCantidad.errores.join(', ')}`);
        }
      }

    } catch (error) {
      errores.push('Error validando datos de producto');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  /**
   * Valida datos específicos de sesión
   * @private
   */
  private validarDatosSesion(datos: any): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    try {
      // Validar nombre del supermercado
      if (datos.nombreSupermercado) {
        const validacionSupermercado = this.seguridadService.validarEntrada(datos.nombreSupermercado, 'nombreSupermercado');
        validacionSupermercado.subscribe(resultado => {
          if (!resultado.valido) {
            errores.push(`Nombre de supermercado inválido: ${resultado.errores.join(', ')}`);
          }
        });
      }

      // Validar fecha
      if (datos.fecha) {
        const validacionFecha = this.seguridadService.validarFecha(datos.fecha, false);
        if (!validacionFecha.valido) {
          errores.push(`Fecha inválida: ${validacionFecha.errores.join(', ')}`);
        }
      }

      // Validar presupuesto si existe
      if (datos.presupuestoEstimado !== undefined) {
        const validacionPresupuesto = this.seguridadService.validarNumero(datos.presupuestoEstimado, 1, 100000000);
        if (!validacionPresupuesto.valido) {
          errores.push(`Presupuesto inválido: ${validacionPresupuesto.errores.join(', ')}`);
        }
      }

    } catch (error) {
      errores.push('Error validando datos de sesión');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  /**
   * Sanitiza datos de entrada
   * @private
   */
  private sanitizarDatos(datos: any): any {
    try {
      if (typeof datos === 'string') {
        return this.seguridadService.sanitizarCadena(datos, true);
      }

      if (typeof datos === 'object' && datos !== null) {
        const datosSanitizados: any = {};
        
        for (const [clave, valor] of Object.entries(datos)) {
          if (typeof valor === 'string') {
            datosSanitizados[clave] = this.seguridadService.sanitizarCadena(valor, true);
          } else if (typeof valor === 'number') {
            datosSanitizados[clave] = isFinite(valor) ? valor : 0;
          } else if (typeof valor === 'object' && valor !== null) {
            datosSanitizados[clave] = this.sanitizarDatos(valor);
          } else {
            datosSanitizados[clave] = valor;
          }
        }
        
        return datosSanitizados;
      }

      return datos;
    } catch (error) {
      console.error('Error sanitizando datos:', error);
      return datos;
    }
  }

  /**
   * Valida response HTTP
   * @private
   */
  private validarResponse(event: HttpEvent<any>, tiempoInicio: number): HttpEvent<any> {
    if (event instanceof HttpResponse && this.configuracion.validarResponse) {
      try {
        const tiempoValidacion = Date.now() - tiempoInicio;

        // Validar headers de respuesta
        this.validarHeadersResponse(event.headers);

        // Validar contenido de respuesta si existe
        if (event.body) {
          this.validarBodyResponse(event.body);
        }

        // Registrar log de respuesta exitosa
        this.registrarLogOperacion({
          timestamp: new Date(),
          metodo: 'RESPONSE',
          url: event.url || 'unknown',
          tipo: 'response',
          validacionExitosa: true,
          amenazasDetectadas: [],
          errores: [],
          tiempoValidacion,
          tamanoDatos: this.calcularTamanoDatos(event.body)
        });

      } catch (error) {
        console.error('Error validando response:', error);
      }
    }

    return event;
  }

  /**
   * Valida headers de respuesta
   * @private
   */
  private validarHeadersResponse(headers: any): void {
    try {
      // Verificar headers de seguridad recomendados
      const headersSeguridadRecomendados = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection'
      ];

      const headersAusentes = headersSeguridadRecomendados.filter(header => !headers.has(header));
      
      if (headersAusentes.length > 0) {
        console.warn('⚠️ Headers de seguridad ausentes:', headersAusentes);
      }

    } catch (error) {
      console.error('Error validando headers de response:', error);
    }
  }

  /**
   * Valida body de respuesta
   * @private
   */
  private validarBodyResponse(body: any): void {
    try {
      // Validar que no contenga información sensible en la respuesta
      if (typeof body === 'object' && body !== null) {
        this.verificarInformacionSensible(body);
      }

      // Validar estructura JSON si corresponde
      if (typeof body === 'object') {
        const bodyString = JSON.stringify(body);
        const amenazas = this.seguridadService.detectarAmenazas(bodyString);
        
        if (amenazas.length > 0) {
          console.warn('⚠️ Amenazas detectadas en response:', amenazas);
        }
      }

    } catch (error) {
      console.error('Error validando body de response:', error);
    }
  }

  /**
   * Verifica información sensible en respuesta
   * @private
   */
  private verificarInformacionSensible(datos: any): void {
    const camposSensibles = ['password', 'token', 'secret', 'key', 'credential'];
    
    const verificarObjeto = (obj: any, ruta: string = ''): void => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const [clave, valor] of Object.entries(obj)) {
        const rutaCompleta = ruta ? `${ruta}.${clave}` : clave;
        
        // Verificar si el campo es sensible
        if (camposSensibles.some(campo => clave.toLowerCase().includes(campo))) {
          console.warn(`⚠️ Campo sensible detectado en response: ${rutaCompleta}`);
        }

        // Recursión para objetos anidados
        if (typeof valor === 'object' && valor !== null) {
          verificarObjeto(valor, rutaCompleta);
        }
      }
    };

    verificarObjeto(datos);
  }

  /**
   * Maneja validación fallida
   * @private
   */
  private manejarValidacionFallida(
    request: HttpRequest<any>,
    resultado: ResultadoValidacionRequest
  ): Observable<never> {
    this.estadisticas.requestsBloqueados++;
    this.estadisticas.amenazasDetectadas += resultado.amenazasDetectadas.length;
    this.estadisticas.erroresValidacion++;

    // Notificar sobre la amenaza detectada
    if (this.configuracion.notificarErrores && resultado.amenazasDetectadas.length > 0) {
      this.notificarAmenazaDetectada(request, resultado);
    }

    // Crear error apropiado
    const error = new HttpErrorResponse({
      error: {
        mensaje: 'Petición bloqueada por validación de seguridad',
        errores: resultado.errores,
        amenazas: resultado.amenazasDetectadas,
        timestamp: new Date().toISOString()
      },
      status: 400,
      statusText: 'Bad Request - Validation Failed',
      url: request.url
    });

    console.warn('🚫 Petición bloqueada por validación:', {
      url: request.url,
      metodo: request.method,
      errores: resultado.errores,
      amenazas: resultado.amenazasDetectadas
    });

    return throwError(error);
  }

  /**
   * Maneja errores HTTP
   * @private
   */
  private manejarErrorHttp(
    error: HttpErrorResponse,
    request: HttpRequest<any>,
    tiempoInicio: number
  ): Observable<never> {
    const tiempoValidacion = Date.now() - tiempoInicio;

    // Registrar log del error
    this.registrarLogOperacion({
      timestamp: new Date(),
      metodo: request.method,
      url: request.url,
      tipo: 'error',
      validacionExitosa: false,
      amenazasDetectadas: [],
      errores: [error.message || 'Error HTTP'],
      tiempoValidacion,
      tamanoDatos: this.calcularTamanoDatos(request.body)
    });

    // Notificar error crítico si es necesario
    if (this.configuracion.notificarErrores && error.status >= 500) {
      this.notificacionesService.notificarError(
        `Error del servidor: ${error.status}`,
        error
      );
    }

    return throwError(error);
  }

  /**
   * Maneja errores del interceptor
   * @private
   */
  private manejarErrorInterceptor(
    error: any,
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    console.error('❌ Error crítico en interceptor de validación:', error);

    // En caso de error del interceptor, continuar sin validación
    if (this.configuracion.notificarErrores) {
      this.notificacionesService.notificarError(
        'Error en sistema de validación',
        error
      );
    }

    return next.handle(request);
  }

  /**
   * Notifica amenaza detectada
   * @private
   */
  private notificarAmenazaDetectada(
    request: HttpRequest<any>,
    resultado: ResultadoValidacionRequest
  ): void {
    try {
      const titulo = '🚨 Amenaza de Seguridad Detectada';
      const mensaje = `Se detectaron amenazas en petición ${request.method} ${request.url}: ${resultado.amenazasDetectadas.join(', ')}`;

      this.notificacionesService.enviarNotificacion(
        TipoNotificacion.ERROR_SISTEMA,
        titulo,
        mensaje,
        {
          prioridad: PrioridadNotificacion.ALTA,
          persistente: true,
          datos: {
            url: request.url,
            metodo: request.method,
            amenazas: resultado.amenazasDetectadas,
            errores: resultado.errores
          }
        }
      );
    } catch (error) {
      console.error('Error notificando amenaza:', error);
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Verifica si una ruta requiere validación
   * @private
   */
  private requiereValidacion(request: HttpRequest<any>): boolean {
    // Solo validar rutas específicas o peticiones con body
    const esRutaEspecial = RUTAS_VALIDACION_ESPECIAL.some(ruta => request.url.includes(ruta));
    const tieneBody = request.body !== null && request.body !== undefined;
    const metodoRequiereValidacion = ['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase());

    return esRutaEspecial || (tieneBody && metodoRequiereValidacion);
  }

  /**
   * Verifica si un User-Agent es sospechoso
   * @private
   */
  private esUserAgentSospechoso(userAgent: string): boolean {
    const patronesSospechosos = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /curl/i,
      /wget/i,
      /python/i,
      /script/i
    ];

    return patronesSospechosos.some(patron => patron.test(userAgent));
  }

  /**
   * Verifica si una URL contiene patrones sospechosos
   * @private
   */
  private contienePatronSospechoso(url: string): boolean {
    const patronesSospechosos = [
      /\.\.\//, // Directory traversal
      /%2e%2e%2f/i, // Encoded directory traversal
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /exec\(/i,
      /eval\(/i
    ];

    return patronesSospechosos.some(patron => patron.test(url));
  }

  /**
   * Calcula el tamaño de datos
   * @private
   */
  private calcularTamanoDatos(datos: any): number {
    try {
      if (!datos) return 0;
      
      const datosString = typeof datos === 'string' ? datos : JSON.stringify(datos);
      return new Blob([datosString]).size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Registra log de operación
   * @private
   */
  private registrarLogOperacion(log: LogOperacion): void {
    try {
      // Agregar al inicio del array
      this.logsOperaciones.unshift(log);

      // Mantener solo los últimos logs
      if (this.logsOperaciones.length > this.MAX_LOGS) {
        this.logsOperaciones = this.logsOperaciones.slice(0, this.MAX_LOGS);
      }

      // Log crítico para amenazas detectadas
      if (log.amenazasDetectadas.length > 0) {
        console.warn('🚨 Amenazas detectadas en interceptor:', log);
      }

    } catch (error) {
      console.error('Error registrando log de operación:', error);
    }
  }

// ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Actualiza la configuración del interceptor
   * @param nuevaConfiguracion Nueva configuración a aplicar
   */
  public actualizarConfiguracion(nuevaConfiguracion: Partial<ConfiguracionInterceptor>): void {
    try {
      this.configuracion = { ...this.configuracion, ...nuevaConfiguracion };
      console.log('⚙️ Configuración del interceptor actualizada:', this.configuracion);
    } catch (error) {
      console.error('Error actualizando configuración del interceptor:', error);
    }
  }

  /**
   * Obtiene la configuración actual del interceptor
   * @returns ConfiguracionInterceptor Configuración actual
   */
  public obtenerConfiguracion(): ConfiguracionInterceptor {
    return { ...this.configuracion };
  }

  /**
   * Obtiene estadísticas del interceptor
   * @returns object Estadísticas actuales
   */
  public obtenerEstadisticas(): object {
    try {
      const promedioTiempoValidacion = this.estadisticas.requestsValidados > 0 
        ? this.estadisticas.tiempoTotalValidacion / this.estadisticas.requestsValidados
        : 0;

      return {
        totalRequests: this.estadisticas.totalRequests,
        requestsValidados: this.estadisticas.requestsValidados,
        requestsBloqueados: this.estadisticas.requestsBloqueados,
        amenazasDetectadas: this.estadisticas.amenazasDetectadas,
        erroresValidacion: this.estadisticas.erroresValidacion,
        tasaValidacion: this.estadisticas.totalRequests > 0 
          ? ((this.estadisticas.requestsValidados / this.estadisticas.totalRequests) * 100).toFixed(2) + '%'
          : '0%',
        tasaBloqueo: this.estadisticas.totalRequests > 0 
          ? ((this.estadisticas.requestsBloqueados / this.estadisticas.totalRequests) * 100).toFixed(2) + '%'
          : '0%',
        promedioTiempoValidacion: Math.round(promedioTiempoValidacion),
        logsEnMemoria: this.logsOperaciones.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas del interceptor:', error);
      return {
        error: 'Error calculando estadísticas',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Obtiene logs de operaciones recientes
   * @param limite Número máximo de logs a retornar
   * @param filtros Filtros opcionales
   * @returns LogOperacion[] Lista de logs
   */
  public obtenerLogs(
    limite: number = 50,
    filtros?: {
      tipo?: 'request' | 'response' | 'error';
      soloAmenazas?: boolean;
      fechaDesde?: Date;
      url?: string;
    }
  ): LogOperacion[] {
    try {
      let logs = [...this.logsOperaciones];

      // Aplicar filtros
      if (filtros) {
        if (filtros.tipo) {
          logs = logs.filter(log => log.tipo === filtros.tipo);
        }

        if (filtros.soloAmenazas) {
          logs = logs.filter(log => log.amenazasDetectadas.length > 0);
        }

        if (filtros.fechaDesde) {
          logs = logs.filter(log => log.timestamp >= filtros.fechaDesde!);
        }

        if (filtros.url) {
          logs = logs.filter(log => log.url.includes(filtros.url!));
        }
      }

      // Ordenar por timestamp descendente (más recientes primero)
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return logs.slice(0, limite);
    } catch (error) {
      console.error('Error obteniendo logs del interceptor:', error);
      return [];
    }
  }

  /**
   * Obtiene resumen de amenazas detectadas
   * @param periodoHoras Período en horas para el análisis
   * @returns object Resumen de amenazas
   */
  public obtenerResumenAmenazas(periodoHoras: number = 24): object {
    try {
      const fechaLimite = new Date();
      fechaLimite.setHours(fechaLimite.getHours() - periodoHoras);

      const logsRecientes = this.logsOperaciones.filter(
        log => log.timestamp >= fechaLimite
      );

      const amenazasPorTipo: Record<string, number> = {};
      const urlsConAmenazas: Record<string, number> = {};
      let totalAmenazas = 0;

      logsRecientes.forEach(log => {
        if (log.amenazasDetectadas.length > 0) {
          totalAmenazas += log.amenazasDetectadas.length;

          // Contar por tipo de amenaza
          log.amenazasDetectadas.forEach(amenaza => {
            amenazasPorTipo[amenaza] = (amenazasPorTipo[amenaza] || 0) + 1;
          });

          // Contar por URL
          urlsConAmenazas[log.url] = (urlsConAmenazas[log.url] || 0) + 1;
        }
      });

      return {
        periodoAnalizado: `${periodoHoras} horas`,
        totalOperaciones: logsRecientes.length,
        totalAmenazas,
        operacionesConAmenazas: Object.keys(urlsConAmenazas).length,
        amenazasPorTipo,
        urlsMasAfectadas: Object.entries(urlsConAmenazas)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([url, count]) => ({ url, amenazas: count })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error obteniendo resumen de amenazas:', error);
      return {
        error: 'Error calculando resumen de amenazas',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Limpia logs antiguos
   * @param diasAntiguedad Días de antigüedad para limpiar logs
   * @returns number Número de logs eliminados
   */
  public limpiarLogsAntiguos(diasAntiguedad: number = 7): number {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

      const logsAntiguos = this.logsOperaciones.length;
      this.logsOperaciones = this.logsOperaciones.filter(
        log => log.timestamp >= fechaLimite
      );

      const logsEliminados = logsAntiguos - this.logsOperaciones.length;
      
      if (logsEliminados > 0) {
        console.log(`🧹 ${logsEliminados} logs antiguos eliminados del interceptor`);
      }

      return logsEliminados;
    } catch (error) {
      console.error('Error limpiando logs antiguos:', error);
      return 0;
    }
  }

  /**
   * Reinicia estadísticas del interceptor
   */
  public reiniciarEstadisticas(): void {
    try {
      this.estadisticas = {
        totalRequests: 0,
        requestsValidados: 0,
        requestsBloqueados: 0,
        amenazasDetectadas: 0,
        erroresValidacion: 0,
        tiempoTotalValidacion: 0
      };

      console.log('🔄 Estadísticas del interceptor reiniciadas');
    } catch (error) {
      console.error('Error reiniciando estadísticas:', error);
    }
  }

  /**
   * Exporta logs para análisis externo
   * @param formato Formato de exportación
   * @param filtros Filtros opcionales
   * @returns string Logs en formato solicitado
   */
  public exportarLogs(
    formato: 'json' | 'csv' = 'json',
    filtros?: {
      fechaDesde?: Date;
      fechaHasta?: Date;
      soloAmenazas?: boolean;
    }
  ): string {
    try {
      let logs = [...this.logsOperaciones];

      // Aplicar filtros
      if (filtros) {
        if (filtros.fechaDesde) {
          logs = logs.filter(log => log.timestamp >= filtros.fechaDesde!);
        }

        if (filtros.fechaHasta) {
          logs = logs.filter(log => log.timestamp <= filtros.fechaHasta!);
        }

        if (filtros.soloAmenazas) {
          logs = logs.filter(log => log.amenazasDetectadas.length > 0);
        }
      }

      // Formatear según el tipo solicitado
      if (formato === 'csv') {
        return this.convertirLogsACSV(logs);
      } else {
        return JSON.stringify({
          metadatos: {
            totalLogs: logs.length,
            fechaExportacion: new Date().toISOString(),
            filtrosAplicados: filtros || 'ninguno'
          },
          logs
        }, null, 2);
      }
    } catch (error) {
      console.error('Error exportando logs:', error);
      return JSON.stringify({ error: 'Error exportando logs' });
    }
  }

  /**
   * Convierte logs a formato CSV
   * @private
   */
  private convertirLogsACSV(logs: LogOperacion[]): string {
    try {
      const encabezados = [
        'Timestamp',
        'Método',
        'URL',
        'Tipo',
        'Validación Exitosa',
        'Amenazas Detectadas',
        'Errores',
        'Tiempo Validación (ms)',
        'Tamaño Datos (bytes)'
      ];

      let csv = encabezados.join(',') + '\n';

      logs.forEach(log => {
        const fila = [
          log.timestamp.toISOString(),
          log.metodo,
          `"${log.url}"`,
          log.tipo,
          log.validacionExitosa,
          `"${log.amenazasDetectadas.join('; ')}"`,
          `"${log.errores.join('; ')}"`,
          log.tiempoValidacion,
          log.tamanoDatos
        ];

        csv += fila.join(',') + '\n';
      });

      return csv;
    } catch (error) {
      console.error('Error convirtiendo logs a CSV:', error);
      return 'Error,al,convertir,logs\n';
    }
  }

  /**
   * Valida configuración del interceptor
   * @returns object Resultado de la validación
   */
  public validarConfiguracion(): object {
    try {
      const errores: string[] = [];
      const advertencias: string[] = [];

      // Validar configuración básica
      if (!this.configuracion) {
        errores.push('Configuración del interceptor no definida');
        return { valido: false, errores, advertencias };
      }

      // Validar límites
      if (this.MAX_LOGS < 100) {
        advertencias.push('Límite de logs muy bajo, podría afectar el análisis');
      }

      if (this.MAX_LOGS > 10000) {
        advertencias.push('Límite de logs muy alto, podría afectar el rendimiento');
      }

      // Validar estado de los logs
      if (this.logsOperaciones.length === 0) {
        advertencias.push('No hay logs registrados aún');
      }

      // Validar configuración de seguridad
      if (!this.configuracion.verificarSeguridad) {
        advertencias.push('Verificación de seguridad deshabilitada');
      }

      if (!this.configuracion.bloquearAmenazas) {
        advertencias.push('Bloqueo de amenazas deshabilitado');
      }

      return {
        valido: errores.length === 0,
        errores,
        advertencias,
        configuracionActual: this.configuracion,
        estadisticas: this.obtenerEstadisticas()
      };
    } catch (error) {
      console.error('Error validando configuración del interceptor:', error);
      return {
        valido: false,
        errores: ['Error interno validando configuración'],
        advertencias: []
      };
    }
  }

  /**
   * Prueba el interceptor con datos simulados
   * @param datosPrueba Datos para la prueba
   * @returns object Resultado de la prueba
   */
  public probarInterceptor(datosPrueba: {
    url: string;
    metodo: string;
    body?: any;
    headers?: any;
  }): object {
    try {
      console.log('🧪 Iniciando prueba del interceptor...');

      // Simular validación de URL
      const validacionUrl = this.validarUrl(datosPrueba.url);
      
      // Simular validación de body si existe
      let validacionBody: { valido: boolean; errores: string[]; amenazas: string[] } = { valido: true, errores: [], amenazas: [] };
      if (datosPrueba.body) {
        validacionBody = this.validarBody(datosPrueba.body, datosPrueba.metodo);
      }

      // Simular validación de headers si existen
      let validacionHeaders: { valido: boolean; errores: string[]; amenazas: string[] } = { valido: true, errores: [], amenazas: [] };
      if (datosPrueba.headers) {
        validacionHeaders = this.validarHeaders(datosPrueba.headers);
      }

      const resultado = {
        url: {
          valido: validacionUrl.valido,
          errores: validacionUrl.errores,
          amenazas: validacionUrl.amenazas
        },
        body: {
          valido: validacionBody.valido,
          errores: validacionBody.errores,
          amenazas: validacionBody.amenazas
        },
        headers: {
          valido: validacionHeaders.valido,
          errores: validacionHeaders.errores,
          amenazas: validacionHeaders.amenazas
        },
        resumen: {
          validacionGeneral: validacionUrl.valido && validacionBody.valido && validacionHeaders.valido,
          totalAmenazas: validacionUrl.amenazas.length + validacionBody.amenazas.length + validacionHeaders.amenazas.length,
          totalErrores: validacionUrl.errores.length + validacionBody.errores.length + validacionHeaders.errores.length,
          accionRecomendada: this.determinarAccionRecomendada(validacionUrl, validacionBody, validacionHeaders)
        },
        timestamp: new Date().toISOString()
      };

      console.log('✅ Prueba del interceptor completada:', resultado.resumen);
      return resultado;
    } catch (error) {
      console.error('Error probando interceptor:', error);
      return {
        error: 'Error durante la prueba del interceptor',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Determina acción recomendada basada en validaciones
   * @private
   */
  private determinarAccionRecomendada(
    validacionUrl: any,
    validacionBody: any,
    validacionHeaders: any
  ): string {
    const totalAmenazas = validacionUrl.amenazas.length + validacionBody.amenazas.length + validacionHeaders.amenazas.length;
    const totalErrores = validacionUrl.errores.length + validacionBody.errores.length + validacionHeaders.errores.length;

    if (totalAmenazas > 0) {
      return 'BLOQUEAR - Amenazas de seguridad detectadas';
    }

    if (totalErrores > 0) {
      return 'SANITIZAR - Errores de validación que pueden ser corregidos';
    }

    return 'PERMITIR - Validación exitosa';
  }

  /**
   * Optimiza el rendimiento del interceptor
   */
  public optimizarRendimiento(): void {
    try {
      console.log('⚡ Optimizando rendimiento del interceptor...');

      // Limpiar logs antiguos automáticamente
      const logsEliminados = this.limpiarLogsAntiguos(7);

      // Ajustar configuración según estadísticas
      if (this.estadisticas.requestsBloqueados > this.estadisticas.requestsValidados * 0.1) {
        console.warn('⚠️ Alta tasa de bloqueo detectada - revisar configuración');
      }

      if (this.estadisticas.tiempoTotalValidacion / this.estadisticas.requestsValidados > 1000) {
        console.warn('⚠️ Tiempo de validación alto - considerar optimizaciones');
      }

      console.log(`✅ Optimización completada - ${logsEliminados} logs eliminados`);
    } catch (error) {
      console.error('Error optimizando rendimiento:', error);
    }
  }

  /**
   * Obtiene información de debug del interceptor
   * @returns object Información de debug completa
   */
  public obtenerInfoDebug(): object {
    try {
      return {
        configuracion: this.configuracion,
        estadisticas: this.obtenerEstadisticas(),
        resumenAmenazas: this.obtenerResumenAmenazas(24),
        validacionConfiguracion: this.validarConfiguracion(),
        logsRecientes: this.obtenerLogs(10),
        memoriaUtilizada: {
          logs: this.logsOperaciones.length,
          maxLogs: this.MAX_LOGS,
          porcentajeUso: ((this.logsOperaciones.length / this.MAX_LOGS) * 100).toFixed(2) + '%'
        },
        ultimaOperacion: this.logsOperaciones.length > 0 ? this.logsOperaciones[0] : null,
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
   * Destruye el interceptor y limpia recursos
   */
  public destruir(): void {
    try {
      // Limpiar logs
      this.logsOperaciones = [];

      // Reiniciar estadísticas
      this.reiniciarEstadisticas();

      // Resetear configuración
      this.configuracion = {
        validarRequest: false,
        validarResponse: false,
        sanitizarDatos: false,
        verificarSeguridad: false,
        logearOperaciones: false,
        bloquearAmenazas: false,
        notificarErrores: false
      };

      console.log('🧹 Interceptor de validación destruido');
    } catch (error) {
      console.error('Error destruyendo interceptor:', error);
    }
  }
}