# Pago de planes desde la portada

Los botones **Contratar una ruta** y **Contratar ambas rutas** llevan al checkout
público existente y desde allí a PagoPar. No deben abrir el formulario comercial
ni quedar sujetos a la aprobación de una solicitud.

Se usan los códigos `una-ruta-mensual`, `una-ruta-anual`, `ambas-rutas-mensual` y
`ambas-rutas-anual`. Los publica la migración backend
`20261023100000-planes-rutas-landing.js`, aplicada a la base configurada el
23/10/2026. Los importes iniciales son 297.000/397.000 Gs. mensuales y diez
mensualidades para el año. La migración conserva los planes anteriores y no
sobrescribe ediciones administrativas de estos códigos.

El checkout vuelve a consultar el catálogo del servidor. Los importes y el plan
del pago no se toman de parámetros ni del estado de navegación. La selección de
ruta se conserva en el checkout intent y en el snapshot de compra. Una ruta
admite productos físicos o marca personal; ambas rutas queda identificada como
`ambas`. El período anual debe mostrarse como anual en todos los resúmenes.

PagoPar cobra en guaraníes. La opción USD de esta portada muestra una referencia;
la portada y el checkout lo explican y muestran el total exacto a cobrar en PYG.
No enviar el número de dólares como si fueran guaraníes.

Los formularios separados de prueba gratuita, vendedor y proveedor siguen
disponibles como canales de consulta. Las pruebas gratuitas siguen usando sus
códigos definidos por el administrador.

Se verificaron el catálogo real y la configuración de credenciales. Las pruebas
de redirección simulan la frontera con PagoPar: no generan cobros reales.
