/**
 * Módulo de rutas para el feature de bienvenida
 * Define la navegación y lazy loading del componente de configuración inicial
 * Incluye guards para controlar el acceso según el estado de configuración
 * 
 * @author DemWolf
 * @version 1.0
 */

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Importar el componente principal
import { BienvenidaComponent } from './bienvenida.component';

// TODO: Importar guards cuando se creen
// import { ConfiguracionGuard } from '@core/guards/configuracion.guard';

// Definir las rutas del módulo de bienvenida
const routes: Routes = [
  {
    path: '',
    component: BienvenidaComponent,
    data: {
      title: 'Bienvenida',
      description: 'Configuración inicial de la aplicación Carrito'
    }
    // TODO: Agregar guard cuando se cree para verificar que NO esté configurado
    // canActivate: [ConfiguracionGuard]
  },
  {
    // Ruta de fallback - redirigir a la raíz si no coincide ninguna ruta
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    // Configurar rutas hijas con lazy loading
    RouterModule.forChild(routes)
  ],
  exports: [
    // Exportar RouterModule para que esté disponible en el módulo padre
    RouterModule
  ]
})
export class BienvenidaRoutingModule { }