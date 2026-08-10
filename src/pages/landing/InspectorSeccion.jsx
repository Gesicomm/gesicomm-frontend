import React from 'react';
import { Settings, Copy, EyeOff, Eye, Trash2 } from 'lucide-react';
import { BLOQUES_SCHEMA } from './BloquesSchema';

// Inspectores Contextuales
import SchemaInspector from './inspectors/SchemaInspector';
import ProductosInspector from './inspectors/ProductosInspector';
import TestimoniosInspector from './inspectors/TestimoniosInspector';
import FaqInspector from './inspectors/FaqInspector';
import ComoFuncionaInspector from './inspectors/ComoFuncionaInspector';
import BeneficiosInspector from './inspectors/BeneficiosInspector';

const sectionEditors = {
  productos: ProductosInspector,
  testimonios: TestimoniosInspector,
  faq: FaqInspector,
  como_funciona: ComoFuncionaInspector,
  beneficios: BeneficiosInspector,
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
  if (!seccion) return null;

  const schema = BLOQUES_SCHEMA[seccion.tipo];
  if (!schema) {
    return (
      <div className="p-4 text-center text-sm text-[var(--vit-muted)]">
        Este bloque no tiene configuración.
      </div>
    );
  }

  const Icono = schema.icon || Settings;
  
  // Seleccionar el editor adecuado según el tipo de sección
  const EditorComponent = sectionEditors[seccion.tipo] || SchemaInspector;

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
          ✕
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
        <div className="mb-8">
           <EditorComponent
             seccion={seccion}
             schema={schema}
             onUpdate={onUpdate}
             catalogo={catalogo}
             onUploadImagen={onUploadImagen}
           />
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
