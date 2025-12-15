import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { trigger, state, style, transition, animate } from '@angular/animations';

// Importar servicios y modelos
import { ComprasService } from '../../core/services/compras.service';
import { SesionCompra } from '../../core/models/sesion-compra.model';

@Component({
  selector: 'app-tab-historial',
  templateUrl: './tab-historial.component.html',
  styleUrls: ['./tab-historial.component.scss'],
  animations: [
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('300ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class TabHistorialComponent implements OnInit {

  sesionesCompletadas: SesionCompra[] = [];
  sesionesBorrador: SesionCompra[] = [];
  cargando: boolean = false;

  // Control de acordeón - ID de sesión expandida
  sesionExpandida: string | null = null;

  constructor(
    private router: Router,
    private comprasService: ComprasService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('📊 Tab Historial inicializado');
    await this.cargarHistorial();
  }

  /**
   * Cargar historial de sesiones completadas y borradores
   */
  private async cargarHistorial(): Promise<void> {
    try {
      this.cargando = true;

      // Obtener todas las sesiones completadas
      this.sesionesCompletadas = await this.comprasService.obtenerSesionesCompletadas();

      // Obtener todas las sesiones en estado borrador
      this.sesionesBorrador = await this.comprasService.obtenerSesionesBorrador();

      console.log(`📋 Sesiones completadas cargadas: ${this.sesionesCompletadas.length}`);
      console.log(`📝 Borradores cargados: ${this.sesionesBorrador.length}`);

    } catch (error) {
      console.error('Error al cargar historial:', error);
      await this.mostrarToast('Error al cargar historial', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Alternar expansión de acordeón
   */
  toggleAcordeon(sesionId: string): void {
    if (this.sesionExpandida === sesionId) {
      this.sesionExpandida = null; // Colapsar si ya está expandido
    } else {
      this.sesionExpandida = sesionId; // Expandir
    }
  }

  /**
   * Verificar si una sesión está expandida
   */
  estaExpandida(sesionId: string): boolean {
    return this.sesionExpandida === sesionId;
  }

  /**
   * Calcular días desde la compra
   */
  diasDesdeCompra(fecha: Date): number {
    const ahora = new Date();
    const fechaCompra = new Date(fecha);
    const diferencia = ahora.getTime() - fechaCompra.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: Date): string {
    const fechaObj = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };
    return fechaObj.toLocaleDateString('es-CL', opciones);
  }

  /**
   * Obtener producto con mayor cantidad de una sesión
   */
  obtenerProductoConMayorCantidad(sesion: SesionCompra): any {
    if (!sesion.productos || sesion.productos.length === 0) {
      return null;
    }
    return sesion.productos.reduce((max, producto) =>
      producto.cantidad > max.cantidad ? producto : max
    );
  }

  /**
   * Mostrar toast
   */
  private async mostrarToast(message: string, color: string = 'medium'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * TrackBy function para optimizar renderizado
   */
  trackBySesion(index: number, sesion: SesionCompra): string {
    return sesion.id;
  }

  /**
   * TrackBy function para productos
   */
  trackByProducto(index: number, producto: any): string {
    return producto.id;
  }

  /**
   * Editar/Completar un borrador
   * Permite al usuario cargar el borrador para editarlo y completar precios/cantidades
   */
  async editarBorrador(sesionId: string): Promise<void> {
    try {
      // Obtener la sesión borrador
      const borrador = this.sesionesBorrador.find(s => s.id === sesionId);
      if (!borrador) {
        await this.mostrarToast('No se encontró la lista', 'danger');
        return;
      }

      // Confirmar acción
      const alert = await this.alertController.create({
        header: '📋 Completar tu Lista',
        message: `Abre la lista de "${borrador.nombreSupermercado}" para:\n\n✅ Revisar los ${borrador.productos.length} productos\n✅ Agregar precios\n✅ Ajustar cantidades`,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Abrir Lista',
            handler: async () => {
              // Activar el borrador (cambiar estado de BORRADOR a ACTIVA)
              const activado = await this.comprasService.activarBorrador(sesionId);

              if (activado) {
                await this.mostrarToast('Lista abierta. Completa los detalles', 'success');
                // Redirigir a nueva compra donde se pueden editar los productos
                this.router.navigate(['/pantalla-principal/nueva-compra']);
              } else {
                await this.mostrarToast('Error al abrir la lista', 'danger');
              }
            }
          }
        ]
      });

      await alert.present();

    } catch (error) {
      console.error('Error al editar borrador:', error);
      await this.mostrarToast('Error al abrir la lista', 'danger');
    }
  }

  /**
   * Eliminar una lista en progreso
   */
  async eliminarBorrador(sesionId: string): Promise<void> {
    try {
      const borrador = this.sesionesBorrador.find(s => s.id === sesionId);
      if (!borrador) {
        await this.mostrarToast('No se encontró la lista', 'danger');
        return;
      }

      const alert = await this.alertController.create({
        header: '¿Eliminar Lista?',
        message: `¿Deseas eliminar la lista de "${borrador.nombreSupermercado}"?\n\nEsta acción no se puede deshacer.`,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Eliminar',
            role: 'destructive',
            handler: async () => {
              const eliminado = await this.comprasService.eliminarSesion(sesionId);

              if (eliminado) {
                // Recargar borradores
                this.sesionesBorrador = await this.comprasService.obtenerSesionesBorrador();
                await this.mostrarToast('Lista eliminada', 'success');
              } else {
                await this.mostrarToast('Error al eliminar la lista', 'danger');
              }
            }
          }
        ]
      });

      await alert.present();

    } catch (error) {
      console.error('Error al eliminar la lista:', error);
      await this.mostrarToast('Error al eliminar la lista', 'danger');
    }
  }

}
