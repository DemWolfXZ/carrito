# 🚀 Ejecutar Backend PayPal para Testing

Este documento explica cómo ejecutar el backend local para testing de donaciones.

## Requisitos

- Node.js 14+ instalado
- npm

## Instalación Rápida

### Opción 1: En la carpeta del proyecto (Recomendado)

```bash
# En la raíz del proyecto: c:\Users\aleja\Desktop\Nueva carpeta\proyectos persoales\carrito app\con cagaso\carrito

# Copiar package.json del backend
rename backend-package.json package.json

# Instalar dependencias
npm install

# Ejecutar el backend
npm start
```

### Opción 2: En carpeta separada

```bash
# Crear carpeta para backend
mkdir backend
cd backend

# Copiar backend-server.js y package.json
# (copiar los archivos a esta carpeta)

# Instalar dependencias
npm install

# Ejecutar
npm start
```

---

## Ejecutar el Servidor

### En PowerShell (Windows):

```powershell
# Con npm
npm start

# O directamente con node
node backend-server.js
```

### En Terminal (Mac/Linux):

```bash
npm start
# o
node backend-server.js
```

---

## Verificar que Funciona

Abre en el navegador:
```
http://localhost:3000/health
```

Deberías ver:
```json
{
  "status": "OK",
  "timestamp": "2025-12-18T...",
  "message": "✅ Backend CarritoControl funcionando"
}
```

---

## Probar Endpoints

### 1. Crear Orden (POST)

```bash
curl -X POST http://localhost:3000/api/paypal/crear-orden \
  -H "Content-Type: application/json" \
  -d '{"monto": 10, "descripcion": "Donación test", "currency": "USD"}'
```

**Respuesta esperada:**
```json
{
  "id": "ORDER-1702923453123-abc123xyz",
  "status": "CREATED",
  "monto": 10,
  "currency": "USD",
  "mensaje": "Orden creada exitosamente"
}
```

### 2. Confirmar Orden (POST)

```bash
# Usa el ID de la orden anterior
curl -X POST http://localhost:3000/api/paypal/confirmar-orden \
  -H "Content-Type: application/json" \
  -d '{"ordenId": "ORDER-1702923453123-abc123xyz"}'
```

**Respuesta esperada:**
```json
{
  "exito": true,
  "transaccionId": "TXN-1702923453456-def456uvw",
  "ordenId": "ORDER-1702923453123-abc123xyz",
  "monto": 10,
  "currency": "USD",
  "email": "usuario@example.com",
  "nombre": "Usuario",
  "mensaje": "¡Gracias! Tu donación de $10 USD ha sido procesada."
}
```

### 3. Ver Todas las Órdenes (Debug)

```bash
curl http://localhost:3000/api/debug/ordenes
```

### 4. Limpiar Órdenes (Debug)

```bash
curl -X POST http://localhost:3000/api/debug/limpiar
```

---

## Usar la App con el Backend

### 1. Compilar la app
```bash
ng build --configuration development
```

### 2. Sincronizar con Ionic
```bash
ionic serve
```
o
```bash
ionic capacitor run android --livereload
```

### 3. Backend debe estar ejecutándose
```bash
npm start
```

### 4. Hacer una donación en la app

1. Ir a: **Configuraciones → Apoya el Desarrollo**
2. Presionar un monto (ej: $1 USD)
3. Seleccionar método de pago en PayPal
4. Confirmar

---

## Configuración Detallada

### CORS Permitido

El servidor permite requests desde:
- `http://localhost:4200` (Angular dev server)
- `http://localhost:8100` (Ionic dev server)
- `http://127.0.0.1:8100` (Ionic Android)

### Variables de Entorno

Crear archivo `.env` en la raíz para cambiar configuración:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200,http://localhost:8100
```

---

## Troubleshooting

### Error: "Cannot find module 'express'"

**Solución:**
```bash
npm install
```

### Error: "EADDRINUSE: address already in use :::3000"

El puerto 3000 ya está en uso. Opciones:

1. Matar el proceso:
   ```bash
   # PowerShell
   Get-Process -Name node | Stop-Process
   ```

2. Usar otro puerto:
   ```bash
   PORT=3001 npm start
   ```

### Error CORS en la app

**Verifica que:**
1. Backend esté ejecutándose (`npm start`)
2. URL en servicio sea `http://localhost:3000/api`
3. Abre http://localhost:3000/health en navegador para confirmar

### La app sigue lanzando error

1. **Abre Developer Console** (F12 en navegador)
2. **Revisa los errores** en Network y Console
3. **Verifica el URL** en donaciones.service.ts
4. **Reinicia** el servidor backend

---

## Para Producción

Cambiar URL en `donaciones.service.ts`:

```typescript
private BACKEND_URL = 'https://tu-servidor-produccion.com/api';
```

Implementar endpoints reales con:
- Autenticación
- Validación con PayPal API
- Base de datos (MongoDB, PostgreSQL, etc.)
- Webhooks para notificaciones

Usar documento `BACKEND_PAYPAL_NODEJS.md` como referencia.

---

## Parar el Servidor

```bash
# Presionar Ctrl + C en la terminal
```

---

¡Listo! Ahora el backend está ejecutándose y puedes hacer donaciones desde la app.
