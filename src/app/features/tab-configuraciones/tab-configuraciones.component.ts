import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { DonacionesService } from '../../core/services/donaciones.service';
import { DonacionesModalComponent } from '../../shared/components/donaciones-modal/donaciones-modal.component';
import { SelectorPaisModalComponent } from './selector-pais-modal/selector-pais-modal.component';
import { TipoConfiguracion } from '../../core/models/configuracion.model';
import { Pais } from '../../core/models/pais.model';

@Component({
  selector: 'app-tab-configuraciones',
  templateUrl: './tab-configuraciones.component.html',
  styleUrls: ['./tab-configuraciones.component.scss']
})
export class TabConfiguracionesComponent implements OnInit {

  nombreUsuario: string = '';
  paisActual: Pais | null = null;
  paisesDisponibles: Pais[] = [];

  constructor(
    private configuracionService: ConfiguracionService,
    private usuarioService: UsuarioService,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private donacionesService: DonacionesService
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('⚙️ Tab Configuraciones inicializado');
    await this.cargarDatosUsuario();
    this.cargarPaisesDisponibles();
    await this.cargarPaisActual();
  }

  /**
   * Cargar datos del usuario
   */
  private async cargarDatosUsuario(): Promise<void> {
    try {
      const usuario = await this.usuarioService.obtenerUsuarioActual();
      if (usuario) {
        this.nombreUsuario = usuario.nombre;
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
  }

  /**
   * Cargar países disponibles
   */
  private cargarPaisesDisponibles(): void {
    try {
      this.paisesDisponibles = this.configuracionService.obtenerPaisesActivos();
      console.log(`🌍 Países cargados: ${this.paisesDisponibles.length}`);
    } catch (error) {
      console.error('Error al cargar países:', error);
    }
  }

  /**
   * Cargar país actual
   */
  private async cargarPaisActual(): Promise<void> {
    try {
      const usuario = await this.usuarioService.obtenerUsuarioActual();
      if (usuario?.pais) {
        this.paisActual = this.paisesDisponibles.find(p => p.codigo === usuario.pais) || null;
        console.log('🌍 País actual:', this.paisActual?.nombre);
      }
    } catch (error) {
      console.error('Error al cargar país actual:', error);
    }
  }

  /**
   * Abrir selector de países
   */
  async cambiarPais(): Promise<void> {
    const modal = await this.modalController.create({
      component: SelectorPaisModalComponent,
      componentProps: {
        paisesDisponibles: this.paisesDisponibles,
        paisActual: this.paisActual
      },
      cssClass: 'selector-pais-modal'
    });

    await modal.present();
    const result = await modal.onDidDismiss();

    if (result.data) {
      const paisSeleccionado: Pais = result.data;
      try {
        await this.usuarioService.actualizarPerfil({ pais: paisSeleccionado.codigo });
        this.paisActual = paisSeleccionado;
        console.log('✅ País actualizado:', paisSeleccionado.nombre);

        // Mostrar toast de confirmación
        const toast = await this.toastController.create({
          message: `✅ País actualizado a: ${paisSeleccionado.nombre}`,
          duration: 2000,
          position: 'top',
          color: 'success'
        });
        await toast.present();
      } catch (error) {
        console.error('Error al actualizar país:', error);

        // Mostrar toast de error
        const toast = await this.toastController.create({
          message: '❌ Error al actualizar el país',
          duration: 2000,
          position: 'top',
          color: 'danger'
        });
        await toast.present();
      }
    }
  }

  /**
   * Cambiar nombre de perfil
   */
  async cambiarNombrePerfil(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cambiar Nombre',
      message: 'Ingresa tu nuevo nombre de perfil',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre',
          value: this.nombreUsuario
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (data.nombre && data.nombre.trim()) {
              try {
                await this.usuarioService.actualizarPerfil({ nombre: data.nombre.trim() });
                this.nombreUsuario = data.nombre.trim();
                console.log('✅ Nombre actualizado');

                // Mostrar toast de confirmación
                const toast = await this.toastController.create({
                  message: `✅ Nombre actualizado a: ${data.nombre.trim()}`,
                  duration: 2000,
                  position: 'top',
                  color: 'success'
                });
                await toast.present();
              } catch (error) {
                console.error('Error al actualizar nombre:', error);

                // Mostrar toast de error
                const toast = await this.toastController.create({
                  message: '❌ Error al actualizar el nombre',
                  duration: 2000,
                  position: 'top',
                  color: 'danger'
                });
                await toast.present();
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Mostrar información de ayuda
   */
  async mostrarAyuda(): Promise<void> {
    const alert = await this.alertController.create({
      header: '¿Qué hace el Sistema?',
      message: `🛒 CARRITO - Tu Control de Compras

¿POR QUÉ USAR CARRITO?
Muchos olvidamos qué queremos comprar o andamos con calculadora en mano. Con Carrito:
✓ Anotas el producto, cantidad y precio
✓ Ves el total en tiempo real
✓ No te pasas del presupuesto
✓ Controlas exactamente qué gastas

FUNCIONALIDADES:
• Máximo 2 compras por mes calendario
• Hasta 20 productos por compra
• Cálculo automático de totales
• Presupuesto estimado
• Historial completo
• Estadísticas detalladas
• Modo claro y oscuro

TODO ES LOCAL:
✓ Sin internet requerido
✓ Datos seguros en tu dispositivo
✓ Sin rastreo ni publicidad`,
      buttons: ['Entendido']
    });

    await alert.present();
  }

  /**
   * Mostrar términos y condiciones
   */
  async mostrarTerminos(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Términos y Condiciones',
      message: `Carrito es una aplicación 100% gratuita.

Uso:
• Versión gratuita con límites de uso
• Opción de donación voluntaria disponible
• Sin publicidad intrusiva
• Tus datos permanecen en tu dispositivo

Privacidad:
• No recopilamos datos personales
• No compartimos información con terceros
• Almacenamiento local únicamente

Al usar esta aplicación, aceptas estos términos.`,
      buttons: ['Aceptar']
    });

    await alert.present();
  }

  /**
   * Mostrar información acerca de Carrito
   */
  async mostrarAcercaDe(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Acerca de Carrito',
      message: `🛒 CARRITO - Control Inteligente de Compras

Versión: 1.0.0
Desarrollado por: DemWolf 🇨🇱

PROPÓSITO:
Ayudarte a controlar tus gastos y saber exactamente qué compras. Sin olvidos, sin sorpresas en el total.

CARACTERÍSTICAS PRINCIPALES:
✓ Máximo 2 compras por mes calendario
✓ Hasta 20 productos por compra
✓ Cálculo en tiempo real
✓ Historial y estadísticas
✓ 100% privado y local
✓ Gratuito

PRIVACIDAD:
• Sin rastreo de datos
• Sin publicidad
• Sin conexión a internet
• Todo guardado en tu dispositivo

Proyecto personal. No es comercial.`,
      buttons: [
        {
          text: 'Ver Portafolio del creador',
          handler: () => {
            this.abrirPortafolio();
          }
        },
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  /**
   * Abrir portafolio en navegador
   */
  async abrirPortafolio(): Promise<void> {
    try {
      // Abrir en nueva pestaña
      window.open('https://portafolio-alejandro-villa.web.app', '_blank');
    } catch (error) {
      console.error('Error al abrir portafolio:', error);
    }
  }

  /**
   * Mostrar alerta genérica
   */
  private async mostrarAlerta(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Abrir modal de donaciones
   */
  async abrirDonaciones(): Promise<void> {
    const modal = await this.modalController.create({
      component: DonacionesModalComponent,
      componentProps: {
        titulo: 'Apoya la App',
        mensaje: `Creo firmemente que tus datos valen y son importantes.
Por eso esta app funciona 100 % offline y no recopila información.
Si quieres apoyar el desarrollo de más aplicaciones que respeten tu privacidad,
puedes hacerlo con una donación.`
      },
      cssClass: 'donaciones-modal'
    });

    await modal.present();
  }

}
