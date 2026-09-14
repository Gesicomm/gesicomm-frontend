import React, { useMemo } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import ComboProductPage from '../landing-simple/templates/combo/ComboProductPage';
import { fichaComboDesdeProducto, resolverFichaCombo } from '../landing-simple/templates/combo/fichaCombo';
import { armarItemFicha } from '../landing-simple/templates/fichaComun';
import '../productos/productos.css';

const DEVICE_OPTIONS = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

const DEFAULT_TEMA = {
  fondo: '#ffffff',
  texto: '#111827',
  acento: '#2f5597',
};

/**
 * Vista previa en vivo de la ficha del combo (template "Combo") dentro del
 * editor de Mis Productos → Combos. Mismo criterio que ProductLandingPreview
 * (ver pages/productos/): NO es un mockup aparte, monta el MISMO componente
 * (ComboProductPage) que termina viéndose en la landing publicada — así lo
 * que el comercio ve acá mientras carga la Vista del combo es exactamente
 * lo que va a publicar, sin desincronizarse.
 *
 * Esta vista previa no conoce landings reales (el combo puede venderse en
 * varias, cada una con su propio tema/defaults): usa un tema neutro y sin
 * overrides de landing, solo lo que ya está cargado en el combo.
 */
export default function ComboLandingPreview({
  combo,
  principal,
  upsells,
  precioTotal,
  imagenes,
  faq,
  faqTitulo,
  device,
  onDeviceChange,
}) {
  const dto = useMemo(() => {
    const precio = Number(precioTotal) || 0;
    const productosCombo = [principal, ...(upsells || [])]
      .filter(Boolean)
      .map(p => ({
        id: p.id,
        nombre: p.nombre,
        cantidad: 1,
        precio: Number(p.precio_base) || 0,
        imagen: p.imagen || (Array.isArray(p.imagenes) ? p.imagenes[0] : null) || null,
        beneficios: Array.isArray(p.beneficios) ? p.beneficios : [],
      }));
    const totalIndividual = productosCombo.reduce((sum, p) => sum + (p.precio || 0), 0);

    const imgsCargadas = (imagenes || []).map(img => (typeof img === 'string' ? img : (img?.url || img?.path))).filter(Boolean);
    const imagenesFinal = imgsCargadas.length > 0 ? imgsCargadas : productosCombo.map(p => p.imagen).filter(Boolean);

    return {
      nombre: combo?.nombre || 'Combo sin nombre',
      categoria: null,
      descripcion: combo?.descripcion || '',
      precio,
      precio_antes: totalIndividual > precio ? totalIndividual : null,
      imagenes: imagenesFinal,
      faq: Array.isArray(faq) ? faq.filter(f => f?.pregunta?.trim()) : [],
      faq_titulo: faqTitulo || '',
      productos_combo: productosCombo,
      propuesta_valor: combo?.propuesta_valor || '',
      beneficios: Array.isArray(combo?.beneficios) ? combo.beneficios : [],
      confianza: Array.isArray(combo?.confianza) ? combo.confianza : [],
      ficha_datos: combo?.ficha_datos || {},
    };
  }, [combo, principal, upsells, precioTotal, imagenes, faq, faqTitulo]);

  const ficha = useMemo(
    () => resolverFichaCombo(null, null, fichaComboDesdeProducto(dto)),
    [dto]
  );

  const item = useMemo(() => armarItemFicha({
    nombre: dto.nombre,
    categoria: dto.categoria,
    descripcion: dto.descripcion,
    precio: dto.precio,
    precioAntes: dto.precio_antes,
    imagenes: dto.imagenes,
    faq: dto.faq,
    faqTitulo: dto.faq_titulo,
    productosIncluidos: dto.productos_combo,
  }), [dto]);

  return (
    <section className="product-preview-panel" aria-label="Vista pública del combo">
      <div className="product-preview-toolbar">
        <div>
          <span className="product-preview-kicker">Vista del combo</span>
          <h3>Cómo se ve la ficha del combo</h3>
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
          <ComboProductPage
            item={item}
            ficha={ficha}
            tema={DEFAULT_TEMA}
            templateSlug="basico"
            nombreComercio="Tu tienda"
            contacto={null}
            isMobile={device === 'mobile'}
            previewMode
            onComprar={() => {}}
            onVolver={null}
          />
        </div>
      </div>
    </section>
  );
}
