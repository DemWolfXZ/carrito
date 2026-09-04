<div align="center">

# 🛒 CarritoControl

### Tus compras bajo control

Aplicación móvil para Android desarrollada con **Ionic + Angular + Capacitor**, diseñada para crear listas de compra, registrar productos, controlar un presupuesto en tiempo real y mantener un historial detallado de las compras realizadas.

<br>

[![Android](https://img.shields.io/badge/Android-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/DemWolfXZ/carrito/raw/refs/heads/main/Carrito%20Control.apk)
[![Ionic](https://img.shields.io/badge/Ionic-8.4.3-3880FF?style=for-the-badge&logo=ionic&logoColor=white)](https://ionicframework.com/)
[![Angular](https://img.shields.io/badge/Angular-18-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7.4.4-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

<br>

### 📲 APK disponible para Android

[**⬇️ DESCARGAR CARRITOCONTROL APK**](https://github.com/DemWolfXZ/carrito/raw/refs/heads/main/Carrito%20Control.apk)

</div>

---

## 📱 Sobre CarritoControl

**CarritoControl** nace como una aplicación pensada para ayudar a organizar las compras de una manera sencilla y visual.

La aplicación permite preparar una lista antes de ir a comprar y posteriormente completar cantidades y precios mientras se realiza la compra, manteniendo en todo momento un control sobre el presupuesto disponible.

El objetivo principal es responder de manera sencilla a preguntas como:

- ¿Cuánto llevo gastado?
- ¿Cuánto presupuesto me queda?
- ¿Qué productos tengo pendientes?
- ¿Cuántas unidades compré?
- ¿Cuánto terminé pagando?
- ¿Qué compré en ocasiones anteriores?

Todo desde una aplicación móvil centrada en una experiencia de uso rápida, clara y adaptable.

---

# ✨ Características principales

## 🛒 Creación de compras

Cada compra permite registrar información como:

- Fecha de la compra.
- Lugar o supermercado.
- Presupuesto estimado.
- Productos que se desea comprar.
- Cantidad de cada producto.
- Precio unitario.

El nombre del producto es el único dato obligatorio al crear inicialmente una lista, permitiendo preparar la compra antes de llegar al establecimiento y completar precios o cantidades posteriormente.

---

## 💰 Control de presupuesto

CarritoControl permite establecer un presupuesto para cada compra.

Durante la compra se calcula automáticamente:

- **Gasto acumulado**.
- **Presupuesto total**.
- **Saldo disponible**.
- **Porcentaje del presupuesto utilizado**.

Esto permite visualizar de manera inmediata cuánto dinero se ha gastado y cuánto queda disponible.

---

## 📦 Gestión de productos

Los productos pueden incorporar:

- Nombre.
- Cantidad.
- Precio unitario.
- Total calculado según cantidad y precio.

También es posible:

- ➕ Agregar productos.
- ✏️ Editarlos.
- 🗑️ Eliminarlos.
- Actualizar cantidades.
- Completar precios durante la compra.

La aplicación diferencia entre **productos distintos** e **ítems totales**.

Por ejemplo:

```text
Leche   5 unidades
Arroz   4 unidades
Pan     1 unidad

Productos diferentes: 3
Ítems totales: 10
```

---

## 📌 Listas temporales

Una compra puede guardarse temporalmente sin necesidad de finalizarla inmediatamente.

Esto permite preparar una lista con anticipación y continuar trabajando sobre ella posteriormente.

El flujo permite:

```text
Crear lista
    ↓
Agregar productos
    ↓
Guardar temporalmente
    ↓
Continuar la compra
    ↓
Completar precios y cantidades
    ↓
Finalizar compra
```

---

## ✅ Finalización de compras

Cuando todos los datos están preparados, la compra puede marcarse como finalizada.

Una vez completada pasa al historial, donde queda almacenada junto con su información y productos.

---

## 📜 Historial de compras

CarritoControl dispone de un historial donde se pueden consultar compras anteriores.

Cada registro puede mostrar:

- Supermercado o lugar.
- Fecha.
- Horario de la compra.
- Ubicación configurada.
- Cantidad de productos diferentes.
- Cantidad total de ítems.
- Total pagado.
- Productos comprados.
- Cantidad comprada.
- Precio unitario.
- Total por producto.

---

## 📊 Estadísticas

Las compras completadas generan información adicional para facilitar su análisis.

Entre los datos mostrados se encuentran:

- Producto más caro.
- Producto del que se compró mayor cantidad.
- Número de productos.
- Número total de ítems.
- Total pagado.

Esto permite que el historial no sea solamente una lista de compras, sino también una forma rápida de entender cómo se distribuyó el gasto.

---

## 🌎 País y moneda

CarritoControl permite seleccionar el país de residencia para adaptar la visualización monetaria.

La aplicación dispone de una interfaz de selección con información como:

```text
País
Bandera
Código de moneda
Símbolo monetario
Ejemplo de formato
```

Esto permite adaptar la experiencia a diferentes monedas y formatos regionales.

---

## 🎨 Personalización visual

La aplicación incorpora distintos temas para modificar su apariencia.

Entre las variantes disponibles se encuentran diferentes estilos basados en colores como:

- Azul.
- Azul elegante.
- Azul oscuro.
- Morado.
- Morado oscuro.
- Rosado.
- Rosado oscuro.
- Verde.
- Verde oscuro.

El objetivo es permitir que el usuario pueda adaptar la apariencia de la aplicación a sus preferencias.

---

## ♿ Accesibilidad

CarritoControl incluye opciones visuales orientadas a mejorar la accesibilidad.

Entre ellas:

### ◐ Alto contraste

Tema diseñado para ofrecer mayor diferenciación visual entre los distintos elementos de la interfaz.

### 👁️ Tema accesible para daltonismo

Configuración visual diseñada específicamente para mejorar la identificación de elementos por parte de personas con daltonismo.

La aplicación también puede adaptar determinados elementos visuales según las preferencias configuradas en el sistema operativo.

---

## 👤 Perfil del usuario

La aplicación incorpora un área destinada a las preferencias y datos básicos del usuario.

Esto permite personalizar diferentes aspectos de la experiencia dentro de CarritoControl.

---

## 🤝 Donaciones

El proyecto incluye una sección de apoyo mediante donaciones.

El repositorio contiene además documentación relacionada con la implementación segura de un backend para la integración de **PayPal**, separando las credenciales sensibles y operaciones críticas del frontend.

---

# 📱 Capturas de pantalla

## Inicio y nueva compra

<p align="center">
    <img src="capturas/01-splash.jpeg" width="250" alt="Pantalla Splash de CarritoControl">
    &nbsp;&nbsp;
    <img src="capturas/02-nueva-compra.jpeg" width="250" alt="Nueva compra en CarritoControl">
    &nbsp;&nbsp;
    <img src="capturas/03-presupuesto.jpeg" width="250" alt="Control de presupuesto en CarritoControl">
</p>

---

## Productos y gestión de la compra

<p align="center">
    <img src="capturas/04-productos.jpeg" width="250" alt="Productos de una compra en CarritoControl">
    &nbsp;&nbsp;
    <img src="capturas/05-guardar-compra.jpeg" width="250" alt="Guardar o finalizar una compra">
</p>

---

## Historial y estadísticas

<p align="center">
    <img src="capturas/06-historial.jpeg" width="250" alt="Historial de compras">
    &nbsp;&nbsp;
    <img src="capturas/07-estadisticas.jpeg" width="250" alt="Estadísticas de una compra">
</p>

---

## Personalización y configuración regional

<p align="center">
    <img src="capturas/08-temas-accesibilidad.jpeg" width="250" alt="Temas y accesibilidad de CarritoControl">
    &nbsp;&nbsp;
    <img src="capturas/09-pais-moneda.jpeg" width="250" alt="Selección de país y moneda">
</p>

---

# 🛠️ Tecnologías utilizadas

<div align="center">

![Angular](https://img.shields.io/badge/Angular-18.0.0-DD0031?style=flat-square&logo=angular&logoColor=white)
![Ionic](https://img.shields.io/badge/Ionic_Angular-8.4.3-3880FF?style=flat-square&logo=ionic&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-7.4.4-119EFF?style=flat-square&logo=capacitor&logoColor=white)
![Android](https://img.shields.io/badge/Android-Native-3DDC84?style=flat-square&logo=android&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=flat-square&logo=nodedotjs&logoColor=white)

</div>

### Frontend

```text
Angular 18
Ionic Angular 8
TypeScript
HTML
SCSS
RxJS
```

### Aplicación Android

```text
Capacitor 7
Android
Java
Gradle
```

### Plugins de Capacitor utilizados

```text
@capacitor/app
@capacitor/browser
@capacitor/haptics
@capacitor/keyboard
@capacitor/screen-orientation
@capacitor/splash-screen
@capacitor/status-bar
```

---

# 🤖 Integración Android mediante Capacitor

CarritoControl utiliza **Capacitor** para transformar la aplicación desarrollada con tecnologías web en una aplicación Android instalable.

La configuración principal utiliza:

```text
App ID:   com.carritocontrol.app
App Name: CarritoControl
Web Dir:  www
```

La aplicación también incorpora configuración nativa para controlar aspectos como:

- Status Bar.
- Splash Screen.
- Orientación de pantalla.
- Keyboard.
- Haptics.
- Integración entre Angular y Android.
- Comportamiento edge-to-edge del sistema.

---

# 🏗️ Arquitectura del proyecto

El código Angular se encuentra organizado separando responsabilidades.

```text
src/
│
├── app/
│   │
│   ├── core/
│   │   └── Servicios y lógica central
│   │
│   ├── features/
│   │   └── Funcionalidades principales de la aplicación
│   │
│   ├── layout/
│   │   └── Componentes relacionados con la estructura visual
│   │
│   ├── shared/
│   │   └── Componentes y elementos reutilizables
│   │
│   ├── tabs/
│   │   └── Navegación principal
│   │
│   ├── app-routing.module.ts
│   ├── app.component.ts
│   └── app.module.ts
│
├── assets/
│
├── environments/
│
├── theme/
│
├── global.scss
└── main.ts
```

Esta separación permite mantener la lógica central, las funcionalidades y los componentes reutilizables organizados de manera independiente.

---

# 📂 Estructura general del repositorio

```text
carrito/
│
├── android/
│   └── Proyecto Android generado mediante Capacitor
│
├── assets/
│
├── capturas/
│   ├── 01-splash.jpeg
│   ├── 02-nueva-compra.jpeg
│   ├── 03-presupuesto.jpeg
│   ├── 04-productos.jpeg
│   ├── 05-guardar-compra.jpeg
│   ├── 06-historial.jpeg
│   ├── 07-estadisticas.jpeg
│   ├── 08-temas-accesibilidad.jpeg
│   └── 09-pais-moneda.jpeg
│
├── src/
│   ├── app/
│   ├── assets/
│   ├── environments/
│   └── theme/
│
├── .gitignore
├── angular.json
├── capacitor.config.ts
├── ionic.config.json
├── package.json
├── package-lock.json
│
├── backend-server.js
├── backend-package.json
│
├── BACKEND_PAYPAL_NODEJS.md
├── BACKEND_SETUP_TESTING.md
├── DONACIONES_GUIA.md
├── PAYPAL_SEGURIDAD.md
├── PAYPAL_SETUP.md
│
├── PROTECCION_TEMAS_ACCESIBILIDAD.md
├── TEMAS_DOCUMENTACION.md
├── VALIDACION_TEMAS_ACCESIBILIDAD.md
│
├── Carrito Control.apk
└── README.md
```

---

# 💾 Persistencia de datos

La aplicación está diseñada para mantener la información de las compras directamente en el dispositivo.

Esto permite trabajar con las listas de compras sin depender permanentemente de una conexión con un servidor externo.

---

# 🚀 Ejecutar el proyecto localmente

## Requisitos

Antes de comenzar necesitas tener instalado:

```text
Node.js
npm
Ionic CLI
Angular CLI
```

Para desarrollo Android también necesitarás:

```text
Android Studio
Android SDK
Java / JDK compatible
```

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/DemWolfXZ/carrito.git
```

---

## 2. Entrar al proyecto

```bash
cd carrito
```

---

## 3. Instalar dependencias

```bash
npm install
```

---

## 4. Ejecutar en navegador

```bash
ionic serve
```

La aplicación se abrirá en el navegador utilizando el servidor de desarrollo de Ionic.

---

# 📦 Compilar la aplicación

## Compilar Angular / Ionic

```bash
ionic build
```

---

## Sincronizar con Android

```bash
npx cap sync android
```

---

## Abrir Android Studio

```bash
npx cap open android
```

Desde Android Studio se puede ejecutar la aplicación en:

```text
Emulador Android
o
Dispositivo Android conectado mediante USB
```

---

# 📱 Generar APK

Primero genera la aplicación web:

```bash
ionic build
```

Luego sincroniza Capacitor:

```bash
npx cap sync android
```

Abre Android Studio:

```bash
npx cap open android
```

Desde Android Studio:

```text
Build
→ Generate App Bundles or APKs
→ Generate APKs
```

Para una versión destinada a distribución se recomienda generar un APK firmado.

---

# 📲 Descargar APK

La versión Android compilada está disponible directamente desde este repositorio.

<div align="center">

### CarritoControl v1.0.0

[![Descargar APK](https://img.shields.io/badge/⬇️_DESCARGAR-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/DemWolfXZ/carrito/raw/refs/heads/main/Carrito%20Control.apk)

</div>

> **Nota:** Android puede solicitar autorización para instalar aplicaciones provenientes de fuentes externas a Google Play.

---

# 🧪 Versión actual

```text
Aplicación: CarritoControl
Versión: 1.0.0
Plataforma: Android

Angular: 18.0.0
Ionic Angular: 8.4.3
Capacitor: 7.4.4
TypeScript: ~5.4.0
```

---

# 🎯 Objetivo del proyecto

CarritoControl busca combinar dos necesidades que normalmente se resuelven por separado:

```text
LISTA DE COMPRAS
       +
CONTROL DE PRESUPUESTO
       +
HISTORIAL
       +
ESTADÍSTICAS
       =
CARRITOCONTROL
```

La idea no es solamente recordar qué comprar, sino conocer cuánto se está gastando mientras se realiza la compra.

---

# 🧠 Flujo principal

```text
┌──────────────────────────────┐
│       CREAR UNA COMPRA       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Lugar + Fecha + Presupuesto  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      AGREGAR PRODUCTOS       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Cantidad + Precio Unitario   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│    CONTROL DE PRESUPUESTO    │
│                              │
│ Gasto acumulado              │
│ Saldo disponible             │
│ % utilizado                  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Guardar temporalmente        │
│             o                │
│ Finalizar compra             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│          HISTORIAL           │
│                              │
│ Productos                    │
│ Ítems                        │
│ Total pagado                 │
│ Estadísticas                 │
└──────────────────────────────┘
```

---

# 🔐 Seguridad

Las credenciales privadas y secretos de servicios externos no deben almacenarse directamente dentro de la aplicación Angular.

Para funcionalidades sensibles como pagos o donaciones mediante PayPal, el repositorio incluye documentación orientada a separar estas operaciones mediante un backend.

Los archivos `.env` que contengan credenciales reales deben permanecer fuera del repositorio mediante `.gitignore`.

---

# 🗺️ Mejoras futuras

Algunas mejoras posibles para futuras versiones:

- [ ] Publicación en Google Play.
- [ ] Generación de releases automatizados.
- [ ] Copias de seguridad opcionales.
- [ ] Sincronización entre dispositivos.
- [ ] Exportación de compras.
- [ ] Comparación de gastos entre compras.
- [ ] Gráficos de evolución del gasto.
- [ ] Categorías de productos.
- [ ] Búsqueda avanzada en el historial.
- [ ] Nuevas estadísticas.
- [ ] Mejoras continuas de accesibilidad.
- [ ] Mayor cobertura de pruebas automatizadas.

---

# 👨‍💻 Sobre el desarrollo

CarritoControl es un proyecto personal desarrollado con el objetivo de aplicar conocimientos de desarrollo de software en una aplicación móvil funcional.

El proyecto abarca diferentes áreas:

```text
Frontend con Angular
        ↓
Componentes Ionic
        ↓
Lógica en TypeScript
        ↓
Persistencia local
        ↓
Integración con Capacitor
        ↓
Configuración nativa Android
        ↓
Compilación APK
```

Durante el desarrollo se trabajó con:

- Arquitectura modular.
- Componentes reutilizables.
- Servicios Angular.
- Gestión de estado local.
- Formularios.
- Cálculos dinámicos.
- Manejo de eventos.
- Navegación móvil.
- Persistencia.
- Temas personalizados.
- Accesibilidad.
- Integración web/nativa.
- Configuración Android.
- Generación y prueba de APK.

---

# 📌 Repositorio

🔗 **GitHub**

https://github.com/DemWolfXZ/carrito

---

# 📄 Estado del proyecto

🚧 **Proyecto en desarrollo y mejora continua.**

La versión disponible puede seguir recibiendo nuevas características, mejoras visuales, correcciones y optimizaciones.

---

<div align="center">

# 🛒 CarritoControl

### Tus compras bajo control

**Ionic • Angular • TypeScript • Capacitor • Android**

<br>

[![Descargar APK](https://img.shields.io/badge/Descargar-CarritoControl_APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/DemWolfXZ/carrito/raw/refs/heads/main/Carrito%20Control.apk)

<br>

Desarrollado como proyecto personal.

</div>
