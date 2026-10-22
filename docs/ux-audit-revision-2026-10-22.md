# Revisión de la implementación frente a la auditoría original

Fecha: 22 de octubre de 2026. Estado: revisión de Gesicomm documentada. Comparación autenticada posterior disponible en [Comparación con Zappy](ux-comparacion-zappy-2026-10-22.md).

## Diagnóstico

La intervención anterior fue parcial y dio demasiado peso al acabado de controles. Unificó algunos radios, mejoró nombres y resolvió comportamientos concretos, pero no cerró el problema central de la auditoría: demasiadas capas antes de la tarea. Un botón más visible o una guía mejor organizada pueden mejorar una interacción y, simultáneamente, mantener una pantalla demasiado cargada.

Los hallazgos G03, G05, G06, G09, O04, A01 y E01–E03 siguen siendo relevantes. No corresponde declarar terminada la auditoría por haber aprobado recorridos automatizados o una compilación.

## Evidencia y límites

Fuentes utilizadas:

- Auditoría original y continuación pegadas por el usuario en esta conversación.
- Capturas del usuario: listado de Depósitos, guía de campañas y editor de e-commerce.
- Lectura del código actual de Depósitos, Publicidad, editor y hojas CSS compartidas.
- Seis capturas locales de esta revisión, en `outputs/ux-audit/revision-*.png`: escritorio 1366 × 768 y viewport móvil 375 × 812, tema claro, datos sintéticos. Se midió el estado inicial; la guía de campañas estaba cerrada.
- Mediciones del DOM en `outputs/ux-audit/revision-mediciones-2026-10-22.json`.

Las rutas de evidencia son relativas a `C:/Proyectos/Gesicom/`, excepto el código, que pertenece a `gesicomm-frontend/`. Las capturas locales no son capturas de la cuenta del cliente. Los números de esta sección no se extrapolan a todos los comercios. El viewport móvil automatizado no es un teléfono físico.

Esta revisión no ejecutó guardados comerciales, publicaciones, eliminaciones, pagos ni cambios de integración. No valida contabilidad, cumplimiento normativo, seguridad, conversión ni accesibilidad completa. No se realizaron sesiones con usuarios.

## Referencia solicitada: Zappy

El usuario identificó la referencia como https://zappy.com.py/inicio. Al abrirla, redirige a https://zappy.com.py/auth/login?redirect=inicio. Se observó el acceso con pestañas Correo/Celular y acceso con Google. Eso no permite afirmar cómo están organizados sus listados, formularios o editor interno.

Después de esta primera revisión, el usuario inició sesión y se inspeccionaron siete áreas de Zappy. Los hallazgos, recorridos, medidas y límites están en [Comparación con Zappy](ux-comparacion-zappy-2026-10-22.md). Se conserva este documento como línea base de Gesicomm; la pantalla de acceso por sí sola no se usó para inferir el funcionamiento interno.

La comparación de tareas completas sigue limitada por la disponibilidad de datos en la cuenta de referencia: no había pedidos ni productos aprobados. Se inspeccionaron los controles, estados vacíos y edición/cancelación de una sección, sin ejecutar guardados. No equivale a medir éxito, tiempos ni persistencia.

## Mediciones actuales

Coordenadas desde el borde superior del viewport, sin desplazamiento inicial. Valores redondeados; dependen del fixture y del ancho.

| Vista | Escritorio 1366 × 768 | Viewport móvil 375 × 812 | Lectura |
| --- | --- | --- | --- |
| Depósitos | Primer depósito: y=650 px; bloque de entrega: 146 px; filtros: 167 px | Primer depósito: y=1098 px; entrega: 298 px; filtros: 253 px | El contenido operativo queda relegado incluso con la configuración de entrega cerrada. |
| Publicidad | Primera campaña: y=627 px; guía cerrada: 101 px | Primera campaña: y=1020 px; guía cerrada: 144 px | Resumen, títulos y ayuda anteceden al listado. Mejorar los pasos no resolvió A01. |
| Editor | Área de preview empieza en y=119 px; marco de escritorio en y=293 px, con 382 px de alto | Barra superior: 211 px; preview lateral oculta por breakpoint | En escritorio, unos 174 px del panel de preview se consumen antes del marco. En móvil las acciones superiores tienen un costo considerable. |

