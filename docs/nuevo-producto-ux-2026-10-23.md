# Nuevo producto: edición, IA y carga de la vista previa

- Importar con IA se presenta como una acción con borde, fondo de marca y estados visibles. Su panel flotante separa copiar instrucciones, pegar JSON e importar al formulario. No desplaza la cabecera. Incluye cierre y Escape; los errores de JSON aparecen dentro del panel. Una importación correcta cierra el panel para revisar los datos, sin guardar automáticamente.
- La edición de beneficios y garantías conserva etiquetas persistentes, usa descripciones de varias líneas y aprovecha el ancho del panel. Las garantías eligen su icono visualmente. El editor tiene espacio final para no quedar tapado por las acciones de guardado.
- La vista previa espera conjuntamente la tienda y su landing antes de montar el iframe. Mientras tanto muestra un estado de carga; ante un fallo permite reintentar. Evita renderizar primero los colores predeterminados y después sustituirlos por los del comercio. Transmite también la tipografía resuelta.
- El lienzo tiene una superficie neutra y un solo scroll de contenido. Ampliar abre el diálogo de vista previa existente. Se mantienen los controles de dispositivo.

Validación: 20 pruebas de componentes para importación de producto, carga diferida, recuperación de errores y WhatsApp. Recorridos de navegador con respuestas simuladas a 375, 900 y 1366 px, temas claro y oscuro, comprobando errores de JSON, importación explícita, carga sin iframe inicial, edición de garantías y apertura/cierre de vista ampliada. Móvil emulado; sin dispositivo físico. Compilación de producción correcta e imports verificados.

## Edición por bloques (23/10)

La pestaña Vista del producto ahora comienza con una lista de nueve bloques. Se edita un bloque por vez con cabecera y navegación Anterior/Siguiente; volver al listado conserva su posición. Los controles permanecen montados para conservar los borradores y los campos de React Hook Form. Los grupos del lienzo separan presentación, precio, oferta, contenido del pedido, opiniones y preguntas.

El lienzo utiliza los atributos reales de los bloques de la ficha para desplazarse y resaltarlos. Un clic en una sección selecciona sus ajustes. La vista inicial se desplaza al nombre comercial para evitar que una galería sin imágenes ocupe toda la vista útil. La barra de cambios deja de flotar sobre los controles en esta pestaña y reserva espacio propio.

Validación: 51 pruebas de componentes y runtime pasan; recorridos de navegador a 375, 900 y 1366 px en claro y a 375/1366 px en oscuro comprueban listado, avance, borradores, selección desde el lienzo y ausencia de desbordamiento. Build correcto. Las comprobaciones móviles usan emulación.

### Corrección de nombre comercial y estrellas (23/10)
- La ficha toma la calificación de `ficha_datos.presentacion` cuando no hay un ajuste propio de la landing.
- En Agregar/editar producto, el borrador de nombre comercial, texto de reseñas y estrellas se muestra aunque la landing conserve una personalización anterior. Esto solo afecta la preview del formulario; no modifica la landing guardada.
- El bloque se identifica como «Opiniones y estrellas». El clic en las estrellas de la preview abre ese bloque; el nombre abre Presentación.
- Verificado: escritura, conservación entre bloques y payload de guardado; 53 pruebas; navegador a 1366 y 375 px, sin errores de JavaScript.

### Validación final antes del push a main
- E2E real: navegador Chromium, rutas de Express y PostgreSQL descartable. Sin mocks de las APIs comerciales ni cambios en datos reales.
- Edición de nombre y estrellas, PUT real, verificación en base y recuperación al recargar.
- Página pública anónima: mismo nombre, calificación de 3,5 y color de fondo que la preview; escritorio 1440 px y celular 390 px.
- Backend: 103 pruebas correctas. Frontend: 102 pruebas correctas tras ajustar la expectativa antigua de logos globales frente a logos propios de una ficha. Compilación de producción correcta.
- Prueba reproducible: `npm run test:product-preview:e2e` desde el backend; requiere PostgreSQL 17 local y las dependencias instaladas de ambos repositorios.
