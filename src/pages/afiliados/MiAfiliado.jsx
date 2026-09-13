import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeDollarSign, CheckCircle2, Copy, Loader, Save, AlertTriangle } from 'lucide-react';
import { afiliadosService } from '../../services/afiliadosService';
import { planesService } from '../../services/planesService';
import { verificarSesion } from '../../utils/auth';
import '../planes/planes.css';

const FORM_INICIAL = {
  nombre: '',
  telefono: '',
  metodo_pago: 'transferencia',
  entidad_pago: '',
  titular_pago: '',
  documento_pago: '',
  cuenta_pago: '',
};

export default function MiAfiliado() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [afiliado, setAfiliado] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargando(true);
      try {
        const [sesion, estadoCuenta] = await Promise.all([
          verificarSesion().catch(() => null),
          planesService.miEstado().catch(() => null),
        ]);
        if (!activo) return;
        if (estadoCuenta?.suscripcion?.plan?.codigo !== 'founders') {
          navigate('/mi-dashboard', { replace: true });
          return;
        }

        const resp = await afiliadosService.miAfiliado().catch((err) => {
          if (err.response?.status === 403) {
            navigate('/mi-dashboard', { replace: true });
            return { afiliado: null };
          }
          throw err;
        });
        if (!activo) return;
        setUsuario(sesion);
        const actual = resp?.afiliado || null;
        setAfiliado(actual);
        setForm({
          nombre: actual?.nombre || sesion?.nombre || '',
          telefono: actual?.telefono || '',
          metodo_pago: actual?.metodo_pago || 'transferencia',
          entidad_pago: actual?.entidad_pago || '',
          titular_pago: actual?.titular_pago || actual?.nombre || sesion?.nombre || '',
          documento_pago: actual?.documento_pago || '',
          cuenta_pago: actual?.cuenta_pago || '',
        });
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargar();
    return () => { activo = false; };
  }, []);

  function actualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setMensaje(null);
    setError(null);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    setError(null);
    try {
      const resp = await afiliadosService.solicitarMiAfiliado(form);
      setAfiliado(resp.afiliado);
      setMensaje(resp.afiliado?.codigo ? 'Tu afiliación quedó activa.' : 'Solicitud guardada.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No pudimos guardar tu afiliación.');
    } finally {
      setGuardando(false);
    }
  }

  async function copiarLink() {
    if (!afiliado?.link) return;
    try {
      await navigator.clipboard.writeText(afiliado.link);
      setMensaje('Link copiado.');
    } catch {
      setError('No se pudo copiar el link. Podés seleccionarlo manualmente.');
    }
  }

  const totalALiquidar = afiliado?.resumen_comisiones?.total_a_liquidar || 0;

  if (cargando) {
    return (
      <div className="pl-page">
        <div className="pl-cargando"><Loader size={20} className="spin-icon" /><span>Cargando afiliación...</span></div>
      </div>
    );
  }

  return (
    <div className="pl-page">
      <header className="pl-hero">
        <span className="pl-hero-eyebrow"><BadgeDollarSign size={13} /> Programa de afiliados</span>
        <h1>Quiero ser afiliado</h1>
        <p>
          Activá tu link personal para recomendar Gesicomm. Cuando una venta pagada entre por tu link,
          la comisión se genera automáticamente y queda lista para liquidación.
        </p>
      </header>

      {mensaje && (
        <div className="pl-aviso pl-aviso-ok">
          <CheckCircle2 size={17} />
          <span>{mensaje}</span>
        </div>
      )}

      {error && (
        <div className="pl-aviso pl-aviso-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      )}

      {afiliado && (
        <section className="pl-affiliates-summary">
          <div className="pl-affiliate-metric">
            <BadgeDollarSign size={22} />
            <div>
              <strong>{afiliado.comision_pct}%</strong>
              <span>comisión configurada</span>
            </div>
          </div>
          <div className="pl-affiliate-status">
            <span className={afiliado.estado === 'activo' ? 'activo' : 'pausado'}>
              {afiliado.estado === 'activo' ? 'Activo' : 'Inactivo'}
            </span>
            <p>A liquidar: USD {Number(totalALiquidar).toLocaleString('en-US')}</p>
          </div>
        </section>
      )}

      {afiliado?.link && (
        <section className="pl-editor-card">
          <div className="pl-editor-card-head">
            <div>
              <h3>Tu link de afiliado</h3>
              <span className="pl-editor-id">Código: {afiliado.codigo}</span>
            </div>
            <button type="button" className="pl-btn" onClick={copiarLink}>
              <Copy size={14} /> Copiar
            </button>
          </div>
          <div className="pl-campo">
            <input value={afiliado.link} readOnly />
          </div>
        </section>
      )}

      <form className="pl-editor-card" onSubmit={guardar}>
        <div className="pl-editor-card-head">
          <div>
            <h3>Datos del afiliado</h3>
            <span className="pl-editor-id">{usuario?.correo_electronico || usuario?.email || 'Tu cuenta'}</span>
          </div>
        </div>

        <div className="pl-affiliate-form">
          <label className="pl-campo">
            <span>Nombre público</span>
            <input value={form.nombre} onChange={e => actualizar('nombre', e.target.value)} placeholder="Tu nombre o marca" required />
          </label>
          <label className="pl-campo">
            <span>Teléfono</span>
            <input value={form.telefono} onChange={e => actualizar('telefono', e.target.value)} placeholder="+595..." />
          </label>
          <label className="pl-campo">
            <span>Método de pago</span>
            <input value={form.metodo_pago} onChange={e => actualizar('metodo_pago', e.target.value)} placeholder="Transferencia, billetera..." />
          </label>
          <label className="pl-campo">
            <span>Banco / entidad</span>
            <input value={form.entidad_pago} onChange={e => actualizar('entidad_pago', e.target.value)} placeholder="Banco o billetera" />
          </label>
          <label className="pl-campo">
            <span>Titular</span>
            <input value={form.titular_pago} onChange={e => actualizar('titular_pago', e.target.value)} placeholder="Titular de la cuenta" />
          </label>
          <label className="pl-campo">
            <span>Documento</span>
            <input value={form.documento_pago} onChange={e => actualizar('documento_pago', e.target.value)} placeholder="CI/RUC" />
          </label>
          <label className="pl-campo">
            <span>Cuenta / alias</span>
            <input value={form.cuenta_pago} onChange={e => actualizar('cuenta_pago', e.target.value)} placeholder="Número de cuenta, alias o teléfono" />
          </label>
          <button type="submit" className="pl-btn primario" disabled={guardando}>
            {guardando ? <Loader size={14} className="spin-icon" /> : <Save size={14} />}
            {afiliado ? 'Guardar datos' : 'Activar mi link'}
          </button>
        </div>
      </form>
    </div>
  );
}
