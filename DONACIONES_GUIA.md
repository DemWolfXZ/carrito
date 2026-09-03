# 🚀 Integración de Donaciones - Guía Rápida

## ✅ Status Actual

**Integración PayPal completada con:**
- ✅ Flujo PDT (Payment Data Transfer)
- ✅ Sandbox habilitado para pruebas
- ✅ Soporte multi-país
- ✅ Moneda en USD (personalizable)
- ✅ UI integrada en el modal de donaciones

---

## 📱 Cómo Probar (SIN DINERO REAL)

### Paso 1: Crear tu Cuenta Sandbox
1. Ve a https://developer.paypal.com
2. Inicia sesión con tu cuenta PayPal personal
3. En **Sandbox Accounts**, crearás 2 cuentas automáticamente:
   - **Business Account** (recibe dinero)
   - **Personal Account** (hace pagos)

### Paso 2: Copiar tus Credenciales

En el Dashboard, busca:
- **Merchant Account (Business)**
  - Email: `sb-xxxxx@business.example.com` ← COPIA ESTO
  - Client ID: Ve a "App" y copia el ID ← COPIA ESTO

### Paso 3: Actualizar la App

Abre `src/app/core/services/donaciones.service.ts` y reemplaza:

```typescript
// Línea ~23
private PAYPAL_SANDBOX_CLIENT_ID = 'AezJRYjm2VhBvAb8...';
// ↓ Reemplaza con tu CLIENT ID

private PAYPAL_RECEIVER_EMAIL = 'sb-xxxxx@business.example.com';
// ↓ Reemplaza con tu EMAIL de BUSINESS
```

### Paso 4: Compilar y Ejecutar

```bash
# Instalar dependencias
npm install

# Compilar
ng build --configuration development

# Sincronizar con Android
ionic capacitor sync android

# Abrir en Android Studio y ejecutar
```

### Paso 5: Probar la Donación

1. Abre la app en tu teléfono
2. Ve a: **Configuraciones** → **Apoya el Desarrollo** → **Hacer una Donación**
3. Selecciona un monto (ej: $1 USD)
4. Se abrirá automáticamente PayPal
5. **Usa la cuenta PERSONAL (Comprador)** para simular el pago:
   ```
   Email: sb-xxxxx@personal.example.com
   Password: La que creaste en Sandbox
   ```
6. Completa el pago con una tarjeta de prueba

### Tarjetas de Prueba (Sandbox)

**Pago EXITOSO:**
```
Número: 4111 1111 1111 1111
Mes: 12
Año: 2025
CVV: 123
```

**Pago RECHAZADO:**
```
Número: 5555 5555 5555 4444
```

---

## 🔧 Customizaciones

### Cambiar Montos de Donación

En `donaciones.service.ts`, línea ~35:

```typescript
private opcionesDonacion: OpcionDonacion[] = [
  { monto: 2, label: '2 USD - Desayuno 🥐', emoji: '🥐' },
  { monto: 10, label: '10 USD - Almuerzo 🍽️', emoji: '🍽️' },
  // Agrega más opciones...
];
```

### Cambiar Divisa (para Producción)

```typescript
// En el método construirUrlPayPal()
'currency_code': 'CLP',  // CLP para Chile, ARS para Argentina, etc.
'amount': this.convertirADivisa(monto).toString(), // Convertir USD a local
```

### Agregar tu Logo

En `construirUrlPayPal()`:

```typescript
'image_url': 'https://tu-dominio.com/logo.png', // URL de tu logo
```

---

## 🌍 Multi-País

PayPal soporta **200+ países** y **100+ monedas**.

**Divisas populares:**
- 🇨🇱 CLP (Chile)
- 🇦🇷 ARS (Argentina)
- 🇲🇽 MXN (México)
- 🇨🇴 COP (Colombia)
- 🇵🇪 PEN (Perú)
- 🇺🇸 USD (USA)
- 🇪🇸 EUR (Europa)

Para implementar selección automática por país, en el servicio:

