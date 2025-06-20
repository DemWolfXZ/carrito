/**
 * Pipe para formatear fechas en formato relativo ("hace 2 horas", "ayer", etc.)
 * 
 * Convierte fechas a formato humano legible mostrando tiempo transcurrido
 * desde la fecha hasta ahora. Incluye soporte para diferentes idiomas
 * y configuraciones de precisión.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Opciones de formateo para fechas relativas
 */
interface OpcionesFechaRelativa {
  /** Idioma para el formato (es, en) */
  idioma?: 'es' | 'en';
  /** Incluir hora en fechas del mismo día */
  incluirHora?: boolean;
  /** Formato completo para fechas muy antiguas */
  formatoCompleto?: boolean;
  /** Usar formato corto (ej: "2h" en lugar de "hace 2 horas") */
  formatoCorto?: boolean;
  /** Número máximo de días para mostrar relativo */
  maxDiasRelativos?: number;
}

/**
 * Textos en diferentes idiomas
 */
interface TextosIdioma {
  ahora: string;
  hace: string;
  en: string;
  minuto: string;
  minutos: string;
  hora: string;
  horas: string;
  dia: string;
  dias: string;
  semana: string;
  semanas: string;
  mes: string;
  meses: string;
  ano: string;
  anos: string;
  ayer: string;
  manana: string;
  hoy: string;
  // Formatos cortos
  min: string;
  h: string;
  d: string;
  sem: string;
  m: string;
  a: string;
}

@Pipe({
  name: 'fechaRelativa',
  standalone: true
})
export class FechaRelativaPipe implements PipeTransform {

  // Configuración por defecto
  private readonly CONFIGURACION_DEFECTO: Required<OpcionesFechaRelativa> = {
    idioma: 'es',
    incluirHora: true,
    formatoCompleto: true,
    formatoCorto: false,
    maxDiasRelativos: 30
  };

  // Textos en español
  private readonly TEXTOS_ES: TextosIdioma = {
    ahora: 'ahora',
    hace: 'hace',
    en: 'en',
    minuto: 'minuto',
    minutos: 'minutos',
    hora: 'hora',
    horas: 'horas',
    dia: 'día',
    dias: 'días',
    semana: 'semana',
    semanas: 'semanas',
    mes: 'mes',
    meses: 'meses',
    ano: 'año',
    anos: 'años',
    ayer: 'ayer',
    manana: 'mañana',
    hoy: 'hoy',
    // Formatos cortos
    min: 'min',
    h: 'h',
    d: 'd',
    sem: 'sem',
    m: 'm',
    a: 'a'
  };

  // Textos en inglés
  private readonly TEXTOS_EN: TextosIdioma = {
    ahora: 'now',
    hace: 'ago',
    en: 'in',
    minuto: 'minute',
    minutos: 'minutes',
    hora: 'hour',
    horas: 'hours',
    dia: 'day',
    dias: 'days',
    semana: 'week',
    semanas: 'weeks',
    mes: 'month',
    meses: 'months',
    ano: 'year',
    anos: 'years',
    ayer: 'yesterday',
    manana: 'tomorrow',
    hoy: 'today',
    // Formatos cortos
    min: 'min',
    h: 'h',
    d: 'd',
    sem: 'w',
    m: 'm',
    a: 'y'
  };

  // Constantes de tiempo en milisegundos
  private readonly MINUTO = 60 * 1000;
  private readonly HORA = 60 * this.MINUTO;
  private readonly DIA = 24 * this.HORA;
  private readonly SEMANA = 7 * this.DIA;
  private readonly MES = 30 * this.DIA;
  private readonly ANO = 365 * this.DIA;

  /**
   * Transforma una fecha a formato relativo
   * @param fecha Fecha a formatear (Date, string, number)
   * @param opciones Opciones de formateo
   * @returns string Fecha en formato relativo
   */
  transform(fecha: any, opciones?: OpcionesFechaRelativa): string {
    try {
      // Validar entrada
      const fechaValida = this.validarYConvertirFecha(fecha);
      if (!fechaValida) {
        return this.manejarFechaInvalida(fecha);
      }

      // Aplicar configuración
      const config = { ...this.CONFIGURACION_DEFECTO, ...opciones };
      const textos = config.idioma === 'es' ? this.TEXTOS_ES : this.TEXTOS_EN;

      // Calcular diferencia con ahora
      const ahora = new Date();
      const diferencia = ahora.getTime() - fechaValida.getTime();
      const esFuturo = diferencia < 0;
      const diferenciaAbs = Math.abs(diferencia);

      // Verificar si excede el límite de días relativos
      if (diferenciaAbs > (config.maxDiasRelativos * this.DIA)) {
        return this.formatearFechaCompleta(fechaValida, config);
      }

      // Formatear según diferencia
      return this.formatearDiferencia(diferenciaAbs, esFuturo, textos, config, fechaValida);

    } catch (error) {
      console.error('Error en FechaRelativaPipe:', error);
      return 'Fecha inválida';
    }
  }

