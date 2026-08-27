# Identidad de marca — Gesicom

Guía de uso del logo, la paleta y la tipografía. Los SVG de `public/brand/`
son la **fuente de verdad**: si cambia el logo se edita el SVG y se corre
`npm run brand` para regenerar todos los PNG.

---

## 1. El símbolo

**G + punto.** Es la G del wordmark `Gesicom.` aislada, con su punto.

- **La G** es una grotesca geométrica de trazo único y terminaciones
  redondeadas, con el travesaño llegando hasta el eje central.
- **El punto** representa el ".com", el mundo digital y la conexión
  comercial. Es el único elemento en Oro Digital y el único que **nunca**
  cambia de color, en ninguna variante ni sobre ningún fondo.

Construcción (proporciones sobre la altura X de la G):

| Medida | Valor |
|---|---|
| Altura del símbolo (G) | X |
| Diámetro del punto | 0,28X |
| Grosor del trazo | 0,18X |
| Espacio entre símbolo y texto | 0,6X |
| Altura de las minúsculas | 0,56X |

No tiene degradados, texto ni sombras: sobrevive a 16 px, que es donde
mueren la mayoría de los logos de SaaS. En el favicon el trazo se engrosa
y el punto crece, porque a ese tamaño la proporción nominal se cierra.

## 2. Archivos

| Archivo | Uso |
|---|---|
| `public/brand/gesicomm-isotipo.svg` | Símbolo suelto, fondo transparente. Navbar, avatares, sellos. |
| `public/brand/gesicomm-horizontal.svg` | Lockup símbolo + wordmark para **fondos claros**. Documentos, facturas, firmas de correo. |
| `public/brand/gesicomm-horizontal-oscuro.svg` | El mismo lockup para **fondos oscuros**. |
| `public/brand/gesicomm-icono-cuadrado.svg` | App icon a sangre, sin texto. Fuente de todos los PNG de icono. |
| `public/brand/gesicomm-og.svg` | Fuente de la imagen de Open Graph. |
| `public/favicon.svg` | Favicon vectorial, con el trazo engrosado para 16 px. |

Dentro de la aplicación **no se usan estos archivos**: se usa el componente
`<Logo>` (`src/components/public/Logo.jsx`), que dibuja el símbolo en SVG
inline y el wordmark en HTML, para que tome la tipografía que ya carga la app.
La G va en `currentColor` (navy sobre claro, blanco sobre oscuro, sin dos
variantes del componente) y el punto siempre en Oro Digital.

Se usa en **todas** las cabeceras — sitio público, panel de admin, panel de
usuario, login y onboarding. El wordmark `GESICOM.` en versalitas que había
antes en los paneles internos quedó eliminado: no es una variante de la marca.

## 3. PNG generados

`npm run brand` produce:

| Archivo | Tamaño | Para qué |
|---|---|---|
| `public/icons/icon-1024.png` | 1024×1024 | **Meta App Icon** (el App Dashboard pide exactamente este tamaño) |
| `public/icons/icon-512.png` | 512×512 | PWA / manifest, respaldo para Meta |
| `public/icons/icon-256.png` | 256×256 | Escritorio y Windows |
| `public/icons/icon-192.png` | 192×192 | Android |
| `public/icons/icon-128.png` | 128×128 | Usos chicos |
| `public/apple-touch-icon.png` | 180×180 | iOS |
| `public/favicon-32.png` / `favicon-16.png` | 32 / 16 | Fallback de favicon |
| `public/og-image.png` | 1200×630 | Open Graph y Twitter Cards |

Los PNG se commitean: el build de producción no ejecuta la generación.

## 4. Paleta

> Se reemplazó el sistema violeta/cian anterior por navy/dorado, junto con
> el símbolo (antes un anillo abierto con un nodo; ahora la "G." del
> wordmark). Los valores están declarados una sola vez en `src/index.css`
> (`@theme` y los bloques `data-theme`); nada de esto se declara a mano en
> los componentes.

### Color de marca

| Rol | HEX | Uso |
|---|---|---|
| **Azul Profundo** | `#0B1D3D` | Color de marca dominante. Primario del sitio público (fondo de botón, enlaces, foco): sobre el lienzo marfil rinde ~19:1, así que no necesita oscurecerse para pasar AA. |
| Azul medio | `#3D5FA3` | Primario del panel interno (siempre oscuro) y del sitio público en su variante oscura: más claro que el Azul Profundo para no perderse contra un lienzo casi negro. |
| Azul medio, hover/activo | `#4E72B8` / `#2E4A85` | Estados de interacción del azul medio. |
| **Oro Digital** | `#FFC107` | Acento. Uso escaso: el punto del logo, alguna métrica destacada puntual. Si aparece en todos lados deja de leerse como acento. |
| Gris Pizarra | `#6B7280` | Texto sutil / secundario en ambos temas. |

