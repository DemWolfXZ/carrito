/**
 * Servicio de Cálculos Matemáticos
 * 
 * Maneja todos los cálculos matemáticos, formateo de moneda,
 * validaciones numéricas y operaciones de precisión decimal.
 * Incluye utilidades para cálculos financieros y estadísticos.
 * 
 * @author Tu Nombre
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Producto } from '../models/producto.model';
import { SesionCompra } from '../models/sesion-compra.model';
import { Configuracion, Moneda } from '../models/configuracion.model';

/**
 * Interfaz para resultado de cálculo
 */
interface ResultadoCalculo {
  valor: number;
  valorFormateado: string;
  valido: boolean;
  error?: string;
  precision: number;
}

/**
 * Interfaz para estadísticas calculadas
 */
interface EstadisticasCalculadas {
  suma: number;
  promedio: number;
  mediana: number;
  moda: number;
  minimo: number;
  maximo: number;
  desviacionEstandar: number;
  varianza: number;
  rango: number;
  cantidad: number;
}

/**
 * Interfaz para cálculos de presupuesto
 */
interface CalculoPresupuesto {
  presupuestoOriginal: number;
  totalGastado: number;
  restante: number;
  porcentajeUtilizado: number;
  porcentajeRestante: number;
  excedePresupuesto: boolean;
  exceso: number;
  proyeccionFinal?: number;
  recomendacion: string;
}

/**
 * Interfaz para cálculos financieros
 */
interface CalculoFinanciero {
  subtotal: number;
  descuentos: number;
  impuestos: number;
  total: number;
  ahorro: number;
  porcentajeDescuento: number;
  porcentajeImpuesto: number;
}

/**
 * Interfaz para análisis de tendencias
 */
