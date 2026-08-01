import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Search, Filter, ChevronLeft, ChevronRight, MessageCircle, Globe, Store, ArrowRight, AlertTriangle } from 'lucide-react';
import Select from 'react-select';

const selectStyles = {
    control: (base, state) => ({
        ...base,
        background: '#141416',
        borderColor: state.isFocused ? 'var(--bg-primary)' : 'var(--border-border)',
        boxShadow: 'none',
        borderRadius: '6px',
        padding: '0',
        minHeight: '38px',
        '&:hover': {
            borderColor: 'var(--bg-primary)'
        }
    }),
    menu: (base) => ({
        ...base,
        background: '#141416',
        border: '1px solid var(--border-border)',
        zIndex: 10
    }),
    option: (base, state) => ({
        ...base,
        background: state.isFocused ? '#1a1a1c' : '#141416',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.85rem',
        '&:active': {
            background: 'rgba(255, 255, 255, 0.1)'
        }
    }),
    singleValue: (base) => ({
        ...base,
        color: '#fff',
        fontSize: '0.85rem'
    }),
    input: (base) => ({
        ...base,
        color: '#fff',
        fontSize: '0.85rem'
    })
};

const formatPYG = (value) => {
    return new Intl.NumberFormat('es-PY', { 
        style: 'currency', 
        currency: 'PYG',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value || 0);
};

const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
};

