/**
 * Módulo principal de la aplicación Carrito
 * Configura los módulos básicos, core module y providers globales
 * Punto de entrada para toda la aplicación
 *
 * @author DemWolf
 * @version 1.0
 */

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // ✅ AGREGAR PARA ANIMACIONES
import { RouteReuseStrategy } from '@angular/router';

// Importar módulos de Ionic
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

// Importar módulos de routing y componente principal
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Importar módulo core con servicios
import { CoreModule } from './core/core.module';

@NgModule({
  declarations: [
    // Componente raíz de la aplicación
    AppComponent
  ],
  imports: [
    // Módulos básicos de Angular
    BrowserModule,
    BrowserAnimationsModule, // ✅ REQUERIDO PARA ANIMACIONES

    // Módulo principal de Ionic con configuración por defecto
    IonicModule.forRoot({
      // Configuración global de Ionic
      rippleEffect: true,
      mode: 'ios', // Usar modo iOS para consistencia en todas las plataformas
      animated: true
    }),

    // Módulo core con servicios singleton (SOLO UNA VEZ)
    CoreModule.forRoot(),

    // Módulo de rutas principal
    AppRoutingModule
  ],
  providers: [
    // Configurar estrategia de reutilización de rutas de Ionic
    {
      provide: RouteReuseStrategy,
      useClass: IonicRouteStrategy
    }
  ],
  bootstrap: [
    // Componente que arranca la aplicación
    AppComponent
  ]
})
export class AppModule { }
