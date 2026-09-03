/**
 * Módulo de rutas para el layout principal - versión simplificada
 * Solo define la ruta básica sin lazy loading de tabs por ahora
 * Para probar paso a paso antes de crear todos los componentes
 *
 * @author DemWolf
 * @version 1.0
 */

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Rutas simples por ahora - solo pantalla principal
const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./components/pantalla-principal/pantalla-principal.module').then(m => m.PantallaPrincipalModule),
    data: {
      title: 'CarritoControl - Tus compras bajo control',
      description: 'Pantalla principal con navegación por tabs'
    }
  },
  {
    // Ruta de fallback
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    // Configurar rutas básicas
    RouterModule.forChild(routes)
  ],
  exports: [
    // Exportar RouterModule
    RouterModule
  ]
})
export class LayoutRoutingModule { }
