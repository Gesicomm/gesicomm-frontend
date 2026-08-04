import React, { useMemo, useState } from 'react';
import { Search, MessageCircle, Layers, ImageOff, Monitor, Smartphone, ExternalLink } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { calcularEstiloLanding } from '../../lib/landingDiseno';

/**
 * Vista previa en vivo de la landing pública, dentro del constructor.
 *
 * Es un espejo visual de LandingPublica.jsx, no el componente real: la
 * página pública se alimenta del endpoint público (precios recalculados
 * contra el piso vigente, items ya filtrados por activo/en_venta) y acá
 * todavía no existe ni la landing guardada. Duplicar el markup es
 * deliberado — permite previsualizar una landing que aún no se guardó.
 * Los controles de filtro se dibujan inertes: muestran qué va a ver el
 * visitante, no filtran la previsualización.
 */

function formatPrecio(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }) + ' Gs';
}

export default function LandingPreview({ titulo, descripcion, filtros, items, tema, diseno, contacto, banner, urlPublica }) {
  const [dispositivo, setDispositivo] = useState('desktop');

  const categorias = useMemo(() => [...new Set(items.map(i => i.categoria).filter(Boolean))], [items]);
  const marcas = useMemo(() => [...new Set(items.map(i => i.marca).filter(Boolean))], [items]);
  const etiquetas = useMemo(() => {
    const mapa = new Map();
    items.forEach(i => {
      if (i.etiqueta) {
        const clave = i.etiqueta.toLowerCase();
        if (!mapa.has(clave)) mapa.set(clave, i.etiqueta);
      }
    });
    return Array.from(mapa.values());
  }, [items]);

  const hayFiltros = filtros.categoria || filtros.marca || filtros.etiqueta || filtros.buscador || filtros.orden_precio;

  return (
    <div className="lb-preview">
      <div className="lb-preview-bar">
        <span className="lb-preview-label">Vista previa</span>
        <div className="lb-preview-actions">
          {urlPublica && (
            <a
              href={urlPublica}
              target="_blank"
              rel="noreferrer"
              className="lb-preview-ext-btn"
              title="Abrir web real en pestaña nueva"
            >
              <ExternalLink size={12} />
              <span>Ver web</span>
            </a>
          )}
          <div className="lb-device-toggle">
            <button
              type="button"
              className={dispositivo === 'desktop' ? 'active' : ''}
              onClick={() => setDispositivo('desktop')}
              title="Escritorio"
            >
              <Monitor size={13} />
            </button>
            <button
              type="button"
              className={dispositivo === 'mobile' ? 'active' : ''}
              onClick={() => setDispositivo('mobile')}
              title="Celular"
            >
              <Smartphone size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className={`lb-preview-viewport ${dispositivo}`}>
        <div
          className={`lpv-page ${tema?.modo === 'claro' ? 'claro' : ''}`}
          style={calcularEstiloLanding({ tema, diseno })}
        >
          {banner && (
            <div
              className={`lpv-banner ${banner.imagen ? 'con-imagen' : ''}`}
              style={banner.imagen ? { backgroundImage: `url(${getMediaUrl(banner.imagen)})` } : undefined}
            >
              <div className="lpv-banner-overlay">
                {banner.titulo && <h2>{banner.titulo}</h2>}
                {banner.subtitulo && <p>{banner.subtitulo}</p>}
                {/* Inerte a propósito: en el constructor un botón real
                    navegaría fuera de la pantalla de edición. */}
                {banner.boton_texto && <span className="lpv-banner-btn">{banner.boton_texto}</span>}
              </div>
            </div>
          )}

          <header className="lpv-header">
            <h1>{titulo || 'Título de tu tienda'}</h1>
            {descripcion && <p>{descripcion}</p>}
          </header>

          {hayFiltros && (
            <div className="lpv-filters">
              {filtros.buscador && (
                <span className="lpv-search"><Search size={12} /> Buscar...</span>
              )}
              {filtros.categoria && categorias.length > 0 && (
                <span className="lpv-select">Todas las categorías</span>
              )}
              {filtros.marca && marcas.length > 0 && (
                <span className="lpv-select">Todas las marcas</span>
              )}
              {filtros.etiqueta && etiquetas.length > 0 && (
                <span className="lpv-select">Todas las etiquetas</span>
              )}
              {filtros.orden_precio && (
                <span className="lpv-select">Orden por defecto</span>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <div className="lpv-empty">
              Elegí productos en el paso <strong>Productos</strong> y van a aparecer acá.
            </div>
          ) : (
            <div className="lpv-grid">
              {items.map(item => (
                <div key={`${item.tipo}-${item.id}`} className="lpv-card">
                  <div className="lpv-card-media">
                    {item.imagen ? (
                      <img src={getMediaUrl(item.imagen)} alt={item.nombre} loading="lazy" />
                    ) : (
                      <div className="lpv-card-media-placeholder">
                        {item.tipo === 'combo' ? <Layers size={22} /> : <ImageOff size={22} />}
                      </div>
                    )}
                    {item.tipo === 'combo' && (
                      <span className="lpv-card-badge"><Layers size={10} /> Combo</span>
                    )}
                  </div>
                  <div className="lpv-card-body">
                    {item.etiqueta && <span className="lpv-card-tag">{item.etiqueta}</span>}
                    <h3>{item.nombre}</h3>
                    {item.descripcion && <p className="lpv-card-desc">{item.descripcion}</p>}
                    <span className="lpv-card-price">{formatPrecio(item.precio_efectivo)}</span>
                    {contacto?.whatsapp && (
                      <span className="lpv-card-contact"><MessageCircle size={13} /> Consultar</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!contacto?.whatsapp && (
        <p className="lb-preview-hint">
          Sin WhatsApp configurado no se muestra el botón de contacto. Se configura en Mi tienda.
        </p>
      )}
    </div>
  );
}
