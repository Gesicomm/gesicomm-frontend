import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';

const Settings = () => {
    const [metaStatus, setMetaStatus] = useState('loading');
    const [metaBusinessName, setMetaBusinessName] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [disconnecting, setDisconnecting] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const metaError = searchParams.get('meta_error');
        const metaSuccess = searchParams.get('meta_success');

        if (metaError) {
            setError(metaError);
            setSearchParams({});
        }
        if (metaSuccess) {
            setSuccess('Meta Business conectado exitosamente.');
            setSearchParams({});
        }

        checkMetaStatus();
    }, []);

    const checkMetaStatus = async () => {
        try {
            const data = await api.get('/api/meta/status');
            setMetaStatus(data.status);
            if (data.business_name) setMetaBusinessName(data.business_name);
        } catch (err) {
            setMetaStatus('desconectado');
        }
    };

    const handleConnectMeta = () => {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        window.location.href = `${baseUrl}/api/meta/connect`;
    };

    const handleDisconnectMeta = async () => {
        if (!window.confirm('¿Estás seguro de que querés desconectar Meta Business? Se eliminarán los tokens guardados.')) return;
        setDisconnecting(true);
        setError(null);
        try {
            await api.post('/api/meta/disconnect', {});
            setMetaStatus('desconectado');
            setMetaBusinessName(null);
            setSuccess('Meta Business desconectado correctamente.');
        } catch (err) {
            setError(err.message);
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>Configuración</h1>
                <p>Administra las integraciones y preferencias de tu cuenta.</p>
            </div>

            {error && (
                <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff0000', padding: '1rem', color: '#ff6b6b', borderRadius: '8px', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{ background: 'rgba(0,255,0,0.1)', border: '1px solid #00ff00', padding: '1rem', color: '#6bff6b', borderRadius: '8px', marginBottom: '1rem' }}>
                    {success}
                </div>
            )}

            <div className="card">
                <h3>Integración con Meta Business</h3>

                {metaStatus === 'loading' ? (
                    <p style={{ color: '#aaa' }}>Verificando estado...</p>
                ) : metaStatus === 'desconectado' ? (
                    <div>
                        <p style={{ marginBottom: '1.5rem', color: '#aaa' }}>
                            Conecta tu cuenta de Meta Business para visualizar métricas de campañas en <strong style={{ color: '#ff007f' }}>Ads & Campañas</strong>.
                        </p>
                        <button className="meta-connect-btn" onClick={handleConnectMeta}>
                            <span style={{ fontSize: '1.2rem' }}>∞</span> Conectar con Meta Business
                        </button>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <span className="status-badge active">Conectado</span>
                            {metaBusinessName && <span style={{ color: '#aaa' }}>{metaBusinessName}</span>}
                        </div>
                        <button
                            onClick={handleDisconnectMeta}
                            disabled={disconnecting}
                            style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,100,100,0.4)',
                                color: '#ff6b6b',
                                padding: '0.6rem 1.4rem',
                                borderRadius: '8px',
                                cursor: disconnecting ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            {disconnecting ? 'Desconectando...' : '⚠ Desconectar Meta'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
