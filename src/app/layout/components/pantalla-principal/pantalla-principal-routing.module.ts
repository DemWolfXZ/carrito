/**
 * Routing module para pantalla principal con tabs
 * Configura navegación entre tabs: historial, nueva-compra, configuraciones
 *
 * @author DemWolf
 * @version 2.0
 */

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PantallaPrincipalComponent } from './pantalla-principal.component';

const routes: Routes = [
  {
    path: '',
    component: PantallaPrincipalComponent,
    children: [
      {
        path: 'historial',
        loadChildren: () => import('../../../features/tab-historial/tab-historial.module').then(m => m.TabHistorialModule)
      },
      {
        path: 'nueva-compra',
        loadChildren: () => import('../../../features/tab-nueva-compra/tab-nueva-compra.module').then(m => m.TabNuevaCompraModule)
      },
      {
        path: 'configuraciones',
        loadChildren: () => import('../../../features/tab-configuraciones/tab-configuraciones.module').then(m => m.TabConfiguracionesModule)
      },
      {
        path: '',
        redirectTo: 'nueva-compra',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PantallaPrincipalRoutingModule { }