  /**
   * Valida y convierte entrada a objeto Date
   * @private
   */
  private validarYConvertirFecha(fecha: any): Date | null {
    if (!fecha) {
      return null;
    }

    let fechaObj: Date;

    if (fecha instanceof Date) {
      fechaObj = fecha;
    } else if (typeof fecha === 'string') {
      fechaObj = new Date(fecha);
    } else if (typeof fecha === 'number') {
      fechaObj = new Date(fecha);
    } else {
      return null;
    }

    // Verificar que la fecha es válida
    if (isNaN(fechaObj.getTime())) {
      return null;
    }

    return fechaObj;
  }

  /**
   * Maneja fechas inválidas
   * @private
   */
  private manejarFechaInvalida(fecha: any): string {
    if (fecha === null || fecha === undefined) {
      return 'Sin fecha';
    }
    
    console.warn('Fecha inválida recibida:', fecha);
    return 'Fecha inválida';
  }

  /**
   * Formatea la diferencia de tiempo
   * @private
   */
  private formatearDiferencia(
    diferencia: number,
    esFuturo: boolean,
    textos: TextosIdioma,
    config: Required<OpcionesFechaRelativa>,
    fecha: Date
  ): string {
    // Menos de 1 minuto
    if (diferencia < this.MINUTO) {
      return textos.ahora;
    }

    // Minutos
    if (diferencia < this.HORA) {
      const minutos = Math.floor(diferencia / this.MINUTO);
      return this.formatearUnidad(minutos, textos.minuto, textos.minutos, textos.min, esFuturo, textos, config.formatoCorto);
    }

    // Horas
    if (diferencia < this.DIA) {
      const horas = Math.floor(diferencia / this.HORA);
      return this.formatearUnidad(horas, textos.hora, textos.horas, textos.h, esFuturo, textos, config.formatoCorto);
    }

    // Días especiales (ayer, hoy, mañana)
    if (diferencia < 2 * this.DIA) {
      return this.formatearDiaEspecial(fecha, textos, config);
    }

    // Días
    if (diferencia < this.SEMANA) {
      const dias = Math.floor(diferencia / this.DIA);
      return this.formatearUnidad(dias, textos.dia, textos.dias, textos.d, esFuturo, textos, config.formatoCorto);
    }

    // Semanas
    if (diferencia < this.MES) {
      const semanas = Math.floor(diferencia / this.SEMANA);
      return this.formatearUnidad(semanas, textos.semana, textos.semanas, textos.sem, esFuturo, textos, config.formatoCorto);
    }

    // Meses
    if (diferencia < this.ANO) {
      const meses = Math.floor(diferencia / this.MES);
      return this.formatearUnidad(meses, textos.mes, textos.meses, textos.m, esFuturo, textos, config.formatoCorto);
    }

    // Años
    const anos = Math.floor(diferencia / this.ANO);
    return this.formatearUnidad(anos, textos.ano, textos.anos, textos.a, esFuturo, textos, config.formatoCorto);
  }

  /**
   * Formatea una unidad de tiempo
   * @private
   */
  private formatearUnidad(
    cantidad: number,
    singular: string,
    plural: string,
    corto: string,
    esFuturo: boolean,
    textos: TextosIdioma,
    formatoCorto: boolean
  ): string {
    if (formatoCorto) {
      return `${cantidad}${corto}`;
    }

    const unidad = cantidad === 1 ? singular : plural;
    const prefijo = esFuturo ? textos.en : textos.hace;
    
    if (esFuturo) {
      return `${prefijo} ${cantidad} ${unidad}`;
    } else {
      return `${prefijo} ${cantidad} ${unidad}`;
    }
  }

  /**
   * Formatea días especiales (ayer, hoy, mañana)
   * @private
   */
  private formatearDiaEspecial(
    fecha: Date,
    textos: TextosIdioma,
    config: Required<OpcionesFechaRelativa>
  ): string {
    const hoy = new Date();
    const fechaSolo = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const hoySolo = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    const diferenciaDias = Math.round((fechaSolo.getTime() - hoySolo.getTime()) / this.DIA);

    let textoBase = '';
    if (diferenciaDias === -1) {
      textoBase = textos.ayer;
    } else if (diferenciaDias === 0) {
      textoBase = textos.hoy;
    } else if (diferenciaDias === 1) {
      textoBase = textos.manana;
    }

    // Agregar hora si está configurado
    if (config.incluirHora && textoBase) {
      const hora = this.formatearHora(fecha);
      return `${textoBase} a las ${hora}`;
    }

    return textoBase;
  }

