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

> Redefinida en `feature/rebrand-navy-gold`: se reemplazó el sistema
> violeta/cian por navy/dorado. El símbolo (anillo + nodo) mantiene su
> geometría; solo cambiaron sus colores. Los valores están declarados una
> sola vez en `src/index.css` (`@theme` y los bloques `data-theme`); nada
> de esto se declara a mano en los componentes.

### Color de marca

| Rol | HEX | Uso |
|---|---|---|
| **Azul Profundo** | `#0B1D3D` | Color de marca dominante. Primario del sitio público (fondo de botón, enlaces, foco): sobre el lienzo marfil rinde ~19:1, así que no necesita oscurecerse para pasar AA. |
| Azul medio | `#3D5FA3` | Primario del panel interno (siempre oscuro) y del sitio público en su variante oscura: más claro que el Azul Profundo para no perderse contra un lienzo casi negro. |
| Azul medio, hover/activo | `#4E72B8` / `#2E4A85` | Estados de interacción del azul medio. |
| **Oro Digital** | `#FFC107` | Acento. Uso escaso: el nodo del logo, alguna métrica destacada puntual. Si aparece en todos lados deja de leerse como acento. |
| Gris Pizarra | `#6B7280` | Texto sutil / secundario en ambos temas. |

Degradado oficial del símbolo: `#15295A → #0B1D3D` a 135° (dark theme:
mismo degradado, el nodo dorado se mantiene fijo en `#FFC107`).

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

**SF Pro Display** es la tipografía de marca, pero es propietaria de Apple
y no tiene licencia para @font-face en web. Se resuelve con la stack de
sistema:

```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
```

En Mac/iOS esto renderiza la SF Pro real; en el resto de plataformas cae a
la tipografía nativa del sistema operativo (Segoe UI en Windows, Roboto en
Android/Chrome OS). Es el único enfoque legal para usar SF Pro fuera del
ecosistema Apple. Declarada en `--font-sans` / `--font-display`
(`src/index.css`) — ambas apuntan a la misma stack, la marca usa una sola
familia para todo, cuerpo y titulares.

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
`Gesicomm` en caja mixta. En espacios muy reducidos la app usa `GESICOMM.` en
versalitas — es una variante heredada, no la forma preferida.

### Sustitutos

Si la stack de sistema no está disponible (algún renderer que la ignore),
en orden: `Segoe UI`, `Helvetica Neue`, `Arial`. Nunca una serif ni una
fuente condensada.

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
