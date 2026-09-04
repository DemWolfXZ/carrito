<div align="center">

# 🛒 CarritoControl

### Tus compras bajo control

Aplicación móvil para Android creada para **organizar lo que necesitas comprar, controlar cuánto estás gastando en tiempo real y mantener un registro de tus compras**, sin depender de una conexión permanente a Internet.

<br>

![Ionic](https://img.shields.io/badge/Ionic-8-3880FF?style=for-the-badge&logo=ionic&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-18-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-7-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)
![Android](https://img.shields.io/badge/Android-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)

<br>

## 📲 Probar CarritoControl

La versión actual está disponible como APK para dispositivos Android.

[![Descargar APK](https://img.shields.io/badge/⬇️_DESCARGAR-CARRITOCONTROL_APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/DemWolfXZ/carrito/raw/refs/heads/main/Carrito%20Control.apk)

</div>

---

# 📱 ¿Qué es CarritoControl?

**CarritoControl** es una aplicación móvil pensada para ayudar a tener un mayor control sobre una actividad completamente cotidiana: **hacer las compras**.

Una lista tradicional permite recordar qué productos necesitamos.

Pero cuando comenzamos a comprar aparecen otras preguntas:

> ¿Cuánto llevo gastado?

> ¿Cuánto dinero me queda?

> ¿Estoy cerca de superar mi presupuesto?

> ¿Cuántas unidades llevo realmente?

> ¿Cuánto terminé pagando?

> ¿Qué compré la última vez?

CarritoControl busca reunir toda esa información en un mismo lugar.

```text
LISTA DE COMPRAS
        +
CONTROL DE PRESUPUESTO
        +
REGISTRO DE PRODUCTOS
        +
HISTORIAL
        +
ESTADÍSTICAS
        =
CARRITOCONTROL
```

---

# 🎯 ¿Por qué se creó?

CarritoControl nació de una necesidad sencilla:

## No limitarse a saber qué comprar, sino también saber cuánto estamos gastando mientras compramos.

Es común preparar una lista utilizando papel, WhatsApp, notas del teléfono u otras aplicaciones.

Eso soluciona una parte del problema:

> **"No quiero olvidar lo que necesito comprar."**

Pero no necesariamente resuelve:

> **"No quiero llevarme una sorpresa cuando llegue a la caja."**

Por eso CarritoControl fue pensado como una combinación entre **lista de compras y control de gastos en tiempo real**.

La idea es poder preparar la compra antes de salir y luego utilizar la misma lista dentro del supermercado, agregando precios y cantidades mientras los productos entran al carrito.

De esta manera, la aplicación va mostrando automáticamente cuánto se ha gastado y cuánto presupuesto continúa disponible.

---

# 📴 Offline por diseño

Una de las decisiones principales del proyecto fue evitar que las funciones esenciales dependieran de Internet.

## El funcionamiento principal de CarritoControl es 100 % offline.

Para administrar tus compras no necesitas:

- Crear una cuenta online.
- Iniciar sesión.
- Mantener conexión a Internet.
- Conectarte a una base de datos remota.
- Sincronizar constantemente con un servidor.
- Subir tus listas de compra a la nube.

La información principal se mantiene localmente en el dispositivo.

```text
┌─────────────────────────────┐
│       TU DISPOSITIVO        │
│                             │
│   ┌─────────────────────┐   │
│   │   CarritoControl    │   │
│   │                     │   │
│   │ Listas              │   │
│   │ Productos           │   │
│   │ Historial           │   │
│   │ Presupuestos        │   │
│   │ Preferencias        │   │
│   └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

Esto permite utilizar la aplicación incluso dentro de supermercados o lugares donde la conexión puede ser inestable.

> Las funciones que abren servicios externos, como una donación mediante Mercado Pago, necesitan Internet únicamente para acceder a ese servicio externo.

---

# 🔐 Privacidad

La filosofía de CarritoControl es mantener la información de las compras bajo control del propio usuario.

La aplicación está diseñada para que los datos principales permanezcan en el dispositivo.

### CarritoControl no necesita:

- Enviar tus compras a un servidor.
- Rastrear tu comportamiento.
- Vender información de uso.
- Crear perfiles publicitarios.
- Mantener tus compras almacenadas en una nube externa.

Datos como:

```text
Productos
Precios
Cantidades
Presupuestos
Historial
Preferencias
```

se gestionan localmente.

---

# ✨ ¿Qué permite hacer?

## 🛒 Crear una compra

Antes de comenzar puedes registrar:

- 📅 Fecha.
- 🏪 Lugar o supermercado.
- 💰 Presupuesto estimado.

El presupuesto es opcional, por lo que también puedes utilizar CarritoControl simplemente como lista y registro de compras.

---

# 📝 Preparar una lista antes de salir

No necesitas conocer todos los precios al crear una lista.

Solo el **nombre del producto** es obligatorio inicialmente.

Por ejemplo:

```text
🥛 Leche
🍞 Pan
🍚 Arroz
🥚 Huevos
🥩 Carne
```

La cantidad y el precio pueden completarse posteriormente.

Esto permite preparar la lista tranquilamente antes de salir y utilizarla después durante la compra.

---

# 📦 Gestión de productos

Cada producto puede registrar:

- Nombre.
- Cantidad.
- Precio unitario.
- Subtotal calculado.

Por ejemplo:

```text
Leche

Cantidad:        5
Precio unitario: $1.500

Subtotal:        $7.500
```

Los productos pueden:

- ➕ Agregarse.
- ✏️ Editarse.
- 🗑️ Eliminarse.
- Actualizar cantidades.
- Actualizar precios.
- Completarse posteriormente.

---

# 💰 Control del presupuesto en tiempo real

Esta es una de las funciones centrales de CarritoControl.

Si estableces un presupuesto, la aplicación compara automáticamente el valor de los productos registrados con el dinero disponible.

Puedes visualizar:

```text
Gasto acumulado
Presupuesto total
Saldo disponible
Porcentaje utilizado
```

Por ejemplo:

```text
Presupuesto:          $30.000
Gasto acumulado:       $7.500
Saldo disponible:     $22.500

█████░░░░░░░░░░░░░░░

25 % utilizado
```

Los valores cambian automáticamente cuando se agregan, eliminan o modifican productos.

---

## ⚠️ Alertas de presupuesto

CarritoControl también ayuda a detectar cuándo una compra se está acercando al límite establecido.

La aplicación genera una advertencia cuando el gasto alcanza aproximadamente el:

```text
90 % del presupuesto
```

y vuelve a advertir cuando el presupuesto es alcanzado o superado.

Esto permite reaccionar **antes de llegar a la caja**.

---

# 📊 Productos vs. ítems

CarritoControl distingue entre:

### Productos

Cantidad de productos diferentes.

### Ítems

Cantidad total de unidades.

Por ejemplo:

```text
Leche       5 unidades
Arroz       4 unidades
Pan         1 unidad
```

Resultado:

```text
Productos: 3

Ítems:     10
```

Esto permite representar mejor lo que realmente llevaste en una compra.

---

# 📌 Listas temporales

No siempre una lista se crea y termina el mismo día.

Por eso CarritoControl permite **guardar una compra como lista temporal**.

Esto es especialmente útil para preparar previamente los productos y completar posteriormente sus precios dentro del supermercado.

```text
Preparar lista
      ↓
Agregar productos
      ↓
Guardar temporalmente
      ↓
Ir al supermercado
      ↓
Continuar la lista
      ↓
Agregar cantidades y precios
      ↓
Finalizar compra
```

---

# ⏳ Vigencia de 48 horas

Las listas temporales incorporan un sistema de vigencia.

Cuando se realiza el **primer guardado temporal**, comienza una ventana de:

## 48 horas

La aplicación muestra una cuenta regresiva indicando cuánto tiempo queda disponible para completar la lista.

Dependiendo del tiempo restante puede indicar:

```text
Te quedan 2 días
        ↓
Te queda 1 día
        ↓
Te quedan X horas
        ↓
Te quedan X minutos
        ↓
Te quedan X segundos
```

Mientras el contador continúa activo, la lista aparece dentro de:

```text
📋 Listas en Progreso
```

y puede abrirse nuevamente para completar productos, cantidades o precios.

---

## 🔒 ¿Qué pasa después de las 48 horas?

Cuando termina el plazo:

```text
LISTA TEMPORAL
      │
      │ 48 horas
      ▼
LISTA GUARDADA
```

La aplicación la cierra automáticamente como **Lista guardada**.

A partir de ese momento deja de aparecer como una lista pendiente de completar y queda registrada dentro del historial de listas guardadas.

Estas listas también forman parte del uso mensual de la versión gratuita.

---

# 🆓 Versión gratuita

CarritoControl se distribuye actualmente como una aplicación gratuita.

No existe una suscripción obligatoria para utilizarla.

Para mantener un modelo gratuito y sencillo, la versión actual incorpora algunos límites de uso.

### Límite mensual

```text
2 listas por mes calendario
```

El contador se reinicia automáticamente:

```text
el día 1 de cada mes
```

La aplicación también muestra cuántas listas se han utilizado y cuántas quedan disponibles durante el mes actual.

---

## 📦 Límite de productos

Cada lista puede contener un máximo de:

```text
20 productos
```

Esta limitación forma parte de las reglas actuales de la versión gratuita.

---

# ✅ Finalizar una compra

Cuando todos los productos están completos, la compra puede finalizarse.

Al hacerlo, CarritoControl conserva la información dentro del historial.

Una compra completada puede registrar:

- Lugar de compra.
- Fecha.
- Hora.
- Productos.
- Cantidades.
- Precios unitarios.
- Subtotales.
- Total pagado.
- Estadísticas.

---

# 📜 Historial

La aplicación organiza la información en diferentes estados.

## 📋 Listas en progreso

Listas temporales que todavía se encuentran dentro de su periodo de 48 horas.

## 🔒 Listas guardadas

Listas cuyo periodo temporal terminó.

## ✅ Historial de compras

Compras que fueron completadas correctamente.

---

# 📊 Estadísticas de compra

El historial no se limita a guardar una lista de productos.

CarritoControl también calcula información adicional.

## 💰 Producto más caro

Permite identificar el producto con el mayor precio unitario.

## 📦 Producto que más se compró

Permite identificar cuál fue adquirido en mayor cantidad.

## 🧮 Resumen

Cada compra muestra:

```text
Productos diferentes
Ítems totales
Total pagado
```

y conserva el detalle de cada producto.

---

# 🌎 País y moneda

La aplicación permite seleccionar el país del usuario.

Esto permite adaptar la representación de la moneda correspondiente.

La selección puede mostrar:

- Bandera.
- Nombre del país.
- Código de moneda.
- Símbolo monetario.
- Ejemplo del formato.

Por ejemplo:

```text
🇨🇱 Chile

Moneda:  CLP
Símbolo: $
```

---

# 🎨 Personalización

CarritoControl cuenta con diferentes temas para adaptar la apariencia de la aplicación.

Entre las variantes disponibles existen estilos basados en:

- 🔵 Azul.
- 🌊 Azul elegante.
- 🌑 Azul oscuro.
- 🟣 Morado.
- 🌌 Morado oscuro.
- 🌸 Rosado.
- 🟢 Verde.
- 🌲 Verde oscuro.

El cambio de tema no afecta el funcionamiento de las compras ni los datos almacenados.

---

# ♿ Accesibilidad

La personalización no se desarrolló únicamente con fines estéticos.

CarritoControl incluye alternativas pensadas específicamente para mejorar la accesibilidad visual.

### ◐ Alto contraste

Aumenta la diferenciación entre los distintos elementos de la interfaz.

### 👁️ Tema accesible para daltonismo

Utiliza una configuración visual orientada a mejorar la identificación de elementos para usuarios con dificultades en la percepción de determinados colores.

---

# 👤 Perfil y configuración

Desde la aplicación también es posible administrar preferencias como:

- Nombre de perfil.
- País.
- Moneda.
- Apariencia.
- Accesibilidad.

Además se incluyen secciones de:

- Ayuda.
- Términos y condiciones.
- Información de CarritoControl.
- Donaciones.

---

# 💚 Donaciones

CarritoControl es un proyecto personal desarrollado de forma independiente.

La aplicación no requiere una suscripción para utilizarse y las donaciones son **completamente voluntarias**.

Actualmente se utilizan enlaces de **Mercado Pago** con montos fijos expresados en pesos chilenos.

<div align="center">

## 🇨🇱 Apoya el desarrollo

[![Donar 500 CLP](https://img.shields.io/badge/Donar-$500_CLP-009EE3?style=for-the-badge)](https://mpago.la/22f79fF)

[![Donar 1000 CLP](https://img.shields.io/badge/Donar-$1.000_CLP-009EE3?style=for-the-badge)](https://mpago.la/1PLbJoW)

[![Donar 1500 CLP](https://img.shields.io/badge/Donar-$1.500_CLP-009EE3?style=for-the-badge)](https://mpago.la/1Pa5nhg)

[![Donar 2000 CLP](https://img.shields.io/badge/Donar-$2.000_CLP-009EE3?style=for-the-badge)](https://mpago.la/2p5AzTZ)

</div>

---

# 🔐 ¿Cómo se implementaron las donaciones?

Para evitar convertir CarritoControl en un sistema que gestione información financiera directamente, las donaciones se implementaron utilizando **enlaces de pago externos con montos previamente definidos**.

```text
CarritoControl
      │
      ▼
Elegir monto
      │
      ▼
Enlace predefinido
      │
      ▼
Mercado Pago
      │
      ▼
Proceso de pago
```

La aplicación abre Mercado Pago mediante el navegador del dispositivo.

Esto significa que CarritoControl **no implementa un formulario propio para recibir datos bancarios o de tarjetas**.

Información sensible como:

```text
Número de tarjeta
Código de seguridad
Credenciales financieras
Datos de pago
```

no necesita ser solicitada ni procesada directamente por CarritoControl.

El proceso financiero se realiza en la plataforma externa de Mercado Pago.

---

# ❓ Preguntas frecuentes

## 📴 ¿Necesito Internet para utilizar CarritoControl?

**No para sus funciones principales.**

Puedes crear listas, agregar productos, administrar precios, controlar tu presupuesto, consultar compras y modificar tus preferencias sin conexión a Internet.

Solo necesitas conexión para funciones que utilizan servicios externos, como abrir Mercado Pago para realizar una donación.

---

## 👤 ¿Necesito crear una cuenta?

**No.**

CarritoControl no necesita un registro online ni un inicio de sesión para utilizar las funciones principales.

---

## ☁️ ¿Mis compras se envían a la nube?

**No.**

El funcionamiento principal utiliza almacenamiento local en el dispositivo.

---

## 👀 ¿CarritoControl rastrea lo que compro?

**No.**

La aplicación está diseñada sin rastreo de comportamiento y sin necesidad de enviar tus compras a servidores externos.

---

## 📢 ¿Tiene publicidad?

La versión actual está diseñada **sin publicidad intrusiva**.

---

## 💳 ¿Tiene suscripción?

**No.**

La versión actual no utiliza un modelo de suscripción.

CarritoControl es gratuito con límites de uso y ofrece la posibilidad de realizar donaciones voluntarias.

---

## 🛒 ¿Cuántas listas puedo utilizar?

La versión gratuita permite actualmente:

```text
2 listas por mes calendario
```

El límite se reinicia el primer día de cada mes.

---

## 📦 ¿Cuántos productos puedo agregar?

Cada lista permite un máximo de:

```text
20 productos
```

---

## ⏳ ¿Qué pasa si guardo una lista temporal?

Desde el **primer guardado temporal** comienza una vigencia de 48 horas.

Durante ese periodo puedes abrir nuevamente la lista y continuar completándola.

La aplicación muestra una cuenta regresiva con el tiempo restante.

---

## 🔒 ¿Qué ocurre cuando termina el contador?

Al completarse las 48 horas, la lista cambia automáticamente a estado de **Lista guardada**.

Deja de estar disponible como lista temporal en progreso y pasa a formar parte de las listas guardadas.

---

## 📅 ¿Una lista guardada automáticamente cuenta para el límite mensual?

**Sí.**

Cuando termina su periodo temporal y pasa a Lista guardada, forma parte del uso mensual de la versión gratuita.

---

## 📝 ¿Puedo preparar una lista sin conocer los precios?

**Sí.**

Solo el nombre del producto es obligatorio inicialmente.

La cantidad y el precio pueden completarse posteriormente.

---

## 🏪 ¿Puedo utilizarla directamente dentro del supermercado?

**Sí.**

Ese es uno de los principales objetivos de CarritoControl.

Puedes preparar previamente la lista y completar cantidades y precios mientras vas agregando productos al carrito.

---

## 💰 ¿El gasto se calcula automáticamente?

**Sí.**

CarritoControl calcula los subtotales y el total acumulado según los productos ingresados.

---

## ⚠️ ¿Me avisa si estoy gastando demasiado?

**Sí.**

Si configuraste un presupuesto, la aplicación muestra el porcentaje utilizado y genera alertas cuando te aproximas al límite o lo superas.

---

## 📜 ¿Puedo consultar compras anteriores?

**Sí.**

Las compras completadas se mantienen disponibles dentro del historial.

---

## 📊 ¿Qué estadísticas puedo consultar?

Entre otras cosas puedes revisar:

- Producto más caro.
- Producto comprado en mayor cantidad.
- Cantidad de productos diferentes.
- Total de ítems.
- Total pagado.

---

## 💚 ¿Tengo que donar para seguir utilizando la aplicación?

**No.**

Las donaciones son completamente voluntarias y no son necesarias para utilizar CarritoControl.

---

## 💳 ¿CarritoControl guarda los datos de mi tarjeta?

**No.**

Las donaciones se abren mediante enlaces externos de Mercado Pago.

CarritoControl no implementa un checkout propio donde solicite o almacene los datos financieros del usuario.

---

# 📱 Capturas de la aplicación

## 🚀 Inicio y creación de compra

<p align="center">
    <img src="capturas/01-splash.jpeg" width="250" alt="Pantalla de inicio de CarritoControl">
    &nbsp;&nbsp;
    <img src="capturas/02-nueva-compra.jpeg" width="250" alt="Creación de una nueva compra">
    &nbsp;&nbsp;
    <img src="capturas/03-presupuesto.jpeg" width="250" alt="Control de presupuesto">
</p>

---

## 🛒 Gestión de productos

<p align="center">
    <img src="capturas/04-productos.jpeg" width="250" alt="Productos de una compra">
    &nbsp;&nbsp;
    <img src="capturas/05-guardar-compra.jpeg" width="250" alt="Guardar o finalizar una compra">
</p>

---

## 📜 Historial y estadísticas

<p align="center">
    <img src="capturas/06-historial.jpeg" width="250" alt="Historial de compras">
    &nbsp;&nbsp;
    <img src="capturas/07-estadisticas.jpeg" width="250" alt="Estadísticas de una compra">
</p>

---

## 🎨 Personalización y configuración

<p align="center">
    <img src="capturas/08-temas-accesibilidad.jpeg" width="250" alt="Temas y opciones de accesibilidad">
    &nbsp;&nbsp;
    <img src="capturas/09-pais-moneda.jpeg" width="250" alt="Selección de país y moneda">
</p>

---

# 🛠️ Tecnologías utilizadas

CarritoControl combina tecnologías web con integración nativa para Android.

<div align="center">

![Angular](https://img.shields.io/badge/Angular-18-DD0031?style=flat-square&logo=angular&logoColor=white)
![Ionic](https://img.shields.io/badge/Ionic_Angular-8.4.3-3880FF?style=flat-square&logo=ionic&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-7.4-119EFF?style=flat-square&logo=capacitor&logoColor=white)
![Android](https://img.shields.io/badge/Android-Native-3DDC84?style=flat-square&logo=android&logoColor=white)

</div>

### Aplicación

```text
Ionic
Angular
TypeScript
HTML
SCSS
RxJS
```

### Integración Android

```text
Capacitor
Android
Java
Gradle
```

### Plugins utilizados

```text
Capacitor App
Capacitor Browser
Capacitor Haptics
Capacitor Keyboard
Capacitor Screen Orientation
Capacitor Splash Screen
Capacitor Status Bar
```

---

# 🏗️ Organización del proyecto

El código fue separado en distintas áreas según sus responsabilidades.

```text
src/app/
│
├── core/
│   ├── models/
│   ├── services/
│   ├── guards/
│   └── styles/
│
├── features/
│   ├── bienvenida/
│   ├── tab-nueva-compra/
│   ├── tab-historial/
│   └── tab-configuraciones/
│
├── layout/
├── shared/
└── tabs/
```

### `core`

Contiene modelos, servicios y lógica central.

### `features`

Agrupa las principales funcionalidades de CarritoControl.

### `shared`

Contiene componentes reutilizables.

### `layout`

Gestiona partes de la estructura visual.

### `tabs`

Gestiona la navegación principal.

---

# 💾 Persistencia local

Las compras se mantienen en almacenamiento local.

Esto permite conservar:

```text
Sesiones de compra
Productos
Totales
Historial
Configuraciones
Preferencias
```

sin depender de una base de datos remota para el funcionamiento normal de la aplicación.

---

# 📱 Integración Android

CarritoControl utiliza Capacitor para integrar la aplicación Angular/Ionic con Android.

Entre los elementos trabajados se encuentran:

- Splash Screen.
- Status Bar.
- WebView.
- Keyboard.
- Haptics.
- Orientación de pantalla.
- Browser.
- Safe Areas.
- Comportamiento Edge-to-Edge.

También existen ajustes realizados directamente en la capa Android para adaptar correctamente la interfaz a las barras y áreas del sistema.

---

# 📲 APK

La versión actual puede probarse directamente en Android.

<div align="center">

## CarritoControl v1.0.0

[![Descargar APK](https://img.shields.io/badge/⬇️_DESCARGAR-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/DemWolfXZ/carrito/raw/refs/heads/main/Carrito%20Control.apk)

</div>

> Android puede solicitar autorización para instalar aplicaciones provenientes de fuentes externas a Google Play.

---

# 👨‍💻 ¿Qué representa este proyecto?

CarritoControl es un proyecto personal que busca convertir una necesidad cotidiana en una aplicación móvil funcional.

El proyecto permitió trabajar distintas áreas del desarrollo:

```text
Problema real
     ↓
Diseño de solución
     ↓
Experiencia de usuario
     ↓
Angular + Ionic
     ↓
Lógica de negocio
     ↓
Persistencia local
     ↓
Control de presupuesto
     ↓
Temas y accesibilidad
     ↓
Capacitor
     ↓
Integración Android
     ↓
APK funcional
```

Entre los conceptos aplicados se encuentran:

- Desarrollo con Angular.
- Ionic.
- TypeScript.
- Componentes.
- Servicios.
- Modelos.
- Observables con RxJS.
- Persistencia local.
- Validaciones.
- Lógica de negocio.
- Manejo de estados.
- Cálculos en tiempo real.
- Navegación móvil.
- Diseño responsive.
- Personalización mediante temas.
- Accesibilidad.
- Integración con funcionalidades nativas.
- Desarrollo Android.
- Distribución mediante APK.
- Integración segura con servicios externos.

---

# 🚧 Estado actual

**CarritoControl v1.0.0**

La aplicación se encuentra funcional y continúa en desarrollo y mejora.

### Modelo actual

```text
✓ Aplicación gratuita
✓ Sin suscripción
✓ Sin publicidad intrusiva
✓ Funcionamiento principal offline
✓ Datos almacenados localmente
✓ Donaciones opcionales
✓ 2 listas por mes calendario
✓ Hasta 20 productos por lista
✓ Listas temporales con vigencia de 48 horas
```

---

# 🔮 Próximas mejoras

El proyecto puede continuar creciendo con funcionalidades como:

- [ ] Publicación oficial en Google Play.
- [ ] Nuevas estadísticas.
- [ ] Gráficos de evolución de gastos.
- [ ] Comparación entre compras.
- [ ] Categorías y filtros.
- [ ] Búsqueda avanzada en el historial.
- [ ] Exportación de información.
- [ ] Más opciones de accesibilidad.
- [ ] Nuevos temas.
- [ ] Mejoras continuas de experiencia de usuario.

---

# 🔗 Repositorio

**GitHub**

https://github.com/DemWolfXZ/carrito

---

<div align="center">

# 🛒 CarritoControl

### Tus compras bajo control

**Organiza • Compra • Controla • Revisa**

<br>

**Ionic • Angular • TypeScript • Capacitor • Android**

<br>

[![Descargar CarritoControl](https://img.shields.io/badge/Descargar-CarritoControl_APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/DemWolfXZ/carrito/raw/refs/heads/main/Carrito%20Control.apk)

<br>

## 💚 Apoya el proyecto

[![500 CLP](https://img.shields.io/badge/Donar-$500_CLP-009EE3?style=flat-square)](https://mpago.la/22f79fF)
[![1000 CLP](https://img.shields.io/badge/Donar-$1.000_CLP-009EE3?style=flat-square)](https://mpago.la/1PLbJoW)
[![1500 CLP](https://img.shields.io/badge/Donar-$1.500_CLP-009EE3?style=flat-square)](https://mpago.la/1Pa5nhg)
[![2000 CLP](https://img.shields.io/badge/Donar-$2.000_CLP-009EE3?style=flat-square)](https://mpago.la/2p5AzTZ)

<br>

**Proyecto personal de desarrollo móvil**

</div>
