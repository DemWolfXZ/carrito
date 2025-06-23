/**
 * Módulo de rutas principal de la aplicación Carrito
 * Configura la navegación entre bienvenida y tabs principales
 * Incluye lazy loading para optimizar el rendimiento
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
    // Ruta de tabs principales - después de configuración
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
    data: {
      title: 'Carrito - Control de Gastos'
    }
    // TODO: Agregar guard para verificar que esté configurado
    // canActivate: [ConfiguracionGuard]
  },
  /**
   * {
   *   // Ruta de compra activa - sesión de compra en progreso
   *   path: 'compra-activa',
   *   loadChildren: () => import('./features/compra-activa/compra-activa.module').then(m => m.CompraActivaModule),
   *   data: {
   *     title: 'Compra en Progreso'
   *   }
   *   // TODO: Agregar guard para verificar que hay sesión activa
   *   // canActivate: [SesionActivaGuard]
   * }
   */

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