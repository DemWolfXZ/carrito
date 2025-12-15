import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { TabHistorialComponent } from './tab-historial.component';

const routes: Routes = [
  {
    path: '',
    component: TabHistorialComponent
  }
];

@NgModule({
  declarations: [TabHistorialComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ]
})
export class TabHistorialModule { }
