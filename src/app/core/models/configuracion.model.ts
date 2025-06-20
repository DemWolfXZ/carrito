/**
 * Modelo de configuración de la aplicación
 * 
 * Gestiona todas las configuraciones y preferencias del usuario
 * Permite personalizar el comportamiento de la aplicación
 * 
 * @author Tu Nombre
 * @version 1.0.0
 * @since 2025-06-19
 */

export interface IConfiguracion {
  /** Identificador único de la configuración */
  id: string;
  
  /** Configuraciones generales de la aplicación */
  general: ConfiguracionGeneral;
  
  /** Configuraciones de interfaz de usuario */
  interfaz: ConfiguracionInterfaz;
  
  /** Configuraciones de seguridad y privacidad */
  seguridad: ConfiguracionSeguridad;
  
  /** Configuraciones de notificaciones */
  notificaciones: ConfiguracionNotificaciones;
  
  /** Configuraciones de datos y almacenamiento */
  datos: ConfiguracionDatos;
  
  /** Fecha de última modificación */
  fechaModificacion: Date;
  
  /** Versión de la configuración */
  version: number;
}

/**
 * Configuraciones generales de la aplicación
 */
export interface ConfiguracionGeneral {
  /** Idioma de la aplicación */
  idioma: Idioma;
  
  /** Moneda por defecto */
  moneda: Moneda;
  
  /** Formato de fecha preferido */
  formatoFecha: FormatoFecha;
  
  /** Formato de hora preferido */
  formatoHora: FormatoHora;
  
  /** Supermercado por defecto */
  supermercadoPorDefecto?: string;
  
  /** Presupuesto mensual por defecto */
  presupuestoMensualDefecto?: number;
  
  /** Activar modo debug */
  modoDebug: boolean;
}

/**
 * Configuraciones de interfaz de usuario
 */
export interface ConfiguracionInterfaz {
  /** Tema de la aplicación */
  tema: Tema;
  
  /** Tamaño de fuente */
  tamanoFuente: TamanoFuente;
  
  /** Mostrar ayudas visuales */
  mostrarAyudas: boolean;
  
  /** Animaciones habilitadas */
  animacionesHabilitadas: boolean;
  
  /** Sonidos habilitados */
  sonidosHabilitados: boolean;
  
  /** Vibración habilitada */
  vibracionHabilitada: boolean;
  
  /** Modo de entrada rápida */
  modoEntradaRapida: boolean;
  
  /** Mostrar categorías de productos */
  mostrarCategorias: boolean;
  
  /** Orden de productos por defecto */
  ordenProductos: OrdenProductos;
}

/**
 * Configuraciones de seguridad y privacidad
 */
export interface ConfiguracionSeguridad {
  /** Requerir confirmación para eliminar */
  confirmarEliminacion: boolean;
  
  /** Requerir confirmación para finalizar sesión */
  confirmarFinalizacion: boolean;
  
  /** Bloqueo automático de la app */
  bloqueoAutomatico: boolean;
  
  /** Tiempo de bloqueo en minutos */
  tiempoBloqueo: number;
  
  /** Encriptación de datos sensibles */
  encriptacionDatos: boolean;
  
  /** Respaldo automático */
  respaldoAutomatico: boolean;
  
  /** Frecuencia de respaldo en días */
  frecuenciaRespaldo: number;
  
  /** Retención de datos en días */
  retencionDatos: number;
}

/**
 * Configuraciones de notificaciones
 */
export interface ConfiguracionNotificaciones {
  /** Notificaciones habilitadas */
  habilitadas: boolean;
  
  /** Notificar cuando se exceda presupuesto */
  notificarExcesoPresupuesto: boolean;
  
  /** Notificar recordatorios de compra */
  recordatoriosCompra: boolean;
  
  /** Notificar resúmenes semanales */
  resumenSemanal: boolean;
  
  /** Notificar cuando hay productos duplicados */
  productosCompra: boolean;
  
  /** Sonido de notificación */
  sonidoNotificacion: boolean;
  
  /** Vibración de notificación */
  vibracionNotificacion: boolean;
}

/**
 * Configuraciones de datos y almacenamiento
 */
export interface ConfiguracionDatos {
  /** Límite máximo de sesiones almacenadas */
  limiteSesiones: number;
  
