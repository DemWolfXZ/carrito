/**
 * Pipe para formatear estados de sesiones de compra
 * 
 * Convierte estados de sesiones a formato legible con colores,
 * iconos y descripciones contextuales. Incluye progreso de
 * sesión y tiempo transcurrido.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Pipe, PipeTransform } from '@angular/core';
import { EstadoSesion } from '@models/sesion-compra.model';

/**
 * Opciones de formateo para estados
 */
interface OpcionesEstado {
  /** Incluir icono en el texto */
  incluirIcono?: boolean;
  /** Usar formato corto */
  formatoCorto?: boolean;
  /** Incluir descripción detallada */
  incluirDescripcion?: boolean;
  /** Mostrar progreso como porcentaje */
  mostrarProgreso?: boolean;
  /** Incluir tiempo transcurrido */
  incluirTiempo?: boolean;
  /** Contexto para mensajes personalizados */
  contexto?: 'lista' | 'detalle' | 'notificacion' | 'badge';
  /** Datos adicionales de la sesión para cálculos */
  datosAdicionales?: {
    horaInicio?: string;
    horaFin?: string;
    totalProductos?: number;
    presupuestoEstimado?: number;
    totalGastado?: number;
  };
}

/**
 * Configuración de estado
 */
interface ConfiguracionEstado {
  etiqueta: string;
  etiquetaCorta: string;
  descripcion: string;
  icono: string;
  color: string;
  claseCSS: string;
  claseBadge: string;
  prioridad: number; // Para ordenamiento
  accionSugerida?: string;
}

/**
 * Resultado del formateo de estado
 */
interface EstadoFormateado {
  texto: string;
  icono: string;
  color: string;
  claseCSS: string;
  claseBadge: string;
  descripcion?: string;
  progreso?: string;
  tiempo?: string;
  accionSugerida?: string;
}

@Pipe({
  name: 'estadoSesion',
  standalone: true
})
export class EstadoSesionPipe implements PipeTransform {

  // Configuración de todos los estados
  private readonly CONFIGURACIONES_ESTADOS: Record<EstadoSesion, ConfiguracionEstado> = {
    [EstadoSesion.INICIADA]: {
      etiqueta: 'Iniciada',
      etiquetaCorta: 'Nueva',
      descripcion: 'Sesión recién creada, lista para agregar productos',
      icono: 'play-circle',
      color: '#3498db',
      claseCSS: 'text-primary',
      claseBadge: 'badge-primary',
      prioridad: 1,
      accionSugerida: 'Agregar productos'
    },
    [EstadoSesion.EN_PROGRESO]: {
      etiqueta: 'En Progreso',
      etiquetaCorta: 'Activa',
      descripcion: 'Compra en curso, agregando productos',
      icono: 'shopping-cart',
      color: '#f39c12',
      claseCSS: 'text-warning',
      claseBadge: 'badge-warning',
      prioridad: 2,
      accionSugerida: 'Continuar comprando'
    },
    [EstadoSesion.PAUSADA]: {
      etiqueta: 'Pausada',
      etiquetaCorta: 'Pausa',
      descripcion: 'Sesión pausada temporalmente',
      icono: 'pause-circle',
      color: '#95a5a6',
      claseCSS: 'text-muted',
      claseBadge: 'badge-secondary',
      prioridad: 3,
      accionSugerida: 'Reanudar compra'
    },
    [EstadoSesion.COMPLETADA]: {
      etiqueta: 'Completada',
      etiquetaCorta: 'Lista',
      descripcion: 'Compra finalizada exitosamente',
      icono: 'check-circle',
      color: '#27ae60',
      claseCSS: 'text-success',
      claseBadge: 'badge-success',
      prioridad: 4,
      accionSugerida: 'Ver detalles'
    },
    [EstadoSesion.CANCELADA]: {
      etiqueta: 'Cancelada',
      etiquetaCorta: 'Cancel.',
      descripcion: 'Sesión cancelada por el usuario',
      icono: 'x-circle',
      color: '#e74c3c',
      claseCSS: 'text-danger',
      claseBadge: 'badge-danger',
      prioridad: 5,
      accionSugerida: 'Nueva compra'
    }
  };

  // Configuración por defecto
  private readonly CONFIGURACION_DEFECTO: Required<OpcionesEstado> = {
    incluirIcono: true,
    formatoCorto: false,
    incluirDescripcion: false,
    mostrarProgreso: false,
    incluirTiempo: false,
    contexto: 'lista',
    datosAdicionales: {}
  };

