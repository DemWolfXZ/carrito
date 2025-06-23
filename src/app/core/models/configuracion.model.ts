/**
 * Modelo de datos para la configuración general de la aplicación Carrito
 * Maneja configuraciones globales, versionado y migración de datos
 * 
 * @author DemWolf
 * @version 1.0
 */

// Interface principal de configuración de la aplicación
export interface ConfiguracionApp {
  version: string;                     // Versión actual de la aplicación
  versionDatos: string;                // Versión del esquema de datos
  primerInicio: boolean;               // Si es la primera vez que se abre la app
  fechaInstalacion: Date;              // Fecha de primera instalación
  ultimaActualizacion: Date;           // Última vez que se actualizó la configuración
  configuracionCompleta: boolean;      // Si se completó la configuración inicial
  configuraciones: ConfiguracionesGlobales; // Configuraciones globales de la app
  limites: LimitesAplicacion;          // Límites y restricciones de la aplicación
  seguridad: ConfiguracionSeguridad;   // Configuraciones de seguridad
  mantenimiento: ConfiguracionMantenimiento; // Configuraciones de mantenimiento
}

// Configuraciones globales de la aplicación
export interface ConfiguracionesGlobales {
  // Configuraciones de límites de uso
  maxComprasPorMes: number;            // Máximo 2 compras por mes
  duracionMaximaSesion: number;        // 24 horas en milisegundos
  maxProductosPorSesion: number;       // Máximo productos por sesión de compra
  
  // Configuraciones de notificaciones
  horasAntesExpiracion: number[];      // [20, 23] horas para notificar antes de expirar
  intervaloRespaldo: number;           // Intervalo de respaldo automático (minutos)
  
  // Configuraciones de moneda y formato
  decimalesMoneda: number;             // Decimales por defecto (2)
  separadorMiles: string;              // Separador de miles (',')
  separadorDecimal: string;            // Separador decimal ('.')
  
  // Configuraciones de interfaz
  tiempoAnimaciones: number;           // Duración de animaciones (ms)
  tamanoMaximoTexto: number;           // Caracteres máximos en campos de texto
  timeoutInactividad: number;          // Tiempo de inactividad antes de bloqueo (solo donaciones)
}

// Límites y restricciones de la aplicación
export interface LimitesAplicacion {
  // Límites de datos
  maxCaracteresNombre: number;         // 30 caracteres para nombre de usuario
  maxCaracteresProducto: number;       // 100 caracteres para nombre de producto
  maxCaracteresSupermercado: number;   // 50 caracteres para nombre de supermercado
  maxCaracteresNotas: number;          // 200 caracteres para notas
  
  // Límites de valores numéricos
  maxPrecioProducto: number;           // Precio máximo por producto
  maxCantidadProducto: number;         // 100 unidades máximo por producto
  maxPresupuestoSesion: number;        // Presupuesto máximo por sesión
  
  // Límites de tiempo
  minTiempoEntreSesiones: number;      // Tiempo mínimo entre sesiones (minutos)
  maxDiasHistorial: number;            // Días de historial a mantener
  maxSesionesAlmacenadas: number;      // Máximo de sesiones a mantener
}

// Configuraciones de seguridad
export interface ConfiguracionSeguridad {
  // Encriptación
  algoritmoEncriptacion: string;       // 'AES-256-GCM'
  longitudClaveEncriptacion: number;   // 256 bits
  iteracionesPBKDF2: number;          // 10,000 iteraciones para derivación de claves
  
  // Validaciones
  habilitarSanitizacionXSS: boolean;   // Sanitización automática de inputs
  habilitarValidacionSQL: boolean;     // Validación contra inyección SQL
  habilitarLogSeguridad: boolean;      // Logging de eventos de seguridad
  
  // Autenticación
  intentosMaximosPIN: number;          // 3 intentos máximos para PIN
  tiempoBloqueoPIN: number;            // 5 minutos de bloqueo tras fallos
  longitudPIN: number;                 // 6 dígitos obligatorios
  
  // Integridad
  verificarIntegridad: boolean;        // Verificar integridad de datos al cargar
  hashearDatosSensibles: boolean;      // Hashear datos críticos
  respaldoEncriptado: boolean;         // Encriptar respaldos automáticos
}