  /** Límite máximo de productos por sesión */
  limiteProductosPorSesion: number;
  
  /** Sincronización automática */
  sincronizacionAutomatica: boolean;
  
  /** Compresión de datos */
  compresionDatos: boolean;
  
  /** Validación de integridad */
  validacionIntegridad: boolean;
  
  /** Formato de exportación por defecto */
  formatoExportacion: FormatoExportacion;
  
  /** Incluir metadatos en exportación */
  incluirMetadatos: boolean;
}

/**
 * Enumeraciones para las opciones de configuración
 */
export enum Idioma {
  ESPANOL = 'es',
  INGLES = 'en',
  PORTUGUES = 'pt'
}

export enum Moneda {
  PESO_CHILENO = 'CLP',
  DOLAR_AMERICANO = 'USD',
  EURO = 'EUR',
  PESO_ARGENTINO = 'ARS',
  REAL_BRASILENO = 'BRL'
}

export enum FormatoFecha {
  DD_MM_YYYY = 'DD/MM/YYYY',
  MM_DD_YYYY = 'MM/DD/YYYY',
  YYYY_MM_DD = 'YYYY-MM-DD',
  DD_MMM_YYYY = 'DD MMM YYYY'
}

export enum FormatoHora {
  H24 = '24h',
  H12 = '12h'
}

export enum Tema {
  CLARO = 'claro',
  OSCURO = 'oscuro',
  AUTOMATICO = 'automatico',
  AZUL = 'azul',
  VERDE = 'verde'
}

export enum TamanoFuente {
  PEQUENO = 'pequeno',
  MEDIANO = 'mediano',
  GRANDE = 'grande',
  EXTRA_GRANDE = 'extra_grande'
}

export enum OrdenProductos {
  ALFABETICO = 'alfabetico',
  PRECIO_ASC = 'precio_asc',
  PRECIO_DESC = 'precio_desc',
  FECHA_AGREGADO = 'fecha_agregado',
  CATEGORIA = 'categoria'
}

export enum FormatoExportacion {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'xlsx',
  PDF = 'pdf'
}

/**
 * Clase concreta que implementa la configuración de la aplicación
 */
export class Configuracion implements IConfiguracion {
  id: string;
  general: ConfiguracionGeneral;
  interfaz: ConfiguracionInterfaz;
  seguridad: ConfiguracionSeguridad;
  notificaciones: ConfiguracionNotificaciones;
  datos: ConfiguracionDatos;
  fechaModificacion: Date;
  version: number;

  constructor(datos?: Partial<IConfiguracion>) {
    this.id = datos?.id || 'config_principal';
    this.general = this.crearConfiguracionGeneral(datos?.general);
    this.interfaz = this.crearConfiguracionInterfaz(datos?.interfaz);
    this.seguridad = this.crearConfiguracionSeguridad(datos?.seguridad);
    this.notificaciones = this.crearConfiguracionNotificaciones(datos?.notificaciones);
    this.datos = this.crearConfiguracionDatos(datos?.datos);
    this.fechaModificacion = datos?.fechaModificacion || new Date();
    this.version = datos?.version || 1;
  }

  /**
   * Crea configuración general con valores por defecto
   * @param datos Datos parciales de configuración
   * @returns ConfiguracionGeneral Configuración completa
   */
  private crearConfiguracionGeneral(datos?: Partial<ConfiguracionGeneral>): ConfiguracionGeneral {
    return {
      idioma: datos?.idioma || Idioma.ESPANOL,
      moneda: datos?.moneda || Moneda.PESO_CHILENO,
      formatoFecha: datos?.formatoFecha || FormatoFecha.DD_MM_YYYY,
      formatoHora: datos?.formatoHora || FormatoHora.H24,
      supermercadoPorDefecto: datos?.supermercadoPorDefecto,
      presupuestoMensualDefecto: datos?.presupuestoMensualDefecto,
      modoDebug: datos?.modoDebug || false
    };
  }

