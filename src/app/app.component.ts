/**
 * Componente raíz de la aplicación Carrito
 * Maneja la inicialización global y configuraciones de la app
 * Punto de entrada principal para toda la aplicación
 * 
 * @author DemWolf
 * @version 1.0
 */

import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';

// TODO: Importar servicios cuando estén disponibles
// import { ConfiguracionService } from '@core/services/configuracion.service';
// import { UsuarioService } from '@core/services/usuario.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {

  constructor(
    private platform: Platform
    // TODO: Inyectar servicios cuando estén disponibles
    // private configuracionService: ConfiguracionService,
    // private usuarioService: UsuarioService
  ) {
    // Inicializar configuraciones básicas de la plataforma
    this.inicializarApp();
  }

  /**
   * Inicialización del componente después de la construcción
   */
  ngOnInit(): void {
    // Configuraciones adicionales después de que Angular esté listo
    this.configurarTemaInicial();
  }

  /**
   * Inicializar configuraciones básicas de la aplicación
   */
  private async inicializarApp(): Promise<void> {
    try {
      // Esperar a que la plataforma esté lista
      await this.platform.ready();
      
      console.log('🛒 Aplicación Carrito iniciada correctamente');
      
      // TODO: Inicializar servicios core cuando estén disponibles
      // await this.configuracionService.inicializar();
      // await this.usuarioService.inicializar();
      
    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
    }
  }

  /**
   * Configurar tema inicial de la aplicación
   */
  private configurarTemaInicial(): void {
    // Detectar preferencia de tema del sistema por defecto
    const prefiereTemaOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // TODO: Cargar configuración de tema del usuario cuando esté disponible
    // Por ahora usar tema automático basado en preferencias del sistema
    document.body.classList.toggle('dark', prefiereTemaOscuro);
    
    // Escuchar cambios en las preferencias del sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      document.body.classList.toggle('dark', e.matches);
    });
  }
}