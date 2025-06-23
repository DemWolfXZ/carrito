/**
 * Modelo de datos para países soportados en la aplicación Carrito
 * Incluye información de moneda, formato y banderas desde CDN
 * 
 * @author DemWolf
 * @version 1.0
 */

// Interface principal para definir la estructura de un país
export interface Pais {
  codigo: string;           // Código ISO de 2 letras (AR, CL, US, etc.)
  nombre: string;           // Nombre completo del país en español
  moneda: string;           // Código ISO de la moneda (ARS, CLP, USD, etc.)
  simboloMoneda: string;    // Símbolo visual de la moneda ($, €, etc.)
  bandera: string;          // URL de la bandera desde CDN
  formatoMoneda: string;    // Formato para mostrar precios (ej: $ #,##0.00)
  activo: boolean;          // Si el país está disponible para selección
}

// Enum con los códigos de países soportados para validación
export enum CodigosPaises {
  ARGENTINA = 'AR',
  BOLIVIA = 'BO', 
  CHILE = 'CL',
  COLOMBIA = 'CO',
  COSTA_RICA = 'CR',
  CUBA = 'CU',
  ECUADOR = 'EC',
  EL_SALVADOR = 'SV',
  ESPANA = 'ES',
  GUATEMALA = 'GT',
  HONDURAS = 'HN',
  MEXICO = 'MX',
  NICARAGUA = 'NI',
  PANAMA = 'PA',
  PARAGUAY = 'PY',
  PERU = 'PE',
  REPUBLICA_DOMINICANA = 'DO',
  URUGUAY = 'UY',
  VENEZUELA = 'VE',
  ESTADOS_UNIDOS = 'US'
}

// Enum con los códigos de monedas soportadas
export enum CodigosMonedas {
  PESO_ARGENTINO = 'ARS',
  BOLIVIANO = 'BOB',
  PESO_CHILENO = 'CLP', 
  PESO_COLOMBIANO = 'COP',
  COLON_COSTARRICENSE = 'CRC',
  PESO_CUBANO = 'CUP',
  DOLAR_ESTADOUNIDENSE = 'USD',
  EURO = 'EUR',
  QUETZAL = 'GTQ',
  LEMPIRA = 'HNL',
  PESO_MEXICANO = 'MXN',
  CORDOBA = 'NIO',
  BALBOA = 'PAB',
  GUARANI = 'PYG',
  SOL = 'PEN',
  PESO_DOMINICANO = 'DOP',
  PESO_URUGUAYO = 'UYU',
  BOLIVAR_SOBERANO = 'VES'
}

