/**
 * Componente raíz de la aplicación CarritoControl
 * Maneja la inicialización global y configuraciones básicas de la app
 * Punto de entrada principal para toda la aplicación
 *
 * @author DemWolf
 * @version 1.0
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ConfiguracionService } from './core/services/configuracion.service';
import { TemaService } from './core/services/tema.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SplashScreen } from '@capacitor/splash-screen';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();



  constructor(
    private platform: Platform,
    private configuracionService: ConfiguracionService,
    private temaService: TemaService
  ) {
    // Inicializar configuraciones básicas de la plataforma
    this.inicializarApp();
    // Mostrar splash screen personalizado
    this.showSplash();

  }
  async showSplash(){
  await SplashScreen.show({
  autoHide: true,
  showDuration: 3000,
});

}


  /**
   * Inicialización del componente después de la construcción
   */
  async ngOnInit(): Promise<void> {
    console.log('🛒 AppComponent inicializado');

    // Configurar Status Bar para no sobreescribir la vista
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
    }

    // Escuchar cambios de tema y aplicarlos al DOM
    this.temaService.temaActualObservable$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tema: string) => {
        console.log('🎨 AppComponent: Tema cambió a', tema);
        // Aplicar tema al elemento ion-app para que los estilos se propaguen
        const appElement = document.querySelector('ion-app');
        if (appElement) {
          appElement.setAttribute('data-theme', tema);
        }
      });
  }

  /**
   * Limpiar recursos al destruir el componente
   */
  ngOnDestroy(): void {
    this.temaService.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializar configuraciones básicas de la aplicación
   */
  private async inicializarApp(): Promise<void> {
    try {
      // Esperar a que la plataforma esté lista
      await this.platform.ready();

      console.log('🛒 Aplicación CarritoControl iniciada correctamente');

    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
    }



  }
}
