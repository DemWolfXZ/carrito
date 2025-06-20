/**
 * Pipe para formatear cantidades numéricas con unidades y plurales
 * 
 * Formatea números como cantidades legibles con unidades apropiadas,
 * manejo de plurales en español y formatos cortos para números grandes.
 * Incluye soporte para diferentes tipos de unidades y contextos.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Tipos de unidades soportadas
 */
export type TipoUnidad = 
  | 'productos' 
  | 'sesiones' 
  | 'compras'
  | 'items' 
  | 'unidades'
  | 'personas'
  | 'dias'
  | 'horas'
  | 'minutos'
  | 'segundos'
  | 'bytes'
  | 'porcentaje'
  | 'veces'
  | 'años'
  | 'meses'
  | 'semanas'
  | 'personalizado';

/**
 * Configuración de unidad
 */
interface ConfiguracionUnidad {
  singular: string;
  plural: string;
  abreviacion?: string;
  genero: 'masculino' | 'femenino';
  contexto?: string;
}

/**
 * Opciones de formateo para cantidades
 */
interface OpcionesCantidad {
  /** Tipo de unidad a usar */
  unidad?: TipoUnidad;
  /** Unidad personalizada (solo si tipo es 'personalizado') */
  unidadPersonalizada?: ConfiguracionUnidad;
  /** Usar formato corto (ej: 1.2K en lugar de 1,200) */
  formatoCorto?: boolean;
  /** Mostrar cero como "Sin [unidad]" */
  mostrarCeroComoSin?: boolean;
  /** Incluir la palabra "de" antes de la unidad */
  incluirDe?: boolean;
  /** Usar abreviación de la unidad */
  usarAbreviacion?: boolean;
  /** Formato numérico (separadores de miles) */
  formatoNumerico?: boolean;
  /** Precisión decimal para formato corto */
  precision?: number;
  /** Capitalizar primera letra */
  capitalizar?: boolean;
}

@Pipe({
  name: 'numeroCantidad',
  standalone: true
})
export class NumeroCantidadPipe implements PipeTransform {

  // Configuraciones de unidades predefinidas
  private readonly UNIDADES: Record<TipoUnidad, ConfiguracionUnidad> = {
    productos: {
      singular: 'producto',
      plural: 'productos',
      abreviacion: 'prod.',
      genero: 'masculino'
    },
    sesiones: {
      singular: 'sesión',
      plural: 'sesiones',
      abreviacion: 'ses.',
      genero: 'femenino'
    },
    compras: {
      singular: 'compra',
      plural: 'compras',
      abreviacion: 'comp.',
      genero: 'femenino'
    },
    items: {
      singular: 'ítem',
      plural: 'ítems',
      abreviacion: 'it.',
      genero: 'masculino'
    },
    unidades: {
      singular: 'unidad',
      plural: 'unidades',
      abreviacion: 'und.',
      genero: 'femenino'
    },
    personas: {
      singular: 'persona',
      plural: 'personas',
      abreviacion: 'pers.',
      genero: 'femenino'
    },
    dias: {
      singular: 'día',
      plural: 'días',
      abreviacion: 'd',
      genero: 'masculino'
    },
    horas: {
      singular: 'hora',
      plural: 'horas',
      abreviacion: 'h',
      genero: 'femenino'
    },
    minutos: {
      singular: 'minuto',
      plural: 'minutos',
      abreviacion: 'min',
      genero: 'masculino'
    },
    segundos: {
      singular: 'segundo',
      plural: 'segundos',
      abreviacion: 's',
      genero: 'masculino'
    },
    bytes: {
      singular: 'byte',
      plural: 'bytes',
      abreviacion: 'B',
      genero: 'masculino'
    },
    porcentaje: {
      singular: 'porciento',
      plural: 'porciento',
      abreviacion: '%',
      genero: 'masculino'
    },
    veces: {
      singular: 'vez',
      plural: 'veces',
      abreviacion: 'v',
      genero: 'femenino'
    },
    años: {
      singular: 'año',
      plural: 'años',
      abreviacion: 'a',
      genero: 'masculino'
    },
    meses: {
      singular: 'mes',
      plural: 'meses',
      abreviacion: 'm',
      genero: 'masculino'
    },
    semanas: {
      singular: 'semana',
      plural: 'semanas',
      abreviacion: 'sem',
      genero: 'femenino'
    },
    personalizado: {
      singular: '',
      plural: '',
      genero: 'masculino'
    }
  };

