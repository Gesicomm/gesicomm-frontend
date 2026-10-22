# Portada institucional de Gesicom

La referencia aprobada por el usuario es `landing-reference.html`, copia del
archivo adjunto `gesicomm_landing_completa.html`. Se conserva su estructura,
fondo oscuro, tarjetas, dos rutas, precios, formularios y preguntas frecuentes.

## Archivos y colores

- `src/pages/public/home/landing.css`: paleta editable, variantes y adaptación
  responsive. Cambiar `--gc-bg`, `--gc-surface`, `--gc-surface2`, `--gc-border`,
  `--gc-white`, `--gc-muted`, `--gc-cyan`, `--gc-coral` y `--gc-success`.
  Los tonos secundarios se derivan de esos tokens con `color-mix()`.
- `src/pages/public/home/landing.html`: estructura estática de la portada.
- `src/pages/public/home/reference.css`: estilos de la referencia aislados con
  `@scope (.gl-landing)`. No afectan al panel ni a las tiendas públicas.
- `src/pages/public/Landing.jsx`: interacciones y envío de solicitudes.
- `src/components/public/MarketingChrome.jsx`: encabezado y pie equivalentes
  para contacto y los documentos legales existentes; sus textos se conservan.

La fuente institucional es Manrope Variable autoalojada, siguiendo la
referencia. El panel conserva Plus Jakarta Sans. Los logos existentes se sirven
desde `/brand/gesicomm-horizontal-oscuro.svg`. La marca se escribe Gesicom;
el dominio conserva las dos emes: gesicomm.com.

Para volver a importar una versión del diseño, reemplazar el archivo de
referencia y ejecutar `node scripts/import-home-reference.mjs`. Este script
extrae HTML/CSS, elimina scripts y handlers inline y aplica las adaptaciones de
marca, accesibilidad y enlaces. Nunca ejecuta el JavaScript de la referencia.

## Integraciones

Demo, cupón, contratación y proveedores se registran en el endpoint existente
`POST /api/publico/contacto`, con `area: comercial`, para aparecer en la bandeja
administrativa de contacto. Solo se confirma la recepción cuando el servidor
devuelve el ID guardado; los fallos conservan los datos para reintentar.

La contratación solicita una propuesta comercial con plan, ruta, moneda y
periodicidad seleccionados. No genera un cobro ni modifica el catálogo de
suscripciones del backend. Los importes mostrados son los del HTML entregado;
deben mantenerse coordinados con las condiciones comerciales antes de habilitar
un checkout directo.

El video no estaba adjunto: se conserva el espacio de presentación, marcado
como próximo, con acceso a solicitar una demostración.

El botón flotante lleva al contacto existente. Para habilitar WhatsApp, configurar
`VITE_GESICOM_WHATSAPP` con el número internacional oficial sin signos ni espacios
y reconstruir el frontend. No se incorpora un número inventado.

## Verificación

`tests/home-reference-ux.spec.js` recorre 375, 768, 1280 y 1600 px; comprueba menú,
rutas, precios, variables de color, solicitudes con errores y reintentos, y los
enlaces a privacidad, términos, cookies, eliminación de datos, seguridad,
cumplimiento y contacto.
