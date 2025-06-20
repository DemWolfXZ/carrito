/**
 * Directiva Formato Moneda - Formateo en tiempo real de valores monetarios
 * 
 * Aplica formateo automático de moneda mientras el usuario escribe.
 * Integrada con MonedaHispanaPipe y servicios de configuración.
 * Soporta todas las monedas hispanohablantes implementadas.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { 
  Directive, 
  ElementRef, 
  HostListener, 
  Input, 
  OnInit, 
  OnDestroy, 
  Renderer2, 
  Optional, 
  Self,
  Injector
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

import { MonedaHispanaPipe, CodigoMoneda, OpcionesFormateo, ConfiguracionMoneda } from '@pipes/monedaHispana.pipe';
import { SeguridadService } from '@core-services/seguridad.service';
import { ValidacionService } from '@core-services/validacion.service';
import { AlmacenamientoService } from '@core-services/almacenamiento.service';

/**
 * Configuración de la directiva formato moneda
 */
interface ConfiguracionFormatoMoneda {
  /** Código de moneda a usar */
  moneda: CodigoMoneda;
  /** Formatear mientras escribe */
  formateoEnTiempoReal: boolean;
  /** Formatear solo al perder foco */
  formateoAlPerderFoco: boolean;
  /** Mostrar símbolo de moneda */
  mostrarSimbolo: boolean;
  /** Mostrar código en lugar de símbolo */
  mostrarCodigo: boolean;
  /** Decimales permitidos */
  decimalesPermitidos: number;
  /** Valor mínimo permitido */
  valorMinimo?: number;
  /** Valor máximo permitido */
  valorMaximo?: number;
  /** Placeholder con formato de ejemplo */
  placeholderConFormato: boolean;
  /** Validar rangos automáticamente */
  validarRangos: boolean;
}

/**
 * Estados del formateo
 */
enum EstadoFormateo {
  INICIAL = 'inicial',
  ESCRIBIENDO = 'escribiendo',
  FORMATEANDO = 'formateando',
  VALIDANDO = 'validando',
  ERROR = 'error',
  COMPLETADO = 'completado'
}

@Directive({
  selector: '[appFormatoMoneda]',
  standalone: true
})
export class FormatoMonedaDirective implements OnInit, OnDestroy {

  // Inputs de configuración
  @Input() formatoMonedaCodigo: CodigoMoneda = 'CLP';
  @Input() formatoMonedaTiempoReal: boolean = true;
  @Input() formatoMonedaAlPerderFoco: boolean = false;
  @Input() formatoMonedaMostrarSimbolo: boolean = true;
  @Input() formatoMonedaMostrarCodigo: boolean = false;
  @Input() formatoMonedaDecimales: number = 2;
  @Input() formatoMonedaMinimo: number | undefined = undefined;
  @Input() formatoMonedaMaximo: number | undefined = undefined;
  @Input() formatoMonedaPlaceholder: boolean = true;
  @Input() formatoMonedaValidarRangos: boolean = true;
  @Input() formatoMonedaAutoDetectar: boolean = false;

  // Subject para limpiar suscripciones
  private destroy$ = new Subject<void>();
  
  // Elemento HTML nativo
  private elemento: HTMLInputElement;
  
  // Configuración final
  private configuracion: ConfiguracionFormatoMoneda = {
    moneda: 'CLP',
    formateoEnTiempoReal: true,
    formateoAlPerderFoco: false,
    mostrarSimbolo: true,
    mostrarCodigo: false,
    decimalesPermitidos: 2,
    valorMinimo: undefined,
    valorMaximo: undefined,
    placeholderConFormato: true,
    validarRangos: true
  };
  
  // Pipe para formateo
  private monedaPipe: MonedaHispanaPipe;
  
  // Configuración de la moneda actual
  private configMoneda: ConfiguracionMoneda | null = null;
  
  // Control de estado
  private estadoActual: EstadoFormateo = EstadoFormateo.INICIAL;
  private valorAnterior: string = '';
  private valorNumerico: number = 0;
  private posicionCursorAnterior: number = 0;
  private formateandoValor = false;
  
  // Debounce para formateo en tiempo real
  private debounceFormateo$ = new Subject<string>();

  constructor(
    private elementRef: ElementRef<HTMLInputElement>,
    private renderer: Renderer2,
    private seguridadService: SeguridadService,
    private validacionService: ValidacionService,
    private almacenamientoService: AlmacenamientoService,
    @Optional() @Self() private ngControl: NgControl,
    private injector: Injector
  ) {
    this.elemento = this.elementRef.nativeElement;
    this.monedaPipe = new MonedaHispanaPipe();
  }