  /**
   * Crea configuración de interfaz con valores por defecto
   * @param datos Datos parciales de configuración
   * @returns ConfiguracionInterfaz Configuración completa
   */
  private crearConfiguracionInterfaz(datos?: Partial<ConfiguracionInterfaz>): ConfiguracionInterfaz {
    return {
      tema: datos?.tema || Tema.CLARO,
      tamanoFuente: datos?.tamanoFuente || TamanoFuente.MEDIANO,
      mostrarAyudas: datos?.mostrarAyudas ?? true,
      animacionesHabilitadas: datos?.animacionesHabilitadas ?? true,
      sonidosHabilitados: datos?.sonidosHabilitados ?? true,
      vibracionHabilitada: datos?.vibracionHabilitada ?? true,
      modoEntradaRapida: datos?.modoEntradaRapida ?? false,
      mostrarCategorias: datos?.mostrarCategorias ?? true,
      ordenProductos: datos?.ordenProductos || OrdenProductos.FECHA_AGREGADO
    };
  }

  /**
   * Crea configuración de seguridad con valores por defecto
   * @param datos Datos parciales de configuración
   * @returns ConfiguracionSeguridad Configuración completa
   */
  private crearConfiguracionSeguridad(datos?: Partial<ConfiguracionSeguridad>): ConfiguracionSeguridad {
    return {
      confirmarEliminacion: datos?.confirmarEliminacion ?? true,
      confirmarFinalizacion: datos?.confirmarFinalizacion ?? true,
      bloqueoAutomatico: datos?.bloqueoAutomatico ?? false,
      tiempoBloqueo: datos?.tiempoBloqueo || 5,
      encriptacionDatos: datos?.encriptacionDatos ?? false,
      respaldoAutomatico: datos?.respaldoAutomatico ?? true,
      frecuenciaRespaldo: datos?.frecuenciaRespaldo || 7,
      retencionDatos: datos?.retencionDatos || 365
    };
  }

  /**
   * Crea configuración de notificaciones con valores por defecto
   * @param datos Datos parciales de configuración
   * @returns ConfiguracionNotificaciones Configuración completa
   */
  private crearConfiguracionNotificaciones(datos?: Partial<ConfiguracionNotificaciones>): ConfiguracionNotificaciones {
    return {
      habilitadas: datos?.habilitadas ?? true,
      notificarExcesoPresupuesto: datos?.notificarExcesoPresupuesto ?? true,
      recordatoriosCompra: datos?.recordatoriosCompra ?? false,
      resumenSemanal: datos?.resumenSemanal ?? false,
      productosCompra: datos?.productosCompra ?? true,
      sonidoNotificacion: datos?.sonidoNotificacion ?? true,
      vibracionNotificacion: datos?.vibracionNotificacion ?? true
    };
  }

  /**
   * Crea configuración de datos con valores por defecto
   * @param datos Datos parciales de configuración
   * @returns ConfiguracionDatos Configuración completa
   */
  private crearConfiguracionDatos(datos?: Partial<ConfiguracionDatos>): ConfiguracionDatos {
    return {
      limiteSesiones: datos?.limiteSesiones || 1000,
      limiteProductosPorSesion: datos?.limiteProductosPorSesion || 200,
      sincronizacionAutomatica: datos?.sincronizacionAutomatica ?? false,
      compresionDatos: datos?.compresionDatos ?? true,
      validacionIntegridad: datos?.validacionIntegridad ?? true,
      formatoExportacion: datos?.formatoExportacion || FormatoExportacion.JSON,
      incluirMetadatos: datos?.incluirMetadatos ?? true
    };
  }

  /**
   * Actualiza una configuración específica
   * @param seccion Sección de configuración a actualizar
   * @param datos Nuevos datos de configuración
   */
  public actualizarConfiguracion(
    seccion: 'general' | 'interfaz' | 'seguridad' | 'notificaciones' | 'datos',
    datos: any
  ): void {
    switch (seccion) {
      case 'general':
        this.general = { ...this.general, ...datos };
        break;
      case 'interfaz':
        this.interfaz = { ...this.interfaz, ...datos };
        break;
      case 'seguridad':
        this.seguridad = { ...this.seguridad, ...datos };
        break;
      case 'notificaciones':
        this.notificaciones = { ...this.notificaciones, ...datos };
        break;
      case 'datos':
        this.datos = { ...this.datos, ...datos };
        break;
    }
    
    this.fechaModificacion = new Date();
    this.version += 1;
  }

