# 🔒 PayPal - Guía Completa de Seguridad

## Estado Actual de la Integración

- **Tipo**: JavaScript SDK + Backend (Orders API v2)
- **Ubicación**: Modal dentro de la app (sin salir)
- **Modelo de Seguridad**: Cliente-Servidor seguro
- **PCI Compliance**: ✅ No almacenamos datos de tarjeta

---

## Arquitectura de Seguridad

### Flujo Seguro de Pago

```
┌─────────────────────────────────────────────────────┐
│                    APP (CLIENTE)                     │
│  - Carga SDK de PayPal                              │
│  - Muestra formulario PayPal                        │
│  - Envía orden ID al servidor                       │
│  ⚠️ NUNCA maneja datos de tarjeta                   │
└──────────────┬──────────────────────────────────────┘
               │
               │ 1. POST /paypal/crear-orden (monto)
               │
┌──────────────▼──────────────────────────────────────┐
│                  BACKEND (SEGURO)                    │
│  - Valida monto                                      │
│  - Llama API de PayPal con SECRET                    │
│  - Retorna orden ID al cliente                      │
│  ✅ Mantiene credenciales seguras                   │
└──────────────┬──────────────────────────────────────┘
               │
               │ 2. Retorna: { id: "XXXX", status: "CREATED" }
               │
┌──────────────▼──────────────────────────────────────┐
│                    APP (CLIENTE)                     │
│  - Muestra botón de PayPal con orden ID             │
│  - Usuario autoriza el pago                         │
└──────────────┬──────────────────────────────────────┘
               │
               │ 3. POST /paypal/confirmar-orden (ordenId)
               │
┌──────────────▼──────────────────────────────────────┐
│                  BACKEND (SEGURO)                    │
│  - Verifica orden con PayPal API                    │
│  - Confirm captura el dinero                        │
│  - Registra transacción en DB                       │
│  - Retorna confirmación                             │
└──────────────┬──────────────────────────────────────┘
               │
               │ 4. { exito: true, transaccionId: "XXX" }
               │
┌──────────────▼──────────────────────────────────────┐
│                    APP (CLIENTE)                     │
│  ✅ Muestra confirmación al usuario                 │
│  ✅ Modal se cierra                                 │
└─────────────────────────────────────────────────────┘
```

---

## Detalles de Seguridad

### 1️⃣ Autenticación y Credenciales

**En el CLIENTE (src/app/core/services/donaciones.service.ts)**
```typescript
// ✅ SEGURO: Solo necesita Client ID (público)
private PAYPAL_CLIENT_ID = 'AezJRYjm2VhBvAb8jfO0A2ijvGUuCKMwmRCJ7LS-QqGPgYJUd5OjhGAK7q6TYuUEqA3sO5uL3UbvDcTQ';

// ❌ NUNCA aquí: No guardar SECRET en el cliente
// private PAYPAL_SECRET = 'XXXXX'; // ← NUNCA HACER ESTO
```

**En el SERVIDOR (Backend Node.js/Express - tu servidor)**
```javascript
// ✅ SEGURO: Secret SOLO en el servidor
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET; // Var de entorno

const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
// Usar auth en headers: Authorization: Basic {auth}
```

---

### 2️⃣ No Almacenamos Datos de Tarjeta (PCI Compliance)

**Lo que el cliente NUNCA hace:**
- ❌ Capturar número de tarjeta
- ❌ Capturar CVV
- ❌ Capturar fecha de vencimiento
- ❌ Enviar datos de tarjeta al servidor

**Cómo PayPal lo maneja:**
- ✅ Usuario ingresa datos en PayPal (sitio seguro de PayPal)
- ✅ Nosotros solo vemos: Confirmación + ID de transacción
- ✅ Cumplimos PCI DSS automáticamente

---

### 3️⃣ HTTPS Obligatorio

**En Producción:**
```
Todas las URLs deben ser HTTPS:
- https://tu-servidor.com/api/paypal/* ✅
- http://tu-servidor.com/api/paypal/* ❌ NO PERMITIDO
```

