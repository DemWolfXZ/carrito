/**
 * Servicio de Exportación e Importación de Datos
 * 
 * Maneja la exportación de datos a diferentes formatos (JSON, CSV, Excel, PDF)
 * y la importación desde respaldos. Incluye validación y transformación de datos.
 * 
 * @author Tu Nombre
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { SesionCompra } from '../models/sesion-compra.model';
import { Usuario } from '../models/usuario.model';
import { Configuracion, FormatoExportacion } from '../models/configuracion.model';
import { AlmacenamientoService } from './almacenamiento.service';
import { SeguridadService } from './seguridad.service';

/**
 * Interfaz para opciones de exportación
 */
interface OpcionesExportacion {
  formato: FormatoExportacion;
  incluirMetadatos: boolean;
  incluirUsuario: boolean;
  incluirConfiguracion: boolean;
  incluirSesiones: boolean;
  filtroFechas?: {
    desde: string;
    hasta: string;
  };
  comprimirDatos: boolean;
  encriptarDatos: boolean;
  claveEncriptacion?: string;
}

/**
 * Interfaz para resultado de exportación
 */
interface ResultadoExportacion {
  exito: boolean;
  contenido?: string | Blob;
  nombreArchivo: string;
  tamanoBytes: number;
  formato: FormatoExportacion;
  checksum?: string;
  error?: string;
  advertencias: string[];
  timestamp: Date;
}

/**
 * Interfaz para resultado de importación
 */
interface ResultadoImportacion {
  exito: boolean;
  datosImportados?: any;
  estadisticas: {
    usuariosImportados: number;
    sesionesImportadas: number;
    configuracionesImportadas: number;
    erroresEncontrados: number;
  };
  errores: string[];
  advertencias: string[];
  timestamp: Date;
}

/**
 * Interfaz para metadatos de exportación
 */
