import React, { useEffect, useState } from 'react';
import { Globe, Copy, Check } from 'lucide-react';
import API from '../services/api';

/**
 * Aviso único de cambio de IP del servidor (migración 2026-11-18).
 *
 * Solo aparece si el backend dice que el usuario tiene un dominio propio que
 * todavía no apunta a la IP nueva. Una vez cerrado no vuelve a aparecer para
 * ese usuario en este navegador.
 */
const CLAVE = (id) => `gesicomm:aviso-cambio-ip:v1:${id}`;

function yaVisto(id) {
  try { return window.localStorage.getItem(CLAVE(id)) === '1'; } catch { return false; }
}
function marcarVisto(id) {
  try { window.localStorage.setItem(CLAVE(id), '1'); } catch { /* sin storage: se muestra de nuevo, no rompe */ }
}

export default function AvisoCambioIp({ usuario }) {
  const [datos, setDatos] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const id = usuario?.id;

  useEffect(() => {
    if (!id || yaVisto(id)) return undefined;
    let vivo = true;
    API.get('/aviso-cambio-ip')
      .then(({ data }) => { if (vivo && data?.mostrar && data.ip) setDatos(data); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [id]);

  if (!datos) return null;

  const cerrar = () => { marcarVisto(id); setDatos(null); };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(datos.ip); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* el usuario puede copiarla a mano */ }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-brand-ink/60 p-4 backdrop-blur-sm" role="presentation">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="aviso-ip-titulo"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary-text">
          <Globe size={22} />
        </div>
        <h2 id="aviso-ip-titulo" className="m-0 mt-4 text-xl font-semibold text-fg">
          Actualizá tu dominio propio
        </h2>
        <p className="m-0 mt-2 text-base leading-relaxed text-fg-muted">
          Mudamos Gesicom a un servidor nuevo y más rápido. Para que tu tienda siga funcionando
          con tu dominio, entrá a tu proveedor de dominios y cambiá el registro <strong>A</strong> a esta IP:
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3">
          <span className="font-mono text-lg font-semibold text-fg">{datos.ip}</span>
          <button
            type="button"
            onClick={copiar}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface"
          >
            {copiado ? <Check size={16} /> : <Copy size={16} />}
            {copiado ? 'Copiada' : 'Copiar'}
          </button>
        </div>

        <ul className="m-0 mt-4 list-none space-y-3 p-0">
          {datos.dominios.map((d) => (
            <li key={d.dominio} className="rounded-lg border border-border p-3">
              <p className="m-0 text-base font-semibold text-fg">{d.dominio}</p>
              <p className="m-0 mt-1 text-sm text-fg-muted">
                {d.registros.map((r) => `Registro ${r.tipo} "${r.nombre}" → ${r.valor}`).join(' · ')}
              </p>
              {d.ips_actuales?.length > 0 && (
                <p className="m-0 mt-1 text-sm text-fg-muted">Hoy apunta a {d.ips_actuales.join(', ')}.</p>
              )}
            </li>
          ))}
        </ul>

        <p className="m-0 mt-4 text-sm text-fg-muted">
          El cambio puede tardar desde unos minutos hasta unas horas en propagarse. Si usás Cloudflare,
          dejá el registro con la nube gris (sin proxy).
        </p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={cerrar}
            className="rounded-md bg-primary px-4 py-2.5 text-base font-semibold text-fg transition-colors hover:bg-primary-hover"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
