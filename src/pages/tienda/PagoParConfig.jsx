import { useState, useEffect } from 'react';
import { paymentGatewayService } from '../../services/paymentGatewayService';

export default function PagoParConfig() {
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  // Form state
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [environment, setEnvironment] = useState('sandbox');
  const [isActive, setIsActive] = useState(false);
  const [eliminarKey, setEliminarKey] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const data = await paymentGatewayService.obtenerPagopar();
      setConfig(data);
      setPublicKey(data.public_key || '');
      setEnvironment(data.environment || 'sandbox');
      setIsActive(data.is_active || false);
    } catch (err) {
      setError('Error al cargar la configuración de PagoPar.');
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setMensaje(null);
    setError(null);
    setGuardando(true);

    try {
      const payload = {
        public_key: publicKey,
        environment,
        is_active: isActive
      };

      if (eliminarKey) {
        payload.private_key = null;
      } else if (privateKey.trim()) {
        payload.private_key = privateKey.trim();
      }

      await paymentGatewayService.guardarPagopar(payload);
      setMensaje('Configuración guardada exitosamente.');
      setPrivateKey(''); // Limpiar el input
      setEliminarKey(false);
      cargarConfiguracion(); // Recargar para actualizar estado
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar configuración.');
    } finally {
      setGuardando(false);
    }
  };

  const handleProbarConexion = async () => {
    setMensaje(null);
    setError(null);
    setProbando(true);
    try {
      const res = await paymentGatewayService.probarPagopar();
      setMensaje('Conexión con PagoPar exitosa.');
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexión. Verifica tus credenciales.');
    } finally {
      setProbando(false);
    }
  };

  if (cargando) {
    return <div className="text-[var(--vit-muted)] py-4">Cargando configuración...</div>;
  }

  return (
    <div className="bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-medium text-[var(--vit-text)]">Integración PagoPar</h2>
          <p className="text-sm text-[var(--vit-muted)]">Recibí pagos online conectando tu cuenta de PagoPar.</p>
        </div>
      </div>

      {mensaje && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {mensaje}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--vit-card-bg)] border border-[var(--vit-border)]">
          <div>
            <span className="block text-sm font-medium text-[var(--vit-text)]">Activar pasarela</span>
            <span className="block text-xs text-[var(--vit-muted)] mt-1">Habilitá PagoPar en los checkouts de tus landings.</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <div className="w-11 h-6 bg-[var(--vit-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--vit-muted)]">Public Key</label>
            <input 
              type="text" 
              className="w-full bg-[var(--vit-card-bg)] text-[var(--vit-text)] border border-[var(--vit-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors placeholder:text-[var(--vit-muted)]"
              placeholder="Ej: pk_test_xxxxxx"
              value={publicKey}
              onChange={e => setPublicKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--vit-muted)]">Entorno</label>
            <select 
              className="w-full bg-[var(--vit-card-bg)] text-[var(--vit-text)] border border-[var(--vit-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors appearance-none"
              value={environment}
              onChange={e => setEnvironment(e.target.value)}
            >
              <option value="sandbox" className="bg-[var(--vit-card-bg)] text-[var(--vit-text)]">Sandbox (Pruebas)</option>
              <option value="production" className="bg-[var(--vit-card-bg)] text-[var(--vit-text)]">Producción (Real)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-[var(--vit-border)]">
          <label className="text-sm font-medium text-[var(--vit-muted)]">Private Key</label>
          
          {config?.has_private_key && !eliminarKey ? (
            <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="text-sm">
                  <span className="block text-emerald-500 font-medium">Clave Privada configurada</span>
                  <span className="block text-emerald-600/80 text-xs">Se encuentra cifrada de forma segura.</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEliminarKey(true)}
                className="text-xs text-red-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
              >
                Reemplazar o Eliminar
              </button>
            </div>
          ) : (
            <div>
              <input 
                type="text" 
                className="w-full bg-[var(--vit-card-bg)] text-[var(--vit-text)] border border-[var(--vit-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors placeholder:text-[var(--vit-muted)]"
                placeholder="Pegá tu private key aquí..."
                value={privateKey}
                onChange={e => setPrivateKey(e.target.value)}
              />
              <p className="text-xs text-[var(--vit-muted)] mt-2">
                La clave se cifrará con encriptación de grado militar antes de ser almacenada en la base de datos.
              </p>
            </div>
          )}
        </div>

        <div className="pt-6 flex items-center justify-between border-t border-[var(--vit-border)]">
          <button
            type="button"
            onClick={handleProbarConexion}
            disabled={probando || !config?.has_private_key || !publicKey}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[var(--vit-border)] text-[var(--vit-text)] hover:bg-[var(--vit-card-hover-bg)] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {probando ? (
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            Probar Conexión
          </button>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {guardando ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : null}
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
