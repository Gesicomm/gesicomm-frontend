import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  Gift,
  LayoutTemplate,
  Loader2,
  Monitor,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Tablet,
  User,
  Wand2,
} from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { vitrinaService } from '../../services/vitrinaService';
import { ofertaService } from '../../services/ofertaService';
import CodigoPreview from './CodigoPreview';
import ProductPicker from '../landing/ProductPicker';
import { datosRuntimePreview } from './datosRuntime';
import '../landing/landing.css';

const SHORTCUTS = [
  { id: 'producto', icono: LayoutTemplate, titulo: 'Landing producto', bajada: 'Pagina de venta', prompt: 'Landing premium para un producto estrella, con hero fuerte, beneficios claros y CTA para comprar por WhatsApp.' },
  { id: 'campana', icono: CalendarDays, titulo: 'Promo/campana', bajada: 'Campana puntual', prompt: 'Promo por tiempo limitado con oferta irresistible, urgencia visual y copy orientado a conversion.' },
  { id: 'combo', icono: Gift, titulo: 'Combo/oferta', bajada: 'Oferta especial', prompt: 'Landing para vender un combo con ahorro visible, comparacion de valor y seccion de preguntas frecuentes.' },
  { id: 'cero', icono: Wand2, titulo: 'Desde cero', bajada: 'Idea libre', prompt: '' },
];

const EJEMPLOS = [
  'Landing premium para unos lentes de sol',
  'Promo 2x1 para Dia de la Madre',
  'Landing para Meta Ads enfocada en conversion',
];

const PROGRESO = [
  'Analizando producto',
  'Definiendo estructura de venta',
  'Generando copy',
  'Disenando secciones',
  'Preparando ofertas',
];

const MENSAJE_INICIAL_PRODUCTOS = 'Primero elegi los productos y combos reales que van a entrar en esta landing. Despues marcamos ofertas, destacados y recien ahi le das el prompt a la IA.';

const WIZARD_DARK_TOKENS = {
  '--color-fg': '#f8fafc',
  '--color-fg-muted': '#94a3b8',
  '--color-fg-subtle': '#64748b',
  '--color-primary': '#3b82f6',
  '--color-primary-hover': '#60a5fa',
  '--color-primary-text': '#60a5fa',
  '--color-success': '#10b981',
  '--color-warning': '#f59e0b',
  '--color-danger': '#ef4444',
};

function contentIdItem(item) {
  if (!item) return '';
  if (item.tipo === 'combo') return `combo-${item.id}`;
  return item.slug || item.content_id || `producto-${item.id}`;
}

function nombreItem(item) {
  return item?.nombre || item?.titulo || `Item ${item?.id || ''}`.trim();
}

