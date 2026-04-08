# Project Instructions — Minerva's Experiments

Generador aleatorio de pociones para D&D. App web estática con autenticación y guardado de pociones.

## Stack

- **Frontend**: HTML + Tailwind CSS (CDN) + vanilla JS. Sin framework, sin bundler, sin paso de build.
- **Auth / DB**: Supabase (cliente CDN). Las credenciales van en `web/auth.js` — no las expongas en logs ni commits.
- **Hosting**: Cloudflare Pages. Sirve la carpeta `web/`. El deploy se dispara automáticamente al hacer push a `master`.

## Arquitectura

- Todo el código de la app está en `web/`.
- `app.js` — lógica principal: generación de pociones, slots, popup de novedades, botón copiar.
- `auth.js` — wrapper de Supabase: `authSignIn`, `authSignUp`, `authSignOut`, `authGetSession`, `authResetPassword`.
- `login.html` — página de acceso separada. Redirige a `index.html` si ya hay sesión.
- `potion-data.js` — datos de pociones (dentro de `web/data/`).

## Decisiones clave

- **`sbClient` (no `supabase`)**: el CDN de Supabase expone `window.supabase` globalmente; usar `let supabase` causaría colisión. La variable local se llama `sbClient`.
- **Popup de novedades**: controlado por `CHANGELOG_VERSION` en `app.js` y `localStorage`. Al cambiar la versión, el popup vuelve a aparecer una vez. El fichero de revisión es `web/changelog.md`.
- **`?v=FECHA` en script tags**: para forzar cache bust en móviles al hacer deploy. Actualizar junto con `CHANGELOG_VERSION`.

## Workflow de deploy

1. Claude hace los cambios y el commit.
2. El usuario hace `git push origin master`.
3. Cloudflare Pages despliega automáticamente.

## Workflow de novedades (popup)

1. Actualizar `CHANGELOG_VERSION` y `CHANGELOG_ITEMS` en `app.js`.
2. Actualizar `web/changelog.md` con el mismo contenido.
3. Actualizar `?v=FECHA` en el `<script src="app.js?v=...">` de `index.html`.
4. Pedir confirmación al usuario antes del commit.

## Don'ts

- No exponer claves de Supabase (URL ni anon key) en ningún fichero que se suba al repo.
- No añadir frameworks ni bundlers — el proyecto es intencionalmente simple.
- No modificar archivos generados (`*.gen.ts`, `*.generated.*`).
