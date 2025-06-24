/**
 * Módulo del feature de bienvenida para la configuración inicial
 * Contiene el componente principal y sus componentes hijos
 * Configurado con lazy loading para optimizar la carga inicial
 * 
 * @author DemWolf
 * @version 1.0 - CORREGIDO PARA USAR ROUTING MODULE
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Importar módulos de Ionic
import { IonicModule } from '@ionic/angular';

// Importar componentes del módulo
import { BienvenidaComponent } from './bienvenida.component';

// ✅ IMPORTAR ROUTING MODULE (CORREGIDO)
import { BienvenidaRoutingModule } from './bienvenida-routing.module';

// Importar componentes hijos (cuando los creemos)
// import { SeleccionPaisComponent } from './components/seleccion-pais/seleccion-pais.component';
// import { ConfiguracionInicialComponent } from './components/configuracion-inicial/configuracion-inicial.component';

@NgModule({
  declarations: [
    // Componente principal de bienvenida
    BienvenidaComponent,
    
    // Componentes hijos (descomentar cuando se creen)
    // SeleccionPaisComponent,
    // ConfiguracionInicialComponent
  ],
  imports: [
    // Módulos básicos de Angular
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    
    // Módulo de Ionic para componentes UI
    IonicModule,
    
    // ✅ USAR EL ROUTING MODULE DEDICADO (CORREGIDO)
    BienvenidaRoutingModule
  ],
  providers: [
    // Aquí irían providers específicos del módulo si los necesitamos
    // Por ahora los servicios están en core y se inyectan globalmente
  ],
  exports: [
    // Exportar componentes si van a ser usados en otros módulos
    BienvenidaComponent
  ]
})
export class BienvenidaModule { }