/**
 * Modelo de usuario para la aplicación Carrito
 * 
 * Gestiona información básica del usuario y sus preferencias
 * Diseñado para aplicación offline sin autenticación externa
 * 
 * @author Tu Nombre
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Configuracion } from './configuracion.model';

export interface IUsuario {
  /** Identificador único del usuario */
  id: string;
  
  /** Nombre del usuario (opcional) */
  nombre?: string;
  
  /** Configuración personalizada del usuario */
  configuracion: Configuracion;
  
  /** Estadísticas de uso de la aplicación */
  estadisticas: EstadisticasUsuario;
  
  /** Preferencias de supermercados favoritos */
  supermercadosFavoritos: string[];
  
  /** Productos favoritos frecuentes */
  productosFavoritos: ProductoFavorito[];
  
  /** Presupuestos personalizados por período */
  presupuestosPersonalizados: PresupuestoPersonalizado[];
  
  /** Fecha de primer uso de la aplicación */
  fechaCreacion: Date;
  
  /** Fecha de último acceso */
  fechaUltimoAcceso: Date;
  
  /** Versión de datos del usuario */
  version: number;
}

/**
 * Estadísticas de uso del usuario
 */
export interface EstadisticasUsuario {
  /** Total de sesiones de compra realizadas */
  totalSesiones: number;
  
  /** Total de dinero gastado en todas las compras */
  totalGastado: number;
  
  /** Promedio de gasto por sesión */
  promedioGastoPorSesion: number;
  
  /** Total de productos comprados */
  totalProductosComprados: number;
  
  /** Supermercado más visitado */
  supermercadoMasVisitado?: string;
  
  /** Categoría de producto más comprada */
  categoriaMasComprada?: string;
  
  /** Días de uso de la aplicación */
  diasDeUso: number;
  
  /** Tiempo promedio por sesión en minutos */
  tiempoPromedioSesion: number;
  
  /** Número de respaldos realizados */
  respaldosRealizados: number;
  
  /** Última vez que se actualizaron las estadísticas */
  fechaUltimaActualizacion: Date;
}

/**
 * Producto favorito del usuario
 */
export interface ProductoFavorito {
  /** Nombre del producto */
  nombre: string;
  
  /** Categoría del producto */
  categoria?: string;
  
  /** Precio promedio del producto */
  precioPromedio: number;
  
  /** Cantidad de veces que se ha comprado */
  frecuenciaCompra: number;
  
  /** Última vez que se compró */
  fechaUltimaCompra: Date;
  
  /** Supermercados donde se ha encontrado */
  supermercadosDisponibles: string[];
}

/**
 * Presupuesto personalizado por período
 */
export interface PresupuestoPersonalizado {
  /** Identificador único del presupuesto */
  id: string;
  
  /** Nombre descriptivo del presupuesto */
  nombre: string;
  
  /** Monto del presupuesto */
  monto: number;
  
  /** Período del presupuesto */
  periodo: PeriodoPresupuesto;
  
  /** Categorías incluidas en el presupuesto */
  categoriasIncluidas?: string[];
  
  /** Supermercados incluidos en el presupuesto */
  supermercadosIncluidos?: string[];
  
  /** Fecha de inicio del presupuesto */
  fechaInicio: Date;
  
  /** Fecha de fin del presupuesto (opcional) */
  fechaFin?: Date;
  
  /** Indica si el presupuesto está activo */
  activo: boolean;
}

/**
 * Períodos disponibles para presupuestos
 */
export enum PeriodoPresupuesto {
  SEMANAL = 'semanal',
  QUINCENAL = 'quincenal',
  MENSUAL = 'mensual',
  TRIMESTRAL = 'trimestral',
  ANUAL = 'anual',
  PERSONALIZADO = 'personalizado'
}

/**
 * Clase concreta que implementa el modelo de usuario
 */
