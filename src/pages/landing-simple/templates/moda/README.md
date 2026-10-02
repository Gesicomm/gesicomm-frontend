# Moda e Indumentaria

Template rígido `moda-indumentaria`, con portada editorial y ficha basada
en la referencia adjunta del comercio. `ModaProductPage` es el renderer
compartido por la página publicada, el editor, Mis Productos y el selector.

La herencia del contenido sigue este orden:

1. Rótulos editables de `DEFAULTS_MODA`.
2. `Landing.content.ficha_moda`.
3. Marketing y `Producto.ficha_datos.moda_ficha`.
4. `Landing.content.productos[id].ficha_moda`.

Las tallas vienen de las variantes reales del producto. Una variante
agotada no se puede elegir y la compra exige elegir una disponible. Las
ofertas normales son opciones comerciales independientes, siguiendo el
contrato de Ofertas y del carrito existente.

La guía de talles tiene columnas, filas e instrucciones editables, sin
medidas de fábrica. Telas, looks, imágenes, reseñas y condiciones comerciales
solo se publican cuando el comercio los carga. Los ejemplos están aislados
en `demoModa.js` y no se guardan al crear una landing.

Registrar en una base ya migrada, desde `gesicomm-backend`:

```powershell
node scripts/seed-moda-indumentaria.js
```

La migración inicial también incluye el template. El seed es idempotente
y utiliza el ID entero del modelo existente.

Verificar desde `gesicomm-frontend`:

```powershell
npx vitest run src/pages/landing-simple/templates/moda/moda.test.jsx src/pages/landing-simple/templates/bazar/bazar.test.jsx
npm run build
```

Preview de desarrollo: `/dev/ficha-moda`. El botón “Preview completa” abre
la misma preview de tienda/producto que utiliza el selector de templates.