  // Configuración por defecto
  private readonly CONFIGURACION_DEFECTO: Required<OpcionesCantidad> = {
    unidad: 'unidades',
    unidadPersonalizada: this.UNIDADES.personalizado,
    formatoCorto: false,
    mostrarCeroComoSin: true,
    incluirDe: false,
    usarAbreviacion: false,
    formatoNumerico: true,
    precision: 1,
    capitalizar: false
  };

  /**
   * Transforma un número a formato de cantidad con unidad
   * @param valor Valor numérico a formatear
   * @param unidad Tipo de unidad o configuración personalizada
   * @param opciones Opciones adicionales de formateo
   * @returns string Cantidad formateada con unidad
   */
  transform(valor: any, unidad?: TipoUnidad | ConfiguracionUnidad, opciones?: Partial<OpcionesCantidad>): string {
    try {
      // Validar entrada
      if (!this.esValorValido(valor)) {
        return this.manejarValorInvalido(valor, unidad, opciones);
      }

      // Convertir a número
      const numero = this.convertirANumero(valor);
      
      // Determinar configuración de unidad
      const configUnidad = this.determinarConfiguracionUnidad(unidad, opciones);
      
      // Aplicar configuración
      const config = { ...this.CONFIGURACION_DEFECTO, ...opciones };
      
      // Manejar caso especial: cero
      if (numero === 0 && config.mostrarCeroComoSin) {
        return this.formatearCero(configUnidad, config);
      }
      
      // Formatear según tipo
      if (config.formatoCorto && Math.abs(numero) >= 1000) {
        return this.formatearCorto(numero, configUnidad, config);
      }
      
      return this.formatearCompleto(numero, configUnidad, config);

    } catch (error) {
      console.error('Error en NumeroCantidadPipe:', error);
      return '0 unidades';
    }
  }

  /**
   * Determina la configuración de unidad a usar
   * @private
   */
  private determinarConfiguracionUnidad(
    unidad?: TipoUnidad | ConfiguracionUnidad, 
    opciones?: Partial<OpcionesCantidad>
  ): ConfiguracionUnidad {
    // Si se pasa una configuración personalizada directamente
    if (unidad && typeof unidad === 'object' && 'singular' in unidad) {
      return unidad;
    }

    // Si se especifica unidad personalizada en opciones
    if (opciones?.unidadPersonalizada && (unidad === 'personalizado' || !unidad)) {
      return opciones.unidadPersonalizada;
    }

    // Si se especifica tipo de unidad
    if (unidad && typeof unidad === 'string' && this.UNIDADES[unidad]) {
      return this.UNIDADES[unidad];
    }

    // Si se especifica en opciones
    if (opciones?.unidad && this.UNIDADES[opciones.unidad]) {
      return this.UNIDADES[opciones.unidad];
    }

    // Por defecto
    return this.UNIDADES[this.CONFIGURACION_DEFECTO.unidad];
  }

  /**
   * Valida si el valor es válido para formatear
   * @private
   */
  private esValorValido(valor: any): boolean {
    if (valor === null || valor === undefined) {
      return false;
    }

    if (typeof valor === 'string' && valor.trim() === '') {
      return false;
    }

    const numero = Number(valor);
    return !isNaN(numero) && isFinite(numero);
  }

  /**
   * Maneja valores inválidos
   * @private
   */
  private manejarValorInvalido(
    valor: any, 
    unidad?: TipoUnidad | ConfiguracionUnidad, 
    opciones?: Partial<OpcionesCantidad>
  ): string {
    if (valor === null || valor === undefined) {
      const config = this.determinarConfiguracionUnidad(unidad, opciones);
      return `0 ${config.plural}`;
    }
    
    return 'Cantidad inválida';
  }

