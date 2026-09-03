# Backend Node.js para PayPal - Ejemplo Seguro

Este archivo contiene ejemplos de cómo implementar el backend seguro para procesar donaciones con PayPal.

## Instalación de Dependencias

```bash
npm install express dotenv node-fetch cors
```

---

## Configuración (.env)

Crear archivo `.env` en la raíz del proyecto backend:

```env
PORT=3000
NODE_ENV=development

# PayPal Sandbox
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=YOUR_SANDBOX_CLIENT_ID
PAYPAL_SECRET=YOUR_SANDBOX_SECRET

# PayPal Production (cuando esté listo)
# PAYPAL_ENV=production
# PAYPAL_CLIENT_ID=YOUR_PRODUCTION_CLIENT_ID
# PAYPAL_SECRET=YOUR_PRODUCTION_SECRET

# CORS
CORS_ORIGIN=http://localhost:4200,https://tu-app.com
DATABASE_URL=mongodb://localhost:27017/donaciones
```

---

## Server.js - Configuración Express

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// Rutas de PayPal
app.use('/api/paypal', require('./routes/paypal.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`✅ Servidor PayPal ejecutándose en puerto ${port}`);
  console.log(`📝 Ambiente: ${process.env.PAYPAL_ENV}`);
});

module.exports = app;
```

---

## paypal.routes.js - Rutas

```javascript
const express = require('express');
const router = express.Router();
const paypalController = require('../controllers/paypal.controller');

// RUTA 1: Crear orden
// POST /api/paypal/crear-orden
// Body: { monto: 10, descripcion: "Donación" }
router.post('/crear-orden', paypalController.crearOrden);

// RUTA 2: Confirmar orden
// POST /api/paypal/confirmar-orden
// Body: { ordenId: "XXXXX" }
router.post('/confirmar-orden', paypalController.confirmarOrden);

// RUTA 3: Webhook de PayPal
// POST /api/paypal/webhook
// (PayPal enviará notificaciones aquí)
router.post('/webhook', paypalController.manejarWebhook);

// RUTA 4: Obtener estado de transacción
// GET /api/paypal/transaccion/:id
router.get('/transaccion/:id', paypalController.obtenerTransaccion);

module.exports = router;
```

---

## paypal.controller.js - Lógica de Negocio

```javascript
const fetch = require('node-fetch');
const Donacion = require('../models/Donacion');

// Credenciales de PayPal
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';

// URLs según ambiente
const PAYPAL_API_URL = PAYPAL_ENV === 'production'
  ? 'https://api.paypal.com'
  : 'https://api.sandbox.paypal.com';

/**
 * PASO 1: Crear orden en PayPal
 * POST /api/paypal/crear-orden
 */
