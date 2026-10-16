# Identidad visual — paleta de Gesicomm

Actualizada el 15 de octubre de 2026 a partir de la referencia suministrada.
La fuente de verdad de colores de interfaz es `src/index.css`.

## Paleta

| Color | HEX | Uso |
|---|---|---|
| Ink | `#08111F` | Lienzo oscuro, texto principal en claro, texto sobre coral y cyan |
| Deep Navy | `#0D1B2A` | Tarjetas y superficies oscuras |
| Signal Coral | `#FF5C45` | Botones principales y detalle del símbolo |
| Electric Ice | `#76E4FF` | Navegación activa, filtros y selecciones |
| Cloud | `#F7FAFC` | Lienzo claro y texto principal en oscuro |
| Slate | `#64748B` | Espacios sin imagen y base de superficies secundarias |

Los seis valores originales están en `--color-brand-*`. Los roles de interfaz
usan `--color-canvas`, `--color-surface`, `--color-fg`, `--color-primary` y
`--color-accent`. Los colores de bordes, elevación y estados son derivados.

`--color-selection` y `--color-selection-fg` dan a las selecciones un fondo
Electric Ice con texto Ink en ambos temas. `--color-placeholder` usa Slate
con texto Cloud para los espacios sin imagen del catálogo. Las superficies
secundarias mezclan Slate con el lienzo del tema; Coral queda para las
acciones principales, de modo que cada color cumple una función visible.

Los fondos coral/cyan siempre llevan texto Ink. Para enlaces se usa
`--color-primary-text` (coral profundo en claro, coral claro en oscuro).
Para texto cyan se usa `--color-accent-text`, más oscuro en modo claro.
Los neutros secundarios también se ajustan según el tema: Slate puro no
alcanza AA sobre todas las superficies claras elevadas.

## Temas

`ThemeProvider` cubre toda la aplicación. El tema se aplica en `data-theme`
sobre `<html>` antes del primer pintado y se persiste bajo
`gesicomm-tema-publico`. Sin elección explícita se sigue el tema del sistema.

Los alias `--vit-*`, `--md-*` y `--aca-*` heredan los roles compartidos.
No duplicar colores de marca en las pantallas nuevas.

## Tipografía

Se mantiene **Plus Jakarta Sans Variable**, autoalojada mediante
`@fontsource-variable/plus-jakarta-sans`, como aproximación geométrica a
la referencia. La imagen no identifica la fuente exacta; no se afirma que
esta sea la tipografía original del wordmark.

`--font-sans` y `--font-display` comparten familia. `--font-mono` se reserva
para datos tabulares. Las tiendas de clientes mantienen sus fuentes y
paletas configurables.

## Símbolo y archivos

Esta etapa conserva la geometría del logo existente y el texto Gesicom;
actualiza su detalle a Coral, su tinta a Ink y su variante inversa a Cloud.
La referencia muestra un símbolo y un wordmark distintos (Gesicomm): la
reconstrucción exacta del logo queda separada de esta migración de paleta.

`src/components/public/Logo.jsx` dibuja la versión inline y hereda la tinta
del contexto. Los SVG de `public/brand/` y `public/favicon.svg` son las
fuentes para imágenes estáticas. Ejecutar `npm run brand` después de editar
esos SVG para regenerar iconos, favicons y Open Graph.

## Alcance de la migración

La paleta compartida cubre navegación, acceso y registro, productos, combos,
vitrina, inventario, abastecimientos, fulfillment, pedidos y logística,
configuración de tienda, planes, finanzas, anuncios, automatización, editores
y educación de usuarios/administradores, además de los portales courier y RAHA.
Los formularios, filtros, tablas, pestañas y ventanas usan los mismos roles.

Las plantillas comerciales, vistas previas de contenido del comercio,
colores elegidos por usuarios y documentos de impresión conservan su propia
identidad. Los colores de estado se mantienen semánticos: éxito, advertencia,
error e información. Sobre fondos sólidos se usan sus roles `*-fg`, que
cambian con el tema para conservar contraste.

Los alias `--gesicom-*`, `--cp-*`, `--lms-*` y `--rp-*` quedan conectados a los
roles compartidos. Los módulos no deben redefinir `--color-primary` localmente.

## Validación de temas

Con Vite ejecutándose en el puerto 5173:

```sh
npx playwright test tests/theme-palette.spec.js --workers=1
```

`PALETTE_BASE_URL` permite usar otra URL de desarrollo. Las pruebas verifican
contraste AA de texto/acciones/selecciones en ambos temas y la interacción del
selector de horario. Incluyen las hojas de productos, combos, logística,
planes, educación y portales juntas para detectar conflictos de cascada.


## Regresión de la vista de usuario

`tests/user-theme-regression.spec.js` usa exclusivamente el rol `usuario`,
con tienda activa, suscripción y navegación dinámica de prueba. Recorre doce
vistas en claro/oscuro y comprueba permisos de edición, búsqueda, selección,
guardado de precio, perfil, academia, pedidos en tabla/kanban y su formulario,
menú móvil, persistencia de tema y acceso sin suscripción. Todas las peticiones
API se interceptan: las pruebas no modifican datos reales.

Para verificar el resultado de producción, ejecutar el build y abrir `vite
preview` en otro puerto; pasar esa URL en `PALETTE_BASE_URL` al ejecutar la suite.
