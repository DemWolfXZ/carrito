import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { DonacionesService, OpcionDonacion, ResultadoPago } from '../../../core/services/donaciones.service';
import { UsuarioService } from '../../../core/services/usuario.service';
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
  monedaLocal = 'CLP';
  simboloMonedaLocal = '$';

  private subscriptions: Subscription[] = [];

  constructor(
    private modalController: ModalController,
    private donacionesService: DonacionesService,
    private usuarioService: UsuarioService,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    console.log('✅ DonacionesModalComponent - ngOnInit');
    this.opcionesDonacion = this.donacionesService.getOpcionesDonacion();
    void this.cargarMonedaLocal();
    console.log('💰 Opciones de donación cargadas:', this.opcionesDonacion);

    // Suscribirse a cambios de estado
    this.subscriptions.push(
      this.donacionesService.getLoadingPago().subscribe(loading => {
        this.procesando = loading;
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

  private async cargarMonedaLocal(): Promise<void> {
    const usuario = await this.usuarioService.obtenerUsuarioActual();
    if (usuario) {
      this.monedaLocal = usuario.moneda || 'CLP';
      const informacion = this.donacionesService.obtenerInformacionMoneda(this.monedaLocal);
      this.simboloMonedaLocal = informacion.simbolo;
    }
  }

  obtenerConversion(opcion: OpcionDonacion): string {
    const usd = opcion.monto / 950;
    const local = this.donacionesService.convertirDesdeClp(opcion.monto, this.monedaLocal);
    const valorLocal = new Intl.NumberFormat('es-CL', {
      maximumFractionDigits: this.monedaLocal === 'CLP' ? 0 : 2
    }).format(local);

    if (this.monedaLocal === 'CLP') {
      return `Aprox. US$${usd.toFixed(2)}`;
    }
    return `Aprox. US$${usd.toFixed(2)} · ${this.simboloMonedaLocal}${valorLocal}`;
  }

  /**
   * Usuario selecciona un monto de donación
   */
  async seleccionarMonto(opcion: OpcionDonacion): Promise<void> {
    this.procesando = true;
    const abierto = await this.donacionesService.abrirEnlaceDonacion(opcion);
    this.procesando = false;
    if (abierto) {
      await this.mostrarToast('Mercado Pago se abrió para completar la donación.', 'success');
    }
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
