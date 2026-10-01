import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { apiOrigin } from '../utils/apiBase';
import { Plus, Trash2, Store, CheckCircle, XCircle, Loader } from 'lucide-react';
import PrivacidadDatosCard from '../components/PrivacidadDatosCard';

const Settings = () => {
    const [tiendas, setTiendas] = useState([]);
    const [loadingTiendas, setLoadingTiendas] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const metaError = searchParams.get('meta_error');
        const metaSuccess = searchParams.get('meta_success');

        if (metaError) {
            setError(metaError);
            setSearchParams({});
        }
        if (metaSuccess) {
            setSuccess('Tienda conectada exitosamente.');
            setSearchParams({});
        }

        loadTiendas();
    }, []);

    const loadTiendas = async () => {
        setLoadingTiendas(true);
        try {
            const data = await api.get('/api/meta/stores');
            setTiendas(data.tiendas || []);
        } catch (err) {
            setError('No se pudieron cargar las tiendas.');
        } finally {
            setLoadingTiendas(false);
        }
    };

    const handleConnectMeta = (mode = 'connect') => {
        const baseUrl = apiOrigin();
        const currentPath = window.location.pathname;
        window.location.href = `${baseUrl}/api/meta/connect?mode=${mode}&redirect_to=${encodeURIComponent(currentPath)}`;
    };

    const handleDeleteTienda = async (id, nombre) => {
        if (!window.confirm(`¿Desconectar la tienda "${nombre}"? Se eliminarán sus tokens guardados.`)) return;
        setDeletingId(id);
        setError(null);
        try {
            await api.delete(`/api/meta/stores/${id}`);
            setSuccess(`Tienda "${nombre}" desconectada correctamente.`);
            setTiendas(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            setError(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const hayTiendas = tiendas.length > 0;

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
                {/* Cabecera de la sección */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                            width: '36px', height: '36px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #1877F2, #00b2ff)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Store size={18} color="var(--color-fg)" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Tiendas Conectadas (Meta Business)</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
                                {hayTiendas ? `${tiendas.length} tienda${tiendas.length > 1 ? 's' : ''} activa${tiendas.length > 1 ? 's' : ''}` : 'Ninguna tienda conectada'}
                            </p>
                        </div>
                    </div>
                    <button
                        className="meta-connect-btn"
                        onClick={() => handleConnectMeta(hayTiendas ? 'add_store' : 'connect')}
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <Plus size={15} />
                        {hayTiendas ? 'Agregar tienda' : 'Conectar tienda'}
                    </button>
                </div>

                {/* Lista de tiendas */}
                {loadingTiendas ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-fg-muted)', padding: '1rem 0' }}>
                        <Loader size={16} className="spin" /> Cargando tiendas...
                    </div>
                ) : !hayTiendas ? (
                    <div style={{ 
                        border: '1px dashed color-mix(in srgb, var(--color-fg) 10%, transparent)', borderRadius: '10px', 
                        padding: '2.5rem', textAlign: 'center', color: 'var(--color-fg-subtle)'
                    }}>
                        <Store size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                        <p style={{ margin: '0 0 1rem' }}>No tenés ninguna tienda conectada todavía.</p>
                        <p style={{ margin: 0, fontSize: '0.82rem' }}>
                            Conectá tu cuenta de Meta Business para visualizar métricas en <strong style={{ color: '#ff007f' }}>Ads & Campañas</strong>.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {tiendas.map((tienda, idx) => (
                            <div
                                key={tienda.id}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.85rem 1.1rem',
                                    background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
                                    border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)',
                                    borderRadius: '10px',
                                    transition: 'border-color 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                    {/* Badge Principal */}
                                    {idx === 0 && (
                                        <span style={{
                                            fontSize: '0.68rem', padding: '0.15rem 0.5rem',
                                            background: 'rgba(255,0,127,0.15)', color: '#ff007f',
                                            border: '1px solid rgba(255,0,127,0.3)', borderRadius: '4px',
                                            fontWeight: 600, letterSpacing: '0.05em'
                                        }}>PRINCIPAL</span>
                                    )}
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tienda.nombre || tienda.business_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-fg-subtle)', marginTop: '0.1rem' }}>
                                            BM ID: {tienda.business_id}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {tienda.estado === 'conectado' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6bff6b', fontSize: '0.8rem' }}>
                                            <CheckCircle size={14} /> Conectada
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ff6b6b', fontSize: '0.8rem' }}>
                                            <XCircle size={14} /> Desconectada
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDeleteTienda(tienda.id, tienda.nombre || tienda.business_name)}
                                        disabled={deletingId === tienda.id}
                                        title="Desconectar tienda"
                                        style={{
                                            background: 'transparent', border: '1px solid rgba(255,100,100,0.3)',
                                            color: '#ff6b6b', padding: '0.4rem 0.6rem', borderRadius: '6px',
                                            cursor: deletingId === tienda.id ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                                        }}
                                    >
                                        {deletingId === tienda.id ? <Loader size={14} className="spin" /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Metodo 1 de /data-deletion: la pantalla que un revisor de Meta
                sigue paso a paso durante la revision de la aplicacion. */}
            <PrivacidadDatosCard />
        </div>
    );
};

export default Settings;
