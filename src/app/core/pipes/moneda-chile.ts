/**
 * Pipe para formatear valores monetarios en formato de países hispanohablantes
 * 
 * Soporta todas las monedas de países de habla hispana y algunos estratégicos.
 * Formatea números según las convenciones locales de cada país con separadores
 * de miles, decimales y símbolos específicos de cada moneda.
 * 
 * @author DemWolf
 * @version 2.0.0
 * @since 2025-06-19
 */

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Códigos de moneda soportados (ISO 4217)
 */
export type CodigoMoneda = 
  // Latinoamérica
  | 'CLP' // Chile
  | 'ARS' // Argentina  
  | 'COP' // Colombia
  | 'MXN' // México
  | 'PEN' // Perú
  | 'UYU' // Uruguay
  | 'BOB' // Bolivia
  | 'PYG' // Paraguay
  | 'VES' // Venezuela
  | 'GTQ' // Guatemala
  | 'HNL' // Honduras
  | 'NIO' // Nicaragua
  | 'CRC' // Costa Rica
  | 'PAB' // Panamá
  | 'DOP' // República Dominicana
  | 'CUP' // Cuba
  // España y Europa
  | 'EUR' // España (Euro)
  // Estados Unidos (mercado hispano)
  | 'USD' // Estados Unidos
  // Guinea Ecuatorial
  | 'XAF'; // Franco CFA (Guinea Ecuatorial)

/**
 * Configuración completa de cada moneda
 */
interface ConfiguracionMoneda {
  codigo: CodigoMoneda;
  nombre: string;
  simbolo: string;
  pais: string;
  decimales: number;
  separadorMiles: string;
  separadorDecimal: string;
  posicionSimbolo: 'antes' | 'despues';
  espacioSimbolo: boolean;
  locale: string;
  ejemploFormato: string;
}

/**
 * Opciones de formateo para el pipe
 */
interface OpcionesFormateo {
  /** Código de moneda a usar */
  moneda?: CodigoMoneda;
  /** Mostrar símbolo de moneda */
  mostrarSimbolo?: boolean;
  /** Número de decimales (sobrescribe el por defecto) */
  decimales?: number;
  /** Formato corto para valores grandes (ej: 1.5M) */
  formatoCorto?: boolean;
  /** Mostrar código de moneda en lugar del símbolo */
  mostrarCodigo?: boolean;
  /** Forzar mostrar como positivo */
  forzarPositivo?: boolean;
  /** Detectar moneda automáticamente por configuración del usuario */
  autoDetectar?: boolean;
}

@Pipe({
  name: 'monedaHispana',
  standalone: true
})
export class MonedaHispanaPipe implements PipeTransform {

