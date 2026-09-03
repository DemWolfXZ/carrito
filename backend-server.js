/**
 * 🚀 Backend PayPal - Servidor Express para Testing
 *
 * Este servidor implementa los 3 endpoints necesarios para procesar donaciones:
 * 1. POST /api/paypal/crear-orden
 * 2. POST /api/paypal/confirmar-orden
 * 3. POST /api/paypal/webhook
 *
 * Instalación:
 *   npm install express cors dotenv
 *
 * Uso:
 *   node backend-server.js
 *
 * Disponible en:
 *   http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:8100', 'http://127.0.0.1:8100'],
  credentials: true
}));

// Simular base de datos en memoria (para testing)
const ordenesSimuladas = new Map();

/**
 * ========== RUTAS ==========
 */

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    message: '✅ Backend CarritoControl funcionando'
  });
});

/**
 * RUTA 1: Crear orden en PayPal
 * POST /api/paypal/crear-orden
 *
 * Body: { monto: 10, descripcion: "Donación para CarritoControl", currency: "USD" }
 *
 * Respuesta: { id: "ORDER-ID", status: "CREATED", monto: 10 }
 */
app.post('/api/paypal/crear-orden', (req, res) => {
  try {
    const { monto, descripcion = 'Donación', currency = 'USD' } = req.body;

    console.log(`📦 Creando orden: ${monto} ${currency}`);

    // Validar monto
    if (!monto || isNaN(monto) || monto < 1 || monto > 9999) {
      return res.status(400).json({
        error: 'Monto inválido',
        detalle: 'El monto debe estar entre 1 y 9999'
      });
    }

    // Generar ID de orden único
    const ordenId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simular creación de orden
    const orden = {
      id: ordenId,
      status: 'CREATED',
      monto: monto,
      currency: currency,
      descripcion: descripcion,
      creada: new Date(),
      confirmada: false
    };

    // Guardar en "base de datos" simulada
    ordenesSimuladas.set(ordenId, orden);

    console.log(`✅ Orden creada: ${ordenId}`);

    res.json({
      id: ordenId,
      status: 'CREATED',
      monto: monto,
      currency: currency,
      mensaje: 'Orden creada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando orden:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: error.message
    });
  }
});

/**
 * RUTA 2: Confirmar orden (simular captura de pago)
 * POST /api/paypal/confirmar-orden
 *
 * Body: { ordenId: "ORDER-ID" }
 *
 * Respuesta: { exito: true, transaccionId: "TRANS-ID", monto: 10 }
 */
app.post('/api/paypal/confirmar-orden', (req, res) => {
  try {
    const { ordenId } = req.body;

    console.log(`💰 Confirmando orden: ${ordenId}`);

    // Validar que la orden existe
    const orden = ordenesSimuladas.get(ordenId);
    if (!orden) {
      return res.status(404).json({
        exito: false,
        error: 'Orden no encontrada',
        ordenId: ordenId
      });
    }

    // Simular confirmación exitosa
    // En producción, aquí verificarías con la API de PayPal
    const transaccionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Actualizar orden
    orden.confirmada = true;
    orden.transaccionId = transaccionId;
    orden.confirmadaEn = new Date();
    orden.email = 'usuario@example.com'; // En producción, vendría de PayPal
    orden.nombre = 'Usuario';
    ordenesSimuladas.set(ordenId, orden);

    console.log(`✅ Orden confirmada: ${transaccionId}`);

    res.json({
      exito: true,
      transaccionId: transaccionId,
      ordenId: ordenId,
      monto: orden.monto,
      currency: orden.currency,
      email: orden.email,
      nombre: orden.nombre,
      mensaje: `¡Gracias! Tu donación de $${orden.monto} ${orden.currency} ha sido procesada.`
    });

  } catch (error) {
    console.error('❌ Error confirmando orden:', error);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      mensaje: error.message
    });
  }
});

/**
 * RUTA 3: Webhook - Recibir notificaciones de PayPal
 * POST /api/paypal/webhook
 *
 * (En producción, PayPal enviaría notificaciones aquí)
 */
app.post('/api/paypal/webhook', (req, res) => {
  try {
    const evento = req.body;

    console.log(`📨 Webhook recibido:`, evento.event_type || 'unknown');

    // En producción, aquí procesarías eventos de PayPal
    // Por ahora, solo confirmamos recepción

    res.status(200).json({
      resultado: 'Notificación procesada',
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Error en webhook:', error);
    res.status(200).json({ resultado: 'Procesado con error' });
  }
});

/**
 * RUTA DEBUG: Ver todas las órdenes (solo para testing)
 * GET /api/debug/ordenes
 */
app.get('/api/debug/ordenes', (req, res) => {
  const ordenes = Array.from(ordenesSimuladas.values());
  res.json({
    total: ordenes.length,
    ordenes: ordenes
  });
});

/**
 * RUTA DEBUG: Limpiar órdenes (solo para testing)
 * POST /api/debug/limpiar
 */
app.post('/api/debug/limpiar', (req, res) => {
  ordenesSimuladas.clear();
  res.json({ mensaje: 'Órdenes limpiadas' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    mensaje: err.message
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🚀 Backend CarritoControl - PayPal Integration        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Servidor ejecutándose en: http://localhost:${PORT}`);
  console.log('\n📝 Endpoints disponibles:');
  console.log('   POST   http://localhost:3000/api/paypal/crear-orden');
  console.log('   POST   http://localhost:3000/api/paypal/confirmar-orden');
  console.log('   POST   http://localhost:3000/api/paypal/webhook');
  console.log('\n🔍 Debug:');
  console.log('   GET    http://localhost:3000/api/debug/ordenes');
  console.log('   POST   http://localhost:3000/api/debug/limpiar');
  console.log('\n❤️  Health:');
  console.log('   GET    http://localhost:3000/health');
  console.log('\n');
});
