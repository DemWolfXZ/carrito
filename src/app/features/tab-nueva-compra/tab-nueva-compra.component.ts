/**
 * Componente Tab Nueva Compra
 * Gestiona la creación de listas de compra con:
 * - Agregar productos (nombre, cantidad, precio)
 * - Cálculo automático de totales
 * - Límite de 20 productos por lista
 * - Validación de 2 listas máximas por mes
 *
 * @author DemWolf
 * @version 1.0
 */

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';

// Importar servicios
import { ComprasService } from '../../core/services/compras.service';
import { UsuarioService } from '../../core/services/usuario.service';

// Importar modelos existentes
import { Producto, NuevoProducto, ActualizacionProducto } from '../../core/models/producto.model';
import { SesionCompra, VALIDACION_SESION } from '../../core/models/sesion-compra.model';

@Component({
  selector: 'app-tab-nueva-compra',
  templateUrl: './tab-nueva-compra.component.html',
  styleUrls: ['./tab-nueva-compra.component.scss']
})
export class TabNuevaCompraComponent implements OnInit, OnDestroy {

// Configuración y límites (usando constantes del modelo)
  readonly MAX_PRODUCTOS = VALIDACION_SESION.productos.maximo;
  readonly MAX_LISTAS_MES = VALIDACION_SESION.limiteMensual;

  // Sesión activa
  sesionActiva: SesionCompra | null = null;
  productos: Producto[] = [];
  totalGeneral: number = 0;

  // Información de la compra
  infoCompra: {
    fecha: string;
    nombreSupermercado: string;
  } = {
    fecha: new Date().toISOString().split('T')[0],
    nombreSupermercado: ''
  };

  // Presupuesto estimado para la compra
  presupuestoEstimado: number = 0;

  // Fecha máxima (hoy)
  fechaMaxima: string = new Date().toISOString().split('T')[0];

  // Formulario de nuevo producto
  nuevoProducto: Partial<NuevoProducto> = {
    nombre: '',
    cantidad: 1,
    precioUnitario: 0
  };

  productoEditando: Producto | null = null;
  edicionProducto = {
    nombre: '',
    cantidad: 1,
    precioUnitario: 0
  };

  // Estados UI
  cargando: boolean = false;
  puedeCrearNuevaLista: boolean = true;
  listasCreadasEsteMes: number = 0;
  mesActual: string = ''; // Para mostrar en la UI
  proximoMes: string = ''; // Para mostrar cuándo se reinicia el límite
  tiempoRestanteTemporal: number | null = null;
  private temporizadorVigencia: number | null = null;

