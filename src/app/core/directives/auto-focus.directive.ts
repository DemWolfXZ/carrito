/**
 * Directiva Auto Focus - Aplica foco automático a elementos
 * 
 * Directiva para aplicar focus automático con configuración flexible.
 * Soporta delays, condiciones dinámicas y detección de dispositivos móviles.
 * Optimizada para uso con Ionic y Angular Router.
 * 
 * @author DemWolf
 * @version 1.0.0
 * @since 2025-06-19
 */

import { 
  Directive, 
  ElementRef, 
  Input, 
  OnInit, 
  OnDestroy, 
  AfterViewInit,
  Renderer2,
  NgZone,
  ChangeDetectorRef,
  Optional,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Subject, timer, fromEvent } from 'rxjs';
import { takeUntil, filter, debounceTime } from 'rxjs/operators';

import { SeguridadService } from '@core-services/seguridad.service';

/**
 * Configuración de la directiva auto focus
 */
interface ConfiguracionAutoFocus {
  /** Delay antes de aplicar focus (ms) */
  delay: number;
  /** Solo aplicar focus si la condición es verdadera */
  condicion: boolean;
  /** Evitar focus en dispositivos móviles */
  evitarEnMoviles: boolean;
  /** Focus solo al navegar a la ruta */
  soloEnNavegacion: boolean;
  /** Prioridad del focus (mayor número = mayor prioridad) */
  prioridad: number;
  /** Aplicar scroll al elemento después del focus */
  scrollAlElemento: boolean;
  /** Seleccionar todo el texto al hacer focus */
  seleccionarTodo: boolean;
  /** Focus solo si no hay otro elemento con focus */
  soloSiNoHayFocus: boolean;
}

/**
 * Tipos de elementos focuseables
 */
type ElementoFocuseable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement;

@Directive({
  selector: '[appAutoFocus]',
  standalone: true
})
export class AutoFocusDirective implements OnInit, AfterViewInit, OnDestroy {

  // Inputs de configuración
  @Input() autoFocusDelay: number = 100;
  @Input() autoFocusCondicion: boolean = true;
  @Input() autoFocusEvitarMoviles: boolean = true;
  @Input() autoFocusSoloNavegacion: boolean = false;
  @Input() autoFocusPrioridad: number = 0;
  @Input() autoFocusScroll: boolean = false;
  @Input() autoFocusSeleccionarTodo: boolean = false;
  @Input() autoFocusSoloSiNoHayFocus: boolean = true;
  @Input() autoFocusRuta: string = '';
  @Input() autoFocusGrupo: string = '';

  // Subject para limpiar suscripciones
  private destroy$ = new Subject<void>();
  
  // Elemento HTML nativo
  private elemento: ElementoFocuseable;
  
  // Configuración final
  private configuracion: ConfiguracionAutoFocus = {
    delay: 100,
    condicion: true,
    evitarEnMoviles: true,
    soloEnNavegacion: false,
    prioridad: 0,
    scrollAlElemento: false,
    seleccionarTodo: false,
    soloSiNoHayFocus: true
  };
  
  // Control de estado
  private focusAplicado = false;
  private intentosRealizados = 0;
  private readonly maxIntentos = 3;
  
  // Detección de plataforma
  private esPlatformaBrowser: boolean;
  private esDispositivoMovil: boolean;
  
  // Timer para delay
  private timerFocus: any;

  // Registro estático de elementos con auto focus para manejo de prioridades
  private static elementosRegistrados: Map<string, AutoFocusDirective> = new Map();
  private static contadorIds = 0;
  private elementoId: string;

  constructor(
    private elementRef: ElementRef<ElementoFocuseable>,
    private renderer: Renderer2,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private seguridadService: SeguridadService,
    @Optional() private router: Router,
    @Optional() private platform: Platform,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.elemento = this.elementRef.nativeElement;
    this.esPlatformaBrowser = isPlatformBrowser(this.platformId);
    this.esDispositivoMovil = this.detectarDispositivoMovil();
    this.elementoId = `auto-focus-${++AutoFocusDirective.contadorIds}`;
  }

