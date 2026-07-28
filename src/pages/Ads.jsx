import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Search, Filter, ChevronLeft, ChevronRight, MessageCircle, Globe } from 'lucide-react';
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

    // Initial load: Fetch filters
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const status = await api.get('/api/meta/status');
                if (status.status !== 'conectado') {
                    setError('Meta Business no está conectado. Ve a Configuración para conectar tu cuenta.');
                    setLoadingFilters(false);
                    return;
                }

                const res = await api.post('/api/meta/filters', {});
                setBusinesses(res.businesses || []);
                setAdAccounts(res.ad_accounts || []);
                
                if (res.businesses?.length > 0) {
                    const firstBusiness = res.businesses[0].id;
                    setSelectedBusiness(firstBusiness);
                    // Preselect first ad account of this business
                    const validAds = res.ad_accounts?.filter(a => a.business && a.business.id === firstBusiness) || [];
                    if (validAds.length > 0) {
                        setSelectedAdAccount(validAds[0].id);
                    }
                } else if (res.ad_accounts?.length > 0) {
                    setSelectedAdAccount(res.ad_accounts[0].id);
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setLoadingFilters(false);
            }
        };
        fetchFilters();
    }, []);

    // Fetch Campaign Options when Ad Account changes
    useEffect(() => {
        const fetchCampaignOptions = async () => {
            if (!selectedAdAccount) return;
            try {
                const res = await api.post('/api/meta/campaign-list', { ad_account_id: selectedAdAccount });
                setCampaignOptions(res.campaigns || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchCampaignOptions();
    }, [selectedAdAccount]);

    // Fetch Campaigns when filters or cursor changes
    const fetchCampaigns = async (cursor = null) => {
        if (!selectedAdAccount) return;
        
        setLoadingData(true);
        try {
            const body = {
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
            // Optionally set error or toast
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

    if (error) return (
        <div className="settings-container">
            <div className="settings-header"><h1>Ads & Campañas</h1></div>
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>{error}</p>
                <a href="/settings" style={{ color: '#ff007f' }}>Ir a Configuración →</a>
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