En el editor medido, el marco tiene aproximadamente 896 px de ancho y simula un escritorio de al menos 1280 px: la composición se reduce aproximadamente al 70 %. No es adecuado juzgar la legibilidad final solo con esa reducción. Quitar el límite máximo y plegar el panel mejoró el modo ampliado, pero no resolvió el modo habitual de edición.

## Hallazgos priorizados y corrección propuesta

### R01 — Depósitos sigue priorizando explicación sobre operación · P1

Trazabilidad: G03, G06, G09, O04.

Evidencia: `src/pages/tienda/DepositosPage.jsx`, `depositos.css` y capturas de esta revisión. Antes del primer registro siguen apareciendo retorno, título, descripción, conteos, tarjeta de entrega, título Tus depósitos con párrafo y superficie de filtros.

Corrección: conservar un retorno reconocible y una cabecera con Agregar depósito. Reducir entrega a un resumen de modalidad con Cambiar; desplegar su explicación al editar. Integrar el conteo con el listado. Usar una fila de búsqueda/estado en escritorio y apilarla sin otro contenedor ornamental en móvil. Ubicar la ayuda detallada junto a Administrar o en una explicación expandible.

Aceptación: a 1366 × 768, ver completa la primera fila y su acción Administrar sin scroll vertical. En móvil debe aparecer el comienzo del listado en la pantalla inicial con los datos del fixture, sin reducir tipografía ni áreas táctiles. Registrar las coordenadas antes y después.

### R02 — Los contadores de Depósitos siguen creando superficies para datos secundarios · P2

Trazabilidad: G03, O05, O06.

Evidencia: `src/components/depositos/DepositoCard.jsx`: dos recuadros para Transportistas y Ciudades; el nombre de quien entrega no aparece en ese resumen. Quitar el rectángulo negro accidental no resolvió la jerarquía de estos datos.

Corrección: presentar transportista y cobertura como metadatos legibles de la fila. Confirmar primero si la respuesta actual trae nombres; si no, documentar el cambio de API necesario. Mantener las alertas accionables y evitar peticiones adicionales por fila sin evaluar su costo. En el panel Administrar, usar títulos y separadores para Datos, Transportistas y cobertura, Abastecimiento.

Aceptación: poder identificar quién entrega desde el listado cuando el dato esté disponible; distinguir dato cargando, sin asignar y error. No usar ceros para representar una carga pendiente.

### R03 — Publicidad conserva demasiadas franjas antes de las campañas · P1

Trazabilidad: A01, G03, G06, G09.

Evidencia: `src/pages/Ads.jsx`, `src/pages/ads/AdsCampanas.jsx` y `publicidad.css`. Permanecen encabezado general, pestañas, encabezado de campañas, descripción, tres tarjetas y guía antes de la tabla.

Corrección: una cabecera de trabajo con Nueva campaña; mantener la aclaración sobre Meta en una frase breve. Pasar las tres cifras a un resumen compacto. Convertir la guía en ayuda secundaria accesible desde Cómo empezar; conservar sus pasos claros dentro del desplegable. Evitar repetir Nueva campaña en varios lugares simultáneos si no aporta contexto.

Aceptación: la primera campaña y Cargar gasto deben quedar visibles en escritorio sin recorrer introducciones. En móvil el resumen no debe ocupar tres tarjetas altas antes del primer registro. No esconder los importes ni reducir sus letras para lograrlo.

### R04 — El editor todavía tiene dos sistemas para elegir contexto · P1

Trazabilidad: E01, E02, G08.

Evidencia: `src/pages/landing-simple/ConfigurarVentaCodigo.jsx`: Qué querés editar y Contenido de vista previa, además de pestañas en configuración y en preview. Los controles están vinculados, pero la repetición sigue imponiendo lectura y ocupando altura.

Corrección: un único contexto visible de edición, con dispositivo separado. Seleccionar un producto una sola vez y sincronizar la ficha y su preview. Si se mantiene una preview independiente, debe ser una opción explícita con nombre de página y aviso de separación. Conservar la protección implementada para código pendiente destinado a otra página.

