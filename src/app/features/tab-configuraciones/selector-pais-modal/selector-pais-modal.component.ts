import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Pais } from '../../../core/models/pais.model';

@Component({
  selector: 'app-selector-pais-modal',
  templateUrl: './selector-pais-modal.component.html',
  styleUrls: ['./selector-pais-modal.component.scss']
})
export class SelectorPaisModalComponent implements OnInit {
  @Input() paisesDisponibles: Pais[] = [];
  @Input() paisActual: Pais | null = null;

  paisSeleccionado: Pais | null = null;

  constructor(private modalController: ModalController) {}

  ngOnInit(): void {
    this.paisSeleccionado = this.paisActual;
  }

  seleccionarPais(pais: Pais): void {
    this.paisSeleccionado = pais;
  }

  async confirmar(): Promise<void> {
    if (this.paisSeleccionado) {
      await this.modalController.dismiss(this.paisSeleccionado);
    }
  }

  async cerrar(): Promise<void> {
    await this.modalController.dismiss(null);
  }
}
