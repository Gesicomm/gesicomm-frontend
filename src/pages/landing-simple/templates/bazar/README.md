# Bazar Jobar · Hogar y Decoración

Template rígido `bazar-hogar`, basado en la referencia de hogar del comercio.

`BazarProductPage` es el renderer compartido entre la landing publicada,
el editor, Mis Productos y la preview del selector. La portada usa
`BazarTemplate`. `demoTemplates.js` contiene los ejemplos de la preview;
esos datos nunca se copian a una landing nueva.

El contenido se resuelve, de menor a mayor prioridad, desde:

1. `DEFAULTS_BAZAR`: rótulos editables, sin afirmaciones comerciales.
2. `Landing.content.ficha_bazar`: valores generales de la landing.
3. `Producto.ficha_datos.bazar_ficha` y marketing del producto.
4. `Landing.content.productos[id].ficha_bazar`: ajustes de ese producto.

Las variantes y ofertas provienen de los datos comerciales. Si existen
ofertas normales, se muestran como opciones y se oculta la cantidad libre.
Sin ofertas, se usa cantidad. Un combo no calcula descuentos contra el
precio unitario del producto principal. No se inventan paquetes, reseñas,
condiciones de envío ni garantías.

Registrar el template en una base ya migrada:

```powershell
node scripts/seed-bazar-hogar.js
```

Ejecutar desde `gesicomm-backend`. El seed es idempotente y usa el ID entero
del modelo existente. La migración inicial también incluye este template.

Verificación desde `gesicomm-frontend`:

```powershell
npx vitest run src/pages/landing-simple/templates/bazar/bazar.test.jsx
npm run build
```

Preview de desarrollo: `/dev/ficha-bazar`. Permite probar la edición, la
vista móvil y los colores usando los mismos datos de la preview del selector.
