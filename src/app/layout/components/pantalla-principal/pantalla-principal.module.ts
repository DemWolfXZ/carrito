/**
 * Módulo de la pantalla principal de la aplicación Carrito
 * Configurado correctamente para el routing y los imports
 * Compatible con la estructura de carpetas actual
 * 
 * @author DemWolf
 * @version 1.0 - CORREGIDO
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Importar módulos de Ionic
import { IonicModule } from '@ionic/angular';

// Importar componente principal
import { PantallaPrincipalComponent } from './pantalla-principal.component';

// Configuración de rutas del módulo
const routes = [
  {
    path: '',
    component: PantallaPrincipalComponent,
    data: {
      title: 'Pantalla Principal',
      description: 'Control de gastos con tabs principales'
    }
  }
];

@NgModule({
  declarations: [
    // Componente principal
    PantallaPrincipalComponent
  ],
  imports: [
    // Módulos básicos de Angular
    CommonModule,
    FormsModule,
    
    // Módulo de Ionic para componentes UI
    IonicModule,
    
    // Configuración de rutas para lazy loading
    RouterModule.forChild(routes)
  ],
  providers: [
    // Los servicios están registrados en CoreModule
    // No necesitamos providers específicos aquí
  ],
  exports: [
    // Exportar componente principal si se necesita en otros módulos
    PantallaPrincipalComponent
  ]
})
export class PantallaPrincipalModule { }