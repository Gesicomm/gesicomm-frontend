import React, { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { ghlApi, getAutomationMediaUrl } from '../../services/automationHubApi';

const TIPOS = [
  { value: 'post', label: 'Publicación' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Historia' },
];

const inputClass = 'h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg';

export default function SocialPublishModal({ item, onClose }) {
  const [cuentas, setCuentas] = useState([]);
  const [posts, setPosts] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [accountId, setAccountId] = useState('');
  const [tipo, setTipo] = useState(item.format === 'H' ? 'story' : 'post');
  const [archivo, setArchivo] = useState(null);
  const [caption, setCaption] = useState(item.description || '');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('10:00');
  const [publicando, setPublicando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const [cuentasData, postsData] = await Promise.all([
        ghlApi.cuentas(),
        ghlApi.listarPosts(item.id),
      ]);
      setCuentas(cuentasData);
      setPosts(postsData);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las cuentas conectadas de GoHighLevel.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handlePublicar = async (e) => {
    e.preventDefault();
    if (!accountId || !archivo || !fecha) {
      setError('Elegí la cuenta, el archivo y la fecha de programación.');
      return;
    }
    setPublicando(true);
    setError('');
    try {
      const { url: mediaUrl, mimeType } = await ghlApi.subirMedia(archivo);
      const cuenta = cuentas.find((c) => c.id === accountId);
      const scheduleDate = new Date(`${fecha}T${hora}:00`).toISOString();
      await ghlApi.publicar(item.id, {
        platform: cuenta?.platform || 'desconocida',
        accountId,
        mediaUrl: getAutomationMediaUrl(mediaUrl),
        mediaType: mimeType,
        caption,
        scheduleDate,
        tipo,
      });
      setArchivo(null);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo publicar en GoHighLevel.');
    } finally {
      setPublicando(false);
    }
  };

  const handleEliminarPost = async (postId) => {
    try {
      await ghlApi.eliminarPost(postId);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo borrar la publicación.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="m-0 text-base font-semibold text-fg">Publicar en redes · {item.tracking_code}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-sm text-fg-muted">Cargando...</div>
        ) : (
          <>
            {!cuentas.length ? (
              <div className="p-4">
                <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  No hay cuentas conectadas en GoHighLevel (o todavía no conectaste tu Location ID / Private Integration Token en la pestaña "GoHighLevel").
                </div>
              </div>
            ) : (
              <form onSubmit={handlePublicar} className="flex flex-col gap-3 p-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted">Cuenta</label>
                  <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                    <option value="">Seleccionar cuenta...</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.platform})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted">Tipo de publicación</label>
                  <select className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted">Archivo</label>
                  <input type="file" accept="image/*,video/*" onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                    className="w-full text-xs text-fg-muted" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted">Copy / Caption</label>
                  <textarea className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-sm text-fg" rows={3}
                    value={caption} onChange={(e) => setCaption(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-muted">Fecha</label>
                    <input type="date" className={inputClass} value={fecha} onChange={(e) => setFecha(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-muted">Hora</label>
                    <input type="time" className={inputClass} value={hora} onChange={(e) => setHora(e.target.value)} />
                  </div>
                </div>

                {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

                <button type="submit" disabled={publicando}
                  className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60">
                  {publicando ? 'Publicando...' : 'Programar en GoHighLevel'}
                </button>
              </form>
            )}

            {!!posts.length && (
              <div className="border-t border-border p-4">
                <div className="mb-2 text-xs font-semibold uppercase text-fg-subtle">Publicaciones de esta pieza</div>
                <div className="flex flex-col gap-2">
                  {posts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
                      <div className="text-xs text-fg">
                        <span className="font-semibold">{p.platform}</span> · {p.status}
                        {p.error_message && <span className="ml-2 text-danger">{p.error_message}</span>}
                      </div>
                      <button type="button" onClick={() => handleEliminarPost(p.id)}
                        className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger/10">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