```typescript
private obtenerDivisaPorPais(pais: string): string {
  const mapa = { 'CL': 'CLP', 'AR': 'ARS', 'MX': 'MXN' };
  return mapa[pais] || 'USD';
}
```

---

## 🚨 Para Ir a Producción

**IMPORTANTE**: Necesitas hacer esto antes de liberar a usuarios reales:

### 1. Crear Cuenta Business de Producción
- Ir a www.paypal.com
- Crear cuenta "PayPal Business"
- Hacer verificación de identidad

### 2. Cambiar Credenciales
```typescript
private PAYPAL_SANDBOX_URL = 'https://www.paypal.com'; // Cambiar a producción
private PAYPAL_SANDBOX_CLIENT_ID = 'TU_PRODUCTION_CLIENT_ID';
private PAYPAL_RECEIVER_EMAIL = 'tuempresa@miempresa.com';
```

### 3. Implementar Backend Webhook (IPN)
**ESTO ES CRÍTICO**: No confíes solo en el cliente.

Tu servidor debe:
1. Recibir notificación de PayPal
2. Verificar la transacción
3. Guardar en BD
4. Registrar la donación

Ejemplo endpoint:
```
POST /api/donations/webhook
Body: {
  txn_id: "ABC123",
  mc_gross: "10.00",
  payer_email: "usuario@example.com",
  payment_status: "Completed"
}
```

### 4. Configurar Webhook en PayPal
1. Ir a PayPal Account Settings
2. Integrations → Webhooks
3. Agregar URL: `https://tudominio.com/api/donations/webhook`
4. Seleccionar eventos: "Payment Completed"

---

## 🔐 Seguridad

✅ **Ya implementado:**
- No enviamos datos de pago por la app
- PayPal maneja toda seguridad PCI-DSS
- Client ID es público (seguro)
- URLs no contienen información sensible

⚠️ **Pendiente para producción:**
- [ ] Implementar IPN webhook
- [ ] Verificar firmas IPN en backend
- [ ] Guardar transacciones en BD
- [ ] Rate limiting en API de donaciones
- [ ] Cifrar IDs de transacción

---

## 📊 Próximas Características

- [ ] Historial de donaciones
- [ ] Recibos/certificados
- [ ] Cambio automático de divisa por país
- [ ] Integración con Mercado Pago (para Latam)
- [ ] Stripe como alternativa
- [ ] Dashboard de donaciones

---

## ❓ Troubleshooting

**"Error: @capacitor/browser no encontrado"**
```bash
npm install @capacitor/browser
```

**"Donación no aparece en PayPal"**
- Verifica que usaste la cuenta PERSONAL para pagar
- Revisa PayPal Sandbox Activity
- Confirma que el moneda es correcta

**"La burbuja de donación no aparece"**
- Verifica que `mostrarBurbujaDonacion` está siendo seteado en pantalla-principal
- Revisa la consola para errores

**"Quiero usar Mercado Pago en lugar de PayPal"**
- Ya tienes experiencia con Mercado Pago
- Podemos crear una integración adicional
- Mercado Pago es mejor para Latinoamérica

---

## 📞 Recursos

- PayPal Developer: https://developer.paypal.com
- Documentación: https://developer.paypal.com/docs
- Sandbox Dashboard: https://www.sandbox.paypal.com
- Test Card Generator: https://developer.paypal.com/dashboard/accounts

---

## ✅ Checklist para Probar

- [ ] Cuenta Sandbox creada
- [ ] Client ID copiado
- [ ] Email de Business copiado
- [ ] Valores actualizados en servicio
- [ ] `npm install` ejecutado
- [ ] App compilada sin errores
- [ ] Sincronizada con Android
- [ ] Abre "Hacer una Donación"
- [ ] Elige un monto
- [ ] Se abre PayPal automáticamente
- [ ] Paga con tarjeta de prueba
- [ ] Ves mensaje "Donación exitosa"
- [ ] Verifica en PayPal Sandbox que llegó

**¡Cuando completeseste checklist, estará listo para producción!**