  /**
   * Convierte valor a número
   * @private
   */
  private convertirANumero(valor: any): number {
    if (typeof valor === 'number') {
      return valor;
    }
    
    if (typeof valor === 'string') {
      // Limpiar string de formato
      const valorLimpio = valor
        .replace(/[,\.]/g, '') // Separadores
        .replace(/[^\d\-]/g, ''); // Solo números y signo negativo
      
      return parseInt(valorLimpio, 10) || 0;
    }
    
    return Number(valor);
  }

  /**
   * Formatea caso especial de cero
   * @private
   */
  private formatearCero(config: ConfiguracionUnidad, opciones: Required<OpcionesCantidad>): string {
    const unidadTexto = opciones.usarAbreviacion && config.abreviacion 
      ? config.abreviacion 
      : config.plural;
    
    let resultado = `Sin ${unidadTexto}`;
    
    if (opciones.capitalizar) {
      resultado = this.capitalizar(resultado);
    }
    
    return resultado;
  }

  /**
   * Formatea número en formato completo
   * @private
   */
  private formatearCompleto(numero: number, config: ConfiguracionUnidad, opciones: Required<OpcionesCantidad>): string {
    // Formatear número
    const numeroFormateado = this.formatearNumero(Math.abs(numero), opciones.formatoNumerico);
    
    // Determinar unidad (singular o plural)
    const esPlural = Math.abs(numero) !== 1;
    const unidadTexto = this.obtenerTextoUnidad(config, opciones, esPlural);
    
    // Construir resultado
    let resultado = this.construirTexto(numeroFormateado, unidadTexto, opciones);
    
    // Manejar número negativo
    if (numero < 0) {
      resultado = `-${resultado}`;
    }
    
    // Capitalizar si está configurado
    if (opciones.capitalizar) {
      resultado = this.capitalizar(resultado);
    }
    
    return resultado;
  }

  /**
   * Formatea número en formato corto (1.2K, 3.5M, etc.)
   * @private
   */
  private formatearCorto(numero: number, config: ConfiguracionUnidad, opciones: Required<OpcionesCantidad>): string {
    const abs = Math.abs(numero);
    let numeroCorto = '';
    let sufijo = '';
    
    if (abs >= 1000000000) {
      // Miles de millones
      numeroCorto = (numero / 1000000000).toFixed(opciones.precision);
      sufijo = 'B';
    } else if (abs >= 1000000) {
      // Millones
      numeroCorto = (numero / 1000000).toFixed(opciones.precision);
      sufijo = 'M';
    } else if (abs >= 1000) {
      // Miles
      numeroCorto = (numero / 1000).toFixed(opciones.precision);
      sufijo = 'K';
    } else {
      // Menor a 1000, usar formato normal
      return this.formatearCompleto(numero, config, { ...opciones, formatoCorto: false });
    }
    
    // Limpiar decimales innecesarios
    numeroCorto = numeroCorto.replace(/\.0+$/, '');
    
    // Obtener texto de unidad
    const esPlural = true; // En formato corto asumimos plural
    const unidadTexto = this.obtenerTextoUnidad(config, opciones, esPlural);
    
    // Construir resultado
    const numeroConSufijo = `${numeroCorto}${sufijo}`;
    let resultado = this.construirTexto(numeroConSufijo, unidadTexto, opciones);
    
    // Capitalizar si está configurado
    if (opciones.capitalizar) {
      resultado = this.capitalizar(resultado);
    }
    
    return resultado;
  }

  /**
   * Obtiene el texto de unidad apropiado
   * @private
   */
  private obtenerTextoUnidad(config: ConfiguracionUnidad, opciones: Required<OpcionesCantidad>, esPlural: boolean): string {
    if (opciones.usarAbreviacion && config.abreviacion) {
      return config.abreviacion;
    }
    
    return esPlural ? config.plural : config.singular;
  }

