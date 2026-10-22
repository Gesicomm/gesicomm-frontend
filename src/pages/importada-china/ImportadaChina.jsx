import React, { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardList, ExternalLink, Globe2, Link2, Loader2, Package, Plane, ShieldCheck, Warehouse } from 'lucide-react';
import { importadaChinaService } from '../../services/importadaChina.service';
import './importadaChina.css';

const foto = (id, width = 640) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
const puerto = width => `https://images.unsplash.com/photo-1561118303-3686864b417b?auto=format&fit=crop&q=80&w=${width}`;
const beneficios = [
  { icon: Warehouse, titulo: 'Abastecimiento internacional', texto: 'Te ayudamos a coordinar compras desde Brasil, China, Estados Unidos y otros países según lo que necesita tu negocio.', imagen: foto(5156696), alt: 'Estanterías y mercancías en un centro logístico' },
  { icon: Package, titulo: 'Sin sobreprecio en la mercadería', texto: 'No agregamos un margen comercial de reventa al precio de los productos. Tu presupuesto detalla los costos correspondientes a la operación.', imagen: foto(11835350), alt: 'Productos embalados y organizados para distribución' },
  { icon: Plane, titulo: 'Transporte según el origen', texto: 'Según el tipo de mercancía, cantidad y urgencia, evaluamos transporte terrestre, aéreo o marítimo para tu abastecimiento.', imagen: foto(11825325), alt: 'Buque transportando contenedores para comercio internacional' },
  { icon: ShieldCheck, titulo: 'Menos complicaciones', texto: 'Te ayudamos a coordinar las gestiones de importación para que no tengas que desarrollar por tu cuenta toda una red internacional de abastecimiento.', imagen: foto(7019313), alt: 'Operario preparando mercancías en un almacén' },
];
const inicial = { producto_url: '', pais_origen: '', cantidad: '', transporte: 'conveniente', observaciones: '' };

