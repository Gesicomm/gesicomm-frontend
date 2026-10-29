# Identidad Gesicom

Referencia: las dos láminas de identidad visual entregadas el 28/10/2026.

## Concepto

El símbolo reúne un círculo abierto, un check integrado y un punto digital. El nombre público es **Gesicom** (una sola m); el dominio continúa siendo `gesicomm.com`. El lema es **«Tu negocio, en marcha.»**

## Paleta

| Nombre | Valor | Uso principal |
| --- | --- | --- |
| Negro | `#0B0F0E` | Fondo oscuro y texto sobre claro |
| Bosque | `#0F3D2E` | Superficies e icono de app |
| Acento | `#22B573` | Check, punto, acciones y énfasis |
| Blanco | `#FAFCFB` | Texto sobre oscuro y fondo claro |
| Gris | `#85938D` | Elementos secundarios |

Para texto verde pequeño sobre fondo claro se usa `#087D4B`, y sobre fondo oscuro `#53D99B`, para conservar el contraste. Los colores de éxito, advertencia, error e información mantienen sus roles semánticos; no se sustituyen todos por el verde de marca.

## Recursos

### Modo claro de portada y acceso (referencia posterior, 28/10/2026)

La nueva lámina define **Verde profundo `#063F2E`** y **Verde activo `#14D26A`**.
Se aplican en la landing institucional y el login: blanco para el fondo,
profundo para textos y marca, activo para botones y acentos. El texto pequeño
verde usa `#087B43` para conservar contraste. La variante de marca es
`gesicomm-compacta-claro-activo.svg`. Los estilos están delimitados a
`home-institutional` y `login-page`; no cambian paneles ni tiendas.

## Recursos de marca

Los SVG de `public/brand` son los originales de implementación. `npm run brand` genera sus PNG y los iconos de navegador, iOS, Android y Open Graph.

| Archivo | Uso |
| --- | --- |
| `gesicomm-horizontal.svg` / `gesicomm-horizontal-oscuro.svg` | Marca principal con lema, sobre fondo claro / oscuro |
| `gesicomm-compacta.svg` / `gesicomm-compacta-oscuro.svg` | Cabeceras y espacios horizontales reducidos |
| `gesicomm-isotipo.svg` / `gesicomm-isotipo-oscuro.svg` | Símbolo independiente |
| `gesicomm-icono-cuadrado.svg` | Icono de app sobre Bosque |
| `favicon.svg` | Favicon |
| `gesicomm-og.svg` | Vista previa de enlaces |

El símbolo de estas láminas llegó como captura, sin archivo vectorial original de la propuesta 7. La geometría SVG implementada se reconstruyó visualmente de la captura. Si aparece el archivo maestro, sustituir las rutas del símbolo por ese original y regenerar los PNG.

La interfaz usa Plus Jakarta Sans Variable y la escala de `docs/typography.md`. La tipografía configurable de las tiendas públicas permanece independiente.
