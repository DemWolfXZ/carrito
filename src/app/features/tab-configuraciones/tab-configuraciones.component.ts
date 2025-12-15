import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { DonacionesService } from '../../core/services/donaciones.service';
import { DonacionesModalComponent } from '../../shared/components/donaciones-modal/donaciones-modal.component';
import { TipoConfiguracion } from '../../core/models/configuracion.model';

@Component({
  selector: 'app-tab-configuraciones',
  templateUrl: './tab-configuraciones.component.html',
  styleUrls: ['./tab-configuraciones.component.scss']
})
export class TabConfiguracionesComponent implements OnInit {

  modoOscuro: boolean = false;
  nombreUsuario: string = '';

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
    await this.cargarPreferenciaTema();
    await this.cargarDatosUsuario();
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
   * Cargar preferencia de tema guardada
   */
  private async cargarPreferenciaTema(): Promise<void> {
    try {
      const config = await this.configuracionService.obtenerConfiguracionActual();
      if (config?.configuraciones.tema) {
        this.modoOscuro = config.configuraciones.tema === 'oscuro';
        this.aplicarTema(this.modoOscuro);
      }
    } catch (error) {
      console.error('Error al cargar preferencia de tema:', error);
    }
  }

  /**
   * Cambiar tema de la aplicación
   */
  async cambiarTema(event: any): Promise<void> {
    const oscuro = event.detail.checked;
    console.log('🎨 Cambiando tema a:', oscuro ? 'oscuro' : 'claro');

    this.modoOscuro = oscuro;
    this.aplicarTema(oscuro);

    // Guardar preferencia
    try {
      const config = await this.configuracionService.obtenerConfiguracionActual();
      if (config) {
        const actualizacion = {
          tipo: TipoConfiguracion.GLOBALES,
          configuraciones: {
            ...config.configuraciones,
            tema: oscuro ? 'oscuro' : 'claro'
          }
        };
        await this.configuracionService.actualizarConfiguracion(actualizacion);
        console.log('✅ Preferencia de tema guardada');
      }
    } catch (error) {
      console.error('❌ Error al guardar preferencia de tema:', error);
    }
  }

  /**
   * Aplicar tema al documento
   */
  private aplicarTema(oscuro: boolean): void {
    document.body.classList.toggle('dark', oscuro);
    console.log('🎨 Tema aplicado:', oscuro ? 'oscuro' : 'claro');
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
      header: '¿Qué hace Carrito?',
      message: `Carrito es una aplicación móvil para control de gastos en tus compras.

Funcionalidades:
• Registra hasta 2 compras al mes
• Agrega hasta 20 productos por compra
• Calcula totales automáticamente
• Historial completo de compras
• Estadísticas detalladas
• Modo claro y oscuro

Todo se guarda de forma local y segura en tu dispositivo.`,
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
      message: `Carrito App

Versión: 1.0.0

Desarrollado por:
DemWolf
Chile 🇨🇱

Proyecto personal de código abierto.
No es un producto comercial ni empresarial.`,
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
