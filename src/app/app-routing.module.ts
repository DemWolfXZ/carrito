/**
 * Módulo de rutas principal de la aplicación Carrito
 * Configura la navegación entre bienvenida y pantalla principal
 * Solo incluye rutas que actualmente existen
 * 
 * @author DemWolf
 * @version 1.0
 */

import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    // Ruta raíz - redirigir a bienvenida por defecto
    path: '',
    redirectTo: '/bienvenida',
    pathMatch: 'full'
  },
  {
    // Ruta de bienvenida - configuración inicial única
    path: 'bienvenida',
    loadChildren: () => import('./features/bienvenida/bienvenida.module').then(m => m.BienvenidaModule),
    data: {
      title: 'Bienvenida a Carrito',
      preload: true
    }
  },
  {
    // Ruta de pantalla principal - después de configuración
    path: 'pantalla-principal',
    loadChildren: () => import('./layout/layout.module').then(m => m.LayoutModule),
    data: {
      title: 'Carrito - Control de Gastos'
    }
  },
  {
    // Mantener ruta original de tabs por compatibilidad
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
    data: {
      title: 'Tabs Originales'
    }
  },
  {
    // Ruta de fallback - cualquier ruta no encontrada
    path: '**',
    redirectTo: '/bienvenida',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { 
      // Estrategia de precarga para mejor performance
      preloadingStrategy: PreloadAllModules,
      
      // Habilitar tracing para debugging (solo en desarrollo)
      enableTracing: false
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }