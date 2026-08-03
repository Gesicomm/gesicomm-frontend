# Identidad de marca — Gesicomm

Guía de uso del logo, la paleta y la tipografía. Los SVG de `public/brand/`
son la **fuente de verdad**: si cambia el logo se edita el SVG y se corre
`npm run brand` para regenerar todos los PNG.

---

## 1. El símbolo

Un anillo abierto con un nodo en la apertura.

- **El anillo** es el ciclo de operación que resuelve Gesicomm: sincronizar,
  vender, despachar, medir, volver a empezar. Está abierto a propósito —
  ninguna operación real es un circuito cerrado.
- **El nodo** es la integración externa (Shopify, Meta, WhatsApp) que se
  engancha a ese ciclo. Es el único elemento en color de acento, porque las
  integraciones son la propuesta de valor del producto.
- Al leerse rápido forma una letra que sirve tanto para **G**esicomm como
  para e**C**ommerce.

Es un trazo único con terminaciones redondeadas y un círculo. No tiene
degradados internos complejos, texto ni sombras: sobrevive a 16 px, que es
donde mueren la mayoría de los logos de SaaS.

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
inline y el wordmark en HTML, para que tome la Inter Variable que ya carga la
app y herede el color del tema activo.

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

### Color de marca

| Rol | HEX | Uso |
|---|---|---|
| **Violeta Gesicomm** | `#6D5EF8` | Color primario. Botones, enlaces, foco, acentos. |
| Violeta claro | `#8B7CFF` | Inicio del degradado del símbolo, hover en oscuro. |
| Violeta profundo | `#4F3FD6` | Fin del degradado, estado activo/pressed. |
| **Cian acento** | `#22D3EE` | El nodo del logo. Uso muy escaso: si aparece en todos lados deja de significar "integración". |
| Cian claro | `#67E8F9` | El nodo sobre fondo violeta (app icon). |

Degradado oficial del símbolo: `#8B7CFF → #4F3FD6` a 135°.

### Neutros — tema oscuro (el de la aplicación)

| Rol | HEX |
|---|---|
| Lienzo | `#08080A` |
| Superficie | `#0E0E11` |
| Superficie elevada | `#16161A` |
| Superficie 3 | `#1C1C21` |
| Borde | `#232329` |
| Borde marcado | `#2E2E35` |
| Texto | `#F4F4F6` |
| Texto atenuado | `#9A9AA6` |
| Texto sutil | `#6B6B76` |

### Neutros — tema claro (sitio público)

| Rol | HEX |
|---|---|
| Lienzo | `#FFFFFF` |
| Superficie | `#FAFAFB` |
| Superficie elevada | `#F4F4F6` |
| Superficie 3 | `#EDEDF0` |
| Borde | `#E4E4E9` |
| Borde marcado | `#D3D3DA` |
| Texto | `#0B0B10` |
| Texto atenuado | `#5B5B67` |
| Texto sutil | `#82828F` |

En claro el primario se oscurece a `#5B4BD6` para que el texto violeta sobre
blanco pase AA (4.5:1). Está resuelto en `src/index.css`; no hay que
declararlo a mano.

### Semánticos

| Rol | HEX |
|---|---|
| Éxito | `#10B981` |
| Advertencia | `#F59E0B` |
| Error | `#EF4444` |
| Información | `#60A5FA` |

## 5. Tipografía

**Inter Variable** — única familia del sistema, ya instalada vía
`@fontsource-variable/inter`. No se agregan más fuentes.

| Uso | Peso | Tracking |
|---|---|---|
| Display / hero | 700 | `-0.04em` |
| Títulos de sección | 700 | `-0.03em` |
| Títulos de tarjeta | 600 | `-0.02em` |
| Cuerpo | 400 | `-0.01em` |
| Cuerpo legal | 400 | normal, interlineado 1.75 |
| Etiquetas / eyebrows | 600, mayúsculas | `+0.08em` |

El tracking negativo en los tamaños grandes es lo que separa una tipografía
bien usada de la default: sin él, Inter a 60 px se ve suelta y amateur.

**Wordmark:** Inter 700 con `letter-spacing: -0.03em`. Se escribe
`Gesicomm` en caja mixta. En espacios muy reducidos la app usa `GESICOMM.` en
versalitas — es una variante heredada, no la forma preferida.

### Sustitutos

Si Inter no está disponible (correos, documentos de terceros, un SVG suelto
renderizado fuera del navegador), en orden: `Segoe UI`, `Helvetica Neue`,
`Arial`. Nunca una serif ni una fuente condensada.

## 6. Uso correcto

**Sí:**
- Aire mínimo alrededor del logo igual al radio del nodo (≈10 % del alto).
- El símbolo solo, sin wordmark, cuando el contexto ya dice "Gesicomm".
- Monocromo en blanco o en `#0B0B10` cuando el degradado no se puede imprimir.

**No:**
- Rotarlo, espejarlo ni cerrar la apertura del anillo.
- Cambiar el color del nodo por algo que no sea el cian de acento.
- Poner el lockup claro sobre fondo oscuro (existe la variante oscura).
- Reescribir el wordmark en otra fuente o encerrarlo en una caja.
- Aplicarle sombras, bisel o contorno.
