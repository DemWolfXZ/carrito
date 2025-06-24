/**
 * Módulo Core de la aplicación Carrito
 * Contiene servicios singleton, guards, interceptores y providers globales
 * Se importa una sola vez en el módulo principal (AppModule)
 * 
 * @author DemWolf
 * @version 1.0
 */

import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importar todos los servicios principales
import { AlmacenamientoService } from './services/almacenamiento.service';
import { ConfiguracionService } from './services/configuracion.service';
import { UsuarioService } from './services/usuario.service';
import { ComprasService } from './services/compras.service';
import { MonetizacionService } from './services/monetizacion.service';

@NgModule({
  declarations: [
    // No hay componentes en el módulo core
  ],
  imports: [
    CommonModule
  ],
  providers: [
    // Servicios singleton - se crean una sola vez
    AlmacenamientoService,
    ConfiguracionService,
    UsuarioService,
    ComprasService,
    MonetizacionService
  ],
  exports: [
    // No exportamos nada desde core
  ]
})
export class CoreModule {
  
  /**
   * Constructor que previene múltiples importaciones del CoreModule
   * Solo debe importarse una vez en AppModule
   */
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule ya está cargado. Impórtalo solo en AppModule.');
    }
  }
  
  /**
   * Método estático para configurar el módulo Core
   * Se usa en AppModule: CoreModule.forRoot()
   */
  static forRoot() {
    return {
      ngModule: CoreModule,
      providers: [
        // Providers adicionales que se necesiten configurar
      ]
    };
  }
}