import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Browser } from '@capacitor/browser';

export interface OpcionDonacion {
  monto: number;
  label: string;
  emoji: string;
  url: string;
  equivalenteUsd: string;
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
  private opcionesDonacion: OpcionDonacion[] = [
    { monto: 500, label: 'Donación $500', emoji: '💙', url: 'https://mpago.la/22f79fF', equivalenteUsd: 'aprox. US$0,50' },
    { monto: 1000, label: 'Donación $1.000', emoji: '💙', url: 'https://mpago.la/1PLbJoW', equivalenteUsd: 'aprox. US$1' },
    { monto: 1500, label: 'Donación $1.500', emoji: '💙', url: 'https://mpago.la/1Pa5nhg', equivalenteUsd: 'aprox. US$1,50' },
    { monto: 2000, label: 'Donación $2.000', emoji: '💙', url: 'https://mpago.la/2p5AzTZ', equivalenteUsd: 'aprox. US$2' },
  ];

  private showDonacionesModal$ = new BehaviorSubject<boolean>(false);
  private resultadoPago$ = new BehaviorSubject<ResultadoPago | null>(null);
  private loadingPago$ = new BehaviorSubject<boolean>(false);
  private montoSeleccionado$ = new BehaviorSubject<number | null>(null);

  constructor() {}

  getOpcionesDonacion(): OpcionDonacion[] {
    return this.opcionesDonacion;
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

  async abrirDonacion(opcion: OpcionDonacion): Promise<void> {
    console.log('💙 Abriendo Mercado Pago para:', opcion.label);
    this.montoSeleccionado$.next(opcion.monto);
    await Browser.open({ url: opcion.url });
  }
}