export default function AILandingWizard({ onCreada }) {
  const [mensajes, setMensajes] = useState(() => [{
    id: 'inicio-productos',
    rol: 'bot',
    texto: MENSAJE_INICIAL_PRODUCTOS,
    widget: 'productos',
  }]);
  const [input, setInput] = useState('');
  const [prompt, setPrompt] = useState('');
  const [paso, setPaso] = useState('productos'); // 'productos' | 'ofertas' | 'prompt' | 'generando' | 'listo' | 'error'
  const [landingGenerada, setLandingGenerada] = useState(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState(new Map());
  const [ventaConfigurada, setVentaConfigurada] = useState(null);
  // Catálogo completo para el panel de venta (ofertas/combos/recomendados).
  const [catalogo, setCatalogo] = useState(null);
  const [ofertasTienda, setOfertasTienda] = useState([]);
  const [ofertasSeleccionadas, setOfertasSeleccionadas] = useState(new Set());
  const [destacadosSeleccionados, setDestacadosSeleccionados] = useState(new Set());
  const [cargandoOfertas, setCargandoOfertas] = useState(false);
  const [errorOfertas, setErrorOfertas] = useState('');
  const [shortcutActivo, setShortcutActivo] = useState(null);
  const [previewModo, setPreviewModo] = useState('desktop');
  const mensajesFinRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    mensajesFinRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const agregarMensaje = (rol, texto, widget = null) => {
    setMensajes(prev => [...prev, { id: Date.now() + Math.random(), rol, texto, widget }]);
  };

  const usarPrompt = (texto, shortcutId = null) => {
    setShortcutActivo(shortcutId);
    setInput(texto);
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const enviarPrompt = (e) => {
    e.preventDefault();
    if (!input.trim() || paso !== 'prompt' || paso === 'generando') return;

    const texto = input.trim();
    setPrompt(texto);
    setInput('');
    agregarMensaje('user', texto);
    const elegidos = Array.from(productosSeleccionados.values());
    const ids = Array.from(ofertasSeleccionadas);
    generarLanding(ventaParaIA(elegidos, ids, Array.from(destacadosSeleccionados)), elegidos, elegidos, texto);
  };

  const cargarCatalogo = async () => {
    if (catalogo) return catalogo;
    try {
      const data = await vitrinaService.catalogo();
      setCatalogo(data);
      return data;
    } catch {
      const vacio = { productos: [], combos: [] };
      setCatalogo(vacio);
      return vacio;
    }
  };

  const ventaParaIA = (seleccion, ofertasIds = [], destacadosIds = []) => {
    const productos = (seleccion || []).filter(item => item.tipo === 'producto');
    const esProductoUnico = productos.length === 1 && seleccion.length === 1;
    const hayCombos = (seleccion || []).some(item => item.tipo === 'combo');
    const destacadosLimpios = destacadosIds.map(String).filter(Boolean);
    return {
      configurado: true,
      tipo: esProductoUnico ? 'producto_unico' : hayCombos ? 'combos' : 'catalogo',
      seleccion: 'manual',
      categorias: [],
      incluir_combos: true,
      abrir_en: esProductoUnico ? 'producto' : 'tienda',
      combos_primero: hayCombos && !esProductoUnico,
      principal_id: productos[0]?.id ? Number(productos[0].id) : null,
      paquetes: {},
      cross_sell: { activo: true, ofertas: ofertasIds.map(Number).filter(Boolean) },
      recomendados: {
        activo: true,
        modo: destacadosLimpios.length ? 'manual' : 'auto',
        items: destacadosLimpios,
        max: Math.max(4, destacadosLimpios.length),
        titulo: destacadosLimpios.length ? 'Destacados' : '',
      },
    };
  };

  const abrirPasoOfertas = async () => {
    if (productosSeleccionados.size === 0) {
      alert('Por favor elegi al menos un producto.');
      return;
    }
    setPaso('ofertas');
    await cargarCatalogo();
    setCargandoOfertas(true);
    setErrorOfertas('');
    try {
      const lista = await ofertaService.listarTodas({ estrategias: ['normal', 'order_bump', 'upsell'] });
      setOfertasTienda(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setErrorOfertas(err?.response?.data?.message || 'No se pudieron cargar las ofertas.');
      setOfertasTienda([]);
    } finally {
      setCargandoOfertas(false);
    }
  };

  const avanzarAPrompt = (idsOfertas = Array.from(ofertasSeleccionadas)) => {
    const elegidos = Array.from(productosSeleccionados.values());
    if (!elegidos.length) {
      alert('Por favor elegi al menos un producto.');
      return;
    }
    const ventaFinal = ventaParaIA(elegidos, idsOfertas, Array.from(destacadosSeleccionados));
    setVentaConfigurada(ventaFinal);
    setPaso('prompt');
    agregarMensaje('bot', [
      'Perfecto. Ahora escribi que queres que haga la IA con estos productos y ofertas.',
      'Ejemplo: "Para la Pulsera Activity Tracker, en la ficha del producto agregá un timer de 2 horas y una oferta agresiva. Destacá la Botella Aromática y el combo Smart Life en la home."',
    ].join('\n\n'));
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const generarLanding = async (ventaFinal = null, seleccionFinal = null, itemsPayload = null, promptFinal = prompt) => {
    const elegidos = seleccionFinal || Array.from(productosSeleccionados.values());
    const itemsParaBackend = itemsPayload || elegidos;
    if (!elegidos.length && !['todos', 'categoria'].includes(ventaFinal?.seleccion)) {
      alert('Por favor elegi al menos un producto.');
      return;
    }

    if (seleccionFinal) {
      setProductosSeleccionados(new Map(seleccionFinal.map(item => [`${item.tipo}:${item.id}`, item])));
    }
    setVentaConfigurada(ventaFinal);
    setPaso('generando');
    agregarMensaje('bot', ventaFinal
      ? `Listo: voy a generar con ${elegidos.length} producto(s), ${ventaFinal.cross_sell?.ofertas?.length || 0} oferta(s) y ${ventaFinal.recomendados?.items?.length || 0} destacado(s).`
      : `Listo: voy a generar con ${elegidos.length} producto(s).`);

    try {
      const items = itemsParaBackend.map(item => ({
        tipo: item.tipo,
        id: Number(item.id),
      }));

      const landing = await landingSimpleService.crearDesdeIA(promptFinal, items, ventaFinal);

      agregarMensaje('bot', 'Landing generada. Podes revisarla a la derecha y abrirla en Gesicomm para ajustar ofertas, secciones y codigo.', 'listo');
      setPaso('listo');
      setLandingGenerada(landing);
    } catch (error) {
      setPaso('error');
      agregarMensaje('bot', error?.response?.data?.message || error.message || 'Ocurrio un error al generar la landing.');
    }
  };

  const generarSinOfertas = () => {
    setOfertasSeleccionadas(new Set());
    avanzarAPrompt([]);
  };

  const generarConOfertasElegidas = () => {
    avanzarAPrompt(Array.from(ofertasSeleccionadas));
  };

  const volverAProductos = () => {
    setPaso('productos');
  };

  const puedeEnviar = input.trim() && paso === 'prompt' && paso !== 'generando';
  const productosElegidos = productosSeleccionados.size;
  const modoWorkspace = true;

  return (
    <div
      className={`h-[calc(100vh-120px)] min-h-[680px] max-h-[900px] w-full rounded-[22px] bg-[#070b14] text-fg shadow-2xl ring-1 ring-white/8 ${modoWorkspace ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
      style={WIZARD_DARK_TOKENS}
      data-ai-wizard-root
    >
      <div className={`${modoWorkspace ? 'grid h-full grid-cols-1 lg:grid-cols-[minmax(340px,37%)_minmax(0,63%)]' : 'flex min-h-full flex-col'}`}>
        <AssistantPanel
          modoWorkspace={modoWorkspace}
          mensajes={mensajes}
          paso={paso}
          input={input}
          setInput={setInput}
          puedeEnviar={puedeEnviar}
          productosElegidos={productosElegidos}
          productosSeleccionados={productosSeleccionados}
          setProductosSeleccionados={setProductosSeleccionados}
          catalogo={catalogo}
          composerRef={composerRef}
          mensajesFinRef={mensajesFinRef}
          usarPrompt={usarPrompt}
          shortcutActivo={shortcutActivo}
          enviarPrompt={enviarPrompt}
          generarLanding={generarLanding}
          generarSinOfertas={generarSinOfertas}
          abrirPasoOfertas={abrirPasoOfertas}
          generarConOfertasElegidas={generarConOfertasElegidas}
          ofertasTienda={ofertasTienda}
          ofertasSeleccionadas={ofertasSeleccionadas}
          setOfertasSeleccionadas={setOfertasSeleccionadas}
          destacadosSeleccionados={destacadosSeleccionados}
          setDestacadosSeleccionados={setDestacadosSeleccionados}
          cargandoOfertas={cargandoOfertas}
          errorOfertas={errorOfertas}
          volverAProductos={volverAProductos}
        />

        <PreviewPanel
          paso={paso}
          landingGenerada={landingGenerada}
          productosSeleccionados={productosSeleccionados}
          onCreada={onCreada}
          modoWorkspace={modoWorkspace}
          previewModo={previewModo}
          setPreviewModo={setPreviewModo}
        />
      </div>
    </div>
  );
}

function AssistantPanel({
  modoWorkspace,
  mensajes,
  paso,
  input,
  setInput,
  puedeEnviar,
  productosElegidos,
  productosSeleccionados,
  setProductosSeleccionados,
  catalogo,
  composerRef,
  mensajesFinRef,
  usarPrompt,
  shortcutActivo,
  enviarPrompt,
  generarLanding,
  generarSinOfertas,
  abrirPasoOfertas,
  generarConOfertasElegidas,
  ofertasTienda,
  ofertasSeleccionadas,
  setOfertasSeleccionadas,
  destacadosSeleccionados,
  setDestacadosSeleccionados,
  cargandoOfertas,
  errorOfertas,
  volverAProductos,
}) {
  if (modoWorkspace) {
    return (
      <section className="flex min-h-0 flex-col bg-[linear-gradient(180deg,rgba(18,28,51,0.96),rgba(9,14,26,0.98))] ring-1 ring-white/8 lg:ring-r" aria-label="Asistente IA">
        <Header compact />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <MessageStack
            mensajes={mensajes}
            paso={paso}
            productosSeleccionados={productosSeleccionados}
            setProductosSeleccionados={setProductosSeleccionados}
            catalogo={catalogo}
            generarLanding={generarLanding}
            generarSinOfertas={generarSinOfertas}
            abrirPasoOfertas={abrirPasoOfertas}
            generarConOfertasElegidas={generarConOfertasElegidas}
            ofertasTienda={ofertasTienda}
            ofertasSeleccionadas={ofertasSeleccionadas}
            setOfertasSeleccionadas={setOfertasSeleccionadas}
            destacadosSeleccionados={destacadosSeleccionados}
            setDestacadosSeleccionados={setDestacadosSeleccionados}
            cargandoOfertas={cargandoOfertas}
            errorOfertas={errorOfertas}
            volverAProductos={volverAProductos}
            mensajesFinRef={mensajesFinRef}
          />
        </div>
        <div className="shrink-0 bg-[#0a1020]/95 p-4 shadow-[0_-18px_40px_rgba(0,0,0,0.18)]">
          <Composer
            input={input}
            setInput={setInput}
            puedeEnviar={puedeEnviar}
            paso={paso}
            composerRef={composerRef}
            enviarPrompt={enviarPrompt}
            compacto
          />
        </div>
      </section>
    );
  }

  return (
    <section className="shrink-0 bg-[linear-gradient(180deg,rgba(20,31,56,0.96),rgba(10,16,32,0.98))] px-5 py-4" aria-label="Crear con IA">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <Header />
        {mensajes.length === 0 ? (
          <Onboarding onPick={usarPrompt} shortcutActivo={shortcutActivo} />
        ) : (
          <div className="max-h-[210px] overflow-y-auto rounded-2xl bg-white/[0.035] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
            <MessageStack
              mensajes={mensajes}
              paso={paso}
              productosSeleccionados={productosSeleccionados}
              setProductosSeleccionados={setProductosSeleccionados}
              catalogo={catalogo}
              generarLanding={generarLanding}
              generarSinOfertas={generarSinOfertas}
              abrirPasoOfertas={abrirPasoOfertas}
              generarConOfertasElegidas={generarConOfertasElegidas}
              ofertasTienda={ofertasTienda}
              ofertasSeleccionadas={ofertasSeleccionadas}
              setOfertasSeleccionadas={setOfertasSeleccionadas}
              destacadosSeleccionados={destacadosSeleccionados}
              setDestacadosSeleccionados={setDestacadosSeleccionados}
              cargandoOfertas={cargandoOfertas}
              errorOfertas={errorOfertas}
              volverAProductos={volverAProductos}
              mensajesFinRef={mensajesFinRef}
            />
          </div>
        )}

        {paso === 'productos' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.045] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
            <span className="text-sm text-fg-muted">{productosElegidos ? `${productosElegidos} producto${productosElegidos === 1 ? '' : 's'} seleccionado${productosElegidos === 1 ? '' : 's'}` : 'Elegi al menos un producto para generar.'}</span>
            <button
              type="button"
              onClick={abrirPasoOfertas}
              disabled={productosElegidos === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Elegir ofertas <ArrowRight size={15} />
            </button>
          </div>
        )}

        <Composer
          input={input}
          setInput={setInput}
          puedeEnviar={puedeEnviar}
          paso={paso}
          composerRef={composerRef}
          enviarPrompt={enviarPrompt}
        />
      </div>
    </section>
  );
}

function Header({ compact = false }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${compact ? 'px-5 pb-4 pt-5' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-text shadow-[0_0_30px_rgba(59,130,246,0.18)]">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight text-fg">Crear con IA</h1>
          <p className="mt-1 text-sm text-fg-muted">Converti una idea en una landing lista para vender.</p>
        </div>
      </div>
      {!compact && (
        <button type="button" className="hidden rounded-xl bg-white/[0.055] px-3 py-2 text-xs font-semibold text-fg-muted transition hover:bg-white/[0.08] hover:text-fg sm:inline-flex">
          Historial
        </button>
      )}
    </div>
  );
}

function MessageStack({
  mensajes,
  paso,
  productosSeleccionados,
  setProductosSeleccionados,
  catalogo,
  generarLanding,
  generarSinOfertas,
  abrirPasoOfertas,
  generarConOfertasElegidas,
  ofertasTienda,
  ofertasSeleccionadas,
  setOfertasSeleccionadas,
  destacadosSeleccionados,
  setDestacadosSeleccionados,
  cargandoOfertas,
  errorOfertas,
  volverAProductos,
  mensajesFinRef,
}) {
  return (
    <div className="space-y-4">
      {mensajes.map((m) => (
        <div key={m.id} className={`flex gap-3 ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
          {m.rol === 'bot' && <Avatar icono={Bot} />}
          <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
            m.rol === 'user'
              ? 'rounded-br-md bg-primary text-white'
              : 'rounded-bl-md bg-white/[0.055] text-fg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
          }`}>
            <div className="whitespace-pre-wrap">{m.texto}</div>

            {m.widget === 'productos' && paso === 'productos' && (
              <SelectorProductos
                productosSeleccionados={productosSeleccionados}
                setProductosSeleccionados={setProductosSeleccionados}
                catalogo={catalogo}
                generarLanding={generarLanding}
                generarSinOfertas={generarSinOfertas}
                abrirPasoOfertas={abrirPasoOfertas}
              />
            )}

          </div>
          {m.rol === 'user' && <Avatar icono={User} />}
        </div>
      ))}

      {paso === 'ofertas' && (
        <SelectorOfertas
          productosSeleccionados={productosSeleccionados}
          ofertas={ofertasTienda}
          seleccionadas={ofertasSeleccionadas}
          setSeleccionadas={setOfertasSeleccionadas}
          destacados={destacadosSeleccionados}
          setDestacados={setDestacadosSeleccionados}
          cargando={cargandoOfertas}
          error={errorOfertas}
          onVolver={volverAProductos}
          onGenerar={generarConOfertasElegidas}
          onGenerarSinOfertas={generarSinOfertas}
        />
      )}

      {paso === 'generando' && (
        <div className="rounded-2xl bg-primary/10 p-4 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Loader2 size={16} className="animate-spin text-primary-text" />
            Creando tu landing...
          </div>
          <ProgressChecklist />
        </div>
      )}

      {paso === 'listo' && (
        <div className="rounded-2xl bg-success/10 p-4 text-sm text-fg shadow-[inset_0_0_0_1px_rgba(16,185,129,0.16)]">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} className="text-success" />
            La landing esta lista para revisar.
          </div>
          <p className="mt-2 text-fg-muted">Pedi cambios por chat o abri el editor para ajustar venta, ofertas y contenido.</p>
        </div>
      )}

      <div ref={mensajesFinRef} />
    </div>
  );
}

function Composer({ input, setInput, puedeEnviar, paso, composerRef, enviarPrompt, compacto = false }) {
  const listoParaPrompt = paso === 'prompt';
  return (
    <form
      onSubmit={enviarPrompt}
      className={`mx-auto w-full rounded-2xl bg-white/[0.06] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(59,130,246,0.24)] transition focus-within:bg-white/[0.075] focus-within:shadow-[0_18px_50px_rgba(0,0,0,0.24),inset_0_0_0_1px_rgba(96,165,250,0.55)] ${compacto ? '' : 'max-w-5xl'}`}
    >
      <textarea
        ref={composerRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={listoParaPrompt
          ? 'Ej: Para Activity Tracker agregá timer de 2 horas, urgencia y oferta agresiva. Destacá Botella Aromática y el combo Smart Life...'
          : 'Primero seleccioná productos, ofertas y destacados...'}
        disabled={!listoParaPrompt || paso === 'generando'}
        className={`${compacto ? 'h-24' : 'h-28'} w-full resize-none bg-transparent px-1 text-sm leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none disabled:opacity-60`}
        autoFocus
      />
      <div className="flex justify-end pt-3">
        <button
          type="submit"
          disabled={!puedeEnviar}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-primary/10 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-fg-subtle disabled:shadow-none"
        >
          Generar landing <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}

function Onboarding({ onPick, shortcutActivo }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold leading-tight text-fg">Que queres crear?</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">Contame el producto, la promocion y el estilo que buscas.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SHORTCUTS.map(({ id, icono: Icono, titulo, bajada, prompt }) => {
          const activo = shortcutActivo === id;
          return (
          <button
            key={titulo}
            type="button"
            onClick={() => onPick(prompt, id)}
            className={`group min-h-[106px] rounded-2xl p-4 text-left transition hover:-translate-y-0.5 ${
              activo
                ? 'bg-primary/16 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.45),0_12px_30px_rgba(59,130,246,0.12)]'
                : 'bg-white/[0.055] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)] hover:bg-primary/12 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.32)]'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-primary-text transition ${activo ? 'bg-primary/28' : 'bg-primary/15 group-hover:bg-primary/25'}`}>
              <Icono size={18} />
            </span>
            <span className="mt-4 block text-sm font-bold text-fg">{titulo}</span>
            <span className="mt-1 block text-xs leading-relaxed text-fg-muted">{bajada}</span>
          </button>
        );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="text-xs font-semibold text-fg-subtle">Ejemplos:</p>
        <div className="flex flex-wrap gap-2">
          {EJEMPLOS.map((ejemplo) => (
            <button
              key={ejemplo}
              type="button"
              onClick={() => onPick(ejemplo, null)}
              className="rounded-full bg-white/[0.05] px-3 py-2 text-xs font-medium text-fg-muted transition hover:bg-white/[0.085] hover:text-fg"
            >
              {ejemplo}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Avatar({ icono: Icono }) {
  return (
    <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-fg-muted sm:flex">
      <Icono size={15} />
    </div>
  );
}

function SelectorProductos({ productosSeleccionados, setProductosSeleccionados, catalogo, generarSinOfertas, abrirPasoOfertas }) {
  return (
    <div className="mt-4 rounded-2xl bg-[#070b14] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
      <ProductPicker
        catalogo={catalogo || { productos: [], combos: [] }}
        seleccion={productosSeleccionados}
        itemsOrdenados={Array.from(productosSeleccionados.values())}
        onToggle={(item) => {
          setProductosSeleccionados(prev => {
            const nueva = new Map(prev);
            const clave = `${item.tipo}:${item.id}`;
            if (nueva.has(clave)) nueva.delete(clave);
            else nueva.set(clave, item);
            return nueva;
          });
        }}
        onReordenar={() => {}}
        max={10}
        triggerLabel="Seleccionar productos"
        modalTitle="Selecciona los productos para la IA"
        refrescarCatalogoAlAbrir={true}
        themeScopeClassName="light"
        zIndexModal={3000}
      />
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={generarSinOfertas}
          disabled={productosSeleccionados.size === 0}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-fg/70 transition hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          Saltar ofertas
        </button>
        <button
          type="button"
          onClick={abrirPasoOfertas}
          disabled={productosSeleccionados.size === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Elegir ofertas <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

function SelectorOfertas({
  productosSeleccionados,
  ofertas,
  seleccionadas,
  setSeleccionadas,
  destacados,
  setDestacados,
  cargando,
  error,
  onVolver,
  onGenerar,
  onGenerarSinOfertas,
}) {
  const productos = Array.from(productosSeleccionados.values()).filter(p => p.tipo === 'producto');
  const itemsSeleccionados = Array.from(productosSeleccionados.values());
  const idsProductos = new Set(productos.map(p => Number(p.id)));
  const porProducto = productos.map(producto => ({
    producto,
    ofertas: (ofertas || []).filter(o => Number(o.producto_ancla_id) === Number(producto.id)),
  }));
  const totalOfertas = porProducto.reduce((acc, grupo) => acc + grupo.ofertas.length, 0);

  const alternar = (id) => {
    setSeleccionadas(prev => {
      const copia = new Set(prev);
      if (copia.has(Number(id))) copia.delete(Number(id));
      else copia.add(Number(id));
      return copia;
    });
  };

  const marcarTodas = () => {
    setSeleccionadas(new Set((ofertas || [])
      .filter(o => idsProductos.has(Number(o.producto_ancla_id)))
      .map(o => Number(o.id))));
  };

  const alternarDestacado = (item) => {
    const id = contentIdItem(item);
    if (!id) return;
    setDestacados(prev => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  };

  return (
    <div className="mt-4 rounded-2xl bg-[#070b14] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-fg">Ofertas para estos productos</p>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">
            Marcá paquetes, order bumps o upsells. La IA va a usar esta selección para armar la landing.
          </p>
        </div>
        {totalOfertas > 0 && (
          <button type="button" onClick={marcarTodas} className="rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-semibold text-fg-muted hover:text-fg">
            Marcar todas
          </button>
        )}
      </div>

      {cargando ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 size={16} className="animate-spin" /> Buscando ofertas...
        </div>
      ) : error ? (
        <p className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      ) : productos.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">Elegí al menos un producto para ver sus ofertas.</p>
      ) : totalOfertas === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-fg-muted">
          Los productos elegidos no tienen ofertas activas todavía. Podés generar la landing igual con los productos seleccionados.
        </p>
      ) : (
        <div className="mt-4 max-h-[330px] space-y-3 overflow-y-auto pr-1">
          {porProducto.map(({ producto, ofertas: ofertasProducto }) => (
            <div key={producto.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-fg">{producto.nombre}</p>
                <span className="shrink-0 text-[11px] font-semibold text-fg-subtle">
                  {ofertasProducto.length || 'Sin'} oferta{ofertasProducto.length === 1 ? '' : 's'}
                </span>
              </div>
              {ofertasProducto.length > 0 && (
                <div className="mt-3 space-y-2">
                  {ofertasProducto.map(oferta => {
                    const activa = seleccionadas.has(Number(oferta.id));
                    return (
                      <label
                        key={oferta.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                          activa ? 'border-primary/45 bg-primary/12' : 'border-white/8 bg-[#050811] hover:border-white/18'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={activa}
                          onChange={() => alternar(oferta.id)}
                          className="mt-1 h-4 w-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-fg">{oferta.nombre}</span>
                          <span className="mt-0.5 block text-xs text-fg-muted">
                            {nombreEstrategia(oferta.estrategia)}
                            {precioOferta(oferta) ? ` · Gs ${precioOferta(oferta).toLocaleString('es-PY')}` : ''}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
        <div className="flex items-start gap-2">
          <Star size={16} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-bold text-fg">Destacados para la IA</p>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">
              Marcá productos o combos que querés ver protagonistas en la home, recomendaciones o bloques destacados.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {itemsSeleccionados.map(item => {
            const id = contentIdItem(item);
            const activo = destacados.has(id);
            return (
              <button
                key={`${item.tipo}:${item.id}`}
                type="button"
                onClick={() => alternarDestacado(item)}
                className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  activo ? 'border-warning/60 bg-warning/15 text-warning' : 'border-white/10 bg-[#050811] text-fg-muted hover:border-white/20 hover:text-fg'
                }`}
              >
                <Star size={13} className={activo ? 'fill-current' : ''} />
                <span className="truncate">{nombreItem(item)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-fg/70 transition hover:text-fg"
        >
          Cambiar productos
        </button>
        <button
          type="button"
          onClick={onGenerarSinOfertas}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-fg/70 transition hover:text-fg"
        >
          Continuar sin ofertas
        </button>
        <button
          type="button"
          onClick={onGenerar}
          disabled={cargando}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continuar al prompt <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

function nombreEstrategia(estrategia) {
  if (estrategia === 'normal') return 'Paquete';
  if (estrategia === 'order_bump') return 'Order bump';
  if (estrategia === 'upsell') return 'Upsell';
  return 'Oferta';
}

function precioOferta(oferta) {
  const n = Number(oferta.precio_order_bump ?? oferta.precio_normal ?? oferta.precio ?? 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function PreviewPanel({ paso, landingGenerada, productosSeleccionados, onCreada, modoWorkspace, previewModo, setPreviewModo }) {
  const previewRef = useRef(null);
  const estaLista = paso === 'listo' && landingGenerada;
  const estaGenerando = paso === 'generando';
  const etiquetaTitulo = estaLista ? 'Landing generada' : 'Vista previa';
  const botonFinal = estaLista ? 'Abrir editor' : 'Abrir preview';
  const framePreview = getPreviewFrame(previewModo);

  const enfocarPreview = () => {
    if (modoWorkspace) return;
    window.setTimeout(() => {
      const preview = previewRef.current;
      const scrollBox = preview?.closest('[data-ai-wizard-root]');
      if (!preview || !scrollBox) return;
      scrollBox.scrollTo({
        top: Math.max(0, preview.offsetTop - 16),
        behavior: 'smooth',
      });
    }, 40);
  };

  useEffect(() => {
    enfocarPreview();
  }, [modoWorkspace, previewModo]);

  return (
    <section ref={previewRef} className={`${modoWorkspace ? 'hidden min-h-0 lg:flex' : 'flex flex-none'} flex-col bg-[#080d19]`} aria-label="Vista previa">
      <div className={`${modoWorkspace ? 'max-w-none px-5 pb-5' : 'max-w-[min(90vw,1280px)] px-0 pb-6'} mx-auto flex ${modoWorkspace ? 'min-h-0 flex-1' : ''} w-full flex-col`}>
        <div className="flex shrink-0 items-end justify-between gap-4 py-4">
          <div>
            <h2 className="text-sm font-bold text-fg">{etiquetaTitulo}</h2>
            <p className="mt-0.5 text-xs text-fg-subtle">Canvas en vivo de tu proxima pagina de venta.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DeviceButton icono={Monitor} label="Desktop" activo={previewModo === 'desktop'} onClick={() => { setPreviewModo('desktop'); enfocarPreview(); }} />
            <DeviceButton icono={Tablet} label="Tablet" activo={previewModo === 'tablet'} onClick={() => { setPreviewModo('tablet'); enfocarPreview(); }} />
            <DeviceButton icono={Smartphone} label="Mobile" activo={previewModo === 'mobile'} onClick={() => { setPreviewModo('mobile'); enfocarPreview(); }} />
            {estaLista && (
              <>
                <ActionButton icono={RefreshCw} label="Regenerar" />
                <ActionButton icono={Sparkles} label="Editar con IA" />
              </>
            )}
            <button
              type="button"
              onClick={estaLista ? () => onCreada(landingGenerada) : undefined}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
                estaLista
                  ? 'bg-primary text-white shadow-lg shadow-primary/10 hover:bg-primary-hover'
                  : 'bg-white/[0.05] text-fg-muted hover:bg-white/[0.085] hover:text-fg'
              }`}
            >
              <ExternalLink size={14} /> {botonFinal}
            </button>
          </div>
        </div>

        {estaLista ? (
          <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-2xl bg-[#050811] shadow-2xl ring-1 ring-white/8">
            <div className={`transition-all duration-200 ${framePreview.className}`} style={framePreview.style}>
              <CodigoPreview
                codigo={landingGenerada.content?.codigo}
                titulo={landingGenerada.titulo}
                datos={datosRuntimePreview({
                  productos: Array.from(productosSeleccionados.values()),
                  venta: landingGenerada.content?.venta,
                })}
              />
            </div>
          </div>
        ) : (
          <BrowserCanvas generando={estaGenerando} previewModo={previewModo} />
        )}
      </div>
    </section>
  );
}

function getPreviewFrame(modo) {
  if (modo === 'mobile') {
    return {
      className: 'max-w-full self-center',
      style: {
        width: 'min(430px, 100%)',
        height: 'clamp(600px, calc(100vh - 168px), 780px)',
      },
    };
  }
  if (modo === 'tablet') {
    return {
      className: 'max-w-full self-center',
      style: {
        width: 'min(820px, 100%)',
        height: 'clamp(600px, calc(100vh - 168px), 780px)',
      },
    };
  }
  return {
    className: 'w-full self-stretch',
    style: {
      minHeight: 'clamp(560px, calc(100vh - 180px), 760px)',
    },
  };
}

function DeviceButton({ icono: Icono, label, activo = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
        activo
          ? 'border-primary/35 bg-primary/15 text-primary-text'
          : 'border-white/0 bg-white/[0.04] text-fg-muted hover:bg-white/[0.075] hover:text-fg'
      }`}
      title={label}
    >
      <Icono size={14} />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function ActionButton({ icono: Icono, label }) {
  return (
    <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-white/[0.055] px-3 py-2 text-xs font-semibold text-fg-muted transition hover:bg-white/[0.085] hover:text-fg">
      <Icono size={14} />
      {label}
    </button>
  );
}

function BrowserCanvas({ generando, previewModo }) {
  const framePreview = getPreviewFrame(previewModo);
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-2xl bg-[#0d1323] shadow-2xl ring-1 ring-white/8 transition-all duration-200 ${framePreview.className}`} style={framePreview.style}>
      <div className="flex h-12 items-center gap-3 bg-white/[0.045] px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <div className="flex h-7 flex-1 items-center rounded-full border border-white/10 bg-[#070b14] px-4 text-xs text-fg-subtle">
          tutienda.gesicomm.com
        </div>
      </div>

      <div className="absolute inset-x-0 top-12 h-[calc(100%-48px)] opacity-70">
        <LandingSkeleton />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#060a13]/28 p-8 text-center backdrop-blur-[1px]">
        <div className="max-w-md">
          {generando ? (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary-text">
                <Loader2 size={24} className="animate-spin" />
              </div>
              <h3 className="mt-5 text-2xl font-bold text-fg">Creando tu landing...</h3>
              <ProgressChecklist />
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary-text">
                <ShoppingBag size={24} />
              </div>
              <h3 className="mt-5 text-2xl font-bold text-fg">Tu landing aparecera aca</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">Describi arriba que queres vender y vas a verla cobrar vida aca.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressChecklist() {
  return (
    <div className="mx-auto mt-4 max-w-sm space-y-2 text-left">
      {PROGRESO.map((item, index) => {
        const completo = index < 3;
        return (
          <div key={item} className="flex items-center gap-2 text-sm text-fg-muted">
            {completo ? <Check size={15} className="text-success" /> : <Circle size={11} className="text-fg-subtle" />}
            <span className={completo ? 'text-fg' : ''}>{item}</span>
          </div>
        );
      })}
    </div>
  );
}

function LandingSkeleton() {
  return (
    <div className="h-full bg-[#f7f7f8] p-8 text-[#0d1b3d]">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 rounded-full bg-[#0d1b3d]/20" />
          <div className="flex gap-3">
            <div className="h-4 w-16 rounded-full bg-[#0d1b3d]/12" />
            <div className="h-4 w-16 rounded-full bg-[#0d1b3d]/12" />
            <div className="h-8 w-24 rounded-full bg-[#3b82f6]/25" />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-[1.05fr_0.95fr] gap-10">
          <div>
            <div className="h-5 w-28 rounded-full bg-[#ffc107]/45" />
            <div className="mt-5 h-12 w-full rounded-xl bg-[#0d1b3d]/18" />
            <div className="mt-3 h-12 w-4/5 rounded-xl bg-[#0d1b3d]/14" />
            <div className="mt-6 h-4 w-full rounded-full bg-[#0d1b3d]/10" />
            <div className="mt-2 h-4 w-3/4 rounded-full bg-[#0d1b3d]/10" />
            <div className="mt-7 flex gap-3">
              <div className="h-11 w-36 rounded-xl bg-[#3b82f6]/28" />
              <div className="h-11 w-28 rounded-xl bg-[#0d1b3d]/10" />
            </div>
          </div>
          <div className="h-72 rounded-3xl bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe]" />
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4">
          <div className="h-28 rounded-2xl bg-[#0d1b3d]/10" />
          <div className="h-28 rounded-2xl bg-[#0d1b3d]/10" />
          <div className="h-28 rounded-2xl bg-[#0d1b3d]/10" />
        </div>
      </div>
    </div>
  );
}
