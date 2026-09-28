import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Store } from 'lucide-react';
import { socialApi } from '../../services/automationHubApi';
import PrivacidadDatosCard from '../../components/PrivacidadDatosCard';

function FacebookIcon({ size = 18, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ size = 18, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

export default function AutomationSettings() {
  const [accounts, setAccounts] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estado para el selector de páginas
  const [fbPages, setFbPages] = useState([]);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [tempToken, setTempToken] = useState(null);

  useEffect(() => {
    const metaError = searchParams.get('meta_error');
    const fbSuccess = searchParams.get('fb_success');
    const igError = searchParams.get('ig_error');
    const igSuccess = searchParams.get('ig_success');
    
    // Si Meta manda seleccionar página
    const fbSelectPages = searchParams.get('fb_select_pages');
    const tokenParams = searchParams.get('temp_token');

    if (fbSelectPages && tokenParams) {
      setTempToken(tokenParams);
      setShowPageSelector(true);
      fetchFacebookPages(tokenParams);
      // Limpiar URL
      setSearchParams({});
    }

    if (metaError === 'true') {
      setError('No se pudo conectar Facebook o el usuario canceló.');
      setSearchParams({});
    } else if (metaError === 'no_pages') {
      setError('Tu cuenta de Facebook no tiene ninguna página (Fanpage) asociada.');
      setSearchParams({});
    }

    if (igError === 'true') {
      setError('No se pudo conectar Instagram o el usuario canceló.');
      setSearchParams({});
    }

    if (fbSuccess === 'true') {
      setSuccess('Página de Facebook conectada exitosamente.');
      setSearchParams({});
    }

    if (igSuccess === 'true') {
      setSuccess('Cuenta Profesional de Instagram conectada exitosamente.');
      setSearchParams({});
    }

    cargarCuentas();
  }, [searchParams, setSearchParams]);

  const cargarCuentas = async () => {
    try {
      setCargando(true);
      const data = await socialApi.getAccounts();
      setAccounts(data || []);
    } catch (e) {
      setError('No se pudieron cargar las redes sociales.');
    } finally {
      setCargando(false);
    }
  };

  const fetchFacebookPages = async (token) => {
    try {
      const pages = await socialApi.getFacebookPages(token);
      setFbPages(pages || []);
    } catch (err) {
      setError('No se pudieron obtener las páginas de Facebook.');
      setShowPageSelector(false);
    }
  };

  const handleSelectPage = async (page) => {
    try {
      await socialApi.saveFacebookPage({
        page_id: page.id,
        page_name: page.name,
        access_token: page.access_token
      });
      setSuccess(`Página "${page.name}" conectada.`);
      setShowPageSelector(false);
      cargarCuentas();
    } catch (err) {
      setError('Error al guardar la página.');
    }
  };

  const handleConnectFacebook = async () => {
    try {
      const url = await socialApi.getFacebookOAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError('No se pudo iniciar la conexión con Facebook.');
    }
  };

  const handleConnectInstagram = async () => {
    try {
      const url = await socialApi.getInstagramOAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError('No se pudo iniciar la conexión con Instagram.');
    }
  };

  const fbAccounts = accounts.filter(a => a.provider === 'facebook');
  const igAccounts = accounts.filter(a => a.provider === 'instagram');

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 relative">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">Configuración de Publicación</h1>
        <p className="text-sm text-fg-muted mt-1">
          Administrá las conexiones independientes para publicar en Facebook e Instagram desde el Automation Hub.
        </p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-success/20 bg-success/10 p-3 text-sm text-success flex items-center gap-2">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {showPageSelector && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-fg mb-4">Selecciona qué página conectar</h3>
            <div className="space-y-3">
              {fbPages.map(page => (
                <div key={page.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface hover:border-primary/50 transition-colors">
                  <div>
                    <p className="font-medium text-fg">{page.name}</p>
                    <p className="text-xs text-fg-muted">ID: {page.id}</p>
                  </div>
                  <button
                    onClick={() => handleSelectPage(page)}
                    className="px-4 py-1.5 bg-primary text-primary-fg rounded text-sm font-medium hover:bg-primary-hover"
                  >
                    Vincular
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
              <Store size={18} className="text-primary" />
              Cuentas Autorizadas
            </h2>
            <p className="text-sm text-fg-subtle">
              Conecta los perfiles donde el Hub podrá publicar contenido.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            
            {/* Tarjeta FACEBOOK */}
            <div className="flex flex-col justify-between rounded-lg border border-border bg-surface-2 p-5 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                  <FacebookIcon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-fg">Facebook Pages</h3>
                  <p className="text-xs text-fg-muted">Publicación en páginas</p>
                </div>
              </div>

              <div className="flex-1">
                {cargando ? (
                  <span className="text-xs text-fg-muted">Cargando...</span>
                ) : fbAccounts.length > 0 ? (
                  <div className="space-y-2">
                    {fbAccounts.map(acc => (
                      <div key={acc.id} className="text-sm text-success flex items-center gap-1 bg-success/10 px-2 py-1 rounded">
                        <CheckCircle2 size={14} /> {acc.account_name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-warning block mt-2">No hay páginas conectadas</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleConnectFacebook}
                className="w-full mt-2 rounded-md border border-blue-600/30 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 text-sm font-medium transition-colors"
              >
                Conectar Facebook
              </button>
            </div>

            {/* Tarjeta INSTAGRAM */}
            <div className="flex flex-col justify-between rounded-lg border border-border bg-surface-2 p-5 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/10 text-pink-600">
                  <InstagramIcon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-fg">Instagram Profesional</h3>
                  <p className="text-xs text-fg-muted">Publicación en feed y reels</p>
                </div>
              </div>

              <div className="flex-1">
                {cargando ? (
                  <span className="text-xs text-fg-muted">Cargando...</span>
                ) : igAccounts.length > 0 ? (
                  <div className="space-y-2">
                    {igAccounts.map(acc => (
                      <div key={acc.id} className="text-sm text-success flex items-center gap-1 bg-success/10 px-2 py-1 rounded">
                        <CheckCircle2 size={14} /> {acc.account_name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-warning block mt-2">No hay cuenta de IG conectada</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleConnectInstagram}
                className="w-full mt-2 rounded-md border border-pink-600/30 bg-pink-50 hover:bg-pink-100 text-pink-700 px-4 py-2 text-sm font-medium transition-colors"
              >
                Conectar Instagram
              </button>
            </div>

          </div>
        </div>

        <PrivacidadDatosCard />
      </div>
    </div>
  );
}
