# Oasis Project Offline

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=fff)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-ready-3FCF8E?logo=supabase&logoColor=111)](https://supabase.com/)

Oasis Project Offline es una aplicacion web local-first para preparar, administrar, controlar y proyectar contenido multimedia en reuniones, servicios, ensayos y presentaciones en vivo. Su objetivo principal es ofrecer una experiencia confiable aun cuando la conexion a internet sea limitada, intermitente o no este disponible.

El proyecto integra una biblioteca de contenido, una vista de proyector, un panel de control remoto para dispositivos moviles, soporte para presentaciones y herramientas de sincronizacion opcional en la nube.

## Tabla de contenido

- [Vision general](#vision-general)
- [Caracteristicas principales](#caracteristicas-principales)
- [Casos de uso](#casos-de-uso)
- [Stack tecnologico](#stack-tecnologico)
- [Requisitos](#requisitos)
- [Instalacion](#instalacion)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Flujo de trabajo recomendado](#flujo-de-trabajo-recomendado)
- [Despliegue](#despliegue)
- [Buenas practicas](#buenas-practicas)
- [Estado del proyecto](#estado-del-proyecto)
- [Licencia](#licencia)

## Vision general

Oasis Project Offline esta disenado para equipos que necesitan presentar contenido con rapidez, estabilidad y control durante eventos en vivo. La aplicacion permite preparar recursos con anticipacion, operar una pantalla de proyeccion y controlar la experiencia desde otro dispositivo sin depender completamente de servicios externos.

La filosofia del proyecto es simple: el contenido debe estar disponible cuando se necesita, el control debe ser rapido y la experiencia de proyeccion debe mantenerse limpia, clara y confiable.

## Caracteristicas principales

### Operacion offline-first

- Persistencia local para conservar informacion y recursos importantes en el navegador.
- Flujo pensado para seguir funcionando aunque la conexion falle durante una presentacion.
- Sincronizacion opcional con servicios cloud cuando vuelve la conexion.

### Pantalla de proyector

- Vista dedicada para mostrar contenido en vivo en una pantalla secundaria o proyector.
- Interfaz enfocada en la salida visual, sin controles innecesarios para la audiencia.
- Soporte para imagenes, videos, canciones, diapositivas y otros recursos multimedia.

### Control remoto movil

- Panel optimizado para telefono o tablet.
- Control del contenido enviado al proyector desde otro dispositivo.
- Acceso rapido mediante codigos QR.
- Experiencia pensada para operadores que necesitan reaccionar rapido durante un evento.

### Presentaciones y documentos

- Importacion de archivos PDF.
- Importacion de presentaciones PowerPoint (`.pptx`).
- Conversion de documentos en diapositivas utilizables dentro del flujo de proyeccion.
- Herramientas para organizar y preparar materiales antes de salir en vivo.

### Zoom y navegacion visual

- Control remoto de zoom sobre contenido proyectado.
- Paneo horizontal y vertical para ajustar imagenes o diapositivas.
- Accion de reinicio para volver rapidamente al encuadre original.

### Biblioteca multimedia

- Gestion de canciones, imagenes, videos y presentaciones.
- Organizacion de recursos para facilitar la preparacion previa.
- Soporte para flujos de presentacion en vivo con contenido variado.

### Integraciones opcionales

- Supabase para sincronizacion y respaldo de datos.
- Google Gemini para funciones asistidas por inteligencia artificial.
- Generacion de codigos QR para conectar vistas o dispositivos.

## Casos de uso

- Servicios religiosos y reuniones congregacionales.
- Presentaciones internas con material multimedia.
- Ensayos, eventos pequenos y actividades comunitarias.
- Escenarios donde se necesita operar contenido visual sin depender de internet.
- Equipos que requieren una solucion sencilla para controlar una pantalla desde un dispositivo movil.

## Stack tecnologico

| Area | Tecnologia |
| --- | --- |
| Frontend | React 19 |
| Lenguaje | TypeScript |
| Build tool | Vite 6 |
| Backend / sincronizacion | Supabase |
| Inteligencia artificial | Google GenAI / Gemini |
| Drag and drop | `@dnd-kit` |
| PDF | `pdfjs-dist` |
| PowerPoint | `pptx-preview` |
| Archivos comprimidos | `jszip` |
| Exportacion visual | `html-to-image` |
| Iconografia | `lucide-react` |
| Codigos QR | `react-qr-code` |
| Identificadores | `uuid` |

## Requisitos

Antes de ejecutar el proyecto, asegurese de tener instalado:

- Node.js 18 o superior.
- npm.
- Git.
- Un proyecto de Supabase, si se utilizara sincronizacion cloud.
- Una API key de Gemini, si se utilizaran funciones de IA.

## Instalacion

Clonar el repositorio:

```bash
git clone https://github.com/Ferny121991/oasis-project-offline.git
```

Entrar al directorio del proyecto:

```bash
cd oasis-project-offline
```

Instalar dependencias:

```bash
npm install
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Abrir la URL mostrada por Vite. En la mayoria de los entornos sera:

```text
http://localhost:5173
```

## Variables de entorno

Crear un archivo `.env.local` en la raiz del proyecto:

```env
VITE_GEMINI_API_KEY=tu_api_key_de_gemini
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### Descripcion de variables

| Variable | Uso |
| --- | --- |
| `VITE_GEMINI_API_KEY` | Habilita funciones conectadas con Google Gemini. |
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Llave publica anonima para conectar con Supabase desde el cliente. |

> Nota: no suba archivos `.env.local` ni credenciales reales al repositorio.

## Scripts disponibles

| Comando | Descripcion |
| --- | --- |
| `npm run dev` | Inicia la aplicacion en modo desarrollo con Vite. |
| `npm run build` | Genera una compilacion de produccion. |
| `npm run preview` | Sirve localmente la compilacion de produccion para validarla. |
| `npm run deploy` | Compila, crea un commit automatico y hace push a `main`. |
| `npm run prepare` | Ejecuta la configuracion de Husky. |

## Flujo de trabajo recomendado

1. Preparar canciones, imagenes, videos, documentos o presentaciones antes del evento.
2. Verificar que el contenido necesario este disponible localmente.
3. Abrir la vista de proyector en la pantalla principal o secundaria.
4. Conectar el panel remoto desde un telefono o tablet mediante QR o URL local.
5. Enviar contenido al proyector segun el orden de la presentacion.
6. Ajustar zoom, posicion o diapositivas desde el control remoto cuando sea necesario.
7. Sincronizar cambios con la nube cuando haya conexion disponible.

## Despliegue

Generar la version de produccion:

```bash
npm run build
```

Validar la compilacion localmente:

```bash
npm run preview
```

La salida generada por Vite puede publicarse en cualquier plataforma compatible con aplicaciones estaticas. Para entornos de produccion, configure las variables de entorno correspondientes en el proveedor de hosting.

## Buenas practicas

- Probar el flujo completo antes de un evento en vivo.
- Cargar con anticipacion los videos, imagenes y presentaciones que se usaran.
- Verificar que el navegador tenga permisos suficientes para almacenar datos localmente.
- Mantener una copia de respaldo de los materiales importantes.
- No exponer llaves de API privadas ni credenciales sensibles.
- Validar la vista de proyector en la resolucion real que se usara durante el evento.

## Estructura funcional

El proyecto se organiza alrededor de cuatro responsabilidades principales:

| Modulo funcional | Proposito |
| --- | --- |
| Biblioteca | Preparar y administrar recursos multimedia. |
| Proyector | Mostrar el contenido activo de forma limpia para la audiencia. |
| Control remoto | Operar la presentacion desde otro dispositivo. |
| Sincronizacion | Mantener datos disponibles localmente y respaldarlos cuando sea posible. |

## Estado del proyecto

Este repositorio corresponde a un proyecto privado/de uso interno. Se mantiene como una herramienta activa para mejorar la preparacion, control y presentacion de contenido multimedia en Oasis.

## Roadmap sugerido

- Mejorar la documentacion tecnica interna.
- Agregar capturas de pantalla del flujo principal.
- Documentar el proceso de configuracion de Supabase.
- Documentar el formato esperado de los datos locales.
- Agregar una guia de operacion para usuarios no tecnicos.

## Licencia

Este proyecto es privado y para uso interno. Todos los derechos reservados.

---

Desarrollado para ofrecer una experiencia de presentacion mas estable, organizada y confiable, incluso sin conexion constante a internet.