  // Configuración completa de todas las monedas
  private readonly CONFIGURACIONES_MONEDAS: Record<CodigoMoneda, ConfiguracionMoneda> = {
    // === LATINOAMÉRICA ===
    CLP: {
      codigo: 'CLP',
      nombre: 'Peso Chileno',
      simbolo: '$',
      pais: 'Chile',
      decimales: 0,
      separadorMiles: '.',
      separadorDecimal: ',',
      posicionSimbolo: 'antes',
      espacioSimbolo: false,
      locale: 'es-CL',
      ejemploFormato: '$1.234.567'
    },
    ARS: {
      codigo: 'ARS',
      nombre: 'Peso Argentino',
      simbolo: 'AR$',
      pais: 'Argentina',
      decimales: 2,
      separadorMiles: '.',
      separadorDecimal: ',',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-AR',
      ejemploFormato: 'AR$ 1.234.567,89'
    },
    COP: {
      codigo: 'COP',
      nombre: 'Peso Colombiano',
      simbolo: 'COL$',
      pais: 'Colombia',
      decimales: 0,
      separadorMiles: '.',
      separadorDecimal: ',',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-CO',
      ejemploFormato: 'COL$ 1.234.567'
    },
    MXN: {
      codigo: 'MXN',
      nombre: 'Peso Mexicano',
      simbolo: 'MX$',
      pais: 'México',
      decimales: 2,
      separadorMiles: ',',
      separadorDecimal: '.',
      posicionSimbolo: 'antes',
      espacioSimbolo: false,
      locale: 'es-MX',
      ejemploFormato: 'MX$1,234.56'
    },
    PEN: {
      codigo: 'PEN',
      nombre: 'Sol Peruano',
      simbolo: 'S/',
      pais: 'Perú',
      decimales: 2,
      separadorMiles: ',',
      separadorDecimal: '.',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-PE',
      ejemploFormato: 'S/ 1,234.56'
    },
    UYU: {
      codigo: 'UYU',
      nombre: 'Peso Uruguayo',
      simbolo: 'UY$',
      pais: 'Uruguay',
      decimales: 2,
      separadorMiles: '.',
      separadorDecimal: ',',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-UY',
      ejemploFormato: 'UY$ 1.234,56'
    },
    BOB: {
      codigo: 'BOB',
      nombre: 'Boliviano',
      simbolo: 'Bs.',
      pais: 'Bolivia',
      decimales: 2,
      separadorMiles: '.',
      separadorDecimal: ',',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-BO',
      ejemploFormato: 'Bs. 1.234,56'
    },
    PYG: {
      codigo: 'PYG',
      nombre: 'Guaraní Paraguayo',
      simbolo: '₲',
      pais: 'Paraguay',
      decimales: 0,
      separadorMiles: '.',
      separadorDecimal: ',',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-PY',
      ejemploFormato: '₲ 1.234.567'
    },
    VES: {
      codigo: 'VES',
      nombre: 'Bolívar Venezolano',
      simbolo: 'Bs.S',
      pais: 'Venezuela',
      decimales: 2,
      separadorMiles: '.',
      separadorDecimal: ',',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-VE',
      ejemploFormato: 'Bs.S 1.234.567,89'
    },
    GTQ: {
      codigo: 'GTQ',
      nombre: 'Quetzal Guatemalteco',
      simbolo: 'Q',
      pais: 'Guatemala',
      decimales: 2,
      separadorMiles: ',',
      separadorDecimal: '.',
      posicionSimbolo: 'antes',
      espacioSimbolo: false,
      locale: 'es-GT',
      ejemploFormato: 'Q1,234.56'
    },
    HNL: {
      codigo: 'HNL',
      nombre: 'Lempira Hondureña',
      simbolo: 'L',
      pais: 'Honduras',
      decimales: 2,
      separadorMiles: ',',
      separadorDecimal: '.',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-HN',
      ejemploFormato: 'L 1,234.56'
    },
    NIO: {
      codigo: 'NIO',
      nombre: 'Córdoba Nicaragüense',
      simbolo: 'C$',
      pais: 'Nicaragua',
      decimales: 2,
      separadorMiles: ',',
      separadorDecimal: '.',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-NI',
      ejemploFormato: 'C$ 1,234.56'
    },
    CRC: {
      codigo: 'CRC',
      nombre: 'Colón Costarricense',
      simbolo: '₡',
      pais: 'Costa Rica',
      decimales: 0,
      separadorMiles: '.',
      separadorDecimal: ',',
      posicionSimbolo: 'antes',
      espacioSimbolo: false,
      locale: 'es-CR',
      ejemploFormato: '₡1.234.567'
    },
    PAB: {
      codigo: 'PAB',
      nombre: 'Balboa Panameña',
      simbolo: 'B/.',
      pais: 'Panamá',
      decimales: 2,
      separadorMiles: ',',
      separadorDecimal: '.',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-PA',
      ejemploFormato: 'B/. 1,234.56'
    },
    DOP: {
      codigo: 'DOP',
      nombre: 'Peso Dominicano',
      simbolo: 'RD$',
      pais: 'República Dominicana',
      decimales: 2,
      separadorMiles: ',',
      separadorDecimal: '.',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-DO',
      ejemploFormato: 'RD$ 1,234.56'
    },
    CUP: {
      codigo: 'CUP',
      nombre: 'Peso Cubano',
      simbolo: '$',
      pais: 'Cuba',
      decimales: 2,
      separadorMiles: ',',
      separadorDecimal: '.',
      posicionSimbolo: 'antes',
      espacioSimbolo: true,
      locale: 'es-CU',
      ejemploFormato: '$ 1,234.56'
    },
    // === ESPAÑA Y EUROPA ===
    EUR: {
      codigo: 'EUR',
      nombre: 'Euro',
      simbolo: '€',
      pais: 'España',
      decimales: 2,
      separadorMiles: '.',
      separadorDecimal: ',',
      posicionSimbolo: 'despues',
      espacioSimbolo: true,
      locale: 'es-ES',
      ejemploFormato: '1.234,56 €'
    },
    // === ESTADOS UNIDOS (Mercado Hispano) ===
    USD: {
      codigo: 'USD',
      nombre: 'Dólar Estadounidense',
      simbolo: 'US$',
      pais: 'Estados Unidos',
      decimales: 2,
      separadorMiles: ',',
      separadorDecimal: '.',
      posicionSimbolo: 'antes',
      espacioSimbolo: false,
      locale: 'es-US',
      ejemploFormato: 'US$1,234.56'
    },
    // === GUINEA ECUATORIAL ===
    XAF: {
      codigo: 'XAF',
      nombre: 'Franco CFA',
      simbolo: 'FCFA',
      pais: 'Guinea Ecuatorial',
      decimales: 0,
      separadorMiles: '.',
      separadorDecimal: ',',
      posicionSimbolo: 'despues',
      espacioSimbolo: true,
      locale: 'es-GQ',
      ejemploFormato: '1.234.567 FCFA'
    }
  };

