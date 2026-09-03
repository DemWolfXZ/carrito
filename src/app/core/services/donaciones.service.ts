import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Browser } from '@capacitor/browser';

export interface OpcionDonacion {
  monto: number;
  label: string;
  emoji: string;
  url: string;
}

export interface ResultadoPago {
  exito: boolean;
  transaccionId?: string;
  error?: string;
  detalles?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DonacionesService {
  private readonly tasasAproximadasPorClp: Record<string, number> = {
    ARS: 1.05, BOB: 0.0073, CLP: 1, COP: 4.2, CRC: 0.52,
    CUP: 0.026, DOP: 0.063, EUR: 0.00095, GTQ: 0.0081,
    HNL: 0.026, MXN: 0.019, NIO: 0.039, PAB: 0.00105,
    PEN: 0.0039, PYG: 7.6, USD: 0.00105, UYU: 0.041, VES: 0.039
  };

  private readonly simbolosMoneda: Record<string, string> = {
    ARS: '$', BOB: 'Bs', CLP: '$', COP: '$', CRC: '₡', CUP: '$',
    DOP: 'RD$', EUR: '€', GTQ: 'Q', HNL: 'L', MXN: '$', NIO: 'C$',
    PAB: 'B/.', PEN: 'S/', PYG: '₲', USD: 'US$', UYU: '$U', VES: 'Bs.'
  };

  private opcionesDonacion: OpcionDonacion[] = [
    { monto: 500, label: '$500 CLP', emoji: '💙', url: 'https://mpago.la/22f79fF' },
    { monto: 1000, label: '$1.000 CLP', emoji: '💙', url: 'https://mpago.la/1PLbJoW' },
    { monto: 1500, label: '$1.500 CLP', emoji: '💙', url: 'https://mpago.la/1Pa5nhg' },
    { monto: 2000, label: '$2.000 CLP', emoji: '💙', url: 'https://mpago.la/2p5AzTZ' },
  ];

  private showDonacionesModal$ = new BehaviorSubject<boolean>(false);
  private resultadoPago$ = new BehaviorSubject<ResultadoPago | null>(null);
  private loadingPago$ = new BehaviorSubject<boolean>(false);
  private montoSeleccionado$ = new BehaviorSubject<number | null>(null);

  constructor() {}

  getOpcionesDonacion(): OpcionDonacion[] {
    return this.opcionesDonacion;
  }

  convertirDesdeClp(monto: number, moneda: string): number {
    return monto * (this.tasasAproximadasPorClp[moneda] || this.tasasAproximadasPorClp['USD']);
  }

  obtenerInformacionMoneda(moneda: string): { simbolo: string } {
    return { simbolo: this.simbolosMoneda[moneda] || moneda };
  }

  getShowDonacionesModal(): Observable<boolean> {
    return this.showDonacionesModal$.asObservable();
  }

  getResultadoPago(): Observable<ResultadoPago | null> {
    return this.resultadoPago$.asObservable();
  }

  getLoadingPago(): Observable<boolean> {
    return this.loadingPago$.asObservable();
  }

  getMontoSeleccionado(): Observable<number | null> {
    return this.montoSeleccionado$.asObservable();
  }

  abrirModalDonaciones(): void {
    console.log('🎁 Abriendo modal de donaciones...');
    this.showDonacionesModal$.next(true);
    this.resultadoPago$.next(null);
    this.loadingPago$.next(false);
    this.montoSeleccionado$.next(null);
  }

  cerrarModalDonaciones(): void {
    console.log('✖ Cerrando modal de donaciones');
    this.showDonacionesModal$.next(false);
    this.montoSeleccionado$.next(null);
  }

  async abrirEnlaceDonacion(opcion: OpcionDonacion): Promise<boolean> {
    try {
      const url = new URL(opcion.url);
      if (url.protocol !== 'https:' || url.hostname !== 'mpago.la') {
        throw new Error('Enlace de donación no permitido');
      }

      await Browser.open({ url: url.toString() });
      return true;
    } catch (error) {
      console.error('❌ No se pudo abrir Mercado Pago:', error);
      this.resultadoPago$.next({ exito: false, error: 'No se pudo abrir Mercado Pago' });
      return false;
    }
  }

}



