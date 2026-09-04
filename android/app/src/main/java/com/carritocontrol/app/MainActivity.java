package com.carritocontrol.app;

/**
 * MainActivity - Punto de entrada nativo de la app Android (Capacitor)
 *
 * Configura el modo "edge-to-edge": oculta la barra de navegación del sistema
 * (gestos/botones inferiores) para que la app se vea a pantalla completa,
 * mientras la barra de estado (donde está el notch/cámara) permanece visible.
 *
 * Además, resuelve un problema de timing de Android: en el primer frame,
 * el WebView a veces no ha recibido aún el valor real de
 * env(safe-area-inset-top), devolviendo 0px temporalmente. Para evitarlo,
 * este archivo escucha el inset real que entrega el sistema operativo y lo
 * inyecta directamente al WebView como variable CSS (--android-notch-height),
 * que global.scss usa con prioridad sobre env(). El COLOR de esa zona sigue
 * siendo responsabilidad exclusiva del CSS/TemaService: aquí solo se resuelve
 * el TAMAÑO real y a tiempo.
 *
 * @author DemWolf
 * @version 2.0
 */

// Bundle: recibe el estado guardado de la Activity al crearse
import android.os.Bundle;

// Insets: representa los márgenes que ocupan barras/notch del sistema
import androidx.core.graphics.Insets;
// Permite escuchar cuándo el sistema entrega los insets reales de la ventana
import androidx.core.view.ViewCompat;
// Clases de AndroidX necesarias para controlar las barras del sistema (status bar / navigation bar)
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

// Activity base que provee Capacitor, ya integra el WebView y el puente JS-nativo
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * Se ejecuta una sola vez al crear la Activity.
     * Aquí activamos el modo inmersivo y el puente de safe-area apenas arranca la app.
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Llama primero al comportamiento estándar de Capacitor (crea el WebView, plugins, etc.)
        super.onCreate(savedInstanceState);

        // Aplica nuestra configuración de pantalla completa / barra de gestos oculta
        configurarModoInmersivo();

        // Envía el inset real del notch/status bar al WebView apenas esté disponible
        configurarPuenteSafeArea();
    }

    /**
     * Android vuelve a mostrar las barras del sistema automáticamente cuando la
     * ventana recupera el foco (ej: al volver de otra app, del multitasking, etc.).
     * Por eso reforzamos el modo inmersivo cada vez que la ventana gana foco.
     */
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);

        if (hasFocus) {
            configurarModoInmersivo();
        }
    }

    /**
     * Configura el modo edge-to-edge y oculta la barra de navegación inferior.
     * La barra de estado (notch) se deja visible a propósito, para que el
     * sistema operativo la posicione correctamente.
     */
    private void configurarModoInmersivo() {
        // Le dice a Android que la ventana ya NO debe reservar espacio automático
        // para las barras del sistema: el WebView puede dibujar detrás de ellas.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Obtiene el controlador de insets (API moderna, reemplaza las flags antiguas
        // de SYSTEM_UI_FLAG que ya están obsoletas)
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());

        if (controller != null) {
            // Oculta ÚNICAMENTE la barra de navegación (botones/gestos de abajo).
            // La barra de estado (arriba, con el notch) NO se oculta.
            controller.hide(WindowInsetsCompat.Type.navigationBars());

            // Define que, si el usuario desliza desde el borde inferior, la barra
            // reaparezca de forma temporal (comportamiento estándar del sistema,
            // no se puede desactivar sin afectar la usabilidad/accesibilidad del OS)
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }
    }

    /**
     * Escucha el inset REAL que entrega Android (status bar + recorte del notch,
     * tomando el mayor de los dos) y lo inyecta al WebView como variable CSS
     * --android-notch-height, en píxeles ya convertidos a "dp" (los que CSS
     * entiende). Se ejecuta cada vez que el sistema recalcula los insets
     * (ej: rotación de pantalla), no solo una vez.
     */
    private void configurarPuenteSafeArea() {
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, windowInsets) -> {

            // Inset de la barra de estado (reloj/batería/señal)
            Insets statusBarInsets = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
            // Inset del recorte físico de cámara/notch (puede ser mayor en algunos equipos)
            Insets cutoutInsets = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());

            // Tomamos el mayor de los dos: cubre tanto status bar como notch físico
            int topPx = Math.max(statusBarInsets.top, cutoutInsets.top);

            // Convertimos de píxeles físicos a "dp" (unidad que CSS/env() usa),
            // dividiendo por la densidad de pantalla del dispositivo
            float density = getResources().getDisplayMetrics().density;
            float topDp = density > 0 ? (topPx / density) : topPx;

            // Inyecta el valor al WebView en el hilo de UI, como variable CSS
            // en el elemento raíz <html>, para que global.scss la use de inmediato
            runOnUiThread(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    String js = "document.documentElement.style.setProperty('--android-notch-height', '"
                        + topDp + "px');";
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            });

            // Deja que el resto del sistema siga procesando estos insets con normalidad
            return windowInsets;
        });

        // Fuerza que Android entregue los insets ahora mismo, sin esperar a un
        // evento externo (ej: rotación) que dispare el listener por primera vez
        ViewCompat.requestApplyInsets(getWindow().getDecorView());
    }
}