  /**
   * Formatea fecha completa para fechas muy antiguas
   * @private
   */
  private formatearFechaCompleta(fecha: Date, config: Required<OpcionesFechaRelativa>): string {
    if (!config.formatoCompleto) {
      // Formato simplificado
      return this.formatearFechaSimple(fecha);
    }

    // Formato completo según idioma
    const opciones: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    if (config.incluirHora) {
      opciones.hour = '2-digit';
      opciones.minute = '2-digit';
    }

    const locale = config.idioma === 'es' ? 'es-CL' : 'en-US';
    return fecha.toLocaleDateString(locale, opciones);
  }

  /**
   * Formatea fecha en formato simple
   * @private
   */
  private formatearFechaSimple(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const ano = fecha.getFullYear();
    
    return `${dia}/${mes}/${ano}`;
  }

  /**
   * Formatea hora en formato 24h
   * @private
   */
  private formatearHora(fecha: Date): string {
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  /**
   * Método estático para usar el pipe programáticamente
   * @param fecha Fecha a formatear
   * @param opciones Opciones de formateo
   * @returns string Fecha formateada
   */
  static formatear(fecha: any, opciones?: OpcionesFechaRelativa): string {
    const pipe = new FechaRelativaPipe();
    return pipe.transform(fecha, opciones);
  }

  /**
   * Formatea fecha en formato corto
   * @param fecha Fecha a formatear
   * @returns string Fecha en formato corto
   */
  static formatearCorto(fecha: any): string {
    return FechaRelativaPipe.formatear(fecha, { formatoCorto: true });
  }

  /**
   * Formatea fecha sin hora
   * @param fecha Fecha a formatear
   * @returns string Fecha sin hora
   */
  static formatearSinHora(fecha: any): string {
    return FechaRelativaPipe.formatear(fecha, { incluirHora: false });
  }

  /**
   * Formatea fecha en inglés
   * @param fecha Fecha a formatear
   * @returns string Fecha en inglés
   */
  static formatearEnIngles(fecha: any): string {
    return FechaRelativaPipe.formatear(fecha, { idioma: 'en' });
  }

  /**
   * Calcula tiempo transcurrido entre dos fechas
   * @param fechaInicio Fecha de inicio
   * @param fechaFin Fecha de fin (por defecto: ahora)
   * @returns string Tiempo transcurrido
   */
  static tiempoTranscurrido(fechaInicio: any, fechaFin?: any): string {
    const pipe = new FechaRelativaPipe();
    const inicio = pipe.validarYConvertirFecha(fechaInicio);
    const fin = fechaFin ? pipe.validarYConvertirFecha(fechaFin) : new Date();
    
    if (!inicio || !fin) {
      return 'Tiempo inválido';
    }

    const diferencia = fin.getTime() - inicio.getTime();
    
    if (diferencia < 0) {
      return 'Tiempo negativo';
    }

    // Formatear diferencia como duración
    return pipe.formatearDuracion(diferencia);
  }

  /**
   * Formatea duración en milisegundos
   * @private
   */
  private formatearDuracion(duracion: number): string {
    const textos = this.TEXTOS_ES;
    
    if (duracion < this.MINUTO) {
      return 'menos de 1 minuto';
    }

    if (duracion < this.HORA) {
      const minutos = Math.floor(duracion / this.MINUTO);
      return `${minutos} ${minutos === 1 ? textos.minuto : textos.minutos}`;
    }

    if (duracion < this.DIA) {
      const horas = Math.floor(duracion / this.HORA);
      const minutos = Math.floor((duracion % this.HORA) / this.MINUTO);
      
      let resultado = `${horas} ${horas === 1 ? textos.hora : textos.horas}`;
      if (minutos > 0) {
        resultado += ` y ${minutos} ${minutos === 1 ? textos.minuto : textos.minutos}`;
      }
      return resultado;
    }

    const dias = Math.floor(duracion / this.DIA);
    const horas = Math.floor((duracion % this.DIA) / this.HORA);
    
    let resultado = `${dias} ${dias === 1 ? textos.dia : textos.dias}`;
    if (horas > 0) {
      resultado += ` y ${horas} ${horas === 1 ? textos.hora : textos.horas}`;
    }
    
    return resultado;
  }

  /**
   * Valida si una fecha es válida
   * @param fecha Fecha a validar
   * @returns boolean True si es válida
   */
  static esFechaValida(fecha: any): boolean {
    const pipe = new FechaRelativaPipe();
    return pipe.validarYConvertirFecha(fecha) !== null;
  }

  /**
   * Obtiene información de debug del pipe
   * @returns object Información de debug
   */
  static obtenerInfoDebug(): object {
    return {
      version: '1.0.0',
      idiomasSoportados: ['es', 'en'],
      tiposFechasSoportadas: ['Date', 'string', 'number'],
      formatosDisponibles: ['relativo', 'corto', 'completo'],
      timestamp: new Date().toISOString()
    };
  }
}