  ngOnInit(): void {
    try {
      console.log('🎯 Inicializando directiva AutoFocus en:', this.elemento.tagName, this.elemento.id || 'sin ID');
      
      // Solo ejecutar en el navegador
      if (!this.esPlatformaBrowser) {
        return;
      }

      // Crear configuración final
      this.configuracion = this.crearConfiguracion();
      
      // Registrar elemento
      this.registrarElemento();
      
      // Configurar elemento
      this.configurarElemento();
      
      // Configurar listeners de navegación si es necesario
      this.configurarNavegacion();
      
      console.log('✅ Directiva AutoFocus inicializada con configuración:', this.configuracion);
      
    } catch (error) {
      console.error('❌ Error inicializando directiva AutoFocus:', error);
    }
  }

  ngAfterViewInit(): void {
    if (!this.esPlatformaBrowser) {
      return;
    }

    // Aplicar focus después de que la vista esté completamente inicializada
    if (!this.configuracion.soloEnNavegacion) {
      this.aplicarFocusConDelay();
    }
  }

  ngOnDestroy(): void {
    // Limpiar timer
    if (this.timerFocus) {
      clearTimeout(this.timerFocus);
    }

    // Desregistrar elemento
    AutoFocusDirective.elementosRegistrados.delete(this.elementoId);

    // Limpiar suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Crea la configuración final de la directiva
   * @private
   */
  private crearConfiguracion(): ConfiguracionAutoFocus {
    return {
      delay: Math.max(0, this.autoFocusDelay),
      condicion: this.autoFocusCondicion,
      evitarEnMoviles: this.autoFocusEvitarMoviles,
      soloEnNavegacion: this.autoFocusSoloNavegacion,
      prioridad: this.autoFocusPrioridad,
      scrollAlElemento: this.autoFocusScroll,
      seleccionarTodo: this.autoFocusSeleccionarTodo,
      soloSiNoHayFocus: this.autoFocusSoloSiNoHayFocus
    };
  }

  /**
   * Detecta si es un dispositivo móvil
   * @private
   */
  private detectarDispositivoMovil(): boolean {
    if (this.platform) {
      // Usar Ionic Platform si está disponible
      return this.platform.is('mobile') || this.platform.is('tablet');
    }

    // Detección manual para entornos sin Ionic
    if (!this.esPlatformaBrowser) {
      return false;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const esMovil = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const esTactil = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return esMovil || esTactil;
  }

  /**
   * Registra el elemento en el registro estático
   * @private
   */
  private registrarElemento(): void {
    AutoFocusDirective.elementosRegistrados.set(this.elementoId, this);
  }

  /**
   * Configura propiedades básicas del elemento
   * @private
   */
  private configurarElemento(): void {
    // Agregar clase CSS para identificación
    this.renderer.addClass(this.elemento, 'auto-focus-element');
    
    // Configurar atributo de prioridad para CSS
    this.renderer.setAttribute(this.elemento, 'data-focus-priority', this.configuracion.prioridad.toString());
    
    // Configurar grupo si existe
    if (this.autoFocusGrupo) {
      this.renderer.setAttribute(this.elemento, 'data-focus-group', this.autoFocusGrupo);
    }

    // Listener para detectar cuando el elemento recibe focus manualmente
    fromEvent(this.elemento, 'focus')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.focusAplicado = true;
        console.log('🎯 Focus aplicado en elemento:', this.elemento.tagName);
      });

    // Listener para detectar cuando el elemento pierde focus
    fromEvent(this.elemento, 'blur')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('👋 Focus perdido en elemento:', this.elemento.tagName);
      });
  }

  /**
   * Configura listeners de navegación del router
   * @private
   */
  private configurarNavegacion(): void {
    if (!this.router) {
      return;
    }

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        debounceTime(50), // Evitar múltiples eventos seguidos
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        // Aplicar focus solo si la configuración lo permite
        if (this.configuracion.soloEnNavegacion) {
          // Verificar si la ruta coincide si está especificada
          if (this.autoFocusRuta) {
            if (event.url.includes(this.autoFocusRuta)) {
              this.aplicarFocusConDelay();
            }
          } else {
            this.aplicarFocusConDelay();
          }
        }
      });
  }

  /**
   * Aplica focus con delay configurado
   * @private
   */
  private aplicarFocusConDelay(): void {
    // Validar condiciones previas
    if (!this.puedeAplicarFocus()) {
      return;
    }

    // Limpiar timer anterior si existe
    if (this.timerFocus) {
      clearTimeout(this.timerFocus);
    }

    // Aplicar focus con delay
    this.timerFocus = setTimeout(() => {
      this.ngZone.run(() => {
        this.aplicarFocus();
      });
    }, this.configuracion.delay);
  }

  /**
   * Verifica si puede aplicar focus
   * @private
   */
  private puedeAplicarFocus(): boolean {
    // Verificar condición de activación
    if (!this.configuracion.condicion) {
      console.log('🚫 AutoFocus: Condición no cumplida');
      return false;
    }

    // Verificar dispositivo móvil
    if (this.configuracion.evitarEnMoviles && this.esDispositivoMovil) {
      console.log('📱 AutoFocus: Evitado en dispositivo móvil');
      return false;
    }

    // Verificar si ya se aplicó focus
    if (this.focusAplicado) {
      console.log('✅ AutoFocus: Ya se aplicó focus previamente');
      return false;
    }

    // Verificar número de intentos
    if (this.intentosRealizados >= this.maxIntentos) {
      console.log('⚠️ AutoFocus: Máximo número de intentos alcanzado');
      return false;
    }

    // Verificar si el elemento es visible y focuseable
    if (!this.esElementoFocuseable()) {
      console.log('👁️ AutoFocus: Elemento no es focuseable');
      return false;
    }

    // Verificar si ya hay otro elemento con focus
    if (this.configuracion.soloSiNoHayFocus && this.hayElementoConFocus()) {
      console.log('🎯 AutoFocus: Ya existe otro elemento con focus');
      return false;
    }

    return true;
  }

  /**
   * Verifica si el elemento es focuseable
   * @private
   */
  private esElementoFocuseable(): boolean {
    try {
      // Verificar que el elemento esté en el DOM
      if (!document.contains(this.elemento)) {
        return false;
      }

      // Verificar que esté visible
      const style = window.getComputedStyle(this.elemento);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }

      // Verificar que no esté disabled
      if (this.elemento.disabled) {
        return false;
      }

      // Verificar que no tenga tabindex negativo
      const tabIndex = this.elemento.tabIndex;
      if (tabIndex < 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verificando si elemento es focuseable:', error);
      return false;
    }
  }

  /**
   * Verifica si hay algún elemento con focus actualmente
   * @private
   */
  private hayElementoConFocus(): boolean {
    const elementoActivo = document.activeElement;
    return !!elementoActivo && elementoActivo !== document.body && elementoActivo !== this.elemento;
  }

  /**
   * Aplica focus al elemento
   * @private
   */
  private aplicarFocus(): void {
    try {
      this.intentosRealizados++;

      // Verificar que aún puede aplicar focus
      if (!this.puedeAplicarFocus()) {
        return;
      }

      // Manejar prioridades si hay múltiples elementos
      if (!this.tienePrioridadMaxima()) {
        console.log('⚖️ AutoFocus: Elemento con menor prioridad, cediendo focus');
        return;
      }

      console.log(`🎯 Aplicando focus (intento ${this.intentosRealizados}/${this.maxIntentos})`);

      // Aplicar focus
      this.elemento.focus();

      // Verificar que el focus se aplicó correctamente
      setTimeout(() => {
        if (document.activeElement === this.elemento) {
          this.focusAplicado = true;
          this.onFocusAplicadoExitosamente();
        } else {
          console.warn('⚠️ AutoFocus: No se pudo aplicar focus, reintentando...');
          if (this.intentosRealizados < this.maxIntentos) {
            setTimeout(() => this.aplicarFocus(), 100);
          }
        }
      }, 50);

    } catch (error) {
      console.error('❌ Error aplicando focus:', error);
    }
  }

  /**
   * Verifica si este elemento tiene la prioridad máxima
   * @private
   */
  private tienePrioridadMaxima(): boolean {
    const elementosDelGrupo = Array.from(AutoFocusDirective.elementosRegistrados.values())
      .filter(directive => {
        // Mismo grupo o sin grupo
        const mismoGrupo = !this.autoFocusGrupo || directive.autoFocusGrupo === this.autoFocusGrupo;
        // Condición cumplida
        const condicionCumplida = directive.configuracion.condicion;
        // Elemento focuseable
        const esFocuseable = directive.esElementoFocuseable();
        
        return mismoGrupo && condicionCumplida && esFocuseable;
      });

    if (elementosDelGrupo.length <= 1) {
      return true;
    }

    const prioridadMaxima = Math.max(...elementosDelGrupo.map(d => d.configuracion.prioridad));
    return this.configuracion.prioridad >= prioridadMaxima;
  }

  /**
   * Ejecuta acciones adicionales cuando el focus se aplica exitosamente
   * @private
   */
  private onFocusAplicadoExitosamente(): void {
    console.log('✅ AutoFocus aplicado exitosamente');

    // Scroll al elemento si está configurado
    if (this.configuracion.scrollAlElemento) {
      this.scrollAlElemento();
    }

    // Seleccionar todo el texto si está configurado
    if (this.configuracion.seleccionarTodo && this.esElementoConTexto()) {
      this.seleccionarTextoCompleto();
    }

    // Logging de seguridad
    this.registrarEventoSeguridad();

    // Notificar a otros elementos del grupo que este tiene focus
    this.notificarFocusAGrupo();
  }

  /**
   * Realiza scroll al elemento
   * @private
   */
  private scrollAlElemento(): void {
    try {
      // Usar scrollIntoView con opciones suaves
      this.elemento.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      console.log('📜 Scroll al elemento realizado');
    } catch (error) {
      console.error('Error realizando scroll:', error);
      // Fallback a scroll básico
      this.elemento.scrollIntoView();
    }
  }

  /**
   * Verifica si el elemento puede contener texto
   * @private
   */
  private esElementoConTexto(): boolean {
    return this.elemento instanceof HTMLInputElement || this.elemento instanceof HTMLTextAreaElement;
  }

  /**
   * Selecciona todo el texto del elemento
   * @private
   */
  private seleccionarTextoCompleto(): void {
    if (this.esElementoConTexto()) {
      const elementoTexto = this.elemento as HTMLInputElement | HTMLTextAreaElement;
      
      try {
        elementoTexto.select();
        console.log('📝 Texto seleccionado completamente');
      } catch (error) {
        console.error('Error seleccionando texto:', error);
        // Fallback manual
        elementoTexto.setSelectionRange(0, elementoTexto.value.length);
      }
    }
  }

  /**
   * Registra evento de seguridad
   * @private
   */
  private registrarEventoSeguridad(): void {
    const infoElemento = {
      tagName: this.elemento.tagName,
      id: this.elemento.id,
      clase: this.elemento.className,
      tipo: (this.elemento as HTMLInputElement).type || 'N/A'
    };

    this.seguridadService.validarEntrada(JSON.stringify(infoElemento), 'notas')
      .pipe(takeUntil(this.destroy$))
      .subscribe(resultado => {
        if (resultado.valido) {
          console.log('🔒 Evento de focus registrado en seguridad');
        }
      });
  }

  /**
   * Notifica a otros elementos del grupo que este tiene focus
   * @private
   */
  private notificarFocusAGrupo(): void {
    if (!this.autoFocusGrupo) {
      return;
    }

    AutoFocusDirective.elementosRegistrados.forEach((directive, id) => {
      if (id !== this.elementoId && directive.autoFocusGrupo === this.autoFocusGrupo) {
        directive.onOtroElementoDelGrupoTieneFocus();
      }
    });
  }

  /**
   * Maneja cuando otro elemento del grupo recibe focus
   * @private
   */
  private onOtroElementoDelGrupoTieneFocus(): void {
    // Marcar que ya no tiene focus
    this.focusAplicado = false;
    console.log('👥 Otro elemento del grupo recibió focus');
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Fuerza la aplicación de focus ignorando algunas restricciones
   * @param ignorarCondiciones Si debe ignorar condiciones
   */
  public forzarFocus(ignorarCondiciones: boolean = false): void {
    if (ignorarCondiciones) {
      const condicionOriginal = this.configuracion.condicion;
      this.configuracion.condicion = true;
      
      this.aplicarFocusConDelay();
      
      // Restaurar condición original después del delay
      setTimeout(() => {
        this.configuracion.condicion = condicionOriginal;
      }, this.configuracion.delay + 100);
    } else {
      this.aplicarFocusConDelay();
    }
  }

  /**
   * Actualiza la configuración de la directiva
   * @param nuevaConfiguracion Nueva configuración parcial
   */
  public actualizarConfiguracion(nuevaConfiguracion: Partial<ConfiguracionAutoFocus>): void {
    this.configuracion = { ...this.configuracion, ...nuevaConfiguracion };
    this.configurarElemento();
    console.log('🔄 Configuración de AutoFocus actualizada:', this.configuracion);
  }

  /**
   * Actualiza la condición de activación
   * @param nuevaCondicion Nueva condición
   */
  public actualizarCondicion(nuevaCondicion: boolean): void {
    const condicionAnterior = this.configuracion.condicion;
    this.configuracion.condicion = nuevaCondicion;
    
    // Si cambió de false a true, intentar aplicar focus
    if (!condicionAnterior && nuevaCondicion && !this.focusAplicado) {
      this.aplicarFocusConDelay();
    }
  }

  /**
   * Reinicia el estado de la directiva
   */
  public reiniciar(): void {
    this.focusAplicado = false;
    this.intentosRealizados = 0;
    
    if (this.timerFocus) {
      clearTimeout(this.timerFocus);
    }
    
    console.log('🔄 Estado de AutoFocus reiniciado');
  }

  /**
   * Verifica si el elemento tiene focus actualmente
   * @returns boolean True si tiene focus
   */
  public tieneFocus(): boolean {
    return document.activeElement === this.elemento;
  }

  /**
   * Verifica si el focus fue aplicado por esta directiva
   * @returns boolean True si fue aplicado
   */
  public fueAplicado(): boolean {
    return this.focusAplicado;
  }

  /**
   * Obtiene información del estado actual
   * @returns object Estado actual de la directiva
   */
  public obtenerEstado(): object {
    return {
      configuracion: this.configuracion,
      focusAplicado: this.focusAplicado,
      tieneFocus: this.tieneFocus(),
      intentosRealizados: this.intentosRealizados,
      esDispositivoMovil: this.esDispositivoMovil,
      esElementoFocuseable: this.esElementoFocuseable(),
      elementoId: this.elementoId,
      grupo: this.autoFocusGrupo || 'sin grupo'
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
        tabIndex: this.elemento.tabIndex,
        offsetParent: !!this.elemento.offsetParent
      },
      platform: {
        esPlatformaBrowser: this.esPlatformaBrowser,
        esDispositivoMovil: this.esDispositivoMovil,
        userAgent: this.esPlatformaBrowser ? navigator.userAgent : 'N/A'
      },
      timestamp: new Date().toISOString()
    };
  }

  // ==================== MÉTODOS ESTÁTICOS ====================

  /**
   * Obtiene todos los elementos registrados
   * @returns Array<AutoFocusDirective> Lista de directivas registradas
   */
  public static obtenerElementosRegistrados(): AutoFocusDirective[] {
    return Array.from(AutoFocusDirective.elementosRegistrados.values());
  }

  /**
   * Obtiene elementos de un grupo específico
   * @param grupo Nombre del grupo
   * @returns Array<AutoFocusDirective> Elementos del grupo
   */
  public static obtenerElementosPorGrupo(grupo: string): AutoFocusDirective[] {
    return AutoFocusDirective.obtenerElementosRegistrados()
      .filter(directive => directive.autoFocusGrupo === grupo);
  }

  /**
   * Reinicia todos los elementos registrados
   */
  public static reiniciarTodos(): void {
    AutoFocusDirective.elementosRegistrados.forEach(directive => {
      directive.reiniciar();
    });
    console.log('🔄 Todos los elementos AutoFocus reiniciados');
  }

  /**
   * Fuerza focus en el elemento de mayor prioridad de un grupo
   * @param grupo Nombre del grupo (opcional)
   */
  public static forzarFocusEnPrioridad(grupo?: string): void {
    const elementos = grupo 
      ? AutoFocusDirective.obtenerElementosPorGrupo(grupo)
      : AutoFocusDirective.obtenerElementosRegistrados();

    if (elementos.length === 0) {
      return;
    }

    // Encontrar elemento con mayor prioridad
    const elementoPrioritario = elementos.reduce((anterior, actual) => {
      return actual.configuracion.prioridad > anterior.configuracion.prioridad ? actual : anterior;
    });

    elementoPrioritario.forzarFocus(true);
  }

  /**
   * Obtiene estadísticas de uso
   * @returns object Estadísticas
   */
  public static obtenerEstadisticas(): object {
    const elementos = AutoFocusDirective.obtenerElementosRegistrados();
    
    const estadisticas = {
      totalElementos: elementos.length,
      elementosConFocus: elementos.filter(d => d.tieneFocus()).length,
      elementosFocusAplicado: elementos.filter(d => d.fueAplicado()).length,
      grupos: [...new Set(elementos.map(d => d.autoFocusGrupo).filter(Boolean))],
      dispositivosMoviles: elementos.filter(d => d.esDispositivoMovil).length,
      promedioIntentos: elementos.length > 0 
        ? elementos.reduce((sum, d) => sum + d.intentosRealizados, 0) / elementos.length 
        : 0
    };

    return estadisticas;
  }
}