  // Configuración por defecto
  private readonly CONFIGURACION_DEFECTO: Required<OpcionesFormateo> = {
    moneda: 'CLP', // Chile por defecto
    mostrarSimbolo: true,
    decimales: undefined as any, // Se usa el por defecto de cada moneda
    formatoCorto: false,
    mostrarCodigo: false,
    forzarPositivo: false,
    autoDetectar: false
  };

  // Moneda por defecto global (se puede cambiar por configuración del usuario)
  private monedaPorDefecto: CodigoMoneda = 'CLP';

  /**
   * Transforma un valor numérico a formato de moneda hispanohablante
   * @param valor Valor numérico a formatear
   * @param codigoMoneda Código de moneda (ej: 'CLP', 'ARS', 'EUR')
   * @param opciones Opciones adicionales de formateo
   * @returns string Valor formateado como moneda
   */
  transform(valor: any, codigoMoneda?: CodigoMoneda, opciones?: Partial<OpcionesFormateo>): string {
    try {
      // Validar entrada
      if (!this.esValorValido(valor)) {
        return this.manejarValorInvalido(valor, codigoMoneda);
      }

      // Convertir a número
      const numero = this.convertirANumero(valor);
      
      // Determinar moneda a usar
      const monedaFinal = this.determinarMoneda(codigoMoneda, opciones);
      const config = this.CONFIGURACIONES_MONEDAS[monedaFinal];
      
      if (!config) {
        console.error(`Moneda no soportada: ${monedaFinal}`);
        return this.formatearConMonedaDefecto(numero);
      }

      // Aplicar configuración
      const opcionesFinales = { ...this.CONFIGURACION_DEFECTO, ...opciones, moneda: monedaFinal };
      
      // Formatear según tipo
      if (opcionesFinales.formatoCorto && Math.abs(numero) >= 1000000) {
        return this.formatearCorto(numero, config, opcionesFinales);
      }
      
      return this.formatearCompleto(numero, config, opcionesFinales);

    } catch (error) {
      console.error('Error en MonedaHispanaPipe:', error);
      return this.formatearConMonedaDefecto(0);
    }
  }

  /**
   * Determina qué moneda usar
   * @private
   */
  private determinarMoneda(codigoMoneda?: CodigoMoneda, opciones?: Partial<OpcionesFormateo>): CodigoMoneda {
    // 1. Código explícito en parámetro
    if (codigoMoneda && this.CONFIGURACIONES_MONEDAS[codigoMoneda]) {
      return codigoMoneda;
    }

    // 2. Código en opciones
    if (opciones?.moneda && this.CONFIGURACIONES_MONEDAS[opciones.moneda]) {
      return opciones.moneda;
    }

    // 3. Auto-detectar (implementación futura basada en geolocalización o configuración de usuario)
    if (opciones?.autoDetectar) {
      return this.detectarMonedaAutomaticamente();
    }

    // 4. Moneda por defecto
    return this.monedaPorDefecto;
  }

  /**
   * Detecta moneda automáticamente (implementación básica)
   * @private
   */
  private detectarMonedaAutomaticamente(): CodigoMoneda {
    // Implementación básica usando idioma del navegador
    const idioma = navigator.language || 'es-CL';
    
    const mapaIdiomas: Record<string, CodigoMoneda> = {
      'es-CL': 'CLP',
      'es-AR': 'ARS',
      'es-CO': 'COP',
      'es-MX': 'MXN',
      'es-PE': 'PEN',
      'es-UY': 'UYU',
      'es-BO': 'BOB',
      'es-PY': 'PYG',
      'es-VE': 'VES',
      'es-GT': 'GTQ',
      'es-HN': 'HNL',
      'es-NI': 'NIO',
      'es-CR': 'CRC',
      'es-PA': 'PAB',
      'es-DO': 'DOP',
      'es-CU': 'CUP',
      'es-ES': 'EUR',
      'es-US': 'USD',
      'es-GQ': 'XAF'
    };

    return mapaIdiomas[idioma] || this.monedaPorDefecto;
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

    return !isNaN(Number(valor)) && isFinite(Number(valor));
  }