interface AnalisisTendencia {
  tendencia: 'creciente' | 'decreciente' | 'estable';
  porcentajeCambio: number;
  valorInicial: number;
  valorFinal: number;
  puntosMedios: number[];
  correlacion: number;
  prediccionSiguiente?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CalculoService {

  // Configuración de precisión decimal
  private readonly PRECISION_DECIMAL = 2;
  private readonly PRECISION_PORCENTAJE = 1;
  private readonly PRECISION_ESTADISTICAS = 4;

  // Límites de validación
  private readonly LIMITE_MAXIMO_CALCULO = 999999999.99;
  private readonly LIMITE_MINIMO_CALCULO = 0.01;

  constructor() {
    console.log('🧮 Servicio de cálculos inicializado');
  }

  // ==================== CÁLCULOS BÁSICOS ====================

  /**
   * Suma una lista de números con precisión decimal
   * @param numeros Array de números a sumar
   * @returns ResultadoCalculo Resultado de la suma
   */
  public sumar(numeros: number[]): ResultadoCalculo {
    try {
      this.validarArrayNumeros(numeros);

      const suma = numeros.reduce((total, num) => {
        return this.sumarConPrecision(total, num);
      }, 0);

      return {
        valor: suma,
        valorFormateado: this.formatearNumero(suma),
        valido: true,
        precision: this.PRECISION_DECIMAL
      };
    } catch (error) {
      return this.crearResultadoError(error as Error);
    }
  }

  /**
   * Resta dos números con precisión decimal
   * @param minuendo Número del cual se resta
   * @param sustraendo Número que se resta
   * @returns ResultadoCalculo Resultado de la resta
   */
  public restar(minuendo: number, sustraendo: number): ResultadoCalculo {
    try {
      this.validarNumero(minuendo, 'minuendo');
      this.validarNumero(sustraendo, 'sustraendo');

      const resultado = this.restarConPrecision(minuendo, sustraendo);

      return {
        valor: resultado,
        valorFormateado: this.formatearNumero(resultado),
        valido: true,
        precision: this.PRECISION_DECIMAL
      };
    } catch (error) {
      return this.crearResultadoError(error as Error);
    }
  }

  /**
   * Multiplica dos números con precisión decimal
   * @param multiplicando Primer número
   * @param multiplicador Segundo número
   * @returns ResultadoCalculo Resultado de la multiplicación
   */
  public multiplicar(multiplicando: number, multiplicador: number): ResultadoCalculo {
    try {
      this.validarNumero(multiplicando, 'multiplicando');
      this.validarNumero(multiplicador, 'multiplicador');

      const resultado = this.multiplicarConPrecision(multiplicando, multiplicador);

      return {
        valor: resultado,
        valorFormateado: this.formatearNumero(resultado),
        valido: true,
        precision: this.PRECISION_DECIMAL
      };
    } catch (error) {
      return this.crearResultadoError(error as Error);
    }
  }

  /**
   * Divide dos números con precisión decimal
   * @param dividendo Número a dividir
   * @param divisor Número por el cual dividir
   * @returns ResultadoCalculo Resultado de la división
   */
  public dividir(dividendo: number, divisor: number): ResultadoCalculo {
    try {
      this.validarNumero(dividendo, 'dividendo');
      this.validarNumero(divisor, 'divisor');

      if (divisor === 0) {
        throw new Error('No se puede dividir por cero');
      }

      const resultado = this.dividirConPrecision(dividendo, divisor);

      return {
        valor: resultado,
        valorFormateado: this.formatearNumero(resultado),
        valido: true,
        precision: this.PRECISION_DECIMAL
      };
    } catch (error) {
      return this.crearResultadoError(error as Error);
    }
  }

  /**
   * Calcula un porcentaje
   * @param valor Valor base
   * @param porcentaje Porcentaje a calcular
   * @returns ResultadoCalculo Resultado del porcentaje
   */
  public calcularPorcentaje(valor: number, porcentaje: number): ResultadoCalculo {
    try {
      this.validarNumero(valor, 'valor');
      this.validarNumero(porcentaje, 'porcentaje');

      const resultado = this.multiplicarConPrecision(valor, porcentaje / 100);

      return {
        valor: resultado,
        valorFormateado: this.formatearNumero(resultado),
        valido: true,
        precision: this.PRECISION_DECIMAL
      };
    } catch (error) {
      return this.crearResultadoError(error as Error);
    }
  }

  /**
   * Calcula qué porcentaje representa un valor de otro
   * @param parte Valor parcial
   * @param total Valor total
   * @returns ResultadoCalculo Porcentaje calculado
   */
  public calcularPorcentajeDeTotal(parte: number, total: number): ResultadoCalculo {
    try {
      this.validarNumero(parte, 'parte');
      this.validarNumero(total, 'total');

      if (total === 0) {
        throw new Error('El total no puede ser cero para calcular porcentaje');
      }

      const porcentaje = this.dividirConPrecision(parte * 100, total);

      return {
        valor: porcentaje,
        valorFormateado: this.formatearPorcentaje(porcentaje),
        valido: true,
        precision: this.PRECISION_PORCENTAJE
      };
    } catch (error) {
      return this.crearResultadoError(error as Error);
    }
  }

  // ==================== CÁLCULOS DE PRODUCTOS ====================

  /**
   * Calcula el total de un producto (precio × cantidad)
   * @param precioUnitario Precio por unidad
   * @param cantidad Cantidad de unidades
   * @returns ResultadoCalculo Total del producto
   */
  public calcularTotalProducto(precioUnitario: number, cantidad: number): ResultadoCalculo {
    try {
      this.validarNumero(precioUnitario, 'precio unitario');
      this.validarNumero(cantidad, 'cantidad');

      if (precioUnitario < 0) {
        throw new Error('El precio unitario no puede ser negativo');
      }

      if (cantidad < 0) {
        throw new Error('La cantidad no puede ser negativa');
      }

      if (!Number.isInteger(cantidad)) {
        throw new Error('La cantidad debe ser un número entero');
      }

      const total = this.multiplicarConPrecision(precioUnitario, cantidad);

      return {
        valor: total,
        valorFormateado: this.formatearMoneda(total),
        valido: true,
        precision: this.PRECISION_DECIMAL
      };
    } catch (error) {
      return this.crearResultadoError(error as Error);
    }
  }

  /**
   * Calcula el precio unitario basado en total y cantidad
   * @param total Total pagado
   * @param cantidad Cantidad de unidades
   * @returns ResultadoCalculo Precio unitario calculado
   */
  public calcularPrecioUnitario(total: number, cantidad: number): ResultadoCalculo {
    try {
      this.validarNumero(total, 'total');
      this.validarNumero(cantidad, 'cantidad');

      if (cantidad === 0) {
        throw new Error('La cantidad no puede ser cero');
      }

      const precioUnitario = this.dividirConPrecision(total, cantidad);

      return {
        valor: precioUnitario,
        valorFormateado: this.formatearMoneda(precioUnitario),
        valido: true,
        precision: this.PRECISION_DECIMAL
      };
    } catch (error) {
      return this.crearResultadoError(error as Error);
    }
  }

/**
   * Calcula estadísticas de una lista de productos
   * @param productos Lista de productos
   * @returns EstadisticasCalculadas Estadísticas calculadas
   */
  public calcularEstadisticasProductos(productos: Producto[]): EstadisticasCalculadas {
    try {
      if (!productos || productos.length === 0) {
        throw new Error('Lista de productos vacía');
      }

      const precios = productos.map(p => p.precioUnitario);
      const totales = productos.map(p => p.total);

      return {
        suma: this.redondearConPrecision(totales.reduce((sum, val) => sum + val, 0)),
        promedio: this.calcularPromedio(precios),
        mediana: this.calcularMediana(precios),
        moda: this.calcularModa(precios),
        minimo: Math.min(...precios),
        maximo: Math.max(...precios),
        desviacionEstandar: this.calcularDesviacionEstandar(precios),
        varianza: this.calcularVarianza(precios),
        rango: Math.max(...precios) - Math.min(...precios),
        cantidad: productos.length
      };
    } catch (error) {
      console.error('Error calculando estadísticas de productos:', error);
      return this.crearEstadisticasVacias();
    }
  }

  // ==================== CÁLCULOS DE SESIÓN ====================

  /**
   * Calcula el total general de una sesión de compra
   * @param productos Lista de productos
   * @param descuentos Descuentos aplicados
   * @param impuestos Impuestos aplicados
   * @returns CalculoFinanciero Cálculo financiero completo
   */
  public calcularTotalSesion(
    productos: Producto[], 
    descuentos: number = 0, 
    impuestos: number = 0
  ): CalculoFinanciero {
    try {
      if (!productos || productos.length === 0) {
        return this.crearCalculoFinancieroVacio();
      }

      this.validarNumero(descuentos, 'descuentos');
      this.validarNumero(impuestos, 'impuestos');

      // Calcular subtotal
      const subtotal = productos.reduce((total, producto) => {
        return this.sumarConPrecision(total, producto.total);
      }, 0);

      // Validar que descuentos no excedan el subtotal
      if (descuentos > subtotal) {
        throw new Error('Los descuentos no pueden exceder el subtotal');
      }

      // Calcular total con descuentos e impuestos
      const totalConDescuentos = this.restarConPrecision(subtotal, descuentos);
      const total = this.sumarConPrecision(totalConDescuentos, impuestos);

      // Calcular porcentajes
      const porcentajeDescuento = subtotal > 0 ? this.dividirConPrecision(descuentos * 100, subtotal) : 0;
      const porcentajeImpuesto = totalConDescuentos > 0 ? this.dividirConPrecision(impuestos * 100, totalConDescuentos) : 0;

      return {
        subtotal: this.redondearConPrecision(subtotal),
        descuentos: this.redondearConPrecision(descuentos),
        impuestos: this.redondearConPrecision(impuestos),
        total: this.redondearConPrecision(total),
        ahorro: this.redondearConPrecision(descuentos),
        porcentajeDescuento: this.redondearConPrecision(porcentajeDescuento, this.PRECISION_PORCENTAJE),
        porcentajeImpuesto: this.redondearConPrecision(porcentajeImpuesto, this.PRECISION_PORCENTAJE)
      };
    } catch (error) {
      console.error('Error calculando total de sesión:', error);
      return this.crearCalculoFinancieroVacio();
    }
  }

  /**
   * Calcula análisis de presupuesto
   * @param presupuestoOriginal Presupuesto inicial
   * @param totalGastado Total gastado hasta ahora
   * @param totalProductosPlaneados Total de productos planeados (opcional)
   * @param totalProductosActuales Total de productos actuales (opcional)
   * @returns CalculoPresupuesto Análisis completo del presupuesto
   */
  public calcularAnalisisPresupuesto(
    presupuestoOriginal: number,
    totalGastado: number,
    totalProductosPlaneados?: number,
    totalProductosActuales?: number
  ): CalculoPresupuesto {
    try {
      this.validarNumero(presupuestoOriginal, 'presupuesto original');
      this.validarNumero(totalGastado, 'total gastado');

      if (presupuestoOriginal <= 0) {
        throw new Error('El presupuesto original debe ser mayor a cero');
      }

      const restante = this.restarConPrecision(presupuestoOriginal, totalGastado);
      const porcentajeUtilizado = this.dividirConPrecision(totalGastado * 100, presupuestoOriginal);
      const porcentajeRestante = this.restarConPrecision(100, porcentajeUtilizado);
      const excedePresupuesto = totalGastado > presupuestoOriginal;
      const exceso = excedePresupuesto ? this.restarConPrecision(totalGastado, presupuestoOriginal) : 0;

      // Calcular proyección si se proporcionan datos de productos
      let proyeccionFinal: number | undefined;
      if (totalProductosPlaneados && totalProductosActuales && totalProductosActuales > 0) {
        const promedioActual = this.dividirConPrecision(totalGastado, totalProductosActuales);
        proyeccionFinal = this.multiplicarConPrecision(promedioActual, totalProductosPlaneados);
      }

      // Generar recomendación
      const recomendacion = this.generarRecomendacionPresupuesto(
        porcentajeUtilizado,
        excedePresupuesto,
        proyeccionFinal,
        presupuestoOriginal
      );

      return {
        presupuestoOriginal: this.redondearConPrecision(presupuestoOriginal),
        totalGastado: this.redondearConPrecision(totalGastado),
        restante: this.redondearConPrecision(restante),
        porcentajeUtilizado: this.redondearConPrecision(porcentajeUtilizado, this.PRECISION_PORCENTAJE),
        porcentajeRestante: this.redondearConPrecision(porcentajeRestante, this.PRECISION_PORCENTAJE),
        excedePresupuesto,
        exceso: this.redondearConPrecision(exceso),
        proyeccionFinal: proyeccionFinal ? this.redondearConPrecision(proyeccionFinal) : undefined,
        recomendacion
      };
    } catch (error) {
      console.error('Error calculando análisis de presupuesto:', error);
      return this.crearCalculoPresupuestoVacio();
    }
  }

  // ==================== CÁLCULOS ESTADÍSTICOS ====================

  /**
   * Calcula el promedio de una lista de números
   * @param numeros Array de números
   * @returns number Promedio calculado
   */
  public calcularPromedio(numeros: number[]): number {
    if (!numeros || numeros.length === 0) {
      return 0;
    }

    const suma = numeros.reduce((total, num) => this.sumarConPrecision(total, num), 0);
    return this.redondearConPrecision(this.dividirConPrecision(suma, numeros.length), this.PRECISION_ESTADISTICAS);
  }

  /**
   * Calcula la mediana de una lista de números
   * @param numeros Array de números
   * @returns number Mediana calculada
   */
  public calcularMediana(numeros: number[]): number {
    if (!numeros || numeros.length === 0) {
      return 0;
    }

    const numerosOrdenados = [...numeros].sort((a, b) => a - b);
    const longitud = numerosOrdenados.length;
    const medio = Math.floor(longitud / 2);

    if (longitud % 2 === 0) {
      // Si la longitud es par, promedio de los dos valores centrales
      return this.redondearConPrecision(
        this.dividirConPrecision(
          this.sumarConPrecision(numerosOrdenados[medio - 1], numerosOrdenados[medio]), 
          2
        ),
        this.PRECISION_ESTADISTICAS
      );
    } else {
      // Si la longitud es impar, valor central
      return this.redondearConPrecision(numerosOrdenados[medio], this.PRECISION_ESTADISTICAS);
    }
  }

  /**
   * Calcula la moda de una lista de números
   * @param numeros Array de números
   * @returns number Moda calculada
   */
  public calcularModa(numeros: number[]): number {
    if (!numeros || numeros.length === 0) {
      return 0;
    }

    // Contar frecuencias
    const frecuencias = new Map<number, number>();
    
    for (const numero of numeros) {
      const redondeado = this.redondearConPrecision(numero);
      frecuencias.set(redondeado, (frecuencias.get(redondeado) || 0) + 1);
    }

    // Encontrar la frecuencia máxima
    let maxFrecuencia = 0;
    let moda = 0;

    for (const [valor, frecuencia] of frecuencias.entries()) {
      if (frecuencia > maxFrecuencia) {
        maxFrecuencia = frecuencia;
        moda = valor;
      }
    }

    return this.redondearConPrecision(moda, this.PRECISION_ESTADISTICAS);
  }

  /**
   * Calcula la varianza de una lista de números
   * @param numeros Array de números
   * @returns number Varianza calculada
   */
  public calcularVarianza(numeros: number[]): number {
    if (!numeros || numeros.length === 0) {
      return 0;
    }

    const promedio = this.calcularPromedio(numeros);
    const sumaCuadrados = numeros.reduce((total, num) => {
      const diferencia = this.restarConPrecision(num, promedio);
      const cuadrado = this.multiplicarConPrecision(diferencia, diferencia);
      return this.sumarConPrecision(total, cuadrado);
    }, 0);

    const varianza = this.dividirConPrecision(sumaCuadrados, numeros.length);
    return this.redondearConPrecision(varianza, this.PRECISION_ESTADISTICAS);
  }

  /**
   * Calcula la desviación estándar de una lista de números
   * @param numeros Array de números
   * @returns number Desviación estándar calculada
   */
  public calcularDesviacionEstandar(numeros: number[]): number {
    const varianza = this.calcularVarianza(numeros);
    const desviacion = Math.sqrt(varianza);
    return this.redondearConPrecision(desviacion, this.PRECISION_ESTADISTICAS);
  }

  /**
   * Calcula el coeficiente de correlación entre dos arrays
   * @param x Primer array de números
   * @param y Segundo array de números
   * @returns number Coeficiente de correlación (-1 a 1)
   */
  public calcularCorrelacion(x: number[], y: number[]): number {
    if (!x || !y || x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const promedioX = this.calcularPromedio(x);
    const promedioY = this.calcularPromedio(y);

    let sumaNumerador = 0;
    let sumaDenominadorX = 0;
    let sumaDenominadorY = 0;

    for (let i = 0; i < n; i++) {
      const difX = this.restarConPrecision(x[i], promedioX);
      const difY = this.restarConPrecision(y[i], promedioY);

      sumaNumerador = this.sumarConPrecision(sumaNumerador, this.multiplicarConPrecision(difX, difY));
      sumaDenominadorX = this.sumarConPrecision(sumaDenominadorX, this.multiplicarConPrecision(difX, difX));
      sumaDenominadorY = this.sumarConPrecision(sumaDenominadorY, this.multiplicarConPrecision(difY, difY));
    }

    const denominador = Math.sqrt(this.multiplicarConPrecision(sumaDenominadorX, sumaDenominadorY));
    
    if (denominador === 0) {
      return 0;
    }

    const correlacion = this.dividirConPrecision(sumaNumerador, denominador);
    return this.redondearConPrecision(correlacion, this.PRECISION_ESTADISTICAS);
  }

  // ==================== ANÁLISIS DE TENDENCIAS ====================

  /**
   * Analiza tendencia en una serie de valores
   * @param valores Array de valores temporales
   * @returns AnalisisTendencia Análisis completo de tendencia
   */
  public analizarTendencia(valores: number[]): AnalisisTendencia {
    try {
      if (!valores || valores.length < 2) {
        throw new Error('Se necesitan al menos 2 valores para analizar tendencia');
      }

      const valorInicial = valores[0];
      const valorFinal = valores[valores.length - 1];
      const puntosMedios = valores.slice(1, -1);

      // Calcular porcentaje de cambio
      const porcentajeCambio = valorInicial !== 0 
        ? this.dividirConPrecision((valorFinal - valorInicial) * 100, Math.abs(valorInicial))
        : 0;

      // Determinar tendencia
      let tendencia: 'creciente' | 'decreciente' | 'estable';
      if (Math.abs(porcentajeCambio) < 5) {
        tendencia = 'estable';
      } else if (porcentajeCambio > 0) {
        tendencia = 'creciente';
      } else {
        tendencia = 'decreciente';
      }

      // Calcular correlación con índices temporales
      const indices = valores.map((_, i) => i);
      const correlacion = this.calcularCorrelacion(indices, valores);

      // Predicción simple (regresión lineal básica)
      let prediccionSiguiente: number | undefined;
      if (valores.length >= 3) {
        const pendiente = this.dividirConPrecision(valorFinal - valorInicial, valores.length - 1);
        prediccionSiguiente = this.sumarConPrecision(valorFinal, pendiente);
      }

      return {
        tendencia,
        porcentajeCambio: this.redondearConPrecision(porcentajeCambio, this.PRECISION_PORCENTAJE),
        valorInicial: this.redondearConPrecision(valorInicial),
        valorFinal: this.redondearConPrecision(valorFinal),
        puntosMedios: puntosMedios.map(v => this.redondearConPrecision(v)),
        correlacion: this.redondearConPrecision(correlacion, this.PRECISION_ESTADISTICAS),
        prediccionSiguiente: prediccionSiguiente ? this.redondearConPrecision(prediccionSiguiente) : undefined
      };
    } catch (error) {
      console.error('Error analizando tendencia:', error);
      return this.crearAnalisisTendenciaVacio();
    }
  }

  /**
   * Calcula proyección de gastos basada en tendencia actual
   * @param gastosHistoricos Array de gastos históricos
   * @param periodosAProyectar Número de períodos a proyectar
   * @returns number[] Proyección de gastos futuros
   */
  public proyectarGastos(gastosHistoricos: number[], periodosAProyectar: number): number[] {
    try {
      if (!gastosHistoricos || gastosHistoricos.length < 2) {
        return [];
      }

      if (periodosAProyectar <= 0 || periodosAProyectar > 12) {
        throw new Error('Períodos a proyectar debe estar entre 1 y 12');
      }

      const analisis = this.analizarTendencia(gastosHistoricos);
      const proyecciones: number[] = [];
      
      // Usar la tendencia para proyectar
      const ultimoValor = gastosHistoricos[gastosHistoricos.length - 1];
      const factorCrecimiento = this.dividirConPrecision(analisis.porcentajeCambio, 100);

      for (let i = 1; i <= periodosAProyectar; i++) {
        let proyeccion: number;
        
        if (analisis.tendencia === 'estable') {
          // Si es estable, usar promedio de últimos valores
          const ultimosTres = gastosHistoricos.slice(-3);
          proyeccion = this.calcularPromedio(ultimosTres);
        } else {
          // Aplicar factor de crecimiento/decrecimiento
          const incremento = this.multiplicarConPrecision(ultimoValor * factorCrecimiento, i);
          proyeccion = this.sumarConPrecision(ultimoValor, incremento);
        }

        // Asegurar que la proyección no sea negativa
        proyeccion = Math.max(0, proyeccion);
        proyecciones.push(this.redondearConPrecision(proyeccion));
      }

      return proyecciones;
    } catch (error) {
      console.error('Error proyectando gastos:', error);
      return [];
    }
  }

  // ==================== FORMATEO Y VALIDACIÓN ====================

  /**
   * Formatea un número como moneda
   * @param valor Valor a formatear
   * @param moneda Tipo de moneda (opcional)
   * @returns string Valor formateado
   */
  public formatearMoneda(valor: number, moneda: Moneda = Moneda.PESO_CHILENO): string {
    try {
      this.validarNumero(valor, 'valor');
      
      const valorRedondeado = this.redondearConPrecision(valor);
      
      // Configuración de formato según moneda
      const configuraciones = {
        [Moneda.PESO_CHILENO]: { simbolo: '$', locale: 'es-CL' },
        [Moneda.DOLAR_AMERICANO]: { simbolo: 'US$', locale: 'en-US' },
        [Moneda.EURO]: { simbolo: '€', locale: 'es-ES' },
        [Moneda.PESO_ARGENTINO]: { simbolo: 'AR$', locale: 'es-AR' },
        [Moneda.REAL_BRASILENO]: { simbolo: 'R$', locale: 'pt-BR' }
      };

      const config = configuraciones[moneda] || configuraciones[Moneda.PESO_CHILENO];
      
      // Formatear número con separadores de miles
      const numeroFormateado = new Intl.NumberFormat(config.locale, {
        minimumFractionDigits: this.PRECISION_DECIMAL,
        maximumFractionDigits: this.PRECISION_DECIMAL
      }).format(valorRedondeado);

      return `${config.simbolo}${numeroFormateado}`;
    } catch (error) {
      console.error('Error formateando moneda:', error);
      return '$0.00';
    }
  }

  /**
   * Formatea un número con separadores de miles
   * @param valor Valor a formatear
   * @param decimales Número de decimales (opcional)
   * @returns string Número formateado
   */
  public formatearNumero(valor: number, decimales?: number): string {
    try {
      this.validarNumero(valor, 'valor');
      
      const precision = decimales !== undefined ? decimales : this.PRECISION_DECIMAL;
      const valorRedondeado = this.redondearConPrecision(valor, precision);
      
      return new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      }).format(valorRedondeado);
    } catch (error) {
      console.error('Error formateando número:', error);
      return '0';
    }
  }

