/**
 * Directiva Solo Números - Permite solo entrada numérica
 * 
 * Directiva de atributo que restringe la entrada de texto solo a números.
 * Soporta decimales con configuración flexible y validación en tiempo real.
 * Integrada con Angular FormControl y servicios de seguridad.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { Directive, ElementRef, HostListener, Input, OnInit, OnDestroy, Renderer2, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SeguridadService } from '@core-services/seguridad.service';
import { ValidacionService } from '@core-services/validacion.service';

/**
 * Configuración de la directiva solo números
 */
interface ConfiguracionSoloNumeros {
  /** Permitir decimales */
  permitirDecimales: boolean;
  /** Permitir números negativos */
  permitirNegativos: boolean;
  /** Separador decimal (punto o coma) */
  separadorDecimal: '.' | ',';
  /** Máximo de decimales permitidos */
  maxDecimales: number;
  /** Valor mínimo permitido */
  minimo?: number;
  /** Valor máximo permitido */
  maximo?: number;
  /** Deshabilitar pegar texto */
  deshabilitarPegar: boolean;
  /** Formatear automáticamente mientras se escribe */
  formateoAutomatico: boolean;
}

@Directive({
  selector: '[appSoloNumeros]',
  standalone: true
})
export class SoloNumerosDirective implements OnInit, OnDestroy {

  // Configuración de la directiva
  @Input() permitirDecimales: boolean = true;
  @Input() permitirNegativos: boolean = false;
  @Input() separadorDecimal: '.' | ',' = '.';
  @Input() maxDecimales: number = 2;
  @Input() minimo?: number;
  @Input() maximo?: number;
  @Input() deshabilitarPegar: boolean = false;
  @Input() formateoAutomatico: boolean = false;
  @Input() tipoNumero: 'precio' | 'cantidad' | 'general' = 'general';

  // Subject para limpiar suscripciones
  private destroy$ = new Subject<void>();
  
  // Elemento HTML nativo
  private elemento: HTMLInputElement;
  
  // Configuración final
  private configuracion: ConfiguracionSoloNumeros = {
    permitirDecimales: true,
    permitirNegativos: false,
    separadorDecimal: '.',
    maxDecimales: 2,
    deshabilitarPegar: false,
    formateoAutomatico: false
  };
  
  // Valor anterior para rollback en caso de error
  private valorAnterior: string = '';
  
  // Patrones de validación
  private readonly PATRONES = {
    soloNumeros: /^[0-9]*$/,
    numerosConDecimal: /^[0-9]*[.,]?[0-9]*$/,
    numerosConNegativo: /^-?[0-9]*[.,]?[0-9]*$/,
    caracteresPermitidos: /[0-9.,\-]/,
    caracteresNoNumericos: /[^0-9.,\-]/g
  };

  constructor(
    private elementRef: ElementRef<HTMLInputElement>,
    private renderer: Renderer2,
    private seguridadService: SeguridadService,
    private validacionService: ValidacionService,
    @Optional() @Self() private ngControl: NgControl
  ) {
    this.elemento = this.elementRef.nativeElement;
  }