Aceptación: en cualquier momento se puede responder qué página se edita, cuál se previsualiza y a cuál se aplica el código, sin comparar selectores duplicados.

### R05 — La preview habitual sigue demasiado reducida · P1

Trazabilidad: E03, G06.

Evidencia: medición de marco y altura en esta revisión. Ya se eliminó el máximo de 1280 px para espacios amplios y se redujo la columna de configuración; faltan jerarquía de controles, indicación de ancho y zoom y ajuste del espacio por el usuario.

Corrección: barra breve para dispositivo, ancho simulado y escala; acción visible Ampliar vista previa. Evaluar un divisor redimensionable con límites que preserven la legibilidad del formulario. El modo ampliado debe usar la superficie disponible. A 100 %, el contenido debe conservar su tamaño real y permitir un desplazamiento predecible cuando no quepa. No confundir ampliar la preview con abrir la página publicada.

Aceptación: probar Inicio, Categoría, Producto y Checkout con contenido real representativo, en modo conjunto y ampliado. Verificar cambio de ancho, scroll y persistencia de la selección. Mostrar la escala si hay reducción. No declarar resuelto E03 solo porque el iframe llena su contenedor.

### R06 — La cabecera del editor sigue acumulando acciones · P2

Trazabilidad: E05, E06, G05.

Evidencia: la mejora reciente dio texto a Ver página publicada y Eliminar página. La segunda sigue como acción permanente en la misma fila que Guardar y Publicar; esto no completa E06.

Corrección: conservar el acceso visible a la página publicada y la explicación del guardado. Agrupar mantenimiento en un menú con etiquetas completas y confirmación del alcance. No volver a ocultar la publicación detrás de un icono sin texto. Revisar qué acciones de diseño avanzado corresponden realmente a la cabecera cotidiana.

Aceptación: Guardar debe dominar el contexto de edición; eliminar debe seguir siendo localizable y requerir una decisión explícita. Validar la cabecera en móvil sin que desplace casi todo el formulario.

### R07 — Varias capas CSS permiten corregir síntomas y conservar inconsistencias · P2

Trazabilidad: G03, G04, G05.

Evidencia: estilos locales, utilidades y capas `systemTypography.css`, `panelComponents.css`, `ecommerceWorkspace.css` y `editorWorkspace.css`. La regla global de borde de botones produjo los rectángulos interiores que el usuario reportó; fue corregida. En Depósitos sobreviven radios locales grandes que luego se sobrescriben desde una capa común para algunos componentes.

Corrección: antes de agregar otra regla general, identificar qué capa es responsable del componente. Consolidar tokens y estilos en componentes concretos por contexto. Definir cuándo hay superficie, separador o texto simple. No aplicar bordes a toda área clicable ni convertir cada instrucción en una tarjeta.

Aceptación: revisar estilo calculado y composición completa en claro/oscuro. Cada borde o sombra debe tener una función identificable; el radio compartido por sí solo no acredita una pantalla más simple.

## Trazabilidad del resto de la auditoría

Esta tabla distingue cambios existentes de validación pendiente. No equivale a haber vuelto a recorrer todas las pantallas.

