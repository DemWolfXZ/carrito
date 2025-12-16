# Sistema de Temas - Documentación de Implementación

## Resumen General

Se ha implementado un **sistema avanzado y completamente funcional de temas claro/oscuro** con soporte para:

✅ **Modo Automático**: Sincronización con la preferencia del sistema operativo
✅ **Modo Manual**: Selección manual de tema claro u oscuro
✅ **Persistencia**: Guardado de preferencias del usuario
✅ **Reactividad**: Actualización automática cuando cambia el tema del sistema
✅ **Interfaz Visual**: Componente dedicado con 3 opciones claras
✅ **Estilos Consistentes**: Variables CSS para ambos temas

---

## Componentes Creados/Modificados

### 1. **TemaService** (`src/app/core/services/tema.service.ts`) - NUEVO
Servicio especializado que gestiona:
- Inicialización del tema al cargar la app
- Aplicación de temas (claro/oscuro)
- Cambios manuales vs automáticos
- Sincronización con preferencias del sistema
- Observables para cambios reactivos

**Métodos principales:**
```typescript
cambiarTemaManual(tema: 'claro' | 'oscuro'): Promise<boolean>
activarTemaAutomatico(): Promise<boolean>
obtenerTemaActual(): string
obtenerModoTema(): string
esOscuro(): boolean
esClaro(): boolean
esAutomatico(): boolean
```

### 2. **AppComponent** (modificado)
- Inyecta `TemaService`
- Implementa `OnDestroy` para limpiar recursos
- El TemaService se encarga automáticamente de la inicialización

### 3. **ConfiguradorTemaComponent** (`src/app/features/tab-configuraciones/components/configurador-tema/`) - NUEVO
Componente visual con:
- 3 opciones de tema (Automático, Claro, Oscuro)
- Interfaz visual atractiva
- Indicador de tema actual
- Información contextual
- Toasts de confirmación

**Ubicación:** Sección "Apariencia" en la página de Configuraciones

### 4. **Estilos Globales** (`src/global.scss`) - MEJORADO
Sistema completo de variables CSS:
- Variables para tema claro (`:root`)
- Variables para tema oscuro (`body.dark`)
- Soporte para atributo `data-theme`
- Transiciones suaves
- Colores consistentes en todos los componentes

---

## Cómo Funciona

### Flujo de Inicialización
1. **AppComponent se carga**
   ↓
2. **TemaService se inyecta y se inicializa**
   ↓
3. **Lee la preferencia guardada del usuario**
   ↓
4. **Si está guardado:**
   - Aplica el tema guardado (claro, oscuro o automático)
   ↓
5. **Si NO está guardado:**
   - Usa automático (detecta del sistema)
   ↓
6. **Configura listener para cambios del sistema**
   - Solo aplica si está en modo automático

### Cambio de Tema en Configuraciones
1. Usuario abre "Configuraciones"
2. Ve el componente ConfiguradorTemaComponent
3. Selecciona una opción:
   - **Automático**: Sigue el sistema
   - **Claro**: Siempre claro (manual)
   - **Oscuro**: Siempre oscuro (manual)
4. El TemaService:
   - Aplica el tema inmediatamente
   - Actualiza el DOM (agrega/quita clase `.dark`)
   - Guarda la preferencia en almacenamiento
   - Emite observables para que otros componentes se actualicen

---

## Variables CSS Disponibles

### Tema Claro
```scss
--app-background: #ffffff;
--app-text-primary: #000000;
--app-text-secondary: #333333;
--app-text-tertiary: #666666;
--app-border-color: rgba(0, 0, 0, 0.08);
--app-card-background: #f5f5f5;
--app-input-background: #f0f0f0;
// ... más variables
```

### Tema Oscuro
```scss
--app-background: #1a1f2e;
--app-text-primary: #ffffff;
--app-text-secondary: #d0d0d0;
--app-text-tertiary: #a0a0a0;
--app-border-color: rgba(255, 255, 255, 0.08);
--app-card-background: #252e3f;
--app-input-background: #1f2633;
// ... más variables
```