export class Usuario implements IUsuario {
  id: string;
  nombre?: string;
  configuracion: Configuracion;
  estadisticas: EstadisticasUsuario;
  supermercadosFavoritos: string[];
  productosFavoritos: ProductoFavorito[];
  presupuestosPersonalizados: PresupuestoPersonalizado[];
  fechaCreacion: Date;
  fechaUltimoAcceso: Date;
  version: number;

  constructor(datos?: Partial<IUsuario>) {
    this.id = datos?.id || this.generarIdUsuario();
    this.nombre = datos?.nombre;
    this.configuracion = datos?.configuracion || new Configuracion();
    this.estadisticas = this.crearEstadisticasIniciales(datos?.estadisticas);
    this.supermercadosFavoritos = datos?.supermercadosFavoritos || [];
    this.productosFavoritos = datos?.productosFavoritos || [];
    this.presupuestosPersonalizados = datos?.presupuestosPersonalizados || [];
    this.fechaCreacion = datos?.fechaCreacion || new Date();
    this.fechaUltimoAcceso = datos?.fechaUltimoAcceso || new Date();
    this.version = datos?.version || 1;
  }

  /**
   * Genera un ID único para el usuario
   * @returns string ID único del usuario
   */
  private generarIdUsuario(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `usuario_${timestamp}_${random}`;
  }

  /**
   * Crea estadísticas iniciales para nuevo usuario
   * @param datos Estadísticas existentes (opcional)
   * @returns EstadisticasUsuario Estadísticas inicializadas
   */
  private crearEstadisticasIniciales(datos?: Partial<EstadisticasUsuario>): EstadisticasUsuario {
    return {
      totalSesiones: datos?.totalSesiones || 0,
      totalGastado: datos?.totalGastado || 0,
      promedioGastoPorSesion: datos?.promedioGastoPorSesion || 0,
      totalProductosComprados: datos?.totalProductosComprados || 0,
      supermercadoMasVisitado: datos?.supermercadoMasVisitado,
      categoriaMasComprada: datos?.categoriaMasComprada,
      diasDeUso: datos?.diasDeUso || 0,
      tiempoPromedioSesion: datos?.tiempoPromedioSesion || 0,
      respaldosRealizados: datos?.respaldosRealizados || 0,
      fechaUltimaActualizacion: datos?.fechaUltimaActualizacion || new Date()
    };
  }

  /**
   * Actualiza las estadísticas del usuario con una nueva sesión
   * @param montoGastado Monto de la nueva sesión
   * @param cantidadProductos Cantidad de productos en la sesión
   * @param nombreSupermercado Nombre del supermercado
   * @param tiempoSesion Tiempo de duración en minutos
   */
  public actualizarEstadisticasConSesion(
    montoGastado: number,
    cantidadProductos: number,
    nombreSupermercado: string,
    tiempoSesion: number = 0
  ): void {
    this.estadisticas.totalSesiones += 1;
    this.estadisticas.totalGastado += montoGastado;
    this.estadisticas.totalProductosComprados += cantidadProductos;
    
    // Recalcular promedio de gasto
    this.estadisticas.promedioGastoPorSesion = 
      this.estadisticas.totalGastado / this.estadisticas.totalSesiones;
    
    // Actualizar supermercado más visitado
    this.actualizarSupermercadoFavorito(nombreSupermercado);
    
    // Actualizar tiempo promedio de sesión
    if (tiempoSesion > 0) {
      const tiempoTotalAnterior = this.estadisticas.tiempoPromedioSesion * (this.estadisticas.totalSesiones - 1);
      this.estadisticas.tiempoPromedioSesion = 
        (tiempoTotalAnterior + tiempoSesion) / this.estadisticas.totalSesiones;
    }
    
    this.estadisticas.fechaUltimaActualizacion = new Date();
    this.fechaUltimoAcceso = new Date();
    this.version += 1;
  }

