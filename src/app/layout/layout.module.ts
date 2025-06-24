/**
 * Módulo principal del layout de la aplicación Carrito
 * Contiene la pantalla principal con tabs y toda la estructura de navegación
 * Punto de entrada después de completar la configuración inicial
 * 
 * @author DemWolf
 * @version 1.0
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Importar módulos de Ionic
import { IonicModule } from '@ionic/angular';

// Importar módulo de rutas
import { LayoutRoutingModule } from './layout-routing.module';

// TODO: Importar shared module cuando se cree
// import { SharedModule } from '@shared/shared.module';

@NgModule({
  declarations: [
    // Los componentes se declaran en sus módulos específicos
    // PantallaPrincipalComponent se declara en su propio módulo
  ],
  imports: [
    // Módulos básicos de Angular
    CommonModule,
    FormsModule,
    
    // Módulo de Ionic
    IonicModule,
    
    // Módulo de rutas del layout
    LayoutRoutingModule
    
    // TODO: Importar shared module cuando esté disponible
    // SharedModule
  ],
  providers: [
    // Providers específicos del layout si se necesitan
    // Los servicios principales están en core
  ],
  exports: [
    // Exportar módulos necesarios para otros módulos
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class LayoutModule { }