  /**
   * Transforma un estado de sesión a formato legible
   * @param estado Estado de la sesión
   * @param opciones Opciones de formateo
   * @returns string | EstadoFormateado Estado formateado
   */
  transform(estado: any, opciones?: Partial<OpcionesEstado>): string | EstadoFormateado {
    try {
      // Validar entrada
      if (!this.esEstadoValido(estado)) {
        return this.manejarEstadoInvalido(estado);
      }

      // Aplicar configuración
      const config = { ...this.CONFIGURACION_DEFECTO, ...opciones };
      const configEstado = this.CONFIGURACIONES_ESTADOS[estado as EstadoSesion];

      if (!configEstado) {
        console.warn(`Estado no reconocido: ${estado}`);
        return 'Estado desconocido';
      }

      // Generar resultado según contexto
      return this.formatearSegunContexto(estado as EstadoSesion, configEstado, config);

    } catch (error) {
      console.error('Error en EstadoSesionPipe:', error);
      return 'Error en estado';
    }
  }

  /**
   * Valida si el estado es válido
   * @private
   */
  private esEstadoValido(estado: any): boolean {
    if (!estado) {
      return false;
    }

    return Object.values(EstadoSesion).includes(estado as EstadoSesion);
  }

  /**
   * Maneja estados inválidos
   * @private
   */
  private manejarEstadoInvalido(estado: any): string {
    if (estado === null || estado === undefined) {
      return 'Sin estado';
    }

    console.warn('Estado inválido recibido:', estado);
    return 'Estado inválido';
  }

  /**
   * Formatea según el contexto especificado
   * @private
   */
  private formatearSegunContexto(
    estado: EstadoSesion,
    configEstado: ConfiguracionEstado,
    config: Required<OpcionesEstado>
  ): string | EstadoFormateado {
    switch (config.contexto) {
      case 'badge':
        return this.formatearParaBadge(estado, configEstado, config);

      case 'lista':
        return this.formatearParaLista(estado, configEstado, config);

      case 'detalle':
        return this.formatearParaDetalle(estado, configEstado, config);

      case 'notificacion':
        return this.formatearParaNotificacion(estado, configEstado, config);

      default:
        return this.formatearBasico(estado, configEstado, config);
    }
  }

  /**
   * Formatea para uso en badges
   * @private
   */
  private formatearParaBadge(
    estado: EstadoSesion,
    configEstado: ConfiguracionEstado,
    config: Required<OpcionesEstado>
  ): EstadoFormateado {
    const etiqueta = config.formatoCorto ? configEstado.etiquetaCorta : configEstado.etiqueta;
    let texto = etiqueta;

    if (config.incluirIcono) {
      texto = `${this.obtenerIconoTexto(configEstado.icono)} ${texto}`;
    }

    return {
      texto,
      icono: configEstado.icono,
      color: configEstado.color,
      claseCSS: configEstado.claseCSS,
      claseBadge: configEstado.claseBadge
    };
  }

  /**
   * Formatea para listas de sesiones
   * @private
   */
  private formatearParaLista(
    estado: EstadoSesion,
    configEstado: ConfiguracionEstado,
    config: Required<OpcionesEstado>
  ): EstadoFormateado {
    const etiqueta = config.formatoCorto ? configEstado.etiquetaCorta : configEstado.etiqueta;
    let texto = etiqueta;

    if (config.incluirIcono) {
      texto = `${this.obtenerIconoTexto(configEstado.icono)} ${texto}`;
    }

    const resultado: EstadoFormateado = {
      texto,
      icono: configEstado.icono,
      color: configEstado.color,
      claseCSS: configEstado.claseCSS,
      claseBadge: configEstado.claseBadge
    };

    // Agregar tiempo si está disponible
    if (config.incluirTiempo && config.datosAdicionales) {
      const tiempo = this.calcularTiempo(estado, config.datosAdicionales);
      if (tiempo) {
        resultado.tiempo = tiempo;
        resultado.texto += ` (${tiempo})`;
      }
    }

    // Agregar progreso si está disponible
    if (config.mostrarProgreso && config.datosAdicionales) {
      const progreso = this.calcularProgreso(estado, config.datosAdicionales);
      if (progreso) {
        resultado.progreso = progreso;
      }
    }

    return resultado;
  }