  /**
   * Actualiza el supermercado favorito basado en frecuencia
   * @param nombreSupermercado Nombre del supermercado
   */
  private actualizarSupermercadoFavorito(nombreSupermercado: string): void {
    // Agregar a favoritos si no existe
    if (!this.supermercadosFavoritos.includes(nombreSupermercado)) {
      this.supermercadosFavoritos.push(nombreSupermercado);
    }
    
    // Lógica para determinar el más visitado se implementaría
    // contando frecuencias en el historial de sesiones
    this.estadisticas.supermercadoMasVisitado = nombreSupermercado;
  }

  /**
   * Agrega o actualiza un producto favorito
   * @param nombreProducto Nombre del producto
   * @param precio Precio del producto
   * @param categoria Categoría del producto
   * @param supermercado Supermercado donde se encontró
   */
  public actualizarProductoFavorito(
    nombreProducto: string,
    precio: number,
    categoria?: string,
    supermercado?: string
  ): void {
    const productoExistente = this.productosFavoritos.find(
      p => p.nombre.toLowerCase() === nombreProducto.toLowerCase()
    );

    if (productoExistente) {
      // Actualizar producto existente
      productoExistente.frecuenciaCompra += 1;
      productoExistente.fechaUltimaCompra = new Date();
      
      // Actualizar precio promedio
      const precioTotalAnterior = productoExistente.precioPromedio * (productoExistente.frecuenciaCompra - 1);
      productoExistente.precioPromedio = (precioTotalAnterior + precio) / productoExistente.frecuenciaCompra;
      
      // Agregar supermercado si no está en la lista
      if (supermercado && !productoExistente.supermercadosDisponibles.includes(supermercado)) {
        productoExistente.supermercadosDisponibles.push(supermercado);
      }
    } else {
      // Crear nuevo producto favorito
      const nuevoProducto: ProductoFavorito = {
        nombre: nombreProducto,
        categoria: categoria,
        precioPromedio: precio,
        frecuenciaCompra: 1,
        fechaUltimaCompra: new Date(),
        supermercadosDisponibles: supermercado ? [supermercado] : []
      };
      
      this.productosFavoritos.push(nuevoProducto);
    }

    this.version += 1;
  }

  /**
   * Crea un nuevo presupuesto personalizado
   * @param datos Datos del presupuesto
   * @returns string ID del presupuesto creado
   */
  public crearPresupuestoPersonalizado(datos: {
    nombre: string;
    monto: number;
    periodo: PeriodoPresupuesto;
    categoriasIncluidas?: string[];
    supermercadosIncluidos?: string[];
    fechaInicio?: Date;
    fechaFin?: Date;
  }): string {
    const nuevoPresupuesto: PresupuestoPersonalizado = {
      id: this.generarIdPresupuesto(),
      nombre: datos.nombre,
      monto: datos.monto,
      periodo: datos.periodo,
      categoriasIncluidas: datos.categoriasIncluidas,
      supermercadosIncluidos: datos.supermercadosIncluidos,
      fechaInicio: datos.fechaInicio || new Date(),
      fechaFin: datos.fechaFin,
      activo: true
    };

    this.presupuestosPersonalizados.push(nuevoPresupuesto);
    this.version += 1;
    
    return nuevoPresupuesto.id;
  }