| Hallazgos | Estado de esta revisión | Trabajo restante o restricción |
| --- | --- | --- |
| G01–G02 | Recomendación limitada por decisión posterior del usuario | Preservar orden, agrupación y ubicación del sidebar. No usar la auditoría para reordenarlo. |
| G07 | Sin validación completa | Unificación de períodos, moneda y alcance de indicadores pendiente de revisión funcional. |
| G08, G10 | Parcial | Se corrigieron nombres accesibles puntuales; falta inventario de términos y revisión completa de foco, landmarks y estados. |
| L01–L03 | Hay implementación previa; no revalidada aquí | Conservar cambios de acceso y menú de acciones de tiendas; comprobar el recorrido completo en una revisión específica. |
| D01–D04 | Parcial según implementación previa | Se ajustaron proporciones y mensaje de datos insuficientes; no se cerró la organización completa de reportes ni la comparabilidad de métricas. |
| P01–P02, P04–P08 | Parcial según código y pruebas previas | Hay herramientas plegables, selección contextual, guardado de precios y formulario más ancho. Falta evaluar su composición como conjunto y los errores de campo en una tarea completa. |
| P03 | Recomendación modificada por el usuario | Mantener solo tarjetas y exportación verde. No volver a introducir vista de lista. Mejorar densidad dentro de esas restricciones. |
| C01–C08, O01–O03 | Fuera del rediseño por decisión posterior | Gestión Comercial y Gestión Logística se conservan originales. No intervenirlas ni mediante estilos compartidos. |
| O04–O06 | Parcial / abierto | R01–R02 documentan lo que sigue sin resolver. |
| F01–F06 | No revalidados | No atribuir a este trabajo correcciones de navegación, estados de negocio, rankings, conciliación contable o formulario financiero que no se hayan comprobado. |
| A01–A02 | A01 abierto; A02 no revalidado | R03. La guía por pasos es una mejora puntual; no acredita simplificación de la vista completa. |
| T01–T03 | Parcial / sin nueva validación de tarea | Hay ajustes de superficies; falta revisar encabezados y capas de configuración y pagos. Preservar las flechas de Mi negocio por preferencia expresa del usuario. |
| E01–E07 | Parcial | R04–R06. La sincronización de código y el alcance del guardado mejoraron. Checkout y separación de edición cotidiana/avanzada no se consideran cerrados. |
| S01–S02 | No revalidados | Revisar los programas y formularios antes de atribuirles una mejora. No activar ni aceptar términos durante inspección. |

La aceptación única del aviso de IA es una mejora funcional pedida posteriormente por el usuario. No sustituye la revisión de composición del editor ni demuestra la veracidad del contenido publicado.

## Criterio común para la siguiente implementación

1. Diseñar la pantalla alrededor de su tarea: registros en listados, campos en formularios, página en el editor.
2. Una acción primaria por contexto; secundarias visibles cuando sean frecuentes; mantenimiento en menú con etiquetas claras.
3. Una superficie principal por agrupación funcional; subdividir con espacio y separadores. No reemplazar cada recuadro quitado por otro fondo destacado.
4. Información breve visible; explicaciones largas bajo demanda. No ocultar instrucciones necesarias para evitar un error inmediato.
5. Mantener paleta, tipografía legible, áreas táctiles y foco visible. Reducir contenedores y duplicación, no letras.
6. Aplicar el patrón primero a una pantalla completa y verificarlo con las mismas tareas y datos antes de extenderlo.

Orden propuesto: Depósitos, Publicidad, editor, Mi negocio/pagos; después revalidar catálogo, producto, dashboard y las áreas que aún no tuvieron revisión funcional. El sidebar y Comercial/Logística conservan las restricciones vigentes.

## Validación necesaria para cerrar

- Comparar capturas antes/después con mismo viewport, datos, selección y estado de despliegue. Usar las mediciones iniciales de este documento como línea base local, no como metas de negocio.
- Recorrer búsqueda → detalle → edición → cancelar/guardar → regreso. Registrar errores, pérdida de contexto y cambios pendientes.
- Escritorio 1366 × 768, ancho intermedio, móvil real y claro/oscuro; teclado y zoom del navegador. Los viewports simulados son una etapa de comprobación, no sustituyen dispositivos reales.
- En el editor, comprobar la página publicada y el modo previo sin asumir que son equivalentes. No publicar una tienda real para una prueba visual.
- Con usuarios nuevos y vendedores habituales, repetir las siete tareas de la sección 12 de la auditoría original. Registrar éxito sin ayuda, tiempo, errores, retrocesos y dudas. No inventar porcentajes de mejora.
- Vincular cada cambio con su ID de hallazgo y evidencia. Un test técnico aprobado prueba su aserción; no prueba que la interfaz sea clara o ligera.

La comparación visual con Zappy está documentada por separado; las sesiones con usuarios y el rediseño no se consideran concluidos. Esta es la línea base corregida para realizar ese trabajo sin repetir cambios aislados.