  /**
   * Formatea para vista de detalle
   * @private
   */
  private formatearParaDetalle(
    estado: EstadoSesion,
    configEstado: ConfiguracionEstado,
    config: Required<OpcionesEstado>
  ): EstadoFormateado {
    const resultado = this.formatearParaLista(estado, configEstado, config);

    // Agregar descripción detallada
    if (config.incluirDescripcion) {
      resultado.descripcion = this.generarDescripcionDetallada(estado, config.datosAdicionales);
    }

    // Agregar acción sugerida
    resultado.accionSugerida = configEstado.accionSugerida;

    return resultado;
  }

  /**
   * Formatea para notificaciones
   * @private
   */
  private formatearParaNotificacion(
    estado: EstadoSesion,
    configEstado: ConfiguracionEstado,
    config: Required<OpcionesEstado>
  ): EstadoFormateado {
    const mensaje = this.generarMensajeNotificacion(estado, config.datosAdicionales);

    return {
      texto: mensaje,
      icono: configEstado.icono,
      color: configEstado.color,
      claseCSS: configEstado.claseCSS,
      claseBadge: configEstado.claseBadge,
      descripcion: configEstado.descripcion
    };
  }

  /**
   * Formatea básico (solo texto)
   * @private
   */
  private formatearBasico(
    estado: EstadoSesion,
    configEstado: ConfiguracionEstado,
    config: Required<OpcionesEstado>
  ): string {
    const etiqueta = config.formatoCorto ? configEstado.etiquetaCorta : configEstado.etiqueta;
    
    if (config.incluirIcono) {
      return `${this.obtenerIconoTexto(configEstado.icono)} ${etiqueta}`;
    }

    return etiqueta;
  }

  /**
   * Calcula tiempo transcurrido o duración
   * @private
   */
  private calcularTiempo(estado: EstadoSesion, datos: any): string | null {
    if (!datos.horaInicio) {
      return null;
    }

    try {
      const ahora = new Date();
      const inicio = this.parsearHora(datos.horaInicio);
      
      if (estado === EstadoSesion.COMPLETADA && datos.horaFin) {
        // Calcular duración total
        const fin = this.parsearHora(datos.horaFin);
        const duracion = fin.getTime() - inicio.getTime();
        return this.formatearDuracion(duracion);
      } else if (estado === EstadoSesion.EN_PROGRESO || estado === EstadoSesion.PAUSADA) {
        // Calcular tiempo transcurrido
        const transcurrido = ahora.getTime() - inicio.getTime();
        return this.formatearDuracion(transcurrido);
      }

      return null;
    } catch (error) {
      console.error('Error calculando tiempo:', error);
      return null;
    }
  }

  /**
   * Calcula progreso de la sesión
   * @private
   */
  private calcularProgreso(estado: EstadoSesion, datos: any): string | null {
    if (!datos.presupuestoEstimado || !datos.totalGastado) {
      return null;
    }

    const porcentaje = Math.round((datos.totalGastado / datos.presupuestoEstimado) * 100);
    
    if (estado === EstadoSesion.COMPLETADA) {
      return `100% completado`;
    } else if (estado === EstadoSesion.EN_PROGRESO) {
      return `${porcentaje}% del presupuesto`;
    }

    return null;
  }

  /**
   * Genera descripción detallada del estado
   * @private
   */
  private generarDescripcionDetallada(estado: EstadoSesion, datos: any): string {
    const configEstado = this.CONFIGURACIONES_ESTADOS[estado];
    let descripcion = configEstado.descripcion;

    // Agregar información específica según datos disponibles
    if (datos) {
      if (datos.totalProductos > 0) {
        descripcion += ` (${datos.totalProductos} productos)`;
      }

      if (datos.totalGastado && estado === EstadoSesion.COMPLETADA) {
        descripcion += `. Total gastado: $${datos.totalGastado.toLocaleString()}`;
      }

      if (datos.presupuestoEstimado && datos.totalGastado && estado === EstadoSesion.EN_PROGRESO) {
        const porcentaje = Math.round((datos.totalGastado / datos.presupuestoEstimado) * 100);
        descripcion += `. Progreso: ${porcentaje}% del presupuesto`;
      }
    }

    return descripcion;
  }