const Ads = () => {
    // Tiendas
    const [tiendas, setTiendas] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null); // { id, nombre }

    // Select options
    const [businesses, setBusinesses] = useState([]);
    const [adAccounts, setAdAccounts] = useState([]);
    const [campaignOptions, setCampaignOptions] = useState([]);
    
    // Filters
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [selectedAdAccount, setSelectedAdAccount] = useState('');
    const [selectedCampaign, setSelectedCampaign] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    
    // Data
    const [campaigns, setCampaigns] = useState([]);
    const [paging, setPaging] = useState(null);
    const [historyCursors, setHistoryCursors] = useState([]); // To go back
    const [currentCursor, setCurrentCursor] = useState(null);
    
    // UI State
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState(null);
    const [noStores, setNoStores] = useState(false);

    // Carga inicial: tiendas y filtros de la primera tienda
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

                // Auto-seleccionar la primera tienda
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

    // Fetch Campaign Options when Ad Account changes
    useEffect(() => {
        const fetchCampaignOptions = async () => {
            if (!selectedAdAccount || !selectedStore) return;
            try {
                const res = await api.post('/api/meta/campaign-list', { 
                    ad_account_id: selectedAdAccount,
                    store_id: selectedStore.id
                });
                setCampaignOptions(res.campaigns || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchCampaignOptions();
    }, [selectedAdAccount]);

    // Fetch Campaigns when filters or cursor changes
    const fetchCampaigns = async (cursor = null) => {
        if (!selectedAdAccount || !selectedStore) return;
        
        setLoadingData(true);
        try {
            const body = {
                store_id: selectedStore.id,
                business_id: selectedBusiness,
                ad_account_id: selectedAdAccount,
                campaign_id: selectedCampaign,
                status: selectedStatus,
                date_start: dateStart,
                date_end: dateEnd,
                cursor: cursor
            };
            
            const res = await api.post('/api/meta/campaigns', body);
            setCampaigns(res.campaigns || []);
            setPaging(res.paging || null);
            setCurrentCursor(cursor);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };

    // Trigger fetch on filter change (reset cursor)
    useEffect(() => {
        if (selectedAdAccount && !loadingFilters) {
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

    // Estado informativo (setup pendiente): no es un error, es "todavía no conectaste nada".
    if (noStores) return (
        <div className="settings-container">
            <div className="settings-header"><h1>Ads & Campañas</h1></div>
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-8 py-14 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Store size={20} />
                </div>
                <p className="m-0 max-w-sm text-sm text-fg-muted">No tenés tiendas conectadas todavía. Conectá tu cuenta de Meta para ver métricas acá.</p>
                <a
                  href={window.location.pathname.startsWith('/mis-anuncios') ? '/configuracion' : '/settings'}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Ir a Configuración <ArrowRight size={14} />
                </a>
            </div>
        </div>
    );

    // Error real (falló la petición a la API).
    if (error) return (
        <div className="settings-container">
            <div className="settings-header"><h1>Ads & Campañas</h1></div>
            <div className="flex flex-col items-center gap-3 rounded-xl border border-danger/20 bg-danger/5 px-8 py-14 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
                    <AlertTriangle size={20} />
                </div>
                <p className="m-0 max-w-sm text-sm text-danger">{error}</p>
                <a
                  href={window.location.pathname.startsWith('/mis-anuncios') ? '/configuracion' : '/settings'}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Ir a Configuración <ArrowRight size={14} />
                </a>
            </div>
        </div>
    );

    return (
        <div className="settings-container" style={{ maxWidth: '100%' }}>
            <div className="settings-header">
                <h1>Ads & Campañas</h1>
                <p>Gestión avanzada de métricas estilo Escalafy</p>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                {/* Selector de Tienda */}
                {tiendas.length > 1 && (
                    <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Tienda</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {tiendas.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setSelectedStore(t);
                                        loadFiltersForStore(t.id);
                                    }}
                                    style={{
                                        padding: '0.4rem 1rem',
                                        borderRadius: '20px',
                                        border: selectedStore?.id === t.id
                                            ? '1px solid var(--bg-primary, #ff007f)'
                                            : '1px solid rgba(255,255,255,0.15)',
                                        background: selectedStore?.id === t.id
                                            ? 'var(--vit-accent-soft, rgba(255,0,127,0.15))'
                                            : 'transparent',
                                        color: selectedStore?.id === t.id ? 'var(--bg-primary, #ff007f)' : '#aaa',
                                        fontSize: '0.82rem',
                                        fontWeight: selectedStore?.id === t.id ? 600 : 400,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
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
                        value={businesses.map(b => ({value: b.id, label: b.name})).find(opt => opt.value === selectedBusiness) || null}
                        onChange={opt => {
                            const newBusiness = opt ? opt.value : '';
                            setSelectedBusiness(newBusiness);
                            const validAds = adAccounts.filter(a => a.business && a.business.id === newBusiness);
                            if (validAds.length > 0) {
                                setSelectedAdAccount(validAds[0].id);
                            } else {
                                setSelectedAdAccount('');
                            }
                            setSelectedCampaign('ALL');
                        }}
                        options={businesses.map(b => ({value: b.id, label: b.name}))}
                        isDisabled={loadingFilters}
                        placeholder="Buscar portafolio..."
                        isSearchable
                    />
                </div>

                <div className="filter-group">
                    <label>Cuenta Publicitaria</label>
                    <Select 
                        styles={selectStyles}
                        value={adAccounts.filter(a => a.business && a.business.id === selectedBusiness).map(a => ({value: a.id, label: a.name})).find(opt => opt.value === selectedAdAccount) || null}
                        onChange={opt => { 
                            setSelectedAdAccount(opt ? opt.value : ''); 
                            setSelectedCampaign('ALL'); 
                        }}
                        options={adAccounts.filter(a => a.business && a.business.id === selectedBusiness).map(a => ({value: a.id, label: a.name}))}
                        isDisabled={loadingFilters}
                        placeholder="Buscar cuenta..."
                        isSearchable
                    />
                </div>

                <div className="filter-group">
                    <label>Campaña</label>
                    <Select 
                        styles={selectStyles}
                        value={[{value: 'ALL', label: 'Todas las campañas'}, ...campaignOptions.map(c => ({value: c.id, label: c.name}))].find(opt => opt.value === selectedCampaign) || null}
                        onChange={opt => setSelectedCampaign(opt ? opt.value : 'ALL')}
                        options={[{value: 'ALL', label: 'Todas las campañas'}, ...campaignOptions.map(c => ({value: c.id, label: c.name}))]}
                        isDisabled={loadingFilters || campaignOptions.length === 0}
                        placeholder="Buscar campaña..."
                        isSearchable
                    />
                </div>

                <div className="filter-group">
                    <label>Estado</label>
                    <select 
                        className="filter-input" 
                        value={selectedStatus} 
                        onChange={e => setSelectedStatus(e.target.value)}
                        disabled={loadingFilters}
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="ACTIVE">Activas</option>
                        <option value="PAUSED">Pausadas</option>
                        <option value="ARCHIVED">Archivadas</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Fecha Desde</label>
                    <input 
                        type="date" 
                        className="filter-input" 
                        value={dateStart}
                        onChange={e => setDateStart(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label>Fecha Hasta</label>
                    <input 
                        type="date" 
                        className="filter-input"
                        value={dateEnd}
                        onChange={e => setDateEnd(e.target.value)} 
                    />
                </div>
            </div>

            {/* Data Table */}
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
                                            <div className="skeleton-row" style={{ width: '100%' }}></div>
                                            <div className="skeleton-row" style={{ width: '60%', opacity: 0.5, height: '12px' }}></div>
                                        </td>
                                    </tr>
                                ))
                            ) : campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted-foreground)' }}>
                                        <Filter size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                        <p>No hay campañas que coincidan con estos filtros.</p>
                                    </td>
                                </tr>
                            ) : (
                                campaigns.map(camp => {
                                    const m = camp.metrics;
                                    const isWs = camp.type === 'whatsapp';
                                    
                                    // Determinar Badge CSS
                                    let badgeClass = 'badge-archived';
                                    if (camp.status === 'ACTIVE') badgeClass = 'badge-active';
                                    if (camp.status === 'PAUSED') badgeClass = 'badge-paused';

                                    // Determinar ROAS Color
                                    let roasClass = 'text-neutral';
                                    if (m.roas > 1) roasClass = 'text-success';
                                    else if (m.roas > 0 && m.roas <= 1) roasClass = 'text-danger';

                                    return (
                                        <tr key={camp.id}>
                                            <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {isWs ? <MessageCircle size={18} color="#10b981"/> : <Globe size={18} color="#3b82f6"/>}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{camp.name}</span>
                                                    <div>
                                                        <span className={`badge ${badgeClass}`}>{camp.status}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {camp.start_time ? new Date(camp.start_time).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="text-right tabular-nums">{formatPYG(m.presupuesto)}</td>
                                            <td className="text-right tabular-nums">{formatPYG(m.importe_gastado)}</td>
                                            
                                            <td className="text-right tabular-nums">
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span className="cell-highlight">{isWs ? m.conversaciones : m.compras}</span>
                                                    <span style={{ fontSize: '10px', color: '#888' }}>{isWs ? 'Mensajes' : 'Compras'}</span>
                                                </div>
                                            </td>
                                            
                                            <td className="text-right tabular-nums">{formatPYG(isWs ? m.costo_por_conversacion : m.costo_por_compra)}</td>
                                            
                                            <td className={`text-right tabular-nums ${roasClass}`}>{m.roas.toFixed(2)}x</td>
                                            
                                            <td className="text-right tabular-nums">{formatPYG(m.valor_conversion)}</td>
                                            
                                            <td className="text-right tabular-nums">{formatPercent(isWs ? m.porcentaje_cierre : m.porcentaje_conversion)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Footer */}
                <div className="pagination-controls">
                    <button 
                        onClick={handlePrevPage} 
                        disabled={historyCursors.length === 0 || loadingData}
                    >
                        <ChevronLeft size={16}/> Anterior
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted-foreground)', fontWeight: 600 }}>
                        {loadingData ? 'Cargando...' : `Página ${historyCursors.length + 1}`}
                    </span>
                    <button 
                        onClick={handleNextPage} 
                        disabled={!paging?.cursors?.after || loadingData}
                    >
                        Siguiente <ChevronRight size={16}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Ads;