interface MetadatosExportacion {
  aplicacion: string;
  version: string;
  timestamp: Date;
  formato: FormatoExportacion;
  totalRegistros: number;
  checksum: string;
  configuracionExportacion: OpcionesExportacion;
  dispositivoOrigen?: {
    userAgent: string;
    plataforma: string;
    idioma: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ExportacionService {

  // Configuraciones del servicio
  private readonly VERSION_EXPORTACION = '1.0.0';
  private readonly APLICACION = 'Carrito';
  private readonly MAX_TAMANO_ARCHIVO = 50 * 1024 * 1024; // 50MB

  // Formatos MIME para diferentes tipos de archivo
  private readonly TIPOS_MIME = {
    [FormatoExportacion.JSON]: 'application/json',
    [FormatoExportacion.CSV]: 'text/csv',
    [FormatoExportacion.EXCEL]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    [FormatoExportacion.PDF]: 'application/pdf'
  };

  constructor(
    private almacenamientoService: AlmacenamientoService,
    private seguridadService: SeguridadService
  ) {
    console.log('📤 Servicio de exportación inicializado');
  }

  // ==================== EXPORTACIÓN PRINCIPAL ====================

  /**
   * Exporta datos según las opciones especificadas
   * @param opciones Configuración de exportación
   * @returns Observable<ResultadoExportacion> Resultado de la exportación
   */
  public exportarDatos(opciones: OpcionesExportacion): Observable<ResultadoExportacion> {
    return new Observable(observer => {
      this.ejecutarExportacion(opciones).then(resultado => {
        observer.next(resultado);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Exporta respaldo completo del sistema
   * @param incluirTodo Si debe incluir todos los datos
   * @param encriptar Si debe encriptar el respaldo
   * @returns Observable<ResultadoExportacion> Resultado del respaldo
   */
  public crearRespaldoCompleto(incluirTodo: boolean = true, encriptar: boolean = false): Observable<ResultadoExportacion> {
    const opciones: OpcionesExportacion = {
      formato: FormatoExportacion.JSON,
      incluirMetadatos: true,
      incluirUsuario: incluirTodo,
      incluirConfiguracion: incluirTodo,
      incluirSesiones: incluirTodo,
      comprimirDatos: true,
      encriptarDatos: encriptar,
      claveEncriptacion: encriptar ? this.generarClaveEncriptacion() : undefined
    };

    return this.exportarDatos(opciones);
  }

  /**
   * Exporta solo las sesiones en formato CSV para análisis
   * @param filtroFechas Rango de fechas opcional
   * @returns Observable<ResultadoExportacion> Resultado de la exportación
   */
  public exportarSesionesCSV(filtroFechas?: { desde: string; hasta: string }): Observable<ResultadoExportacion> {
    const opciones: OpcionesExportacion = {
      formato: FormatoExportacion.CSV,
      incluirMetadatos: false,
      incluirUsuario: false,
      incluirConfiguracion: false,
      incluirSesiones: true,
      filtroFechas,
      comprimirDatos: false,
      encriptarDatos: false
    };

    return this.exportarDatos(opciones);
  }

  /**
   * Exporta reporte en PDF (implementación futura)
   * @param tipoReporte Tipo de reporte a generar
   * @param parametros Parámetros del reporte
   * @returns Observable<ResultadoExportacion> Resultado del reporte
   */
  public exportarReportePDF(
    tipoReporte: 'resumen' | 'detallado' | 'estadisticas',
    parametros?: any
  ): Observable<ResultadoExportacion> {
    // Implementación futura para generación de PDFs
    return throwError(new Error('Exportación a PDF no implementada aún'));
  }

  // ==================== IMPORTACIÓN ====================

  /**
   * Importa datos desde un archivo de respaldo
   * @param contenidoArchivo Contenido del archivo a importar
   * @param validarIntegridad Si debe validar integridad de datos
   * @param sobrescribirExistentes Si debe sobrescribir datos existentes
   * @returns Observable<ResultadoImportacion> Resultado de la importación
   */
  public importarDatos(
    contenidoArchivo: string,
    validarIntegridad: boolean = true,
    sobrescribirExistentes: boolean = false
  ): Observable<ResultadoImportacion> {
    return new Observable(observer => {
      this.ejecutarImportacion(contenidoArchivo, validarIntegridad, sobrescribirExistentes)
        .then(resultado => {
          observer.next(resultado);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Valida archivo de importación sin importar datos
   * @param contenidoArchivo Contenido del archivo
   * @returns Observable<any> Resultado de la validación
   */
  public validarArchivoImportacion(contenidoArchivo: string): Observable<any> {
    return new Observable(observer => {
      try {
        // Validar que es JSON válido
        const validacionJSON = this.seguridadService.validarIntegridadJSON(contenidoArchivo);
        
        if (!validacionJSON.valido) {
          observer.next({
            valido: false,
            errores: validacionJSON.errores,
            advertencias: validacionJSON.advertencias
          });
          observer.complete();
          return;
        }

        const datos = validacionJSON.valorSanitizado;

        // Validar estructura de respaldo
        const validacionEstructura = this.validarEstructuraRespaldo(datos);

        observer.next(validacionEstructura);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  // ==================== MÉTODOS PRIVADOS DE EXPORTACIÓN ====================

  /**
   * Ejecuta el proceso de exportación
   * @private
   */
  private async ejecutarExportacion(opciones: OpcionesExportacion): Promise<ResultadoExportacion> {
    try {
      console.log('📤 Iniciando exportación con formato:', opciones.formato);

      // Recopilar datos según opciones
      const datosRecopilados = await this.recopilarDatosExportacion(opciones);

      // Generar metadatos
      const metadatos = this.generarMetadatos(opciones, datosRecopilados);

      // Procesar datos según formato
      let contenido: string | Blob;
      let nombreArchivo: string;

      switch (opciones.formato) {
        case FormatoExportacion.JSON:
          ({ contenido, nombreArchivo } = await this.procesarExportacionJSON(datosRecopilados, metadatos, opciones));
          break;
        case FormatoExportacion.CSV:
          ({ contenido, nombreArchivo } = await this.procesarExportacionCSV(datosRecopilados, opciones));
          break;
        case FormatoExportacion.EXCEL:
          ({ contenido, nombreArchivo } = await this.procesarExportacionExcel(datosRecopilados, opciones));
          break;
        case FormatoExportacion.PDF:
          ({ contenido, nombreArchivo } = await this.procesarExportacionPDF(datosRecopilados, opciones));
          break;
        default:
          throw new Error(`Formato de exportación no soportado: ${opciones.formato}`);
      }

      // Calcular checksum
      const checksum = typeof contenido === 'string' 
        ? this.seguridadService.generarHashIntegridad(contenido)
        : 'blob_checksum';

      // Verificar tamaño del archivo
      const tamanoBytes = typeof contenido === 'string' 
        ? new Blob([contenido]).size
        : contenido.size;

      if (tamanoBytes > this.MAX_TAMANO_ARCHIVO) {
        throw new Error(`El archivo generado excede el tamaño máximo permitido (${this.MAX_TAMANO_ARCHIVO} bytes)`);
      }

      const resultado: ResultadoExportacion = {
        exito: true,
        contenido,
        nombreArchivo,
        tamanoBytes,
        formato: opciones.formato,
        checksum,
        advertencias: [],
        timestamp: new Date()
      };

      console.log('✅ Exportación completada exitosamente:', nombreArchivo);
      return resultado;

    } catch (error) {
      console.error('❌ Error durante exportación:', error);
      return {
        exito: false,
        nombreArchivo: 'export_error',
        tamanoBytes: 0,
        formato: opciones.formato,
        error: error instanceof Error ? error.message : 'Error desconocido',
        advertencias: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * Recopila datos para exportación según opciones
   * @private
   */
  private async recopilarDatosExportacion(opciones: OpcionesExportacion): Promise<any> {
    const datos: any = {};

    try {
      // Recopilar usuario si se solicita
      if (opciones.incluirUsuario) {
        const usuario = await this.almacenamientoService.obtenerUsuario().toPromise();
        if (usuario) {
          datos.usuario = JSON.parse(usuario.toJSON());
        }
      }

      // Recopilar configuración si se solicita
      if (opciones.incluirConfiguracion) {
        const configuracion = await this.almacenamientoService.obtenerConfiguracion().toPromise();
        if (configuracion) {
          datos.configuracion = configuracion.exportar();
        }
      }

// Recopilar sesiones si se solicita
      if (opciones.incluirSesiones) {
        let sesiones = await this.almacenamientoService.obtenerSesiones().toPromise();
        
        if (sesiones) {
          // Aplicar filtro de fechas si se especifica
          if (opciones.filtroFechas) {
            sesiones = sesiones.filter(sesion => {
              return sesion.fecha >= opciones.filtroFechas!.desde && 
                     sesion.fecha <= opciones.filtroFechas!.hasta;
            });
          }

          datos.sesiones = sesiones.map(sesion => JSON.parse(sesion.toJSON()));
        }
      }

      return datos;
    } catch (error) {
      console.error('Error recopilando datos para exportación:', error);
      throw new Error('Error recopilando datos: ' + error);
    }
  }

  /**
   * Genera metadatos para la exportación
   * @private
   */
  private generarMetadatos(opciones: OpcionesExportacion, datos: any): MetadatosExportacion {
    try {
      const totalRegistros = (datos.sesiones?.length || 0) + 
                           (datos.usuario ? 1 : 0) + 
                           (datos.configuracion ? 1 : 0);

      const datosParaChecksum = JSON.stringify(datos);
      const checksum = this.seguridadService.generarHashIntegridad(datosParaChecksum);

      return {
        aplicacion: this.APLICACION,
        version: this.VERSION_EXPORTACION,
        timestamp: new Date(),
        formato: opciones.formato,
        totalRegistros,
        checksum,
        configuracionExportacion: opciones,
        dispositivoOrigen: {
          userAgent: navigator.userAgent,
          plataforma: navigator.platform,
          idioma: navigator.language
        }
      };
    } catch (error) {
      console.error('Error generando metadatos:', error);
      throw new Error('Error generando metadatos de exportación');
    }
  }

  /**
   * Procesa exportación a formato JSON
   * @private
   */
  private async procesarExportacionJSON(
    datos: any, 
    metadatos: MetadatosExportacion, 
    opciones: OpcionesExportacion
  ): Promise<{ contenido: string; nombreArchivo: string }> {
    try {
      const exportacion = {
        metadatos: opciones.incluirMetadatos ? metadatos : undefined,
        datos
      };

      let contenido = JSON.stringify(exportacion, null, opciones.comprimirDatos ? 0 : 2);

      // Encriptar si se solicita
      if (opciones.encriptarDatos && opciones.claveEncriptacion) {
        contenido = this.seguridadService.encriptarDatos(contenido, opciones.claveEncriptacion);
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const nombreArchivo = `carrito_backup_${timestamp}.json`;

      return { contenido, nombreArchivo };
    } catch (error) {
      console.error('Error procesando exportación JSON:', error);
      throw new Error('Error generando archivo JSON');
    }
  }

  /**
   * Procesa exportación a formato CSV
   * @private
   */
  private async procesarExportacionCSV(
    datos: any, 
    opciones: OpcionesExportacion
  ): Promise<{ contenido: string; nombreArchivo: string }> {
    try {
      let contenido = '';

      // Exportar sesiones a CSV
      if (datos.sesiones && datos.sesiones.length > 0) {
        contenido += this.generarCSVSesiones(datos.sesiones);
      }

      // Exportar productos a CSV (todas las sesiones)
      if (datos.sesiones && datos.sesiones.length > 0) {
        contenido += '\n\n' + this.generarCSVProductos(datos.sesiones);
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const nombreArchivo = `carrito_datos_${timestamp}.csv`;

      return { contenido, nombreArchivo };
    } catch (error) {
      console.error('Error procesando exportación CSV:', error);
      throw new Error('Error generando archivo CSV');
    }
  }

  /**
   * Procesa exportación a formato Excel
   * @private
   */
  private async procesarExportacionExcel(
    datos: any, 
    opciones: OpcionesExportacion
  ): Promise<{ contenido: Blob; nombreArchivo: string }> {
    try {
      // Implementación básica - en producción usar librerías como SheetJS
      const csvContent = await this.procesarExportacionCSV(datos, opciones);
      const blob = new Blob([csvContent.contenido], { type: this.TIPOS_MIME[FormatoExportacion.CSV] });

      const timestamp = new Date().toISOString().split('T')[0];
      const nombreArchivo = `carrito_datos_${timestamp}.xlsx`;

      return { contenido: blob, nombreArchivo };
    } catch (error) {
      console.error('Error procesando exportación Excel:', error);
      throw new Error('Error generando archivo Excel');
    }
  }

  /**
   * Procesa exportación a formato PDF
   * @private
   */
  private async procesarExportacionPDF(
    datos: any, 
    opciones: OpcionesExportacion
  ): Promise<{ contenido: Blob; nombreArchivo: string }> {
    try {
      // Implementación futura para PDFs
      throw new Error('Exportación a PDF no implementada');
    } catch (error) {
      console.error('Error procesando exportación PDF:', error);
      throw new Error('Error generando archivo PDF');
    }
  }

  /**
   * Genera CSV de sesiones
   * @private
   */
  private generarCSVSesiones(sesiones: any[]): string {
    try {
      const encabezados = [
        'ID',
        'Supermercado',
        'Fecha',
        'Hora Inicio',
        'Hora Fin',
        'Total General',
        'Cantidad Productos',
        'Completada',
        'Presupuesto Estimado',
        'Método Pago',
        'Descuentos',
        'Impuestos',
        'Notas'
      ];

      let csv = 'SESIONES DE COMPRA\n';
      csv += encabezados.join(',') + '\n';

      for (const sesion of sesiones) {
        const fila = [
          this.escaparCSV(sesion.id),
          this.escaparCSV(sesion.nombreSupermercado),
          this.escaparCSV(sesion.fecha),
          this.escaparCSV(sesion.horaInicio),
          this.escaparCSV(sesion.horaFin || ''),
          sesion.totalGeneral.toString(),
          sesion.productos.length.toString(),
          sesion.completada ? 'Sí' : 'No',
          (sesion.presupuestoEstimado || '').toString(),
          this.escaparCSV(sesion.metodoPago || ''),
          (sesion.descuentos || 0).toString(),
          (sesion.impuestos || 0).toString(),
          this.escaparCSV(sesion.notas || '')
        ];

        csv += fila.join(',') + '\n';
      }

      return csv;
    } catch (error) {
      console.error('Error generando CSV de sesiones:', error);
      throw new Error('Error generando CSV de sesiones');
    }
  }

  /**
   * Genera CSV de productos de todas las sesiones
   * @private
   */
  private generarCSVProductos(sesiones: any[]): string {
    try {
      const encabezados = [
        'ID Sesión',
        'Supermercado',
        'Fecha Sesión',
        'ID Producto',
        'Nombre Producto',
        'Precio Unitario',
        'Cantidad',
        'Total Producto',
        'Categoría',
        'Notas Producto'
      ];

      let csv = 'PRODUCTOS POR SESIÓN\n';
      csv += encabezados.join(',') + '\n';

      for (const sesion of sesiones) {
        for (const producto of sesion.productos) {
          const fila = [
            this.escaparCSV(sesion.id),
            this.escaparCSV(sesion.nombreSupermercado),
            this.escaparCSV(sesion.fecha),
            this.escaparCSV(producto.id),
            this.escaparCSV(producto.nombre),
            producto.precioUnitario.toString(),
            producto.cantidad.toString(),
            producto.total.toString(),
            this.escaparCSV(producto.categoria || ''),
            this.escaparCSV(producto.notas || '')
          ];

          csv += fila.join(',') + '\n';
        }
      }

      return csv;
    } catch (error) {
      console.error('Error generando CSV de productos:', error);
      throw new Error('Error generando CSV de productos');
    }
  }

  /**
   * Escapa caracteres especiales para CSV
   * @private
   */
  private escaparCSV(valor: string): string {
    if (!valor) return '';
    
    // Convertir a string y escapar comillas
    const valorString = valor.toString().replace(/"/g, '""');
    
    // Encerrar entre comillas si contiene caracteres especiales
    if (valorString.includes(',') || valorString.includes('\n') || valorString.includes('"')) {
      return `"${valorString}"`;
    }
    
    return valorString;
  }

  // ==================== MÉTODOS PRIVADOS DE IMPORTACIÓN ====================

  /**
   * Ejecuta el proceso de importación
   * @private
   */
  private async ejecutarImportacion(
    contenidoArchivo: string,
    validarIntegridad: boolean,
    sobrescribirExistentes: boolean
  ): Promise<ResultadoImportacion> {
    try {
      console.log('📥 Iniciando importación de datos...');

      const errores: string[] = [];
      const advertencias: string[] = [];
      const estadisticas = {
        usuariosImportados: 0,
        sesionesImportadas: 0,
        configuracionesImportadas: 0,
        erroresEncontrados: 0
      };

      // Validar archivo antes de importar
      if (validarIntegridad) {
        const validacion = await this.validarArchivoImportacion(contenidoArchivo).toPromise();
        if (!validacion.valido) {
          errores.push(...validacion.errores);
          estadisticas.erroresEncontrados += validacion.errores.length;
        }
        advertencias.push(...validacion.advertencias);
      }

      // Parsear datos
      let datos: any;
      try {
        datos = JSON.parse(contenidoArchivo);
      } catch (parseError) {
        throw new Error('Archivo no contiene JSON válido');
      }

      // Verificar si es un respaldo encriptado
      if (this.esRespaldoEncriptado(datos)) {
        throw new Error('Archivo encriptado - funcionalidad de desencriptación no implementada');
      }

      // Extraer datos del respaldo
      const datosRespaldo = datos.datos || datos;

      // Importar usuario
      if (datosRespaldo.usuario) {
        try {
          await this.importarUsuario(datosRespaldo.usuario, sobrescribirExistentes);
          estadisticas.usuariosImportados = 1;
        } catch (error) {
          errores.push(`Error importando usuario: ${error}`);
          estadisticas.erroresEncontrados++;
        }
      }

      // Importar configuración
      if (datosRespaldo.configuracion) {
        try {
          await this.importarConfiguracion(datosRespaldo.configuracion, sobrescribirExistentes);
          estadisticas.configuracionesImportadas = 1;
        } catch (error) {
          errores.push(`Error importando configuración: ${error}`);
          estadisticas.erroresEncontrados++;
        }
      }

      // Importar sesiones
      if (datosRespaldo.sesiones && Array.isArray(datosRespaldo.sesiones)) {
        for (const sesionData of datosRespaldo.sesiones) {
          try {
            await this.importarSesion(sesionData, sobrescribirExistentes);
            estadisticas.sesionesImportadas++;
          } catch (error) {
            errores.push(`Error importando sesión ${sesionData.id}: ${error}`);
            estadisticas.erroresEncontrados++;
          }
        }
      }

      const resultado: ResultadoImportacion = {
        exito: estadisticas.erroresEncontrados === 0,
        datosImportados: datosRespaldo,
        estadisticas,
        errores,
        advertencias,
        timestamp: new Date()
      };

      console.log('✅ Importación completada:', estadisticas);
      return resultado;

    } catch (error) {
      console.error('❌ Error durante importación:', error);
      return {
        exito: false,
        estadisticas: {
          usuariosImportados: 0,
          sesionesImportadas: 0,
          configuracionesImportadas: 0,
          erroresEncontrados: 1
        },
        errores: [error instanceof Error ? error.message : 'Error desconocido durante importación'],
        advertencias: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * Importa datos de usuario
   * @private
   */
  private async importarUsuario(datosUsuario: any, sobrescribir: boolean): Promise<void> {
    try {
      const usuarioExistente = await this.almacenamientoService.obtenerUsuario().toPromise();
      
      if (usuarioExistente && !sobrescribir) {
        throw new Error('Ya existe un usuario - use sobrescribir para reemplazar');
      }

      const usuario = Usuario.fromJSON(JSON.stringify(datosUsuario));
      await this.almacenamientoService.guardarUsuario(usuario).toPromise();
      
      console.log('👤 Usuario importado exitosamente');
    } catch (error) {
      throw new Error(`Error importando usuario: ${error}`);
    }
  }

  /**
   * Importa configuración
   * @private
   */
  private async importarConfiguracion(datosConfiguracion: any, sobrescribir: boolean): Promise<void> {
    try {
      const configuracionExistente = await this.almacenamientoService.obtenerConfiguracion().toPromise();
      
      if (configuracionExistente && !sobrescribir) {
        throw new Error('Ya existe configuración - use sobrescribir para reemplazar');
      }

      const configuracion = new Configuracion(datosConfiguracion);
      await this.almacenamientoService.guardarConfiguracion(configuracion).toPromise();
      
      console.log('⚙️ Configuración importada exitosamente');
    } catch (error) {
      throw new Error(`Error importando configuración: ${error}`);
    }
  }

  /**
   * Importa una sesión individual
   * @private
   */
  private async importarSesion(datosSesion: any, sobrescribir: boolean): Promise<void> {
    try {
      const sesionesExistentes = await this.almacenamientoService.obtenerSesiones().toPromise();
      const sesionExistente = sesionesExistentes?.find(s => s.id === datosSesion.id);
      
      if (sesionExistente && !sobrescribir) {
        throw new Error(`Sesión ${datosSesion.id} ya existe - use sobrescribir para reemplazar`);
      }

      const sesion = SesionCompra.fromJSON(JSON.stringify(datosSesion));
      await this.almacenamientoService.guardarSesion(sesion, false).toPromise();
      
      console.log(`🛒 Sesión ${sesion.id} importada exitosamente`);
    } catch (error) {
      throw new Error(`Error importando sesión: ${error}`);
    }
  }

  /**
   * Valida estructura de respaldo
   * @private
   */
  private validarEstructuraRespaldo(datos: any): any {
    const errores: string[] = [];
    const advertencias: string[] = [];

    try {
      // Verificar estructura básica
      if (!datos || typeof datos !== 'object') {
        errores.push('Estructura de respaldo inválida');
        return { valido: false, errores, advertencias };
      }

      // Verificar metadatos si existen
      if (datos.metadatos) {
        if (!datos.metadatos.aplicacion || datos.metadatos.aplicacion !== this.APLICACION) {
          advertencias.push('El respaldo no es de la aplicación Carrito');
        }
        
        if (datos.metadatos.version && datos.metadatos.version !== this.VERSION_EXPORTACION) {
          advertencias.push(`Versión de respaldo diferente: ${datos.metadatos.version}`);
        }
      }

      // Verificar datos
      const datosRespaldo = datos.datos || datos;
      
      if (datosRespaldo.usuario) {
        if (!datosRespaldo.usuario.id) {
          errores.push('Datos de usuario inválidos');
        }
      }

      if (datosRespaldo.sesiones) {
        if (!Array.isArray(datosRespaldo.sesiones)) {
          errores.push('Datos de sesiones deben ser un array');
        } else {
          for (const sesion of datosRespaldo.sesiones) {
            if (!sesion.id || !sesion.nombreSupermercado || !sesion.fecha) {
              errores.push(`Sesión inválida: ${sesion.id || 'sin ID'}`);
            }
          }
        }
      }

      return {
        valido: errores.length === 0,
        errores,
        advertencias,
        estadisticas: {
          tieneUsuario: !!datosRespaldo.usuario,
          tieneConfiguracion: !!datosRespaldo.configuracion,
          cantidadSesiones: datosRespaldo.sesiones?.length || 0
        }
      };

    } catch (error) {
      console.error('Error validando estructura de respaldo:', error);
      errores.push('Error validando estructura del archivo');
      return { valido: false, errores, advertencias };
    }
  }

  /**
   * Verifica si es un respaldo encriptado
   * @private
   */
  private esRespaldoEncriptado(datos: any): boolean {
    // Implementación básica - verificar si los datos parecen encriptados
    if (typeof datos === 'string' && datos.length > 100) {
      // Si es una cadena larga, podría estar encriptada
      try {
        JSON.parse(datos);
        return false; // Si se puede parsear, no está encriptado
      } catch {
        return true; // Si no se puede parsear, probablemente está encriptado
      }
    }
    return false;
  }

  /**
   * Genera clave de encriptación aleatoria
   * @private
   */
  private generarClaveEncriptacion(): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let clave = '';
    for (let i = 0; i < 32; i++) {
      clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return clave;
  }

  // ==================== MÉTODOS PÚBLICOS ADICIONALES ====================

  /**
   * Obtiene formatos de exportación disponibles
   * @returns FormatoExportacion[] Lista de formatos soportados
   */
  public obtenerFormatosDisponibles(): FormatoExportacion[] {
    return [
      FormatoExportacion.JSON,
      FormatoExportacion.CSV,
      // FormatoExportacion.EXCEL, // Comentado hasta implementación completa
      // FormatoExportacion.PDF    // Comentado hasta implementación completa
    ];
  }

  /**
   * Estima el tamaño del archivo de exportación
   * @param opciones Opciones de exportación
   * @returns Observable<number> Tamaño estimado en bytes
   */
  public estimarTamanoExportacion(opciones: OpcionesExportacion): Observable<number> {
    return new Observable(observer => {
      this.recopilarDatosExportacion(opciones)
        .then(datos => {
          const contenidoEstimado = JSON.stringify(datos);
          const tamanoBase = new Blob([contenidoEstimado]).size;
          
          // Ajustar según formato
          let factorFormato = 1;
          switch (opciones.formato) {
            case FormatoExportacion.CSV:
              factorFormato = 0.7; // CSV es más compacto
              break;
            case FormatoExportacion.JSON:
              factorFormato = opciones.comprimirDatos ? 0.6 : 1.2;
              break;
            case FormatoExportacion.EXCEL:
              factorFormato = 1.5; // Excel tiene overhead
              break;
          }

          const tamanoEstimado = Math.round(tamanoBase * factorFormato);
          observer.next(tamanoEstimado);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Verifica compatibilidad de un archivo de importación
   * @param contenidoArchivo Contenido del archivo
   * @returns Observable<any> Información de compatibilidad
   */
  public verificarCompatibilidad(contenidoArchivo: string): Observable<any> {
    return this.validarArchivoImportacion(contenidoArchivo).pipe(
      map(validacion => ({
        compatible: validacion.valido,
        version: validacion.estadisticas?.version || 'desconocida',
        aplicacion: validacion.estadisticas?.aplicacion || 'desconocida',
        requiereConversion: false, // Implementar lógica de conversión futura
        advertencias: validacion.advertencias,
        errores: validacion.errores
      })),
      catchError(error => of({
        compatible: false,
        error: error.message,
        requiereConversion: false
      }))
    );
  }

  /**
   * Genera plantilla CSV para importación manual
   * @returns Observable<string> Contenido de plantilla CSV
   */
  public generarPlantillaCSV(): Observable<string> {
    try {
      const plantillaSesiones = [
        'ID,Supermercado,Fecha,Hora Inicio,Total General,Notas',
        'ejemplo_001,Supermercado XYZ,2025-01-15,10:30,15000,Compra semanal',
        ''
      ].join('\n');

      const plantillaProductos = [
        'ID Sesión,Nombre Producto,Precio Unitario,Cantidad,Categoría,Notas',
        'ejemplo_001,Leche,1500,2,lacteos_huevos,',
        'ejemplo_001,Pan,800,1,panaderia,Integral',
        ''
      ].join('\n');

      const plantillaCompleta = 
        'PLANTILLA DE IMPORTACIÓN - CARRITO\n\n' +
        'SESIONES:\n' + plantillaSesiones + '\n' +
        'PRODUCTOS:\n' + plantillaProductos;

      return of(plantillaCompleta);
    } catch (error) {
      return throwError(new Error('Error generando plantilla CSV'));
    }
  }

  /**
   * Obtiene información de debug del servicio
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    return {
      version: this.VERSION_EXPORTACION,
      aplicacion: this.APLICACION,
      maxTamanoArchivo: this.MAX_TAMANO_ARCHIVO,
      formatosDisponibles: this.obtenerFormatosDisponibles(),
      tiposMime: this.TIPOS_MIME,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Destruye el servicio y limpia recursos
   */
  public destruir(): void {
    console.log('🧹 Servicio de exportación destruido');
  }
}