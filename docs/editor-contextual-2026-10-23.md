# Editor contextual — primera etapa

Se implementaron las tres prioridades de la propuesta: panel dedicado por bloque de Inicio, selección bidireccional con el lienzo y recuperación de espacio útil.

- El listado se reemplaza por los ajustes del bloque elegido. «Bloques de Inicio» restaura la posición del listado y el foco. Los paneles visitados conservan sus borradores locales.
- Elegir un bloque desplaza el lienzo y lo marca con un borde fino. Los cambios de datos conservan el desplazamiento y la selección. En edición, los clics de Inicio seleccionan bloques; en Vista previa, los enlaces navegan.
- Una cabecera reúne modo, página, alcance del guardado y acciones. El inventario se despliega a demanda; los errores de guardado permanecen visibles. Despublicar queda en Herramientas y Ver página publicada sigue explícito.
- El panel ocupa el 46 % del ancho de escritorio (entre 560 y 760 px por defecto), admite redimensionamiento entre 520 y 900 px y ofrece ampliar la edición a todo el ancho. Los formularios del bloque usan una columna. La ayuda extensa de imágenes de Colecciones se despliega a demanda.

Se conservan runtime, bloques, datos y comportamiento de guardado/publicación. Esta etapa no incorpora un editor de encuadre, historial de deshacer/rehacer ni una separación completa de Contenido/Diseño.

Validación: 36 pruebas unitarias de bloques y runtime; 12 pruebas de navegador, a 375, 900 y 1366 px en claro y oscuro, incluyendo borradores, posición del listado, sincronización, navegación y ausencia de guardado involuntario. Build de producción correcto y verificación de imports sin referencias sin resolver. La prueba móvil usa emulación de navegador, no un dispositivo físico.

## Corrección de espacio y lectura

Tras la revisión del usuario se amplió el panel: a 1366 px tiene aproximadamente 628 px de ancho. Se retiró el contenedor anidado del listado, se dispusieron el nombre y el control Mostrar de cada bloque en la misma fila y se mantuvieron las acciones al costado.

El banner separa identidad, acciones y campos con espacios de 16–24 px. Título y subtítulo se editan en varias líneas. Tamaño y destino utilizan selectores con etiquetas persistentes; la categoría o dirección adicional se solicita solo cuando corresponde. Los textos siguen en 16 px.

La validación adicional cubre seis escenarios de espacio (375, 900 y 1366 px, claro y oscuro): ancho de etiquetas, separación de controles, edición de textos largos, destinos, plegado, modo amplio, regreso al lienzo y conservación del borrador. Junto con los seis escenarios contextuales, pasan 12 pruebas de navegador.

## Colecciones: legibilidad y edición de imágenes

Los textos aparecen primero, con campos de varias líneas y selectores de tamaño independientes: título de 20 a 56 px y subtítulo de 14 a 24 px (32 y 18 px por defecto). La configuración se valida y conserva en el backend. El render compartido aplica los tamaños en la vista previa y en la tienda pública, también a diseños guardados. El editor ahora recibe la tipografía de Mi tienda; el título usa la fuente de títulos y el subtítulo la de cuerpo.

La selección de categorías o colecciones se despliega a demanda, con búsqueda y una lista de altura limitada. Para las imágenes se elige una tarjeta y se muestra un solo editor. Las imágenes de otras tarjetas se conservan. La carga tiene un control visible y la URL queda en una opción avanzada.

Validación de esta revisión: 10 pruebas de componentes, 90 pruebas del backend y 12 recorridos de navegador (Colecciones y selección contextual, en tres anchos y ambos temas). Los recorridos de Colecciones comprueban fuentes distintas para título y cuerpo, tamaños computados, guardado y recarga. Las pruebas de componentes cubren 24 tarjetas con un único editor de imagen.

## Contador en varias fichas

Editar varios o todos incluye una duración común con horas, minutos y segundos y una acción explícita para aplicarla a la selección. El cambio actualiza los tres valores en una sola operación y muestra el bloque de oferta y su contador. Mantiene los textos, el resto de los bloques y las fichas fuera de la selección. Se publica mediante Guardar.

Se usa el comportamiento del contador individual (duración por visita). Si hay una Oferta flash global con fecha o renovación configurada, el panel informa que tiene prioridad en los productos incluidos en ella.

Pruebas del flujo: seis fichas reciben 2 h 30 min 50 s, la séptima conserva sus valores, se guardan los datos y se recuperan al reabrir. También se rechazan duraciones cero, fracciones y unidades fuera de rango. El recorrido de navegador se verificó en escritorio claro y móvil oscuro. La suite ampliada de producto conserva un fallo previo sobre logos de pago, reproducido con el componente de HEAD sin los cambios de esta tarea.

## Controles del editor y barra de anuncios

Editar, Vista previa, Resumen de productos y Herramientas tienen borde, cursor y estados diferenciados de hover, foco, pulsación y apertura. Las ayudas describen cada acción. El resumen se puede cerrar y devuelve el foco al botón que lo abrió. Las opciones de Herramientas resaltan toda la fila; Eliminar página usa el estado de peligro.

Barra de anuncios incorpora un deslizador de 32 a 96 px y un selector entre desplazarse con la página o permanecer visible al bajar. La altura corresponde al tamaño real de la tienda, independiente del zoom del lienzo. El encabezado queda debajo de la barra fija y, al ocultarla, se libera su espacio. La configuración se aplica en el runtime compartido y se valida y guarda en el backend, sin migración de datos.

Validación: 16 recorridos de navegador en claro y oscuro (controles a 375, 900 y 1366 px; anuncios a 375 y 1366 px), incluyendo scroll real, ocultar/mostrar, guardado y recarga. 81 pruebas del servicio de landing pasan y el build de producción finaliza correctamente. Móvil se verificó mediante emulación, sin dispositivo físico.

Corrección de proporción de anuncios: el texto usa un mínimo de 16 px y crece con la altura configurada hasta 22 px; los iconos acompañan el tamaño. Se centra el contenido verticalmente y se normalizan los márgenes heredados de plantillas guardadas. Cuatro recorridos adicionales comprueban tamaño computado, alineación, scroll y persistencia en escritorio y móvil emulado, claro y oscuro. Pasan las 192 pruebas del runtime con un límite de 20 segundos por caso (la ejecución simultánea con build y navegador agotó el límite original de 5 segundos en tres casos). Imports sin referencias sin resolver y compilación final correcta.