El símbolo es **plano, sin degradado**: la G toma el color del contexto
(Azul Profundo sobre fondo claro, blanco sobre fondo oscuro) y el punto es
siempre `#FFC107`.

### Neutros — panel interno (siempre oscuro)

| Rol | HEX |
|---|---|
| Lienzo | `#0A0E1A` |
| Superficie | `#10152A` |
| Superficie elevada | `#161C36` |
| Superficie 3 | `#1C2444` |
| Borde | `#262F52` |
| Borde marcado | `#333F68` |
| Texto | `#F5F5F2` |
| Texto atenuado | `#A3A8B8` |
| Texto sutil | `#6B7280` |

### Neutros — tema claro (sitio público)

| Rol | HEX |
|---|---|
| Lienzo (Marfil Cálido) | `#F7F7F5` |
| Superficie | `#FFFFFF` |
| Superficie elevada | `#EEEEEA` |
| Superficie 3 | `#E2E2DC` |
| Borde | `#D8D8D0` |
| Borde marcado | `#C0C0B6` |
| Texto (Azul Profundo) | `#0B1D3D` |
| Texto atenuado | `#4B5568` |
| Texto sutil | `#6B7280` |

### Neutros — tema oscuro (sitio público, toggle)

| Rol | HEX |
|---|---|
| Lienzo | `#0C1224` |
| Superficie | `#131A30` |
| Superficie elevada | `#1A2140` |
| Superficie 3 | `#212A4E` |
| Borde | `#2B3558` |
| Borde marcado | `#3C4870` |

### Semánticos

Sin cambios — no son colores de marca.

| Rol | HEX |
|---|---|
| Éxito | `#10B981` |
| Advertencia | `#F59E0B` |
| Error | `#EF4444` |
| Información | `#60A5FA` |

## 5. Tipografía

**Plus Jakarta Sans** — geométrica humanista, de la misma familia formal
que la SF Pro Display del manual, pero licenciable para web (OFL) y
auto-hospedada vía `@fontsource-variable/plus-jakarta-sans`: no hay request
a Google Fonts ni dependencia de red.

Antes se resolvía con la stack de sistema (`-apple-system, Segoe UI, …`),
que en Mac daba la SF Pro real pero en Windows caía a Segoe UI — sin el
refinamiento que la marca pide, que es la mayoría de los equipos del
equipo. Es variable: un solo archivo cubre de 200 a 800.

Declarada en `--font-sans` / `--font-display` (`src/index.css`) — ambas
apuntan a la misma familia, la marca usa una sola para cuerpo y titulares.

`IBM Plex Mono` se mantiene para cifras y etiquetas tabulares
(`--font-mono`): es una necesidad funcional (números de ancho fijo que
aliñan en columna), no parte de la identidad de marca, y el nuevo brand
book no cubre ese caso de uso.

| Uso | Peso | Tracking |
|---|---|---|
| Display / hero | 700 | `-0.04em` |
| Títulos de sección | 700 | `-0.03em` |
| Títulos de tarjeta | 600 | `-0.02em` |
| Cuerpo | 400 | `-0.01em` |
| Cuerpo legal | 400 | normal, interlineado 1.75 |
| Etiquetas / eyebrows | 600, mayúsculas | `+0.08em` |

El tracking negativo en los tamaños grandes es lo que separa una tipografía
bien usada de la default: sin él, un texto a 60 px se ve suelto y amateur.

**Wordmark:** peso 700 con `letter-spacing: -0.03em`. Se escribe
`Gesicom` en caja mixta, **con una sola m**. Nunca en versalitas ni todo en
mayúsculas. Ojo: el dominio sí lleva dos (`gesicomm.com`) — es una URL, no
la marca, y no se unifican.

### Sustitutos

Si la stack de sistema no está disponible (algún renderer que la ignore),
en orden: `Segoe UI`, `Helvetica Neue`, `Arial`. Nunca una serif ni una
fuente condensada.

## 6. Uso correcto

**Sí:**
- Aire mínimo alrededor del logo igual a la altura de la "G" del símbolo.
- El símbolo solo, sin wordmark, cuando el contexto ya dice "Gesicom".
- Monocromo (todo en blanco, o todo en Azul Profundo) cuando el punto en
  dorado no se puede imprimir.

**No:**
- Rotarlo, espejarlo, estirarlo ni cerrar la abertura de la G.
- Cambiar el color del punto por algo que no sea el Oro Digital.
- Poner el lockup claro sobre fondo oscuro (existe la variante oscura).
- Reescribir el wordmark en otra fuente, con dos emes, o encerrarlo en una caja.
- Aplicarle sombras, contornos o degradados.
