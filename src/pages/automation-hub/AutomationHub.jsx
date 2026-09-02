import React, { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Plus, MessageCircle, ListChecks, Sparkles, Kanban, LineChart, Wallet, DollarSign } from 'lucide-react';
import { contentApi } from '../../services/automationHubApi';
import ContentCalendar from './ContentCalendar';
import ContentFormModal from './ContentFormModal';
import ContentDetailModal from './ContentDetailModal';
import ManyChatPanel from './ManyChatPanel';
import DailyActionsPanel from './DailyActionsPanel';
import OpportunitiesBoard from './OpportunitiesBoard';
import CollectionsBoard from './CollectionsBoard';
import ContentAnalytics from './ContentAnalytics';
import FinanzasAutomatizacion from '../finanzas/FinanzasAutomatizacion';
import ManyChatFloatingAssistant from './ManyChatFloatingAssistant';

const TABS = [
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'manychat', label: 'ManyChat', icon: MessageCircle },
  { id: 'oportunidades', label: 'Oportunidades', icon: Kanban },
  { id: 'cobranzas', label: 'Cobranzas', icon: Wallet },
  { id: 'analizador', label: 'Analizador', icon: LineChart },
  { id: 'acciones', label: 'Acciones pendientes', icon: ListChecks },
  { id: 'finanzas', label: 'Finanzas', icon: DollarSign },
];

export default function AutomationHub() {
  const [tab, setTab] = useState('calendario');
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [modalNuevo, setModalNuevo] = useState(null); // fecha inicial o null
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [floatingAssistantItem, setFloatingAssistantItem] = useState(null);

  const cargarContenido = useCallback(async () => {
    setCargando(true);
    setErrorCarga('');
    try {
      setItems(await contentApi.listar());
    } catch (err) {
      setErrorCarga('No se pudo cargar el calendario de contenido.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarContenido(); }, [cargarContenido]);

  const handleReprogramar = async (id, nuevaFecha) => {
    const anterior = items;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, publish_date: nuevaFecha } : it)));
    try {
      await contentApi.reprogramar(id, nuevaFecha);
    } catch (err) {
      setItems(anterior); // revertir si el backend rechaza el cambio (ej. ya publicado)
    }
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-fg">
            <Sparkles className="text-primary-text" size={24} /> Automatización de contenido
          </h1>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">
            Planificá tu contenido, generá su código de tracking y gestioná la vinculación con ManyChat.
          </p>
        </div>
        {tab === 'calendario' && (
          <div className="flex items-center gap-2">
            {items.some(it => it.is_test) && (
              <button
                type="button"
                onClick={async () => {
                  if(confirm('Se eliminarán todos los contenidos de prueba. Continuar?')) {
                    await contentApi.eliminarPruebas();
                    cargarContenido();
                  }
                }}
                className="flex h-10 items-center gap-2 rounded-md bg-danger/10 px-4 text-sm font-semibold text-danger border border-danger/20 hover:bg-danger/20"
              >
                Limpiar pruebas
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalNuevo(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }))}
              className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg"
            >
              <Plus size={16} /> Nuevo contenido
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-md border px-4 py-2 text-xs font-semibold ${
                tab === t.id ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg-muted'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'calendario' && (
        <>
          {errorCarga && <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{errorCarga}</div>}
          {cargando ? (
            <div className="p-8 text-center text-sm text-fg-muted">Cargando calendario...</div>
          ) : (
            <ContentCalendar
              items={items}
              onDayClick={(fecha) => setModalNuevo(fecha)}
              onItemClick={(item) => setItemSeleccionado(item)}
              onReprogramar={handleReprogramar}
            />
          )}
        </>
      )}

      {tab === 'manychat' && <ManyChatPanel />}
      {tab === 'oportunidades' && <OpportunitiesBoard />}
      {tab === 'cobranzas' && <CollectionsBoard />}
      {tab === 'analizador' && <ContentAnalytics />}
      {tab === 'finanzas' && <FinanzasAutomatizacion />}
      {tab === 'acciones' && <DailyActionsPanel />}

      {modalNuevo && (
        <ContentFormModal
          fechaInicial={modalNuevo}
          onClose={() => setModalNuevo(null)}
          onCreado={() => { setModalNuevo(null); cargarContenido(); }}
        />
      )}

      {itemSeleccionado && (
        <ContentDetailModal
          item={itemSeleccionado}
          onClose={() => setItemSeleccionado(null)}
          onCambio={() => { setItemSeleccionado(null); cargarContenido(); }}
          setFloatingAssistantItem={setFloatingAssistantItem}
        />
      )}

      {floatingAssistantItem && (
        <ManyChatFloatingAssistant
          item={floatingAssistantItem.item}
          manychatLink={floatingAssistantItem.manychatLink}
        />
      )}
    </div>
  );
}