  /**
   * Formatea un porcentaje
   * @param valor Valor del porcentaje
   * @param decimales Número de decimales (opcional)
   * @returns string Porcentaje formateado
   */
  public formatearPorcentaje(valor: number, decimales?: number): string {
    try {
      this.validarNumero(valor, 'valor');
      
      const precision = decimales !== undefined ? decimales : this.PRECISION_PORCENTAJE;
      const valorRedondeado = this.redondearConPrecision(valor, precision);
      
      return `${this.formatearNumero(valorRedondeado, precision)}%`;
    } catch (error) {
      console.error('Error formateando porcentaje:', error);
      return '0%';
    }
  }

  /**
   * Valida que un string represente un número válido
   * @param valorString String a validar
   * @returns boolean True si es válido
   */
  public validarNumeroString(valorString: string): boolean {
    try {
      if (!valorString || valorString.trim() === '') {
        return false;
      }

      // Limpiar formato (comas, espacios, símbolos de moneda)
      const valorLimpio = valorString
        .replace(/[$€R]/g, '') // Símbolos de moneda
        .replace(/[,\s]/g, '') // Comas y espacios
        .replace(',', '.'); // Cambiar coma decimal por punto

      const numero = parseFloat(valorLimpio);
      
      if (isNaN(numero) || !isFinite(numero)) {
        return false;
      }

      return numero >= this.LIMITE_MINIMO_CALCULO && numero <= this.LIMITE_MAXIMO_CALCULO;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convierte un string a número validado
   * @param valorString String a convertir
   * @returns number Número convertido
   * @throws Error si no es válido
   */
  public convertirStringANumero(valorString: string): number {
    if (!this.validarNumeroString(valorString)) {
      throw new Error('Formato de número inválido');
    }

    // Limpiar y convertir
    const valorLimpio = valorString
      .replace(/[$€R]/g, '')
      .replace(/[,\s]/g, '')
      .replace(',', '.');

    const numero = parseFloat(valorLimpio);
    return this.redondearConPrecision(numero);
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Suma dos números con precisión decimal
   * @private
   */
  private sumarConPrecision(a: number, b: number): number {
    return parseFloat((a + b).toFixed(this.PRECISION_DECIMAL + 2));
  }

  /**
   * Resta dos números con precisión decimal
   * @private
   */
  private restarConPrecision(a: number, b: number): number {
    return parseFloat((a - b).toFixed(this.PRECISION_DECIMAL + 2));
  }

  /**
   * Multiplica dos números con precisión decimal
   * @private
   */
  private multiplicarConPrecision(a: number, b: number): number {
    return parseFloat((a * b).toFixed(this.PRECISION_DECIMAL + 2));
  }

  /**
   * Divide dos números con precisión decimal
   * @private
   */
  private dividirConPrecision(a: number, b: number): number {
    return parseFloat((a / b).toFixed(this.PRECISION_DECIMAL + 2));
  }

  /**
   * Redondea un número con precisión específica
   * @private
   */
  private redondearConPrecision(valor: number, precision: number = this.PRECISION_DECIMAL): number {
    const factor = Math.pow(10, precision);
    return Math.round(valor * factor) / factor;
  }

  /**
   * Valida que un número sea válido
   * @private
   */
  private validarNumero(numero: number, nombreCampo: string): void {
    if (typeof numero !== 'number' || isNaN(numero) || !isFinite(numero)) {
      throw new Error(`${nombreCampo} debe ser un número válido`);
    }

    if (numero < -this.LIMITE_MAXIMO_CALCULO || numero > this.LIMITE_MAXIMO_CALCULO) {
      throw new Error(`${nombreCampo} está fuera del rango permitido`);
    }
  }

  /**
   * Valida un array de números
   * @private
   */
  private validarArrayNumeros(numeros: number[]): void {
    if (!Array.isArray(numeros)) {
      throw new Error('Debe proporcionar un array de números');
    }

    if (numeros.length === 0) {
      throw new Error('El array no puede estar vacío');
    }

    for (let i = 0; i < numeros.length; i++) {
      this.validarNumero(numeros[i], `número en posición ${i}`);
    }
  }

  /**
   * Crea un resultado de error
   * @private
   */
  private crearResultadoError(error: Error): ResultadoCalculo {
    return {
      valor: 0,
      valorFormateado: '0',
      valido: false,
      error: error.message,
      precision: this.PRECISION_DECIMAL
    };
  }

  /**
   * Crea estadísticas vacías
   * @private
   */
  private crearEstadisticasVacias(): EstadisticasCalculadas {
    return {
      suma: 0,
      promedio: 0,
      mediana: 0,
      moda: 0,
      minimo: 0,
      maximo: 0,
      desviacionEstandar: 0,
      varianza: 0,
      rango: 0,
      cantidad: 0
    };
  }

  /**
   * Crea cálculo financiero vacío
   * @private
   */
  private crearCalculoFinancieroVacio(): CalculoFinanciero {
    return {
      subtotal: 0,
      descuentos: 0,
      impuestos: 0,
      total: 0,
      ahorro: 0,
      porcentajeDescuento: 0,
      porcentajeImpuesto: 0
    };
  }

  /**
   * Crea cálculo de presupuesto vacío
   * @private
   */
  private crearCalculoPresupuestoVacio(): CalculoPresupuesto {
    return {
      presupuestoOriginal: 0,
      totalGastado: 0,
      restante: 0,
      porcentajeUtilizado: 0,
      porcentajeRestante: 0,
      excedePresupuesto: false,
      exceso: 0,
      recomendacion: 'No se pudo calcular análisis de presupuesto'
    };
  }

  /**
   * Crea análisis de tendencia vacío
   * @private
   */
  private crearAnalisisTendenciaVacio(): AnalisisTendencia {
    return {
      tendencia: 'estable',
      porcentajeCambio: 0,
      valorInicial: 0,
      valorFinal: 0,
      puntosMedios: [],
      correlacion: 0
    };
  }

  /**
   * Genera recomendación de presupuesto
   * @private
   */
  private generarRecomendacionPresupuesto(
    porcentajeUtilizado: number,
    excedePresupuesto: boolean,
    proyeccionFinal?: number,
    presupuestoOriginal?: number
  ): string {
    if (excedePresupuesto) {
      return '¡Has excedido tu presupuesto! Considera revisar tus compras o ajustar el presupuesto.';
    }

    if (porcentajeUtilizado >= 90) {
      return 'Te queda muy poco presupuesto. Compra solo lo esencial.';
    }

    if (porcentajeUtilizado >= 75) {
      return 'Has usado la mayor parte de tu presupuesto. Revisa las compras restantes.';
    }

    if (porcentajeUtilizado >= 50) {
      return 'Vas por buen camino. Mantén el control de los gastos.';
    }

    if (proyeccionFinal && presupuestoOriginal && proyeccionFinal > presupuestoOriginal) {
      return 'La proyección indica que podrías exceder el presupuesto. Ajusta las compras futuras.';
    }

    return 'Tu presupuesto está bajo control. Puedes continuar comprando tranquilamente.';
  }

  /**
   * Obtiene información de debug del servicio
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    return {
      precisionDecimal: this.PRECISION_DECIMAL,
      precisionPorcentaje: this.PRECISION_PORCENTAJE,
      precisionEstadisticas: this.PRECISION_ESTADISTICAS,
      limiteMaximo: this.LIMITE_MAXIMO_CALCULO,
      limiteMinimo: this.LIMITE_MINIMO_CALCULO,
      timestamp: new Date().toISOString()
    };
  }
}