  /**
   * Genera mensaje para notificaciones
   * @private
   */
  private generarMensajeNotificacion(estado: EstadoSesion, datos: any): string {
    switch (estado) {
      case EstadoSesion.INICIADA:
        return 'Nueva sesión de compra iniciada';

      case EstadoSesion.EN_PROGRESO:
        if (datos?.totalProductos) {
          return `Compra en progreso con ${datos.totalProductos} productos`;
        }
        return 'Compra en progreso';

      case EstadoSesion.PAUSADA:
        return 'Sesión pausada. Puedes reanudarla cuando quieras';

      case EstadoSesion.COMPLETADA:
        if (datos?.totalGastado) {
          return `Compra completada. Total: $${datos.totalGastado.toLocaleString()}`;
        }
        return 'Compra completada exitosamente';

      case EstadoSesion.CANCELADA:
        return 'Sesión cancelada';

      default:
        return 'Estado de sesión actualizado';
    }
  }

  /**
   * Parsea hora en formato HH:mm
   * @private
   */
  private parsearHora(hora: string): Date {
    const [horas, minutos] = hora.split(':').map(Number);
    const fecha = new Date();
    fecha.setHours(horas, minutos, 0, 0);
    return fecha;
  }

  /**
   * Formatea duración en milisegundos
   * @private
   */
  private formatearDuracion(duracion: number): string {
    const horas = Math.floor(duracion / (1000 * 60 * 60));
    const minutos = Math.floor((duracion % (1000 * 60 * 60)) / (1000 * 60));

    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    } else if (minutos > 0) {
      return `${minutos}min`;
    } else {
      return 'recién iniciado';
    }
  }

  /**
   * Obtiene representación textual de un icono
   * @private
   */
  private obtenerIconoTexto(icono: string): string {
    const iconos: Record<string, string> = {
      'play-circle': '▶',
      'shopping-cart': '🛒',
      'pause-circle': '⏸',
      'check-circle': '✅',
      'x-circle': '❌'
    };

    return iconos[icono] || '●';
  }

  // ==================== MÉTODOS ESTÁTICOS PÚBLICOS ====================

  /**
   * Obtiene todos los estados disponibles
   * @returns Array con información de todos los estados
   */
  static obtenerEstadosDisponibles(): Array<{ estado: EstadoSesion; config: ConfiguracionEstado }> {
    const pipe = new EstadoSesionPipe();
    return Object.entries(pipe.CONFIGURACIONES_ESTADOS).map(([estado, config]) => ({
      estado: estado as EstadoSesion,
      config
    }));
  }

  /**
   * Formatea estado usando el pipe programáticamente
   * @param estado Estado a formatear
   * @param opciones Opciones de formateo
   * @returns string | EstadoFormateado Estado formateado
   */
  static formatear(estado: EstadoSesion, opciones?: Partial<OpcionesEstado>): string | EstadoFormateado {
    const pipe = new EstadoSesionPipe();
    return pipe.transform(estado, opciones);
  }

  /**
   * Formatea para badge simple
   * @param estado Estado a formatear
   * @returns EstadoFormateado Estado formateado para badge
   */
  static formatearBadge(estado: EstadoSesion): EstadoFormateado {
    return EstadoSesionPipe.formatear(estado, { 
      contexto: 'badge', 
      formatoCorto: true 
    }) as EstadoFormateado;
  }

  /**
   * Formatea para lista con tiempo
   * @param estado Estado a formatear
   * @param datosAdicionales Datos de la sesión
   * @returns EstadoFormateado Estado formateado para lista
   */
  static formatearParaLista(estado: EstadoSesion, datosAdicionales?: any): EstadoFormateado {
    return EstadoSesionPipe.formatear(estado, {
      contexto: 'lista',
      incluirTiempo: true,
      datosAdicionales
    }) as EstadoFormateado;
  }

  /**
   * Formatea para notificación
   * @param estado Estado a formatear
   * @param datosAdicionales Datos de la sesión
   * @returns EstadoFormateado Estado formateado para notificación
   */
  static formatearNotificacion(estado: EstadoSesion, datosAdicionales?: any): EstadoFormateado {
    return EstadoSesionPipe.formatear(estado, {
      contexto: 'notificacion',
      datosAdicionales
    }) as EstadoFormateado;
  }

  /**
   * Obtiene configuración de un estado específico
   * @param estado Estado del cual obtener configuración
   * @returns ConfiguracionEstado | null Configuración del estado
   */
  static obtenerConfiguracion(estado: EstadoSesion): ConfiguracionEstado | null {
    const pipe = new EstadoSesionPipe();
    return pipe.CONFIGURACIONES_ESTADOS[estado] || null;
  }

  /**
   * Obtiene color de un estado
   * @param estado Estado del cual obtener color
   * @returns string Color hexadecimal
   */
  static obtenerColor(estado: EstadoSesion): string {
    const config = EstadoSesionPipe.obtenerConfiguracion(estado);
    return config ? config.color : '#95a5a6';
  }

  /**
   * Obtiene icono de un estado
   * @param estado Estado del cual obtener icono
   * @returns string Nombre del icono
   */
  static obtenerIcono(estado: EstadoSesion): string {
    const config = EstadoSesionPipe.obtenerConfiguracion(estado);
    return config ? config.icono : 'help-circle';
  }

  /**
   * Obtiene clase CSS de un estado
   * @param estado Estado del cual obtener clase
   * @returns string Clase CSS
   */
  static obtenerClaseCSS(estado: EstadoSesion): string {
    const config = EstadoSesionPipe.obtenerConfiguracion(estado);
    return config ? config.claseCSS : 'text-muted';
  }

  /**
   * Ordena estados por prioridad
   * @param estados Array de estados a ordenar
   * @returns EstadoSesion[] Estados ordenados por prioridad
   */
  static ordenarPorPrioridad(estados: EstadoSesion[]): EstadoSesion[] {
    const pipe = new EstadoSesionPipe();
    return estados.sort((a, b) => {
      const configA = pipe.CONFIGURACIONES_ESTADOS[a];
      const configB = pipe.CONFIGURACIONES_ESTADOS[b];
      return configA.prioridad - configB.prioridad;
    });
  }

  /**
   * Valida si un estado es válido
   * @param estado Estado a validar
   * @returns boolean True si es válido
   */
  static esEstadoValido(estado: any): estado is EstadoSesion {
    return Object.values(EstadoSesion).includes(estado as EstadoSesion);
  }

  /**
   * Obtiene estados activos (no finalizados)
   * @returns EstadoSesion[] Estados activos
   */
  static obtenerEstadosActivos(): EstadoSesion[] {
    return [
      EstadoSesion.INICIADA,
      EstadoSesion.EN_PROGRESO,
      EstadoSesion.PAUSADA
    ];
  }

  /**
   * Obtiene estados finalizados
   * @returns EstadoSesion[] Estados finalizados
   */
  static obtenerEstadosFinalizados(): EstadoSesion[] {
    return [
      EstadoSesion.COMPLETADA,
      EstadoSesion.CANCELADA
    ];
  }

  /**
   * Determina si un estado permite edición
   * @param estado Estado a verificar
   * @returns boolean True si permite edición
   */
  static permiteEdicion(estado: EstadoSesion): boolean {
    const estadosEditables = [
      EstadoSesion.INICIADA,
      EstadoSesion.EN_PROGRESO,
      EstadoSesion.PAUSADA
    ];
    return estadosEditables.includes(estado);
  }

  /**
   * Determina el siguiente estado lógico
   * @param estadoActual Estado actual
   * @returns EstadoSesion | null Siguiente estado sugerido
   */
  static siguienteEstado(estadoActual: EstadoSesion): EstadoSesion | null {
    switch (estadoActual) {
      case EstadoSesion.INICIADA:
        return EstadoSesion.EN_PROGRESO;
      case EstadoSesion.EN_PROGRESO:
        return EstadoSesion.COMPLETADA;
      case EstadoSesion.PAUSADA:
        return EstadoSesion.EN_PROGRESO;
      default:
        return null;
    }
  }

  /**
   * Obtiene información de debug del pipe
   * @returns object Información de debug
   */
  static obtenerInfoDebug(): object {
    const estados = EstadoSesionPipe.obtenerEstadosDisponibles();
    
    return {
      version: '1.0.0',
      totalEstados: estados.length,
      estadosActivos: EstadoSesionPipe.obtenerEstadosActivos().length,
      estadosFinalizados: EstadoSesionPipe.obtenerEstadosFinalizados().length,
      configuracionEstados: estados.reduce((acc, { estado, config }) => {
        acc[estado] = {
          etiqueta: config.etiqueta,
          color: config.color,
          icono: config.icono,
          prioridad: config.prioridad
        };
        return acc;
      }, {} as Record<string, any>),
      ejemplosFormato: {
        badge: EstadoSesionPipe.formatearBadge(EstadoSesion.EN_PROGRESO),
        lista: EstadoSesionPipe.formatearParaLista(EstadoSesion.COMPLETADA, { 
          totalProductos: 5, 
          totalGastado: 15000 
        }),
        notificacion: EstadoSesionPipe.formatearNotificacion(EstadoSesion.PAUSADA)
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Exportar tipos para uso en otros archivos
export type { OpcionesEstado, ConfiguracionEstado, EstadoFormateado };