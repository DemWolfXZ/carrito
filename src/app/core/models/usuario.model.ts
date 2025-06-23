/**
 * Modelo de datos para el usuario de la aplicación Carrito
 * Incluye información personal, configuraciones y preferencias
 * 
 * @author DemWolf
 * @version 1.0
 */

// Interface principal del usuario
export interface Usuario {
  id: string;                          // UUID único del usuario
  nombre: string;                      // Nombre personalizado (2-30 caracteres)
  pais: string;                        // Código ISO del país seleccionado
  moneda: string;                      // Código ISO de la moneda del país
  fechaCreacion: Date;                 // Fecha de creación del perfil
  ultimaActividad: Date;               // Última vez que usó la aplicación
  configuracionCompleta: boolean;      // Si completó la configuración inicial
  autenticacionHabilitada: boolean;    // Si configuró PIN/biometría
  configuraciones: ConfiguracionUsuario; // Configuraciones personalizadas del usuario
  estadisticas: EstadisticasUsuario;   // Estadísticas de uso de la aplicación
}

// Configuraciones personalizables del usuario
export interface ConfiguracionUsuario {
  // Configuraciones de interfaz
  temaVisual: TemaVisual;              // Tema de la aplicación
  tamanoFuente: TamanoFuente;          // Tamaño de fuente preferido
  idioma: Idioma;                      // Idioma de la aplicación
  
  // Configuraciones de notificaciones
  notificacionesHabilitadas: boolean;  // Si recibe notificaciones
  sonidoNotificaciones: boolean;       // Si las notificaciones tienen sonido
  vibracionNotificaciones: boolean;    // Si las notificaciones vibran
  
  // Configuraciones de autenticación
  biometriaHabilitada: boolean;        // Si usa autenticación biométrica
  tiempoBloqueoSensible: number;       // Minutos para bloquear funciones sensibles (donaciones)
  
  // Configuraciones de compras
  presupuestoTipico?: number;          // Presupuesto sugerido por defecto
  recordatorioPresupuesto: boolean;    // Si muestra recordatorios de presupuesto
  alertaPresupuesto80: boolean;        // Alerta al 80% del presupuesto
  alertaPresupuesto100: boolean;       // Alerta al 100% del presupuesto
  
  // Configuraciones de privacidad
  permitirScreenshots: boolean;        // Si permite capturas de pantalla
  modoPrivado: boolean;               // Ocultar información sensible en vista previa de apps
}

// Estadísticas de uso del usuario
export interface EstadisticasUsuario {
  totalComprasRealizadas: number;      // Número total de sesiones completadas
  totalDineroGastado: number;          // Suma total de dinero gastado
  promedioCompra: number;              // Promedio de gasto por compra
  supermercadoFavorito?: string;       // Supermercado más visitado
  categoriaFavorita?: string;          // Categoría de productos más comprada
  tiempoPromedioCompra: number;        // Tiempo promedio de duración de compras (minutos)
  comprasEsteAno: number;              // Compras realizadas en el año actual
  comprasEsteMes: number;              // Compras realizadas en el mes actual
  ultimaCompra?: Date;                 // Fecha de la última compra realizada
}

// Enums para configuraciones

// Temas visuales disponibles
export enum TemaVisual {
  CLARO = 'claro',
  OSCURO = 'oscuro',
  AUTOMATICO = 'automatico'           // Sigue el tema del sistema
}

// Tamaños de fuente disponibles
export enum TamanoFuente {
  PEQUENO = 'pequeno',
  MEDIANO = 'mediano',
  GRANDE = 'grande',
  EXTRA_GRANDE = 'extraGrande'
}

// Idiomas soportados
export enum Idioma {
  ESPANOL = 'es',
  INGLES = 'en',
  PORTUGUES = 'pt'
}

// Estados del usuario
export enum EstadoUsuario {
  NUEVO = 'nuevo',                     // Usuario recién creado
  CONFIGURANDO = 'configurando',       // En proceso de configuración inicial
  ACTIVO = 'activo',                   // Usuario completamente configurado
  INACTIVO = 'inactivo'               // Usuario que no ha usado la app recientemente
}

// Interface para datos de configuración inicial
export interface DatosConfiguracionInicial {
  nombre: string;                      // Nombre elegido por el usuario
  codigoPais: string;                  // Código ISO del país seleccionado
  pin: string;                         // PIN de 6 dígitos (será encriptado)
  biometriaDisponible: boolean;        // Si el dispositivo soporta biometría
  biometriaHabilitada: boolean;        // Si el usuario eligió usar biometría
  configuracionesIniciales: Partial<ConfiguracionUsuario>; // Configuraciones básicas
}