exports.crearOrden = async (req, res) => {
  try {
    const { monto, descripcion } = req.body;

    // ✅ VALIDACIÓN SEGURA
    if (isNaN(monto) || monto < 1 || monto > 9999) {
      return res.status(400).json({
        error: 'Monto inválido',
        detalle: 'El monto debe estar entre 1 y 9999 USD'
      });
    }

    const montosPermitidos = [1, 5, 10, 20, 50, 100];
    if (!montosPermitidos.includes(parseFloat(monto)) && monto < 500) {
      return res.status(400).json({
        error: 'Monto no permitido',
        detalle: 'Montos permitidos: 1, 5, 10, 20, 50, 100 USD (o 500+ personalizado)'
      });
    }

    console.log(`📦 Creando orden: ${monto} USD`);

    // ✅ AUTH SEGURA
    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`
    ).toString('base64');

    // ✅ CREAR ORDEN EN PAYPAL
    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: monto.toString()
          },
          description: descripcion || 'Donación para CarritoControl'
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'CarritoControl',
              locale: 'es_ES',
              return_url: 'https://tu-app.com/donaciones/exito',
              cancel_url: 'https://tu-app.com/donaciones/cancelado'
            }
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error PayPal:', error);
      return res.status(400).json({
        error: 'No se pudo crear la orden',
        detalles: error.message
      });
    }

    const orden = await response.json();

    // ✅ GUARDAR EN BASE DE DATOS
    const donacion = new Donacion({
      ordenId: orden.id,
      monto: monto,
      estado: 'CREADA',
      criadaEn: new Date(),
      detalles: {
        ambiente: PAYPAL_ENV,
        descripcion: descripcion,
        links: orden.links
      }
    });

    await donacion.save();

    console.log(`✅ Orden creada: ${orden.id}`);

    res.json({
      id: orden.id,
      status: orden.status,
      monto: monto,
      ambiente: PAYPAL_ENV
    });

  } catch (error) {
    console.error('❌ Error creando orden:', error);
    res.status(500).json({
      error: 'Error interno',
      mensaje: error.message
    });
  }
};

/**
 * PASO 2: Confirmar/Capturar orden
 * POST /api/paypal/confirmar-orden
 */
exports.confirmarOrden = async (req, res) => {
  try {
    const { ordenId } = req.body;

    if (!ordenId) {
      return res.status(400).json({
        error: 'ID de orden requerido'
      });
    }

    console.log(`💰 Capturando orden: ${ordenId}`);

    // ✅ AUTH SEGURA
    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`
    ).toString('base64');

    // ✅ CAPTURAR ORDEN EN PAYPAL
    const response = await fetch(
      `${PAYPAL_API_URL}/v2/checkout/orders/${ordenId}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error capturando orden:', error);
      
      // Actualizar estado a RECHAZADA
      await Donacion.findOneAndUpdate(
        { ordenId: ordenId },
        { estado: 'RECHAZADA', error: error.message }
      );

      return res.status(400).json({
        exito: false,
        error: 'Pago rechazado',
        detalles: error.message
      });
    }

    const ordenCapturada = await response.json();

    if (ordenCapturada.status === 'COMPLETED') {
      const detalles = {
        transaccionId: ordenCapturada.purchase_units[0].payments.captures[0].id,
        monto: ordenCapturada.purchase_units[0].amount.value,
        email: ordenCapturada.payer.email_address,
        nombre: ordenCapturada.payer.name.given_name,
        apellido: ordenCapturada.payer.name.surname,
        fecha: new Date(),
        estado: 'COMPLETADO'
      };

      // ✅ ACTUALIZAR BD
      await Donacion.findOneAndUpdate(
        { ordenId: ordenId },
        {
          estado: 'CONFIRMADA',
          transaccionId: detalles.transaccionId,
          email: detalles.email,
          nombre: detalles.nombre,
          apellido: detalles.apellido,
          confirmadaEn: new Date(),
          detalles: ordenCapturada
        }
      );

      console.log(`✅ Pago confirmado: ${detalles.transaccionId}`);

      // ✅ ENVIAR EMAIL DE CONFIRMACIÓN (OPCIONAL)
      // await enviarEmailConfirmacion(detalles);

      res.json({
        exito: true,
        transaccionId: detalles.transaccionId,
        monto: detalles.monto,
        email: detalles.email,
        mensaje: `¡Gracias ${detalles.nombre}! Tu donación de $${detalles.monto} USD ha sido recibida.`
      });

    } else {
      return res.status(400).json({
        exito: false,
        error: 'Estado de pago inesperado',
        estado: ordenCapturada.status
      });
    }

  } catch (error) {
    console.error('❌ Error confirmando orden:', error);
    res.status(500).json({
      exito: false,
      error: 'Error interno',
      mensaje: error.message
    });
  }
};

/**
 * PASO 3: Webhook - Recibir notificaciones de PayPal
 * POST /api/paypal/webhook
 */
exports.manejarWebhook = async (req, res) => {
  try {
    const evento = req.body;

    console.log(`📨 Webhook recibido: ${evento.event_type}`);

    // Tipos de eventos importantes
    switch (evento.event_type) {
      case 'CHECKOUT.ORDER.CREATED':
        console.log('✅ Orden creada:', evento.resource.id);
        break;

      case 'CHECKOUT.ORDER.APPROVED':
        console.log('✅ Orden aprobada:', evento.resource.id);
        await Donacion.findOneAndUpdate(
          { ordenId: evento.resource.id },
          { estado: 'APROBADA', aprobadaEn: new Date() }
        );
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('✅ Pago capturado:', evento.resource.id);
        // Enviar email, actualizar contabilidad, etc.
        break;

      case 'PAYMENT.CAPTURE.DECLINED':
        console.log('❌ Pago rechazado:', evento.resource.id);
        await Donacion.findOneAndUpdate(
          { 'detalles.transaccionId': evento.resource.id },
          { estado: 'RECHAZADA', error: 'Rechazado por PayPal' }
        );
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        console.log('⚠️ Reembolso:', evento.resource.id);
        await Donacion.findOneAndUpdate(
          { 'detalles.transaccionId': evento.resource.id },
          { estado: 'REEMBOLSADA', reembolsadaEn: new Date() }
        );
        break;
    }

    // ✅ Responder a PayPal que recibimos la notificación
    res.status(200).json({
      resultado: 'Notificación procesada',
      eventoId: evento.id
    });

  } catch (error) {
    console.error('❌ Error en webhook:', error);
    res.status(200).json({ resultado: 'Notificación procesada (con error)' });
  }
};

/**
 * PASO 4: Obtener estado de transacción
 * GET /api/paypal/transaccion/:id
 */
exports.obtenerTransaccion = async (req, res) => {
  try {
    const { id } = req.params;

    const donacion = await Donacion.findOne({
      $or: [
        { ordenId: id },
        { 'detalles.transaccionId': id }
      ]
    });

    if (!donacion) {
      return res.status(404).json({
        error: 'Transacción no encontrada'
      });
    }

    res.json({
      id: donacion._id,
      ordenId: donacion.ordenId,
      monto: donacion.monto,
      estado: donacion.estado,
      email: donacion.email,
      criadaEn: donacion.criadaEn,
      confirmadaEn: donacion.confirmadaEn
    });

  } catch (error) {
    console.error('❌ Error obteniendo transacción:', error);
    res.status(500).json({
      error: 'Error interno'
    });
  }
};
```

---

## Donacion.js - Modelo Mongoose

```javascript
const mongoose = require('mongoose');

const donacionSchema = new mongoose.Schema({
  // IDs de la transacción
  ordenId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  transaccionId: String,

  // Información de pago
  monto: {
    type: Number,
    required: true,
    min: 1,
    max: 99999
  },
  moneda: {
    type: String,
    default: 'USD'
  },

  // Información del donante
  email: String,
  nombre: String,
  apellido: String,

  // Estado
  estado: {
    type: String,
    enum: [
      'CREADA',        // Recién creada en la app
      'APROBADA',      // Usuario autorizó en PayPal
      'CONFIRMADA',    // Dinero capturado
      'RECHAZADA',     // PayPal rechazó
      'REEMBOLSADA',   // Se devolvió el dinero
      'CANCELADA'      // Usuario canceló
    ],
    default: 'CREADA',
    index: true
  },
  error: String,

  // Timestamps
  criadaEn: {
    type: Date,
    default: Date.now,
    index: true
  },
  aprobadaEn: Date,
  confirmadaEn: Date,
  reembolsadaEn: Date,

  // Detalles completos de PayPal
  detalles: mongoose.Schema.Types.Mixed,

  // Metadata
  ip: String,
  userAgent: String
});

// Índices para búsqueda rápida
donacionSchema.index({ email: 1, criadaEn: -1 });
donacionSchema.index({ estado: 1, criadaEn: -1 });
donacionSchema.index({ transaccionId: 1 });

module.exports = mongoose.model('Donacion', donacionSchema);
```

---

## Ejemplo de Uso Completo

### 1. Cliente (Angular/Ionic)

```typescript
// En el componente de donaciones
async donar(monto: number) {
  try {
    // PASO 1: Obtener orden del servidor
    const resultado = await this.donacionesService.procesarDonacion(monto);
    
    if (!resultado.exito) {
      this.mostrarError(resultado.error);
      return;
    }

    // PASO 2: El SDK de PayPal se encargará del resto
    console.log('✅ Donación en progreso...');

  } catch (error) {
    this.mostrarError('Error procesando donación');
  }
}
```

### 2. Servidor recibe la solicitud

```
POST /api/paypal/crear-orden
{
  "monto": 10,
  "descripcion": "Donación para CarritoControl"
}

RESPUESTA:
{
  "id": "4TR24850CK908122T",
  "status": "CREATED",
  "monto": 10,
  "ambiente": "sandbox"
}
```

### 3. Usuario autoriza en PayPal (dentro de la app)

4. Servidor captura el pago

```
POST /api/paypal/confirmar-orden
{
  "ordenId": "4TR24850CK908122T"
}

RESPUESTA:
{
  "exito": true,
  "transaccionId": "8JV94796XF663844V",
  "monto": "10",
  "email": "usuario@example.com",
  "mensaje": "¡Gracias por tu donación!"
}
```

---

## Testing

### Test Local (Sandbox)

1. **Iniciar servidor:**
   ```bash
   node server.js
   ```

2. **Crear orden:**
   ```bash
   curl -X POST http://localhost:3000/api/paypal/crear-orden \
     -H "Content-Type: application/json" \
     -d '{"monto": 10}'
   ```

3. **Confirmar orden:**
   ```bash
   curl -X POST http://localhost:3000/api/paypal/confirmar-orden \
     -H "Content-Type: application/json" \
     -d '{"ordenId": "4TR24850CK908122T"}'
   ```

---

**Última actualización**: 18 de diciembre de 2025
**Estado**: ✅ Listo para implementación
