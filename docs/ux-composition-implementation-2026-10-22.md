# Comparativa con Zappy: primera implementación

Fecha: 22 de octubre de 2026. Rama de desarrollo: `codex/ux-composition-zappy`.

Antes de esta etapa se subió a `main` el trabajo previo: frontend `cd0cb51`, backend `744673b`. Esta implementación posterior queda separada de ese punto de partida.

## Cambios aplicados

| Área | Cambio | Auditoría |
| --- | --- | --- |
| Depósitos | Entrega pasa a un resumen con Cambiar; el catálogo de transportistas y la configuración extensa aparecen al desplegarlo. Se elimina la explicación repetida de Tus depósitos y el recuadro alrededor de filtros. El conteo queda junto al listado. | G03, G06, G09, O04 |
| Cada depósito | Nombre del transportista principal, cantidad adicional y cobertura sustituyen dos recuadros de cifras. Cuando hay varios transportistas, el alcance de ciudades indica que corresponde al principal. Se preservan carga, falta de asignación y cobertura no disponible como estados distintos. En móvil, Administrar precede a los metadatos. | O05 |
| Publicidad | Una cabecera; estado, Actualizar y Nueva campaña en la zona de trabajo. Cifras en línea sin tres tarjetas. La guía conserva sus tres pasos y pasa a Cómo empezar después del listado. Se elimina la segunda acción Nueva campaña del vacío. | A01, G03, G06, G09 |
| Campañas en móvil | Identificador y acción antes de los metadatos de lectura. Pedidos, gasto y estado se agrupan sin reducir tipografía. | A01, G06 |
| Editor | Modos Editar/Vista previa explícitos. Un selector Página coordina configuración y preview; se quitan los selectores y pestañas duplicados de la preview lateral. Celular/Escritorio queda separado del contexto de página. | E01 |
| Preview | La edición habitual muestra ancho simulado y escala, junto a Ampliar vista previa. El modo dedicado oculta las acciones de edición y el resumen inferior; Editar permite regresar conservando el contexto. | E03 |
| Acciones del editor | Ver página publicada mantiene texto visible. Eliminar página y las herramientas avanzadas pasan a Herramientas; Escape cierra el menú. Se preservan confirmación de eliminación, alcance de Guardar y aceptación única de IA. | E05, E06 |

La vista ampliada conserva controles para navegar por páginas/productos. La edición conjunta sigue disponible: esta primera etapa no reemplaza el formulario por un sistema completo de edición directa sobre el lienzo.

## Medición de distribución

Viewport de escritorio 1366 × 768 y móvil simulado 375 × 812. Fixtures sintéticos; no constituyen tiempos de tarea ni resultados con usuarios. Se usan las mismas raíces de layout que en la línea base; el fixture nuevo incluye transportista asignado para verificar que su nombre aparezca.

| Medida | Línea base de revisión | Primera implementación |
| --- | --- | --- |
| Inicio del primer depósito, escritorio | 650 px | 394 px |
| Inicio de la primera campaña, escritorio | 627 px | 408 px |
| Inicio del primer depósito, móvil | 1098 px | 592 px |
| Inicio de la primera campaña, móvil | 1020 px | 544 px |
| Alto de preview dedicada, escritorio | 617 px | 618 px |
| Alto de preview dedicada, móvil con simulación Escritorio | 463 px | 614 px |

En escritorio, la altura de la preview dedicada se conserva prácticamente igual; la mejora principal está en el contexto único, la edición conjunta y el acceso al modo. En móvil se recupera altura al ocultar herramientas de edición y compactar la barra de contexto. No se confunde esta simulación de escritorio reducida con la legibilidad de la vista Celular o con una prueba en un teléfono real.

La aceptación automatizada comprueba que Administrar y Cargar gasto del primer registro estén enteramente dentro del viewport con estos fixtures. No se exige que todos los metadatos del primer registro móvil quepan a la vez ni se promete ese resultado para cualquier título o contenido.

## Verificación

- Compilación de producción y revisión de imports/identificadores.
- 63 pruebas unitarias de catálogo, producto, campañas, sincronización de código, publicación, preview y guardado del editor.
- 21 recorridos existentes de catálogo/producto, Depósitos, sidebar y preservación de Comercial/Logística.
- 6 nuevos recorridos de composición: 375, 900 y 1366 px, claro y oscuro. Verifican posición del listado, acciones accesibles, nombre/cobertura de transportista, mantenimiento fuera de las acciones principales, Escape, cambio de página y contexto conservado al alternar modos.
- Capturas y medidas: `C:/Proyectos/Gesicom/outputs/ux-composition/`, con prefijo de ancho/tema y pantallas `depositos`, `publicidad`, `editor`, `preview`. Las medidas son archivos `*-layout.json`.

### Fallos preexistentes registrados

Al ampliar las comprobaciones se encontraron dos fallos en `vistaProductoPreview.test.jsx`: “5 · métodos de pago: casillas, otro método y logos” y “Mostrar de cada bloque oculta su parte de la ficha y la vuelve a mostrar”. Ambos afectan la representación de métodos de pago en el fixture de preview.

Se repitieron esas dos pruebas contra una copia temporal de `ConfigurarVentaCodigo.jsx` obtenida de `main` (`cd0cb51`), con los mismos fixtures y dependencias: fallaron de la misma forma. La copia temporal se eliminó al terminar. Evidencia en `outputs/composition-baseline-tests.log` y `outputs/composition-unit.log`. No se ocultaron, deshabilitaron ni cambiaron sus aserciones para presentar la suite ampliada como totalmente aprobada. Los cambios de esta etapa solo actualizan en ese archivo los nombres de las acciones de modo.

## Restricciones y pendientes

Sidebar, Comercial y Logística no tienen cambios en esta etapa. Se mantienen la paleta, la escala tipográfica, las tarjetas como única vista del catálogo, Exportar verde y las flechas de Mi negocio.

Quedan para siguientes etapas: simplificación completa del panel Administrar (O06), redimensionamiento de columnas y refinamiento de ajustes por sección en el editor (E03–E04), checkout (E07), Mi negocio/pagos (T01–T03) y revisión funcional de reportes/finanzas. Los dos fallos de preview de pagos requieren investigación específica. No se declara completada toda la auditoría ni la validación con usuarios/móvil real.
