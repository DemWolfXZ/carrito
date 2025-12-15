/**
 * Módulo de rutas principal de la aplicación Carrito
 * Configura la navegación entre bienvenida y pantalla principal
 * VERSIÓN CORREGIDA - RUTAS FUNCIONALES
 *
 * @author DemWolf
 * @version 1.1 - CORREGIDO PARA NAVEGACIÓN AUTOMÁTICA
 */

import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { ConfiguracionGuard } from './core/guards/configuracion.guard';

const routes: Routes = [
  {
    // ✅ RUTA RAÍZ: Redirigir directamente a bienvenida por defecto
    path: '',
    redirectTo: '/bienvenida',
    pathMatch: 'full'
  },
  {
    // ✅ RUTA DE BIENVENIDA: Configuración inicial única con Guard
    path: 'bienvenida',
    loadChildren: () => import('./features/bienvenida/bienvenida.module').then(m => m.BienvenidaModule),
    canActivate: [ConfiguracionGuard], // ✅ Verificar si ya está configurado
    data: {
      title: 'Bienvenida a Carrito',
      preload: true,
      description: 'Configuración inicial de la aplicación'
    }
  },
  {
    // ✅ RUTA PRINCIPAL: Pantalla principal después de configuración
    path: 'pantalla-principal',
    loadChildren: () => import('./layout/components/pantalla-principal/pantalla-principal.module').then(m => m.PantallaPrincipalModule),
    data: {
      title: 'Carrito - Control de Gastos',
      description: 'Pantalla principal con navegación por tabs'
    }
  },
  {
    // ✅ RUTA TABS ORIGINALES: Mantener por compatibilidad temporal
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
    data: {
      title: 'Tabs Originales',
      description: 'Sistema de tabs original de Ionic'
    }
  },
  {
    // ✅ RUTA DE FALLBACK: Cualquier ruta no encontrada vuelve a bienvenida
    path: '**',
    redirectTo: '/bienvenida',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // ✅ CONFIGURACIÓN DE ROUTING OPTIMIZADA

      // Estrategia de precarga para mejor performance
      preloadingStrategy: PreloadAllModules,

      // Habilitar tracing para debugging (solo en desarrollo)
      enableTracing: false, // Cambiar a true si necesitas debug de rutas

      // ✅ CONFIGURACIONES ADICIONALES PARA NAVEGACIÓN CORRECTA

      // Usar hash routing si hay problemas con el servidor web
      // useHash: false, // Descommentar solo si tienes problemas de routing en producción

      // Configuración para navegación
      onSameUrlNavigation: 'reload', // Recargar si se navega a la misma URL

      // Configuración para scroll
      scrollPositionRestoration: 'top', // Ir al top en cada navegación

      // Configuración para reutilización de rutas
      // relativeLinkResolution: 'legacy' // Solo si usas Angular <11
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
