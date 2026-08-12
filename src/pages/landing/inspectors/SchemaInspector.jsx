import React, { useState } from 'react';
import { Loader, ImagePlus, Trash2 } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';

/**
 * Campo de imagen con subida real de archivo (mismo backend que banner/
 * testimonios, ver LandingEditor.jsx handleUploadSeccionImagen). Queda
 * disponible pegar una URL a mano como opción secundaria, por si alguien
 * quiere usar una imagen ya alojada en otro lado.
 */
function CampoImagen({ valor, onChange, onUpload }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUpload) return;
    setSubiendo(true);
    setError(null);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (err) {
      setError(err.message || 'Error al subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {valor && (
        <div className="relative group">
          <img src={getMediaUrl(valor)} alt="Preview" className="w-full h-32 object-cover rounded-md border border-[var(--vit-border)]" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
            title="Quitar imagen"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      {onUpload && (
        <label className="lb-btn-secondary flex items-center justify-center gap-2 cursor-pointer">
          {subiendo ? <Loader size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {subiendo ? 'Subiendo...' : (valor ? 'Cambiar imagen' : 'Subir imagen')}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={subiendo} onChange={handleFile} />
        </label>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        type="text"
        className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)] focus:border-[var(--vit-accent)] focus:outline-none"
        value={valor || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="...o pegá la URL de una imagen"
      />
    </div>
  );
}

export function renderInput(campo, valor, onChange, onUpload) {
  if (campo.type === 'textarea') {
    return (
      <textarea
        className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)] focus:border-[var(--vit-accent)] focus:outline-none"
        value={valor || ''}
        onChange={e => onChange(campo.key, e.target.value)}
        rows={4}
      />
    );
  }
  if (campo.type === 'color') {
    return (
      <div className="flex gap-2 items-center">
        <input
          type="color"
          className="h-8 w-12 rounded cursor-pointer"
          value={valor || '#ffffff'}
          onChange={e => onChange(campo.key, e.target.value)}
        />
        <input
          type="text"
          className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)] focus:border-[var(--vit-accent)] focus:outline-none"
          value={valor || ''}
          onChange={e => onChange(campo.key, e.target.value)}
          placeholder="#Hexadecimal"
        />
      </div>
    );
  }
  if (campo.type === 'image') {
    return (
      <CampoImagen
        valor={valor}
        onChange={val => onChange(campo.key, val)}
        onUpload={onUpload}
      />
    );
  }
  
  if (campo.type === 'select') {
    return (
      <select
        className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)] focus:border-[var(--vit-accent)] focus:outline-none"
        value={valor || campo.options[0].value}
        onChange={e => onChange(campo.key, e.target.value)}
      >
        {campo.options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (campo.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="rounded border-[var(--vit-border)] text-[var(--vit-primary)] focus:ring-[var(--vit-primary)] h-4 w-4"
          checked={!!valor}
          onChange={e => onChange(campo.key, e.target.checked)}
        />
        <span className="text-sm text-[var(--vit-text)]">{campo.label}</span>
      </label>
    );
  }
  
  // Default: text
  return (
    <input
      type="text"
      className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm text-[var(--vit-text)] focus:border-[var(--vit-accent)] focus:outline-none"
      value={valor || ''}
      onChange={e => onChange(campo.key, e.target.value)}
    />
  );
}

export default function SchemaInspector({ seccion, schema, onUpdate, onUploadImagen }) {
  const handleChange = (key, value) => {
    // SchemaInspector ahora maneja exclusivamente `contenido`.
    // Las opciones de `config` (como colorScheme) se manejan en la pestaa Diseo en InspectorSeccion.jsx
    onUpdate(seccion.id, { contenido: { ...seccion.contenido, [key]: value } });
  };

  if (!schema.contentSchema || schema.contentSchema.length === 0) {
    return <p className="text-sm text-[var(--vit-muted-2)]">Este bloque no tiene opciones de contenido configurables.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {schema.contentSchema.map(campo => {
        const valorActual = seccion.contenido?.[campo.key];
        
        return (
          <label key={campo.key} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--vit-text)]">{campo.label}</span>
            {renderInput(campo, valorActual, handleChange, onUploadImagen)}
          </label>
        );
      })}
    </div>
  );
}
