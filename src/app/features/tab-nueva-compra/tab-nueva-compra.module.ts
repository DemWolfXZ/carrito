/**
 * Módulo del tab Nueva Compra
 * Permite crear listas de compra con productos y cálculos automáticos
 *
 * @author DemWolf
 * @version 1.0
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { TabNuevaCompraComponent } from './tab-nueva-compra.component';

const routes: Routes = [
  {
    path: '',
    component: TabNuevaCompraComponent
  }
];

@NgModule({
  declarations: [TabNuevaCompraComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ]
})
export class TabNuevaCompraModule { }