  /**
   * Construye el texto final
   * @private
   */
  private construirTexto(numero: string, unidad: string, opciones: Required<OpcionesCantidad>): string {
    if (opciones.incluirDe) {
      return `${numero} de ${unidad}`;
    }
    
    return `${numero} ${unidad}`;
  }

  /**
   * Formatea número con separadores de miles
   * @private
   */
  private formatearNumero(numero: number, usarSeparadores: boolean): string {
    if (!usarSeparadores) {
      return numero.toString();
    }
    
    return numero.toLocaleString('es-CL');
  }

  /**
   * Capitaliza la primera letra
   * @private
   */
  private capitalizar(texto: string): string {
    if (!texto) return texto;
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  // ==================== MÉTODOS ESTÁTICOS PÚBLICOS ====================

  /**
   * Formatea cantidad usando el pipe programáticamente
   * @param valor Valor a formatear
   * @param unidad Tipo de unidad
   * @param opciones Opciones de formateo
   * @returns string Valor formateado
   */
  static formatear(valor: any, unidad?: TipoUnidad, opciones?: Partial<OpcionesCantidad>): string {
    const pipe = new NumeroCantidadPipe();
    return pipe.transform(valor, unidad, opciones);
  }

  /**
   * Formatea como productos
   * @param valor Cantidad de productos
   * @param formatoCorto Usar formato corto
   * @returns string Cantidad formateada
   */
  static formatearProductos(valor: any, formatoCorto: boolean = false): string {
    return NumeroCantidadPipe.formatear(valor, 'productos', { formatoCorto });
  }

  /**
   * Formatea como sesiones
   * @param valor Cantidad de sesiones
   * @param formatoCorto Usar formato corto
   * @returns string Cantidad formateada
   */
  static formatearSesiones(valor: any, formatoCorto: boolean = false): string {
    return NumeroCantidadPipe.formatear(valor, 'sesiones', { formatoCorto });
  }

  /**
   * Formatea tiempo transcurrido
   * @param minutos Minutos transcurridos
   * @returns string Tiempo formateado
   */
  static formatearTiempo(minutos: number): string {
    if (minutos < 60) {
      return NumeroCantidadPipe.formatear(minutos, 'minutos');
    }
    
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    
    if (minutosRestantes === 0) {
      return NumeroCantidadPipe.formatear(horas, 'horas');
    }
    
    return `${NumeroCantidadPipe.formatear(horas, 'horas')} y ${NumeroCantidadPipe.formatear(minutosRestantes, 'minutos')}`;
  }

  /**
   * Formatea tamaño de archivo
   * @param bytes Tamaño en bytes
   * @returns string Tamaño formateado
   */
  static formatearTamanoArchivo(bytes: number): string {
    const unidades = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    let indice = 0;
    let tamano = bytes;
    
    while (tamano >= 1024 && indice < unidades.length - 1) {
      tamano /= 1024;
      indice++;
    }
    
    const precision = indice === 0 ? 0 : 1;
    return `${tamano.toFixed(precision)} ${unidades[indice]}`;
  }

  /**
   * Formatea porcentaje con contexto
   * @param valor Valor del porcentaje (0-100)
   * @param contexto Contexto del porcentaje
   * @returns string Porcentaje formateado
   */
  static formatearPorcentaje(valor: number, contexto?: string): string {
    const porcentajeFormateado = `${valor.toFixed(1)}%`;
    
    if (contexto) {
      return `${porcentajeFormateado} ${contexto}`;
    }
    
    return porcentajeFormateado;
  }

  /**
   * Formatea diferencia entre dos cantidades
   * @param cantidad1 Primera cantidad
   * @param cantidad2 Segunda cantidad
   * @param unidad Tipo de unidad
   * @returns object Diferencia formateada con información adicional
   */
  static formatearDiferencia(cantidad1: number, cantidad2: number, unidad: TipoUnidad = 'unidades'): {
    diferencia: string;
    tipo: 'aumento' | 'disminucion' | 'igual';
    porcentaje?: string;
  } {
    const diferencia = cantidad2 - cantidad1;
    const diferenciaAbs = Math.abs(diferencia);
    
    let tipo: 'aumento' | 'disminucion' | 'igual';
    let prefijo = '';
    
    if (diferencia > 0) {
      tipo = 'aumento';
      prefijo = '+';
    } else if (diferencia < 0) {
      tipo = 'disminucion';
      prefijo = '';
    } else {
      tipo = 'igual';
    }
    
    const diferenciaFormateada = `${prefijo}${NumeroCantidadPipe.formatear(diferencia, unidad)}`;
    
    // Calcular porcentaje de cambio
    let porcentaje: string | undefined;
    if (cantidad1 !== 0 && diferencia !== 0) {
      const porcentajeCambio = (diferencia / cantidad1) * 100;
      porcentaje = `${prefijo}${porcentajeCambio.toFixed(1)}%`;
    }
    
    return {
      diferencia: diferenciaFormateada,
      tipo,
      porcentaje
    };
  }

  /**
   * Formatea rango de cantidades
   * @param min Cantidad mínima
   * @param max Cantidad máxima
   * @param unidad Tipo de unidad
   * @returns string Rango formateado
   */
  static formatearRango(min: number, max: number, unidad: TipoUnidad = 'unidades'): string {
    const minFormateado = NumeroCantidadPipe.formatear(min, unidad);
    const maxFormateado = NumeroCantidadPipe.formatear(max, unidad);
    
    if (min === max) {
      return minFormateado;
    }
    
    return `${minFormateado} - ${maxFormateado}`;
  }

  /**
   * Obtiene todas las unidades disponibles
   * @returns Array<{tipo: TipoUnidad, config: ConfiguracionUnidad}> Lista de unidades
   */
  static obtenerUnidadesDisponibles(): Array<{tipo: TipoUnidad, config: ConfiguracionUnidad}> {
    const pipe = new NumeroCantidadPipe();
    return Object.entries(pipe.UNIDADES)
      .filter(([tipo]) => tipo !== 'personalizado')
      .map(([tipo, config]) => ({
        tipo: tipo as TipoUnidad,
        config
      }));
  }

  /**
   * Crea configuración de unidad personalizada
   * @param singular Forma singular
   * @param plural Forma plural
   * @param opciones Opciones adicionales
   * @returns ConfiguracionUnidad Configuración creada
   */
  static crearUnidadPersonalizada(
    singular: string, 
    plural: string, 
    opciones?: {
      abreviacion?: string;
      genero?: 'masculino' | 'femenino';
      contexto?: string;
    }
  ): ConfiguracionUnidad {
    return {
      singular,
      plural,
      abreviacion: opciones?.abreviacion,
      genero: opciones?.genero || 'masculino',
      contexto: opciones?.contexto
    };
  }

  /**
   * Valida si un tipo de unidad es soportado
   * @param tipo Tipo a validar
   * @returns boolean True si es soportado
   */
  static esTipoUnidadSoportado(tipo: string): tipo is TipoUnidad {
    const pipe = new NumeroCantidadPipe();
    return Object.prototype.hasOwnProperty.call(pipe.UNIDADES, tipo);
  }

  /**
   * Obtiene información de debug del pipe
   * @returns object Información de debug
   */
  static obtenerInfoDebug(): object {
    const pipe = new NumeroCantidadPipe();
    const unidades = NumeroCantidadPipe.obtenerUnidadesDisponibles();
    
    return {
      version: '1.0.0',
      totalUnidadesSoportadas: unidades.length,
      tiposUnidades: unidades.map(u => u.tipo),
      formatosDisponibles: ['completo', 'corto', 'abreviado'],
      ejemplos: {
        productos: NumeroCantidadPipe.formatearProductos(1234),
        sesiones: NumeroCantidadPipe.formatearSesiones(5),
        tiempo: NumeroCantidadPipe.formatearTiempo(125),
        archivo: NumeroCantidadPipe.formatearTamanoArchivo(1048576)
      },
      timestamp: new Date().toISOString()
    };
  }
}