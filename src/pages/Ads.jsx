import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const Ads = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const status = await api.get('/api/meta/status');
                if (status.status !== 'conectado') {
                    setError('Meta Business no está conectado. Ve a Configuración para conectar tu cuenta.');
                    setLoading(false);
                    return;
                }
                const result = await api.get('/api/meta/data');
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>Ads & Campañas</h1>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
                Cargando datos de Meta...
            </div>
        </div>
    );

    if (error) return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>Ads & Campañas</h1>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>{error}</p>
                <a href="/settings" style={{ color: '#ff007f' }}>Ir a Configuración →</a>
            </div>
        </div>
    );

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>Ads & Campañas</h1>
                <p>
                    {data?.business_name && <><strong style={{ color: '#ff007f' }}>{data.business_name}</strong> · </>}
                    {data?.ad_accounts} cuenta{data?.ad_accounts !== 1 ? 's' : ''} publicitaria{data?.ad_accounts !== 1 ? 's' : ''}
                </p>
            </div>

            {data?.campaigns?.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
                    No hay campañas activas o pausadas en esta cuenta.
                </div>
            ) : (
                data?.campaigns?.map(camp => (
                    <div key={camp.id} className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{camp.name}</h3>
                                <small style={{ color: '#888' }}>{camp.ad_account}</small>
                            </div>
                            <span className={`status-badge ${camp.status === 'ACTIVE' ? 'active' : ''}`}>
                                {camp.status}
                            </span>
                        </div>

                        <div className="data-grid" style={{ marginBottom: 0 }}>
                            <div className="data-item">
                                <span className="label">Gasto</span>
                                <span className="value">{camp.insights.gasto}</span>
                            </div>
                            <div className="data-item">
                                <span className="label">Clicks</span>
                                <span className="value pink">{camp.insights.clicks?.toLocaleString()}</span>
                            </div>
                            <div className="data-item">
                                <span className="label">Impresiones</span>
                                <span className="value">{camp.insights.impresiones?.toLocaleString()}</span>
                            </div>
                            <div className="data-item">
                                <span className="label">CTR</span>
                                <span className="value">{camp.insights.ctr}</span>
                            </div>
                            <div className="data-item">
                                <span className="label">CPM</span>
                                <span className="value">{camp.insights.cpm}</span>
                            </div>
                            <div className="data-item">
                                <span className="label">CPC</span>
                                <span className="value">{camp.insights.cpc}</span>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default Ads;
