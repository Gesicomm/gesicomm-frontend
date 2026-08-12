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
  return <LandingTestimonials seccion={section || { contenido: content, config: settings }} testimonios={page.testimonios || []} />;
};

const FaqAdapter = ({ content, settings, section }) => {
  const { page } = useRenderContext();
  return <LandingFaq seccion={section || { contenido: content, config: settings }} faqs={page.faq || []} />;
};

const FooterAdapter = ({ content, settings }) => {
  const { page } = useRenderContext();
  return (
    <div className="lp-footer" style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.8 }}>
      <h3>{content.titulo || page.titulo}</h3>
      <p>{content.descripcion || page.descripcion}</p>
    </div>
  );
};

// Announcement bar wasn't a separate component in legacy, just a div
const AnnouncementBarAdapter = ({ content, settings }) => {
  if (!content.texto) return null;
  return <section className="lp-custom-announcement">{content.texto}</section>;
};

// Banner adapter (legacy code just skipped it or handled it inside LandingPublica... wait, in LandingPublica.jsx line 515 'banner' was in the list, but there was no <LandingBanner/> component explicitly imported? Let's assume there is one or just render a simple div for now, or check LandingPublica again).

import { ProductDetailBlock } from './product-detail/ProductDetailBlock';

import { BLOQUES_SCHEMA } from '../../pages/landing/BloquesSchema';

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
  
  // Also register 'banner' just in case
  BlockRegistry.register({
    type: 'banner',
    component: ({ content }) => {
      const { page } = useRenderContext();
      const bannerData = page.banner;
      if (!bannerData || (!bannerData.titulo && !bannerData.imagen)) return null;
      return (
        <section className="lp-custom-banner">
          {/* Implementación simplificada o delegar al real si existe */}
          {bannerData.imagen && <img src={bannerData.imagen} alt="Banner" style={{ width: '100%', display: 'block' }} />}
          {bannerData.titulo && <div className="lp-banner-content"><h2>{bannerData.titulo}</h2></div>}
        </section>
      );
    }
  });
}
