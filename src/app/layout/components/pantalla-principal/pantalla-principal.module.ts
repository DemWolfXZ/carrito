/**
 * Módulo de la pantalla principal de la aplicación Carrito
 * Versión simplificada para probar paso a paso
 * Sin lazy loading de tabs por ahora
 * 
 * @author DemWolf
 * @version 1.0
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Importar módulos de Ionic
import { IonicModule } from '@ionic/angular';

// Importar componente principal
import { PantallaPrincipalComponent } from './pantalla-principal.component';

// Rutas simples por ahora - solo el componente principal
const routes = [
  {
    path: '',
    component: PantallaPrincipalComponent
  }
];

@NgModule({
  declarations: [
    // Solo el componente principal por ahora
    PantallaPrincipalComponent
  ],
  imports: [
    // Módulos básicos de Angular
    CommonModule,
    FormsModule,
    
    // Módulo de Ionic para componentes UI
    IonicModule,
    
    // Configuración de rutas básica
    RouterModule.forChild(routes)
  ],
  providers: [
    // Sin providers específicos por ahora
  ],
  exports: [
    // Exportar componente principal
    PantallaPrincipalComponent
  ]
})
export class PantallaPrincipalModule { }