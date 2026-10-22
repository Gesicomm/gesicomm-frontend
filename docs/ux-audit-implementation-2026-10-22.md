# Aplicación de la auditoría UX/UI · 22/10/2026

Esta intervención aplicó ajustes parciales al panel del comercio. No resolvió
por completo los problemas de espacio, jerarquía y ayuda permanente de la
auditoría recibida. La revisión posterior identifica problemas de composición
que siguen abiertos; ver [Revisión de la implementación](ux-audit-revision-2026-10-22.md).
La paleta y la tipografía de la tienda pública conservan sus reglas. Marca
Personal queda fuera del alcance. Los resultados técnicos que siguen no
equivalen a una validación de usabilidad.

## Cambios aplicados

| Área | Resultado |
| --- | --- |
| Base CSS | `src/styles/ecommerceWorkspace.css`: radios compartidos, botones coherentes, foco visible, adaptación del layout y movimiento reducido. Alcance delimitado por `.user-layout-container`. |
| Navegación | Orden, grupos, rutas y ubicación originales restaurados por indicación del usuario. Solo se mantienen ajustes visuales. |
| Ingreso | Propuesta breve, beneficios reservados al registro, sombra reducida y descripción del método de acceso disponible. |
| Mis tiendas | Inactivar y eliminar pasan a Opciones. Se mantienen la confirmación de inactivación, el requisito de tienda inactiva y la confirmación por nombre al eliminar. |
| Dashboard | Ventas ocupa un tercio de la fila y el resumen dispone de dos tercios. Pedidos entregados explicita su alcance. Un período sin ventas no produce un diagnóstico de pérdida. |
| Catálogo | Vista única de tarjetas y exportación con su verde original, por preferencia del usuario; herramientas secundarias desplegables; selección global disponible después de seleccionar la página; estados de guardado y error del precio legibles. |
| Producto | Navegación horizontal, formulario ancho, requisitos e importación con IA plegables y resumen bajo demanda. El costo ausente no genera un diagnóstico de margen; un costo cero intencional se conserva al guardar. |
| Mi negocio y Depósitos | Superficies y sombras simplificadas, encabezados y ayudas con espacio proporcionado. Las secciones del detalle de depósito usan separadores. Se conservan los resúmenes de transportistas y la configuración de entrega plegable ya existentes. |
| Editor | Nombre accesible en expansores de bloques, controles con mayor área de interacción y barra superior adaptable. La vista previa mantiene sus estilos propios. |

## Restauración solicitada por el usuario

Gestión Comercial y Gestión Logística, incluidos tabla, Kanban, acciones,
rendición y modales de pedido, vuelven al código original anterior a esta
intervención. Ambas vistas quedan excluidas de las nuevas capas CSS, también
cuando sus menús se montan como portales. El menú principal conserva exactamente
su orden y agrupación del servidor.

Validación posterior: 17 recorridos de navegador aprobados. Incluyen el orden
original del menú y la comparación de geometría y estilos de ambas vistas con
las nuevas hojas CSS activadas y desactivadas, a 375 y 1363 px. Los cinco archivos
fuente de pedidos restaurados coinciden con su contenido original en Git.

## Evidencia histórica de la primera iteración (antes de la restauración)

- Compilación de producción correcta. Vite mantiene su advertencia de tamaño de
  algunos bundles; no impide compilar.
- 108 pruebas unitarias aprobadas: productos, catálogo, pedidos, modal de pedido,
  selección de tienda y arrastre de bloques del inicio.
- 13 recorridos aprobados en `ecommerce-audit-ux.spec.js` y `sidebar-ux.spec.js`:
  escritorio y celular, claro y oscuro, guardado de precio, selección, navegación,
  resumen por teclado, vista previa de producto, rendición y disponibilidad de
  tienda. Estos recorridos usan API simulada.
- También pasaron los recorridos existentes de dashboard y stock (9), Depósitos
  (4), configuración responsive de Mi tienda (11) y tipografía compartida (4).
- Revisión de identificadores e imports de los 12 archivos fuente JavaScript/JSX
  modificados: ninguna referencia sin resolver.
- Capturas revisadas en `C:/Proyectos/Gesicom/outputs/ux-audit/`.

El test histórico `product-vista-landing-flow.spec.js` sigue buscando el selector
de rubros «Genérico / ficha básica», ausente en el formulario actual previo a
esta intervención. Se conserva sin cambios; ese recorrido completo no se cuenta
como aprobado. La vista de producto actual se verifica en el nuevo recorrido.

## Límites

La intervención no equivale a completar cada cambio de producto propuesto por la
auditoría. Quedan pendientes la unificación de períodos y moneda entre todos los
módulos, la configuración de columnas del catálogo, la extracción de reportes
del dashboard y una revisión completa de la sincronización entre editor visual,
código y vista previa. Los nombres y las ayudas se unificaron en los controles
intervenidos, no mediante una sustitución global de términos.

Los cambios no certifican cálculos contables, checkout público, permisos de
servidor ni conformidad WCAG completa. Las operaciones de prueba se realizaron
con datos simulados y no constituyen una validación de guardado en producción.
Los cambios se entregan en el código local del frontend.
