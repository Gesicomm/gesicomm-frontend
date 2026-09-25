import React, { useState, useEffect } from 'react';
import { eliminacionDatosService } from '../../services/eliminacionDatosService';
import { ShieldAlert, Trash2, Search, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const ESTADOS = {
  recibida: { label: 'Recibida', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  verificando_identidad: { label: 'Verificando', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  en_proceso: { label: 'En Proceso', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  completada: { label: 'Completada', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rechazada: { label: 'Rechazada', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' }
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
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            Solicitudes de Privacidad (Data Deletion)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de solicitudes de eliminación de datos personales (GDPR / CCPA / Meta).
          </p>
        </div>
        <button 
          onClick={cargarSolicitudes}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          Actualizar Lista
        </button>
      </div>

      <div className="bg-white dark:bg-[#1E2536] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando solicitudes...</div>
        ) : solicitudes.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay solicitudes</h3>
            <p className="text-slate-500 mt-1">Nadie ha solicitado la eliminación de sus datos recientemente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
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
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-200">
                        {s.nombre || (s.meta_user_id ? 'Usuario de Meta' : 'Desconocido')}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {s.email || s.meta_user_id || 'Sin contacto directo'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">
                        Cód: {s.codigo.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {s.origen.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Vence: {new Date(s.fecha_limite).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
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
                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-900/30 rounded-md transition-colors"
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
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-900/30 rounded-md transition-colors"
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
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-900/30 rounded-md transition-colors"
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
