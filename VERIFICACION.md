# FlujoEclesial: interfaz y proyección

## Cambios

- Escritorio organizado en Preparar, Organizar y Proyectar. Cabecera con proyecto, búsqueda, estado local y acceso al proyector.
- Selector compacto de distribución de texto; nombres del programa con espacio propio; acciones accesibles sin depender del hover; pestaña Proyección en móvil.
- Se solicita permiso de administración de ventanas para detectar las pantallas y abrir el proyector en una distinta al escritorio. Se admiten coordenadas negativas. Si el permiso tarda y se pierde la activación de ventanas emergentes, se pide repetir Proyectar. Sin permiso o API, se explica la colocación manual.
- P abre o enfoca una sola ventana de proyector. El botón Ampliar proyector delega la activación fullscreen al popup en Chromium; ya no envía un mensaje sin permiso de activación. El escritorio muestra el estado confirmado por fullscreenchange. Dentro del proyector, P, F, Enter o el botón activan pantalla completa. La acción es idempotente: repetirla no la desactiva.
- La ayuda de pantalla completa permanece hasta que el navegador confirma su activación y reaparece si se abandona. No se oculta al recibir contenido ni por un temporizador.
- Escape ya no apaga accidentalmente la proyección al salir de pantalla completa y F11 se deja al navegador. H controla el fondo.
- Ampliar escritorio usa el documento completo; Vista previa amplía solo la previsualización. Si un selector de archivos saca al escritorio de pantalla completa, se intenta restaurarla y, si el navegador lo impide, se ofrece un botón explícito.
- Recuperación de errores sin borrar datos. El PIN compartido incrustado se sustituye por una entrada local honesta; Google/Supabase sigue siendo el acceso a la cuenta cloud. El espacio local no constituye un área privada autenticada.
- CSS compilado localmente. Caché de aplicación, importadores y Biblias para volver a abrir sin conexión después de que aparezca «Disponible sin conexión». YouTube, IA, fuentes remotas no almacenadas y sincronización siguen necesitando internet.
- Las actualizaciones del service worker esperan a que se cierren todas las ventanas de la aplicación y del proyector, para no interrumpir un culto.
- Tipos corregidos; build incluye typecheck; cancelación de borrado cloud pausa el guardado automático. Dependencias actualizadas, incluyendo PDF.js y overrides de ECharts/UUID para pptx-preview.
- Importador PDF/PPTX separado del paquete inicial. Paquete App: ~995 kB sin gzip frente a ~2.381 kB originales. La caché offline descarga el conjunto completo en segundo plano, incluidas Biblias.

## Pruebas

`npm ci`, `npm run build`, `npx playwright install chromium`, `npm test`.

La suite usa documentos sintéticos en tests/fixtures, sin cuentas ni datos personales. Cubre:

1. Crear proyecto y texto, guardarlos y recuperarlos tras recarga.
2. Abrir con P, activar pantalla completa real, repetir P sin cerrar, sincronizar contenido, importar PDF y PPTX con gráfico manteniendo la proyección y recuperar pantalla completa al salir.
3. Recargar sin red conservando contenido y estilos; consultar Juan 3:16 desde la Biblia local.
4. Ampliar escritorio y recuperar tras simular la salida del navegador durante un selector de archivos.
5. Tutorial, anchura y navegación Preparar/Programa/Proyección a 390 × 844.

También se revisaron visualmente escritorio 1440 × 900, móvil 390 × 844 y el proyector en Chromium con ventana visible. No se detectó desbordamiento horizontal en esos tamaños. Se verificó que los controles principales estén accesibles.

## Límites y publicación

- Abrir un popup consume la activación del clic. Por eso la apertura y la ampliación inicial son dos acciones: Proyectar y Ampliar proyector. Chromium permite delegar el segundo clic desde el escritorio, sin tener que interactuar dentro del popup. Otros navegadores pueden requerir el botón o P dentro del proyector. Referencia: https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen
- Falta validar segunda pantalla/proyector físico, Safari/Firefox, cuenta real de Supabase, políticas RLS, control remoto entre dispositivos y proveedores externos. Las pruebas no demuestran compatibilidad con todas las presentaciones; fuentes especiales y efectos de PowerPoint pueden variar. La captura PPTX evita descargar todas las fuentes remotas durante la importación.
- No se modificaron políticas, datos ni credenciales de Supabase. Las claves privadas de IA no deben publicarse en variables compiladas del frontend; una integración pública requiere un backend autorizado.
- Los avisos de tamaño de Biblias/importadores son conocidos. Permanecen separados para no retrasar el primer render del escritorio.
- El PR contiene fuente y pruebas. Antes de desplegar hay que ejecutar `npm ci && npm run build` y publicar el **nuevo** dist completo por HTTPS, incluido sw.js. El dist histórico versionado no debe usarse como artefacto de esta revisión.
- `npm run deploy` ahora solo compila; ya no agrega todos los archivos ni envía automáticamente cambios a main.

## Comprobación manual antes del culto

Abrir Proyectar, permitir la administración de ventanas y pulsar Ampliar proyector desde el escritorio. Si aparece el aviso de bloqueo, repetir Proyectar después de conceder permiso. Enviar una diapositiva, importar un archivo desde el escritorio, avanzar y retroceder, probar Negro/Sin texto/Logo, y comprobar el encuadre real. Exportar un respaldo antes de actualizar. Cerrar todas las ventanas al terminar para que una actualización pendiente pueda activarse.

## Corrección de dos pantallas (4 de noviembre de 2026)

Se reprodujo en el Chrome del usuario que Ampliar proyector no funcionaba. Después del cambio, la prueba local en el puerto 5173 detectó el monitor 2568BU; el botón del escritorio recibió la confirmación «Proyector en pantalla completa». Al abrir el selector de PDF/PPT se conservó ese estado. La extensión no autorizó cargar el archivo local de prueba: no se afirma haber completado esa importación en el perfil del usuario.

La suite automatizada ahora activa fullscreen desde el botón del escritorio y cubre importaciones PDF/PPTX. Añade pruebas con pantallas simuladas (coordenadas negativas) y permiso denegado; estas no sustituyen la inspección física de monitores.

Referencias de implementación: https://github.com/WICG/capability-delegation y https://developer.chrome.com/docs/capabilities/web-apis/window-management

Resultado final: npm run build correcto y 7 pruebas de Playwright aprobadas (14,8 s).