---

## Uso en Componentes

### Para usar el servicio en otros componentes:
```typescript
import { TemaService } from '@core/services/tema.service';

constructor(private temaService: TemaService) {}

// En el componente
if (this.temaService.esOscuro()) {
  // Hacer algo en modo oscuro
}

// Escuchar cambios
this.temaService.temaActual$.subscribe(tema => {
  console.log('Tema cambió a:', tema);
});
```

### Para usar variables CSS en estilos:
```scss
.my-component {
  background: var(--app-background);
  color: var(--app-text-primary);
  border: 1px solid var(--app-border-color);
  box-shadow: var(--app-shadow-md);
}
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/app/core/services/tema.service.ts` | ✨ CREADO |
| `src/app/app.component.ts` | 🔄 Simplificado, ahora usa TemaService |
| `src/global.scss` | 🔄 Mejorado con variables CSS modernas |
| `src/app/features/tab-configuraciones/components/configurador-tema/` | ✨ CREADO (3 archivos) |
| `src/app/features/tab-configuraciones/tab-configuraciones.module.ts` | 🔄 Registra ConfiguradorTemaComponent |
| `src/app/features/tab-configuraciones/tab-configuraciones.component.html` | 🔄 Incluye nuevo componente |
| `src/app/features/tab-configuraciones/tab-configuraciones.component.ts` | 🔄 Eliminada lógica duplicada |

---

## Características Incluidas

### ✨ Automático (Sincronización con Sistema)
- Detecta cambios en preferencias del SO
- Cambio instantáneo cuando el usuario cambia en Configuraciones del Sistema
- No requiere reiniciar la app

### ✨ Manual (Claro)
- Tema claro siempre activo
- Ignora preferencias del sistema
- Guardado en almacenamiento persistente

### ✨ Manual (Oscuro)
- Tema oscuro siempre activo
- Paleta azulada agradable para lectura nocturna
- Guardado en almacenamiento persistente

### ✨ Interfaz Visual
- Componente dedicado en Configuraciones
- 3 botones con iconos descriptivos
- Indicador visual del estado actual
- Información sobre el modo seleccionado
- Confirmación con toast

### ✨ Persistencia
- Preferencias guardadas en almacenamiento local
- Se restauran al iniciar la app
- Sincronizado con la base de datos del usuario

### ✨ Transiciones Suaves
- Cambios de color sin parpadeo
- Transiciones CSS de 0.3s
- Interfaz fluida y profesional

---

## Testing

Para probar el sistema:

1. **Abre Configuraciones**
2. **Ve a la sección "Apariencia"**
3. **Prueba cada opción:**
   - Claro → Debe pasar a tema blanco
   - Oscuro → Debe pasar a tema azulado oscuro
   - Automático → Debe seguir la preferencia del sistema
4. **En automático:** Cambia el tema en Configuraciones del SO (o Dev Tools)
   → Debe cambiar automáticamente
5. **En manual:** Cambia el tema en Configuraciones del SO
   → NO debe cambiar (correcto)
6. **Recarga la app** → Debe mantener la preferencia guardada

---

## Notas Técnicas

- ✅ Usa únicamente CSS variables (compatible con todos los navegadores modernos)
- ✅ No depende de `prefers-color-scheme` para modo manual
- ✅ Listener de MediaQuery se limpia al destruir AppComponent
- ✅ Soporta transiciones suaves sin parpadeos
- ✅ Compatible con componentes Ionic (ion-button, ion-card, etc)
- ✅ Tema oscuro con paleta azulada (#1a1f2e, #252e3f)

---

## Próximas Mejoras (Opcionales)

- [ ] Crear tema personalizado
- [ ] Presets de colores adicionales
- [ ] Animar transiciones entre temas
- [ ] Analytics de temas más usados

---

**Implementado por:** Sistema de Temas v1.0
**Fecha:** Diciembre 2025
