import { useState, useEffect, useRef } from 'react';
import { Filter, ChevronLeft, ChevronRight, MessageCircle, Globe, Store, ArrowRight, AlertTriangle } from 'lucide-react';
import Select from 'react-select';
import { api } from '../../utils/api';
import { verificarSesion } from '../../utils/auth';
import { selectStylesDark as selectStyles } from '../../components/reactSelectDarkStyles';
import { formatPYG, formatPct } from './adsShared';

/**
 * Métricas en vivo contra la Graph API de Meta (no depende de reportes CSV).
 *
 * Permite consultar métricas y pausar o activar campañas de Meta.
 */
export default function AdsEnVivo() {
  const [tiendas, setTiendas] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  const [businesses, setBusinesses] = useState([]);
  const [adAccounts, setAdAccounts] = useState([]);
  const [campaignOptions, setCampaignOptions] = useState([]);

  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const [campaigns, setCampaigns] = useState([]);
  const [paging, setPaging] = useState(null);
  const [historyCursors, setHistoryCursors] = useState([]);
  const [currentCursor, setCurrentCursor] = useState(null);

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [noStores, setNoStores] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [campaignToChange, setCampaignToChange] = useState(null);
  const [changingCampaignId, setChangingCampaignId] = useState(null);
  const [changeMessage, setChangeMessage] = useState(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (campaignToChange) confirmRef.current?.focus();
  }, [campaignToChange]);

  useEffect(() => {
    let mounted = true;
    verificarSesion().then((user) => {
      if (mounted) setCanManage(Boolean(user && (user.rol !== 'colaborador' || user.accesos?.publicidad === 'gestionar')));
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const storesRes = await api.get('/api/meta/stores');
        const tiendasData = storesRes.tiendas || [];
        setTiendas(tiendasData);

        if (tiendasData.length === 0) {
          setNoStores(true);
          setLoadingFilters(false);
          return;
        }

        const firstStore = tiendasData[0];
        setSelectedStore(firstStore);
        await loadFiltersForStore(firstStore.id);
      } catch (err) {
        setError(err.message);
        setLoadingFilters(false);
      }
    };
    fetchInitial();
  }, []);

  const loadFiltersForStore = async (storeId) => {
    setLoadingFilters(true);
    setBusinesses([]);
    setAdAccounts([]);
    setCampaignOptions([]);
    setSelectedBusiness('');
    setSelectedAdAccount('');
    setSelectedCampaign('ALL');
    setCampaigns([]);
    setCampaignToChange(null);
    setChangeMessage(null);
    try {
      const res = await api.post('/api/meta/filters', { store_id: storeId });
      setBusinesses(res.businesses || []);
      setAdAccounts(res.ad_accounts || []);

      if (res.businesses?.length > 0) {
        const firstBusiness = res.businesses[0].id;
        setSelectedBusiness(firstBusiness);
        const validAds = res.ad_accounts?.filter(a => a.business && a.business.id === firstBusiness) || [];
        if (validAds.length > 0) setSelectedAdAccount(validAds[0].id);
      } else if (res.ad_accounts?.length > 0) {
        setSelectedAdAccount(res.ad_accounts[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingFilters(false);
    }
  };

  useEffect(() => {
    const fetchCampaignOptions = async () => {
      if (!selectedAdAccount || !selectedStore) return;
      try {
        const res = await api.post('/api/meta/campaign-list', {
          ad_account_id: selectedAdAccount,
          store_id: selectedStore.id,
        });
        setCampaignOptions(res.campaigns || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCampaignOptions();
  }, [selectedAdAccount, selectedStore]);

  const fetchCampaigns = async (cursor = null) => {
    if (!selectedAdAccount || !selectedStore) return;

    setLoadingData(true);
    try {
      const res = await api.post('/api/meta/campaigns', {
        store_id: selectedStore.id,
        business_id: selectedBusiness,
        ad_account_id: selectedAdAccount,
        campaign_id: selectedCampaign,
        status: selectedStatus,
        date_start: dateStart,
        date_end: dateEnd,
        cursor,
      });
      setCampaigns(res.campaigns || []);
      setPaging(res.paging || null);
      setCurrentCursor(cursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedAdAccount && !loadingFilters) {
      setCampaignToChange(null);
      setHistoryCursors([]);
      fetchCampaigns(null);
    }
  }, [selectedBusiness, selectedAdAccount, selectedCampaign, selectedStatus, dateStart, dateEnd, loadingFilters]);

  const handleNextPage = () => {
    if (paging?.cursors?.after) {
      setHistoryCursors([...historyCursors, currentCursor]);
      fetchCampaigns(paging.cursors.after);
    }
  };

  const handlePrevPage = () => {
    if (historyCursors.length > 0) {
      const newHistory = [...historyCursors];
      const prevCursor = newHistory.pop();
      setHistoryCursors(newHistory);
      fetchCampaigns(prevCursor);
    }
  };

  const changeCampaignStatus = async () => {
    if (!campaignToChange || !selectedStore || !selectedAdAccount) return;
    const campaign = campaignToChange;
    const nextStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setChangingCampaignId(campaign.id);
    setChangeMessage(null);
    try {
      await api.post('/api/meta/campaign-status', {
        store_id: selectedStore.id,
        ad_account_id: selectedAdAccount,
        campaign_id: campaign.id,
        status: nextStatus,
      });
      setCampaigns(previous => previous
        .map(item => item.id === campaign.id ? { ...item, status: nextStatus } : item)
        .filter(item => selectedStatus === 'ALL' || item.status === selectedStatus));
      setChangeMessage({ type: 'success', text: `La campaña “${campaign.name}” quedó ${nextStatus === 'PAUSED' ? 'pausada' : 'activa'} en Meta.` });
    } catch (err) {
      setChangeMessage({ type: 'error', text: err.message || 'No se pudo cambiar la campaña en Meta.' });
    } finally {
      setChangingCampaignId(null);
      setCampaignToChange(null);
    }
  };

  const rutaConfiguracion = window.location.pathname.startsWith('/mis-anuncios') ? '/configuracion' : '/settings';

  if (noStores) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-8 py-14 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary-text">
          <Store size={20} />
        </div>
        <h2>Conectá Meta para ver tus métricas</h2><p className="m-0 max-w-sm text-sm text-fg-muted">No tenés tiendas conectadas todavía. Conectá tu cuenta de Meta para ver métricas en vivo acá.</p>
        <a href={rutaConfiguracion} className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary-text hover:text-primary-text">
          Ir a Configuración <ArrowRight size={14} />
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-danger/20 bg-danger/5 px-8 py-14 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle size={20} />
        </div>
        <h2>Necesitamos revisar tu conexión con Meta</h2><p className="m-0 max-w-sm text-sm text-fg-muted">La sesión puede haber vencido o faltan permisos. Revisá la conexión desde Configuración y volvé a intentarlo.</p><details className="ads-technical-error"><summary>Ver detalle técnico</summary><p>{error}</p></details>
        <a href={rutaConfiguracion} className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary-text hover:text-primary-text">
          Ir a Configuración <ArrowRight size={14} />
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="filter-bar">
        {tiendas.length > 1 && (
          <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
            <label>Tienda</label>
            <div className="flex flex-wrap gap-2">
              {tiendas.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedStore(t); loadFiltersForStore(t.id); }}
                  className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
                    selectedStore?.id === t.id
                      ? 'border-primary bg-primary/15 font-semibold text-primary-text'
                      : 'border-border text-fg-muted hover:text-fg'
                  }`}
                >
                  {t.nombre || t.business_name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="filter-group">
          <label>Portafolio (BM)</label>
          <Select
            styles={selectStyles}
            value={businesses.map(b => ({ value: b.id, label: b.name })).find(opt => opt.value === selectedBusiness) || null}
            onChange={opt => {
              const newBusiness = opt ? opt.value : '';
              setSelectedBusiness(newBusiness);
              const validAds = adAccounts.filter(a => a.business && a.business.id === newBusiness);
              setSelectedAdAccount(validAds.length > 0 ? validAds[0].id : '');
              setSelectedCampaign('ALL');
            }}
            options={businesses.map(b => ({ value: b.id, label: b.name }))}
            isDisabled={loadingFilters}
            placeholder="Buscar portafolio..."
            isSearchable
          />
        </div>

        <div className="filter-group">
          <label>Cuenta Publicitaria</label>
          <Select
            styles={selectStyles}
            value={adAccounts.filter(a => a.business && a.business.id === selectedBusiness).map(a => ({ value: a.id, label: a.name })).find(opt => opt.value === selectedAdAccount) || null}
            onChange={opt => { setSelectedAdAccount(opt ? opt.value : ''); setSelectedCampaign('ALL'); }}
            options={adAccounts.filter(a => a.business && a.business.id === selectedBusiness).map(a => ({ value: a.id, label: a.name }))}
            isDisabled={loadingFilters}
            placeholder="Buscar cuenta..."
            isSearchable
          />
        </div>

        <div className="filter-group">
          <label>Campaña</label>
          <Select
            styles={selectStyles}
            value={[{ value: 'ALL', label: 'Todas las campañas' }, ...campaignOptions.map(c => ({ value: c.id, label: c.name }))].find(opt => opt.value === selectedCampaign) || null}
            onChange={opt => setSelectedCampaign(opt ? opt.value : 'ALL')}
            options={[{ value: 'ALL', label: 'Todas las campañas' }, ...campaignOptions.map(c => ({ value: c.id, label: c.name }))]}
            isDisabled={loadingFilters || campaignOptions.length === 0}
            placeholder="Buscar campaña..."
            isSearchable
          />
        </div>

        <div className="filter-group">
          <label>Estado</label>
          <select className="filter-input" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} disabled={loadingFilters}>
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Activas</option>
            <option value="PAUSED">Pausadas</option>
            <option value="ARCHIVED">Archivadas</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Fecha Desde</label>
          <input type="date" className="filter-input" value={dateStart} onChange={e => setDateStart(e.target.value)} />
        </div>

        <div className="filter-group">
          <label>Fecha Hasta</label>
          <input type="date" className="filter-input" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
        </div>
      </div>

      {changeMessage && <p className={`ads-meta-feedback ${changeMessage.type}`} role={changeMessage.type === 'error' ? 'alert' : 'status'}>{changeMessage.text}</p>}
      {campaignToChange && (
        <div ref={confirmRef} tabIndex={-1} className="ads-meta-confirm" role="region" aria-labelledby="ads-meta-confirm-title" aria-describedby="ads-meta-confirm-detail">
          <h3 id="ads-meta-confirm-title">{campaignToChange.status === 'ACTIVE' ? 'Pausar' : 'Activar'} campaña en Meta</h3>
          <p id="ads-meta-confirm-detail">{campaignToChange.name}. {campaignToChange.status === 'ACTIVE' ? 'La campaña dejará de publicarse.' : 'Meta podrá volver a publicar sus anuncios según la configuración de la campaña.'}</p>
          <div className="ads-meta-confirm-actions">
            <button type="button" className="btn-secondary" onClick={() => setCampaignToChange(null)} disabled={Boolean(changingCampaignId)}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={changeCampaignStatus} disabled={Boolean(changingCampaignId)}>{changingCampaignId ? 'Guardando…' : `Sí, ${campaignToChange.status === 'ACTIVE' ? 'pausar' : 'activar'}`}</button>
          </div>
        </div>
      )}
      <div className="data-table-wrapper">
        <div className="table-scroll-container">
          <table className="escalafy-table">
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Fecha Inicio</th>
                <th className="text-right">Presupuesto</th>
                <th className="text-right">Gasto</th>
                <th className="text-right">Resultados</th>
                <th className="text-right">Costo x Res.</th>
                <th className="text-right">ROAS</th>
                <th className="text-right">Valor Conv.</th>
                <th className="text-right">Tasa Cierre/Conv.</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td colSpan="9" style={{ padding: '1rem' }}>
                      <div className="skeleton-row" style={{ width: '100%' }} />
                      <div className="skeleton-row" style={{ width: '60%', opacity: 0.5, height: '12px' }} />
                    </td>
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-fg-muted)' }}>
                    <Filter size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>No hay campañas que coincidan con estos filtros.</p>
                  </td>
                </tr>
              ) : (
                campaigns.map(camp => {
                  const m = camp.metrics;
                  const isWs = camp.type === 'whatsapp';

                  let badgeClass = 'badge-archived';
                  if (camp.status === 'ACTIVE') badgeClass = 'badge-active';
                  if (camp.status === 'PAUSED') badgeClass = 'badge-paused';

                  let roasClass = 'text-neutral';
                  if (m.roas > 1) roasClass = 'text-success';
                  else if (m.roas > 0 && m.roas <= 1) roasClass = 'text-danger';

                  return (
                    <tr key={camp.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isWs ? <MessageCircle size={18} color="var(--color-success)" /> : <Globe size={18} color="var(--color-primary-text)" />}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-fg)', fontSize: '0.9rem' }}>{camp.name}</span>
                          <div><span className={`badge ${badgeClass}`}>{camp.status === 'ACTIVE' ? 'Activa' : camp.status === 'PAUSED' ? 'Pausada' : 'Archivada'}</span></div>
                          {canManage && ['ACTIVE', 'PAUSED'].includes(camp.status) && (
                            <button type="button" className="ads-meta-status-button" onClick={() => { setChangeMessage(null); setCampaignToChange(camp); }} disabled={Boolean(changingCampaignId)}>
                              {camp.status === 'ACTIVE' ? 'Pausar en Meta' : 'Activar en Meta'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td>{camp.start_time ? new Date(camp.start_time).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                      <td className="text-right tabular-nums">{formatPYG(m.presupuesto)}</td>
                      <td className="text-right tabular-nums">{formatPYG(m.importe_gastado)}</td>
                      <td className="text-right tabular-nums">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span className="cell-highlight">{isWs ? m.conversaciones : m.compras}</span>
                          <span style={{ fontSize: '13px', color: 'var(--color-fg-muted)' }}>{isWs ? 'Mensajes' : 'Compras'}</span>
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{formatPYG(isWs ? m.costo_por_conversacion : m.costo_por_compra)}</td>
                      <td className={`text-right tabular-nums ${roasClass}`}>{m.roas.toFixed(2)}x</td>
                      <td className="text-right tabular-nums">{formatPYG(m.valor_conversion)}</td>
                      <td className="text-right tabular-nums">{formatPct(isWs ? m.porcentaje_cierre : m.porcentaje_conversion, 2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-controls">
          <button onClick={handlePrevPage} disabled={historyCursors.length === 0 || loadingData}>
            <ChevronLeft size={16} /> Anterior
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)', fontWeight: 600 }}>
            {loadingData ? 'Cargando...' : `Página ${historyCursors.length + 1}`}
          </span>
          <button onClick={handleNextPage} disabled={!paging?.cursors?.after || loadingData}>
            Siguiente <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