export default function ImportadaChina() {
  const [datos, setDatos] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);
  const intento = useRef(null);
  const ocupado = useRef(false);
  const formulario = useRef(null);
  const cambiar = event => setDatos(prev => ({ ...prev, [event.target.name]: event.target.value }));

  const irAlFormulario = event => {
    event.preventDefault();
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    formulario.current?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
    formulario.current?.querySelector('input')?.focus({ preventScroll: true });
  };

  const enviar = async event => {
    event.preventDefault();
    if (ocupado.current) return;
    const fallos = {};
    let url;
    try { url = new URL(datos.producto_url.trim()); } catch { fallos.producto_url = 'Ingresá un enlace válido del producto o proveedor.'; }
    if (url && (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password || url.port || url.href.length > 2000)) fallos.producto_url = 'Usá un enlace HTTPS del producto o proveedor, sin usuario, contraseña ni puerto personalizado.';
    if (!datos.pais_origen.trim()) fallos.pais_origen = 'Indicá el país desde donde querés abastecerte.';
    const cantidad = Number(datos.cantidad);
    if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 2147483647) fallos.cantidad = 'Indicá una cantidad de unidades entera y mayor que cero.';
    setErrores(fallos);
    setErrorEnvio('');
    if (Object.keys(fallos).length) {
      formulario.current?.querySelector(`[name="${Object.keys(fallos)[0]}"]`)?.focus();
      return;
    }
    url.hash = '';
    const payload = { ...datos, producto_url: url.toString(), cantidad, pais_origen: datos.pais_origen.trim(), observaciones: datos.observaciones.trim() };
    const firma = JSON.stringify(payload);
    if (intento.current?.firma !== firma) intento.current = { firma, clave: crypto.randomUUID() };
    ocupado.current = true;
    setEnviando(true);
    setConfirmacion(null);
    try {
      const respuesta = await importadaChinaService.solicitar({ ...payload, clave_idempotencia: intento.current.clave });
      if (!respuesta?.ok || !respuesta.solicitud?.id) throw new Error('No pudimos confirmar el registro. Volvé a intentar: tu solicitud no se duplicará.');
      setConfirmacion({ ...respuesta.solicitud, producto_url: payload.producto_url });
      setDatos(inicial);
      intento.current = null;
    } catch (error) {
      setErrorEnvio(error.response?.data?.message || error.response?.data?.error || (error.response ? error.message : 'No se pudo confirmar el envío. Revisá tu conexión y volvé a intentar; conservamos tus datos y evitamos duplicar la solicitud.'));
    } finally {
      ocupado.current = false;
      setEnviando(false);
    }
  };

  return (
    <section className="china-page">
      <div className="china-shell">
        <header className="china-topline"><span><Globe2 size={19} /> Proveete con Gesicom</span><span className="china-topline-note">Del mundo a Paraguay</span></header>
        <section className="china-hero" aria-labelledby="china-title">
          <div className="china-heading">
            <p className="china-kicker"><span /> GESICOM | ABASTECIMIENTO INTERNACIONAL</p>
            <h1 id="china-title">Proveete con Gesicom.<br /><em>Del mundo a tu negocio.</em></h1>
            <p className="china-subtitle">Abastecé tu negocio desde Brasil, China, Estados Unidos o el país que elijas. Te ayudamos a coordinar la compra y la logística hasta Paraguay.</p>
            <p className="china-intro">Encontrar proveedores confiables, negociar, coordinar compras internacionales y traer mercadería a Paraguay puede ser complicado.</p>
            <p className="china-intro">Con Gesicom, coordinás tu abastecimiento internacional con transporte terrestre, aéreo o marítimo según el origen y el producto, sin que agreguemos un margen comercial sobre el precio de la mercadería.</p>
            <a className="china-cta" href="#cotizacion" onClick={irAlFormulario}>SOLICITAR PRESUPUESTO DE ABASTECIMIENTO <ArrowRight size={18} /></a>
          </div>
          <figure className="china-hero-visual">
            <img src={puerto(1200)} srcSet={`${puerto(640)} 640w, ${puerto(1200)} 1200w, ${puerto(1800)} 1800w`} sizes="(max-width: 760px) 100vw, 50vw" width="1200" height="800" alt="Contenedores y operaciones de transporte en un puerto internacional" fetchPriority="high" />
            <div className="china-visual-label"><Globe2 size={23} /><div><span>UNA OPERACIÓN A TU ALCANCE</span><strong>Del mundo a tu negocio.</strong></div></div>
            <figcaption>Fotografía ilustrativa de comercio internacional; no representa instalaciones de Gesicom.</figcaption>
          </figure>
        </section>

        <section className="china-benefits" aria-labelledby="china-benefits-title">
          <div className="china-section-heading"><p className="china-kicker">UNA ESTRUCTURA QUE YA EXISTE</p><h2 id="china-benefits-title">Tu negocio en Paraguay. Proveedores de distintos países a tu alcance.</h2><p>Aprovechá una estructura internacional existente para facilitar tus compras y concentrarte en lo que realmente importa: vender tus productos.</p></div>
          <div className="china-benefit-grid">{beneficios.map(({ icon: Icon, titulo, texto, imagen, alt }) => <article className="china-benefit" key={titulo}><img src={imagen} alt={alt} loading="lazy" decoding="async" width="640" height="427" /><div className="china-benefit-body"><div className="china-benefit-icon"><Icon size={21} /></div><h3>{titulo}</h3><p>{texto}</p></div></article>)}</div>
          <p className="china-photo-credit">Imágenes ilustrativas de operaciones logísticas. Fotografías: <a href="https://unsplash.com/photos/blue-and-red-shipping-containers-a4gZyZIUDZw" target="_blank" rel="noreferrer">Christian Lue / Unsplash</a> y <a href="https://www.pexels.com/search/warehouse/" target="_blank" rel="noreferrer">Pexels</a>.</p>
        </section>

        <section className="china-difference" aria-labelledby="china-difference-title">
          <div><p className="china-kicker">EL DIFERENCIAL GESICOM</p><h2 id="china-difference-title">Nuestro negocio no es revenderte mercadería. Es ayudarte a hacer crecer tu e-commerce.</h2></div>
          <div><p>Gesicom es una plataforma para crear, gestionar y desarrollar negocios digitales.</p><p>Por eso ponemos nuestra operación internacional al servicio de nuestros usuarios, para que puedan acceder a proveedores y abastecer sus tiendas sin pagar un sobreprecio comercial por la mercadería.</p><strong>Vos elegís el producto y el país. Nosotros te ayudamos a gestionar el abastecimiento.</strong><p className="china-legal">Cada importación está sujeta a cotización. El presupuesto podrá incluir compra de mercancía, transporte, seguros, impuestos, trámites aduaneros y otros costos aplicables.</p></div>
        </section>

        <section className="china-process" aria-labelledby="china-process-title">
          <div className="china-section-heading"><p className="china-kicker">¿CÓMO FUNCIONA?</p><h2 id="china-process-title">Así te proveés con Gesicom.</h2></div>
          <ol className="china-steps">{[
            { icon: Link2, title: 'Encontrá tu producto', text: 'Elegí el producto en la web de un proveedor de Brasil, China, Estados Unidos u otro país y copiá su enlace.' },
            { icon: ClipboardList, title: 'Solicitá tu presupuesto', text: 'Pegá el enlace, indicá el país de origen y contanos cuántas unidades necesitás.' },
            { icon: CheckCircle2, title: 'Recibí tu cotización', text: 'Nuestro equipo revisará la solicitud y te informará la viabilidad y los costos estimados de la importación.' },
          ].map(({ icon: Icon, title, text }, i) => <li key={title}><div className="china-step-top"><Icon size={23} /><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></li>)}</ol>
          <p className="china-legal">La solicitud de cotización no constituye una orden de compra ni genera una obligación de pago.</p>
        </section>

        <section className="china-quote" id="cotizacion" ref={formulario} aria-labelledby="china-quote-title">
          <div className="china-section-heading"><p className="china-kicker">TU PRÓXIMO PRODUCTO EMPIEZA ACÁ</p><h2 id="china-quote-title">¿Desde dónde querés abastecer tu negocio?</h2><p>Compartí el enlace del producto o proveedor, el país de origen y la cantidad que necesitás. Revisaremos las opciones para traerlo a Paraguay.</p><div className="china-quote-note"><CheckCircle2 size={19} /> Usamos los datos de tu cuenta y tu tienda. No necesitás volver a ingresar tus datos de contacto.</div></div>
          <form className="china-form" onSubmit={enviar} noValidate aria-label="Solicitar presupuesto de abastecimiento">
            <fieldset disabled={enviando}>
              <div className="china-field"><label htmlFor="producto-url">Enlace del producto o proveedor <span>*</span></label><div className="china-input-row"><Link2 className="china-input-icon" size={18} /><input id="producto-url" name="producto_url" type="url" inputMode="url" placeholder="https://www.proveedor.com/producto" value={datos.producto_url} onChange={cambiar} required maxLength={2000} aria-invalid={!!errores.producto_url} aria-describedby={errores.producto_url ? 'china-url-error' : 'china-link-help'} /></div>{errores.producto_url ? <p className="china-field-error" id="china-url-error">{errores.producto_url}</p> : <p id="china-link-help" className="china-help">Podés enviar un enlace de Alibaba u otro proveedor del país que elijas. Usá una dirección que empiece con https://.</p>}</div>
              <div className="china-field"><label htmlFor="pais-origen">País de origen <span>*</span></label><input id="pais-origen" name="pais_origen" type="text" list="paises-origen" placeholder="Ej.: Brasil, China, Estados Unidos u otro país" value={datos.pais_origen} onChange={cambiar} required maxLength={100} aria-invalid={!!errores.pais_origen} aria-describedby={errores.pais_origen ? 'pais-origen-error' : undefined} /><datalist id="paises-origen"><option value="Brasil" /><option value="China" /><option value="Estados Unidos" /></datalist>{errores.pais_origen && <p className="china-field-error" id="pais-origen-error">{errores.pais_origen}</p>}</div>
              <div className="china-form-row"><div className="china-field"><label htmlFor="china-cantidad">Cantidad de unidades <span>*</span></label><input id="china-cantidad" name="cantidad" type="number" inputMode="numeric" min="1" step="1" max="2147483647" placeholder="Ej.: 100" value={datos.cantidad} onChange={cambiar} required aria-invalid={!!errores.cantidad} aria-describedby={errores.cantidad ? 'china-cantidad-error' : undefined} />{errores.cantidad && <p className="china-field-error" id="china-cantidad-error">{errores.cantidad}</p>}</div><div className="china-field"><label htmlFor="china-transporte">Método de transporte preferido</label><select id="china-transporte" name="transporte" value={datos.transporte} onChange={cambiar}><option value="conveniente">Quiero la opción más conveniente.</option><option value="terrestre">Transporte terrestre.</option><option value="aereo">Transporte aéreo.</option><option value="maritimo">Transporte marítimo.</option></select></div></div>
              <div className="china-field"><label htmlFor="china-observaciones">Observaciones adicionales <small>Opcional</small></label><textarea id="china-observaciones" name="observaciones" rows={4} maxLength={2000} placeholder="Color, modelo, características o cualquier detalle importante." value={datos.observaciones} onChange={cambiar} /></div>
              {errorEnvio && <div className="china-error" role="alert">{errorEnvio}</div>}
              <button type="submit">{enviando ? <Loader2 size={18} className="china-spin" /> : null}{enviando ? 'REGISTRANDO SOLICITUD…' : 'SOLICITAR MI PRESUPUESTO'} {!enviando && <ArrowRight size={18} />}</button>
            </fieldset>
            <p className="china-form-foot">La cotización está sujeta a disponibilidad del producto, cantidades mínimas del proveedor, requisitos legales y evaluación logística.</p>
            {confirmacion && <div className="china-success" role="status"><CheckCircle2 size={23} /><div><strong>¡Recibimos tu solicitud!</strong><p>Tu pedido de cotización fue registrado correctamente. Nuestro equipo revisará la información y se comunicará contigo por los canales asociados a tu cuenta.</p><span className="china-request-state">Solicitud #{confirmacion.id} · {confirmacion.estado}</span><a href={confirmacion.producto_url} target="_blank" rel="noreferrer">Ver producto enviado <ExternalLink size={13} /></a></div></div>}
          </form>
        </section>
      </div>
    </section>
  );
}
