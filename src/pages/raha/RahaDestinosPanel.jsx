import React, { useCallback, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { rahaPortalApi as api } from '../../services/rahaPortalApi';
import { botonOperacion, botonPrincipal, controlOperacion, mensajeError, ResultadoConsulta, useConsultaOperacion } from './operacionesUI';

const inicial = { nombre: '', ciudad: '', direccion: '', persona_contacto: '', telefono_contacto: '', activo: true };

export default function RahaDestinosPanel() {
  const consulta = useConsultaOperacion(useCallback(() => api.destinos(), []));
  const [formulario, setFormulario] = useState(null);
  const [id, setId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  function editar(destino = null) {
    setId(destino?.id || null);
    setFormulario(destino ? Object.fromEntries(Object.keys(inicial).map(clave => [clave, destino[clave] ?? inicial[clave]])) : { ...inicial });
    setError('');
    setMensaje('');
  }
  async function guardar(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.guardarDestino(formulario, id);
      setFormulario(null);
      setMensaje('Depósito RAHA guardado. Los destinos activos ya están disponibles para los comercios.');
      consulta.reintentar();
    } catch (fallo) { setError(mensajeError(fallo)); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5 text-fg"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0 text-xl font-bold">Depósitos de recepción RAHA</h2><p className="mb-0 mt-2 text-sm text-fg-muted">Publicá los lugares donde los comercios pueden solicitar el envío de su mercadería.</p></div><button type="button" onClick={() => editar()} disabled={busy} className={botonPrincipal}><Plus size={16} /> Agregar depósito RAHA</button></div>
    {mensaje && <p role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success-text">{mensaje}</p>}
    {formulario && <form onSubmit={guardar} className="rounded-xl border border-primary/30 bg-surface p-5"><h3 className="mb-4 mt-0 text-base font-bold">{id ? 'Editar depósito RAHA' : 'Nuevo depósito RAHA'}</h3><fieldset disabled={busy} className="m-0 grid min-w-0 gap-4 border-0 p-0 sm:grid-cols-2">{[['nombre', 'Nombre', 150, true], ['ciudad', 'Ciudad', 100, true], ['direccion', 'Dirección de recepción', 255, true], ['persona_contacto', 'Persona de contacto', 150, false], ['telefono_contacto', 'Teléfono de contacto', 50, false]].map(([clave, label, max, requerido]) => <label key={clave} className="text-sm font-semibold">{label}<input required={requerido} minLength={requerido ? (clave === 'direccion' ? 3 : 2) : undefined} maxLength={max} value={formulario[clave]} onChange={event => setFormulario(prev => ({ ...prev, [clave]: event.target.value }))} className={`${controlOperacion} mt-1.5`} /></label>)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formulario.activo} onChange={event => setFormulario(prev => ({ ...prev, activo: event.target.checked }))} /> Disponible para nuevas solicitudes</label></fieldset>{error && <p role="alert" className="text-sm text-danger-text">{error}</p>}<div className="mt-5 flex flex-wrap gap-2"><button type="submit" disabled={busy} className={botonPrincipal}>{busy ? 'Guardando…' : 'Guardar depósito'}</button><button type="button" disabled={busy} onClick={() => setFormulario(null)} className={botonOperacion}>Cancelar edición</button></div></form>}
    <ResultadoConsulta consulta={consulta} vacio={!consulta.data?.length}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{consulta.data?.map(destino => <article key={destino.id} className="rounded-xl border border-border bg-surface p-5"><div className="flex items-center justify-between gap-2"><MapPin size={20} className="text-primary-text" /><span className={`rounded-full px-2 py-1 text-xs font-semibold ${destino.activo ? 'bg-success/10 text-success-text' : 'bg-surface-2 text-fg-muted'}`}>{destino.activo ? 'Activo' : 'Inactivo'}</span></div><h3 className="mb-2 mt-4 text-base font-bold">{destino.nombre}</h3><p className="my-1 text-sm text-fg-muted">{destino.direccion} · {destino.ciudad}</p><p className="mb-4 mt-3 text-sm text-fg-muted">{destino.persona_contacto} {destino.telefono_contacto}</p><button type="button" onClick={() => editar(destino)} disabled={busy} className={botonOperacion} aria-label={`Editar depósito ${destino.nombre}`}>Editar depósito</button></article>)}</div></ResultadoConsulta>
    <p className="text-xs text-fg-muted">Desactivar un destino impide nuevas solicitudes. Las solicitudes existentes conservan la dirección y el contacto que tenían al enviarse.</p>
  </div>;
}
