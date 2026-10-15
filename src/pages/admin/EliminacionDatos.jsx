import React, { useState, useEffect } from 'react';
import { eliminacionDatosService } from '../../services/eliminacionDatosService';
import { ShieldAlert, Trash2, Search, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const ESTADOS = {
  recibida: { label: 'Recibida', color: "bg-surface-2 text-fg dark:bg-surface dark:text-fg-subtle" },
  verificando_identidad: { label: 'Verificando', color: "bg-primary/10 text-primary-text dark:bg-primary-active/30 dark:text-primary-text" },
  en_proceso: { label: 'En Proceso', color: "bg-warning/10 text-warning dark:bg-warning/30 dark:text-warning" },
  completada: { label: 'Completada', color: "bg-success/10 text-success dark:bg-success/30 dark:text-success" },
  rechazada: { label: 'Rechazada', color: "bg-danger/10 text-danger dark:bg-danger/30 dark:text-danger" }
};

export default function EliminacionDatos() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      const data = await eliminacionDatosService.listar();
      setSolicitudes(data.solicitudes || data); // Dependiendo de la estructura de la respuesta
    } catch (error) {
      toast.error('Error al cargar las solicitudes de eliminación.');
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await eliminacionDatosService.actualizarEstado(id, nuevoEstado);
      toast.success('Estado actualizado');
      cargarSolicitudes();
    } catch (error) {
      toast.error('No se pudo actualizar el estado.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-danger" />
            Solicitudes de Privacidad (Data Deletion)
          </h1>
          <p className="text-fg-muted text-sm mt-1">
            Gestión de solicitudes de eliminación de datos personales (GDPR / CCPA / Meta).
          </p>
        </div>
        <button 
          onClick={cargarSolicitudes}
          className="px-4 py-2 bg-surface-2 hover:bg-surface-3 dark:bg-surface dark:hover:bg-surface text-sm font-medium rounded-lg transition-colors"
        >
          Actualizar Lista
        </button>
      </div>

      <div className="bg-white dark:bg-[#1E2536] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-fg-muted">Cargando solicitudes...</div>
        ) : solicitudes.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <ShieldAlert className="w-12 h-12 text-fg-subtle dark:text-fg-muted mb-4" />
            <h3 className="text-lg font-medium text-fg dark:text-fg">No hay solicitudes</h3>
            <p className="text-fg-muted mt-1">Nadie ha solicitado la eliminación de sus datos recientemente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface dark:bg-surface/50 text-fg-muted dark:text-fg-subtle font-medium">
                <tr>
                  <th className="px-6 py-4">Usuario / Contacto</th>
                  <th className="px-6 py-4">Origen</th>
                  <th className="px-6 py-4">Fechas</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {solicitudes.map((s) => (
                  <tr key={s.id} className="hover:bg-surface dark:hover:bg-surface/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-fg dark:text-fg">
                        {s.nombre || (s.meta_user_id ? 'Usuario de Meta' : 'Desconocido')}
                      </div>
                      <div className="text-fg-muted text-xs mt-0.5">
                        {s.email || s.meta_user_id || 'Sin contacto directo'}
                      </div>
                      <div className="text-xs text-fg-subtle mt-1 font-mono">
                        Cód: {s.codigo.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-surface-2 dark:bg-surface text-xs font-medium text-fg-muted dark:text-fg-subtle">
                        {s.origen.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-fg-muted dark:text-fg-subtle">
                        <Clock className="w-3.5 h-3.5 text-fg-subtle" />
                        <span>Vence: {new Date(s.fecha_limite).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-fg-subtle mt-1">
                        Creada: {new Date(s.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ESTADOS[s.estado]?.color || ''}`}>
                        {ESTADOS[s.estado]?.label || s.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {s.estado !== 'completada' && s.estado !== 'rechazada' && (
                        <>
                          <button
                            title="Marcar en proceso"
                            onClick={() => cambiarEstado(s.id, 'en_proceso')}
                            className="p-1.5 text-warning hover:bg-warning/10 dark:text-warning dark:hover:bg-warning/30 rounded-md transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            title="Marcar como Completada (Eliminado)"
                            onClick={() => {
                              if(window.confirm('¿Confirmas que ya eliminaste los datos de este usuario en todos los sistemas?')) {
                                cambiarEstado(s.id, 'completada');
                              }
                            }}
                            className="p-1.5 text-success hover:bg-success/10 dark:text-success dark:hover:bg-success/30 rounded-md transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            title="Rechazar solicitud"
                            onClick={() => {
                              if(window.confirm('¿Seguro que deseas rechazar esta solicitud?')) {
                                cambiarEstado(s.id, 'rechazada');
                              }
                            }}
                            className="p-1.5 text-danger hover:bg-danger/10 dark:text-danger dark:hover:bg-danger/30 rounded-md transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
