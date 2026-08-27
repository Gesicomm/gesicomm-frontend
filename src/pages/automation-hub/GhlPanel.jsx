import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { ghlApi } from '../../services/automationHubApi';

export default function GhlPanel() {
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [locationId, setLocationId] = useState('');
  const [token, setToken] = useState('');
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState('');

  const cargarEstado = async () => {
    setCargando(true);
    try {
      setEstado(await ghlApi.estado());
    } catch (err) {
      setError('No se pudo consultar el estado de GoHighLevel.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarEstado(); }, []);

  const handleConectar = async (e) => {
    e.preventDefault();
    if (!locationId.trim() || !token.trim()) return;
    setConectando(true);
    setError('');
    try {
      await ghlApi.conectar(locationId.trim(), token.trim());
      setLocationId('');
      setToken('');
      await cargarEstado();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo conectar con GoHighLevel.');
    } finally {
      setConectando(false);
    }
  };

  if (cargando) {
    return <div className="p-6 text-center text-sm text-fg-muted">Cargando...</div>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-sm font-semibold text-fg">Conexión con GoHighLevel</h3>
          {estado?.conectado ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 size={14} /> Conectado</span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-fg-muted"><AlertCircle size={14} /> Sin conectar</span>
          )}
        </div>

        {estado?.conectado && (
          <div className="mb-4 rounded-lg border border-border bg-surface-2 p-3 text-sm text-fg">
            <div className="text-[10px] font-semibold uppercase text-fg-subtle">Location ID</div>
            {estado.location_id || '—'}
          </div>
        )}

        <form onSubmit={handleConectar} className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-fg-muted">Location ID</label>
          <input
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="ID de la sub-cuenta de GoHighLevel"
            className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg"
          />

          <label className="mt-1 text-xs font-semibold text-fg-muted">Private Integration Token</label>
          <p className="m-0 text-xs text-fg-muted">
            Se genera en GoHighLevel → Settings → Private Integrations.
          </p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Pegá el token acá"
            className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg"
          />

          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          <button type="submit" disabled={conectando}
            className="mt-1 h-10 rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60">
            {conectando ? 'Validando...' : estado?.conectado ? 'Actualizar conexión' : 'Conectar GoHighLevel'}
          </button>
        </form>
      </div>
    </div>
  );
}
