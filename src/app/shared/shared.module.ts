import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { DonacionesModalComponent } from './components/donaciones-modal/donaciones-modal.component';

const COMPONENTS = [
  DonacionesModalComponent
];

@NgModule({
  declarations: [
    ...COMPONENTS
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  exports: [
    ...COMPONENTS
  ]
})
export class SharedModule { }
