import { BlockRegistry } from '../core/BlockRegistry';
import { HeaderBlock } from './header/HeaderBlock';
import LandingHero from '../../pages/landing/LandingHero';
import LandingBenefits from '../../pages/landing/LandingBenefits';
import LandingCategoryStrip from '../../pages/landing/LandingCategoryStrip';
import LandingFeatured from '../../pages/landing/LandingFeatured';
import LandingProductos from '../../pages/landing/LandingProductos';
import LandingTestimonials from '../../pages/landing/LandingTestimonials';
import LandingFaq from '../../pages/landing/LandingFaq';
import { useRenderContext } from '../core/RenderContext';
import { getMediaUrl } from '../../services/api';

// Legacy adapters that pull the global state from context and pass it as props
// exactly as the old hardcoded LandingPublica.jsx did.

const HeroAdapter = ({ content, settings, section }) => {
  const { page, data } = useRenderContext();
  return (
    <LandingHero
      seccion={section || { contenido: content, config: settings }}
      template={settings.template}
      config={settings}
      contenido={content}
      titulo={content.titulo || page.titulo}
      descripcion={content.descripcion || page.descripcion}
      imagenFondo={content.imagen_fondo || page.banner}
      totalItems={data.totalItems}
      totalCategorias={data.categorias?.length || 0}
      ratingPromedio={data.ratingPromedio}
      cantidadOpiniones={data.cantidadOpiniones}
      whatsapp={page.contacto?.whatsapp}
      tamano={content.tamano}
    />
  );
};

const BenefitsAdapter = ({ content, settings, section }) => {
  return <LandingBenefits seccion={section || { contenido: content, config: settings }} />;
};

const CategoriesAdapter = ({ content, settings, section }) => {
  const { data, actions } = useRenderContext();
  return (
    <LandingCategoryStrip
      seccion={section || { contenido: content, config: settings }}
      categorias={data.categorias}
      categoriaImagen={data.categoriaImagen}
      onSeleccionar={actions.seleccionarCategoria}
    />
  );
};

const FeaturedAdapter = ({ content, settings, section }) => {
  const { page, data, actions, state } = useRenderContext();
  return (
    <LandingFeatured
      seccion={section || { contenido: content, config: settings }}
      items={data.itemsDestacados}
      contacto={page.contacto}
      wishlist={state.wishlist}
      onToggleWishlist={actions.toggleWishlist}
      agregadoRapido={state.agregadoRapido}
      onAgregarRapido={actions.agregarRapido}
    />
  );
};

const ProductsAdapter = ({ content, settings, section }) => {
  const { page, data, actions, state } = useRenderContext();
  return (
    <LandingProductos
      seccion={section || { contenido: content, config: settings }}
      items={data.itemsFiltrados}
      contacto={page.contacto}
      wishlist={state.wishlist}
      toggleWishlist={actions.toggleWishlist}
      agregadoRapido={state.agregadoRapido}
      handleAgregarRapido={actions.agregarRapido}
      slug={page.slug}
      navigate={actions.navigate}
      mostrarBusqueda={page.filtros?.buscador}
      busqueda={state.busqueda}
      onBuscar={actions.setBusqueda}
      mostrarFiltroCategoria={page.filtros?.categoria}
      categorias={data.categorias}
      filtroCategoria={state.filtroCategoria}
      onFiltrarCategoria={actions.setFiltroCategoria}
      mostrarFiltroMarca={page.filtros?.marca}
      marcas={data.marcas}
      filtroMarca={state.filtroMarca}
      onFiltrarMarca={actions.setFiltroMarca}
      mostrarFiltroEtiqueta={page.filtros?.etiqueta}
      etiquetas={data.etiquetas}
      filtroEtiqueta={state.filtroEtiqueta}
      onFiltrarEtiqueta={actions.setFiltroEtiqueta}
      mostrarOrden={page.filtros?.orden_precio}
      orden={state.orden}
      onOrdenar={actions.setOrden}
      onLimpiar={actions.limpiarFiltros}
      hayFiltroActivo={data.hayFiltroActivo}
      conteo={data.conteo}
    />
  );
};

const TestimonialsAdapter = ({ content, settings, section }) => {
  const { page } = useRenderContext();
  return <LandingTestimonials seccion={section || { contenido: content, config: settings }} testimonios={content.items || page.testimonios || []} />;
};

