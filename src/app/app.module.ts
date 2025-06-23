/**
 * Módulo principal de la aplicación Carrito
 * Configura los módulos core, importaciones básicas y providers globales
 * Punto de entrada para toda la aplicación
 * 
 * @author DemWolf
 * @version 1.0
 */

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

// Importar módulos de Ionic
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

// Importar módulos de routing y componente principal
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// TODO: Importar módulo core cuando lo creemos
// import { CoreModule } from '@core/core.module';

@NgModule({
  declarations: [
    // Componente raíz de la aplicación
    AppComponent
  ],
  imports: [
    // Módulos básicos de Angular
    BrowserModule,
    
    // Módulo principal de Ionic con configuración por defecto
    IonicModule.forRoot({
      // Configuración global de Ionic
      rippleEffect: true,
      mode: 'ios', // Usar modo iOS para consistencia en todas las plataformas
      animated: true
    }),
    
    // Módulo de rutas principal
    AppRoutingModule,
    
    // TODO: Módulo core con servicios singleton
    // CoreModule.forRoot()
  ],
  providers: [
    // Configurar estrategia de reutilización de rutas de Ionic
    { 
      provide: RouteReuseStrategy, 
      useClass: IonicRouteStrategy 
    }
    
    // TODO: Agregar providers adicionales cuando sea necesario
    // Interceptores HTTP, guards globales, etc.
  ],
  bootstrap: [
    // Componente que arranca la aplicación
    AppComponent
  ]
})
export class AppModule { }