  /**
   * Genera ID único para presupuesto
   * @returns string ID único
   */
  private generarIdPresupuesto(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 3);
    return `presup_${timestamp}_${random}`;
  }

  /**
   * Desactiva un presupuesto personalizado
   * @param idPresupuesto ID del presupuesto a desactivar
   * @returns boolean True si se desactivó exitosamente
   */
  public desactivarPresupuesto(idPresupuesto: string): boolean {
    const presupuesto = this.presupuestosPersonalizados.find(p => p.id === idPresupuesto);
    
    if (presupuesto) {
      presupuesto.activo = false;
      this.version += 1;
      return true;
    }
    
    return false;
  }

  /**
   * Obtiene presupuestos activos
   * @returns PresupuestoPersonalizado[] Lista de presupuestos activos
   */
  public obtenerPresupuestosActivos(): PresupuestoPersonalizado[] {
    return this.presupuestosPersonalizados.filter(p => p.activo);
  }

  /**
   * Obtiene productos favoritos ordenados por frecuencia
   * @param limite Límite de productos a retornar
   * @returns ProductoFavorito[] Lista de productos favoritos
   */
  public obtenerProductosFavoritosOrdenados(limite: number = 10): ProductoFavorito[] {
    return this.productosFavoritos
      .sort((a, b) => b.frecuenciaCompra - a.frecuenciaCompra)
      .slice(0, limite);
  }

  /**
   * Incrementa el contador de respaldos realizados
   */
  public registrarRespaldo(): void {
    this.estadisticas.respaldosRealizados += 1;
    this.estadisticas.fechaUltimaActualizacion = new Date();
    this.version += 1;
  }

  /**
   * Actualiza la fecha de último acceso
   */
  public registrarAcceso(): void {
    this.fechaUltimoAcceso = new Date();
    
    // Calcular días de uso (aproximado)
    const diasTranscurridos = Math.floor(
      (this.fechaUltimoAcceso.getTime() - this.fechaCreacion.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diasTranscurridos > this.estadisticas.diasDeUso) {
      this.estadisticas.diasDeUso = diasTranscurridos;
    }
  }

  /**
   * Verifica si el usuario es nuevo (menos de 7 días o pocas sesiones)
   * @returns boolean True si es usuario nuevo
   */
  public esUsuarioNuevo(): boolean {
    const diasDesdeCreacion = Math.floor(
      (new Date().getTime() - this.fechaCreacion.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return diasDesdeCreacion < 7 || this.estadisticas.totalSesiones < 5;
  }

/**
   * Obtiene recomendaciones basadas en el historial del usuario
   * @returns object Recomendaciones personalizadas
   */
  public obtenerRecomendaciones(): {
    supermercadosRecomendados: string[];
    productosRecomendados: string[];
    presupuestoSugerido: number;
  } {
    const supermercadosRecomendados = this.supermercadosFavoritos.slice(0, 3);
    
    const productosRecomendados = this.productosFavoritos
      .sort((a, b) => b.frecuenciaCompra - a.frecuenciaCompra)
      .slice(0, 5)
      .map(p => p.nombre);
    
    // Sugerir presupuesto basado en promedio histórico con margen del 10%
    const presupuestoSugerido = Math.round(this.estadisticas.promedioGastoPorSesion * 1.1);
    
    return {
      supermercadosRecomendados,
      productosRecomendados,
      presupuestoSugerido
    };
  }

  /**
   * Exporta datos del usuario para respaldo
   * @param incluirEstadisticas Incluir estadísticas en la exportación
   * @returns object Datos del usuario para exportar
   */
  public exportarDatos(incluirEstadisticas: boolean = true): object {
    const datosExportacion: any = {
      id: this.id,
      nombre: this.nombre,
      configuracion: this.configuracion.exportar(),
      supermercadosFavoritos: this.supermercadosFavoritos,
      productosFavoritos: this.productosFavoritos,
      presupuestosPersonalizados: this.presupuestosPersonalizados,
      fechaCreacion: this.fechaCreacion.toISOString(),
      version: this.version,
      fechaExportacion: new Date().toISOString()
    };

    if (incluirEstadisticas) {
      datosExportacion.estadisticas = this.estadisticas;
    }

    return datosExportacion;
  }

  /**
   * Importa datos del usuario desde respaldo
   * @param datos Datos a importar
   * @throws Error si los datos no son válidos
   */
  public importarDatos(datos: any): void {
    try {
      // Validar estructura básica
      if (!datos.id || !datos.configuracion) {
        throw new Error('Datos de usuario incompletos');
      }

      // Importar configuración
      this.configuracion.importar(datos.configuracion);
      
      // Importar otros datos
      this.nombre = datos.nombre;
      this.supermercadosFavoritos = datos.supermercadosFavoritos || [];
      this.productosFavoritos = datos.productosFavoritos || [];
      this.presupuestosPersonalizados = datos.presupuestosPersonalizados || [];
      
      if (datos.estadisticas) {
        this.estadisticas = {
          ...this.estadisticas,
          ...datos.estadisticas,
          fechaUltimaActualizacion: new Date()
        };
      }

      this.version += 1;
      this.fechaUltimoAcceso = new Date();

    } catch (error) {
      throw new Error('Error al importar datos del usuario: ' + error);
    }
  }

  /**
   * Convierte el usuario a formato JSON para almacenamiento
   * @returns string Usuario en formato JSON
   */
  public toJSON(): string {
    return JSON.stringify({
      id: this.id,
      nombre: this.nombre,
      configuracion: this.configuracion.exportar(),
      estadisticas: this.estadisticas,
      supermercadosFavoritos: this.supermercadosFavoritos,
      productosFavoritos: this.productosFavoritos,
      presupuestosPersonalizados: this.presupuestosPersonalizados,
      fechaCreacion: this.fechaCreacion.toISOString(),
      fechaUltimoAcceso: this.fechaUltimoAcceso.toISOString(),
      version: this.version
    });
  }

  /**
   * Crea usuario desde datos JSON
   * @param json String JSON con datos del usuario
   * @returns Usuario Instancia de usuario creada
   */
  public static fromJSON(json: string): Usuario {
    try {
      const datos = JSON.parse(json);
      
      // Convertir fechas
      datos.fechaCreacion = new Date(datos.fechaCreacion);
      datos.fechaUltimoAcceso = new Date(datos.fechaUltimoAcceso);
      
      if (datos.estadisticas?.fechaUltimaActualizacion) {
        datos.estadisticas.fechaUltimaActualizacion = new Date(datos.estadisticas.fechaUltimaActualizacion);
      }

      // Convertir fechas en productos favoritos
      if (datos.productosFavoritos) {
        datos.productosFavoritos = datos.productosFavoritos.map((p: any) => ({
          ...p,
          fechaUltimaCompra: new Date(p.fechaUltimaCompra)
        }));
      }

      // Convertir fechas en presupuestos
      if (datos.presupuestosPersonalizados) {
        datos.presupuestosPersonalizados = datos.presupuestosPersonalizados.map((p: any) => ({
          ...p,
          fechaInicio: new Date(p.fechaInicio),
          fechaFin: p.fechaFin ? new Date(p.fechaFin) : undefined
        }));
      }

      // Crear configuración
      if (datos.configuracion) {
        datos.configuracion = new Configuracion(datos.configuracion);
      }

      return new Usuario(datos);
    } catch (error) {
      throw new Error('Error al parsear datos JSON del usuario');
    }
  }

  /**
   * Valida que los datos del usuario sean consistentes
   * @returns boolean True si es válido
   */
  public esValido(): boolean {
    try {
      // Validar ID
      if (!this.id || this.id.trim().length === 0) {
        return false;
      }

      // Validar configuración
      if (!this.configuracion || !this.configuracion.esValida()) {
        return false;
      }

      // Validar estadísticas básicas
      if (this.estadisticas.totalSesiones < 0 || 
          this.estadisticas.totalGastado < 0 ||
          this.estadisticas.totalProductosComprados < 0) {
        return false;
      }

      // Validar coherencia de estadísticas
      if (this.estadisticas.totalSesiones > 0) {
        const promedioCalculado = this.estadisticas.totalGastado / this.estadisticas.totalSesiones;
        const diferencia = Math.abs(promedioCalculado - this.estadisticas.promedioGastoPorSesion);
        
        if (diferencia > 0.01) { // Tolerancia de 1 centavo
          return false;
        }
      }

      // Validar fechas
      if (this.fechaCreacion > new Date() || 
          this.fechaUltimoAcceso < this.fechaCreacion) {
        return false;
      }

      // Validar presupuestos
      for (const presupuesto of this.presupuestosPersonalizados) {
        if (presupuesto.monto <= 0 || 
            !presupuesto.nombre || 
            presupuesto.fechaInicio > new Date()) {
          return false;
        }
        
        if (presupuesto.fechaFin && presupuesto.fechaFin <= presupuesto.fechaInicio) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Limpia datos antiguos según configuración de retención
   */
  public limpiarDatosAntiguos(): void {
    const diasRetencion = this.configuracion.seguridad.retencionDatos;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);

    // Limpiar productos favoritos muy antiguos (sin actividad reciente)
    this.productosFavoritos = this.productosFavoritos.filter(
      producto => producto.fechaUltimaCompra >= fechaLimite
    );

    // Limpiar presupuestos expirados inactivos
    this.presupuestosPersonalizados = this.presupuestosPersonalizados.filter(
      presupuesto => presupuesto.activo || 
                    !presupuesto.fechaFin || 
                    presupuesto.fechaFin >= fechaLimite
    );

    this.version += 1;
  }

  /**
   * Genera resumen de actividad del usuario
   * @returns object Resumen de actividad
   */
  public generarResumenActividad(): {
    nivelActividad: 'bajo' | 'medio' | 'alto';
    sesionesUltimoMes: number;
    gastoUltimoMes: number;
    productosNuevosUltimoMes: number;
    tendenciaGasto: 'creciente' | 'estable' | 'decreciente';
  } {
    // Calcular nivel de actividad basado en sesiones
    let nivelActividad: 'bajo' | 'medio' | 'alto' = 'bajo';
    if (this.estadisticas.totalSesiones > 50) {
      nivelActividad = 'alto';
    } else if (this.estadisticas.totalSesiones > 10) {
      nivelActividad = 'medio';
    }

    // Para una implementación completa, estos valores se calcularían
    // basándose en el historial real de sesiones
    const sesionesUltimoMes = Math.min(this.estadisticas.totalSesiones, 15);
    const gastoUltimoMes = this.estadisticas.promedioGastoPorSesion * sesionesUltimoMes;
    
    // Contar productos nuevos del último mes
    const fechaHaceUnMes = new Date();
    fechaHaceUnMes.setMonth(fechaHaceUnMes.getMonth() - 1);
    
    const productosNuevosUltimoMes = this.productosFavoritos.filter(
      p => p.fechaUltimaCompra >= fechaHaceUnMes
    ).length;

    // Tendencia simplificada
    const tendenciaGasto: 'creciente' | 'estable' | 'decreciente' = 'estable';

    return {
      nivelActividad,
      sesionesUltimoMes,
      gastoUltimoMes,
      productosNuevosUltimoMes,
      tendenciaGasto
    };
  }

  /**
   * Obtiene configuración de notificaciones personalizadas
   * @returns object Configuración de notificaciones
   */
  public obtenerConfiguracionNotificaciones(): {
    debeNotificarPresupuesto: boolean;
    debeNotificarProductosNuevos: boolean;
    debeNotificarResumen: boolean;
  } {
    return {
      debeNotificarPresupuesto: this.configuracion.notificacionHabilitada('presupuesto'),
      debeNotificarProductosNuevos: this.configuracion.notificacionHabilitada('productos'),
      debeNotificarResumen: this.configuracion.notificacionHabilitada('resumen')
    };
  }

  /**
   * Crea una copia del usuario para respaldo
   * @returns Usuario Nueva instancia del usuario
   */
  public clonar(): Usuario {
    const datosClonados = JSON.parse(this.toJSON());
    return Usuario.fromJSON(JSON.stringify(datosClonados));
  }

  /**
   * Obtiene información resumida para logging (sin datos sensibles)
   * @returns object Información resumida
   */
  public obtenerResumenParaLog(): object {
    return {
      id: this.id,
      tieneNombre: !!this.nombre,
      totalSesiones: this.estadisticas.totalSesiones,
      diasDeUso: this.estadisticas.diasDeUso,
      version: this.version,
      fechaCreacion: this.fechaCreacion.toISOString(),
      esNuevo: this.esUsuarioNuevo()
    };
  }
}

/**
 * Utilidades para trabajar con usuarios
 */
export class UsuarioUtils {
  /**
   * Crea un usuario por defecto para primera instalación
   * @param nombre Nombre opcional del usuario
   * @returns Usuario Usuario inicial
   */
  public static crearUsuarioPorDefecto(nombre?: string): Usuario {
    return new Usuario({
      nombre: nombre,
      configuracion: new Configuracion()
    });
  }

  /**
   * Valida el formato de un ID de usuario
   * @param id ID a validar
   * @returns boolean True si es válido
   */
  public static validarIdUsuario(id: string): boolean {
    const patron = /^usuario_[a-z0-9]+_[a-z0-9]+$/;
    return patron.test(id);
  }

  /**
   * Migra usuario de versión anterior
   * @param datosAntiguos Datos en formato anterior
   * @returns Usuario Usuario migrado
   */
  public static migrarUsuario(datosAntiguos: any): Usuario {
    try {
      // Aplicar migraciones específicas según la versión
      let datosMigrados = { ...datosAntiguos };
      
      // Migración de versión 1 a 2 (ejemplo)
      if (!datosMigrados.version || datosMigrados.version < 2) {
        datosMigrados = this.migrarV1aV2(datosMigrados);
      }
      
      return new Usuario(datosMigrados);
    } catch (error) {
      // Si falla la migración, crear usuario nuevo
      return this.crearUsuarioPorDefecto();
    }
  }

  /**
   * Migración específica de versión 1 a 2
   * @param datos Datos en versión 1
   * @returns object Datos migrados a versión 2
   */
  private static migrarV1aV2(datos: any): any {
    // Ejemplo de migración: agregar campos nuevos con valores por defecto
    return {
      ...datos,
      version: 2,
      presupuestosPersonalizados: datos.presupuestosPersonalizados || [],
      estadisticas: {
        ...datos.estadisticas,
        respaldosRealizados: 0,
        fechaUltimaActualizacion: new Date()
      }
    };
  }

  /**
   * Calcula el nivel de experiencia del usuario
   * @param usuario Usuario a evaluar
   * @returns object Nivel y progreso
   */
  public static calcularNivelExperiencia(usuario: Usuario): {
    nivel: number;
    nombreNivel: string;
    progreso: number;
    siguienteNivel: number;
  } {
    const sesiones = usuario.estadisticas.totalSesiones;
    
    let nivel = 1;
    let nombreNivel = 'Principiante';
    
    if (sesiones >= 100) {
      nivel = 5;
      nombreNivel = 'Experto';
    } else if (sesiones >= 50) {
      nivel = 4;
      nombreNivel = 'Avanzado';
    } else if (sesiones >= 20) {
      nivel = 3;
      nombreNivel = 'Intermedio';
    } else if (sesiones >= 5) {
      nivel = 2;
      nombreNivel = 'Novato';
    }
    
    // Calcular progreso hacia siguiente nivel
    const limites = [0, 5, 20, 50, 100];
    const siguienteNivel = limites[nivel] || 200;
    const nivelAnterior = limites[nivel - 1] || 0;
    
    const progreso = Math.min(100, 
      ((sesiones - nivelAnterior) / (siguienteNivel - nivelAnterior)) * 100
    );
    
    return {
      nivel,
      nombreNivel,
      progreso: Math.round(progreso),
      siguienteNivel
    };
  }
}

/**
 * Constantes relacionadas con usuarios
 */
export const USUARIO_CONSTANTES = {
  /** Máximo número de productos favoritos */
  MAX_PRODUCTOS_FAVORITOS: 100,
  
  /** Máximo número de supermercados favoritos */
  MAX_SUPERMERCADOS_FAVORITOS: 20,
  
  /** Máximo número de presupuestos personalizados */
  MAX_PRESUPUESTOS_PERSONALIZADOS: 10,
  
  /** Días mínimos para considerar usuario activo */
  DIAS_USUARIO_ACTIVO: 7,
  
  /** Sesiones mínimas para recomendaciones personalizadas */
  SESIONES_MIN_RECOMENDACIONES: 3
};
