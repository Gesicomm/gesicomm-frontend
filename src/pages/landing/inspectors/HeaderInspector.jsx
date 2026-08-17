import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, ImagePlus, Loader } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import { ANCLAS_SECCION, atajosDePaginas } from '../linkShortcuts';

export default function HeaderInspector({ seccion, onUpdate, onUploadImagen, catalogo, paginas }) {
  const contenido = seccion.contenido || {};
  const config = seccion.config || {};
  const navLinks = config.nav_links || [];
  const redes = config.redes_sociales || {};
  
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const updateContenido = (updates) => {
    onUpdate(seccion.id, { contenido: { ...contenido, ...updates } });
  };

  const updateConfig = (updates) => {
    onUpdate(seccion.id, { config: { ...config, ...updates } });
  };

  const addLink = () => {
    const nuevos = [...navLinks, { label: 'Nuevo link', type: 'url', href: '', target_id: '' }];
    updateConfig({ nav_links: nuevos });
  };

  const removeLink = (index) => {
    const nuevos = navLinks.filter((_, i) => i !== index);
    updateConfig({ nav_links: nuevos });
  };

  const updateLink = (index, key, value) => {
    const nuevos = [...navLinks];
    nuevos[index] = { ...nuevos[index], [key]: value };
    
    // Auto-completar label si elige producto/categoria/pagina
    if (key === 'target_id' && nuevos[index].type !== 'url') {
      const item = catalogo.productos?.find(p => String(p.id) === String(value));
      const cat = catalogo.categorias?.find(c => String(c.id) === String(value));
      // Por tipo_pagina (rol estable), no por id: el DTO público de
      // paginas_hermanas no expone el id numérico de la landing, solo
      // tipo_pagina/slug/titulo — ver landing.service.js#obtenerPublica.
      const pagina = paginas?.find(p => p.tipo_pagina === value);
      if (item) nuevos[index].label = item.nombre;
      if (cat) nuevos[index].label = cat.nombre;
      if (pagina) nuevos[index].label = pagina.titulo || pagina.nombre;
    }
    
    updateConfig({ nav_links: nuevos });
  };

  const moveLink = (index, delta) => {
    if (index + delta < 0 || index + delta >= navLinks.length) return;
    const nuevos = [...navLinks];
    const temp = nuevos[index];
    nuevos[index] = nuevos[index + delta];
    nuevos[index + delta] = temp;
    updateConfig({ nav_links: nuevos });
  };

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadImagen) return;
    setSubiendoLogo(true);
    try {
      const url = await onUploadImagen(file);
      updateConfig({ logo_imagen: url });
    } catch (err) {
      alert(err.message || 'Error al subir la imagen.');
    } finally {
      setSubiendoLogo(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Logo e Identidad */}
      <div className="flex flex-col gap-3">
        <h4 className="font-semibold text-[var(--vit-text)] text-sm border-b border-[var(--vit-border)] pb-2">Identidad</h4>
        
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--vit-text)]">Texto del logo</span>
          <input
            type="text"
            className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)]"
            value={contenido.logo_texto || ''}
            onChange={e => updateContenido({ logo_texto: e.target.value })}
            placeholder="Ej: Mi Tienda"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--vit-text)]">Imagen del logo (reemplaza al texto)</span>
          {config.logo_imagen ? (
            <div className="relative group bg-white border border-[var(--vit-border)] rounded-md p-2 flex justify-center">
              <img src={getMediaUrl(config.logo_imagen)} alt="Logo" className="h-12 object-contain" />
              <button
                type="button"
                onClick={() => updateConfig({ logo_imagen: null })}
                className="absolute top-1 right-1 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <label className="lb-btn-secondary flex items-center justify-center gap-2 cursor-pointer w-full mt-1">
              {subiendoLogo ? <Loader size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {subiendoLogo ? 'Subiendo...' : 'Subir logo'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" hidden disabled={subiendoLogo} onChange={handleLogoUpload} />
            </label>
          )}
        </div>
      </div>

      {/* Enlaces de Navegación */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[var(--vit-border)] pb-2">
          <h4 className="font-semibold text-[var(--vit-text)] text-sm">Menú de Navegación</h4>
          <button type="button" onClick={addLink} className="text-xs text-[var(--vit-primary)] font-semibold flex items-center gap-1 hover:underline">
            <Plus size={12} /> Agregar link
          </button>
        </div>

        {navLinks.length === 0 && (
          <p className="text-xs text-[var(--vit-muted-2)] italic">
            El menú está vacío. Se generará uno automático basado en las secciones activas.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {navLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2 bg-[var(--vit-surface)] border border-[var(--vit-border)] p-3 rounded-md relative group">
              <div className="flex flex-col justify-center gap-1 opacity-50">
                <button type="button" onClick={() => moveLink(idx, -1)} disabled={idx === 0} className="hover:text-[var(--vit-primary)] disabled:opacity-30">▲</button>
                <button type="button" onClick={() => moveLink(idx, 1)} disabled={idx === navLinks.length - 1} className="hover:text-[var(--vit-primary)] disabled:opacity-30">▼</button>
              </div>
              
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-[var(--vit-border)] bg-transparent p-1.5 text-xs text-[var(--vit-text)]"
                    placeholder="Etiqueta"
                    value={link.label}
                    onChange={e => updateLink(idx, 'label', e.target.value)}
                  />
                  <select
                    className="w-28 rounded-md border border-[var(--vit-border)] bg-transparent p-1.5 text-xs text-[var(--vit-text)]"
                    value={link.type}
                    onChange={e => updateLink(idx, 'type', e.target.value)}
                  >
                    <option value="url">URL Libre / Ancla</option>
                    <option value="producto">Producto</option>
                    <option value="categoria">Categoría</option>
                    <option value="pagina">Página</option>
                  </select>
                </div>

                {link.type === 'url' && (
                  <>
                    {(() => {
                      const grupos = [
                        { grupo: 'Secciones de esta página', opciones: ANCLAS_SECCION },
                        { grupo: 'Otras páginas de la tienda', opciones: atajosDePaginas(paginas) },
                      ].filter(g => g.opciones.length > 0);
                      if (grupos.length === 0) return null;
                      return (
                        <select
                          className="w-full rounded-md border border-[var(--vit-border)] bg-transparent p-1.5 text-xs text-[var(--vit-text)]"
                          value=""
                          onChange={e => { if (e.target.value) updateLink(idx, 'href', e.target.value); }}
                        >
                          <option value="">Ir a... (o escribí una URL abajo)</option>
                          {grupos.map(g => (
                            <optgroup key={g.grupo} label={g.grupo}>
                              {g.opciones.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      );
                    })()}
                    <input
                      type="text"
                      className="w-full rounded-md border border-[var(--vit-border)] bg-transparent p-1.5 text-xs text-[var(--vit-text)]"
                      placeholder="https://... o #lp-seccion"
                      value={link.href}
                      onChange={e => updateLink(idx, 'href', e.target.value)}
                    />
                  </>
                )}
                
                {link.type === 'producto' && (
                  <select
                    className="w-full rounded-md border border-[var(--vit-border)] bg-transparent p-1.5 text-xs text-[var(--vit-text)]"
                    value={link.target_id || ''}
                    onChange={e => updateLink(idx, 'target_id', e.target.value)}
                  >
                    <option value="">Selecciona un producto...</option>
                    {catalogo.productos?.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                )}

                {link.type === 'categoria' && (
                  <select
                    className="w-full rounded-md border border-[var(--vit-border)] bg-transparent p-1.5 text-xs text-[var(--vit-text)]"
                    value={link.target_id || ''}
                    onChange={e => updateLink(idx, 'target_id', e.target.value)}
                  >
                    <option value="">Selecciona una categoría...</option>
                    {catalogo.categorias?.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                )}

                {link.type === 'pagina' && (
                  <select
                    className="w-full rounded-md border border-[var(--vit-border)] bg-transparent p-1.5 text-xs text-[var(--vit-text)]"
                    value={link.target_id || ''}
                    onChange={e => updateLink(idx, 'target_id', e.target.value)}
                  >
                    <option value="">Selecciona una página...</option>
                    {paginas?.map(p => (
                      <option key={p.tipo_pagina} value={p.tipo_pagina}>{p.titulo || p.nombre}</option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeLink(idx)}
                className="text-red-500 hover:text-red-600 p-1 self-start opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Redes Sociales */}
      <div className="flex flex-col gap-3">
        <h4 className="font-semibold text-[var(--vit-text)] text-sm border-b border-[var(--vit-border)] pb-2">Redes Sociales</h4>
        
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--vit-text)]">Instagram URL</span>
          <input
            type="text"
            className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)]"
            value={redes.instagram || ''}
            onChange={e => updateConfig({ redes_sociales: { ...redes, instagram: e.target.value } })}
            placeholder="https://instagram.com/tu_cuenta"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--vit-text)]">Facebook URL</span>
          <input
            type="text"
            className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)]"
            value={redes.facebook || ''}
            onChange={e => updateConfig({ redes_sociales: { ...redes, facebook: e.target.value } })}
            placeholder="https://facebook.com/tu_pagina"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--vit-text)]">TikTok URL</span>
          <input
            type="text"
            className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)]"
            value={redes.tiktok || ''}
            onChange={e => updateConfig({ redes_sociales: { ...redes, tiktok: e.target.value } })}
            placeholder="https://tiktok.com/@tu_cuenta"
          />
        </label>
      </div>

    </div>
  );
}
