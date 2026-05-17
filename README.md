# Oasis Project Offline

Sistema web local-first para preparar, controlar y proyectar contenido en reuniones, servicios y presentaciones sin depender de una conexion constante a internet. Oasis esta pensado para funcionar en el navegador, mantener el material disponible de forma local y ofrecer un panel remoto para manejar la pantalla del proyector desde otro dispositivo.

## Que hace

Oasis Project Offline combina una biblioteca de contenido, un modo proyector y un control remoto movil en una sola aplicacion. Permite organizar canciones, imagenes, videos, presentaciones y documentos para enviarlos a una pantalla en vivo, con soporte para trabajo offline y sincronizacion opcional cuando hay conexion.

## Funciones principales

- **Modo offline primero**: conserva datos y contenido localmente para seguir trabajando aunque se pierda la conexion.
- **Pantalla de proyector**: vista dedicada para mostrar contenido en vivo de forma limpia y enfocada.
- **Control remoto movil**: panel optimizado para celular que permite manejar el contenido proyectado desde otro dispositivo.
- **Importacion de PDF y PowerPoint**: soporte para cargar archivos `.pdf` y `.pptx` y convertirlos en diapositivas utilizables dentro del flujo de presentacion.
- **Zoom y paneo remoto**: controles para acercar, alejar, mover y reiniciar la vista de imagenes o diapositivas enviadas al proyector.
- **Biblioteca multimedia**: administracion de imagenes, videos, canciones y recursos para tener todo listo antes de salir en vivo.
- **Codigos QR**: acceso rapido al control remoto o a vistas compartidas mediante codigos QR.
- **Sincronizacion con Supabase**: integracion opcional para respaldar o sincronizar datos cuando hay internet.
- **Asistencia con Gemini**: integracion preparada para funciones de generacion o ayuda mediante Google Gemini.

## Stack tecnico

- **Frontend**: React 19 + TypeScript
- **Build tool**: Vite
- **Sincronizacion / backend**: Supabase
- **IA**: Google GenAI / Gemini
- **Drag and drop**: `@dnd-kit`
- **PDF**: `pdfjs-dist`
- **PowerPoint**: `pptx-preview`
- **Archivos comprimidos**: `jszip`
- **Imagenes exportables**: `html-to-image`
- **Iconos**: `lucide-react`
- **QR**: `react-qr-code`

## Requisitos

- Node.js 18 o superior
- npm
- Una cuenta/proyecto de Supabase, si se usara sincronizacion cloud
- Una API key de Gemini, si se usaran funciones de IA

## Instalacion

Clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/Ferny121991/oasis-project-offline.git
cd oasis-project-offline
npm install
```

Crea un archivo `.env.local` en la raiz del proyecto con las variables necesarias:

```env
VITE_GEMINI_API_KEY=tu_api_key_de_gemini
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Luego abre la URL que muestra Vite, normalmente:

```text
http://localhost:5173
```

## Scripts disponibles

| Comando | Descripcion |
| --- | --- |
| `npm run dev` | Inicia el servidor local de desarrollo. |
| `npm run build` | Genera la version de produccion. |
| `npm run preview` | Sirve localmente la version compilada. |
| `npm run deploy` | Compila, crea un commit automatico y hace push a `main`. |
| `npm run prepare` | Inicializa Husky para hooks del repositorio. |

## Flujo de uso sugerido

1. Prepara el contenido antes de la reunion o servicio.
2. Abre la vista del proyector en la pantalla principal.
3. Usa el panel remoto desde un celular o tablet para enviar canciones, imagenes, videos o diapositivas.
4. Ajusta zoom, posicion o contenido segun sea necesario durante la presentacion.
5. Trabaja offline si no hay internet y sincroniza despues cuando la conexion vuelva.

## Notas de despliegue

El proyecto se puede compilar como una aplicacion estatica con Vite:

```bash
npm run build
```

La carpeta generada por Vite puede publicarse en cualquier hosting compatible con sitios estaticos. Si se usa Supabase o Gemini, asegurese de configurar las variables de entorno correspondientes en el entorno de despliegue.

## Estado del proyecto

Proyecto privado/de uso interno, enfocado en mejorar la experiencia de presentacion y control multimedia para Oasis.

## Licencia

Uso privado. Todos los derechos reservados.
