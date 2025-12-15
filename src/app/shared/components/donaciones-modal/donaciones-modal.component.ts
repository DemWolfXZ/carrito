import { Component, OnInit, Input } from '@angular/core';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { DonacionesService, OpcionDonacion } from '../../../core/services/donaciones.service';

@Component({
  selector: 'app-donaciones-modal',
  templateUrl: './donaciones-modal.component.html',
  styleUrls: ['./donaciones-modal.component.scss']
})
export class DonacionesModalComponent implements OnInit {
  @Input() titulo: string = 'Apoyo a la App';
  @Input() mensaje: string = 'Si quieres apoyar el desarrollo, puedes hacer una donación voluntaria.';

  opcionesDonacion: OpcionDonacion[] = [];
  procesando: boolean = false;

  constructor(
    private modalController: ModalController,
    private donacionesService: DonacionesService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit(): void {
    this.opcionesDonacion = this.donacionesService.getOpcionesDonacion();
  }

  async procesarDonacion(opcion: OpcionDonacion): Promise<void> {
    this.procesando = true;

    const loading = await this.loadingController.create({
      message: `Procesando donación de $${opcion.monto}...`
    });
    await loading.present();

    try {
      await this.donacionesService.procesarDonacion(opcion.monto);

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: `¡Gracias por tu donación de $${opcion.monto}! 🙏`,
        duration: 3000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        this.cerrarModal();
      }, 2000);

    } catch (error) {
      await loading.dismiss();

      const toast = await this.toastController.create({
        message: 'Error al procesar la donación. Intenta de nuevo.',
        duration: 3000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();

      this.procesando = false;
    }
  }

  cerrarModal(): void {
    this.modalController.dismiss();
  }
}
