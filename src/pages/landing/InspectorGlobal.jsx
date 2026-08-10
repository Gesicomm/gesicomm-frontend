import React from 'react';
import { Settings, Palette, Type, Search, Store, Globe, ToggleLeft } from 'lucide-react';

export default function InspectorGlobal({ form, onChange, onBack }) {
  return (
    <div className="flex h-full flex-col bg-[var(--vit-card-bg)]">
      <div className="flex items-center gap-3 border-b border-[var(--vit-border)] p-4 shrink-0">
        <Settings size={16} className="text-[var(--vit-text)]" />
        <h3 className="font-semibold text-[var(--vit-text)]">Ajustes Globales</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* CONFIGURACIÓN DE LANDING */}
        <details className="group border-b border-[var(--vit-border)]" open>
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold text-[var(--vit-text)] hover:bg-[var(--vit-surface)]">
            <span className="flex items-center gap-2"><ToggleLeft size={16} className="text-[var(--vit-muted)]" /> Información</span>
            <span className="transition group-open:rotate-180">▾</span>
          </summary>
          <div className="flex flex-col gap-4 p-4 pt-0">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Nombre interno</span>
              <input
                type="text"
                className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)] focus:border-[var(--vit-accent)] focus:outline-none"
                value={form.nombre || ''}
                onChange={e => onChange('nombre', e.target.value)}
                placeholder="Ej: Ofertas de verano"
              />
              <span className="text-xs text-[var(--vit-muted)]">Solo lo ves vos.</span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Título público</span>
              <input
                type="text"
                className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)] focus:border-[var(--vit-accent)] focus:outline-none"
                value={form.titulo || ''}
                onChange={e => onChange('titulo', e.target.value)}
              />
            </label>
            
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Descripción pública</span>
              <textarea
                rows={2}
                className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)] focus:border-[var(--vit-accent)] focus:outline-none"
                value={form.descripcion || ''}
                onChange={e => onChange('descripcion', e.target.value)}
              />
            </label>
          </div>
        </details>

        {/* DISEÑO */}
        <details className="group border-b border-[var(--vit-border)]">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold text-[var(--vit-text)] hover:bg-[var(--vit-surface)]">
            <span className="flex items-center gap-2"><Palette size={16} className="text-[var(--vit-muted)]" /> Diseño y Colores</span>
            <span className="transition group-open:rotate-180">▾</span>
          </summary>
          <div className="flex flex-col gap-4 p-4 pt-0">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Modo</span>
              <select
                className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                value={form.tema_modo || 'oscuro'}
                onChange={e => onChange('tema_modo', e.target.value)}
              >
                <option value="oscuro">Oscuro</option>
                <option value="claro">Claro</option>
              </select>
            </label>
            
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Color de Fondo</span>
              <div className="flex gap-2 items-center">
                <input type="color" className="h-8 w-12 rounded cursor-pointer" value={form.color_fondo || '#0a0a0a'} onChange={e => onChange('color_fondo', e.target.value)} />
                <input type="text" className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm uppercase" value={form.color_fondo || '#0a0a0a'} onChange={e => onChange('color_fondo', e.target.value)} />
              </div>
            </label>
            
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--vit-text)]">Color Primario (Botones)</span>
              <div className="flex gap-2 items-center">
                <input type="color" className="h-8 w-12 rounded cursor-pointer" value={form.color_primario || '#3b82f6'} onChange={e => onChange('color_primario', e.target.value)} />
                <input type="text" className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm uppercase" value={form.color_primario || '#3b82f6'} onChange={e => onChange('color_primario', e.target.value)} />
              </div>
            </label>
            
             <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--vit-text)]">Fuente principal</span>
                <select 
                  className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                  value={form.fuente || 'outfit'}
                  onChange={e => onChange('fuente', e.target.value)}
                >
                  <option value="outfit">Outfit (Por defecto)</option>
                  <option value="inter">Inter (Clásica)</option>
                  <option value="roboto">Roboto</option>
                  <option value="poppins">Poppins (Moderna)</option>
                </select>
            </label>
            
            <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--vit-text)]">Esquinas (Botones/Tarjetas)</span>
                <select 
                  className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                  value={form.radio_bordes || 'mediano'}
                  onChange={e => onChange('radio_bordes', e.target.value)}
                >
                  <option value="chico">Ligeramente redondeadas</option>
                  <option value="mediano">Redondeadas</option>
                  <option value="grande">Totalmente redondas</option>
                </select>
            </label>
          </div>
        </details>

        {/* TIENDA */}
        <details className="group border-b border-[var(--vit-border)]">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold text-[var(--vit-text)] hover:bg-[var(--vit-surface)]">
            <span className="flex items-center gap-2"><Store size={16} className="text-[var(--vit-muted)]" /> Tienda y Filtros</span>
            <span className="transition group-open:rotate-180">▾</span>
          </summary>
          <div className="flex flex-col gap-4 p-4 pt-0">
             <label className="flex items-center justify-between text-sm">
                <span>Filtro por categoría</span>
                <input type="checkbox" className="toggle" checked={form.mostrar_filtro_categoria ?? true} onChange={e => onChange('mostrar_filtro_categoria', e.target.checked)} />
             </label>
             <label className="flex items-center justify-between text-sm">
                <span>Filtro por marca</span>
                <input type="checkbox" className="toggle" checked={form.mostrar_filtro_marca ?? true} onChange={e => onChange('mostrar_filtro_marca', e.target.checked)} />
             </label>
             <label className="flex items-center justify-between text-sm">
                <span>Filtro por etiqueta</span>
                <input type="checkbox" className="toggle" checked={form.mostrar_filtro_etiqueta ?? true} onChange={e => onChange('mostrar_filtro_etiqueta', e.target.checked)} />
             </label>
             <label className="flex items-center justify-between text-sm">
                <span>Barra de búsqueda</span>
                <input type="checkbox" className="toggle" checked={form.mostrar_buscador ?? true} onChange={e => onChange('mostrar_buscador', e.target.checked)} />
             </label>
             <label className="flex items-center justify-between text-sm">
                <span>Ordenar por precio</span>
                <input type="checkbox" className="toggle" checked={form.mostrar_orden_precio ?? true} onChange={e => onChange('mostrar_orden_precio', e.target.checked)} />
             </label>
             <label className="flex items-center justify-between text-sm mt-2 border-t border-[var(--vit-border)] pt-4">
                <span>Botón flotante de WhatsApp</span>
                <input type="checkbox" className="toggle" checked={form.mostrar_whatsapp ?? true} onChange={e => onChange('mostrar_whatsapp', e.target.checked)} />
             </label>
          </div>
        </details>

        {/* SEO */}
        <details className="group border-b border-[var(--vit-border)]">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold text-[var(--vit-text)] hover:bg-[var(--vit-surface)]">
            <span className="flex items-center gap-2"><Search size={16} className="text-[var(--vit-muted)]" /> SEO y Redes Sociales</span>
            <span className="transition group-open:rotate-180">▾</span>
          </summary>
          <div className="flex flex-col gap-4 p-4 pt-0">
             <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--vit-text)]">Título SEO (Buscadores)</span>
                <input 
                  type="text" 
                  className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                  value={form.seo_titulo || ''}
                  onChange={e => onChange('seo_titulo', e.target.value)}
                  placeholder="Ej: Tienda Oficial - Mejores precios"
                />
             </label>
             <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--vit-text)]">Descripción SEO</span>
                <textarea 
                  rows={3}
                  className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                  value={form.seo_descripcion || ''}
                  onChange={e => onChange('seo_descripcion', e.target.value)}
                  placeholder="Se muestra en Google y al compartir links..."
                />
             </label>
          </div>
        </details>

      </div>
    </div>
  );
}