// Constante con todos los países soportados por la aplicación
export const PAISES_SOPORTADOS: Pais[] = [
  {
    codigo: CodigosPaises.ARGENTINA,
    nombre: 'Argentina',
    moneda: CodigosMonedas.PESO_ARGENTINO,
    simboloMoneda: '$',
    bandera: 'https://flagcdn.com/w80/ar.png',
    formatoMoneda: '$ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.BOLIVIA,
    nombre: 'Bolivia',
    moneda: CodigosMonedas.BOLIVIANO,
    simboloMoneda: 'Bs',
    bandera: 'https://flagcdn.com/w80/bo.png',
    formatoMoneda: 'Bs #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.CHILE,
    nombre: 'Chile',
    moneda: CodigosMonedas.PESO_CHILENO,
    simboloMoneda: '$',
    bandera: 'https://flagcdn.com/w80/cl.png',
    formatoMoneda: '$ #,##0',
    activo: true
  },
  {
    codigo: CodigosPaises.COLOMBIA,
    nombre: 'Colombia',
    moneda: CodigosMonedas.PESO_COLOMBIANO,
    simboloMoneda: '$',
    bandera: 'https://flagcdn.com/w80/co.png',
    formatoMoneda: '$ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.COSTA_RICA,
    nombre: 'Costa Rica',
    moneda: CodigosMonedas.COLON_COSTARRICENSE,
    simboloMoneda: '₡',
    bandera: 'https://flagcdn.com/w80/cr.png',
    formatoMoneda: '₡ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.CUBA,
    nombre: 'Cuba',
    moneda: CodigosMonedas.PESO_CUBANO,
    simboloMoneda: '$',
    bandera: 'https://flagcdn.com/w80/cu.png',
    formatoMoneda: '$ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.ECUADOR,
    nombre: 'Ecuador',
    moneda: CodigosMonedas.DOLAR_ESTADOUNIDENSE,
    simboloMoneda: 'US$',
    bandera: 'https://flagcdn.com/w80/ec.png',
    formatoMoneda: 'US$ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.EL_SALVADOR,
    nombre: 'El Salvador',
    moneda: CodigosMonedas.DOLAR_ESTADOUNIDENSE,
    simboloMoneda: 'US$',
    bandera: 'https://flagcdn.com/w80/sv.png',
    formatoMoneda: 'US$ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.ESPANA,
    nombre: 'España',
    moneda: CodigosMonedas.EURO,
    simboloMoneda: '€',
    bandera: 'https://flagcdn.com/w80/es.png',
    formatoMoneda: '€ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.GUATEMALA,
    nombre: 'Guatemala',
    moneda: CodigosMonedas.QUETZAL,
    simboloMoneda: 'Q',
    bandera: 'https://flagcdn.com/w80/gt.png',
    formatoMoneda: 'Q #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.HONDURAS,
    nombre: 'Honduras',
    moneda: CodigosMonedas.LEMPIRA,
    simboloMoneda: 'L',
    bandera: 'https://flagcdn.com/w80/hn.png',
    formatoMoneda: 'L #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.MEXICO,
    nombre: 'México',
    moneda: CodigosMonedas.PESO_MEXICANO,
    simboloMoneda: '$',
    bandera: 'https://flagcdn.com/w80/mx.png',
    formatoMoneda: '$ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.NICARAGUA,
    nombre: 'Nicaragua',
    moneda: CodigosMonedas.CORDOBA,
    simboloMoneda: 'C$',
    bandera: 'https://flagcdn.com/w80/ni.png',
    formatoMoneda: 'C$ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.PANAMA,
    nombre: 'Panamá',
    moneda: CodigosMonedas.BALBOA,
    simboloMoneda: 'B/.',
    bandera: 'https://flagcdn.com/w80/pa.png',
    formatoMoneda: 'B/. #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.PARAGUAY,
    nombre: 'Paraguay',
    moneda: CodigosMonedas.GUARANI,
    simboloMoneda: '₲',
    bandera: 'https://flagcdn.com/w80/py.png',
    formatoMoneda: '₲ #,##0',
    activo: true
  },
  {
    codigo: CodigosPaises.PERU,
    nombre: 'Perú',
    moneda: CodigosMonedas.SOL,
    simboloMoneda: 'S/',
    bandera: 'https://flagcdn.com/w80/pe.png',
    formatoMoneda: 'S/ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.REPUBLICA_DOMINICANA,
    nombre: 'República Dominicana',
    moneda: CodigosMonedas.PESO_DOMINICANO,
    simboloMoneda: 'RD$',
    bandera: 'https://flagcdn.com/w80/do.png',
    formatoMoneda: 'RD$ #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.URUGUAY,
    nombre: 'Uruguay',
    moneda: CodigosMonedas.PESO_URUGUAYO,
    simboloMoneda: '$U',
    bandera: 'https://flagcdn.com/w80/uy.png',
    formatoMoneda: '$U #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.VENEZUELA,
    nombre: 'Venezuela',
    moneda: CodigosMonedas.BOLIVAR_SOBERANO,
    simboloMoneda: 'Bs.',
    bandera: 'https://flagcdn.com/w80/ve.png',
    formatoMoneda: 'Bs. #,##0.00',
    activo: true
  },
  {
    codigo: CodigosPaises.ESTADOS_UNIDOS,
    nombre: 'Estados Unidos',
    moneda: CodigosMonedas.DOLAR_ESTADOUNIDENSE,
    simboloMoneda: 'US$',
    bandera: 'https://flagcdn.com/w80/us.png',
    formatoMoneda: 'US$ #,##0.00',
    activo: true
  }
];

// Funciones utilitarias para trabajar con países

/**
 * Buscar un país por su código ISO
 * @param codigo Código ISO del país (ej: 'AR', 'CL')
 * @returns País encontrado o null si no existe
 */
export function buscarPaisPorCodigo(codigo: string): Pais | null {
  return PAISES_SOPORTADOS.find(pais => pais.codigo === codigo.toUpperCase()) || null;
}

/**
 * Buscar países que usan una moneda específica
 * @param moneda Código de la moneda (ej: 'USD', 'EUR')
 * @returns Array de países que usan esa moneda
 */
export function buscarPaisesPorMoneda(moneda: string): Pais[] {
  return PAISES_SOPORTADOS.filter(pais => pais.moneda === moneda.toUpperCase());
}

/**
 * Obtener lista de países activos (disponibles para selección)
 * @returns Array de países activos
 */
export function obtenerPaisesActivos(): Pais[] {
  return PAISES_SOPORTADOS.filter(pais => pais.activo);
}

/**
 * Validar si un código de país es válido y soportado
 * @param codigo Código ISO del país
 * @returns true si el país es válido y está activo
 */
export function validarCodigoPais(codigo: string): boolean {
  const pais = buscarPaisPorCodigo(codigo);
  return pais !== null && pais.activo;
}

/**
 * Obtener información de formato de moneda para un país
 * @param codigoPais Código ISO del país
 * @returns Objeto con información de moneda o null si no existe
 */
export function obtenerInfoMoneda(codigoPais: string): { moneda: string; simbolo: string; formato: string } | null {
  const pais = buscarPaisPorCodigo(codigoPais);
  if (!pais) return null;
  
  return {
    moneda: pais.moneda,
    simbolo: pais.simboloMoneda,
    formato: pais.formatoMoneda
  };
}