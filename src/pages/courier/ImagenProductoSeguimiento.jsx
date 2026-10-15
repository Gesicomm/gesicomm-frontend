import React, { useState } from 'react';
import { Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { copiarImagen } from '../../lib/imagenPortapapeles';

export function ImagenProductoSeguimiento({ imagen, envioId, servicio }) {
  const [copiando, setCopiando] = useState(false);
  const [copiada, setCopiada] = useState(false);
  const [error, setError] = useState('');
  const [falloImagen, setFalloImagen] = useState(false);
  const url = getMediaUrl(imagen.url);

  const cargarImagen = async () => {
    if (servicio.getImagenProducto) {
      return servicio.getImagenProducto(envioId, imagen.item_id);
    }
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!respuesta.ok) throw new Error('No se pudo descargar la imagen.');
    return respuesta.blob();
  };

  const copiar = async () => {
    setCopiando(true);
    setCopiada(false);
    setError('');
    try {
      await copiarImagen(cargarImagen);
      setCopiada(true);
    } catch (err) {
      let mensaje = err.response?.data;
      if (mensaje instanceof Blob) {
        try { mensaje = JSON.parse(await mensaje.text()); } catch { mensaje = null; }
      }
      setError(err.name === 'NotAllowedError'
        ? 'El navegador bloqueó la copia. Permití el acceso al portapapeles para este sitio y volvé a intentar.'
        : mensaje?.error || mensaje?.message || (err.message?.startsWith('Este navegador')
          ? err.message : 'No se pudo copiar la imagen. Abrila y usá la opción Copiar imagen del navegador.'));
    } finally {
      setCopiando(false);
    }
  };

  return (
    <div role="group" aria-label={`Imagen de ${imagen.nombre}`} style={{ marginBottom: '10px', whiteSpace: 'normal' }}>
      {!falloImagen ? (
        <img src={url} alt={imagen.nombre} loading="lazy" onError={() => setFalloImagen(true)} style={{ display: 'block', width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '6px', background: 'var(--color-surface)' }} />
      ) : <p style={{ margin: '0 0 6px' }}>No se pudo mostrar la imagen de {imagen.nombre}.</p>}
      <div style={{ fontWeight: 600, margin: '6px 0' }}>{imagen.nombre}</div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" aria-label={`Copiar imagen de ${imagen.nombre}`} disabled={copiando} onClick={copiar} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 9px', fontSize: '0.75rem' }}>
          {copiando ? <Loader2 size={13} className="animate-spin" /> : copiada ? <Check size={13} /> : <Copy size={13} />}
          {copiando ? 'Copiando…' : copiada ? 'Imagen copiada' : 'Copiar imagen'}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-primary-text)' }}><ExternalLink size={12} /> Abrir imagen</a>
      </div>
      {copiada && <p role="status" style={{ margin: '6px 0 0', fontSize: '0.75rem' }}>Imagen copiada. Abrí WhatsApp y pegala en el chat antes de enviar.</p>}
      {error && <p role="alert" style={{ margin: '6px 0 0', fontSize: '0.75rem' }}>{error}</p>}
    </div>
  );
}
