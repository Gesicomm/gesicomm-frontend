import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';

const Settings = () => {
    const [metaStatus, setMetaStatus] = useState('loading');
    const [metaData, setMetaData] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Leer query params (viene del redirect de facebook auth)
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        // Manejar los query params resultantes de la redirección de Meta
        const metaError = searchParams.get('meta_error');
        const metaSuccess = searchParams.get('meta_success');

        if (metaError) {
            setError(metaError);
            setSearchParams({}); // Limpiar URL
        }
        if (metaSuccess) {
            setSuccess('Meta Business conectado exitosamente.');
            setSearchParams({}); // Limpiar URL
        }

        checkMetaStatus();
    }, [searchParams, setSearchParams]);

    const checkMetaStatus = async () => {
        try {
            const data = await api.get('/api/meta/status');
            setMetaStatus(data.status);
            if (data.status === 'conectado') {
                fetchMetaData();
            }
        } catch (err) {
            console.error(err);
            setMetaStatus('desconectado');
            setError('No se pudo verificar el estado de Meta.');
        }
    };

    const fetchMetaData = async () => {
        try {
            const data = await api.get('/api/meta/data');
            setMetaData(data);
        } catch (err) {
            console.error(err);
            setError('Error al obtener datos de Meta.');
        }
    };

    const handleConnectMeta = () => {
        // En lugar de popup SDK o POST simulado, hacemos redirect completo (OAuth flow real)
        const baseUrl = import.meta.env.VITE_API_URL || '';
        window.location.href = `${baseUrl}/api/meta/connect`;
    };

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>Configuración</h1>
                <p>Administra las integraciones y preferencias de tu cuenta.</p>
            </div>

            {error && <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff0000', padding: '1rem', color: '#ff6b6b', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}
            {success && <div style={{ background: 'rgba(0,255,0,0.1)', border: '1px solid #00ff00', padding: '1rem', color: '#6bff6b', borderRadius: '8px', marginBottom: '1rem' }}>{success}</div>}

            <div className="card">
                <h3>Integración con Meta Business (Ads)</h3>
                
                {metaStatus === 'loading' ? (
                    <p>Verificando estado...</p>
                ) : metaStatus === 'desconectado' ? (
                    <div>
                        <p style={{ marginBottom: '1.5rem', color: '#aaa' }}>
                            Conecta tu cuenta de Meta Business para poder visualizar métricas de campañas de anuncios (Gasto, CTR, CPM).
                        </p>
                        <button 
                            className="meta-connect-btn" 
                            onClick={handleConnectMeta}
                        >
                            <span style={{ fontSize: '1.2rem' }}>∞</span> Conectar con Meta Business
                        </button>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <span className="status-badge active">Conectado</span>
                            <span style={{ color: '#aaa' }}>Business ID: {metaData?.business_id || 'Cargando...'}</span>
                        </div>

                        {metaData && (
                            <>
                                <h4 style={{ color: '#ff007f', marginBottom: '1rem' }}>Ads & Campaigns</h4>
                                {metaData.campaigns && metaData.campaigns.map(camp => (
                                    <div key={camp.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h5 style={{ margin: 0, fontSize: '1.2rem' }}>{camp.name}</h5>
                                            <span className={`status-badge ${camp.status.toLowerCase()}`}>{camp.status}</span>
                                        </div>
                                        
                                        <div className="data-grid" style={{ marginBottom: 0 }}>
                                            <div className="data-item">
                                                <span className="label">Presupuesto</span>
                                                <span className="value">{camp.insights.presupuesto}</span>
                                            </div>
                                            <div className="data-item">
                                                <span className="label">Gasto</span>
                                                <span className="value">{camp.insights.gasto}</span>
                                            </div>
                                            <div className="data-item">
                                                <span className="label">Clicks</span>
                                                <span className="value pink">{camp.insights.clicks}</span>
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
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
