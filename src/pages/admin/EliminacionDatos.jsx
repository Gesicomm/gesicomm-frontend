import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Clock, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { eliminacionDatosService } from '../../services/eliminacionDatosService';
import './eliminacionDatos.css';

const ESTADOS = {
  recibida: 'Recibida', verificando_identidad: 'Verificando identidad',
  en_proceso: 'En proceso', completada: 'Completada', rechazada: 'Rechazada',
};
const ORIGENES = { formulario_publico: 'Formulario público', panel_usuario: 'Panel de usuario', meta_callback: 'Meta' };
const fecha = valor => {
  if (!valor) return 'No registrada';
  const parsed = new Date(valor);
  return Number.isNaN(parsed.getTime()) ? 'No registrada' : new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
};

export default function EliminacionDatos() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actualizando, setActualizando] = useState(null);

  const cargar = async () => {
    setCargando(true); setError('');
    try {
      const data = await eliminacionDatosService.listar();
      setSolicitudes(Array.isArray(data) ? data : data.solicitudes || []);
    } catch { setError('No pudimos cargar las solicitudes. Volvé a intentar.'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const cambiarEstado = async (solicitud, estado) => {
    if (estado === 'completada' && !window.confirm('¿Confirmás que ya eliminaste los datos de esta persona en todos los sistemas?')) return;
    if (estado === 'rechazada' && !window.confirm('¿Confirmás que querés rechazar esta solicitud?')) return;
    setActualizando(solicitud.id);
    try {
      await eliminacionDatosService.actualizarEstado(solicitud.id, estado);
      toast.success('Estado actualizado');
      await cargar();
    } catch { toast.error('No se pudo actualizar el estado.'); }
    finally { setActualizando(null); }
  };

  return <main className="privacy-requests gc-panel">
    <header className="privacy-requests__header">
      <div><span className="privacy-requests__eyebrow"><ShieldAlert size={18} /> Privacidad y datos</span><h1>Solicitudes de eliminación de datos</h1><p>Revisá las solicitudes personales y registrá el avance de cada caso.</p></div>
      <button type="button" onClick={cargar} disabled={cargando || actualizando !== null}><RefreshCw size={18} /> Actualizar lista</button>
    </header>

    {cargando ? <p role="status" className="privacy-requests__state">Cargando solicitudes…</p> : error ? <div role="alert" className="privacy-requests__state"><p>{error}</p><button type="button" onClick={cargar}>Reintentar</button></div> : solicitudes.length === 0 ? <div className="privacy-requests__state"><ShieldAlert size={30} /><h2>No hay solicitudes</h2><p>Las solicitudes nuevas aparecerán acá.</p></div> :
      <div className="privacy-requests__list" aria-label="Solicitudes de eliminación de datos">
        {solicitudes.map(s => <article className="privacy-request" key={s.id} aria-labelledby={'privacy-request-' + s.id}>
          <div className="privacy-request__main"><div><span className="privacy-request__label">Solicitante</span><h2 id={'privacy-request-' + s.id}>{s.nombre || (s.meta_user_id ? 'Usuario de Meta' : 'Sin nombre')}</h2><p>{s.email || s.meta_user_id || 'Sin contacto directo'}</p>{s.codigo && <small>Código: {String(s.codigo).slice(0, 8)}</small>}</div><span className="privacy-request__status" data-state={s.estado}>{ESTADOS[s.estado] || s.estado}</span></div>
          <div className="privacy-request__details"><div><span className="privacy-request__label">Origen</span><strong>{ORIGENES[s.origen] || String(s.origen || 'No indicado').replaceAll('_', ' ')}</strong></div><div><span className="privacy-request__label">Recibida</span><strong>{fecha(s.recibida_en)}</strong></div><div><span className="privacy-request__label">Fecha límite</span><strong><Clock size={16} /> {fecha(s.fecha_limite)}</strong></div></div>
          {s.estado !== 'completada' && s.estado !== 'rechazada' && <div className="privacy-request__actions" aria-label={'Acciones para ' + (s.nombre || 'la solicitud')}>
            {s.estado !== 'en_proceso' && <button type="button" onClick={() => cambiarEstado(s, 'en_proceso')} disabled={actualizando !== null}><ArrowRight size={17} /> Marcar en proceso</button>}
            <button type="button" onClick={() => cambiarEstado(s, 'completada')} disabled={actualizando !== null}><CheckCircle size={17} /> Marcar completada</button>
            <button type="button" onClick={() => cambiarEstado(s, 'rechazada')} disabled={actualizando !== null}><XCircle size={17} /> Rechazar</button>
          </div>}
        </article>)}
      </div>}
  </main>;
}
