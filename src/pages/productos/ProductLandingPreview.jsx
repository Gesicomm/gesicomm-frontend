import React, { useEffect, useMemo, useState } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { ofertaAFormaPublica, ofertaService } from '../../services/ofertaService';
import BasicoProductPage from '../landing-simple/templates/basico/BasicoProductPage';
import { fichaBasicoDesdeProducto, resolverFichaBasico } from '../landing-simple/templates/basico/fichaBasico';
import BeautyProductPage from '../landing-simple/templates/beauty/BeautyProductPage';
import { fichaBeautyDesdeProducto, resolverFichaBeauty } from '../landing-simple/templates/beauty/fichaBeauty';
import FitnessProductPage from '../landing-simple/templates/fitness/FitnessProductPage';
import {
  armarItemFicha as armarItemFitness,
  fichaDesdeMarketing,
  resolverFichaFitness,
} from '../landing-simple/templates/fitness/fichaFitness';
import TechProductPage from '../landing-simple/templates/tech/TechProductPage';
import { fichaTechDesdeProducto, resolverFichaTech } from '../landing-simple/templates/tech/fichaTech';
import { armarItemFicha } from '../landing-simple/templates/fichaComun';

const DEVICE_OPTIONS = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

const TEMPLATE_BY_RUBRO = {
  suplementos: 'fitness-suplementos',
  tecnologia: 'tech-electronica',
  beauty: 'beauty-skincare',
};

const DEFAULT_TEMA = {
  fondo: '#ffffff',
  texto: '#111827',
  acento: '#2f5597',
};

function imagenesOrdenadas(imagenes = [], imagenesNuevas = []) {
  return [
    ...[...imagenes].sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    ...imagenesNuevas,
  ].map(img => img?.url).filter(Boolean);
}

function variantesPreview(variantes = [], precioBase = 0) {
  return variantes
    .filter(v => v?.nombre)
    .map((v, idx) => {
      const diferencial = Number(v.precio_diferencial) || 0;
      return {
        id: v.id || `preview-${idx}`,
        nombre: v.nombre,
        sku_variante: v.sku_variante || '',
        stock: Number(v.stock) || 0,
        precio_diferencial: diferencial,
        precio_efectivo: Math.max(0, Number(precioBase) + diferencial),
      };
    });
}

