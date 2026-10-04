# E2E manual: Bazar, Moda, paletas y combos

Fecha: 3/10/2026. Entorno local: localhost:5173 / localhost:3000.

## Resultado

Se crearon productos y landings Bazar y Moda manualmente con datos ficticios, se guardaron, se reabrieron y se publicaron. Las fichas de ambos productos coinciden entre preview y publicación en texto normalizado, imágenes y variables de estilo. La comparación excluye contadores dinámicos y marcas exclusivas del editor.

Se corrigieron los errores encontrados. Pasan 68 pruebas frontend y 33 backend (101 total), el build y la revisión estricta de referencias e imports de 28 archivos. El build conserva el aviso habitual de tamaño de chunks.

La compra se comprobó hasta carrito y resumen de checkout. No se confirmó un pedido ni pago ni se enviaron mensajes externos. Los resultados corresponden a estos casos, no a todas las combinaciones posibles de datos.

## Registros de prueba

| Caso | Registros | URL |
| --- | --- | --- |
| Bazar | Usuario QA 201; producto 1320; pack 73; landing 197 | http://localhost:5173/l/bazar-jobar-hogar-y-decoracion-567e57 |
| Moda | Usuario QA 202; producto 1371; landing 198 | http://localhost:5173/l/moda-e-indumentaria-f20854 |
| Combo sin ficha propia | Combo 11; ficha_datos vacío | http://localhost:5173/l/moda-e-indumentaria-f20854/combo-11 |
| Paleta de preview | Usuario QA 203; landing 199 en borrador | http://localhost:5173/landing/199 |

Nombres, documentos, contactos, opiniones e imágenes están identificados como QA.

## Campos cargados manualmente

| Grupo | Cobertura en ambos templates |
| --- | --- |
| Identidad | Nombre, SKU, categoría, proveedor nuevo, tags, dos fotos |
| Precio | Costo, venta, ancla, IVA, descuento, fechas |
| Inventario | Opciones/variantes, SKU, stock salón y depósito, mínimos, unidad, diferencia de precio |
| Venta | Pack, código, nombre, descripción, cantidad, precio, fechas, variante fija, imagen |
| Contenido común | Propuesta, CTA, notas, beneficios, FAQ, confianza |
| Publicación | Activo, en venta, destacado |
| Landing | Logo, marca, siete campos de contacto, cinco redes, portada completa, destacados, etiquetas, ancla, beneficios, FAQ, tres colores, título y descripción de catálogo |
| Producto en landing | Descripción, video, promesa exclusiva, título y selección de relacionados |

Se completaron las diez secciones de cada ficha con valores nuevos; se guardaron y reabrieron. Las listas se probaron con una o más filas, sin agotar todos sus límites.

| Sección | Campos cubiertos |
| --- | --- |
| 1. Contador | Texto, horas/minutos/segundos y rótulos |
| 2. Cinta | Mensaje, CTA, animación, velocidad, separador |
| 3. Encabezado/compra | Migas, etiqueta, rótulo, título, promesa, calificación, texto de reseñas, nota de precio, notas de todas las variantes, rótulos y notas de packs/unidad, ahorro, cantidad, CTA, texto posterior, color, notas de compra |
| 4. Beneficios/historia | Título y detalle del beneficio; rótulo, título, texto, punto e imagen de historia |
| 5. Materiales/Telas | Rótulo, título, destacado, bajada, color, tarjeta con nombre/texto/imagen |
| 6. Ambientes/Looks | Rótulo, título, destacado, tarjeta con nombre/texto/imagen |
| 7. Medidas/Talles | Bazar: título, destacado, medida y contexto. Moda: título, destacado, instrucciones, CTA, tabla de tres columnas y dos filas |
| 8. Detalles | Rótulo, título, pregunta y respuesta |
| 9. Reseñas | Rótulo, título, opinión ficticia con nombre/detalle/calificación/texto/imagen |
| 10. Complementos/confianza | Título y CTA, cuatro sellos con icono/título/texto, marca y frase del pie |

Moda: se agregó L antes de guardar y se verificaron las notas de S/M/L después de recibir IDs definitivos. Bazar: se verificaron notas Arena/Oliva. Se cambió la cantidad del pack Moda y se comprobó que conserva su variante fija.

Los catálogos publicados muestran título y descripción. Las páginas de contacto conservan dirección, ciudad, país, teléfono, email, horarios y enlaces de las cinco redes y WhatsApp.

## Herencia y personalización

El complemento de Moda sin ficha propia hereda encabezado, promesa, CTA y tarjeta de telas de la ficha por defecto de la landing. El vestido mantiene sus campos propios. Esta herencia se probó con campos representativos; no se rellenaron de nuevo todas las secciones del panel por defecto.

Se guardaron promesas exclusivas por landing y se confirmó por lectura de los registros QA 1320/1371 que sus promesas globales originales siguen intactas.

