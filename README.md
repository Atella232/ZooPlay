# ZooPlay

App web móvil en español con 71 minijuegos animales, reto diario, temporadas de 21 días y una sección de **Entrenamiento sin límite**. El catálogo y los resultados se guardan localmente en este prototipo.

## Empezar

Necesitas Node.js 22.12 o posterior y pnpm.

```sh
pnpm install
pnpm dev
```

Abre la dirección local que muestra Vite. En el teléfono, abre esa dirección desde la misma red Wi-Fi para probar los controles táctiles.

## Comprobaciones y publicación

```sh
pnpm test
pnpm build
pnpm build:pages
pnpm deploy
```

La publicación usa Cloudflare Workers. `pnpm deploy` compila el sitio y publica la configuración generada para Workers.

El flujo `.github/workflows/pages.yml` publica también en GitHub Pages cada vez que se actualiza `main`. Para este proyecto la dirección es `https://atella232.github.io/ZooPlay/`.

## Qué funciona en esta versión

- Catálogo con los 71 juegos, búsqueda y filtros por categoría.
- Entrenamiento repetible: no gasta intentos ni modifica la marca diaria.
- Reto común diario, rotación del catálogo, temporadas de 21 días y fecha de Madrid.
- Dos intentos puntuables y un intento extra como máximo por dado; la mejor marca es la que cuenta.
- Perfil, grupos, resultados y marcadores de muestra guardados en este navegador.
- PWA con caché para volver a abrir recursos ya visitados sin conexión.

Los grupos y los rivales de muestra se identifican claramente en pantalla: en esta versión no se sincronizan entre dispositivos. Para habilitar cuentas, invitaciones reales y marcadores en directo falta configurar un proyecto Supabase y conectar sus tablas y funciones seguras. Los juegos comparten un motor arcade con varias mecánicas; son una primera versión jugable, no recreaciones visuales idénticas a los minijuegos de referencia.

## Catálogo para Supabase

`pnpm supabase:seed` genera `supabase/seed.sql` a partir de `src/data/games.ts`, en el mismo orden diario determinista. El archivo asume una tabla `public.game_catalog`; no crea el esquema. La app actual no escribe resultados en Supabase.