export default function ProductLandingPreview({
  productoId,
  producto,
  categoriaNombre,
  imagenes,
  imagenesNuevas,
  variantes,
  tieneVariantes,
  faq,
  precioFinal,
  precioAncla,
  device,
  onDeviceChange,
}) {
  const [ofertas, setOfertas] = useState([]);

  useEffect(() => {
    if (!productoId) {
      setOfertas([]);
      return undefined;
    }
    let vivo = true;
    ofertaService.listarPorProducto(productoId, { soloActivas: true })
      .then(data => {
        if (!vivo) return;
        const lista = Array.isArray(data) ? data : [];
        setOfertas(lista.map(o => ofertaAFormaPublica(o, productoId)));
      })
      .catch(() => {
        if (vivo) setOfertas([]);
      });
    return () => { vivo = false; };
  }, [productoId]);

  const dto = useMemo(() => {
    const precio = Number(precioFinal) || null;
    return {
      id: productoId || 'preview',
      content_id: productoId || 'preview',
      nombre: producto?.nombre || 'Producto sin nombre',
      categoria: categoriaNombre || 'Sin categoria',
      descripcion: producto?.descripcion_corta || producto?.descripcion_larga || '',
      descripcion_larga: producto?.descripcion_larga || producto?.descripcion_corta || '',
      precio,
      precio_antes: Number(precioAncla) > Number(precio) ? Number(precioAncla) : null,
      imagenes: imagenesOrdenadas(imagenes, imagenesNuevas),
      ofertas,
      variantes: tieneVariantes ? variantesPreview(variantes, precio || 0) : [],
      faq: Array.isArray(faq) ? faq : [],
      faq_titulo: producto?.faq_titulo || '',
      propuesta_valor: producto?.propuesta_valor || '',
      sobre_este_producto: producto?.ficha_rubro === 'basico' ? (producto?.sobre_este_producto || '') : '',
      beneficios: Array.isArray(producto?.beneficios) ? producto.beneficios : [],
      confianza: Array.isArray(producto?.confianza) ? producto.confianza : [],
      ficha_datos: producto?.ficha_datos || {},
    };
  }, [
    productoId,
    producto,
    categoriaNombre,
    imagenes,
    imagenesNuevas,
    ofertas,
    tieneVariantes,
    variantes,
    faq,
    precioFinal,
    precioAncla,
  ]);

  const preview = useMemo(() => {
    const rubro = producto?.ficha_rubro || '';
    const templateSlug = TEMPLATE_BY_RUBRO[rubro] || 'basico';
    const comun = {
      tema: DEFAULT_TEMA,
      templateSlug,
      nombreComercio: 'Tu tienda',
      contacto: null,
      isMobile: device === 'mobile',
      previewMode: true,
      onComprar: () => {},
      onAgregar: null,
      onVolver: null,
      onClickRelacionado: null,
    };

    if (rubro === 'suplementos') {
      const ficha = resolverFichaFitness(null, null, fichaDesdeMarketing(dto));
      const item = armarItemFitness({
        nombre: dto.nombre,
        categoria: dto.categoria,
        descripcion: dto.descripcion_larga || dto.descripcion,
        precio: dto.precio,
        precioAntes: dto.precio_antes,
        imagenes: dto.imagenes,
        ofertas: dto.ofertas,
        faq: dto.faq,
        faqTitulo: dto.faq_titulo,
      });
      return <FitnessProductPage item={item} ficha={ficha} {...comun} />;
    }

    if (rubro === 'tecnologia') {
      const ficha = resolverFichaTech(null, null, fichaTechDesdeProducto(dto));
      const item = armarItemFicha({
        nombre: dto.nombre,
        categoria: dto.categoria,
        descripcion: dto.descripcion_larga || dto.descripcion,
        precio: dto.precio,
        precioAntes: dto.precio_antes,
        imagenes: dto.imagenes,
        ofertas: dto.ofertas,
        variantes: dto.variantes,
        faq: dto.faq,
        faqTitulo: dto.faq_titulo,
      });
      return <TechProductPage item={item} ficha={ficha} {...comun} />;
    }

    if (rubro === 'beauty') {
      const ficha = resolverFichaBeauty(null, null, fichaBeautyDesdeProducto(dto));
      const item = armarItemFicha({
        nombre: dto.nombre,
        categoria: dto.categoria,
        descripcion: dto.descripcion_larga || dto.descripcion,
        precio: dto.precio,
        precioAntes: dto.precio_antes,
        imagenes: dto.imagenes,
        ofertas: dto.ofertas,
        faq: dto.faq,
        faqTitulo: dto.faq_titulo,
      });
      return <BeautyProductPage item={item} ficha={ficha} {...comun} />;
    }

    const ficha = resolverFichaBasico(null, null, fichaBasicoDesdeProducto(dto));
    const item = armarItemFicha({
      nombre: dto.nombre,
      categoria: dto.categoria,
      descripcion: dto.descripcion_larga || dto.descripcion,
      precio: dto.precio,
      precioAntes: dto.precio_antes,
      imagenes: dto.imagenes,
      ofertas: dto.ofertas,
      variantes: dto.variantes,
      faq: dto.faq,
      faqTitulo: dto.faq_titulo,
    });
    return <BasicoProductPage item={item} ficha={ficha} {...comun} />;
  }, [device, dto, producto?.ficha_rubro]);

  return (
    <section className="product-preview-panel" aria-label="Vista pública del producto">
      <div className="product-preview-toolbar">
        <div>
          <span className="product-preview-kicker">Vista del producto</span>
          <h3>Cómo se verá en la landing</h3>
        </div>
        <div className="product-preview-devices" role="group" aria-label="Resolucion de preview">
          {DEVICE_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={device === id ? 'active' : ''}
              onClick={() => onDeviceChange(id)}
              title={label}
              aria-label={label}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`product-preview-frame ${device}`}>
        <div className="product-preview-surface">
          {preview}
        </div>
      </div>
    </section>
  );
}