**En Desarrollo (Testing):**
```
Para desarrollo local, PayPal permite:
- http://localhost:3000/* ✅ (solo localhost)
- http://127.0.0.1:3000/* ✅ (solo loopback)
- http://192.168.x.x:3000/* ❌ NO (debe ser HTTPS para otras IPs)
```

---

### 4️⃣ Validación en el Backend

**PASO 1: Validar monto en el servidor**
```javascript
// Backend - POST /paypal/crear-orden
const monto = req.body.monto;

// Validar que sea número válido
if (isNaN(monto) || monto < 1 || monto > 9999) {
  return res.status(400).json({ error: 'Monto inválido' });
}

// Montos permitidos (ejemplo)
const montosPermitidos = [1, 5, 10, 20];
if (!montosPermitidos.includes(monto)) {
  return res.status(400).json({ error: 'Monto no permitido' });
}
```

**PASO 2: Crear orden en PayPal API**
```javascript
const fetch = require('node-fetch');

async function crearOrdenPayPal(monto) {
  const url = 'https://api.sandbox.paypal.com/v2/checkout/orders';
  
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`
  ).toString('base64');

  const response = await fetch(url, {
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
        description: 'Donación para CarritoControl'
      }],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: 'https://tu-app.com/donaciones/exito',
            cancel_url: 'https://tu-app.com/donaciones/cancelado'
          }
        }
      }
    })
  });

  return response.json();
}
```

**PASO 3: Confirmar/Capturar orden**
```javascript
async function confirmarOrdenPayPal(ordenId) {
  const url = `https://api.sandbox.paypal.com/v2/checkout/orders/${ordenId}/capture`;
  
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`
  ).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  // Verificar que la captura fue exitosa
  if (data.status === 'COMPLETED') {
    // Registrar en base de datos
    await guardarDonacionEnBD({
      ordenId: data.id,
      monto: data.purchase_units[0].amount.value,
      email: data.payer.email_address,
      fecha: new Date(),
      estado: 'CONFIRMADO'
    });
    
    return { exito: true, transaccionId: data.id };
  }

  return { exito: false, error: 'Pago no confirmado' };
}
```

---

### 5️⃣ IPN Webhook (Notificaciones de PayPal)

**¿Qué es IPN?**
- PayPal te notifica cuando un pago se completa
- Es una capa adicional de seguridad
- Útil si la conexión se cae a mitad de pago

**Implementar Webhook en tu Backend:**
```javascript
// Express.js ejemplo
const express = require('express');
const app = express();

// POST /paypal-webhook
// PayPal enviará notificaciones aquí
app.post('/paypal-webhook', async (req, res) => {
  const webhookEvent = req.body;

  // Tipos de eventos importantes
  if (webhookEvent.event_type === 'CHECKOUT.ORDER.APPROVED') {
    console.log('✅ Orden aprobada:', webhookEvent.resource.id);
    // Actualizar estado en BD
  }

  if (webhookEvent.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    console.log('✅ Pago capturado:', webhookEvent.resource.id);
    // Enviar email de confirmación
    // Registrar en contabilidad
  }

  if (webhookEvent.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
    console.log('⚠️ Reembolso:', webhookEvent.resource.id);
    // Actualizar BD - marcar como reembolsado
  }

  res.status(200).json({ received: true });
});
```

**Configurar en PayPal Dashboard:**
1. Ir a: https://www.sandbox.paypal.com/signin
2. Account Settings → Notifications → Webhooks
3. URL: https://tu-servidor.com/paypal-webhook
4. Seleccionar eventos: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED, etc.

---

### 6️⃣ Variables de Entorno

**NUNCA hacer esto:**
```javascript
// ❌ MALO - Credenciales en código
const PAYPAL_SECRET = 'ABC123xyz...';
```

**SIEMPRE hacer esto:**
```javascript
// ✅ BIEN - Variables de entorno
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox'; // 'sandbox' o 'production'
```

**Archivo .env en tu servidor (NO SUBIR A GIT):**
```env
PAYPAL_CLIENT_ID=YOUR_SANDBOX_CLIENT_ID
PAYPAL_SECRET=YOUR_SANDBOX_SECRET
PAYPAL_ENV=sandbox
DATABASE_URL=mongodb://...
JWT_SECRET=...
```

**Agregar a .gitignore:**
```
.env
.env.local
.env.*.local
node_modules/
dist/
```

---

### 7️⃣ Testing de Seguridad

**Tarjetas de prueba PayPal (Sandbox):**

| Tipo | Número | Expiración | CVV | Resultado |
|------|--------|-----------|-----|-----------|
| Visa Exitosa | 4111 1111 1111 1111 | 12/2025 | 123 | ✅ Aprobado |
| Visa Rechazada | 5555 5555 5555 4444 | 12/2025 | 123 | ❌ Rechazado |
| Mastercard | 5105 1051 0510 5100 | 12/2025 | 123 | ✅ Aprobado |
| Amex | 378282246310005 | 12/2025 | 123 | ✅ Aprobado |

**Probar Rechazo:**
```
Monto: 1930 → Rechazo (simula falta de fondos)
Monto: 1933 → Rechazo (simula tarjeta robada)
Monto: 1932 → Rechazo (simula 3D Secure falla)
```

---

### 8️⃣ Migración a Producción

**Paso 1: Obtener credenciales LIVE**
1. PayPal Dashboard: https://www.paypal.com/signin
2. Account Settings → API Signature
3. Copiar: Client ID LIVE y Secret LIVE

**Paso 2: Actualizar variables de entorno**
```env
PAYPAL_CLIENT_ID=YOUR_PRODUCTION_CLIENT_ID
PAYPAL_SECRET=YOUR_PRODUCTION_SECRET
PAYPAL_ENV=production
```

**Paso 3: Cambiar URLs**
```typescript
// En donaciones.service.ts
private PAYPAL_SANDBOX_URL = 'https://www.paypal.com'; // Cambiar de sandbox
```

**Paso 4: Cambiar URLs en Backend**
```javascript
// En tu servidor
const API_URL = process.env.PAYPAL_ENV === 'production'
  ? 'https://api.paypal.com'      // Production
  : 'https://api.sandbox.paypal.com'; // Sandbox
```

**Paso 5: Verificar HTTPS**
```
Todos los endpoints deben ser HTTPS en producción:
https://tu-app.com/donaciones ✅
https://tu-servidor.com/api/paypal/* ✅
```

---

## Checklist de Seguridad

### Antes de ir a Producción

- [ ] Client ID y Secret en variables de entorno
- [ ] Secret NUNCA en cliente, SIEMPRE en servidor
- [ ] HTTPS activado en todas las URLs
- [ ] Validación de monto en backend
- [ ] IPN webhook configurado
- [ ] Base de datos segura (credenciales en .env)
- [ ] Logs de transacciones activos
- [ ] Certificado SSL válido (no auto-firmado)
- [ ] Rate limiting en endpoints (/api/paypal/*)
- [ ] CORS configurado correctamente

### En Producción

- [ ] Monitorear IPN webhooks
- [ ] Alertas si hay rechazo de pagos
- [ ] Backup diario de base de datos
- [ ] Revisar logs de seguridad semanalmente
- [ ] Refunds: Implementar proceso manual/automático
- [ ] Soporte: Canal para consultas sobre donaciones

---

## Contacto PayPal en Caso de Problemas

- **Documentación**: https://developer.paypal.com/docs/
- **Sandbox**: https://sandbox.paypal.com
- **Production**: https://www.paypal.com
- **Support**: developer.paypal.com/support
- **Community**: forums.paypal.com

---

## Referencias de Seguridad

1. **PCI DSS**: https://www.pcisecuritystandards.org/
2. **OWASP Top 10**: https://owasp.org/www-project-top-ten/
3. **PayPal SDK Docs**: https://developer.paypal.com/sdk/js/
4. **REST API Docs**: https://developer.paypal.com/docs/api/
5. **Seguridad Web**: https://cheatsheetseries.owasp.org/

---

**Última actualización**: 18 de diciembre de 2025
**Estado**: ✅ Listo para implementación