  ngOnInit(): void {
    try {
      console.log('🔢 Inicializando directiva SoloNumeros en:', this.elemento.id || 'elemento sin ID');
      
      // Crear configuración final
      this.configuracion = this.crearConfiguracion();
      
      // Configurar elemento
      this.configurarElemento();
      
      // Configurar validación con FormControl si existe
      this.configurarValidacionFormControl();
      
      // Aplicar estilos visuales
      this.aplicarEstilosVisuales();
      
      console.log('✅ Directiva SoloNumeros inicializada con configuración:', this.configuracion);
      
    } catch (error) {
      console.error('❌ Error inicializando directiva SoloNumeros:', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== EVENTOS DE TECLADO ====================

  /**
   * Maneja eventos de presión de tecla
   * @param event Evento de teclado
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    try {
      // Permitir teclas de control siempre
      if (this.esTeclaControl(event)) {
        return;
      }

      // Validar carácter ingresado
      const caracter = event.key;
      const valorActual = this.elemento.value;
      const posicionCursor = this.elemento.selectionStart || 0;
      
      // Simular valor resultante
      const valorSimulado = this.simularInsercionCaracter(valorActual, caracter, posicionCursor);
      
      // Validar si el carácter es permitido
      if (!this.esCaracterPermitido(caracter, valorActual, posicionCursor)) {
        console.warn('⚠️ Carácter no permitido:', caracter);
        event.preventDefault();
        this.mostrarRetroalimentacionVisual('error');
        return;
      }

      // Validar formato del valor resultante
      if (!this.esFormatoValido(valorSimulado)) {
        console.warn('⚠️ Formato no válido resultante:', valorSimulado);
        event.preventDefault();
        this.mostrarRetroalimentacionVisual('error');
        return;
      }

      // Validar rango si está configurado
      if (!this.esRangoValido(valorSimulado)) {
        console.warn('⚠️ Valor fuera de rango:', valorSimulado);
        event.preventDefault();
        this.mostrarRetroalimentacionVisual('warning');
        return;
      }

      // Almacenar valor anterior para posible rollback
      this.valorAnterior = valorActual;
      
    } catch (error) {
      console.error('❌ Error en onKeyDown:', error);
      event.preventDefault();
    }
  }

  /**
   * Maneja eventos de entrada de texto
   * @param event Evento de input
   */
  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    try {
      const target = event.target as HTMLInputElement;
      let valor = target.value;

      // Validar entrada con servicio de seguridad
      this.seguridadService.validarEntrada(valor, 'valorNumerico')
        .pipe(takeUntil(this.destroy$))
        .subscribe(resultado => {
          if (!resultado.valido) {
            console.warn('⚠️ Entrada no segura detectada:', resultado.errores);
            this.revertirAValorAnterior();
            this.mostrarRetroalimentacionVisual('error');
            return;
          }

          // Sanitizar valor
          valor = resultado.valorSanitizado || valor;
          
          // Aplicar formateo automático si está habilitado
          if (this.configuracion.formateoAutomatico) {
            valor = this.aplicarFormateoAutomatico(valor);
          }

          // Actualizar valor en el elemento
          if (target.value !== valor) {
            target.value = valor;
            this.actualizarFormControl(valor);
          }

          // Validar rango final
          this.validarRangoFinal(valor);
        });

    } catch (error) {
      console.error('❌ Error en onInput:', error);
      this.revertirAValorAnterior();
    }
  }

  /**
   * Maneja eventos de pegado
   * @param event Evento de paste
   */
  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    try {
      if (this.configuracion.deshabilitarPegar) {
        console.warn('⚠️ Pegado deshabilitado en este campo');
        event.preventDefault();
        this.mostrarRetroalimentacionVisual('error');
        return;
      }

      const datosClipboard = event.clipboardData?.getData('text') || '';
      
      // Validar contenido del clipboard
      this.seguridadService.validarEntrada(datosClipboard, 'valorNumerico')
        .pipe(takeUntil(this.destroy$))
        .subscribe(resultado => {
          if (!resultado.valido) {
            console.warn('⚠️ Contenido pegado no válido:', resultado.errores);
            event.preventDefault();
            this.mostrarRetroalimentacionVisual('error');
            return;
          }

          // Limpiar y formatear datos pegados
          const datosSanitizados = this.limpiarTextoNumerico(datosClipboard);
          
          if (!this.esFormatoValido(datosSanitizados)) {
            console.warn('⚠️ Formato de datos pegados no válido:', datosSanitizados);
            event.preventDefault();
            this.mostrarRetroalimentacionVisual('error');
            return;
          }

          // Permitir pegado y actualizar
          setTimeout(() => {
            this.elemento.value = datosSanitizados;
            this.actualizarFormControl(datosSanitizados);
            this.mostrarRetroalimentacionVisual('success');
          }, 10);
        });

    } catch (error) {
      console.error('❌ Error en onPaste:', error);
      event.preventDefault();
    }
  }

  /**
   * Maneja pérdida de foco para validación final
   * @param event Evento de blur
   */
  @HostListener('blur', ['$event'])
  onBlur(event: FocusEvent): void {
    try {
      const valor = this.elemento.value;
      
      if (valor) {
        // Validación final con servicio de validación
        if (this.tipoNumero === 'precio' && this.ngControl?.control) {
          const validacion = this.validacionService.validadorPrecioUnitario({
            valorMinimo: this.minimo,
            valorMaximo: this.maximo
          })(this.ngControl.control);
          this.procesarResultadoValidacion(validacion);
        } else if (this.tipoNumero === 'cantidad' && this.ngControl?.control) {
          const validacion = this.validacionService.validadorCantidadProducto({
            valorMinimo: this.minimo,
            valorMaximo: this.maximo
          })(this.ngControl.control);
          this.procesarResultadoValidacion(validacion);
        }

        // Formatear valor final si está configurado
        if (this.configuracion.formateoAutomatico) {
          const valorFormateado = this.formatearValorFinal(valor);
          if (valorFormateado !== valor) {
            this.elemento.value = valorFormateado;
            this.actualizarFormControl(valorFormateado);
          }
        }
      }

      // Remover estilos de retroalimentación
      this.limpiarRetroalimentacionVisual();
      
    } catch (error) {
      console.error('❌ Error en onBlur:', error);
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Crea la configuración final de la directiva
   * @private
   */
  private crearConfiguracion(): ConfiguracionSoloNumeros {
    return {
      permitirDecimales: this.permitirDecimales,
      permitirNegativos: this.permitirNegativos,
      separadorDecimal: this.separadorDecimal,
      maxDecimales: this.maxDecimales,
      minimo: this.minimo,
      maximo: this.maximo,
      deshabilitarPegar: this.deshabilitarPegar,
      formateoAutomatico: this.formateoAutomatico
    };
  }

  /**
   * Configura propiedades básicas del elemento
   * @private
   */
  private configurarElemento(): void {
    // Configurar tipo de input en móviles
    this.renderer.setAttribute(this.elemento, 'inputmode', 'decimal');
    this.renderer.setAttribute(this.elemento, 'pattern', '[0-9]*');
    
    // Configurar autocomplete
    this.renderer.setAttribute(this.elemento, 'autocomplete', 'off');
    this.renderer.setAttribute(this.elemento, 'spellcheck', 'false');
    
    // Agregar clase CSS para estilos
    this.renderer.addClass(this.elemento, 'solo-numeros-input');
    
    // Configurar título de ayuda
    const titulo = this.generarTituloAyuda();
    this.renderer.setAttribute(this.elemento, 'title', titulo);
  }

  /**
   * Configura validación con FormControl
   * @private
   */
  private configurarValidacionFormControl(): void {
    if (this.ngControl && this.ngControl.control) {
      // Agregar validador personalizado según tipo
      const validadores = this.ngControl.control.validator;
      let nuevoValidador;

      switch (this.tipoNumero) {
        case 'precio':
          nuevoValidador = this.validacionService.validadorPrecioUnitario({
            obligatorio: true,
            valorMinimo: this.minimo,
            valorMaximo: this.maximo
          });
          break;
        case 'cantidad':
          nuevoValidador = this.validacionService.validadorCantidadProducto({
            obligatorio: true,
            valorMinimo: this.minimo,
            valorMaximo: this.maximo
          });
          break;
        default:
          nuevoValidador = this.validacionService.validadorPresupuesto({
            valorMinimo: this.minimo,
            valorMaximo: this.maximo
          });
      }

      // Combinar validadores existentes con el nuevo
      if (validadores) {
        this.ngControl.control.setValidators([validadores, nuevoValidador]);
      } else {
        this.ngControl.control.setValidators(nuevoValidador);
      }

      console.log('🔗 Validador FormControl configurado para tipo:', this.tipoNumero);
    }
  }

  /**
   * Aplica estilos visuales de la directiva
   * @private
   */
  private aplicarEstilosVisuales(): void {
    // Agregar estilos específicos según configuración
    if (!this.configuracion.permitirNegativos) {
      this.renderer.addClass(this.elemento, 'solo-positivos');
    }

    if (!this.configuracion.permitirDecimales) {
      this.renderer.addClass(this.elemento, 'solo-enteros');
    }

    // Agregar indicador visual del tipo
    this.renderer.addClass(this.elemento, `tipo-${this.tipoNumero}`);
  }

  /**
   * Verifica si es una tecla de control
   * @private
   */
  private esTeclaControl(event: KeyboardEvent): boolean {
    const teclasControl = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown'
    ];

    return (
      teclasControl.includes(event.key) ||
      event.ctrlKey || event.metaKey || event.altKey ||
      (event.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(event.key.toLowerCase()))
    );
  }

  /**
   * Verifica si un carácter es permitido
   * @private
   */
  private esCaracterPermitido(caracter: string, valorActual: string, posicion: number): boolean {
    // Solo dígitos siempre permitidos
    if (/[0-9]/.test(caracter)) {
      return true;
    }

    // Signo negativo
    if (caracter === '-') {
      return this.configuracion.permitirNegativos && posicion === 0 && !valorActual.includes('-');
    }

    // Separador decimal
    if (caracter === this.configuracion.separadorDecimal || caracter === '.' || caracter === ',') {
      if (!this.configuracion.permitirDecimales) {
        return false;
      }

      // Solo un separador decimal permitido
      const tienePunto = valorActual.includes('.');
      const tieneComa = valorActual.includes(',');
      
      return !(tienePunto || tieneComa);
    }

    return false;
  }

  /**
   * Simula la inserción de un carácter en una posición
   * @private
   */
  private simularInsercionCaracter(valor: string, caracter: string, posicion: number): string {
    const selectionEnd = this.elemento.selectionEnd || posicion;
    const textoSeleccionado = valor.substring(posicion, selectionEnd);
    
    if (textoSeleccionado.length > 0) {
      // Hay texto seleccionado, reemplazarlo
      return valor.substring(0, posicion) + caracter + valor.substring(selectionEnd);
    } else {
      // Insertar carácter en posición
      return valor.substring(0, posicion) + caracter + valor.substring(posicion);
    }
  }

  /**
   * Verifica si el formato del valor es válido
   * @private
   */
  private esFormatoValido(valor: string): boolean {
    if (!valor) return true;

    // Limpiar valor para validación
    const valorLimpio = valor.replace(/\s/g, '');

    // Patrón base según configuración
    let patron: RegExp;

    if (this.configuracion.permitirNegativos && this.configuracion.permitirDecimales) {
      patron = this.PATRONES.numerosConNegativo;
    } else if (this.configuracion.permitirDecimales) {
      patron = this.PATRONES.numerosConDecimal;
    } else {
      patron = this.PATRONES.soloNumeros;
    }

    // Validar patrón básico
    if (!patron.test(valorLimpio)) {
      return false;
    }

    // Validar decimales máximos
    if (this.configuracion.permitirDecimales) {
      const partes = valorLimpio.split(/[.,]/);
      if (partes.length > 2) return false; // Múltiples separadores
      
      if (partes.length === 2 && partes[1].length > this.configuracion.maxDecimales) {
        return false; // Demasiados decimales
      }
    }

    return true;
  }

  /**
   * Verifica si el valor está en el rango válido
   * @private
   */
  private esRangoValido(valor: string): boolean {
    if (!valor) return true;

    try {
      const numero = this.convertirANumero(valor);
      
      if (this.configuracion.minimo !== undefined && numero < this.configuracion.minimo) {
        return false;
      }

      if (this.configuracion.maximo !== undefined && numero > this.configuracion.maximo) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convierte string a número manejando separadores
   * @private
   */
  private convertirANumero(valor: string): number {
    const valorLimpio = valor
      .replace(/\s/g, '')
      .replace(',', '.');
    
    return parseFloat(valorLimpio);
  }

  /**
   * Limpia texto dejando solo caracteres numéricos válidos
   * @private
   */
  private limpiarTextoNumerico(texto: string): string {
    let textoLimpio = texto.replace(this.PATRONES.caracteresNoNumericos, '');
    
    // Normalizar separador decimal
    if (this.configuracion.separadorDecimal === '.') {
      textoLimpio = textoLimpio.replace(',', '.');
    } else {
      textoLimpio = textoLimpio.replace('.', ',');
    }

    // Manejar signo negativo
    if (!this.configuracion.permitirNegativos) {
      textoLimpio = textoLimpio.replace('-', '');
    } else {
      // Solo un signo negativo al inicio
      const signoIndex = textoLimpio.indexOf('-');
      if (signoIndex > 0) {
        textoLimpio = textoLimpio.replace('-', '');
      }
    }

    // Manejar separador decimal
    if (!this.configuracion.permitirDecimales) {
      textoLimpio = textoLimpio.replace(/[.,]/g, '');
    } else {
      // Solo un separador decimal
      const partes = textoLimpio.split(/[.,]/);
      if (partes.length > 2) {
        textoLimpio = partes[0] + this.configuracion.separadorDecimal + partes.slice(1).join('');
      }
    }

    return textoLimpio;
  }

  /**
   * Aplica formateo automático mientras se escribe
   * @private
   */
  private aplicarFormateoAutomatico(valor: string): string {
    if (!valor) return valor;

    let valorFormateado = valor;

    // Limpiar valor primero
    valorFormateado = this.limpiarTextoNumerico(valorFormateado);

    // Limitar decimales
    if (this.configuracion.permitirDecimales) {
      const partes = valorFormateado.split(this.configuracion.separadorDecimal);
      if (partes.length > 1 && partes[1].length > this.configuracion.maxDecimales) {
        partes[1] = partes[1].substring(0, this.configuracion.maxDecimales);
        valorFormateado = partes.join(this.configuracion.separadorDecimal);
      }
    }

    return valorFormateado;
  }

  /**
   * Formatea valor final al perder foco
   * @private
   */
  private formatearValorFinal(valor: string): string {
    if (!valor) return valor;

    let valorFinal = this.limpiarTextoNumerico(valor);

    // Remover ceros innecesarios
    if (this.configuracion.permitirDecimales) {
      const numero = this.convertirANumero(valorFinal);
      if (!isNaN(numero)) {
        valorFinal = numero.toFixed(this.configuracion.maxDecimales);
        
        // Remover ceros decimales innecesarios
        if (valorFinal.includes('.')) {
          valorFinal = valorFinal.replace(/\.?0+$/, '');
        }

        // Convertir separador si es necesario
        if (this.configuracion.separadorDecimal === ',') {
          valorFinal = valorFinal.replace('.', ',');
        }
      }
    }

    return valorFinal;
  }

  /**
   * Actualiza el FormControl si existe
   * @private
   */
  private actualizarFormControl(valor: string): void {
    if (this.ngControl && this.ngControl.control) {
      const numero = this.convertirANumero(valor);
      this.ngControl.control.setValue(isNaN(numero) ? null : numero, { emitEvent: false });
    }
  }

  /**
   * Revierte al valor anterior en caso de error
   * @private
   */
  private revertirAValorAnterior(): void {
    this.elemento.value = this.valorAnterior;
    this.actualizarFormControl(this.valorAnterior);
  }

  /**
   * Muestra retroalimentación visual
   * @private
   */
  private mostrarRetroalimentacionVisual(tipo: 'success' | 'error' | 'warning'): void {
    // Limpiar clases anteriores
    this.limpiarRetroalimentacionVisual();
    
    // Agregar nueva clase
    this.renderer.addClass(this.elemento, `feedback-${tipo}`);
    
    // Remover después de un tiempo
    setTimeout(() => {
      this.limpiarRetroalimentacionVisual();
    }, 1500);
  }

  /**
   * Limpia retroalimentación visual
   * @private
   */
  private limpiarRetroalimentacionVisual(): void {
    ['feedback-success', 'feedback-error', 'feedback-warning'].forEach(clase => {
      this.renderer.removeClass(this.elemento, clase);
    });
  }

  /**
   * Valida rango final y muestra feedback
   * @private
   */
  private validarRangoFinal(valor: string): void {
    if (!valor) return;

    try {
      const numero = this.convertirANumero(valor);
      
      if (this.configuracion.minimo !== undefined && numero < this.configuracion.minimo) {
        this.mostrarRetroalimentacionVisual('warning');
        console.warn(`⚠️ Valor ${numero} menor al mínimo ${this.configuracion.minimo}`);
      } else if (this.configuracion.maximo !== undefined && numero > this.configuracion.maximo) {
        this.mostrarRetroalimentacionVisual('warning');
        console.warn(`⚠️ Valor ${numero} mayor al máximo ${this.configuracion.maximo}`);
      } else {
        this.mostrarRetroalimentacionVisual('success');
      }
    } catch (error) {
      this.mostrarRetroalimentacionVisual('error');
    }
  }

  /**
   * Procesa resultado de validación del servicio
   * @private
   */
  private procesarResultadoValidacion(resultado: any): void {
    if (resultado.valido) {
      this.mostrarRetroalimentacionVisual('success');
    } else {
      this.mostrarRetroalimentacionVisual('error');
      console.warn('⚠️ Validación fallida:', resultado.errores);
    }
  }

  /**
   * Genera título de ayuda para el campo
   * @private
   */
  private generarTituloAyuda(): string {
    const caracteristicas = [];
    
    caracteristicas.push('Solo números');
    
    if (this.configuracion.permitirDecimales) {
      caracteristicas.push(`decimales (máx. ${this.configuracion.maxDecimales})`);
    } else {
      caracteristicas.push('enteros únicamente');
    }
    
    if (this.configuracion.permitirNegativos) {
      caracteristicas.push('negativos permitidos');
    } else {
      caracteristicas.push('solo positivos');
    }
    
    if (this.configuracion.minimo !== undefined || this.configuracion.maximo !== undefined) {
      const min = this.configuracion.minimo ?? '∞';
      const max = this.configuracion.maximo ?? '∞';
      caracteristicas.push(`rango: ${min} - ${max}`);
    }
    
    return `Campo numérico: ${caracteristicas.join(', ')}`;
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Actualiza la configuración de la directiva
   * @param nuevaConfiguracion Nueva configuración
   */
  public actualizarConfiguracion(nuevaConfiguracion: Partial<ConfiguracionSoloNumeros>): void {
    this.configuracion = { ...this.configuracion, ...nuevaConfiguracion };
    this.configurarElemento();
    console.log('🔄 Configuración actualizada:', this.configuracion);
  }

  /**
   * Obtiene el valor actual como número
   * @returns number Valor numérico actual
   */
  public obtenerValorNumerico(): number {
    const valor = this.elemento.value;
    return valor ? this.convertirANumero(valor) : 0;
  }

  /**
   * Establece un valor numérico en el campo
   * @param numero Número a establecer
   */
  public establecerValor(numero: number): void {
    if (isNaN(numero)) {
      this.elemento.value = '';
    } else {
      let valorString = numero.toString();
      
      // Aplicar separador decimal si es necesario
      if (this.configuracion.separadorDecimal === ',') {
        valorString = valorString.replace('.', ',');
      }
      
      this.elemento.value = valorString;
      this.actualizarFormControl(valorString);
    }
  }

  /**
   * Limpia el campo
   */
  public limpiar(): void {
    this.elemento.value = '';
    this.actualizarFormControl('');
    this.limpiarRetroalimentacionVisual();
  }

  /**
   * Verifica si el valor actual es válido
   * @returns boolean True si es válido
   */
  public esValorValido(): boolean {
    const valor = this.elemento.value;
    return this.esFormatoValido(valor) && this.esRangoValido(valor);
  }

  /**
   * Obtiene información de debug de la directiva
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    return {
      configuracion: this.configuracion,
      valorActual: this.elemento.value,
      valorNumerico: this.obtenerValorNumerico(),
      esValido: this.esValorValido(),
      tipoNumero: this.tipoNumero,
      elementoId: this.elemento.id,
      timestamp: new Date().toISOString()
    };
  }
}