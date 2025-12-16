import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { TabConfiguracionesComponent } from './tab-configuraciones.component';
import { SelectorPaisModalComponent } from './selector-pais-modal/selector-pais-modal.component';
import { ConfiguradorTemaComponent } from './components/configurador-tema/configurador-tema.component';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: TabConfiguracionesComponent
  }
];

@NgModule({
  declarations: [
    TabConfiguracionesComponent,
    SelectorPaisModalComponent,
    ConfiguradorTemaComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    SharedModule
  ]
})
export class TabConfiguracionesModule { }

