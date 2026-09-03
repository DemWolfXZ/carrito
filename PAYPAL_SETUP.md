# Integración PayPal - CarritoControl

## 📋 Configuración Inicial (IMPORTANTE)

### Paso 1: Crear Cuenta de Sandbox en PayPal

1. Ir a: https://developer.paypal.com
2. Crear una cuenta (o inicia sesión)
3. Ir a **Sandbox Accounts**
4. Crear dos cuentas de prueba:
   - **Vendedor (Business)**: Recibe las donaciones
   - **Comprador (Personal)**: Realiza la donación

### Paso 2: Obtener tus Credenciales

1. En Dashboard de PayPal, busca tu **Client ID** (App ID)
2. Anota tu **Email de Business Account** (recibirá las donaciones)

### Paso 3: Configurar la App

En `src/app/core/services/donaciones.service.ts`, reemplaza:

```typescript
// Reemplazar estos valores:
private PAYPAL_SANDBOX_CLIENT_ID = 'AezJRYjm2VhBvAb8jfO0A2ijvGUuCKMwmRCJ7LS-QqGPgYJUd5OjhGAK7q6TYuUEqA3sO5uL3UbvDcTQ';
private PAYPAL_RECEIVER_EMAIL = 'sb-p8jxn28859627@business.example.com';
```

Con:

```typescript
// TUS credenciales de sandbox:
private PAYPAL_SANDBOX_CLIENT_ID = 'TU_CLIENT_ID_AQUI';
private PAYPAL_RECEIVER_EMAIL = 'TU_EMAIL_BUSINESS_SANDBOX@business.example.com';
```

## 🧪 Pruebas en Sandbox

### Flujo de Prueba:

1. Abre la app en tu teléfono/emulador
2. Ve a **Configuraciones** → **Apoya el Desarrollo** → **Hacer una Donación**
3. Selecciona un monto (Ej: $1 USD)
4. Se abrirá PayPal automáticamente
5. **Usa la cuenta COMPRADOR para hacer el pago**:
   - Email: `sb-buyer-12345@personal.example.com` (de tu sandbox)
   - Password: La que creaste en sandbox

### Tarjetas de Prueba Disponibles:

**Pago Exitoso:**
- Número: `4111 1111 1111 1111`
- Mes: `12`
- Año: `2025`
- CVV: `123`

**Pago Rechazado:**
- Número: `5555 5555 5555 4444`

## 📱 Integración con Backend (RECOMENDADO para Producción)

**IMPORTANTE**: Para producción, necesitas:

1. **Backend Webhook (IPN - Instant Payment Notification)**
   - PayPal enviará confirmación a tu servidor
   - Tu servidor verificará y registrará la donación
   - Endpoint: `POST /api/paypal-ipn`

2. **Verificación de Pago**
   - No confíes solo en el cliente
   - Siempre verifica en tu backend con PayPal

3. **Ejemplo de Backend (Node.js/Express):**

```javascript
// POST /api/paypal-ipn
app.post('/api/paypal-ipn', async (req, res) => {
  const ipnData = req.body;
  
  // Verificar con PayPal que es genuino
  const verificationUrl = 'https://www.sandbox.paypal.com/cgi-bin/webscr';
  
  // ... código de verificación ...
  
  if (ipnData.payment_status === 'Completed') {
    // Registrar donación en BD
    await registrarDonacion({
      monto: ipnData.mc_gross,
      transaccionId: ipnData.txn_id,
      email: ipnData.payer_email
    });
  }
  
  res.status(200).send('OK');
});
```

## 🌍 Multi-País (PayPal)

PayPal soporta **200+ países** y **100+ divisas**.

Para ajustar por país:

```typescript
private obtenerDivisaPorPais(pais: string): string {
  const divisas: { [key: string]: string } = {
    'CL': 'CLP',  // Chile - Peso Chileno
    'AR': 'ARS',  // Argentina - Peso Argentino
    'MX': 'MXN',  // México - Peso Mexicano
    'CO': 'COP',  // Colombia - Peso Colombiano
    'PE': 'PEN',  // Perú - Sol Peruano
    'US': 'USD',  // USA - Dólar
    'ES': 'EUR',  // España - Euro
  };
  return divisas[pais] || 'USD';
}
```

## 🔒 Seguridad

✅ **Buenas Prácticas Implementadas:**
- Client ID solo para flujo en navegador
- No enviamos datos de pago por la app
- PayPal maneja toda la seguridad PCI
- IPN signature verification (cuando implementes backend)

⚠️ **Próximas Mejoras:**
- Implementar webhook de IPN
- Verificación en backend
- Manejo de fallos de pago
- Historial de donaciones en BD

## 🚀 Para Ir a Producción

1. Crear cuenta **PayPal Business**
2. Cambiar URLs:
   ```typescript
   private PAYPAL_SANDBOX_URL = 'https://www.paypal.com'; // Producción
   ```
3. Usar **Production Client ID** y **Email**
4. Configurar **Webhook de Producción** en PayPal
5. Implementar verificación en backend

## 📞 Soporte PayPal

- Developer Dashboard: https://developer.paypal.com
- Docs: https://developer.paypal.com/docs
- Community: https://github.com/paypal

## ✅ Checklist de Integración

- [ ] Cuenta de Sandbox creada
- [ ] Client ID obtenido
- [ ] Email de Business anotado
- [ ] Valores actualizados en donaciones.service.ts
- [ ] npm install (para @capacitor/browser)
- [ ] Prueba con tarjeta de sandbox
- [ ] Mensaje de éxito aparece
- [ ] Transacción visible en PayPal Dashboard

---

**Nota**: Esta integración usa flujo PDT (Payment Data Transfer).
Para máxima seguridad, implementa IPN webhook en producción.
