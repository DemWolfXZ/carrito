import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface OpcionDonacion {
  monto: number;
  label: string;
  emoji: string;
}

@Injectable({
  providedIn: 'root'
})
export class DonacionesService {

  private opcionesDonacion: OpcionDonacion[] = [
    { monto: 1, label: '1 USD - Café ☕', emoji: '☕' },
    { monto: 5, label: '5 USD - Almuerzo 🍽️', emoji: '🍽️' },
    { monto: 10, label: '10 USD - Cena 🍷', emoji: '🍷' },
    { monto: 20, label: '20 USD - Mensual 💪', emoji: '💪' },
  ];

  private showDonacionesModal$ = new BehaviorSubject<boolean>(false);

  constructor() { }

  getOpcionesDonacion(): OpcionDonacion[] {
    return this.opcionesDonacion;
  }

  getShowDonacionesModal(): Observable<boolean> {
    return this.showDonacionesModal$.asObservable();
  }

  abrirModalDonaciones(): void {
    this.showDonacionesModal$.next(true);
  }

  cerrarModalDonaciones(): void {
    this.showDonacionesModal$.next(false);
  }

  procesarDonacion(monto: number): Promise<void> {
    return new Promise((resolve) => {
      // TODO: Integrar con Stripe, PayPal, etc.
      console.log(`Donación de $${monto} iniciada`);

      // Por ahora, simulamos un delay
      setTimeout(() => {
        resolve();
      }, 1500);
    });
  }
}
