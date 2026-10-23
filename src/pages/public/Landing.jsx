import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Seo, { SCHEMA_ORGANIZACION } from '../../components/public/Seo';
import { planesService } from '../../services/planesService';
import { enviarMensajeContacto } from '../../services/publicoService';
import '@fontsource-variable/manrope';
import markup from './home/landing.html?raw';
import './home/reference.css';
import './home/landing.css';

const RUTAS = {
  fisico: {
    kicker: 'E-commerce', titulo: 'De la proveeduría a la rentabilidad.',
    descripcion: 'Gestioná productos, tienda online, marketing, pedidos, logística y resultados comerciales desde una sola plataforma.',
    pasos: [['Proveeduría', 'Productos y abastecimiento'], ['Marketing', 'Campañas y tienda online'], ['Operaciones', 'Pedidos, logística y cobro'], ['Análisis', 'Control de costos y márgenes']],
  },
  personal: {
    kicker: 'Marca personal y servicios', titulo: 'Del contenido a tus clientes y resultados.',
    descripcion: 'Creá guiones con IA, planificá contenidos, montá embudos, captá prospectos, gestioná tus clientes y analizá qué genera resultados. La publicación directa en redes está pendiente de habilitación.',
    pasos: [['Guiones e IA', 'Contenido y creatividad'], ['Producción', 'Calendario y teleprompter'], ['Conversión', 'Embudos, agenda y CRM'], ['Analítica', 'Contenido que genera ventas']],
  },
};
const PRECIOS = { PYG: [297000, 397000, 497000, 697000], USD: [47, 67, 77, 97] };

/** HTML estático revisado, versionado dentro del repositorio. No contiene scripts,
 * handlers inline ni contenido procedente de las solicitudes de visitantes. */
