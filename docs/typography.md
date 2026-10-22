# Tipografía y legibilidad de Gesicom

Preferencia acordada con el usuario el 21 de octubre de 2026. Aplicar como
referencia en nuevos componentes y al modificar pantallas existentes.

## Identidad

Plus Jakarta Sans Variable es la fuente del panel: profesional, cercana y
consistente con la marca. Ya está autoalojada mediante Fontsource. Usar
`var(--font-sans)` con los fallbacks definidos en `src/index.css`. No añadir una
segunda fuente decorativa. Mantener los números financieros alineados cuando
corresponda; reservar monoespaciada para código o registros técnicos.

Las fuentes elegidas por un comercio para su tienda pública y las vistas previas
de esas fuentes son independientes de la tipografía del panel.

## Escala

| Uso | Tamaño | Peso | Interlineado |
| --- | --- | --- | --- |
| Título de página | 28–32 px (1.75–2 rem) | 700–750 | 1.2–1.3 |
| Título de sección | 20–22 px (1.25–1.375 rem) | 650–700 | 1.35 |
| Título de tarjeta | 17–18 px (1.0625–1.125 rem) | 600–650 | 1.4 |
| Párrafos y entradas de formulario | 16 px (1 rem) | 400–450 | 1.5–1.6 |
| Botones y etiquetas | 14–16 px (0.875–1 rem) | 500–600 | 1.4–1.5 |
| Ayudas y datos secundarios | 14 px (0.875 rem) | 400–500 | 1.5–1.6 |
| Estados breves, hora y metadatos | 13 px (0.8125 rem) | 500–600 | 1.4–1.5 |

Tokens compartidos: `src/styles/settingsTypography.css`. No usar menos de 13 px
para texto de interfaz que una persona deba leer. Una instrucción esencial es
texto de cuerpo, no una nota pequeña.

## Composición

- Mantener los párrafos cortos y con ancho cómodo, normalmente hasta 65–75 ch.
- Usar `--color-fg` para instrucciones importantes y `--color-fg-muted` para
  detalles secundarios. No bajar opacidad al texto para crear jerarquía.
- No resolver desbordamientos achicando letras: permitir saltos, apilar controles,
  ampliar tarjetas o mover opciones secundarias a un desplegable.
- En celular conservar párrafos y campos de 16 px. Los títulos pueden pasar a
  28 px; las ayudas siguen en 14 px.
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