  ngOnInit(): void {
    try {
      console.log('💰 Inicializando directiva FormatoMoneda en:', this.elemento.id || 'elemento sin ID');
      
      // Crear configuración final
      this.configuracion = this.crearConfiguracion();
      
      // Configurar moneda automática si está habilitada
      if (this.formatoMonedaAutoDetectar) {
        this.configurarMonedaAutomatica();
      }
      
      // Obtener configuración de la moneda
      this.configMoneda = MonedaHispanaPipe.obtenerConfiguracionMoneda(this.configuracion.moneda);
      
      // Configurar elemento
      this.configurarElemento();
      
      // Configurar formateo con debounce
      this.configurarDebounceFormateo();
      
      // Configurar validación con FormControl
      this.configurarValidacionFormControl();
      
      // Aplicar placeholder con formato si está configurado
      this.aplicarPlaceholderConFormato();
      
      console.log('✅ Directiva FormatoMoneda inicializada con configuración:', this.configuracion);
      
    } catch (error) {
      console.error('❌ Error inicializando directiva FormatoMoneda:', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== EVENTOS DEL ELEMENTO ====================

  /**
   * Maneja eventos de entrada de texto
   * @param event Evento de input
   */
  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    if (this.formateandoValor) {
      return; // Evitar bucles durante el formateo
    }

    try {
      const target = event.target as HTMLInputElement;
      const valor = target.value;
      
      this.estadoActual = EstadoFormateo.ESCRIBIENDO;
      this.posicionCursorAnterior = target.selectionStart || 0;

      // Validar entrada con servicio de seguridad
      this.seguridadService.validarEntrada(valor, 'valorNumerico')
        .pipe(takeUntil(this.destroy$))
        .subscribe(resultado => {
          if (!resultado.valido) {
            console.warn('⚠️ Entrada no segura detectada:', resultado.errores);
            this.revertirAValorAnterior();
            this.mostrarEstadoError();
            return;
          }

          // Procesar valor seguro
          this.procesarEntrada(valor);
        });

    } catch (error) {
      console.error('❌ Error en onInput:', error);
      this.revertirAValorAnterior();
    }
  }

  /**
   * Maneja eventos de pérdida de foco
   * @param event Evento de blur
   */
  @HostListener('blur', ['$event'])
  onBlur(event: FocusEvent): void {
    try {
      const valor = this.elemento.value;
      
      if (this.configuracion.formateoAlPerderFoco || !this.configuracion.formateoEnTiempoReal) {
        this.aplicarFormateoCompleto(valor);
      }

      // Validación final
      if (this.configuracion.validarRangos) {
        this.validarRangoFinal(valor);
      }

      this.estadoActual = EstadoFormateo.COMPLETADO;
      this.limpiarEstadosVisuales();
      
    } catch (error) {
      console.error('❌ Error en onBlur:', error);
    }
  }

  /**
   * Maneja eventos de focus
   * @param event Evento de focus
   */
  @HostListener('focus', ['$event'])
  onFocus(event: FocusEvent): void {
    try {
      // Remover formateo visual para edición más fácil si está configurado
      if (this.configuracion.formateoAlPerderFoco && !this.configuracion.formateoEnTiempoReal) {
        const valorSinFormato = this.extraerValorNumerico(this.elemento.value);
        if (valorSinFormato !== this.elemento.value) {
          this.elemento.value = valorSinFormato;
          this.actualizarFormControl(valorSinFormato);
        }
      }

      this.estadoActual = EstadoFormateo.ESCRIBIENDO;
      
    } catch (error) {
      console.error('❌ Error en onFocus:', error);
    }
  }

  /**
   * Maneja eventos de pegado
   * @param event Evento de paste
   */
  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    try {
      event.preventDefault(); // Prevenir pegado directo
      
      const datosClipboard = event.clipboardData?.getData('text') || '';
      
      // Validar contenido del clipboard
      this.seguridadService.validarEntrada(datosClipboard, 'valorNumerico')
        .pipe(takeUntil(this.destroy$))
        .subscribe(resultado => {
          if (!resultado.valido) {
            console.warn('⚠️ Contenido pegado no válido:', resultado.errores);
            this.mostrarEstadoError();
            return;
          }

          // Procesar valor pegado
          const valorLimpio = this.limpiarTextoMonetario(datosClipboard);
          this.aplicarValorYFormatear(valorLimpio);
        });

    } catch (error) {
      console.error('❌ Error en onPaste:', error);
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Crea la configuración final de la directiva
   * @private
   */
  private crearConfiguracion(): ConfiguracionFormatoMoneda {
    return {
      moneda: this.formatoMonedaCodigo,
      formateoEnTiempoReal: this.formatoMonedaTiempoReal,
      formateoAlPerderFoco: this.formatoMonedaAlPerderFoco,
      mostrarSimbolo: this.formatoMonedaMostrarSimbolo,
      mostrarCodigo: this.formatoMonedaMostrarCodigo,
      decimalesPermitidos: this.formatoMonedaDecimales,
      valorMinimo: this.formatoMonedaMinimo,
      valorMaximo: this.formatoMonedaMaximo,
      placeholderConFormato: this.formatoMonedaPlaceholder,
      validarRangos: this.formatoMonedaValidarRangos
    };
  }

  /**
   * Configura moneda automática basada en configuración del usuario
   * @private
   */
  private configurarMonedaAutomatica(): void {
    this.almacenamientoService.obtenerConfiguracion()
      .pipe(takeUntil(this.destroy$))
      .subscribe(configuracion => {
        if (configuracion && configuracion.general.moneda) {
          this.configuracion.moneda = configuracion.general.moneda as CodigoMoneda;
          this.configMoneda = MonedaHispanaPipe.obtenerConfiguracionMoneda(this.configuracion.moneda);
          console.log('🔄 Moneda autodetectada:', this.configuracion.moneda);
        }
      });
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
    this.renderer.addClass(this.elemento, 'formato-moneda-input');
    
    // Agregar atributo de moneda para CSS
    this.renderer.setAttribute(this.elemento, 'data-moneda', this.configuracion.moneda);
    
    // Configurar título de ayuda
    const titulo = this.generarTituloAyuda();
    this.renderer.setAttribute(this.elemento, 'title', titulo);
  }

  /**
   * Configura formateo con debounce para tiempo real
   * @private
   */
  private configurarDebounceFormateo(): void {
    this.debounceFormateo$
      .pipe(
        debounceTime(300), // Esperar 300ms después del último cambio
        takeUntil(this.destroy$)
      )
      .subscribe(valor => {
        if (this.configuracion.formateoEnTiempoReal) {
          this.aplicarFormateoEnTiempoReal(valor);
        }
      });
  }

  /**
   * Configura validación con FormControl
   * @private
   */
  private configurarValidacionFormControl(): void {
    if (this.ngControl && this.ngControl.control) {
      // Agregar validador personalizado para precios
      const validador = this.validacionService.validadorPrecioUnitario({
        obligatorio: true,
        valorMinimo: this.configuracion.valorMinimo,
        valorMaximo: this.configuracion.valorMaximo
      });

      // Combinar con validadores existentes
      const validadoresExistentes = this.ngControl.control.validator;
      if (validadoresExistentes) {
        this.ngControl.control.setValidators([validadoresExistentes, validador]);
      } else {
        this.ngControl.control.setValidators(validador);
      }

      console.log('🔗 Validador FormControl configurado para formato moneda');
    }
  }

  /**
   * Aplica placeholder con formato de ejemplo
   * @private
   */
  private aplicarPlaceholderConFormato(): void {
    if (this.configuracion.placeholderConFormato && this.configMoneda) {
      const placeholderOriginal = this.elemento.placeholder;
      const ejemploFormato = this.configMoneda.ejemploFormato;
      
      const nuevoPlaceholder = placeholderOriginal 
        ? `${placeholderOriginal} (ej: ${ejemploFormato})`
        : `Ejemplo: ${ejemploFormato}`;
      
      this.renderer.setAttribute(this.elemento, 'placeholder', nuevoPlaceholder);
    }
  }

  /**
   * Procesa entrada de texto
   * @private
   */
  private procesarEntrada(valor: string): void {
    // Almacenar valor anterior para rollback
    this.valorAnterior = valor;

    // Extraer valor numérico
    const valorNumerico = this.extraerValorNumerico(valor);
    
    // Validar formato básico
    if (!this.esFormatoValido(valorNumerico)) {
      this.mostrarEstadoError();
      return;
    }

    // Aplicar formateo según configuración
    if (this.configuracion.formateoEnTiempoReal) {
      this.debounceFormateo$.next(valorNumerico);
    }

    // Actualizar FormControl con valor numérico
    this.actualizarFormControl(valorNumerico);
  }

  /**
   * Aplica formateo en tiempo real
   * @private
   */
  private aplicarFormateoEnTiempoReal(valor: string): void {
    if (this.formateandoValor) return;

    try {
      this.formateandoValor = true;
      this.estadoActual = EstadoFormateo.FORMATEANDO;

      const numero = this.convertirANumero(valor);
      if (isNaN(numero)) {
        this.formateandoValor = false;
        return;
      }

      // Formatear usando el pipe
      const valorFormateado = this.monedaPipe.transform(numero, this.configuracion.moneda, {
        mostrarSimbolo: this.configuracion.mostrarSimbolo,
        mostrarCodigo: this.configuracion.mostrarCodigo,
        decimales: this.configuracion.decimalesPermitidos
      });

      // Aplicar solo si cambió
      if (valorFormateado !== this.elemento.value) {
        const posicionCursor = this.calcularNuevaPosicionCursor(valorFormateado);
        this.elemento.value = valorFormateado;
        
        // Restaurar posición del cursor
        setTimeout(() => {
          this.elemento.setSelectionRange(posicionCursor, posicionCursor);
        }, 0);
      }

      this.mostrarEstadoExito();

    } catch (error) {
      console.error('❌ Error en formateo en tiempo real:', error);
      this.mostrarEstadoError();
    } finally {
      this.formateandoValor = false;
    }
  }

  /**
   * Aplica formateo completo al perder foco
   * @private
   */
  private aplicarFormateoCompleto(valor: string): void {
    try {
      const numero = this.convertirANumero(valor);
      if (isNaN(numero)) {
        return;
      }

      // Formatear usando el pipe con todas las opciones
      const valorFormateado = this.monedaPipe.transform(numero, this.configuracion.moneda, {
        mostrarSimbolo: this.configuracion.mostrarSimbolo,
        mostrarCodigo: this.configuracion.mostrarCodigo,
        decimales: this.configuracion.decimalesPermitidos
      });

      this.elemento.value = valorFormateado;
      this.actualizarFormControl(valor);

    } catch (error) {
      console.error('❌ Error en formateo completo:', error);
    }
  }

  /**
   * Extrae valor numérico de un string formateado
   * @private
   */
  private extraerValorNumerico(valor: string): string {
    if (!valor) return '';

    // Usar método del pipe para parsear
    const numero = MonedaHispanaPipe.parsear(valor, this.configuracion.moneda);
    return numero.toString();
  }

  /**
   * Limpia texto monetario dejando solo números
   * @private
   */
  private limpiarTextoMonetario(texto: string): string {
    if (!texto) return '';

    // Remover símbolos de moneda conocidos
    let textoLimpio = texto;
    
    if (this.configMoneda) {
      // Remover símbolo específico de la moneda
      const simboloRegex = new RegExp(this.configMoneda.simbolo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      textoLimpio = textoLimpio.replace(simboloRegex, '');
      
      // Remover código de moneda
      textoLimpio = textoLimpio.replace(new RegExp(this.configMoneda.codigo, 'g'), '');
    }

    // Remover símbolos comunes
    textoLimpio = textoLimpio.replace(/[€$₲₡]/g, '');
    textoLimpio = textoLimpio.replace(/[A-Z]{2,4}\$?/g, '');
    textoLimpio = textoLimpio.replace(/\s/g, '');

    // Normalizar separadores decimales
    if (this.configMoneda?.separadorDecimal === ',') {
      textoLimpio = textoLimpio.replace(/\./g, '').replace(/,/g, '.');
    } else {
      textoLimpio = textoLimpio.replace(/,/g, '');
    }

    return textoLimpio;
  }

  /**
   * Convierte string a número
   * @private
   */
  private convertirANumero(valor: string): number {
    const valorLimpio = this.limpiarTextoMonetario(valor);
    return parseFloat(valorLimpio) || 0;
  }

  /**
   * Verifica si el formato del valor es válido
   * @private
   */
  private esFormatoValido(valor: string): boolean {
    if (!valor) return true;

    const numero = parseFloat(valor);
    return !isNaN(numero) && isFinite(numero);
  }

  /**
   * Calcula nueva posición del cursor después del formateo
   * @private
   */
  private calcularNuevaPosicionCursor(valorFormateado: string): number {
    // Lógica simplificada: mantener cursor al final
    // En una implementación más avanzada, se calcularía la posición relativa
    return valorFormateado.length;
  }

  /**
   * Aplica valor y lo formatea
   * @private
   */
  private aplicarValorYFormatear(valor: string): void {
    this.elemento.value = valor;
    this.procesarEntrada(valor);
  }

  /**
   * Actualiza el FormControl si existe
   * @private
   */
  private actualizarFormControl(valor: string): void {
    if (this.ngControl && this.ngControl.control) {
      const numero = this.convertirANumero(valor);
      this.ngControl.control.setValue(numero, { emitEvent: false });
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
   * Valida rango final y muestra feedback
   * @private
   */
  private validarRangoFinal(valor: string): void {
    if (!valor) return;

    try {
      const numero = this.convertirANumero(valor);
      
      if (this.configuracion.valorMinimo !== undefined && numero < this.configuracion.valorMinimo) {
        this.mostrarEstadoWarning();
        console.warn(`⚠️ Valor ${numero} menor al mínimo ${this.configuracion.valorMinimo}`);
      } else if (this.configuracion.valorMaximo !== undefined && numero > this.configuracion.valorMaximo) {
        this.mostrarEstadoWarning();
        console.warn(`⚠️ Valor ${numero} mayor al máximo ${this.configuracion.valorMaximo}`);
      } else {
        this.mostrarEstadoExito();
      }
    } catch (error) {
      this.mostrarEstadoError();
    }
  }

  /**
   * Muestra estado de éxito
   * @private
   */
  private mostrarEstadoExito(): void {
    this.limpiarEstadosVisuales();
    this.renderer.addClass(this.elemento, 'formato-moneda-success');
    
    setTimeout(() => {
      this.renderer.removeClass(this.elemento, 'formato-moneda-success');
    }, 1500);
  }

  /**
   * Muestra estado de error
   * @private
   */
  private mostrarEstadoError(): void {
    this.limpiarEstadosVisuales();
    this.renderer.addClass(this.elemento, 'formato-moneda-error');
    this.estadoActual = EstadoFormateo.ERROR;
  }

  /**
   * Muestra estado de advertencia
   * @private
   */
  private mostrarEstadoWarning(): void {
    this.limpiarEstadosVisuales();
    this.renderer.addClass(this.elemento, 'formato-moneda-warning');
    
    setTimeout(() => {
      this.renderer.removeClass(this.elemento, 'formato-moneda-warning');
    }, 2000);
  }

  /**
   * Limpia estados visuales
   * @private
   */
  private limpiarEstadosVisuales(): void {
    ['formato-moneda-success', 'formato-moneda-error', 'formato-moneda-warning'].forEach(clase => {
      this.renderer.removeClass(this.elemento, clase);
    });
  }

  /**
   * Genera título de ayuda para el campo
   * @private
   */
  private generarTituloAyuda(): string {
    if (!this.configMoneda) {
      return 'Campo de formato monetario';
    }

    const caracteristicas = [];
    caracteristicas.push(`Moneda: ${this.configMoneda.nombre}`);
    caracteristicas.push(`Formato: ${this.configMoneda.ejemploFormato}`);
    
    if (this.configuracion.decimalesPermitidos > 0) {
      caracteristicas.push(`Decimales: ${this.configuracion.decimalesPermitidos}`);
    }
    
    if (this.configuracion.valorMinimo !== undefined || this.configuracion.valorMaximo !== undefined) {
      const min = this.configuracion.valorMinimo ?? '∞';
      const max = this.configuracion.valorMaximo ?? '∞';
      caracteristicas.push(`Rango: ${min} - ${max}`);
    }
    
    return caracteristicas.join(' | ');
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Actualiza la configuración de la directiva
   * @param nuevaConfiguracion Nueva configuración parcial
   */
  public actualizarConfiguracion(nuevaConfiguracion: Partial<ConfiguracionFormatoMoneda>): void {
    this.configuracion = { ...this.configuracion, ...nuevaConfiguracion };
    this.configMoneda = MonedaHispanaPipe.obtenerConfiguracionMoneda(this.configuracion.moneda);
    this.configurarElemento();
    console.log('🔄 Configuración de FormatoMoneda actualizada:', this.configuracion);
  }

  /**
   * Establece un valor monetario en el campo
   * @param valor Valor a establecer
   */
  public establecerValor(valor: number | string): void {
    const numero = typeof valor === 'number' ? valor : this.convertirANumero(valor.toString());
    
    const valorFormateado = this.monedaPipe.transform(numero, this.configuracion.moneda, {
      mostrarSimbolo: this.configuracion.mostrarSimbolo,
      mostrarCodigo: this.configuracion.mostrarCodigo,
      decimales: this.configuracion.decimalesPermitidos
    });

    this.elemento.value = valorFormateado;
    this.actualizarFormControl(numero.toString());
  }

  /**
   * Obtiene el valor actual como número
   * @returns number Valor numérico actual
   */
  public obtenerValorNumerico(): number {
    return this.convertirANumero(this.elemento.value);
  }

  /**
   * Limpia el campo
   */
  public limpiar(): void {
    this.elemento.value = '';
    this.actualizarFormControl('');
    this.limpiarEstadosVisuales();
    this.estadoActual = EstadoFormateo.INICIAL;
  }

  /**
   * Cambia la moneda de formateo
   * @param nuevaMoneda Nueva moneda
   */
  public cambiarMoneda(nuevaMoneda: CodigoMoneda): void {
    this.configuracion.moneda = nuevaMoneda;
    this.configMoneda = MonedaHispanaPipe.obtenerConfiguracionMoneda(nuevaMoneda);
    
    // Reformatear valor actual con nueva moneda
    const valorActual = this.obtenerValorNumerico();
    if (valorActual > 0) {
      this.establecerValor(valorActual);
    }
    
    this.configurarElemento();
    console.log('💱 Moneda cambiada a:', nuevaMoneda);
  }

  /**
   * Verifica si el valor actual es válido
   * @returns boolean True si es válido
   */
  public esValorValido(): boolean {
    const valor = this.elemento.value;
    if (!valor) return true;

    const numero = this.convertirANumero(valor);
    
    // Verificar formato
    if (isNaN(numero) || !isFinite(numero)) {
      return false;
    }

    // Verificar rangos
    if (this.configuracion.valorMinimo !== undefined && numero < this.configuracion.valorMinimo) {
      return false;
    }

    if (this.configuracion.valorMaximo !== undefined && numero > this.configuracion.valorMaximo) {
      return false;
    }

    return true;
  }

  /**
   * Obtiene información del estado actual
   * @returns object Estado actual de la directiva
   */
  public obtenerEstado(): object {
    return {
      configuracion: this.configuracion,
      configMoneda: this.configMoneda,
      estadoActual: this.estadoActual,
      valorActual: this.elemento.value,
      valorNumerico: this.obtenerValorNumerico(),
      esValido: this.esValorValido(),
      elementoId: this.elemento.id
    };
  }

  /**
   * Obtiene información de debug de la directiva
   * @returns object Información de debug
   */
  public obtenerInfoDebug(): object {
    return {
      ...this.obtenerEstado(),
      elemento: {
        tagName: this.elemento.tagName,
        id: this.elemento.id,
        className: this.elemento.className,
        disabled: this.elemento.disabled,
        placeholder: this.elemento.placeholder,
        title: this.elemento.title
      },
      monedaPipe: {
        monedasSoportadas: MonedaHispanaPipe.obtenerMonedasSoportadas().length,
        ejemploFormato: this.configMoneda?.ejemploFormato,
        separadorMiles: this.configMoneda?.separadorMiles,
        separadorDecimal: this.configMoneda?.separadorDecimal
      },
      estadisticas: {
        formateandoValor: this.formateandoValor,
        valorAnterior: this.valorAnterior,
        posicionCursorAnterior: this.posicionCursorAnterior
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Fuerza el formateo del valor actual
   */
  public forzarFormateo(): void {
    const valorActual = this.elemento.value;
    if (valorActual) {
      this.aplicarFormateoCompleto(valorActual);
    }
  }

  /**
   * Exporta valor en diferentes formatos
   * @returns object Valor en múltiples formatos
   */
  public exportarValor(): object {
    const valorNumerico = this.obtenerValorNumerico();
    
    return {
      numerico: valorNumerico,
      formateado: this.elemento.value,
      moneda: this.configuracion.moneda,
      sinFormato: valorNumerico.toString(),
      conSimbolo: this.monedaPipe.transform(valorNumerico, this.configuracion.moneda, {
        mostrarSimbolo: true,
        mostrarCodigo: false
      }),
      conCodigo: this.monedaPipe.transform(valorNumerico, this.configuracion.moneda, {
        mostrarSimbolo: false,
        mostrarCodigo: true
      }),
      formatoCorto: this.monedaPipe.transform(valorNumerico, this.configuracion.moneda, {
        formatoCorto: true
      })
    };
  }
}

// ==================== FUNCIONES ESTÁTICAS PARA USO GLOBAL ====================

/**
 * Utilidades estáticas para formato de moneda
 */
export class FormatoMonedaUtils {
  
  /**
   * Formatea un valor usando configuración específica
   * @param valor Valor a formatear
   * @param moneda Código de moneda
   * @param opciones Opciones de formateo
   * @returns string Valor formateado
   */
  static formatear(valor: any, moneda: CodigoMoneda = 'CLP', opciones?: Partial<OpcionesFormateo>): string {
    const pipe = new MonedaHispanaPipe();
    return pipe.transform(valor, moneda, opciones);
  }

  /**
   * Convierte string formateado a número
   * @param valorFormateado String formateado
   * @param moneda Código de moneda para contexto
   * @returns number Valor numérico
   */
  static parsear(valorFormateado: string, moneda?: CodigoMoneda): number {
    return MonedaHispanaPipe.parsear(valorFormateado, moneda);
  }

  /**
   * Valida si un string tiene formato de moneda válido
   * @param valor String a validar
   * @param moneda Código de moneda
   * @returns boolean True si es válido
   */
  static esFormatoValido(valor: string, moneda?: CodigoMoneda): boolean {
    return MonedaHispanaPipe.esFormatoValido(valor, moneda);
  }

  /**
   * Obtiene símbolo de una moneda
   * @param moneda Código de moneda
   * @returns string Símbolo de la moneda
   */
  static obtenerSimbolo(moneda: CodigoMoneda): string {
    return MonedaHispanaPipe.obtenerSimbolo(moneda);
  }

  /**
   * Obtiene ejemplo de formato para una moneda
   * @param moneda Código de moneda
   * @returns string Ejemplo de formato
   */
  static obtenerEjemploFormato(moneda: CodigoMoneda): string {
    return MonedaHispanaPipe.obtenerEjemploFormato(moneda);
  }

  /**
   * Convierte entre monedas (requiere tasa de cambio)
   * @param valor Valor a convertir
   * @param monedaOrigen Moneda de origen
   * @param monedaDestino Moneda de destino
   * @param tasaCambio Tasa de cambio
   * @returns string Valor convertido y formateado
   */
  static convertir(
    valor: any,
    monedaOrigen: CodigoMoneda,
    monedaDestino: CodigoMoneda,
    tasaCambio: number
  ): string {
    return MonedaHispanaPipe.convertir(valor, monedaOrigen, monedaDestino, tasaCambio);
  }

  /**
   * Obtiene configuración completa de una moneda
   * @param moneda Código de moneda
   * @returns ConfiguracionMoneda | null Configuración de la moneda
   */
  static obtenerConfiguracionMoneda(moneda: CodigoMoneda): ConfiguracionMoneda | null {
    return MonedaHispanaPipe.obtenerConfiguracionMoneda(moneda);
  }

  /**
   * Lista todas las monedas soportadas
   * @returns ConfiguracionMoneda[] Lista de configuraciones
   */
  static obtenerMonedasSoportadas(): ConfiguracionMoneda[] {
    return MonedaHispanaPipe.obtenerMonedasSoportadas();
  }

  /**
   * Obtiene monedas por región
   * @param region Región a filtrar
   * @returns ConfiguracionMoneda[] Monedas de la región
   */
  static obtenerMonedasPorRegion(region: 'latinoamerica' | 'europa' | 'norteamerica' | 'africa'): ConfiguracionMoneda[] {
    return MonedaHispanaPipe.obtenerMonedasPorRegion(region);
  }

  /**
   * Busca monedas por nombre o código
   * @param busqueda Término de búsqueda
   * @returns ConfiguracionMoneda[] Monedas encontradas
   */
  static buscarMonedas(busqueda: string): ConfiguracionMoneda[] {
    return MonedaHispanaPipe.buscarMonedas(busqueda);
  }

  /**
   * Formatea múltiples valores con la misma configuración
   * @param valores Array de valores
   * @param moneda Código de moneda
   * @param opciones Opciones de formateo
   * @returns string[] Valores formateados
   */
  static formatearMultiples(
    valores: any[],
    moneda: CodigoMoneda = 'CLP',
    opciones?: Partial<OpcionesFormateo>
  ): string[] {
    return MonedaHispanaPipe.formatearMultiples(valores, moneda, opciones);
  }

  /**
   * Calcula y formatea total de un array
   * @param valores Array de valores
   * @param moneda Código de moneda
   * @param opciones Opciones de formateo
   * @returns string Total formateado
   */
  static calcularYFormatearTotal(
    valores: any[],
    moneda: CodigoMoneda = 'CLP',
    opciones?: Partial<OpcionesFormateo>
  ): string {
    return MonedaHispanaPipe.calcularYFormatearTotal(valores, moneda, opciones);
  }

  /**
   * Formatea diferencia con indicadores visuales
   * @param valor Valor de la diferencia
   * @param moneda Código de moneda
   * @returns object Diferencia formateada con metadatos
   */
  static formatearDiferencia(valor: any, moneda: CodigoMoneda = 'CLP'): {
    texto: string;
    clase: string;
    icono: string;
    esPositivo: boolean;
  } {
    return MonedaHispanaPipe.formatearDiferencia(valor, moneda);
  }

  /**
   * Valida que una moneda sea soportada
   * @param codigo Código a validar
   * @returns boolean True si es soportada
   */
  static esMonedasoportada(codigo: string): codigo is CodigoMoneda {
    return MonedaHispanaPipe.esMonedasoportada(codigo);
  }

  /**
   * Obtiene información de debug completa
   * @returns object Información de debug del sistema
   */
  static obtenerInfoDebugSistema(): object {
    return {
      pipe: MonedaHispanaPipe.obtenerInfoDebug(),
      compatibilidad: MonedaHispanaPipe.generarReporteCompatibilidad(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Normaliza valor monetario para comparaciones
   * @param valor Valor a normalizar
   * @param moneda Moneda de contexto
   * @returns number Valor normalizado
   */
  static normalizar(valor: any, moneda?: CodigoMoneda): number {
    if (typeof valor === 'number') {
      return valor;
    }
    
    if (typeof valor === 'string') {
      return FormatoMonedaUtils.parsear(valor, moneda);
    }
    
    return 0;
  }

  /**
   * Compara dos valores monetarios
   * @param valor1 Primer valor
   * @param valor2 Segundo valor
   * @param moneda Moneda de contexto
   * @returns number -1, 0, or 1 para menor, igual, mayor
   */
  static comparar(valor1: any, valor2: any, moneda?: CodigoMoneda): number {
    const num1 = FormatoMonedaUtils.normalizar(valor1, moneda);
    const num2 = FormatoMonedaUtils.normalizar(valor2, moneda);
    
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
    return 0;
  }

  /**
   * Redondea valor según decimales de la moneda
   * @param valor Valor a redondear
   * @param moneda Código de moneda
   * @returns number Valor redondeado
   */
  static redondear(valor: number, moneda: CodigoMoneda): number {
    const config = FormatoMonedaUtils.obtenerConfiguracionMoneda(moneda);
    const decimales = config?.decimales ?? 2;
    
    const factor = Math.pow(10, decimales);
    return Math.round(valor * factor) / factor;
  }

  /**
   * Obtiene rango válido para una moneda
   * @param moneda Código de moneda
   * @returns object Rango de valores recomendado
   */
  static obtenerRangoValido(moneda: CodigoMoneda): { minimo: number; maximo: number; sugerido: number } {
    const config = FormatoMonedaUtils.obtenerConfiguracionMoneda(moneda);
    
    // Rangos basados en la moneda y su país
    const rangos: Record<CodigoMoneda, { minimo: number; maximo: number; sugerido: number }> = {
      CLP: { minimo: 1, maximo: 10000000, sugerido: 50000 },
      ARS: { minimo: 1, maximo: 100000000, sugerido: 10000 },
      COP: { minimo: 1, maximo: 50000000, sugerido: 25000 },
      MXN: { minimo: 0.01, maximo: 1000000, sugerido: 500 },
      PEN: { minimo: 0.01, maximo: 100000, sugerido: 100 },
      UYU: { minimo: 1, maximo: 1000000, sugerido: 1000 },
      BOB: { minimo: 0.01, maximo: 100000, sugerido: 100 },
      PYG: { minimo: 1, maximo: 100000000, sugerido: 50000 },
      VES: { minimo: 1, maximo: 1000000000, sugerido: 1000000 },
      GTQ: { minimo: 0.01, maximo: 100000, sugerido: 100 },
      HNL: { minimo: 0.01, maximo: 100000, sugerido: 100 },
      NIO: { minimo: 0.01, maximo: 100000, sugerido: 100 },
      CRC: { minimo: 1, maximo: 10000000, sugerido: 5000 },
      PAB: { minimo: 0.01, maximo: 100000, sugerido: 100 },
      DOP: { minimo: 0.01, maximo: 1000000, sugerido: 1000 },
      CUP: { minimo: 0.01, maximo: 100000, sugerido: 100 },
      EUR: { minimo: 0.01, maximo: 1000000, sugerido: 100 },
      USD: { minimo: 0.01, maximo: 1000000, sugerido: 100 },
      XAF: { minimo: 1, maximo: 10000000, sugerido: 10000 }
    };
    
    return rangos[moneda] || { minimo: 0.01, maximo: 1000000, sugerido: 100 };
  }
}

// Exportar tipos adicionales para uso externo
export type { ConfiguracionFormatoMoneda, EstadoFormateo };