/**
 * Componente Barra de Tabs Principal
 * Barra semicircular inferior con navegación entre tabs
 * Ubicación correcta: shared/components/tab-barra-principal
 *
 * @author DemWolf
 * @version 1.0
 */

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tab-barra-principal',
  templateUrl: './tab-barra-principal.component.html',
  styleUrls: ['./tab-barra-principal.component.scss']
})
export class TabBarraPrincipalComponent implements OnInit {

  @Input() tabActivo: string = 'nueva-compra';
  @Output() cambioTab = new EventEmitter<string>();

  constructor(private router: Router) {
    console.log('🏗️ TabBarraPrincipalComponent constructor ejecutado');
  }

  ngOnInit(): void {
    console.log('🚀 TabBarraPrincipalComponent inicializado');
  }

  /**
   * Navegar a un tab específico
   */
  async navegarATab(tab: string): Promise<void> {
    console.log('🔵 =================================');
    console.log(`🔵 CLICK EN TAB: ${tab}`);
    console.log('🔵 Tab activo actual:', this.tabActivo);
    console.log('🔵 Router disponible:', !!this.router);
    console.log('🔵 URL actual:', this.router.url);

    // Actualizar tab activo
    this.tabActivo = tab;
    console.log('🔵 Tab activo actualizado a:', this.tabActivo);

    // Emitir evento de cambio de tab
    this.cambioTab.emit(tab);

    // Navegar a la ruta correspondiente
    try {
      // Navegar de forma absoluta a la ruta completa
      const rutaCompleta = `/pantalla-principal/${tab}`;
      console.log('🔵 Intentando navegar a:', rutaCompleta);
      console.log('🔵 RouterOutlet disponible:', document.querySelector('router-outlet') !== null);

      const resultado = await this.router.navigateByUrl(rutaCompleta);
      console.log('🔵 Resultado de navegación:', resultado);

      if (resultado) {
        console.log(`✅ Navegación exitosa a: ${tab}`);
        console.log('✅ Nueva URL:', this.router.url);
      } else {
        console.warn('⚠️ La navegación retornó false');
      }
    } catch (error) {
      console.error('❌ Error al navegar:', error);
      console.error('❌ Detalles del error:', JSON.stringify(error));
    }

    console.log('🔵 =================================');
  }
}