  /**
   * Restablece la configuración a valores por defecto
   */
  public restablecerPorDefecto(): void {
    const nuevaConfig = new Configuracion();
    this.general = nuevaConfig.general;
    this.interfaz = nuevaConfig.interfaz;
    this.seguridad = nuevaConfig.seguridad;
    this.notificaciones = nuevaConfig.notificaciones;
    this.datos = nuevaConfig.datos;
    this.fechaModificacion = new Date();
    this.version += 1;
  }

  /**
   * Valida que la configuración sea válida
   * @returns boolean True si es válida
   */
  public esValida(): boolean {
    try {
      // Validar que existan todas las secciones
      if (!this.general || !this.interfaz || !this.seguridad || 
          !this.notificaciones || !this.datos) {
        return false;
      }

      // Validar rangos numéricos
      if (this.seguridad.tiempoBloqueo < 1 || this.seguridad.tiempoBloqueo > 60) {
        return false;
      }

      if (this.datos.limiteSesiones < 10 || this.datos.limiteSesiones > 10000) {
        return false;
      }

      if (this.datos.limiteProductosPorSesion < 1 || this.datos.limiteProductosPorSesion > 1000) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convierte la configuración a JSON
   * @returns string Configuración en formato JSON
   */
  public toJSON(): string {
    return JSON.stringify({
      id: this.id,
      general: this.general,
      interfaz: this.interfaz,
      seguridad: this.seguridad,
      notificaciones: this.notificaciones,
      datos: this.datos,
      fechaModificacion: this.fechaModificacion.toISOString(),
      version: this.version
    });
  }

/**
   * Crea configuración desde JSON
   * @param json String JSON con configuración
   * @returns Configuracion Instancia de configuración
   */
  public static fromJSON(json: string): Configuracion {
    try {
      const datos = JSON.parse(json);
      datos.fechaModificacion = new Date(datos.fechaModificacion);
      return new Configuracion(datos);
    } catch (error) {
      throw new Error('Error al parsear configuración desde JSON');
    }
  }

  /**
   * Exporta la configuración en formato legible
   * @returns object Configuración en formato objeto
   */
  public exportar(): object {
    return {
      id: this.id,
      general: this.general,
      interfaz: this.interfaz,
      seguridad: this.seguridad,
      notificaciones: this.notificaciones,
      datos: this.datos,
      fechaModificacion: this.fechaModificacion,
      version: this.version
    };
  }

  /**
   * Importa configuración desde objeto
   * @param datos Objeto con datos de configuración
   */
  public importar(datos: any): void {
    try {
      const configuracionImportada = new Configuracion(datos);
      if (configuracionImportada.esValida()) {
        this.general = configuracionImportada.general;
        this.interfaz = configuracionImportada.interfaz;
        this.seguridad = configuracionImportada.seguridad;
        this.notificaciones = configuracionImportada.notificaciones;
        this.datos = configuracionImportada.datos;
        this.fechaModificacion = new Date();
        this.version += 1;
      } else {
        throw new Error('Configuración importada no es válida');
      }
    } catch (error) {
      throw new Error('Error al importar configuración');
    }
  }

  /**
   * Obtiene la configuración de tema CSS basada en las preferencias
   * @returns string Clase CSS del tema
   */
  public obtenerTemaCSS(): string {
    switch (this.interfaz.tema) {
      case Tema.OSCURO:
        return 'theme-dark';
      case Tema.AZUL:
        return 'theme-blue';
      case Tema.VERDE:
        return 'theme-green';
      case Tema.AUTOMATICO:
        const horaActual = new Date().getHours();
        return (horaActual >= 18 || horaActual <= 6) ? 'theme-dark' : 'theme-light';
      default:
        return 'theme-light';
    }
  }

  /**
   * Obtiene el tamaño de fuente en CSS
   * @returns string Clase CSS del tamaño de fuente
   */
  public obtenerTamanoFuenteCSS(): string {
    switch (this.interfaz.tamanoFuente) {
      case TamanoFuente.PEQUENO:
        return 'font-small';
      case TamanoFuente.GRANDE:
        return 'font-large';
      case TamanoFuente.EXTRA_GRANDE:
        return 'font-extra-large';
      default:
        return 'font-medium';
    }
  }

  /**
   * Verifica si debe mostrar confirmación para una acción
   * @param accion Tipo de acción a verificar
   * @returns boolean True si debe confirmar
   */
  public debeConfirmar(accion: 'eliminar' | 'finalizar'): boolean {
    switch (accion) {
      case 'eliminar':
        return this.seguridad.confirmarEliminacion;
      case 'finalizar':
        return this.seguridad.confirmarFinalizacion;
      default:
        return true;
    }
  }

  /**
   * Verifica si las notificaciones están habilitadas para un tipo específico
   * @param tipo Tipo de notificación
   * @returns boolean True si está habilitada
   */
  public notificacionHabilitada(tipo: 'presupuesto' | 'recordatorio' | 'resumen' | 'productos'): boolean {
    if (!this.notificaciones.habilitadas) {
      return false;
    }

    switch (tipo) {
      case 'presupuesto':
        return this.notificaciones.notificarExcesoPresupuesto;
      case 'recordatorio':
        return this.notificaciones.recordatoriosCompra;
      case 'resumen':
        return this.notificaciones.resumenSemanal;
      case 'productos':
        return this.notificaciones.productosCompra;
      default:
        return false;
    }
  }

  /**
   * Obtiene el formato de fecha localizador
   * @returns string Formato de fecha para el locale
   */
  public obtenerFormatoFechaLocalizado(): string {
    const locale = this.general.idioma === Idioma.ESPANOL ? 'es-CL' : 
                   this.general.idioma === Idioma.INGLES ? 'en-US' : 'pt-BR';
    
    switch (this.general.formatoFecha) {
      case FormatoFecha.DD_MM_YYYY:
        return locale === 'en-US' ? 'MM/dd/yyyy' : 'dd/MM/yyyy';
      case FormatoFecha.MM_DD_YYYY:
        return 'MM/dd/yyyy';
      case FormatoFecha.YYYY_MM_DD:
        return 'yyyy-MM-dd';
      case FormatoFecha.DD_MMM_YYYY:
        return locale === 'en-US' ? 'dd MMM yyyy' : 'dd MMM yyyy';
      default:
        return 'dd/MM/yyyy';
    }
  }

  /**
   * Obtiene el símbolo de la moneda configurada
   * @returns string Símbolo de la moneda
   */
  public obtenerSimboloMoneda(): string {
    switch (this.general.moneda) {
      case Moneda.PESO_CHILENO:
        return '$';
      case Moneda.DOLAR_AMERICANO:
        return 'US$';
      case Moneda.EURO:
        return '€';
      case Moneda.PESO_ARGENTINO:
        return 'AR$';
      case Moneda.REAL_BRASILENO:
        return 'R$';
      default:
        return '$';
    }
  }

  /**
   * Verifica si la aplicación debe hacer respaldo automático
   * @returns boolean True si debe hacer respaldo
   */
  public debeHacerRespaldo(): boolean {
    if (!this.seguridad.respaldoAutomatico) {
      return false;
    }

    // Lógica para verificar si han pasado los días de frecuencia
    // Esta lógica se implementaría en el servicio correspondiente
    return true;
  }

  /**
   * Obtiene configuración resumida para logging
   * @returns object Configuración resumida (sin datos sensibles)
   */
  public obtenerResumenParaLog(): object {
    return {
      id: this.id,
      idioma: this.general.idioma,
      tema: this.interfaz.tema,
      version: this.version,
      fechaModificacion: this.fechaModificacion.toISOString()
    };
  }
}

/**
 * Configuración por defecto de la aplicación
 */
export const CONFIGURACION_POR_DEFECTO: Partial<IConfiguracion> = {
  general: {
    idioma: Idioma.ESPANOL,
    moneda: Moneda.PESO_CHILENO,
    formatoFecha: FormatoFecha.DD_MM_YYYY,
    formatoHora: FormatoHora.H24,
    modoDebug: false
  },
  interfaz: {
    tema: Tema.CLARO,
    tamanoFuente: TamanoFuente.MEDIANO,
    mostrarAyudas: true,
    animacionesHabilitadas: true,
    sonidosHabilitados: true,
    vibracionHabilitada: true,
    modoEntradaRapida: false,
    mostrarCategorias: true,
    ordenProductos: OrdenProductos.FECHA_AGREGADO
  },
  seguridad: {
    confirmarEliminacion: true,
    confirmarFinalizacion: true,
    bloqueoAutomatico: false,
    tiempoBloqueo: 5,
    encriptacionDatos: false,
    respaldoAutomatico: true,
    frecuenciaRespaldo: 7,
    retencionDatos: 365
  },
  notificaciones: {
    habilitadas: true,
    notificarExcesoPresupuesto: true,
    recordatoriosCompra: false,
    resumenSemanal: false,
    productosCompra: true,
    sonidoNotificacion: true,
    vibracionNotificacion: true
  },
  datos: {
    limiteSesiones: 1000,
    limiteProductosPorSesion: 200,
    sincronizacionAutomatica: false,
    compresionDatos: true,
    validacionIntegridad: true,
    formatoExportacion: FormatoExportacion.JSON,
    incluirMetadatos: true
  }
};

/**
 * Utilidades para trabajar con configuraciones
 */
export class ConfiguracionUtils {
  /**
   * Valida si un valor es un idioma válido
   * @param valor Valor a validar
   * @returns boolean True si es válido
   */
  public static esIdiomaValido(valor: string): boolean {
    return Object.values(Idioma).includes(valor as Idioma);
  }

  /**
   * Valida si un valor es una moneda válida
   * @param valor Valor a validar
   * @returns boolean True si es válido
   */
  public static esMonedaValida(valor: string): boolean {
    return Object.values(Moneda).includes(valor as Moneda);
  }

  /**
   * Valida si un valor es un tema válido
   * @param valor Valor a validar
   * @returns boolean True si es válido
   */
  public static esTemaValido(valor: string): boolean {
    return Object.values(Tema).includes(valor as Tema);
  }

  /**
   * Obtiene la lista de idiomas disponibles
   * @returns Array<{valor: string, etiqueta: string}> Lista de idiomas
   */
  public static obtenerIdiomasDisponibles(): Array<{valor: string, etiqueta: string}> {
    return [
      { valor: Idioma.ESPANOL, etiqueta: 'Español' },
      { valor: Idioma.INGLES, etiqueta: 'English' },
      { valor: Idioma.PORTUGUES, etiqueta: 'Português' }
    ];
  }

  /**
   * Obtiene la lista de monedas disponibles
   * @returns Array<{valor: string, etiqueta: string, simbolo: string}> Lista de monedas
   */
  public static obtenerMonedasDisponibles(): Array<{valor: string, etiqueta: string, simbolo: string}> {
    return [
      { valor: Moneda.PESO_CHILENO, etiqueta: 'Peso Chileno', simbolo: '$' },
      { valor: Moneda.DOLAR_AMERICANO, etiqueta: 'Dólar Americano', simbolo: 'US$' },
      { valor: Moneda.EURO, etiqueta: 'Euro', simbolo: '€' },
      { valor: Moneda.PESO_ARGENTINO, etiqueta: 'Peso Argentino', simbolo: 'AR$' },
      { valor: Moneda.REAL_BRASILENO, etiqueta: 'Real Brasileño', simbolo: 'R$' }
    ];
  }

  /**
   * Obtiene la lista de temas disponibles
   * @returns Array<{valor: string, etiqueta: string}> Lista de temas
   */
  public static obtenerTemasDisponibles(): Array<{valor: string, etiqueta: string}> {
    return [
      { valor: Tema.CLARO, etiqueta: 'Claro' },
      { valor: Tema.OSCURO, etiqueta: 'Oscuro' },
      { valor: Tema.AUTOMATICO, etiqueta: 'Automático' },
      { valor: Tema.AZUL, etiqueta: 'Azul' },
      { valor: Tema.VERDE, etiqueta: 'Verde' }
    ];
  }

  /**
   * Migra configuración de versión anterior
   * @param configuracionAntigua Configuración en formato anterior
   * @returns Configuracion Configuración migrada
   */
  public static migrarConfiguracion(configuracionAntigua: any): Configuracion {
    try {
      // Lógica de migración específica según la versión
      const configuracionMigrada = new Configuracion(configuracionAntigua);
      return configuracionMigrada;
    } catch (error) {
      // Si falla la migración, retornar configuración por defecto
      return new Configuracion();
    }
  }
}