const FaqAdapter = ({ content, settings, section }) => {
  const { page } = useRenderContext();
  return <LandingFaq seccion={section || { contenido: content, config: settings }} faqs={content.items || page.faq || []} />;
};

import PublicFooterRenderer from './footer-builder/PublicFooterRenderer';
import FooterCanvas from './footer-builder/FooterCanvas';
import { useFooterBuilderOptional, normalizeFooterData } from './footer-builder/FooterContext';

export const FooterAdapter = ({ content, settings, section }) => {
  const { page } = useRenderContext();
  // Solo existe un FooterProvider ancestro cuando LandingEditor.jsx envuelve
  // el canvas para editar ESTA sección (ver el wrap condicional en
  // LandingEditor.jsx) — en el sitio público, o si el footer no es la
  // sección seleccionada, esto da null y se muestra el render estático.
  // El provider está montado siempre en el editor (ver FooterProvider), así
  // que lo que decide mostrar el canvas editable es `active`, no su mera
  // presencia: en el sitio público no hay provider, y en el editor con otra
  // sección seleccionada hay provider pero inactivo.
  const footerBuilder = useFooterBuilderOptional();
  if (footerBuilder?.active) {
    return <FooterCanvas />;
  }

  // Footer viejo: nunca pasó por el builder pero tiene su propio texto, así
  // que se respeta tal cual estaba.
  const esLegacy = !(section?.config?.schemaVersion >= 1);
  if (esLegacy && (content?.titulo || content?.descripcion)) {
    return (
      <div className="lp-footer" style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.8 }}>
        <h3>{content.titulo || page?.titulo}</h3>
        <p>{content.descripcion || page?.descripcion}</p>
      </div>
    );
  }

  // normalizeFooterData rellena los defaults: sin esto un footer todavía sin
  // configurar no dibujaba nada hasta que se lo seleccionaba una vez.
  return <PublicFooterRenderer data={normalizeFooterData(section?.config)} />;
};

// Announcement bar wasn't a separate component in legacy, just a div.
// Soporta `mensajes` (varios, en marquee) además de `texto` (uno fijo) —
// igual que la vista previa del editor, que ya delegaba en
// LandingScrollingText para ese caso. Sin esto, una barra configurada con
// varios mensajes se veía en el editor pero desaparecía en el sitio real.
const AnnouncementBarAdapter = ({ content, settings, section }) => {
  const tieneMensajes = content.mensajes && content.mensajes.length > 0;
  if (!tieneMensajes && !content.texto) return null;
  return (
    <section className="lp-custom-announcement" style={{ backgroundColor: settings?.color_fondo, color: settings?.color_texto }}>
      {tieneMensajes
        ? <LandingScrollingText seccion={section || { contenido: content, config: settings }} />
        : content.texto}
    </section>
  );
};

// Banner adapter (legacy code just skipped it or handled it inside LandingPublica... wait, in LandingPublica.jsx line 515 'banner' was in the list, but there was no <LandingBanner/> component explicitly imported? Let's assume there is one or just render a simple div for now, or check LandingPublica again).

import { ProductDetailBlock } from './product-detail/ProductDetailBlock';
import { ProductoGaleriaBlock } from './producto-galeria/ProductoGaleriaBlock';

import { BLOQUES_SCHEMA } from '../../pages/landing/BloquesSchema';

import LandingComoFunciona from '../../pages/landing/LandingComoFunciona';
import LandingSocial from '../../pages/landing/LandingSocial';
import LandingScrollingText from '../../pages/landing/LandingScrollingText';
import LandingBeforeAfter from '../../pages/landing/LandingBeforeAfter';
import LandingCta from '../../pages/landing/LandingCta';
import LandingImageText from '../../pages/landing/LandingImageText';
import LandingLogoList from '../../pages/landing/LandingLogoList';