// Configuraciones de mantenimiento
export interface ConfiguracionMantenimiento {
  // Limpieza automática
  limpiezaAutomatica: boolean;         // Limpieza automática de datos antiguos
  frecuenciaLimpieza: number;          // Días entre limpiezas automáticas
  mantenerUltimasNSesiones: number;    // Mantener últimas N sesiones siempre
  
  // Respaldos
  respaldoAutomatico: boolean;         // Respaldo automático habilitado
  frecuenciaRespaldo: number;          // Horas entre respaldos
  ubicacionRespaldo: string;           // Ubicación de archivos de respaldo
  maxRespaldosConservados: number;     // Máximo de respaldos a conservar
  
  // Optimización
  optimizarBaseDatos: boolean;         // Optimización automática de BD
  frecuenciaOptimizacion: number;      // Días entre optimizaciones
  comprimirDatos: boolean;             // Comprimir datos al almacenar
}

// Configuración inicial por defecto para nueva instalación
export const CONFIGURACION_INICIAL: ConfiguracionApp = {
  version: '1.0.0',
  versionDatos: '1.0.0',
  primerInicio: true,
  fechaInstalacion: new Date(),
  ultimaActualizacion: new Date(),
  configuracionCompleta: false,
  
  configuraciones: {
    // Límites de uso
    maxComprasPorMes: 2,
    duracionMaximaSesion: 24 * 60 * 60 * 1000, // 24 horas en ms
    maxProductosPorSesion: 200,
    
    // Notificaciones
    horasAntesExpiracion: [20, 23], // 4 horas y 1 hora antes
    intervaloRespaldo: 60, // Cada hora
    
    // Formato de moneda
    decimalesMoneda: 2,
    separadorMiles: ',',
    separadorDecimal: '.',
    
    // Interfaz
    tiempoAnimaciones: 300, // 300ms
    tamanoMaximoTexto: 200,
    timeoutInactividad: 5 * 60 * 1000 // 5 minutos para donaciones
  },
  
  limites: {
    // Límites de texto
    maxCaracteresNombre: 30,
    maxCaracteresProducto: 100,
    maxCaracteresSupermercado: 50,
    maxCaracteresNotas: 200,
    
    // Límites numéricos
    maxPrecioProducto: 1000000, // 1 millón en moneda local
    maxCantidadProducto: 100,
    maxPresupuestoSesion: 10000000, // 10 millones en moneda local
    
    // Límites temporales
    minTiempoEntreSesiones: 1, // 1 minuto mínimo
    maxDiasHistorial: 365, // 1 año de historial
    maxSesionesAlmacenadas: 50 // Máximo 50 sesiones guardadas
  },
  
  seguridad: {
    // Encriptación
    algoritmoEncriptacion: 'AES-256-GCM',
    longitudClaveEncriptacion: 256,
    iteracionesPBKDF2: 10000,
    
    // Validaciones
    habilitarSanitizacionXSS: true,
    habilitarValidacionSQL: true,
    habilitarLogSeguridad: true,
    
    // Autenticación
    intentosMaximosPIN: 3,
    tiempoBloqueoPIN: 5 * 60 * 1000, // 5 minutos
    longitudPIN: 6,
    
    // Integridad
    verificarIntegridad: true,
    hashearDatosSensibles: true,
    respaldoEncriptado: true
  },
  
  mantenimiento: {
    // Limpieza
    limpiezaAutomatica: true,
    frecuenciaLimpieza: 7, // Cada semana
    mantenerUltimasNSesiones: 10,
    
    // Respaldos
    respaldoAutomatico: true,
    frecuenciaRespaldo: 24, // Cada día
    ubicacionRespaldo: 'respaldos/',
    maxRespaldosConservados: 7, // Una semana de respaldos
    
    // Optimización
    optimizarBaseDatos: true,
    frecuenciaOptimizacion: 30, // Cada mes
    comprimirDatos: true
  }
};

// Enums para configuraciones

// Tipos de configuración que se pueden actualizar
export enum TipoConfiguracion {
  GLOBALES = 'globales',
  LIMITES = 'limites',
  SEGURIDAD = 'seguridad',
  MANTENIMIENTO = 'mantenimiento'
}