// Interface para actualización de perfil
export interface ActualizacionPerfil {
  nombre?: string;                     // Nuevo nombre (opcional)
  pais?: string;                       // Nuevo país (opcional)
  configuraciones?: Partial<ConfiguracionUsuario>; // Configuraciones a actualizar
}

// Configuraciones por defecto para nuevo usuario
export const CONFIGURACION_DEFECTO: ConfiguracionUsuario = {
  // Interfaz
  temaVisual: TemaVisual.AUTOMATICO,
  tamanoFuente: TamanoFuente.MEDIANO,
  idioma: Idioma.ESPANOL,
  
  // Notificaciones
  notificacionesHabilitadas: true,
  sonidoNotificaciones: true,
  vibracionNotificaciones: true,
  
  // Autenticación
  biometriaHabilitada: false,          // Se configura después
  tiempoBloqueoSensible: 5,            // 5 minutos por defecto
  
  // Compras
  recordatorioPresupuesto: true,
  alertaPresupuesto80: true,
  alertaPresupuesto100: true,
  
  // Privacidad
  permitirScreenshots: true,
  modoPrivado: false
};

// Estadísticas iniciales para nuevo usuario
export const ESTADISTICAS_INICIALES: EstadisticasUsuario = {
  totalComprasRealizadas: 0,
  totalDineroGastado: 0,
  promedioCompra: 0,
  tiempoPromedioCompra: 0,
  comprasEsteAno: 0,
  comprasEsteMes: 0
};

// Funciones utilitarias para el usuario

/**
 * Crear un nuevo usuario con configuraciones por defecto
 * @param datosIniciales Datos de la configuración inicial
 * @returns Usuario nuevo completamente configurado
 */
export function crearNuevoUsuario(datosIniciales: DatosConfiguracionInicial): Usuario {
  const ahora = new Date();
  
  return {
    id: generarUUID(),
    nombre: datosIniciales.nombre,
    pais: datosIniciales.codigoPais,
    moneda: '', // Se asignará según el país
    fechaCreacion: ahora,
    ultimaActividad: ahora,
    configuracionCompleta: true,
    autenticacionHabilitada: true,
    configuraciones: {
      ...CONFIGURACION_DEFECTO,
      biometriaHabilitada: datosIniciales.biometriaHabilitada,
      ...datosIniciales.configuracionesIniciales
    },
    estadisticas: ESTADISTICAS_INICIALES
  };
}

/**
 * Validar que los datos del usuario son válidos
 * @param usuario Usuario a validar
 * @returns true si el usuario es válido
 */
export function validarUsuario(usuario: Usuario): boolean {
  // Validar campos obligatorios
  if (!usuario.id || !usuario.nombre || !usuario.pais) {
    return false;
  }
  
  // Validar longitud del nombre
  if (usuario.nombre.length < 2 || usuario.nombre.length > 30) {
    return false;
  }
  
  // Validar que las fechas sean válidas
  if (!(usuario.fechaCreacion instanceof Date) || !(usuario.ultimaActividad instanceof Date)) {
    return false;
  }
  
  return true;
}

/**
 * Actualizar la última actividad del usuario
 * @param usuario Usuario a actualizar
 * @returns Usuario con última actividad actualizada
 */
export function actualizarUltimaActividad(usuario: Usuario): Usuario {
  return {
    ...usuario,
    ultimaActividad: new Date()
  };
}

/**
 * Obtener estado del usuario basado en su actividad
 * @param usuario Usuario a evaluar
 * @returns Estado actual del usuario
 */
export function obtenerEstadoUsuario(usuario: Usuario): EstadoUsuario {
  if (!usuario.configuracionCompleta) {
    return EstadoUsuario.CONFIGURANDO;
  }
  
  // Considerar inactivo si no ha usado la app en más de 30 días
  const diasInactivo = (Date.now() - usuario.ultimaActividad.getTime()) / (1000 * 60 * 60 * 24);
  if (diasInactivo > 30) {
    return EstadoUsuario.INACTIVO;
  }
  
  return EstadoUsuario.ACTIVO;
}

/**
 * Verificar si el usuario puede crear una nueva sesión de compra
 * @param usuario Usuario a verificar
 * @returns true si puede crear nueva sesión
 */
export function puedeCrearNuevaSesion(usuario: Usuario): boolean {
  // Verificar que esté completamente configurado
  if (!usuario.configuracionCompleta) {
    return false;
  }
  
  // Verificar que no exceda el límite mensual (se validará en el servicio de compras)
  return true;
}

/**
 * Generar UUID simple para identificadores únicos
 * @returns String UUID
 */
function generarUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}