Relacionados manuales: Bazar muestra "Relacionados Bazar QA 0310" y su complemento QA; Moda muestra "Relacionados manuales Moda QA" y su complemento QA.

## Precios

| Selección | Precio comprobado |
| --- | --- |
| Florero base / Oliva | 143.100 / 153.100 |
| Pack Bazar | 250.000; referencia 286.200, ahorro 13% |
| Vestido base / M | 204.000 / 216.000 |
| Pack Moda | 360.000; referencia 408.000, ahorro 12% |
| Combo Moda fijo | 304.000 |
| Componentes por separado | 284.000 = 204.000 + 80.000 |

Oliva y M llegaron a carrito y resumen de checkout con su variante/precio correctos. Los dos packs y el combo se comprobaron en carrito. El precio fijo del combo se conserva: como supera el valor por separado, no se anuncia ahorro inexistente.

## Paleta al usar template

El modal permite "Usar colores de preview" (predeterminado) o "Usar colores de mi tienda". Se cambió entre las opciones por interfaz y se creó la landing 199 usando preview. Su tienda tenía una paleta azul. Después de recargar el editor persistieron fondo #FBFAF7, texto #292722 y acento #A95843.

Las pruebas cubren los dos payloads, la herencia sin paleta explícita, la persistencia y el rechazo de colores inválidos antes de reemplazar una landing. No se reemplazaron las landings publicadas para probar la segunda opción.

## Combo sin vista propia

El combo 11 se armó manualmente con el asistente, vestido + complemento, descripción y precio fijo; se puso en venta y se añadió al catálogo. Su ficha_datos está vacío.

Conserva su composición de combo (incluidos, cantidades, precios y detalles) con la identidad de Moda: #faf4f7, #38242e, #985776, títulos Georgia y cuerpo Arial. Preview y publicado coinciden en imágenes y variables de estilo. Los bloques vacíos tienen guías sólo en preview.

Se quitaron por defecto envío gratis, garantía de 30 días, calificación/reseñas, "Más vendido" y urgencia inventados. Sólo se muestran esos datos cuando se cargan. Las pruebas cubren identidad en los seis templates y prioridad de contenido propio.

## Correcciones

- Onboarding: respuestas antiguas de disponibilidad de subdominio podían bloquear el avance.
- Variantes: clave estable para notas antes/después de guardar y normalización de nombres recién generados.
- Packs: variante fija o a elección, preservación al cambiar cantidad y actualización al volver a ficha/preview.
- Precio público: descuento vigente, mínimo y precio personalizado compartidos entre preview y publicado.
- Medidas/Guía: fragmento destacado editable que no se renderizaba.
- Relacionados: título/selección se perdían al leer contenido sanitizado; ahora se recupera el override autorizado sin exponerlo.
- Combo: precio de referencia de componentes incorrecto cuando tenían descuento, en catálogo completo y paginado.
- Paletas: selección explícita y validación backend.

La corrección previa de título/descripcion de catálogo incluye pruebas para Beauty y los demás templates. No se repitió la carga manual de todos los campos de Beauty en este recorrido.

## Responsive y evidencias

Bazar, Moda y combo publicados se comprobaron en viewport móvil de 390 px (área útil 375 con scrollbar), sin desbordamiento horizontal. Preview Bazar móvil se revisó con panel oculto (336 px útiles). Las imágenes diferidas de materiales, ambientes y reseñas cargan al recorrer la página. Las comparaciones de escritorio se hicieron antes del cambio de viewport.

Evidencias: C:/Users/Martin/.codex/visualizations/2026/10/02/01a0fd65-d628-7680-ab4f-0eeac6b22a36/

- bazar-comparacion-final.json; moda-comparacion-final.json
- bazar-ficha-final.jpg; moda-ficha-final.jpg
- bazar-publicada-mobile-final.jpg; moda-publicada-mobile-final.jpg; combo-moda-mobile-final.jpg
- selector-colores-preview.jpg; colores-preview-persistidos.jpg
- combo-moda-publicado.jpg

## Validación

Frontend: 68 pruebas en diez archivos (Bazar, Moda, encabezado de catálogo, precios, persistencia, packs, preview, paletas y combos).
Backend: 12 pruebas de precio/relacionados/paleta más 21 de eliminación/controlador/R2.

Build: npm run build -- --outDir tmp/bazar-moda-combos-final-dist; 5.496 módulos, completado.
Imports/JSX: node tmp/check-bazar-moda-e2e-imports.cjs; 28 archivos, missing: [].
Backend: node --check en las tres services y el controlador modificados.
git diff --check: sin errores de whitespace.

## Error de eliminación reportado previamente

DELETE 193 fallaba por almacenamiento inaccesible. Ahora se reconocen errores de conexión anidados (incluidos EACCES/EPERM) y se conserva 503/504 en lugar de un 400 genérico. Las pruebas aseguran que se mantiene la landing si falla la limpieza. No se volvió a ejecutar una eliminación irreversible del registro 193 en este recorrido.