export default function Landing() {
  const rootRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = rootRef.current;
    let vigente = true;
    let billing = 'monthly', currency = 'PYG', ruta = 'fisico';
    let catalogo = [];
    const money = valor => currency === 'PYG' ? `₲ ${valor.toLocaleString('es-PY')}` : `US$ ${valor.toLocaleString('en-US')}`;
    const texto = (id, value) => { const el = root.querySelector(`#${id}`); if (el) el.textContent = value; };
    const opcion = (selector, actual) => root.querySelectorAll(selector).forEach(button => {
      const active = button.dataset.billing === actual || button.dataset.currency === actual || button.dataset.route === actual;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const precios = () => {
      ['one', 'two'].forEach((slug, index) => {
        const codigo = `${index ? 'ambas-rutas' : 'una-ruta'}-${billing === 'annual' ? 'anual' : 'mensual'}`;
        const publicado = catalogo.find(p => p.codigo === codigo && p.activo !== false);
        const valor = PRECIOS[currency][index];
        texto(`price-${slug}`, currency === 'PYG' && publicado ? money(Number(publicado.precio)) : money(valor * (billing === 'annual' ? 10 : 1)));
        texto(`period-${slug}`, billing === 'annual' ? 'por año · pago adelantado' : 'por mes');
        texto(`save-${slug}`, billing === 'annual' ? `Ahorrás ${money(valor * 2)} respecto a 12 mensualidades` : `Precio posterior: ${money(PRECIOS[currency][index + 2])}/mes`);
      });
      opcion('[data-billing]', billing);
      opcion('[data-currency]', currency);
      texto('home-payment-note', currency === 'USD' ? 'Los importes en USD son de referencia. El cobro se realiza en guaraníes; verás el total exacto antes de ir a PagoPar.' : 'Pagás de forma segura con PagoPar. La anualidad se abona por adelantado.');
    };
    precios();
    planesService.listar().then(data => { if (vigente) { catalogo = Array.isArray(data) ? data : []; precios(); } }).catch(() => {});
    root.querySelector('[data-home-year]').textContent = new Date().getFullYear();
    const telefono = String(import.meta.env.VITE_GESICOM_WHATSAPP || '').replace(/\D/g, '');
    if (/^[1-9]\d{7,14}$/.test(telefono)) {
      const contact = root.querySelector('[data-home-contact]');
      contact.href = `https://wa.me/${telefono}`;
      contact.textContent = '◉ WhatsApp';
      contact.target = '_blank';
      contact.rel = 'noopener noreferrer';
    }

    const menuButton = root.querySelector('.home-menu-button');
    const mobileMenu = root.querySelector('#home-mobile-menu');
    const cerrarMenu = () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Abrir menú');
      mobileMenu.hidden = true;
    };
    const leadDialog = root.querySelector('.home-lead-dialog');
    const abrirFormulario = (tipo) => {
      const proveedor = tipo === 'proveedor';
      root.querySelector('#home-provider-form').hidden = !proveedor;
      root.querySelector('#home-access-form').hidden = proveedor;
      texto('home-lead-title', proveedor ? 'Ofrecer servicios en Gesicom' : tipo === 'prueba' ? 'Solicitar prueba gratuita' : tipo === 'demo' ? 'Solicitar demostración' : 'Empezar como vendedor');
      if (!proveedor) {
        const form = root.querySelector('#gc-demo-form');
        form.elements.solicitud.value = tipo === 'prueba' ? 'prueba_gratuita' : tipo === 'demo' ? 'demo' : 'contratacion';
        texto('gc-demo-heading', tipo === 'prueba' ? 'Probá Gesicom para tu negocio.' : tipo === 'demo' ? 'Conocé Gesicom en una demostración.' : 'Empezá a vender con Gesicom.');
        root.querySelector('#home-access-form .gc-form-title').textContent = tipo === 'prueba' ? 'Solicitar prueba gratuita' : tipo === 'demo' ? 'Solicitar demostración' : 'Empezar como vendedor';
        root.querySelector('#home-access-form .gc-intro > p').textContent = tipo === 'prueba' ? 'Solicitá un código de prueba. Nuestro equipo evaluará tu solicitud y te indicará el plan y la cantidad de días de acceso.' : tipo === 'demo' ? 'Solicitá una demostración y conocé cómo Gesicom puede ayudarte a gestionar tu negocio.' : 'Contanos sobre tu negocio para acompañarte en la elección del plan y tus primeros pasos.';
        root.querySelector('#gc-demo-form .gc-note').textContent = tipo === 'prueba' ? 'La prueba requiere aprobación y un código.' : 'Te contactaremos para acompañarte.';
      }
      if (!leadDialog.open) leadDialog.showModal();
      leadDialog.scrollTop = 0;
      document.body.style.overflow = 'hidden';
      const form = root.querySelector(proveedor ? '#gc-provider-form' : '#gc-demo-form');
      form.elements.nombre.focus({ preventScroll: true });
    };
    const overflowAnterior = document.body.style.overflow;
    const alCerrarFormulario = () => { document.body.style.overflow = overflowAnterior; };
    leadDialog.addEventListener('close', alCerrarFormulario);
    const desdeHash = () => {
      if (window.location.hash === '#registro-proveedores') abrirFormulario('proveedor');
      if (window.location.hash === '#solicitar-demo') abrirFormulario('demo');
    };
    window.addEventListener('hashchange', desdeHash);
    desdeHash();
    const alClick = event => {
      const target = event.target.closest('button, a');
      if (!target || !root.contains(target)) return;
      if (target.hasAttribute('data-close-lead')) { leadDialog.close(); return; }
      if (target.dataset.lead) { abrirFormulario(target.dataset.lead, target); return; }
      if (target === menuButton) {
        const abierto = menuButton.getAttribute('aria-expanded') !== 'true';
        menuButton.setAttribute('aria-expanded', String(abierto));
        menuButton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
        mobileMenu.hidden = !abierto;
      }
      if (target.dataset.route) {
        ruta = target.dataset.route;
        const data = RUTAS[ruta];
        opcion('[data-route]', ruta);
        texto('route-kicker', data.kicker);
        texto('route-title', data.titulo);
        texto('route-description', data.descripcion);
        const minis = root.querySelector('#route-minis');
        minis.replaceChildren(...data.pasos.map(([titulo, detalle], index) => {
          const div = document.createElement('div'), small = document.createElement('small');
          div.className = 'mini';
          div.textContent = `0${index + 1} · ${titulo}`;
          small.textContent = detalle;
          div.append(small);
          return div;
        }));
        }
      if (target.dataset.billing) { billing = target.dataset.billing; precios(); }
      if (target.dataset.currency) { currency = target.dataset.currency; precios(); }
      if (target.dataset.plan) {
        const codigo = `${target.dataset.plan}-${billing === 'annual' ? 'anual' : 'mensual'}`;
        const params = new URLSearchParams({ ruta: target.dataset.plan === 'ambas-rutas' ? 'ambas' : ruta, moneda_referencia: currency });
        navigate(`/checkout/public/${encodeURIComponent(codigo)}?${params}`);
        return;
      }
      if (target.matches('a')) {
        cerrarMenu();
        const href = target.getAttribute('href');
        if (href === '#solicitar-demo' || href === '#registro-proveedores') {
          event.preventDefault();
          abrirFormulario(href === '#registro-proveedores' ? 'proveedor' : 'demo', target);
          return;
        }
        if (href?.startsWith('/') && !href.startsWith('//') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
          event.preventDefault();
          navigate(href);
        }
      }
    };
    const alTeclado = event => {
      if (event.key === 'Escape' && !mobileMenu.hidden) { cerrarMenu(); menuButton.focus(); }
    };
    const alEnviar = async event => {
      const form = event.target;
      if (!form.matches('form[data-kind]')) return;
      event.preventDefault();
      if (form.dataset.enviando === 'true' || !form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      if (data.website) return;
      const status = form.querySelector('.gc-status');
      const button = form.querySelector('[type="submit"]');
      const tipo = form.dataset.kind;
      const selectedText = name => form.elements[name]?.selectedOptions?.[0]?.textContent || '';
      const nombre = `${data.nombre.trim()} ${data.apellido.trim()}`;
      const lineas = [
        `Origen: landing institucional Gesicom`,
        `Tipo: ${tipo === 'demo' ? selectedText('solicitud') : 'Postulación de proveedor'}`,
        `Documento: ${data.documento.trim()}`,
        `RUC: ${data.ruc?.trim() || 'No indicado'}`,
        ...(tipo === 'demo' ? [`Uso: ${selectedText('uso')}`] : [`WhatsApp: ${data.whatsapp.trim()}`, `Especialidad: ${selectedText('categoria')}`, `Descripción: ${data.descripcion?.trim() || 'No indicada'}`]),
      ];
      status.setAttribute('role', 'status');
      status.dataset.error = 'false';
      status.textContent = 'Enviando solicitud…';
      button.disabled = true;
      form.dataset.enviando = 'true';
      try {
        if (nombre.length > 150) throw new Error('El nombre y apellido juntos pueden tener hasta 150 caracteres.');
        const respuesta = await enviarMensajeContacto({
          area: 'comercial', nombre, email: data.email.trim(),
          asunto: tipo === 'demo' ? `Gesicom · ${selectedText('solicitud')}` : `Gesicom · Postulación de proveedor · ${selectedText('categoria')}`,
          mensaje: lineas.join('\n'), sitio_web: '',
        });
        if (!respuesta?.mensaje?.id) throw new Error('No pudimos confirmar la recepción. Conservamos tus datos para que puedas reintentar.');
        if (!vigente) return;
        status.textContent = `Solicitud #${respuesta.mensaje.id} recibida. Nuestro equipo se comunicará con vos.`;
        form.reset();
      } catch (error) {
        if (!vigente) return;
        status.dataset.error = 'true';
        status.setAttribute('role', 'alert');
        status.textContent = error.message || 'No pudimos enviar tu solicitud. Volvé a intentar.';
      } finally {
        if (vigente) { button.disabled = false; delete form.dataset.enviando; }
      }
    };
    root.addEventListener('click', alClick);
    root.addEventListener('submit', alEnviar);
    root.addEventListener('keydown', alTeclado);
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('show'); observer.unobserve(entry.target); } });
    }, { threshold: .12 }) : null;
    root.querySelectorAll('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('show'));
    return () => {
      vigente = false;
      root.removeEventListener('click', alClick);
      root.removeEventListener('submit', alEnviar);
      root.removeEventListener('keydown', alTeclado);
      observer?.disconnect();
      window.removeEventListener('hashchange', desdeHash);
      leadDialog.removeEventListener('close', alCerrarFormulario);
      if (leadDialog.open) leadDialog.close();
      document.body.style.overflow = overflowAnterior;
    };
  }, [navigate]);

  return <>
    <Seo titulo="Gesicom | Todo tu negocio digital bajo control" descripcion="Creá, administrá y escalá tu negocio digital desde un solo sistema. E-commerce, marca personal, CRM, marketing y analítica." schema={SCHEMA_ORGANIZACION} />
    <div ref={rootRef} className="gl-landing" dangerouslySetInnerHTML={{ __html: markup }} />
  </>;
}
