import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  FlaskConical,
  Kanban,
  LineChart,
  ListChecks,
  MessageCircle,
  Plus,
  Sparkles,
  Wallet,
} from 'lucide-react';
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
  { id: 'cobranzas', label: 'Seguimiento de pagos', icon: Wallet },
  { id: 'analizador', label: 'Analizador', icon: LineChart },
  { id: 'finanzas', label: 'Finanzas', icon: DollarSign },
  { id: 'acciones', label: 'Acciones pendientes', icon: ListChecks },

];

const FORMATO_LABEL = {
  R: 'Reel',
  C: 'Carrusel',
  H: 'Historia',
};

function hoyISO() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' });
}

function formatoHora(v) {
  return String(v || '').slice(0, 5) || '--:--';
}

export default function AutomationHub() {
  const [tab, setTab] = useState('calendario');
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [modalNuevo, setModalNuevo] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null); // fecha inicial o null
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

  const resumen = useMemo(() => {
    const hoy = hoyISO();
    const programados = items.filter((it) => it.status !== 'published' && !it.is_test);
    const publicados = items.filter((it) => it.status === 'published' && !it.is_test);
    const pruebas = items.filter((it) => it.is_test);
    const proximos = [...programados]
      .filter((it) => it.publish_date >= hoy)
      .sort((a, b) => `${a.publish_date} ${a.publish_time}`.localeCompare(`${b.publish_date} ${b.publish_time}`));
    const hoyItems = proximos.filter((it) => it.publish_date === hoy);
    return {
      programados: programados.length,
      publicados: publicados.length,
      pruebas: pruebas.length,
      hoy: hoyItems.length,
      proximo: proximos[0] || null,
    };
  }, [items]);

  const statCards = [
    { label: 'Programados', value: resumen.programados, helper: 'Piezas pendientes', icon: CalendarClock, className: 'text-primary-text bg-primary/10 border-primary/20' },
    { label: 'Para hoy', value: resumen.hoy, helper: resumen.proximo ? `${formatoHora(resumen.proximo.publish_time)} · ${resumen.proximo.topic || resumen.proximo.keyword}` : 'Sin publicaciones hoy', icon: Clock3, className: 'text-warning bg-warning/10 border-warning/25' },
    { label: 'Publicados', value: resumen.publicados, helper: 'Contenido completado', icon: CheckCircle2, className: 'text-success bg-success/10 border-success/25' },
    { label: 'Pruebas', value: resumen.pruebas, helper: resumen.pruebas ? 'Se pueden limpiar' : 'Calendario limpio', icon: FlaskConical, className: 'text-fg-muted bg-surface-2 border-border' },
  ];

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
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-text">
            <Sparkles size={13} /> Automation Hub
          </div>
          <h1 className="m-0 text-2xl font-bold text-fg">
            Automatización de contenido
          </h1>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">
            Centro de control para programar publicaciones, crear tracking y mantener la vinculación con ManyChat bajo control.
          </p>
        </div>
        {tab === 'calendario' && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {items.some(it => it.is_test) && (
              <button
                type="button"
                onClick={async () => {
                  if(confirm('Se eliminarán todos los contenidos de prueba. Continuar?')) {
                    await contentApi.eliminarPruebas();
                    cargarContenido();
                  }
                }}
                className="flex h-10 items-center gap-2 rounded-md border border-warning/25 bg-warning/10 px-3 text-sm font-semibold text-warning transition-colors hover:bg-warning/15"
              >
                <FlaskConical size={15} /> Limpiar pruebas
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalNuevo(hoyISO())}
              className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg shadow-[0_10px_24px_rgba(59,130,246,0.22)] transition-colors hover:bg-primary-hover"
            >
              <Plus size={16} /> Programar contenido
            </button>
          </div>
        )}
      </div>

      {tab === 'calendario' && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md border ${card.className}`}>
                    <Icon size={17} />
                  </div>
                  {card.label === 'Pruebas' && card.value > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-[10px] font-bold uppercase text-warning">
                      <AlertTriangle size={11} /> Revisar
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-fg">{card.value}</div>
                <div className="mt-1 text-xs font-semibold text-fg-muted">{card.label}</div>
                <div className="mt-1 truncate text-[11px] text-fg-subtle">{card.helper}</div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'calendario' && resumen.proximo && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wide text-primary-text">Próxima publicación</div>
            <div className="mt-0.5 truncate text-sm font-semibold text-fg">
              {resumen.proximo.publish_date} · {formatoHora(resumen.proximo.publish_time)} · {FORMATO_LABEL[resumen.proximo.format] || 'Contenido'} · {resumen.proximo.topic || resumen.proximo.keyword}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setItemSeleccionado(resumen.proximo)}
            className="h-9 rounded-md border border-primary/30 px-3 text-xs font-semibold text-primary-text transition-colors hover:bg-primary/10"
          >
            Ver detalle
          </button>
        </div>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto rounded-lg border border-border bg-surface p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                tab === t.id ? 'border-primary bg-primary text-primary-fg shadow-sm' : 'border-transparent text-fg-muted hover:bg-surface-2 hover:text-fg'
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

      {(modalNuevo || itemToEdit) && (
        <ContentFormModal
          fechaInicial={modalNuevo}
          itemToEdit={itemToEdit}
          onClose={() => { setModalNuevo(null); setItemToEdit(null); }}
          onCreado={(creado) => {
            setModalNuevo(null);
            setItemToEdit(null);
            cargarContenido();
          }}
        />
      )}

      {itemSeleccionado && (
        <ContentDetailModal
          item={itemSeleccionado}
          onClose={() => setItemSeleccionado(null)}
          onCambio={() => { setItemSeleccionado(null); cargarContenido(); }}
          setFloatingAssistantItem={setFloatingAssistantItem}
          onEdit={(item) => {
            setItemSeleccionado(null);
            setItemToEdit(item);
          }}
        />
      )}

      {floatingAssistantItem && (
        <ManyChatFloatingAssistant
          key={floatingAssistantItem.item?.id}
          item={floatingAssistantItem.item}
          manychatLink={floatingAssistantItem.manychatLink}
          onClose={() => setFloatingAssistantItem(null)}
        />
      )}
    </div>
  );
}
