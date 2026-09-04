import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { DonacionesService, OpcionDonacion, ResultadoPago } from '../../../core/services/donaciones.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-donaciones-modal',
  templateUrl: './donaciones-modal.component.html',
  styleUrls: ['./donaciones-modal.component.scss']
})
export class DonacionesModalComponent implements OnInit, OnDestroy {
  opcionesDonacion: OpcionDonacion[] = [];
  procesando: boolean = false;
  montoSeleccionado: number | null = null;
  resultadoPago: ResultadoPago | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private modalController: ModalController,
    private donacionesService: DonacionesService,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    console.log('✅ DonacionesModalComponent - ngOnInit');
    this.opcionesDonacion = this.donacionesService.getOpcionesDonacion();
    console.log('💰 Opciones de donación cargadas:', this.opcionesDonacion);

    // Suscribirse a cambios de estado
    this.subscriptions.push(
      this.donacionesService.getLoadingPago().subscribe(loading => {
        this.procesando = loading;
      })
    );

    this.subscriptions.push(
      this.donacionesService.getMontoSeleccionado().subscribe(monto => {
        this.montoSeleccionado = monto;
      })
    );

    this.subscriptions.push(
      this.donacionesService.getResultadoPago().subscribe(resultado => {
        this.resultadoPago = resultado;
        if (resultado && resultado.exito) {
          console.log('✅ Donación exitosa:', resultado.transaccionId);
          this.mostrarToast('¡Gracias por tu donación! 🎉', 'success');
        } else if (resultado && !resultado.exito) {
          console.warn('⚠️ Error en donación:', resultado.error);
          this.mostrarToast(resultado.error || 'Error procesando donación', 'danger');
        }
      })
    );
  }

  /**
   * Usuario selecciona un monto de donación
   */
  async seleccionarMonto(opcion: OpcionDonacion): Promise<void> {
    await this.donacionesService.abrirDonacion(opcion);
  }

  /**
   * Volver a la pantalla de opciones
   */
  volverAOpciones(): void {
    console.log('◄ Volviendo a opciones de donación');
    this.resultadoPago = null;
    this.montoSeleccionado = null;
  }

  /**
   * Cerrar modal
   */
  async cerrarModal(): Promise<void> {
    console.log('✖ Cerrando modal de donaciones');
    await this.modalController.dismiss();
  }

  /**
   * Mostrar toast con mensaje
   */
  private async mostrarToast(mensaje: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: [
        {
          text: '✕',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  /**
   * Limpiar suscripciones
   */
  ngOnDestroy(): void {
    console.log('🧹 Limpiando suscripciones de DonacionesModalComponent');
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
