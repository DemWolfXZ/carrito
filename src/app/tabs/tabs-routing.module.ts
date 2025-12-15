/**
 * Tabs routing - Redirige a pantalla-principal
 * Mantenido por compatibilidad pero redirige al nuevo sistema
 */
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/pantalla-principal',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
