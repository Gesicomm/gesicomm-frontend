# Tipografía y legibilidad de Gesicom

Preferencia acordada con el usuario el 21 de octubre de 2026. Aplicar como
referencia en nuevos componentes y al modificar pantallas existentes.

## Identidad

El panel usa Inter Variable en la interfaz e Instrument Sans Variable en
titulares y cifras destacadas. Ambas fuentes se autoalojan mediante Fontsource.
Usar los roles `--font-sans` y `--font-display` de
`src/styles/gesicomTheme.css`. Alinear importes a la derecha y usar cifras tabulares.

Las fuentes elegidas por un comercio para su tienda pública y las vistas previas
de esas fuentes son independientes de la tipografía del panel.

## Escala

| Uso | Escritorio | Celular | Peso |
| --- | --- | --- | --- |
| Título de página | 32 px | 26 px | 700 |
| Título de sección | 28 px | 22 px | 700 |
| Título de tarjeta | 18 px | 18 px | 600–700 |
| Pestañas destacadas | 18 px | 16 px | 600–700 |
| Descripción destacada | 17 px | 16 px | 400 |
| Párrafos y campos | 16 px | 16 px | 400–500 |
| Menú, botones y encabezados de tabla | 14 px | 14 px | 600–700 |
| Datos de tabla | 14 px | 14 px | 400–500 |
| Estados y notas | 13 px | 13 px | 500–600 |

Usar un interlineado de 1,2 en títulos y 1,5 en párrafos.

Tokens compartidos: `src/styles/settingsTypography.css`. No usar menos de 13 px
para texto de interfaz que una persona deba leer. Una instrucción esencial es
texto de cuerpo, no una nota pequeña.

## Composición

- Mantener los párrafos cortos y con ancho cómodo, normalmente hasta 65–75 ch.
- Usar `--color-fg` para instrucciones importantes y `--color-fg-muted` para
  detalles secundarios. No bajar opacidad al texto para crear jerarquía.
- No resolver desbordamientos achicando letras: permitir saltos, apilar controles,
  ampliar tarjetas o mover opciones secundarias a un desplegable.
- En celular conservar párrafos y campos de 16 px.
- Preferir frase normal sobre mayúsculas pequeñas en etiquetas. Mantener los
  bloques redondeados y separados, con espacio proporcionado al texto.
- Conservar las flechas del recorrido de configuración de Mi negocio.

## Validación

Revisar capturas a tamaño real, los estilos calculados de párrafos y controles,
el uso con teclado y los cambios sin guardar. Comprobar desbordamientos en
celular y escritorio y, cuando aplique, zoom del 200 %. Verificar tema claro y
oscuro al tocar colores; no asumir contraste por el nombre del token.

La escala se aplica globalmente a los paneles de usuario y administración, los
portales de courier y RAHA, el acceso y el onboarding. La capa compartida vive en
`src/styles/systemTypography.css`, cargada por `src/main.jsx`. Las raíces del
sistema llevan `gc-panel`; las pantallas nuevas deben usar los layouts existentes
o esa marca. La regla también alcanza modales y tooltips montados en `body`.

Las tiendas públicas, sus vistas previas y Monaco conservan sus propias reglas.
La compatibilidad usa CSS `@scope` para delimitar esas excepciones. Validar en los
navegadores admitidos antes de cambiar esta estrategia. No volver a introducir
letras pequeñas mediante estilos locales o inline.
