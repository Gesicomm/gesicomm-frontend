# Comparación UX: Gesicomm y Zappy

Fecha: 22 de octubre de 2026. Inspección autenticada de Zappy realizada después de que el usuario iniciara sesión. Complementa la auditoría original y `ux-audit-revision-2026-10-22.md`.

## Conclusión

La referencia útil de Zappy es la separación entre trabajar, configurar y previsualizar. Sus pantallas operativas no exponen todas las explicaciones y ajustes a la vez. Eso coincide con lo que ya pedía la auditoría de Gesicomm: priorizar el contenido, reducir capas y ofrecer ayuda y configuración bajo demanda.

No es una superioridad uniforme. El inicio de Zappy es largo y promocional; su catálogo usa tarjetas, carruseles y superficies grandes; en móvil oculta el texto de controles importantes. Copiar esos recursos no resolvería la sensación de interfaz pesada de Gesicomm.

La próxima implementación debe reducir la cantidad de decisiones simultáneas y la altura previa al trabajo. Cambiar radios, dar fondo a más botones o achicar letras no resuelve ese problema.

## Método y alcance real

Se observaron estas rutas mediante navegación del navegador autenticado:

| Ruta de Zappy | Qué se revisó | Límite |
| --- | --- | --- |
| [/inicio](https://zappy.com.py/inicio) | Inicio, activación de cuenta, acceso a tienda, contenidos complementarios y aviso de progreso | No se completaron tareas de activación. |
| [/productos](https://zappy.com.py/productos) | Búsqueda, filtros, tarjetas y organización de catálogo | No se solicitó afiliación ni se modificaron productos. |
| [/mis-productos-afiliados](https://zappy.com.py/mis-productos-afiliados) | Estado principal, menú Otros y estado vacío | No había productos aprobados; no se evaluó administración de una lista poblada. |
| [/admin/tienda/personalizar](https://zappy.com.py/admin/tienda/personalizar) | Entrada al constructor, Edición/Vista previa, configuración general y controles por dispositivo | Redirige al editor de la tienda de esta cuenta. No se guardó, publicó, agregó o eliminó contenido. |
| [/ordenes](https://zappy.com.py/ordenes) | Cabecera, tablero, filtros avanzados y adaptación móvil | Tablero sin pedidos; no se evaluó detalle de un pedido real, carga masiva o legibilidad de tarjetas pobladas. |
| [/admin/tiendas/identidad](https://zappy.com.py/admin/tiendas/identidad) | Agrupación por tema, edición de sección, cancelar, preview de marca y acceso público | Se abrió Editar nombre y descripción y se canceló sin cambiar valores. No se comprobó persistencia de guardado. |
| [/billetera](https://zappy.com.py/billetera) | Jerarquía de transacciones, período, pestañas y resumen | Sin transacciones; no se solicitaron retiros ni se evaluó exactitud financiera. |

Se cerró un aviso de progreso inicial. Se abrió y cerró configuración del editor, se cambió entre edición y preview y se abrió/canceló el modal de filtros. Son cambios de navegación/estado visual; no se modificaron datos comerciales.

Tamaños: escritorio 1366 × 768; viewport móvil 375 × 812 para Pedidos y editor. No equivale a móvil físico. No se inspeccionó tema oscuro, no se realizó auditoría completa de accesibilidad ni prueba con usuarios. La cuenta de Zappy y los fixtures locales de Gesicomm tienen contenidos distintos: no se compara productividad ni éxito de tarea como si fueran muestras equivalentes.

No se incluyen correo, teléfono, datos bancarios, tokens, valores particulares de la cuenta ni contenido comercial privado en este documento.

## Evidencia comparativa

### Z01 — El editor se centra en la página y separa los modos · P1

**Observado en Zappy:** barra breve con identidad de la página, Edición/Vista previa, Guardar y configuración. La configuración general se abre desde un control dedicado; no ocupa una columna permanente en el estado inicial observado. Al cambiar a preview, el iframe ocupa todo el ancho y casi toda la altura.

**Observado en Gesicomm:** la edición habitual combina formulario, dos juegos de controles de contexto y preview reducida. Ya hay Ocultar paneles y ampliación, pero el estado habitual sigue cargado. Dar más ancho al iframe no eliminó la repetición de controles.

**Decisión para Gesicomm:** hacer visibles los modos Editar/Vista previa; conservar la edición con contexto sincronizado y ofrecer ajustes de la selección sin exponer simultáneamente el formulario completo. Mantener visible Ver página publicada como acción distinta de la preview. El modo de código avanzado debe seguir separado de la tarea cotidiana.

**Trazabilidad:** E01, E03, E04, E05, R04–R06 de la revisión.

### Z02 — La configuración de una sección tiene principio y fin explícitos · P2

**Observado en Zappy:** Identidad de marca agrupa Marca, Estilo, Voz y comunicación, Contacto público y Otros datos. Los campos de nombre/descripción aparecen deshabilitados hasta Editar. Al entrar a la edición, aparecen Cancelar y Guardar marca. Se pudo cancelar sin modificar valores. El acceso Visitar tienda tiene texto y está en una sección identificada.

**Límite del patrón:** siguen existiendo secciones largas, imágenes y ayuda; no se concluye que toda la pantalla sea compacta. El uso de campos deshabilitados no demuestra por sí solo que la lectura o accesibilidad sean mejores.

**Decisión para Gesicomm:** conservar agrupaciones por tarea y dejar claro qué se modifica y qué se guarda. Usar títulos y separadores para evitar otra tarjeta dentro de cada sección. No cambiar automáticamente a guardado por sección: primero decidir y comunicar el alcance, porque hoy hay guardados globales. Preservar las flechas de Mi negocio, pedidas expresamente por el usuario.

**Trazabilidad:** T01–T03, G03, G05, G09.

### Z03 — Los controles secundarios no preceden siempre al contenido · P1

**Observado en Zappy:** Órdenes de Pedido presenta una barra con búsqueda, vista, Filtros, refrescar y Nuevo pedido. El tablero comienza en y=158 px a 1366 × 768. Fecha, método de pago, importe y otros ajustes están en Filtros avanzados, que se abre como modal.

**Límites:** no había pedidos; esto mide el comienzo del área de trabajo, no el primer registro ni la facilidad de resolver un pedido. El tablero muestra desplazamiento horizontal en escritorio. La visibilidad opcional de canceladas es una decisión de negocio que no se debe copiar sin revisar las necesidades de operación.

**Decisión para Gesicomm:** trasladar el principio de filtros bajo demanda a las pantallas autorizadas, especialmente Depósitos y Publicidad. Conservar búsqueda y filtros frecuentes visibles; mostrar que existen filtros activos. No cambiar Gestión Comercial, Gestión Logística, sus estados ni su navegación: siguen expresamente excluidos.

**Trazabilidad:** G06, G09, O04, A01. C01–C08/O01–O03 se conservan como contexto histórico, no como autorización de implementación.

### Z04 — La jerarquía puede reducirse sin eliminar estados · P2

**Observado en Zappy:** Mis productos afiliados prioriza Mis productos aprobados. Otros abre Solicitudes de afiliación, Productos inactivos y Productos desafiliados. El estado vacío explica que los productos aparecerán tras aprobación.

**Límite:** una cuenta sin aprobados no permite juzgar la densidad de una lista poblada. El bloque promocional de academia debajo del vacío desvía atención de la tarea.

**Decisión para Gesicomm:** mantener pocas opciones principales visibles y agrupar acciones secundarias cuando realmente sean poco frecuentes. No esconder alertas, incidencias ni estados necesarios para decidir. No introducir otra vista del catálogo: el usuario pidió tarjetas como única presentación.

**Trazabilidad:** P01–P03, G05, G09.

### Z05 — El resumen financiero puede ser una vista, no una barrera · P2

**Observado en Zappy:** Billetera ofrece período y pestañas Todos, Ingresos, Egresos, Solicitudes de Retiro y Resumen. El estado inicial da acceso a Transacciones; las cifras de saldo aparecen como información complementaria. Hay un estado vacío explícito y una acción de retiro deshabilitada.

**Límite:** Billetera no equivale al sistema de costos y rentabilidad de Gesicomm. No se validaron reglas de saldo, retención, retiro ni clasificaciones contables.

**Decisión para Gesicomm:** evaluar Resumen y Movimientos como contextos claros, preservando el rango y el alcance de los datos. No adaptar cálculos ni definiciones contables para imitar una presentación. La revisión financiera funcional sigue pendiente.

**Trazabilidad:** F04–F06, G07.

### Z06 — El catálogo demuestra que muchas tarjetas también pueden pesar · P2

**Observado en Zappy:** una fila inicial de búsqueda/tipo/categoría permite empezar a buscar. Luego aparecen carruseles Recomendado por proveedores y Los más vendidos, además de Explorar todos los productos. Las tarjetas muestran precios de proveedor y sugerido y la acción Más detalles.

**Decisión para Gesicomm:** conservar búsqueda clara y precio bien rotulado; evitar sumar carruseles promocionales a un catálogo administrativo. Mantener tarjetas y Exportar verde, como indicó el usuario. Reducir texto secundario por tarjeta sin borrar información que permita decidir; ofrecer el detalle completo al abrirla.

**Trazabilidad:** P01, P03, P04, G03, G06.

## Medición del editor: modos equivalentes y modos distintos

| Producto y modo | Viewport | Inicio del iframe | Ancho visible | Alto visible |
| --- | --- | --- | --- | --- |
| Zappy, Vista previa | 1366 × 768 | 65 px | 1366 px | 703 px |
| Gesicomm, paneles ocultos, Escritorio | 1366 × 768 | 151 px | 1366 px | 617 px |
| Gesicomm, edición conjunta | 1366 × 768 | Marco desde 293 px | Marco de unos 896 px | Marco de unos 382 px |
| Zappy, Vista previa | 375 × 812 | 65 px | 375 px | 747 px |
| Gesicomm, paneles ocultos, Escritorio | 375 × 812 | 349 px | 375 px | 463 px |

En los modos de preview dedicados de escritorio, Gesicomm ya usa el ancho disponible: la diferencia observada está principalmente en la altura de la interfaz superior. Por tanto, no corresponde seguir atribuyendo el problema exclusivamente al ancho.

La edición conjunta de Gesicomm no equivale a la preview dedicada de Zappy: ofrece formulario y página a la vez. La comparación sirve para decidir qué costo tiene cada modo; no prueba que uno sea mejor para todas las tareas. En móvil, el caso medido de Gesicomm mantiene la simulación Escritorio elegida; no equivale a evaluar su emulación Celular.

Las medidas de Gesicomm usan fixtures sintéticos locales. Las de Zappy provienen del DOM de su sesión real, con la tienda de prueba de esta cuenta. Las coordenadas son evidencia de layout en estos estados, no indicadores de rendimiento humano. Datos locales en `C:/Proyectos/Gesicom/outputs/ux-audit/comparacion-preview-gesicomm-2026-10-22.json`.

## Lo que no conviene copiar

- **Inicio extenso y promocional:** activación, explicación del servicio, aviso beta y equipo. Esa introducción no debe anteceder a cada tarea cotidiana de Gesicomm.
- **Tarjetas por todo:** Zappy también usa superficies grandes, sombras, carruseles y contenido promocional. La referencia no justifica agregar recuadros.
- **Acciones importantes solo con iconos:** en el editor móvil se ocultan los textos Edición y Vista previa. El selector visible depende del icono de lápiz/ojo; la búsqueda por texto visible no lo encuentra. Los botones de dispositivo de escritorio miden aproximadamente 30 px de alto. Mantener nombres accesibles, texto donde ayude a decidir y objetivos táctiles apropiados en Gesicomm.
- **Herencias de contenido de prueba:** textos de relleno o falta de productos de esta cuenta no se atribuyen a todos los usuarios de Zappy.
- **Agrupaciones de negocio ajenas:** no trasladar estados, comisiones, retenciones o lógica de aprobación sin analizar las reglas propias de Gesicomm.

## Propuesta de composición para Gesicomm

| Pantalla | Estructura inicial propuesta | Contenido bajo demanda | Lo que debe dominar |
| --- | --- | --- | --- |
| Depósitos | Retorno reconocible; título + Agregar depósito; resumen breve de entrega; búsqueda/estado; listado | Detalle de modalidad, filtros adicionales, ayuda extensa | Depósitos y Administrar |
| Publicidad | Título + Nueva campaña; rango/alcance cuando corresponda; cifras en una línea; búsqueda/filtro; campañas | Cómo empezar, explicaciones de métricas, mantenimiento | Campañas y Cargar gasto |
| Mi e-commerce | Identidad/estado de la página; Editar/Vista previa; contexto activo único; Guardar y Ver página publicada | Ajustes de la sección elegida, código avanzado, mantenimiento | La página y el ajuste que se está realizando |
| Mi negocio | Navegación existente; sección activa con título; campos legibles y alcance claro de Guardar | Ayuda extensa y opciones avanzadas | La configuración de la sección |

Una sola acción primaria por contexto. Los retornos deben ser reconocibles sin competir con Guardar o Agregar. La visibilidad pedida para Volver a Mi Tienda se conserva; no obliga a añadir otra tarjeta a su alrededor.

## Orden y criterios para implementar

1. **Depósitos: R01–R02 / O04–O06.** Reducir las franjas previas al listado y los recuadros de metadatos. Conservar el retorno visible y las funciones de entrega/transportistas.
2. **Publicidad: R03 / A01.** Integrar encabezados y cifras. Conservar la guía por pasos como ayuda secundaria y la aclaración sobre Meta.
3. **Editor: R04–R06 / E01–E06.** Definir modos claros, contexto único y ajustes bajo demanda. Conservar aceptación única de IA, alcance de Guardar, datos pendientes y acceso a página publicada.
4. **Mi negocio, catálogo, producto y reportes.** Revalidar tareas completas después de fijar el patrón. No dar por resueltas las áreas financieras por esta comparación visual.

Por pantalla: conservar captura inicial, implementar la composición entera, comparar la misma tarea y el mismo estado, verificar escritorio/móvil/teclado, revisar claro/oscuro y registrar los IDs cerrados. No cerrar por ausencia de overflow o por aprobar tests técnicos: también debe poder reconocerse la tarea y la próxima acción.

Se mantienen todas las restricciones: paleta de Gesicomm, orden/ubicación del sidebar, Comercial/Logística originales, tarjetas como única vista del catálogo, Exportar verde y flechas de Mi negocio. Esta comparación documenta decisiones de diseño; no implica haber implementado todavía esta composición ni haber probado su impacto con usuarios.
