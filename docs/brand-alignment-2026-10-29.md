# Claridad de marca y experiencia — 29 de octubre de 2026

Se conservan los colores, tipografías, componentes y funcionalidades existentes.
La portada presenta una plataforma para vender productos, ofrecer servicios y
desarrollar una marca personal. Los dos espacios siguen siendo Gestión de
E-commerce y Marca personal; no se agregan módulos ni se modifican permisos.

## Implementado

- Hero con el texto solicitado y Crear cuenta como acción principal.
- Modalidades vinculadas al espacio correspondiente. Servicios y marca personal
  seleccionan el mismo espacio; productos selecciona Gestión de E-commerce.
- Textos orientados a beneficios en funcionalidades, recorridos, planes, registro
  y selección de espacios. SEO estático y dinámico alineados con esas modalidades.
- Planes: explicación de espacio/ruta, período mensual frente a anual pagado por
  adelantado y varias tiendas en Gestión de E-commerce, según la confirmación del
  usuario. No se publica un cupo ni se promete capacidad ilimitada.
- Galería ampliable de capturas de componentes reales, con datos ficticios y sin
  información de clientes, en lugar de un botón de reproducción sin video.
- Programa de partners con menor jerarquía visual y acción secundaria.
- Ayuda de rentabilidad precisa: ventas entregadas menos costos y gastos
  registrados. Se distingue la ganancia estimada del efectivo disponible.

## Verificación

Pruebas existentes de planes, permisos de espacios y métricas del dashboard.
Revisión de la fórmula de margen y ganancia neta en pedidosAnalyticsService y
pruebas de contabilidadPedido; no se modificaron cálculos financieros.
En navegador: enlaces, selección de modalidad, períodos de planes, ampliación de
capturas y retorno del foco, temas claro/oscuro y anchos de 320 a 1440 px; reflujo
a 720 px equivalente a un escritorio de 1440 px ampliado al 200 %.
Recorrido de interfaz registro → verificación → espacio → dashboard con API
simulada, sin cuentas, pagos ni correos reales.

Las capturas se regeneran con Vite local mediante
`node scripts/capture-product-tour.cjs`; el script intercepta las respuestas de
datos y nunca accede a una cuenta real.

## Siguientes etapas del documento

- Sustituir la galería temporal por un video demostrativo cuando exista.
- Definir permanencia mínima y eventuales servicios adicionales antes de publicar
  esas condiciones. Actualmente se invita a consultar al equipo.
- Ampliar los usos del avatar por contexto y evolucionar el dashboard de manera
  gradual. El avatar del login se conserva. No se rediseñan Gestión Comercial ni
  Gestión Logística ni se reordena la navegación.
