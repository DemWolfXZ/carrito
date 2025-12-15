/**
 * Guard para verificar si el usuario ya completó la configuración inicial
 * Redirige a pantalla-principal si ya está configurado
 *
 * @author DemWolf
 * @version 1.0
 */

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AlmacenamientoService } from '../services/almacenamiento.service';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionGuard implements CanActivate {

  constructor(
    private router: Router,
    private almacenamientoService: AlmacenamientoService
  ) {}

  async canActivate(): Promise<boolean> {
    console.log('🛡️ ConfiguracionGuard - Verificando estado...');

    try {
      // Verificar si existe configuración
      const configuracionExiste = await this.almacenamientoService.existeConfiguracion();
      const usuarioExiste = await this.almacenamientoService.existeUsuario();

      const estaConfigurado = configuracionExiste && usuarioExiste;
      console.log('🛡️ ¿Usuario configurado?', estaConfigurado);

      if (estaConfigurado) {
        // Ya está configurado, redirigir a pantalla principal
        console.log('🛡️ Redirigiendo a pantalla-principal...');
        this.router.navigate(['/pantalla-principal'], { replaceUrl: true });
        return false; // Bloquear acceso a bienvenida
      }

      // No está configurado, permitir acceso a bienvenida
      console.log('🛡️ Permitiendo acceso a bienvenida');
      return true;

    } catch (error) {
      console.error('🛡️ Error en ConfiguracionGuard:', error);
      // En caso de error, permitir acceso
      return true;
    }
  }
}
