import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { TemaService } from '../../../../core/services/tema.service';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface OptionTema {
  id: string;
  label: string;
  descripcion: string;
  icono: string;
  activo: boolean;
  categoria: 'sistema' | 'acromático' | 'cromático';
}

@Component({
  selector: 'app-configurador-tema',
  templateUrl: './configurador-tema.component.html',
  styleUrls: ['./configurador-tema.component.scss']
})
export class ConfiguradorTemaComponent implements OnInit, OnDestroy {

  // Modo de tema actual
  modoTemaActual: string = 'automatico';

  // Tema efectivo actual
  temaEfectivo: string = 'claro';

  // Opciones disponibles
  opcionesModelo: OptionTema[] = [
    // SISTEMA
    {
      id: 'automatico',
      label: 'Automático',
      descripcion: 'Sigue la preferencia del sistema',
      icono: 'sunny',
      activo: false,
      categoria: 'sistema'
    },
    // ACROMÁTICOS
    {
      id: 'claro',
      label: 'Claro',
      descripcion: 'Profesional y accesible',
      icono: 'sunny-outline',
      activo: false,
      categoria: 'acromático'
    },
    {
      id: 'oscuro',
      label: 'Oscuro',
      descripcion: 'Cómodo para lectura nocturna',
      icono: 'moon-outline',
      activo: false,
      categoria: 'acromático'
    },
    // CROMÁTICOS - PARES CLARO/OSCURO
    {
      id: 'azul',
      label: 'Azul',
      descripcion: 'Profesional y de confianza',
      icono: 'water',
      activo: false,
      categoria: 'cromático'
    },
    {
      id: 'azul-elegante',
      label: 'Azul Elegante',
      descripcion: 'Azul marino sofisticado',
      icono: 'water-outline',
      activo: false,
      categoria: 'cromático'
    },
    {
      id: 'azul-oscuro',
      label: 'Azul Oscuro',
      descripcion: 'Marina elegante',
      icono: 'water',
      activo: false,
      categoria: 'cromático'
    },
    {
      id: 'morado',
      label: 'Morado',
      descripcion: 'Creativo e innovador',
      icono: 'diamond',
      activo: false,
      categoria: 'cromático'
    },
    {
      id: 'morado-oscuro',
      label: 'Morado Oscuro',
      descripcion: 'Sofisticado y artístico',
      icono: 'diamond',
      activo: false,
      categoria: 'cromático'
    },
    {
      id: 'rosado',
      label: 'Rosado',
      descripcion: 'Cálido y acogedor',
      icono: 'heart-outline',
      activo: false,
      categoria: 'cromático'
    },
    {
      id: 'rosado-oscuro',
      label: 'Rosado Oscuro',
      descripcion: 'Elegancia oscura',
      icono: 'heart-outline',
      activo: false,
      categoria: 'cromático'
    },
    {
      id: 'verde',
      label: 'Verde',
      descripcion: 'Natural y equilibrado',
      icono: 'leaf',
      activo: false,
      categoria: 'cromático'
    },
    {
      id: 'verde-oscuro',
      label: 'Verde Oscuro',
      descripcion: 'Bosque profundo',
      icono: 'leaf',
      activo: false,
      categoria: 'cromático'
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private temaService: TemaService,
    private usuarioService: UsuarioService,
    private toastController: ToastController
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('🎨 ConfiguradorTemaComponent inicializado');

    // Cargar tema actual
    this.modoTemaActual = this.temaService.obtenerModoTema();
    this.temaEfectivo = this.temaService.obtenerTemaActual();

    // Actualizar estado de opciones
    this.actualizarOpcionesActivas();

    // Escuchar cambios en el tema
    this.temaService.modoTemaObservable$
      .pipe(takeUntil(this.destroy$))
      .subscribe((modo: string) => {
        this.modoTemaActual = modo;
        this.actualizarOpcionesActivas();
        console.log('🎨 Modo de tema cambió a:', modo);
      });

    this.temaService.temaActualObservable$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tema: string) => {
        this.temaEfectivo = tema;
        console.log('🎨 Tema efectivo cambió a:', tema);
      });
  }

  /**
   * Actualizar estado visual de las opciones
   */
  private actualizarOpcionesActivas(): void {
    this.opcionesModelo.forEach(opcion => {
      opcion.activo = opcion.id === this.modoTemaActual;
    });
  }

  /**
   * Seleccionar una opción de tema
   */
  async seleccionarOpcion(temaId: string): Promise<boolean> {
    try {
      let resultado = false;

      if (temaId === 'automatico') {
        resultado = await this.temaService.activarTemaAutomatico();
      } else {
        resultado = await this.temaService.cambiarTema(temaId);
      }

      if (resultado) {
        console.log('✅ Tema seleccionado:', temaId);
        await this.mostrarToast(`Tema "${this.obtenerNombreTema(temaId)}" activado`, 'success');
      }

      return resultado;

    } catch (error) {
      console.error('❌ Error al seleccionar tema:', error);
      await this.mostrarToast('Error al cambiar tema', 'danger');
      return false;
    }
  }

  /**
   * Obtener nombre del tema
   */
  obtenerNombreTema(temaId: string): string {
    const opcion = this.opcionesModelo.find(o => o.id === temaId);
    return opcion?.label || temaId;
  }

  /**
   * Mostrar toast
   */
  private async mostrarToast(mensaje: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  /**
   * Limpiar recursos
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Obtener descripción del tema efectivo
   */
  obtenerDescripcionTemaEfectivo(): string {
    if (this.modoTemaActual === 'automatico') {
      return `Automático (actualmente ${this.temaEfectivo})`;
    } else {
      return this.obtenerNombreTema(this.modoTemaActual);
    }
  }

  /**
   * Filtrar opciones por categoría
   */
  obtenerPorCategoria(categoria: string): OptionTema[] {
    return this.opcionesModelo.filter(o => o.categoria === categoria);
  }
}
