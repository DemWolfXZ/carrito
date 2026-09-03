import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AlmacenamientoService } from './almacenamiento.service';
import { TemaVisual } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly TEMA_CLARO = 'claro';
  private readonly TEMA_OSCURO = 'oscuro';
  private readonly TEMA_AUTOMATICO = 'automatico';
  private readonly TEMA_ALTO_CONTRASTE = 'high-contrast';
  private readonly TEMA_DALTONICO = 'daltonism-safe';

  private readonly TEMAS_DISPONIBLES = ['claro', 'oscuro', 'azul', 'azul-elegante', 'azul-oscuro', 'morado', 'morado-oscuro', 'rosado', 'rosado-oscuro', 'verde', 'verde-oscuro', 'high-contrast', 'daltonism-safe'];

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

      window.dispatchEvent(new CustomEvent('tema-cambio', {
        detail: { tema, modo: this.modoTemaSubject.value }
      }));
    } catch (error) {
      console.error('❌ TemaService: Error al aplicar tema:', error);
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