// Estados de la configuración
export enum EstadoConfiguracion {
  INICIAL = 'inicial',           // Primera instalación
  CONFIGURANDO = 'configurando', // En proceso de configuración inicial
  COMPLETA = 'completa',         // Configuración completada
  MIGRANDO = 'migrando',         // Migrando a nueva versión
  ERROR = 'error'                // Error en configuración
}

// Interface para migración de configuraciones
export interface MigracionConfiguracion {
  versionOrigen: string;         // Versión desde la cual se migra
  versionDestino: string;        // Versión a la cual se migra
  fechaMigracion: Date;          // Cuándo se realizó la migración
  cambiosAplicados: string[];    // Lista de cambios aplicados
  respaldoAnterior: string;      // Ubicación del respaldo de configuración anterior
}

// Interface para actualización de configuración
export interface ActualizacionConfiguracion {
  tipo: TipoConfiguracion;       // Tipo de configuración a actualizar
  configuraciones: any;         // Nuevas configuraciones
  forzarActualizacion?: boolean; // Si forzar la actualización sin validaciones
}

// Funciones utilitarias para configuración

/**
 * Crear configuración inicial para nueva instalación
 * @returns Configuración inicial completa
 */
export function crearConfiguracionInicial(): ConfiguracionApp {
  return {
    ...CONFIGURACION_INICIAL,
    fechaInstalacion: new Date(),
    ultimaActualizacion: new Date()
  };
}

/**
 * Validar que la configuración sea válida
 * @param config Configuración a validar
 * @returns true si la configuración es válida
 */
export function validarConfiguracion(config: ConfiguracionApp): boolean {
  // Validar campos obligatorios
  if (!config.version || !config.versionDatos) {
    return false;
  }
  
  // Validar que las fechas sean válidas
  if (!(config.fechaInstalacion instanceof Date) || !(config.ultimaActualizacion instanceof Date)) {
    return false;
  }
  
  // Validar límites básicos
  if (config.configuraciones.maxComprasPorMes !== 2) {
    return false; // Debe ser exactamente 2
  }
  
  if (config.configuraciones.duracionMaximaSesion !== 24 * 60 * 60 * 1000) {
    return false; // Debe ser exactamente 24 horas
  }
  
  return true;
}

/**
 * Obtener estado actual de la configuración
 * @param config Configuración a evaluar
 * @returns Estado de la configuración
 */
export function obtenerEstadoConfiguracion(config: ConfiguracionApp): EstadoConfiguracion {
  if (!config.configuracionCompleta && config.primerInicio) {
    return EstadoConfiguracion.INICIAL;
  }
  
  if (!config.configuracionCompleta) {
    return EstadoConfiguracion.CONFIGURANDO;
  }
  
  return EstadoConfiguracion.COMPLETA;
}

/**
 * Verificar si se necesita migración de datos
 * @param versionActual Versión actual de la app
 * @param versionDatos Versión de los datos almacenados
 * @returns true si se necesita migración
 */
export function necesitaMigracion(versionActual: string, versionDatos: string): boolean {
  // Simple comparación de versiones (se puede hacer más sofisticada)
  return versionActual !== versionDatos;
}

/**
 * Actualizar timestamp de última actualización
 * @param config Configuración a actualizar
 * @returns Configuración con timestamp actualizado
 */
export function actualizarTimestamp(config: ConfiguracionApp): ConfiguracionApp {
  return {
    ...config,
    ultimaActualizacion: new Date()
  };
}

/**
 * Marcar configuración como completa
 * @param config Configuración a actualizar
 * @returns Configuración marcada como completa
 */
export function marcarConfiguracionCompleta(config: ConfiguracionApp): ConfiguracionApp {
  return {
    ...config,
    primerInicio: false,
    configuracionCompleta: true,
    ultimaActualizacion: new Date()
  };
}

/**
 * Generar configuración de respaldo antes de cambios críticos
 * @param config Configuración actual
 * @returns String JSON de la configuración para respaldo
 */
export function generarRespaldoConfiguracion(config: ConfiguracionApp): string {
  return JSON.stringify({
    ...config,
    fechaRespaldo: new Date().toISOString()
  });
}