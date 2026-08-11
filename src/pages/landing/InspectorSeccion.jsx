import React, { useState } from 'react';
import { Settings, Copy, EyeOff, Eye, Trash2 } from 'lucide-react';
import { BLOQUES_SCHEMA } from './BloquesSchema';

// Inspectores Contextuales
import SchemaInspector from './inspectors/SchemaInspector';
import ProductosInspector from './inspectors/ProductosInspector';
import TestimoniosInspector from './inspectors/TestimoniosInspector';
import FaqInspector from './inspectors/FaqInspector';
import ComoFuncionaInspector from './inspectors/ComoFuncionaInspector';
import BeneficiosInspector from './inspectors/BeneficiosInspector';
import AnnouncementInspector from './inspectors/AnnouncementInspector';
import BeforeAfterInspector from './inspectors/BeforeAfterInspector';

import TemplateThumbnails from './TemplateThumbnails';

const sectionEditors = {
  productos: ProductosInspector,
  testimonios: TestimoniosInspector,
  faq: FaqInspector,
  como_funciona: ComoFuncionaInspector,
  beneficios: BeneficiosInspector,
  announcement_bar: AnnouncementInspector,
  before_after: BeforeAfterInspector,
};

export default function InspectorSeccion({
  seccion,
  onUpdate,
  onBack,
  catalogo,
  onDuplicate,
  onDelete,
  onUploadImagen,
}) {
  const [activeTab, setActiveTab] = useState('contenido'); // 'contenido' | 'diseno'

  if (!seccion) return null;

  const schema = BLOQUES_SCHEMA[seccion.tipo];
  if (!schema) {
    return (
      <div className="p-4 text-center text-sm text-[var(--vit-muted)]">
        Este bloque no tiene configuracin.
      </div>
    );
  }

  const Icono = schema.icon || Settings;
  
  // Seleccionar el editor adecuado segn el tipo de seccin
  const EditorComponent = sectionEditors[seccion.tipo] || SchemaInspector;

  const hasTemplates = schema.templates && schema.templates.length > 0;

  return (
    <div className="flex h-full flex-col bg-[var(--vit-card-bg)]">
      <div className="flex items-center gap-3 border-b border-[var(--vit-border)] p-4 shrink-0">
        <Icono size={16} className="text-[var(--vit-muted)]" />
        <h3 className="font-semibold text-[var(--vit-text)]">{schema.name}</h3>
        <button
          onClick={onBack}
          className="rounded-md p-1.5 ml-auto text-[var(--vit-muted)] hover:bg-[var(--vit-surface)] hover:text-[var(--vit-text)] transition"
          title="Cerrar y volver a ajustes globales"
        >
          &times; 
        </button>
      </div>
      
      <div className="flex border-b border-[var(--vit-border)] shrink-0">
        <button
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'contenido' ? 'border-[var(--vit-primary)] text-[var(--vit-primary)]' : 'border-transparent text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`}
          onClick={() => setActiveTab('contenido')}
        >
          Contenido
        </button>
        <button
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'diseno' ? 'border-[var(--vit-primary)] text-[var(--vit-primary)]' : 'border-transparent text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`}
          onClick={() => setActiveTab('diseno')}
        >
          Diseo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
        <div className="mb-8">
           {activeTab === 'contenido' && (
             <EditorComponent
               seccion={seccion}
               schema={schema}
               onUpdate={onUpdate}
               catalogo={catalogo}
               onUploadImagen={onUploadImagen}
             />
           )}

           {activeTab === 'diseno' && (
             <div className="flex flex-col gap-6">
                {hasTemplates && (
                  <div>
                    <label className="mb-3 block text-sm font-semibold text-[var(--vit-text)]">Diseo (Template)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {schema.templates.map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => onUpdate(seccion.id, { template: tpl.id })}
                          className={`group flex flex-col gap-1 rounded-lg border p-1 transition-all hover:border-[var(--vit-accent)] ${seccion.template === tpl.id ? 'border-[var(--vit-accent)] bg-[var(--vit-surface)] ring-1 ring-[var(--vit-accent)]' : 'border-[var(--vit-border)] bg-transparent'}`}
                        >
                          <div className="flex aspect-video w-full items-center justify-center rounded border border-[var(--vit-border)] bg-[var(--vit-bg)] overflow-hidden">
                            <TemplateThumbnails type={seccion.tipo} templateId={tpl.id} />
                          </div>
                          <span className={`text-center text-[10px] font-semibold leading-tight ${seccion.template === tpl.id ? 'text-[var(--vit-accent)]' : 'text-[var(--vit-muted)] group-hover:text-[var(--vit-text)]'}`}>
                            {tpl.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--vit-text)]">Color Scheme</label>
                  <select 
                    className="w-full rounded border border-[var(--vit-border)] bg-[var(--vit-bg)] px-3 py-2 text-sm text-[var(--vit-text)] outline-none focus:border-[var(--vit-primary)]"
                    value={seccion.config?.colorScheme || 'default'}
                    onChange={(e) => onUpdate(seccion.id, { config: { ...seccion.config, colorScheme: e.target.value } })}
                  >
                    <option value="default">Por defecto (Fondo de la pgina)</option>
                    <option value="light">Claro (Tarjeta)</option>
                    <option value="dark">Oscuro / Contraste</option>
                    <option value="primary">Acento Primario</option>
                  </select>
                </div>
             </div>
           )}
        </div>
        
        {/* Acciones del Bloque */}
        <div className="border-t border-[var(--vit-border)] pt-4 mt-auto">
          <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Acciones</h4>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => onDuplicate(seccion.id)}
              className="flex-1 lb-btn-ghost text-xs flex items-center justify-center gap-1"
            >
              <Copy size={12} /> Duplicar
            </button>
            <button 
              type="button" 
              onClick={() => onUpdate(seccion.id, { activo: !seccion.activo })}
              className="flex-1 lb-btn-ghost text-xs flex items-center justify-center gap-1"
            >
              {seccion.activo ? <EyeOff size={12} /> : <Eye size={12} />}
              {seccion.activo ? 'Ocultar' : 'Mostrar'}
            </button>
            <button 
              type="button" 
              onClick={() => onDelete(seccion.id)}
              className="flex-1 text-red-500 bg-red-50 hover:bg-red-100 rounded text-xs flex items-center justify-center gap-1 py-1"
            >
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