  // Subscripciones
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private comprasService: ComprasService,
    private usuarioService: UsuarioService,
    private changeDetector: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('🛒 Inicializando tab nueva compra...');
    await this.verificarLimiteMensual();
    await this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.detenerCuentaRegresiva();
  }

  private iniciarCuentaRegresiva(): void {
    this.detenerCuentaRegresiva();
    void this.actualizarCuentaRegresiva();
    if (this.comprasService.obtenerTiempoRestanteBorrador(this.sesionActiva!) === null) return;

    this.temporizadorVigencia = window.setInterval(() => {
      void this.actualizarCuentaRegresiva();
    }, 1000);
  }

  private detenerCuentaRegresiva(): void {
    if (this.temporizadorVigencia !== null) {
      window.clearInterval(this.temporizadorVigencia);
      this.temporizadorVigencia = null;
    }
  }

  private async actualizarCuentaRegresiva(): Promise<void> {
    if (!this.sesionActiva) {
      this.tiempoRestanteTemporal = null;
      this.detenerCuentaRegresiva();
      return;
    }

    this.tiempoRestanteTemporal = this.comprasService.obtenerTiempoRestanteBorrador(this.sesionActiva);
    if (this.tiempoRestanteTemporal === 0) {
      await this.comprasService.verificarVigenciaSesiones();
      this.detenerCuentaRegresiva();
      this.tiempoRestanteTemporal = null;
      this.productos = [];
      this.sesionActiva = null;
      this.presupuestoEstimado = 0;
      await this.mostrarToast('La lista superó las 48 horas y quedó guardada.', 'warning');
      await this.router.navigate(['/pantalla-principal/historial']);
    }
  }

  get mensajeVigenciaTemporal(): string {
    if (this.tiempoRestanteTemporal === null) return '';
    const totalSegundos = Math.ceil(this.tiempoRestanteTemporal / 1000);
    const horasTotales = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;

    if (horasTotales >= 25) return 'Te quedan 2 días para completar esta lista temporal.';
    if (horasTotales >= 12) return 'Te queda 1 día para completar esta lista temporal.';
    if (horasTotales >= 1) return `Te quedan ${horasTotales} ${horasTotales === 1 ? 'hora' : 'horas'} para completar esta lista temporal.`;
    if (minutos > 0) return `Te quedan ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} para completar esta lista temporal.`;
    return `Te quedan ${segundos} ${segundos === 1 ? 'segundo' : 'segundos'} para completar esta lista temporal.`;
  }

  /**
   * Verificar cuántas listas se han creado este mes
   */
  private async verificarLimiteMensual(): Promise<void> {
    try {
      // Obtener resumen del mes actual
      const ahora = new Date();
      const resumenMes = this.comprasService.obtenerResumenMesActual();
      this.listasCreadasEsteMes = resumenMes.sesionesUsadas;
      this.puedeCrearNuevaLista = await this.comprasService.puedeCrearNuevaSesion();

      // Obtener nombre del mes en español
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      this.mesActual = `${meses[ahora.getMonth()]} ${ahora.getFullYear()}`;

      // Calcular próximo mes
      const proximaFecha = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
      this.proximoMes = `1 de ${meses[proximaFecha.getMonth()]}`;

      console.log(`📊 Listas creadas este mes (${this.mesActual}): ${this.listasCreadasEsteMes}/${this.MAX_LISTAS_MES}`);

      if (!this.puedeCrearNuevaLista) {
        await this.mostrarAlertaLimiteAlcanzado();
      }
    } catch (error) {
      console.error('Error al verificar límite mensual:', error);
    }
  }

  /**
   * Cargar datos existentes si hay una sesión activa
   */
  private async cargarDatos(): Promise<void> {
    try {
      console.log('📂 Cargando datos...');

      // Cargar sesión activa si existe
      this.sesionActiva = await this.comprasService.obtenerSesionActiva();

      if (this.sesionActiva) {
        console.log('✅ Sesión activa encontrada:', this.sesionActiva.nombreSupermercado);
        this.productos = [...this.sesionActiva.productos];
        this.presupuestoEstimado = this.sesionActiva.presupuestoEstimado ?? 0;
        this.calcularTotal();
        this.iniciarCuentaRegresiva();
      } else {
        console.log('🆕 No hay sesión activa');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  }

  /**
   * Iniciar nueva compra (crear sesión)
   */
  async iniciarCompra(): Promise<void> {
    // Validar que se haya ingresado el nombre del supermercado
    if (!this.infoCompra.nombreSupermercado.trim()) {
      await this.mostrarToast('Ingresa el nombre del lugar donde compraste', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando compra...'
    });
    await loading.present();

    try {
      // Crear nueva sesión con presupuesto opcional
      const nuevaSesion = await this.comprasService.crearNuevaSesion({
        nombreSupermercado: this.infoCompra.nombreSupermercado.trim(),
        ubicacion: 'Chile', // Puedes expandir esto más adelante
        presupuestoEstimado: this.presupuestoEstimado > 0 ? this.presupuestoEstimado : undefined
      });

      if (nuevaSesion) {
        this.sesionActiva = nuevaSesion;

        // Si hay presupuesto, mostrar mensaje informativo
        if (this.presupuestoEstimado > 0) {
          await this.mostrarToast(`Compra iniciada con presupuesto de $${this.presupuestoEstimado}`, 'success');
        } else {
          await this.mostrarToast('Compra iniciada exitosamente', 'success');
        }

        console.log('✅ Sesión creada:', nuevaSesion.id);
      } else {
        await this.mostrarToast('No se pudo crear la sesión. Verifica el límite mensual.', 'danger');
      }
    } catch (error) {
      console.error('Error al iniciar compra:', error);
      await this.mostrarToast('Error al iniciar compra', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Cancelar la creación de una nueva compra
   * Limpia los datos ingresados y vuelve a mostrar la pantalla inicial
   */
  async cancelarNuevaCompra(): Promise<void> {
    const alert = await this.alertController.create({
      header: '¿Cancelar Nueva Compra?',
      message: 'Se descartarán todos los datos ingresados',
      buttons: [
        {
          text: 'Seguir ingresando',
          role: 'cancel'
        },
        {
          text: 'Cancelar compra',
          role: 'destructive',
          handler: async () => {
            // Limpiar datos
            this.infoCompra.nombreSupermercado = '';
            this.infoCompra.fecha = new Date().toISOString().split('T')[0];
            this.presupuestoEstimado = 0;

            await this.mostrarToast('Compra cancelada', 'warning');
            console.log('❌ Creación de compra cancelada');
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Agregar nuevo producto a la lista
   */
  async agregarProducto(): Promise<void> {
    // Validar formulario
    if (!this.validarFormularioProducto()) {
      return;
    }

    // Verificar límite de productos
    if (this.productos.length >= this.MAX_PRODUCTOS) {
      await this.mostrarToast(`Máximo ${this.MAX_PRODUCTOS} productos por lista`, 'warning');
      return;
    }

    // Verificar que haya sesión activa
    if (!this.sesionActiva) {
      await this.mostrarToast('Primero debes iniciar una compra', 'warning');
      return;
    }

    // Agregar producto usando ComprasService
    const datosProducto: NuevoProducto = {
      nombre: this.nuevoProducto.nombre!.trim(),
      cantidad: this.nuevoProducto.cantidad!,
      precioUnitario: this.nuevoProducto.precioUnitario!
    };

    const agregado = await this.comprasService.agregarProducto(datosProducto);

    if (agregado) {
      // Recargar productos desde la sesión actualizada
      this.sesionActiva = await this.comprasService.obtenerSesionActiva();
      if (this.sesionActiva) {
        // Crear copia profunda de los productos para forzar detección de cambios
        this.productos = this.sesionActiva.productos.map(p => ({ ...p }));
        this.calcularTotal();
        // Forzar detección de cambios
        this.changeDetector.markForCheck();

        // ✅ VALIDAR PRESUPUESTO si está definido
        if (this.presupuestoEstimado > 0 && this.sesionActiva.totales.total > 0) {
          const porcentajeUsado = (this.sesionActiva.totales.total / this.presupuestoEstimado) * 100;

          // Mostrar alerta si se alcanza el 90% del presupuesto
          if (porcentajeUsado >= 90 && porcentajeUsado < 100) {
            await this.mostrarAlertaPresupuesto90();
          } else if (porcentajeUsado >= 100) {
            await this.mostrarAlertaPresupuestoExcedido();
          }
        }
      }

      // Limpiar formulario
      this.limpiarFormulario();

      // Mostrar confirmación
      await this.mostrarToast('Producto agregado', 'success');
      console.log('✅ Producto agregado correctamente');
    } else {
      await this.mostrarToast('Error al agregar producto', 'danger');
    }
  }

  /**
   * Eliminar producto de la lista
   */
  async eliminarProducto(id: string): Promise<void> {
    const alert = await this.alertController.create({
      header: '¿Eliminar producto?',
      message: 'Esta acción no se puede deshacer',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            const eliminado = await this.comprasService.removerProducto(id);

            if (eliminado) {
              // Recargar productos desde la sesión actualizada
              this.sesionActiva = await this.comprasService.obtenerSesionActiva();
              if (this.sesionActiva) {
                // Crear copia profunda de los productos para forzar detección de cambios
                this.productos = this.sesionActiva.productos.map(p => ({ ...p }));
                this.calcularTotal();
                // Forzar detección de cambios
                this.changeDetector.markForCheck();
              }
              await this.mostrarToast('Producto eliminado', 'success');
            } else {
              await this.mostrarToast('Error al eliminar producto', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Editar producto existente
   */
  async editarProducto(producto: Producto): Promise<void> {
    this.productoEditando = producto;
    this.edicionProducto = {
      nombre: producto.nombre,
      cantidad: producto.cantidad,
      precioUnitario: producto.precioUnitario
    };
    return;

    /*
    const alert = await this.alertController.create({
      header: 'Editar Producto',
      subHeader: 'Actualiza los datos del producto',
      message: 'Campos a editar:\n1. Nombre del producto\n2. Cantidad\n3. Precio unitario',
      cssClass: 'alert-editar-producto',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre',
          value: producto.nombre
        },
        {
          name: 'cantidad',
          type: 'number',
          placeholder: 'Cantidad',
          value: producto.cantidad,
          min: 1
        },
        {
          name: 'precioUnitario',
          type: 'number',
          placeholder: 'Precio unitario',
          value: producto.precioUnitario,
          min: 0
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
            console.log('📝 [EDITAR] Dialog cerrado, datos del formulario:', data);

            // Solo el nombre es requerido. Cantidad y precio son opcionales pero si se proporcionan deben ser válidos
            if (!data.nombre || !data.nombre.trim()) {
              await this.mostrarToast('El nombre es obligatorio', 'warning');
              return false;
            }

            // Parsear y validar cantidad
            let cantidadValida: number | undefined = undefined;
            if (data.cantidad !== '' && data.cantidad !== undefined && data.cantidad !== null) {
              const cantidad = typeof data.cantidad === 'string' ? parseInt(data.cantidad, 10) : Number(data.cantidad);
              if (isNaN(cantidad) || cantidad < 1) {
                await this.mostrarToast('La cantidad debe ser mayor a 0', 'warning');
                return false;
              }
              cantidadValida = cantidad;
            }

            // Parsear y validar precio
            let precioValido: number | undefined = undefined;
            if (data.precioUnitario !== '' && data.precioUnitario !== undefined && data.precioUnitario !== null) {
              const precio = typeof data.precioUnitario === 'string' ? parseFloat(data.precioUnitario) : Number(data.precioUnitario);
              if (isNaN(precio) || precio < 0) {
                await this.mostrarToast('El precio no puede ser negativo', 'warning');
                return false;
              }
              precioValido = precio;
            } else {
              // Si está vacío, se envía 0
              precioValido = 0;
            }

            // Preparar actualización
            const actualizacion: ActualizacionProducto = {
              nombre: data.nombre.trim()
            };

            // Agregar cantidad solo si tiene valor válido
            if (cantidadValida !== undefined) {
              actualizacion.cantidad = cantidadValida;
            }

            // Agregar precio - SIEMPRE actualizar (incluso si es 0)
            actualizacion.precioUnitario = precioValido;

            console.log('📝 [EDITAR] Datos validados y preparados:', actualizacion);
            console.log('📝 [EDITAR] Llamando al servicio para actualizar producto ID:', producto.id);
            console.log('📝 [EDITAR] Producto actual antes de actualizar:', producto);

            const actualizado = await this.comprasService.actualizarProducto(producto.id, actualizacion);

            console.log('📝 [EDITAR] Respuesta del servicio - Actualizado:', actualizado);

            if (actualizado) {
              // Recargar productos desde la sesión actualizada
              console.log('📝 [EDITAR] Obteniendo sesión actualizada...');
              this.sesionActiva = await this.comprasService.obtenerSesionActiva();

              console.log('📝 [EDITAR] ¿Sesión activa existe?:', !!this.sesionActiva);

              if (this.sesionActiva) {
                console.log('📝 [EDITAR] Sesión obtenida, tipo:', typeof this.sesionActiva);
                console.log('📝 [EDITAR] ¿Tiene productos?:', !!this.sesionActiva.productos);
                console.log('📝 [EDITAR] Longitud de productos:', this.sesionActiva.productos?.length);
                console.log('📝 [EDITAR] Productos completo:', JSON.stringify(this.sesionActiva.productos, null, 2));

                // Crear copia profunda de los productos para forzar detección de cambios
                const productosAntiguos = this.productos.length;
                this.productos = this.sesionActiva.productos.map(p => ({ ...p }));
                console.log('📝 [EDITAR] Productos mapeados, cantidad:', this.productos.length);
                console.log('📝 [EDITAR] Productos antes:', productosAntiguos, 'Productos después:', this.productos.length);

                this.calcularTotal();
                // Forzar detección de cambios
                this.changeDetector.markForCheck();

                console.log('✅ [EDITAR] Array de productos actualizado en el componente');
                console.log('✅ [EDITAR] Nuevo array de productos:', this.productos);
              } else {
                console.error('❌ [EDITAR] La sesión activa es null');
              }
              await this.mostrarToast('Producto actualizado', 'success');
              // Cerrar el alert explícitamente DESPUÉS de actualizar
              await alert.dismiss();
              console.log('✅ [EDITAR] Alert cerrado');
            } else {
              console.error('❌ [EDITAR] Error al actualizar el producto');
              await this.mostrarToast('Error al actualizar producto', 'danger');
            }
            return false; // No dejar que el alert se cierre automáticamente
          }
        }
      ]
    });

    await alert.present();
    */
  }

  cerrarEdicionProducto(): void {
    this.productoEditando = null;
  }

  async guardarEdicionProducto(): Promise<void> {
    if (!this.productoEditando || !this.edicionProducto.nombre.trim()) {
      await this.mostrarToast('El nombre del producto es obligatorio', 'warning');
      return;
    }

    const cantidad = Number(this.edicionProducto.cantidad);
    const precioUnitario = Number(this.edicionProducto.precioUnitario);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      await this.mostrarToast('La cantidad debe ser mayor a 0', 'warning');
      return;
    }
    if (isNaN(precioUnitario) || precioUnitario < 0) {
      await this.mostrarToast('El precio no puede ser negativo', 'warning');
      return;
    }

    const actualizado = await this.comprasService.actualizarProducto(this.productoEditando.id, {
      nombre: this.edicionProducto.nombre.trim(),
      cantidad,
      precioUnitario
    });

    if (!actualizado) {
      await this.mostrarToast('Error al actualizar producto', 'danger');
      return;
    }

    this.sesionActiva = await this.comprasService.obtenerSesionActiva();
    if (this.sesionActiva) {
      this.productos = this.sesionActiva.productos.map(p => ({ ...p }));
      this.calcularTotal();
      this.changeDetector.markForCheck();
    }
    this.cerrarEdicionProducto();
    await this.mostrarToast('Producto actualizado', 'success');
  }

  /**
   * Guardar lista de compra
   * Permite guardar con o sin precios/cantidades completos.
   * El usuario puede completar los detalles después en la tienda.
   */
  async guardarLista(): Promise<void> {
    if (this.productos.length === 0) {
      await this.mostrarToast('Agrega al menos un producto', 'warning');
      return;
    }

    // Verificar si hay productos sin precio o cantidad
    const productosIncompletos = this.productos.some(p => !p.precioUnitario || p.precioUnitario === 0 || !p.cantidad);

    await this.mostrarOpcionesGuardado(productosIncompletos);
  }

  /**
   * Mostrar alerta cuando hay productos incompletos
   * Permite guardar la lista para completarla en la tienda
   */
  private async mostrarOpcionesGuardado(hayProductosIncompletos: boolean): Promise<void> {
    const cantidadProductosIncompletos = this.productos.filter(p => !p.esCompleto).length;
    const productosCompletos = this.productos.length - cantidadProductosIncompletos;

    const presupuestoText = this.presupuestoEstimado > 0
      ? `\n💰 Presupuesto: $${this.presupuestoEstimado.toLocaleString()}`
      : '';

    const message = `
📍 RESUMEN DE TU COMPRA
━━━━━━━━━━━━━━━━━━━━━
🏪 Supermercado: ${this.sesionActiva?.nombreSupermercado || 'No especificado'}
📦 Productos: ${this.productos.length}${presupuestoText}

✨ BENEFICIOS DE GUARDAR AHORA
━━━━━━━━━━━━━━━━━━━━━
🛒 Completa los precios en la tienda
💰 Controla tu gasto en tiempo real
📌 No olvidas ningún producto
⏱️ Ahorras tiempo en la compra

💡 Consejo: Puedes editar cualquier producto desde aquí o luego, desde tu lista guardada.
    `;

    const alert = await this.alertController.create({
      header: '📋 Guardar lista',
      subHeader: hayProductosIncompletos
        ? `${cantidadProductosIncompletos} artículo(s) sin precio · Se guardará como temporal`
        : 'Todos los artículos están completos · Puedes finalizar o guardar temporalmente',
      message: message.trim(),
      cssClass: 'alert-guardar-incompleta',
      buttons: [
        {
          text: '← Volver',
          role: 'cancel',
          cssClass: 'btn-volver'
        },
        {
          text: '📌 Guardar temporal',
          handler: async () => {
            await this.procesarGuardado(true);
          },
          cssClass: 'btn-guardar'
        },
        ...(!hayProductosIncompletos ? [{
          text: '✓ Finalizar compra',
          handler: async () => {
            await this.procesarGuardado(false);
          },
          cssClass: 'btn-finalizar'
        }] : [])
      ]
    });

    await alert.present();
  }

  /**
   * Procesar guardado de la lista
   * @param esBorrador - true para guardar incompleta (se completará en la tienda), false para finalizar
   */
  private async procesarGuardado(esBorrador: boolean): Promise<void> {
    const loading = await this.loadingController.create({
      message: esBorrador ? 'Guardando lista...' : 'Finalizando compra...'
    });
    await loading.present();

    try {
      let finalizado: boolean;

      if (esBorrador) {
        // Guardar sesión como borrador (sin finalizar)
        // Se usa la misma sesión activa pero se marca el estado como BORRADOR
        finalizado = await this.comprasService.guardarSesionComoBorrador();
      } else {
        // Finalizar sesión activa normalmente
        finalizado = await this.comprasService.finalizarSesionActiva();
      }

      if (finalizado) {
        console.log(`💾 Lista guardada exitosamente`);
        await loading.dismiss();

        const mensaje = esBorrador
          ? '📋 Lista guardada. Ahora puedes completar los precios en la tienda'
          : '✅ Perfecto! Tu compra ha sido registrada. Así llevas el control de tus gastos';


        // Limpiar y redirigir al historial
        this.productos = [];
        this.totalGeneral = 0;
        this.sesionActiva = null;
        this.infoCompra.nombreSupermercado = '';
        this.presupuestoEstimado = 0;
        this.router.navigate(['/pantalla-principal/historial']);
      } else {
        await loading.dismiss();
        await this.mostrarToast('Error al guardar la lista', 'danger');
      }

    } catch (error) {
      await loading.dismiss();
      console.error('Error al guardar lista:', error);
      await this.mostrarToast('Error al guardar la lista', 'danger');
    }
  }

  /**
   * Cancelar la compra en progreso (eliminar sesión activa)
   * Descarta todos los productos agregados
   */
  async cancelarCompraEnProgreso(): Promise<void> {
    if (!this.sesionActiva) {
      await this.mostrarToast('No hay compra en progreso', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: '⚠️ Cancelar Compra en Progreso',
      message: `¿Deseas cancelar la compra en "${this.sesionActiva.nombreSupermercado}"? Se descartarán todos los ${this.productos.length} producto(s) agregado(s).`,
      buttons: [
        {
          text: '← Volver',
          role: 'cancel'
        },
        {
          text: '🗑️ Cancelar Compra',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Cancelando compra...'
            });
            await loading.present();

            try {
              // Cancelar la sesión activa
              const cancelada = await this.comprasService.cancelarSesionActiva();

              if (cancelada) {
                console.log('❌ Compra en progreso cancelada');
                await loading.dismiss();

                // Limpiar datos
                this.productos = [];
                this.totalGeneral = 0;
                this.sesionActiva = null;
                this.infoCompra.nombreSupermercado = '';
                this.presupuestoEstimado = 0;

                await this.mostrarToast('Compra cancelada exitosamente', 'warning');
              } else {
                await loading.dismiss();
                await this.mostrarToast('Error al cancelar la compra', 'danger');
              }
            } catch (error) {
              await loading.dismiss();
              console.error('Error al cancelar compra:', error);
              await this.mostrarToast('Error al cancelar la compra', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Eliminar una lista completamente (sesión guardada)
   */
  async eliminarListaSesionActiva(): Promise<void> {
    if (!this.sesionActiva) {
      await this.mostrarToast('No hay lista para eliminar', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: '🗑️ Eliminar Lista Guardada',
      message: `¿Deseas eliminar permanentemente la lista de "${this.sesionActiva.nombreSupermercado}"? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: '← Cancelar',
          role: 'cancel'
        },
        {
          text: '🗑️ Eliminar',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Eliminando lista...'
            });
            await loading.present();

            try {
              // Eliminar la sesión activa
              const eliminada = await this.comprasService.eliminarSesionActiva();

              if (eliminada) {
                console.log('🗑️ Lista eliminada');
                await loading.dismiss();

                // Limpiar datos
                this.productos = [];
                this.totalGeneral = 0;
                this.sesionActiva = null;
                this.infoCompra.nombreSupermercado = '';
                this.presupuestoEstimado = 0;

                await this.mostrarToast('Lista eliminada exitosamente', 'success');
              } else {
                await loading.dismiss();
                await this.mostrarToast('Error al eliminar la lista', 'danger');
              }
            } catch (error) {
              await loading.dismiss();
              console.error('Error al eliminar lista:', error);
              await this.mostrarToast('Error al eliminar la lista', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Calcular total general
   */
  private calcularTotal(): void {
    this.totalGeneral = this.productos.reduce((sum, p) => sum + p.total, 0);
  }

  /**
   * Validar formulario de producto
   * Solo el nombre es requerido. Precio y cantidad son opcionales.
   * Esto permite al usuario crear listas rápidamente y completarlas después en la tienda.
   */
  private validarFormularioProducto(): boolean {
    if (!this.nuevoProducto.nombre?.trim()) {
      this.mostrarToast('Ingresa el nombre del producto', 'warning');
      return false;
    }

    // Si hay precio, validar que sea positivo
    if (this.nuevoProducto.precioUnitario && this.nuevoProducto.precioUnitario < 0) {
      this.mostrarToast('El precio no puede ser negativo', 'warning');
      return false;
    }

    // Si hay cantidad, validar que sea mayor a 0
    if (this.nuevoProducto.cantidad && this.nuevoProducto.cantidad < 1) {
      this.mostrarToast('La cantidad debe ser mayor a 0', 'warning');
      return false;
    }

    return true;
  }

  /**
   * Limpiar formulario
   */
  private limpiarFormulario(): void {
    this.nuevoProducto = {
      nombre: '',
      cantidad: 1,
      precioUnitario: 0
    };
  }

  /**
   * Generar ID único
   */
  private generarId(): string {
    return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Mostrar alerta cuando se alcanza el 90% del presupuesto
   */
  private async mostrarAlertaPresupuesto90(): Promise<void> {
    if (!this.sesionActiva || this.presupuestoEstimado <= 0) return;

    const totalGastado = this.sesionActiva.totales.total;
    const diferencia = this.presupuestoEstimado - totalGastado;
    const porcentajeUsado = (totalGastado / this.presupuestoEstimado) * 100;

    const alert = await this.alertController.create({
      header: '⚠️ Presupuesto al 90%',
      message: `
Has utilizado el 90% de tu presupuesto.

Gasto actual: $${totalGastado}
Presupuesto: $${this.presupuestoEstimado}
Saldo disponible: $${diferencia}

Porcentaje usado: ${porcentajeUsado.toFixed(1)}%
      `,
      buttons: ['Entendido']
    });

    await alert.present();
  }

  /**
   * Mostrar alerta cuando se excede el presupuesto
   */
  private async mostrarAlertaPresupuestoExcedido(): Promise<void> {
    if (!this.sesionActiva || this.presupuestoEstimado <= 0) return;

    const totalGastado = this.sesionActiva.totales.total;
    const excedido = totalGastado - this.presupuestoEstimado;
    const porcentajeUsado = (totalGastado / this.presupuestoEstimado) * 100;

    const alert = await this.alertController.create({
      header: '🔴 Presupuesto Excedido',
      message: `
¡Has superado tu presupuesto!

Gasto actual: $${totalGastado}
Presupuesto: $${this.presupuestoEstimado}
Excedido: $${excedido}

Porcentaje usado: ${porcentajeUsado.toFixed(1)}%
      `,
      buttons: ['Entendido']
    });

    await alert.present();
  }

  /**
   * Mostrar alerta cuando se alcanza el límite mensual
   */
  private async mostrarAlertaLimiteAlcanzado(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Límite alcanzado',
      message: `Has creado ${this.MAX_LISTAS_MES} listas este mes. Versión gratuita limitada a ${this.MAX_LISTAS_MES} listas por mes calendario.`,
      buttons: ['Entendido']
    });

    await alert.present();
  }

  /**
   * Mostrar toast
   */
  private async mostrarToast(message: string, color: string = 'medium'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // Getters para el template
  get puedeIniciarCompra(): boolean {
    return this.infoCompra.nombreSupermercado.trim().length > 0 && this.puedeCrearNuevaLista;
  }

  get puedeAgregarProducto(): boolean {
    return this.productos.length < this.MAX_PRODUCTOS && this.puedeCrearNuevaLista && this.sesionActiva !== null;
  }

  get mensajeLimite(): string {
    if (!this.puedeCrearNuevaLista) {
      return `Límite mensual alcanzado (${this.listasCreadasEsteMes}/${this.MAX_LISTAS_MES})`;
    }
    return `Productos: ${this.productos.length}/${this.MAX_PRODUCTOS}`;
  }

  /**
   * Obtener color del presupuesto según el porcentaje usado
   * Verde: 0-70%
   * Naranja: 71-94%
   * Rojo: 95-100%
   */
  obtenerColorPresupuesto(): string {
    const porcentaje = this.obtenerPorcentajePresupuesto();

    if (porcentaje <= 70) {
      return 'presupuesto-verde';
    } else if (porcentaje <= 94) {
      return 'presupuesto-naranja';
    } else {
      return 'presupuesto-rojo';
    }
  }

  /**
   * Obtener la diferencia entre presupuesto y gasto
   */
  obtenerDiferenciaPresupuesto(): number {
    if (!this.sesionActiva || this.presupuestoEstimado <= 0) return 0;
    return this.presupuestoEstimado - this.sesionActiva.totales.total;
  }

  /**
   * Obtener el porcentaje del presupuesto utilizado
   */
  obtenerPorcentajePresupuesto(): number {
    if (!this.sesionActiva || this.presupuestoEstimado <= 0) return 0;
    return (this.sesionActiva.totales.total / this.presupuestoEstimado) * 100;
  }

  /**
   * TrackBy function para optimizar renderizado de lista
   */
  trackByFn(index: number, producto: Producto): string {
    return producto.id;
  }

}
