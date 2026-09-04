import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AlmacenamientoService } from './almacenamiento.service';
import { TemaVisual } from '../models/usuario.model';
// Capacitor: para detectar si estamos en app nativa (Android/iOS) o en navegador
import { Capacitor } from '@capacitor/core';
// Plugin oficial para controlar el color de los íconos del notch/status bar
import { StatusBar, Style } from '@capacitor/status-bar';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly TEMA_CLARO = 'claro';
  private readonly TEMA_OSCURO = 'oscuro';
  private readonly TEMA_AUTOMATICO = 'automatico';
  private readonly TEMA_ALTO_CONTRASTE = 'high-contrast';
  private readonly TEMA_DALTONICO = 'daltonism-safe';

  private readonly TEMAS_DISPONIBLES = ['claro', 'oscuro', 'azul', 'azul-elegante', 'azul-oscuro', 'morado', 'morado-oscuro', 'rosado', 'rosado-oscuro', 'verde', 'verde-oscuro', 'high-contrast', 'daltonism-safe'];

  /**
   * ============================================================
   * TEMAS CON FONDO DE TOOLBAR OSCURO (necesitan íconos CLAROS)
   * ============================================================
   * Lista construida a partir de los valores reales de
   * --app-toolbar-background / --ion-toolbar-background definidos
   * en paletas.scss y variables.scss. Cualquier tema que NO esté
   * en esta lista se asume con fondo claro (íconos oscuros).
   *
   * IMPORTANTE: si agregas un tema nuevo, revisa el color de su
   * toolbar y actualiza esta lista si el fondo es oscuro.
   */
  private readonly TEMAS_ICONOS_CLAROS = [
    'oscuro',          // #1a1a1a
    'azul-elegante',   // #1f2633
    'azul-oscuro',     // #162738
    'morado-oscuro',   // #271d38
    'rosado-oscuro',   // #36202e
    'verde-oscuro',    // #162c27
    'high-contrast',   // #000000
    'daltonism-safe'   // #0072B2
  ];

  private temaActualSubject = new BehaviorSubject<string>(this.TEMA_CLARO);
  private modoTemaSubject = new BehaviorSubject<string>(this.TEMA_AUTOMATICO);
  private temaEfectivoSubject = new BehaviorSubject<string>(this.TEMA_CLARO);

  private mediaQuery: MediaQueryList | null = null;
  private listener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor(private almacenamientoService: AlmacenamientoService) {
    this.inicializarTema();
  }

  private async inicializarTema(): Promise<void> {
    try {
      const usuario = await this.almacenamientoService.obtenerUsuario();
      if (usuario?.configuraciones?.temaVisual) {
        const temaGuardado = usuario.configuraciones.temaVisual;
        console.log('🎨 TemaService: Tema guardado del usuario:', temaGuardado);
        this.modoTemaSubject.next(temaGuardado);
        if (temaGuardado === this.TEMA_AUTOMATICO) {
          this.aplicarTemaAutomatico();
        } else {
          this.aplicarTema(temaGuardado);
        }
      } else {
        console.log('🎨 TemaService: Usando tema automático (por defecto)');
        this.modoTemaSubject.next(this.TEMA_AUTOMATICO);
        this.aplicarTemaAutomatico();
      }
      this.configurarListenerSistema();
    } catch (error) {
      console.error('❌ TemaService: Error al inicializar tema:', error);
      this.aplicarTemaAutomatico();
    }
  }

  private configurarListenerSistema(): void {
    try {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.listener = (e: MediaQueryListEvent) => {
        const temaActual = this.modoTemaSubject.value;

        console.log('📱 TemaService: Sistema operativo cambió preferencia dark mode:', e.matches);
        console.log('📱 TemaService: Modo tema actual:', temaActual);
        console.log('📱 TemaService: Tema visual actual:', this.temaActualSubject.value);

        // REGLA 1: Si el tema actual es de accesibilidad, RECHAZAR COMPLETAMENTE el cambio
        if (['high-contrast', 'daltonism-safe'].includes(this.temaActualSubject.value)) {
          console.log(`🔒 TemaService: BLOQUEADO - Tema de accesibilidad activo: "${this.temaActualSubject.value}"`);
          console.log('🔒 TemaService: El sistema operativo NO puede cambiar temas de accesibilidad');
          return;
        }

        // REGLA 2: Si modo es AUTOMÁTICO y tema es normal, permitir cambio
        if (temaActual === this.TEMA_AUTOMATICO) {
          const tema = e.matches ? this.TEMA_OSCURO : this.TEMA_CLARO;
          console.log('🎨 TemaService: Modo automático - aplicando tema del sistema:', tema);
          this.aplicarTema(tema);
        } else {
          // REGLA 3: Si el usuario seleccionó un tema manualmente, RECHAZAR cambios del SO
          console.log('🔒 TemaService: BLOQUEADO - Usuario seleccionó tema manual, SO no puede interferir');
          console.log('🔒 TemaService: Tema seleccionado: "' + this.temaActualSubject.value + '"');
        }
      };

      if (this.mediaQuery) {
        this.mediaQuery.addEventListener('change', this.listener);
        console.log('✅ TemaService: Listener del SO configurado con protecciones');
        console.log('   - Temas accesibilidad: BLOQUEADOS COMPLETAMENTE');
        console.log('   - Temas manuales: BLOQUEADOS COMPLETAMENTE');
        console.log('   - Modo automático: PERMITIDO');
      }
    } catch (error) {
      console.error('❌ TemaService: Error al configurar listener:', error);
    }
  }

  private aplicarTemaAutomatico(): void {
    const tema = window.matchMedia('(prefers-color-scheme: dark)').matches ? this.TEMA_OSCURO : this.TEMA_CLARO;
    console.log('🎨 TemaService: Aplicando tema automático:', tema);
    this.aplicarTema(tema);
  }

  private aplicarTema(tema: string): void {
    try {
      if (!this.TEMAS_DISPONIBLES.includes(tema)) {
        console.warn('⚠️ TemaService: Tema inválido:', tema);
        return;
      }

      // Limpiar todas las clases de tema anteriores
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark');
      this.TEMAS_DISPONIBLES.forEach(t => {
        document.body.classList.remove(`theme-${t}`);
        document.body.classList.remove(t);
      });

      // Aplicar nuevo tema
      document.documentElement.setAttribute('data-theme', tema);
      document.body.classList.add(tema);
      document.body.classList.add(`theme-${tema}`);

      // PROTECCIÓN: Los temas de accesibilidad NUNCA obtienen la clase 'dark'
      // Esto previene que Ionic dark.class.css afecte los colores
      const esTemaNormal = !['high-contrast', 'daltonism-safe'].includes(tema);
      if (tema.includes('oscuro') && esTemaNormal) {
        document.body.classList.add('dark');
      }

      // Asegurar que no exista la clase dark para temas accesibles
      if (['high-contrast', 'daltonism-safe'].includes(tema)) {
        document.body.classList.remove('dark');
        console.log('🔒 TemaService: Tema de accesibilidad protegido - clase dark rechazada:', tema);
      }

      this.temaEfectivoSubject.next(tema);
      console.log('🎨 TemaService: Tema aplicado:', tema);

      // Sincroniza el color de los íconos nativos del notch (reloj/batería/señal)
      // con el fondo del toolbar del tema recién aplicado. Es "fire and forget":
      // no se espera (await) porque aplicarTema() es síncrono y esto es solo
      // un ajuste visual del SO, no debe bloquear el cambio de tema en pantalla.
      this.actualizarIconosStatusBar(tema);

      window.dispatchEvent(new CustomEvent('tema-cambio', {
        detail: { tema, modo: this.modoTemaSubject.value }
      }));
    } catch (error) {
      console.error('❌ TemaService: Error al aplicar tema:', error);
    }
  }

  /**
   * ============================================================
   * SINCRONIZAR ÍCONOS DEL NOTCH CON EL TEMA ACTIVO
   * ============================================================
   * El fondo de la franja del notch lo pinta global.scss
   * (ion-app::before, con --app-toolbar-background). El COLOR de
   * los íconos nativos (hora, batería, señal) lo controla el
   * sistema operativo, no el CSS. Esta función decide si Android/iOS
   * debe mostrar íconos claros u oscuros, según el tema recién
   * aplicado, usando el plugin @capacitor/status-bar.
   *
   * @param tema Identificador del tema recién aplicado (ej: 'oscuro')
   */
  private async actualizarIconosStatusBar(tema: string): Promise<void> {
    // Si no estamos en una app nativa (ej: navegador con "ionic serve"),
    // el plugin no tiene nada que hacer: salimos sin error.
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Si el tema está en la lista de fondos oscuros, pedimos íconos
    // CLAROS (Style.Dark = "texto claro, para fondos oscuros").
    // Si no, pedimos íconos OSCUROS (Style.Light = "texto oscuro,
    // para fondos claros"). Los nombres del enum son así de
    // Capacitor: describen el color del ÍCONO, no el del fondo.
    const necesitaIconosClaros = this.TEMAS_ICONOS_CLAROS.includes(tema);
    const estiloDeseado = necesitaIconosClaros ? Style.Dark : Style.Light;

    // Primer intento: aplicamos el estilo de inmediato
    await this.aplicarEstiloStatusBar(estiloDeseado, tema);

    /*
     * WORKAROUND para un bug de timing conocido en Android/Capacitor:
     * justo al abrir la app en frío, la ventana todavía se está
     * "asentando" (transición del splash screen, insets del sistema
     * terminando de aplicarse). En ese instante, el sistema a veces
     * IGNORA la primera llamada a setStyle(), aunque se haya hecho
     * correctamente. Por eso reforzamos con una segunda llamada 300ms
     * después, cuando la ventana ya está completamente estable.
     * Repetirla es inofensivo: si el primer intento ya funcionó, esta
     * segunda llamada no cambia nada visualmente en pantalla.
     */
    setTimeout(() => {
      this.aplicarEstiloStatusBar(estiloDeseado, tema);
    }, 300);
  }

  /**
   * Ejecuta la llamada real al plugin StatusBar, con manejo de errores
   * aislado para que un fallo aquí nunca rompa el resto de la app.
   *
   * @param estilo Style.Dark (íconos claros) o Style.Light (íconos oscuros)
   * @param tema Identificador del tema, solo para el log
   */
  private async aplicarEstiloStatusBar(estilo: Style, tema: string): Promise<void> {
    try {
      await StatusBar.setStyle({ style: estilo });
      console.log(`🎨 TemaService: Íconos del notch (${estilo}) aplicados para el tema "${tema}"`);
    } catch (error) {
      // No detenemos la app si esto falla (ej: plugin no disponible en
      // esa plataforma específica); solo lo dejamos registrado.
      console.error('❌ TemaService: Error al actualizar íconos del status bar:', error);
    }
  }

  async cambiarTema(tema: string): Promise<boolean> {
    try {
      if (!this.TEMAS_DISPONIBLES.includes(tema)) {
        throw new Error('Tema inválido: ' + tema);
      }
      console.log('🎨 TemaService: Cambiando a tema manual:', tema);
      this.modoTemaSubject.next(tema);
      this.aplicarTema(tema);
      const usuario = await this.almacenamientoService.obtenerUsuario();
      if (usuario) {
        usuario.configuraciones.temaVisual = tema as TemaVisual;
        await this.almacenamientoService.guardarUsuario(usuario);
        console.log('💾 TemaService: Preferencia de tema guardada:', tema);
      }
      return true;
    } catch (error) {
      console.error('❌ TemaService: Error al cambiar tema:', error);
      return false;
    }
  }

  async activarTemaAutomatico(): Promise<boolean> {
    try {
      console.log('🎨 TemaService: Activando tema automático');
      this.modoTemaSubject.next(this.TEMA_AUTOMATICO);
      this.aplicarTemaAutomatico();
      const usuario = await this.almacenamientoService.obtenerUsuario();
      if (usuario) {
        usuario.configuraciones.temaVisual = TemaVisual.AUTOMATICO;
        await this.almacenamientoService.guardarUsuario(usuario);
        console.log('💾 TemaService: Tema automático guardado');
      }
      return true;
    } catch (error) {
      console.error('❌ TemaService: Error al activar tema automático:', error);
      return false;
    }
  }

  obtenerTemaActual(): string {
    return this.temaEfectivoSubject.value;
  }

  obtenerModoTema(): string {
    return this.modoTemaSubject.value;
  }

  obtenerTemasDisponibles(): string[] {
    return [...this.TEMAS_DISPONIBLES];
  }

  obtenerInfoTema(tema: string): { nombre: string; descripcion: string; icono: string; categoria: string } | null {
    const infoTemas: { [key: string]: any } = {
      'claro': { nombre: 'Claro', descripcion: 'Tema limpio y profesional', icono: 'sunny-outline', categoria: 'acromático' },
      'oscuro': { nombre: 'Oscuro', descripcion: 'Cómodo para lectura nocturna', icono: 'moon-outline', categoria: 'acromático' },
      'azul': { nombre: 'Azul', descripcion: 'Profesional y de confianza', icono: 'water', categoria: 'cromático' },
      'azul-oscuro': { nombre: 'Azul Oscuro', descripcion: 'Marina oscura con elegancia', icono: 'water', categoria: 'cromático' },
      'morado': { nombre: 'Morado', descripcion: 'Creativo e innovador', icono: 'diamond', categoria: 'cromático' },
      'morado-oscuro': { nombre: 'Morado Oscuro', descripcion: 'Sofisticado y artístico', icono: 'diamond', categoria: 'cromático' },
      'rosado': { nombre: 'Rosado', descripcion: 'Cálido y acogedor', icono: 'heart-outline', categoria: 'cromático' },
      'rosado-oscuro': { nombre: 'Rosado Oscuro', descripcion: 'Elegancia en tonos oscuros', icono: 'heart-outline', categoria: 'cromático' },
      'verde': { nombre: 'Verde', descripcion: 'Natural y equilibrado', icono: 'leaf', categoria: 'cromático' },
      'verde-oscuro': { nombre: 'Verde Oscuro', descripcion: 'Bosque profundo y tranquilo', icono: 'leaf', categoria: 'cromático' },
      'high-contrast': { nombre: 'Alto Contraste', descripcion: 'Negro #000000 + Amarillo #ffff00. Contraste 19.56:1 (WCAG AAA). Para personas con baja visión o astigmatismo. 100% protegido del dark mode del SO.', icono: 'contrast', categoria: 'accesibilidad' },
      'daltonism-safe': { nombre: 'Daltónico-Seguro', descripcion: 'Paleta Okabe-Ito (2008). Colores: Rojo #D55E00, Naranja #E69F00, Azul #56B4E9, Verde #009E73, Amarillo #F0E442. Científicamente validado para Protanopia, Deuteranopia y Tritanopia. Con patrones visuales (█●▲◆). 100% protegido del dark mode del SO.', icono: 'accessibility', categoria: 'accesibilidad' },
      'automatico': { nombre: 'Automático', descripcion: 'Sigue la preferencia del sistema', icono: 'sunny', categoria: 'sistema' }
    };
    return infoTemas[tema] || null;
  }

  esOscuro(): boolean {
    return this.obtenerTemaActual().includes('oscuro');
  }

  esCromatico(): boolean {
    return ['azul', 'azul-oscuro', 'morado', 'morado-oscuro', 'rosado', 'rosado-oscuro', 'verde', 'verde-oscuro']
      .includes(this.obtenerTemaActual());
  }

  destroy(): void {
    if (this.mediaQuery && this.listener) {
      this.mediaQuery.removeEventListener('change', this.listener);
      console.log('🎨 TemaService: Listener de sistema removido');
    }
  }

  get temaActualObservable$(): Observable<string> {
    return this.temaEfectivoSubject.asObservable();
  }

  get modoTemaObservable$(): Observable<string> {
    return this.modoTemaSubject.asObservable();
  }

  get temaActual$(): Observable<string> {
    return this.temaActualSubject.asObservable();
  }

  get modoTema$(): Observable<string> {
    return this.modoTemaSubject.asObservable();
  }

  get temaEfectivo$(): Observable<string> {
    return this.temaEfectivoSubject.asObservable();
  }
}
