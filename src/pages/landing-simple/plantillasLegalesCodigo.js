const CODIGO_VACIO = { html: '', css: '', js: '' };

export const PAGINAS_LEGALES_CODIGO = [
  { key: 'contacto', label: 'Contacto', ruta: 'contacto' },
  { key: 'politica_privacidad', label: 'Política de privacidad', ruta: 'politica-privacidad' },
  { key: 'politica_reembolso', label: 'Política de reembolso', ruta: 'politica-reembolso' },
  { key: 'terminos_servicio', label: 'Términos del servicio', ruta: 'terminos-servicio' },
  { key: 'politica_envio', label: 'Política de envío', ruta: 'politica-envio' },
  { key: 'aviso_legal', label: 'Aviso legal', ruta: 'aviso-legal' },
];

export const LABEL_LEGAL_CODIGO = Object.fromEntries(PAGINAS_LEGALES_CODIGO.map(p => [p.key, p.label]));

function limpiar(v, respaldo = '') {
  return String(v ?? '').trim() || respaldo;
}

function escapeHtml(v) {
  return limpiar(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function datosLegales(tienda = {}) {
  const nombre = limpiar(tienda?.nombre, 'Tu tienda');
  const telefono = limpiar(tienda?.telefono || tienda?.whatsapp, 'No especificado');
  const email = limpiar(tienda?.email, 'No especificado');
  const direccionBase = limpiar(tienda?.direccion_publica || tienda?.direccion || tienda?.deposito_direccion);
  const ciudad = limpiar(tienda?.ciudad_publica || tienda?.ciudad || tienda?.deposito_ciudad);
  const direccion = limpiar([direccionBase, ciudad].filter(Boolean).join(', '), 'No especificada');
  const documento = limpiar(tienda?.ruc || tienda?.documento);
  const whatsapp = limpiar(tienda?.whatsapp || tienda?.telefono);
  const instagram = limpiar(tienda?.instagram);
  const facebook = limpiar(tienda?.facebook);
  const tiktok = limpiar(tienda?.tiktok);
  const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  return {
    nombre: escapeHtml(nombre),
    telefono: escapeHtml(telefono),
    email: escapeHtml(email),
    direccion: escapeHtml(direccion),
    documento: escapeHtml(documento),
    whatsapp: escapeHtml(whatsapp),
    instagram: escapeHtml(instagram),
    facebook: escapeHtml(facebook),
    tiktok: escapeHtml(tiktok),
    fecha: escapeHtml(fecha),
  };
}

function contactoHtml(d) {
  return `<ul>
      <li><strong>Teléfono:</strong> ${d.telefono}</li>
      <li><strong>Email:</strong> ${d.email}</li>
      <li><strong>Dirección:</strong> ${d.direccion}</li>
      ${d.documento ? `<li><strong>Documento/RUC:</strong> ${d.documento}</li>` : ''}
    </ul>`;
}

const textos = {
  contacto: d => ({
    titulo: 'Información de Contacto',
    intro: `Si tiene consultas, reclamos o necesita asistencia relacionada con productos, pedidos o políticas de ${d.nombre}, puede comunicarse con nosotros a través de los siguientes medios.`,
    secciones: [
      ['Datos de contacto', contactoHtml(d)],
      ['Redes sociales', `<ul>
      ${d.whatsapp ? `<li><strong>WhatsApp:</strong> ${d.whatsapp}</li>` : ''}
      ${d.instagram ? `<li><strong>Instagram:</strong> ${d.instagram}</li>` : ''}
      ${d.facebook ? `<li><strong>Facebook:</strong> ${d.facebook}</li>` : ''}
      ${d.tiktok ? `<li><strong>TikTok:</strong> ${d.tiktok}</li>` : ''}
    </ul>`],
      ['Atención al cliente', `<p>Nuestro equipo hará sus mejores esfuerzos para responder en el menor tiempo posible. Los horarios de respuesta pueden variar según la demanda operativa.</p>`],
    ],
  }),
  politica_privacidad: d => ({
    titulo: 'Política de privacidad',
    intro: `${d.nombre} gestiona esta tienda y este sitio web, incluidos los datos, el contenido, las funciones, las herramientas, los productos y los servicios para ofrecerle al cliente una experiencia de compra seleccionada. ${d.nombre} cuenta con tecnología de Gesicom para operar los Servicios.`,
    secciones: [
      ['Información personal que recopilamos o tratamos', `<p>Cuando utilizamos el término "información personal", nos referimos a cualquier dato que identifique o pueda vincularse razonablemente con una persona. Podemos recopilar o tratar datos de contacto, datos de entrega, información de pago, información de pedidos, comunicaciones con atención al cliente, información del dispositivo e información de uso del sitio.</p>`],
      ['Fuentes de información personal', `<p>Podemos recibir información directamente del cliente al realizar una compra, al comunicarse con nosotros, al completar formularios o al navegar por el sitio. También podemos recibir información de proveedores de servicios necesarios para procesar pagos, gestionar pedidos, coordinar envíos y brindar soporte.</p>`],
      ['Cómo utilizamos su información personal', `<p>Utilizamos la información personal para procesar compras, gestionar pagos, preparar y entregar pedidos, brindar atención al cliente, prevenir fraude, mejorar la tienda, enviar comunicaciones relacionadas con pedidos y cumplir obligaciones legales aplicables.</p>`],
      ['Cómo divulgamos la información personal', `<p>Podemos compartir información con Gesicom, pasarelas de pago, proveedores logísticos, herramientas de comunicación, proveedores tecnológicos y autoridades competentes cuando sea necesario para operar la tienda, cumplir la ley o atender solicitudes válidas.</p>`],
      ['Relación con Gesicom', `<p>Los Servicios se alojan en Gesicom, que puede procesar información técnica y operativa necesaria para proporcionar, proteger y mejorar la plataforma. La información enviada a la tienda puede ser tratada por Gesicom y por proveedores asociados para permitir el funcionamiento del comercio electrónico.</p>`],
      ['Sitios web y enlaces de terceros', `<p>Los Servicios pueden incluir enlaces a sitios o plataformas de terceros. ${d.nombre} no controla ni asume responsabilidad por las políticas de privacidad, seguridad o contenido de esos sitios externos.</p>`],
      ['Datos de menores', `<p>Los Servicios no están destinados a menores de 16 años. Si un padre, madre o tutor considera que un menor proporcionó información personal, puede comunicarse con nosotros para solicitar su revisión o eliminación.</p>`],
      ['Seguridad y retención', `<p>Adoptamos medidas razonables para proteger la información personal. Conservamos los datos durante el tiempo necesario para prestar los Servicios, cumplir obligaciones legales, resolver reclamos, prevenir fraude y mantener registros operativos.</p>`],
      ['Derechos y opciones', `<p>Según la legislación aplicable, el cliente puede solicitar acceso, rectificación, actualización, eliminación u oposición al tratamiento de sus datos personales comunicándose por los canales indicados abajo.</p>`],
      ['Transferencias internacionales', `<p>La información puede ser almacenada o tratada fuera del país de residencia del cliente cuando los proveedores tecnológicos o de infraestructura lo requieran, aplicando medidas razonables de protección.</p>`],
      ['Contacto', `<p>Para consultas sobre privacidad o ejercicio de derechos, el cliente puede comunicarse con ${d.nombre}:</p>${contactoHtml(d)}`],
    ],
  }),
  politica_reembolso: d => ({
    titulo: 'Política de Devoluciones y Reembolsos',
    intro: `En ${d.nombre}, nos comprometemos a entregar productos en óptimas condiciones. Debido a la naturaleza de nuestros productos y por razones de higiene, seguridad y control de calidad, aplicamos la siguiente política de devoluciones y reembolsos.`,
    secciones: [
      ['1. Productos con desperfectos de fábrica', `<p>Únicamente se aceptarán solicitudes de devolución, cambio o reembolso cuando el producto presente un desperfecto de fabricación comprobable. El cliente dispone de un plazo máximo de 24 horas desde la recepción del pedido para informar cualquier inconveniente.</p><p>Para procesar la solicitud, el cliente deberá proporcionar fotografías o videos del desperfecto, nombre completo, número de pedido y una descripción detallada del problema detectado.</p><p>Si se confirma el desperfecto de fábrica, podremos reemplazar el producto sin costo adicional o emitir un reembolso total, según corresponda.</p>`],
      ['2. Casos que no aplican', `<p>No se realizarán devoluciones, cambios ni reembolsos por cambio de opinión, expectativas subjetivas, uso incorrecto, manipulación indebida, desgaste normal, errores de compra cometidos por el cliente o solicitudes realizadas fuera del plazo indicado.</p>`],
      ['3. Plazo para reclamos', `<p>Toda reclamación relacionada con defectos de fábrica deberá realizarse dentro de las primeras 24 horas posteriores a la recepción del pedido. Transcurrido ese plazo, se considerará que el producto fue recibido en conformidad.</p>`],
      ['4. Contacto', `<p>Para reportar un posible desperfecto de fábrica, comuníquese con nuestro equipo dentro del plazo establecido y adjunte la evidencia correspondiente:</p>${contactoHtml(d)}<p><em>Al realizar una compra en ${d.nombre}, el cliente declara haber leído, comprendido y aceptado esta Política de Devoluciones y Reembolsos.</em></p>`],
    ],
  }),
  terminos_servicio: d => ({
    titulo: 'Términos de Servicio',
    intro: `Bienvenido a ${d.nombre}. Al acceder a nuestro sitio web y realizar una compra, usted acepta los presentes Términos de Servicio. Le recomendamos leerlos detenidamente antes de utilizar nuestros servicios.`,
    secciones: [
      ['1. Información general', `<p>${d.nombre} opera como una tienda de comercio electrónico dedicada a la comercialización de productos publicados en este sitio. Al realizar una compra, el cliente declara ser mayor de edad y contar con capacidad legal para contratar.</p>`],
      ['2. Productos y disponibilidad', `<p>Nos esforzamos por mantener la información de productos actualizada y precisa. Las imágenes son ilustrativas, los colores pueden variar según la pantalla y la disponibilidad de stock puede cambiar sin previo aviso. Nos reservamos el derecho de limitar o cancelar pedidos cuando existan errores evidentes de precio, stock o descripción.</p>`],
      ['3. Precios y pagos', `<p>Todos los precios se expresan en la moneda indicada en la tienda, salvo indicación contraria. Aceptamos los métodos de pago informados al momento de la compra y podemos modificar precios, promociones y condiciones comerciales sin previo aviso.</p>`],
      ['4. Envíos', `<p>Los plazos de entrega son estimados y pueden verse afectados por factores ajenos a ${d.nombre}. El cliente es responsable de proporcionar datos de entrega correctos y completos. Si la entrega no pudiera realizarse por datos incorrectos o ausencia del destinatario, podremos cancelar el pedido o coordinar una nueva entrega bajo las condiciones correspondientes.</p>`],
      ['5. Uso adecuado de los productos', `<p>Los productos deben utilizarse siguiendo las instrucciones del fabricante o de ${d.nombre}. No somos responsables por daños derivados del uso incorrecto, negligente o contrario a las recomendaciones.</p>`],
      ['6. Limitación de responsabilidad', `<p>La información publicada tiene fines informativos y comerciales. En la máxima medida permitida por la ley, ${d.nombre} no será responsable por daños indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso de los productos adquiridos.</p>`],
      ['7. Devoluciones y reembolsos', `<p>Las devoluciones, cambios y reembolsos se rigen por la Política de Devoluciones y Reembolsos publicada en este sitio.</p>`],
      ['8. Propiedad intelectual', `<p>El contenido del sitio, incluyendo textos, imágenes, logotipos, diseños, gráficos, fotografías, videos y material publicitario, pertenece a ${d.nombre} o a sus titulares y está protegido por leyes de propiedad intelectual. Queda prohibida su reproducción sin autorización.</p>`],
      ['9. Modificaciones', `<p>${d.nombre} podrá actualizar estos Términos de Servicio en cualquier momento. Las modificaciones entrarán en vigencia desde su publicación en el sitio web.</p>`],
      ['10. Contacto', `<p>Para consultas relacionadas con estos Términos de Servicio, el cliente puede comunicarse con ${d.nombre}:</p>${contactoHtml(d)}<p><em>Al utilizar este sitio web y realizar una compra, usted reconoce haber leído, comprendido y aceptado estos Términos de Servicio.</em></p>`],
    ],
  }),
  politica_envio: d => ({
    titulo: 'Política de Envíos',
    intro: `En ${d.nombre} trabajamos para que su pedido llegue de forma rápida, segura y eficiente. A continuación, detallamos nuestras condiciones de envío.`,
    secciones: [
      ['1. Envíos locales', `<p>Realizamos entregas en nuestra ciudad y alrededores. El plazo estimado de entrega local es de hasta 24 horas desde la confirmación del pedido, salvo demoras operativas o situaciones de fuerza mayor. Los pedidos pueden abonarse mediante los métodos habilitados por la tienda, incluyendo pago contra entrega cuando corresponda.</p>`],
      ['2. Envíos nacionales', `<p>Los pedidos con destino a otras regiones pueden requerir pago anticipado mediante transferencia bancaria o pasarela de pagos. Una vez acreditado el pago, el pedido será preparado y entregado a la empresa de transporte o agencia correspondiente. Los plazos y costos pueden variar según la ubicación.</p>`],
      ['3. Tiempos de entrega', `<p>Los plazos indicados son estimativos y pueden verse afectados por condiciones climáticas, retrasos de transportadoras, feriados, alta demanda o situaciones de fuerza mayor. ${d.nombre} realizará esfuerzos razonables para cumplir los plazos informados.</p>`],
      ['4. Datos de entrega', `<p>El cliente debe proporcionar información correcta y completa para la entrega, incluyendo nombre, teléfono, dirección exacta y referencias. ${d.nombre} no será responsable por demoras o inconvenientes derivados de datos incorrectos o incompletos.</p>`],
      ['5. Seguimiento y recepción', `<p>Una vez despachado el pedido, el cliente podrá ser contactado por el servicio de entrega para coordinar la recepción. Es responsabilidad del cliente encontrarse disponible dentro del horario acordado.</p>`],
      ['6. Modificaciones', `<p>${d.nombre} se reserva el derecho de modificar esta Política de Envíos para adaptarla a cambios operativos, logísticos o legales.</p><p><em>Al realizar una compra en ${d.nombre}, el cliente declara haber leído, comprendido y aceptado esta Política de Envíos.</em></p>`],
    ],
  }),
  aviso_legal: d => ({
    titulo: 'Aviso Legal',
    intro: `La información contenida en este sitio web es proporcionada por ${d.nombre} con fines informativos y comerciales.`,
    secciones: [
      ['1. Información general', `<p>${d.nombre} realiza esfuerzos razonables para mantener actualizada y precisa la información publicada en este sitio web. Sin embargo, no garantiza que toda la información se encuentre libre de errores, omisiones o desactualizaciones. Nos reservamos el derecho de modificar, actualizar o eliminar contenidos, productos, precios, promociones y servicios en cualquier momento.</p>`],
      ['2. Productos y resultados', `<p>Las imágenes, fotografías, videos y materiales visuales tienen fines ilustrativos y pueden presentar variaciones respecto al producto recibido. Los resultados obtenidos mediante el uso de productos pueden variar entre personas y no se garantizan resultados específicos.</p>`],
      ['3. Información de salud y bienestar', `<p>Los productos comercializados por ${d.nombre} no constituyen asesoramiento médico, diagnóstico, tratamiento ni sustituyen la consulta con profesionales de la salud. Toda información relacionada con bienestar, descanso, rendimiento u otros beneficios potenciales tiene carácter informativo.</p>`],
      ['4. Limitación de responsabilidad', `<p>En la máxima medida permitida por la legislación aplicable, ${d.nombre} no será responsable por daños directos, indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso de productos, servicios o contenidos publicados en este sitio.</p>`],
      ['5. Enlaces externos', `<p>Este sitio puede contener enlaces a sitios web de terceros. ${d.nombre} no controla ni asume responsabilidad por el contenido, políticas o prácticas de dichos sitios externos.</p>`],
      ['6. Propiedad intelectual', `<p>Todo el contenido del sitio, incluyendo textos, imágenes, diseños, logotipos, fotografías, videos, gráficos y material publicitario, está protegido por leyes de propiedad intelectual. Queda prohibida su reproducción o utilización sin autorización previa y por escrito.</p>`],
      ['7. Información de contacto', `<p>Si tiene consultas relacionadas con este Aviso Legal, puede comunicarse con nosotros:</p>${contactoHtml(d)}`],
      ['8. Modificaciones', `<p>${d.nombre} se reserva el derecho de modificar este Aviso Legal en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en el sitio web.</p><p><em>Al acceder y utilizar este sitio web, usted reconoce haber leído, comprendido y aceptado el presente Aviso Legal.</em></p>`],
    ],
  }),
};

function cssLegal() {
  return `.legal-page {
  min-height: 100vh;
  background: var(--gc-fondo, var(--tienda-fondo, #ffffff));
  color: var(--gc-texto, var(--tienda-texto, #10202f));
  padding: 56px 22px 72px;
  font-family: Inter, system-ui, sans-serif;
}
.legal-back {
  display: inline-flex;
  color: var(--gc-primario, var(--tienda-primario, #18a66b));
  text-decoration: none;
  font-weight: 700;
  margin: 0 auto 32px;
  max-width: 880px;
}
.legal-hero,
.legal-content {
  max-width: 880px;
  margin: 0 auto;
}
.legal-kicker {
  color: var(--gc-primario, var(--tienda-primario, #18a66b));
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.legal-hero h1 {
  font-size: clamp(34px, 6vw, 72px);
  line-height: 1;
  margin: 12px 0 16px;
}
.legal-updated {
  color: var(--gc-texto-suave, var(--tienda-texto-suave, color-mix(in srgb, currentColor 58%, transparent)));
  font-size: 14px;
  margin: 0 0 28px;
}
.legal-hero p,
.legal-content p,
.legal-content li {
  color: var(--gc-texto-suave, var(--tienda-texto-suave, color-mix(in srgb, currentColor 78%, transparent)));
  line-height: 1.75;
}
.legal-content {
  margin-top: 40px;
  display: grid;
  gap: 18px;
}
.legal-content h2 {
  margin: 24px 0 0;
  font-size: 22px;
}
.legal-content ul {
  padding-left: 22px;
}
.legal-content strong {
  color: var(--gc-texto, var(--tienda-texto, currentColor));
}`;
}

export function esPlantillaLegalGenerica(codigo) {
  const html = String(codigo?.html || '');
  return html.includes('Actualizá este contenido con las condiciones reales de tu tienda')
    || html.includes('Escribí acá el texto de política de privacidad para tus clientes')
    || html.includes('Agregá plazos, requisitos, medios de contacto y cualquier detalle importante');
}

export function normalizarEstiloPaginaFooter(codigo) {
  const css = String(codigo?.css || '');
  const esCssViejo = css.includes('background: #091217;')
    && css.includes('color: #f7fafc;')
    && css.includes('.legal-page');
  return esCssViejo ? { ...codigo, css: cssLegal() } : codigo;
}

export function plantillaLegalPara(tipo, tienda = {}) {
  const d = datosLegales(tienda);
  const contenido = (textos[tipo] || textos.aviso_legal)(d);
  const secciones = contenido.secciones
    .map(([titulo, cuerpo]) => `    <section>
      <h2>${titulo}</h2>
      ${cuerpo}
    </section>`)
    .join('\n');

  return {
    ...CODIGO_VACIO,
    html: `<main class="legal-page">
  <a class="legal-back" href="./">Volver a la tienda</a>
  <section class="legal-hero">
    <p class="legal-kicker">${d.nombre}</p>
    <h1>${contenido.titulo}</h1>
    <p class="legal-updated">Última actualización: ${d.fecha}</p>
    <p>${contenido.intro}</p>
  </section>
  <div class="legal-content">
${secciones}
  </div>
</main>`,
    css: cssLegal(),
    js: '',
  };
}