// Estos componentes ya existían (usados por LandingPreview.jsx en el editor)
// pero nunca se habían registrado acá — por eso en el sitio público
// SectionRenderer los saltaba en silencio (BlockRegistry.resolve devolvía
// null). Todos toman una sola prop `seccion` con forma {contenido, config,
// template}, así que el adaptador solo reempaqueta lo que ya llega en
// `section` (ver props que arma SectionRenderer.jsx).
const TextoAdapter = ({ section, content }) => {
  const cont = content || {};
  return (
    <section className={`lp-custom-section ${cont.tamano ? 'lp-texto-' + cont.tamano : ''}`}>
      {cont.titulo && <h2>{cont.titulo}</h2>}
      {cont.texto && <p style={{ whiteSpace: 'pre-line' }}>{cont.texto}</p>}
    </section>
  );
};

const ComoFuncionaAdapter = ({ section }) => <LandingComoFunciona seccion={section} />;
const RedesSocialesAdapter = ({ section }) => <LandingSocial seccion={section} />;
const ScrollingTextAdapter = ({ section }) => <LandingScrollingText seccion={section} />;
const BeforeAfterAdapter = ({ section }) => <LandingBeforeAfter seccion={section} />;
const CtaAdapter = ({ section }) => <LandingCta seccion={section} />;
const ImageTextAdapter = ({ section }) => <LandingImageText seccion={section} />;
const LogoListAdapter = ({ section }) => <LandingLogoList seccion={section} />;

export function registerLegacyBlocks() {
  const registerWithSchema = (type, component) => {
    const schema = BLOQUES_SCHEMA[type] || {};
    BlockRegistry.register({ 
      type, 
      component, 
      schemaVersion: schema.schemaVersion || 1, 
      migrations: schema.migrations || {} 
    });
  };

  registerWithSchema('header', HeaderBlock);
  registerWithSchema('announcement_bar', AnnouncementBarAdapter);
  registerWithSchema('hero', HeroAdapter);
  registerWithSchema('beneficios', BenefitsAdapter);
  registerWithSchema('categorias', CategoriesAdapter);
  registerWithSchema('destacados', FeaturedAdapter);
  registerWithSchema('productos', ProductsAdapter);
  registerWithSchema('testimonios', TestimonialsAdapter);
  registerWithSchema('faq', FaqAdapter);
  registerWithSchema('footer', FooterAdapter);
  registerWithSchema('product_detail', ProductDetailBlock);
  registerWithSchema('producto_galeria', ProductoGaleriaBlock);
  registerWithSchema('texto', TextoAdapter);
  registerWithSchema('rich_text', TextoAdapter);
  registerWithSchema('como_funciona', ComoFuncionaAdapter);
  registerWithSchema('redes_sociales', RedesSocialesAdapter);
  registerWithSchema('scrolling_text', ScrollingTextAdapter);
  registerWithSchema('before_after', BeforeAfterAdapter);
  registerWithSchema('cta', CtaAdapter);
  registerWithSchema('image_text', ImageTextAdapter);
  registerWithSchema('logo_list', LogoListAdapter);

  // 'banner' es una sección de imagen independiente (ver BloquesSchema.js):
  // cada instancia tiene su propio content.imagen/titulo/etc, no comparte
  // nada con otras secciones banner de la misma página — agregar el bloque
  // dos veces da dos imágenes totalmente separadas, cada una con su propio
  // inspector. Antes esto leía `page.banner` (un campo global de toda la
  // landing) en vez del contenido propio de la sección: por eso se veía
  // bien en LandingPreview.jsx (que sí usa `cont` por sección, ver su caso
  // 'banner') pero en el sitio público todas las instancias mostraban lo
  // mismo (o nada). Mismo tipo de bug que el resto de legacyBlocks.jsx.
  registerWithSchema('banner', ({ content }) => {
    const cont = content || {};
    if (!cont.imagen && !cont.titulo) return null;
    return (
      <div
        className={`lp-banner ${cont.imagen ? 'con-imagen' : ''} ${cont.altura ? 'lp-banner-' + cont.altura : ''}`}
        style={cont.imagen ? { backgroundImage: `url(${getMediaUrl(cont.imagen)})` } : {}}
      >
        <div className="lp-banner-overlay">
          {cont.titulo && <h2>{cont.titulo}</h2>}
          {cont.subtitulo && <p>{cont.subtitulo}</p>}
          {cont.boton_texto && cont.boton_link && (
            <a className="lp-banner-btn" href={cont.boton_link}>{cont.boton_texto}</a>
          )}
        </div>
      </div>
    );
  });
}