  /**
   * Maneja valores inválidos
   * @private
   */
  private manejarValorInvalido(valor: any, codigoMoneda?: CodigoMoneda): string {
    const moneda = codigoMoneda || this.monedaPorDefecto;
    const config = this.CONFIGURACIONES_MONEDAS[moneda];
    const simbolo = config?.simbolo || '$';
    
    if (valor === null || valor === undefined) {
      return this.formatearConSimbolo('0', config);
    }
    
    if (typeof valor === 'string' && valor.trim() === '') {
      return this.formatearConSimbolo('0', config);
    }
    
    return 'Formato inválido';
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
      // Limpiar string de caracteres de formato
      const valorLimpio = valor
        .replace(/[€$₲₡]/g, '') // Símbolos de moneda
        .replace(/[A-Z]{2,4}\$?/g, '') // Códigos de moneda (AR$, US$, etc.)
        .replace(/\s/g, '') // Espacios
        .replace(/\./g, '') // Puntos (separadores de miles)
        .replace(/,/g, '.'); // Coma decimal a punto
      
      return parseFloat(valorLimpio);
    }
    
    return Number(valor);
  }

  /**
   * Formatea número en formato completo
   * @private
   */
  private formatearCompleto(numero: number, config: ConfiguracionMoneda, opciones: Required<OpcionesFormateo>): string {
    // Aplicar forzar positivo si está configurado
    const valorFinal = opciones.forzarPositivo ? Math.abs(numero) : numero;
    
    // Determinar decimales a usar
    const decimales = opciones.decimales !== undefined ? opciones.decimales : config.decimales;
    
    // Formatear con decimales
    const numeroFormateado = this.aplicarDecimales(Math.abs(valorFinal), decimales);
    
    // Aplicar separadores según configuración de la moneda
    const conSeparadores = this.aplicarSeparadores(numeroFormateado, config);
    
    // Manejar signo negativo
    const esNegativo = valorFinal < 0 && !opciones.forzarPositivo;
    
    // Agregar símbolo o código si está configurado
    let resultado = conSeparadores;
    
    if (opciones.mostrarSimbolo || opciones.mostrarCodigo) {
      const simboloAUsar = opciones.mostrarCodigo ? config.codigo : config.simbolo;
      resultado = this.aplicarSimbolo(conSeparadores, simboloAUsar, config);
    }
    
    // Aplicar signo negativo
    if (esNegativo) {
      resultado = `-${resultado}`;
    }
    
    return resultado;
  }

  /**
   * Formatea número en formato corto (1.5M, 2.3K, etc.)
   * @private
   */
  private formatearCorto(numero: number, config: ConfiguracionMoneda, opciones: Required<OpcionesFormateo>): string {
    const valorFinal = opciones.forzarPositivo ? Math.abs(numero) : numero;
    const simbolo = opciones.mostrarSimbolo ? 
      (opciones.mostrarCodigo ? config.codigo : config.simbolo) : '';
    
    const abs = Math.abs(valorFinal);
    let resultado = '';
    
    if (abs >= 1000000000) {
      // Miles de millones
      resultado = (valorFinal / 1000000000).toFixed(1) + 'B';
    } else if (abs >= 1000000) {
      // Millones
      resultado = (valorFinal / 1000000).toFixed(1) + 'M';
    } else if (abs >= 1000) {
      // Miles
      resultado = (valorFinal / 1000).toFixed(1) + 'K';
    } else {
      // Menor a 1000, formato normal
      return this.formatearCompleto(numero, config, { ...opciones, formatoCorto: false });
    }
    
    // Limpiar .0 innecesarios
    resultado = resultado.replace('.0', '');
    
    // Aplicar símbolo según posición
    if (simbolo) {
      if (config.posicionSimbolo === 'antes') {
        const espacio = config.espacioSimbolo ? ' ' : '';
        return `${simbolo}${espacio}${resultado}`;
      } else {
        const espacio = config.espacioSimbolo ? ' ' : '';
        return `${resultado}${espacio}${simbolo}`;
      }
    }
    
    return resultado;
  }

  /**
   * Aplica formato de decimales
   * @private
   */
  private aplicarDecimales(numero: number, decimales: number): string {
    return numero.toFixed(decimales);
  }

  /**
   * Aplica separadores según configuración de la moneda
   * @private
   */
  private aplicarSeparadores(numeroString: string, config: ConfiguracionMoneda): string {
    const partes = numeroString.split('.');
    const entero = partes[0];
    const decimal = partes[1];
    
    // Agregar separadores de miles
    const enteroConSeparadores = this.aplicarSeparadorMiles(entero, config.separadorMiles);
    
    if (decimal && decimal !== '00') {
      return `${enteroConSeparadores}${config.separadorDecimal}${decimal}`;
    }
    
    return enteroConSeparadores;
  }

  /**
   * Aplica separador de miles específico
   * @private
   */
  private aplicarSeparadorMiles(entero: string, separador: string): string {
    return entero.replace(/\B(?=(\d{3})+(?!\d))/g, separador);
  }

  /**
   * Aplica símbolo según configuración
   * @private
   */
  private aplicarSimbolo(numero: string, simbolo: string, config: ConfiguracionMoneda): string {
    const espacio = config.espacioSimbolo ? ' ' : '';
    
    if (config.posicionSimbolo === 'antes') {
      return `${simbolo}${espacio}${numero}`;
    } else {
      return `${numero}${espacio}${simbolo}`;
    }
  }

  /**
   * Formatea con símbolo (método auxiliar)
   * @private
   */
  private formatearConSimbolo(numero: string, config: ConfiguracionMoneda | undefined): string {
    if (!config) {
      return `$${numero}`;
    }
    return this.aplicarSimbolo(numero, config.simbolo, config);
  }

  /**
   * Formatea con moneda por defecto en caso de error
   * @private
   */
  private formatearConMonedaDefecto(numero: number): string {
    const config = this.CONFIGURACIONES_MONEDAS[this.monedaPorDefecto];
    return this.formatearCompleto(numero, config, this.CONFIGURACION_DEFECTO);
  }

  // ==================== MÉTODOS ESTÁTICOS PÚBLICOS ====================

  /**
   * Obtiene lista de todas las monedas soportadas
   * @returns ConfiguracionMoneda[] Lista de configuraciones de monedas
   */
  static obtenerMonedasSoportadas(): ConfiguracionMoneda[] {
    const pipe = new MonedaHispanaPipe();
    return Object.values(pipe.CONFIGURACIONES_MONEDAS);
  }

  /**
   * Obtiene configuración de una moneda específica
   * @param codigo Código de moneda
   * @returns ConfiguracionMoneda | null Configuración de la moneda
   */
  static obtenerConfiguracionMoneda(codigo: CodigoMoneda): ConfiguracionMoneda | null {
    const pipe = new MonedaHispanaPipe();
    return pipe.CONFIGURACIONES_MONEDAS[codigo] || null;
  }

  /**
   * Formatea valor usando el pipe programáticamente
   * @param valor Valor a formatear
   * @param moneda Código de moneda
   * @param opciones Opciones de formateo
   * @returns string Valor formateado
   */
  static formatear(valor: any, moneda?: CodigoMoneda, opciones?: Partial<OpcionesFormateo>): string {
    const pipe = new MonedaHispanaPipe();
    return pipe.transform(valor, moneda, opciones);
  }

  /**
   * Formatea como peso chileno
   * @param valor Valor a formatear
   * @returns string Valor formateado
   */
  static formatearPesoChileno(valor: any): string {
    return MonedaHispanaPipe.formatear(valor, 'CLP');
  }

  /**
   * Formatea como peso argentino
   * @param valor Valor a formatear
   * @returns string Valor formateado
   */
  static formatearPesoArgentino(valor: any): string {
    return MonedaHispanaPipe.formatear(valor, 'ARS');
  }

  /**
   * Formatea como peso mexicano
   * @param valor Valor a formatear
   * @returns string Valor formateado
   */
  static formatearPesoMexicano(valor: any): string {
    return MonedaHispanaPipe.formatear(valor, 'MXN');
  }

  /**
   * Formatea como euro (España)
   * @param valor Valor a formatear
   * @returns string Valor formateado
   */
  static formatearEuro(valor: any): string {
    return MonedaHispanaPipe.formatear(valor, 'EUR');
  }

  /**
   * Formatea en formato corto
   * @param valor Valor a formatear
   * @param moneda Código de moneda
   * @returns string Valor formateado en formato corto
   */
  static formatearCorto(valor: any, moneda: CodigoMoneda = 'CLP'): string {
    return MonedaHispanaPipe.formatear(valor, moneda, { formatoCorto: true });
  }

  /**
   * Obtiene monedas por región
   * @param region Región a filtrar
   * @returns ConfiguracionMoneda[] Monedas de la región
   */
  static obtenerMonedasPorRegion(region: 'latinoamerica' | 'europa' | 'norteamerica' | 'africa'): ConfiguracionMoneda[] {
    const todasLasMonedas = MonedaHispanaPipe.obtenerMonedasSoportadas();
    
    const mapasRegion: Record<string, string[]> = {
      latinoamerica: ['Chile', 'Argentina', 'Colombia', 'México', 'Perú', 'Uruguay', 'Bolivia', 'Paraguay', 'Venezuela', 'Guatemala', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panamá', 'República Dominicana', 'Cuba'],
      europa: ['España'],
      norteamerica: ['Estados Unidos'],
      africa: ['Guinea Ecuatorial']
    };

    const paisesRegion = mapasRegion[region] || [];
    return todasLasMonedas.filter(moneda => paisesRegion.includes(moneda.pais));
  }

  /**
   * Parsea un valor formateado de vuelta a número
   * @param valorFormateado String formateado como moneda
   * @param moneda Código de moneda para contexto
   * @returns number Valor numérico
   */
  static parsear(valorFormateado: string, moneda?: CodigoMoneda): number {
    if (!valorFormateado || typeof valorFormateado !== 'string') {
      return 0;
    }

    try {
      const pipe = new MonedaHispanaPipe();
      const config = moneda ? pipe.CONFIGURACIONES_MONEDAS[moneda] : null;
      
      let valorLimpio = valorFormateado;
      
// Remover símbolos específicos de la moneda si se conoce
      if (config) {
        valorLimpio = valorLimpio.replace(new RegExp(config.simbolo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
        valorLimpio = valorLimpio.replace(new RegExp(config.codigo, 'g'), '');
        
        // Limpiar separadores específicos de la moneda
        if (config.separadorMiles === '.') {
          // Si usa punto como separador de miles, remover puntos excepto el último (decimal)
          const partes = valorLimpio.split('.');
          if (partes.length > 1) {
            const entero = partes.slice(0, -1).join('');
            const decimal = partes[partes.length - 1];
            valorLimpio = `${entero}.${decimal}`;
          }
        } else {
          // Si usa coma como separador de miles, convertir coma decimal a punto
          valorLimpio = valorLimpio.replace(/,/g, '.');
        }
      } else {
        // Limpieza genérica para formato desconocido
        valorLimpio = valorLimpio
          .replace(/[€$₲₡]/g, '') // Símbolos comunes
          .replace(/[A-Z]{2,4}\$?/g, '') // Códigos de moneda
          .replace(/\s/g, '') // Espacios
          .replace(/\./g, '') // Puntos (asumimos separadores de miles)
          .replace(/,/g, '.'); // Coma decimal a punto
      }
      
      // Remover sufijos de formato corto
      valorLimpio = valorLimpio.replace(/[KMB]/gi, '');
      
      const numero = parseFloat(valorLimpio);
      return isNaN(numero) ? 0 : numero;
    } catch (error) {
      console.error('Error parseando valor formateado:', error);
      return 0;
    }
  }

  /**
   * Valida si un string tiene formato de moneda válido
   * @param valor String a validar
   * @param moneda Código de moneda para validación específica
   * @returns boolean True si tiene formato válido
   */
  static esFormatoValido(valor: string, moneda?: CodigoMoneda): boolean {
    if (!valor || typeof valor !== 'string') {
      return false;
    }

    const pipe = new MonedaHispanaPipe();
    const config = moneda ? pipe.CONFIGURACIONES_MONEDAS[moneda] : null;
    
    if (config) {
      // Validación específica para la moneda
      const simboloEscapado = config.simbolo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patronEspecifico = new RegExp(
        `^${simboloEscapado}?\\s?\\d{1,3}(\\${config.separadorMiles}\\d{3})*(\\${config.separadorDecimal}\\d{1,2})?\\s?${simboloEscapado}?$`
      );
      
      if (patronEspecifico.test(valor.trim())) {
        return true;
      }
    }

    // Validación genérica
    const patronGenerico = /^[\$€₲₡]?\s?\d{1,3}([.,]\d{3})*([.,]\d{1,2})?\s?[\$€₲₡]?$/;
    const patronCorto = /^[\$€₲₡]?\s?\d+(\.\d+)?[KMB]?\s?[\$€₲₡]?$/i;
    
    const valorLimpio = valor.trim();
    return patronGenerico.test(valorLimpio) || patronCorto.test(valorLimpio);
  }

  /**
   * Convierte entre diferentes monedas (requiere tasas de cambio)
   * @param valor Valor a convertir
   * @param monedaOrigen Moneda de origen
   * @param monedaDestino Moneda de destino
   * @param tasaCambio Tasa de cambio (opcional, por defecto 1:1)
   * @returns string Valor convertido y formateado
   */
  static convertir(
    valor: any, 
    monedaOrigen: CodigoMoneda, 
    monedaDestino: CodigoMoneda, 
    tasaCambio: number = 1
  ): string {
    const valorNumerico = typeof valor === 'number' ? valor : MonedaHispanaPipe.parsear(valor.toString(), monedaOrigen);
    const valorConvertido = valorNumerico * tasaCambio;
    return MonedaHispanaPipe.formatear(valorConvertido, monedaDestino);
  }

  /**
   * Obtiene ejemplo de formato para una moneda
   * @param moneda Código de moneda
   * @returns string Ejemplo de formato
   */
  static obtenerEjemploFormato(moneda: CodigoMoneda): string {
    const config = MonedaHispanaPipe.obtenerConfiguracionMoneda(moneda);
    return config ? config.ejemploFormato : 'Formato no disponible';
  }

  /**
   * Establece moneda por defecto global
   * @param moneda Código de moneda a establecer como predeterminada
   */
  public establecerMonedaPorDefecto(moneda: CodigoMoneda): void {
    if (this.CONFIGURACIONES_MONEDAS[moneda]) {
      this.monedaPorDefecto = moneda;
    } else {
      console.warn(`Moneda no soportada: ${moneda}. Manteniendo ${this.monedaPorDefecto}`);
    }
  }

  /**
   * Obtiene la moneda por defecto actual
   * @returns CodigoMoneda Moneda por defecto
   */
  public obtenerMonedaPorDefecto(): CodigoMoneda {
    return this.monedaPorDefecto;
  }

  /**
   * Formatea diferencia (positiva/negativa) con colores y símbolos
   * @param valor Valor a formatear
   * @param moneda Código de moneda
   * @returns object Objeto con valor formateado y clase CSS
   */
  static formatearDiferencia(valor: any, moneda: CodigoMoneda = 'CLP'): { 
    texto: string; 
    clase: string; 
    icono: string;
    esPositivo: boolean;
  } {
    const numero = Number(valor);
    const valorAbsoluto = Math.abs(numero);
    const valorFormateado = MonedaHispanaPipe.formatear(valorAbsoluto, moneda);
    
    if (numero > 0) {
      return {
        texto: `+${valorFormateado}`,
        clase: 'text-success',
        icono: 'arrow-up',
        esPositivo: true
      };
    } else if (numero < 0) {
      return {
        texto: `-${valorFormateado}`,
        clase: 'text-danger',
        icono: 'arrow-down',
        esPositivo: false
      };
    } else {
      return {
        texto: valorFormateado,
        clase: 'text-muted',
        icono: 'remove',
        esPositivo: false
      };
    }
  }

  /**
   * Formatea múltiples valores con la misma moneda
   * @param valores Array de valores a formatear
   * @param moneda Código de moneda
   * @param opciones Opciones de formateo
   * @returns string[] Array de valores formateados
   */
  static formatearMultiples(
    valores: any[], 
    moneda: CodigoMoneda = 'CLP', 
    opciones?: Partial<OpcionesFormateo>
  ): string[] {
    return valores.map(valor => MonedaHispanaPipe.formatear(valor, moneda, opciones));
  }

  /**
   * Calcula y formatea total de un array de valores
   * @param valores Array de valores a sumar
   * @param moneda Código de moneda
   * @param opciones Opciones de formateo
   * @returns string Total formateado
   */
  static calcularYFormatearTotal(
    valores: any[], 
    moneda: CodigoMoneda = 'CLP', 
    opciones?: Partial<OpcionesFormateo>
  ): string {
    const total = valores.reduce((sum, valor) => {
      const numero = typeof valor === 'number' ? valor : MonedaHispanaPipe.parsear(valor.toString(), moneda);
      return sum + numero;
    }, 0);
    
    return MonedaHispanaPipe.formatear(total, moneda, opciones);
  }

  /**
   * Obtiene información de configuración regional
   * @param pais Nombre del país
   * @returns ConfiguracionMoneda | null Configuración de la moneda del país
   */
  static obtenerMonedaPorPais(pais: string): ConfiguracionMoneda | null {
    const monedas = MonedaHispanaPipe.obtenerMonedasSoportadas();
    return monedas.find(moneda => 
      moneda.pais.toLowerCase() === pais.toLowerCase()
    ) || null;
  }

  /**
   * Busca monedas por nombre o código
   * @param busqueda Término de búsqueda
   * @returns ConfiguracionMoneda[] Monedas que coinciden con la búsqueda
   */
  static buscarMonedas(busqueda: string): ConfiguracionMoneda[] {
    const monedas = MonedaHispanaPipe.obtenerMonedasSoportadas();
    const termino = busqueda.toLowerCase();
    
    return monedas.filter(moneda => 
      moneda.nombre.toLowerCase().includes(termino) ||
      moneda.codigo.toLowerCase().includes(termino) ||
      moneda.pais.toLowerCase().includes(termino) ||
      moneda.simbolo.toLowerCase().includes(termino)
    );
  }

  /**
   * Valida que una moneda sea soportada
   * @param codigo Código de moneda a validar
   * @returns boolean True si la moneda es soportada
   */
  static esMonedasoportada(codigo: string): codigo is CodigoMoneda {
    const pipe = new MonedaHispanaPipe();
    return Object.prototype.hasOwnProperty.call(pipe.CONFIGURACIONES_MONEDAS, codigo);
  }

  /**
   * Obtiene el símbolo de una moneda
   * @param moneda Código de moneda
   * @returns string Símbolo de la moneda
   */
  static obtenerSimbolo(moneda: CodigoMoneda): string {
    const config = MonedaHispanaPipe.obtenerConfiguracionMoneda(moneda);
    return config ? config.simbolo : '$';
  }

  /**
   * Obtiene información completa de debug del pipe
   * @returns object Información de debug
   */
  static obtenerInfoDebug(): object {
    const pipe = new MonedaHispanaPipe();
    const monedas = MonedaHispanaPipe.obtenerMonedasSoportadas();
    
    return {
      version: '2.0.0',
      totalMonedasSoportadas: monedas.length,
      monedaPorDefecto: pipe.monedaPorDefecto,
      monedasPorRegion: {
        latinoamerica: MonedaHispanaPipe.obtenerMonedasPorRegion('latinoamerica').length,
        europa: MonedaHispanaPipe.obtenerMonedasPorRegion('europa').length,
        norteamerica: MonedaHispanaPipe.obtenerMonedasPorRegion('norteamerica').length,
        africa: MonedaHispanaPipe.obtenerMonedasPorRegion('africa').length
      },
      codigosSoportados: monedas.map(m => m.codigo),
      ejemplosFormato: monedas.reduce((acc, moneda) => {
        acc[moneda.codigo] = moneda.ejemploFormato;
        return acc;
      }, {} as Record<string, string>),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Genera reporte de compatibilidad con locales del navegador
   * @returns object Reporte de compatibilidad
   */
  static generarReporteCompatibilidad(): object {
    const monedas = MonedaHispanaPipe.obtenerMonedasSoportadas();
    const localesSoportados: string[] = [];
    const localesNoSoportados: string[] = [];
    
    monedas.forEach(moneda => {
      try {
        // Intentar usar el locale con Intl.NumberFormat
        const formatter = new Intl.NumberFormat(moneda.locale, {
          style: 'currency',
          currency: moneda.codigo
        });
        
        // Si no lanza error, el locale es soportado
        formatter.format(1234.56);
        localesSoportados.push(moneda.locale);
      } catch (error) {
        localesNoSoportados.push(moneda.locale);
      }
    });
    
    return {
      totalMonedas: monedas.length,
      localesSoportados: localesSoportados.length,
      localesNoSoportados: localesNoSoportados.length,
      detalleLocales: {
        soportados: localesSoportados,
        noSoportados: localesNoSoportados
      },
      porcentajeCompatibilidad: Math.round((localesSoportados.length / monedas.length) * 100),
      timestamp: new Date().toISOString()
    };
  }
}

// Exportar tipos para uso en otros archivos
export type { OpcionesFormateo, ConfiguracionMoneda };