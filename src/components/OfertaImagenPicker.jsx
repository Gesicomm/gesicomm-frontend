import React, { useEffect, useRef, useState } from 'react';
import { ImageOff, Loader, Trash2, Upload } from 'lucide-react';
import { getMediaUrl } from '../services/api';
import { ofertaService } from '../services/ofertaService';

/**
 * Imagen propia de una oferta comercial — UNA sola.
 *
 * Se usa en los dos lugares donde se administran ofertas, a propósito el
 * mismo componente: la pestaña "Ofertas comerciales" de la carga de
 * productos y el panel "Ofertas" del armador de landing. La foto se guarda
 * en Oferta.imagen_url, así que cargarla en cualquiera de los dos la deja
 * cargada en el otro y en la landing publicada.
 *
 * Dos modos según haya id o no:
 *   - Oferta ya creada (`ofertaId`): sube al toque y devuelve la URL. El
 *     backend reemplaza y borra el archivo anterior.
 *   - Oferta en creación (`ofertaId` null): no hay a qué subirla todavía,
 *     así que se guarda el File y se previsualiza local; el formulario la
 *     sube después de crear la oferta (ver `subirImagenPendiente`).
 *
 * @param {string|null} respaldoUrl imagen del producto ancla: es lo que la
 *   ficha muestra si la oferta no tiene la suya. Se previsualiza en gris
 *   para que se vea qué se está heredando en vez de un cuadro vacío.
 */
export default function OfertaImagenPicker({
  ofertaId = null,
  imagenUrl = null,
  archivo = null,
  respaldoUrl = null,
  onChange,
  compacto = false,
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [previewLocal, setPreviewLocal] = useState(null);
  const inputRef = useRef(null);
  const lado = compacto ? 54 : 72;

  // Los object URL hay que revocarlos: si no, cada archivo elegido queda
  // retenido en memoria hasta recargar la página.
  useEffect(() => {
    if (!archivo) { setPreviewLocal(null); return undefined; }
    const url = URL.createObjectURL(archivo);
    setPreviewLocal(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  async function elegir(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');

    if (!ofertaId) {
      onChange({ imagen_url: null, archivo: file });
      return;
    }

    setSubiendo(true);
    try {
      const { imagen_url } = await ofertaService.subirImagen(ofertaId, file);
      onChange({ imagen_url, archivo: null });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  }

  async function quitar() {
    setError('');
    if (archivo) return onChange({ imagen_url: null, archivo: null });
    if (!ofertaId) return onChange({ imagen_url: null, archivo: null });
    setSubiendo(true);
    try {
      await ofertaService.quitarImagen(ofertaId);
      onChange({ imagen_url: null, archivo: null });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo quitar la imagen.');
    } finally {
      setSubiendo(false);
    }
  }

  const propia = previewLocal || (imagenUrl ? getMediaUrl(imagenUrl) : null);
  const heredada = !propia && respaldoUrl ? getMediaUrl(respaldoUrl) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: lado, height: lado, flexShrink: 0,
            borderRadius: 8, overflow: 'hidden',
            border: `1px solid rgba(127,127,127,${propia ? 0.35 : 0.2})`,
            background: 'rgba(127,127,127,0.10)',
            display: 'grid', placeItems: 'center',
            opacity: heredada ? 0.45 : 1,
          }}
        >
          {propia || heredada
            ? <img src={propia || heredada} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <ImageOff size={compacto ? 16 : 20} style={{ opacity: 0.45 }} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: '1px solid rgba(127,127,127,0.3)', borderRadius: 6,
                padding: compacto ? '5px 9px' : '7px 12px', background: 'rgba(127,127,127,0.12)',
                color: 'inherit', font: 'inherit', fontSize: compacto ? 11 : 12, fontWeight: 600,
                cursor: subiendo ? 'default' : 'pointer', opacity: subiendo ? 0.6 : 1,
              }}
            >
              {subiendo ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
              {propia ? 'Cambiar' : 'Subir imagen'}
            </button>

            {propia && (
              <button
                type="button"
                onClick={quitar}
                disabled={subiendo}
                title="Quitar — vuelve a usarse la del producto"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  border: '1px solid rgba(127,127,127,0.3)', borderRadius: 6,
                  padding: compacto ? '5px 8px' : '7px 10px', background: 'transparent',
                  color: 'inherit', font: 'inherit', fontSize: compacto ? 11 : 12,
                  cursor: 'pointer', opacity: 0.7,
                }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <p style={{ margin: 0, fontSize: compacto ? 10 : 11, opacity: 0.5, lineHeight: 1.45 }}>
            {archivo
              ? 'Se sube al guardar la oferta.'
              : propia
                ? 'Se muestra en la tarjeta de esta oferta en la landing.'
                : heredada
                  ? 'Sin imagen propia: se usa la del producto.'
                  : 'Opcional. Sin imagen se usa la del producto.'}
          </p>

          {error && <p style={{ margin: 0, fontSize: 11, color: '#f87171' }}>{error}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={elegir}
      />
    </div>
  );
}

/**
 * Sube la imagen que quedó pendiente al crear una oferta nueva (no había id
 * al que subirla mientras se completaba el formulario).
 *
 * No revienta el guardado si falla: la oferta ya se creó bien y perderla por
 * una foto sería peor. Devuelve el mensaje de error para que el formulario
 * lo muestre como aviso.
 *
 * @returns {Promise<string|null>} null si salió bien o no había nada que subir.
 */
export async function subirImagenPendiente(ofertaId, archivo) {
  if (!ofertaId || !archivo) return null;
  try {
    await ofertaService.subirImagen(ofertaId, archivo);
    return null;
  } catch (err) {
    return err?.response?.data?.message || 'La oferta se guardó, pero no se pudo subir su imagen.';
  }
}
