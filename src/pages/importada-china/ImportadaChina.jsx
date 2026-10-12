import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, Loader2, PackageSearch, Send } from 'lucide-react';
import { importadaChinaService } from '../../services/importadaChina.service';
import './importadaChina.css';

function normalizarError(error) {
  return error?.response?.data?.message || error?.response?.data?.error || error.message || 'No se pudo enviar la solicitud.';
}

export default function ImportadaChina() {
  const [productoUrl, setProductoUrl] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ultimoLink, setUltimoLink] = useState('');

  const enviar = async (event) => {
    event.preventDefault();
    const url = productoUrl.trim();
    if (!url) {
      toast.error('Pegá el link del producto.');
      return;
    }

    setEnviando(true);
    try {
      await importadaChinaService.solicitar({ producto_url: url });
      setUltimoLink(url);
      setProductoUrl('');
      toast.success('Solicitud enviada al administrador.');
    } catch (error) {
      toast.error(normalizarError(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="china-page">
      <div className="china-shell">
        <div className="china-heading">
          <div className="china-icon" aria-hidden="true">
            <PackageSearch size={22} />
          </div>
          <div>
            <p className="china-kicker">Operaciones</p>
            <h1>Importada de China</h1>
            <p>Enviá el link del producto que querés importar. El administrador lo recibirá para revisarlo.</p>
          </div>
        </div>

        <form className="china-form" onSubmit={enviar}>
          <label htmlFor="producto-url">Link del producto</label>
          <div className="china-input-row">
            <span className="china-input-icon" aria-hidden="true">
              <ExternalLink size={16} />
            </span>
            <input
              id="producto-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://..."
              value={productoUrl}
              onChange={(event) => setProductoUrl(event.target.value)}
              disabled={enviando}
            />
          </div>
          <button type="submit" disabled={enviando}>
            {enviando ? <Loader2 size={16} className="china-spin" /> : <Send size={16} />}
            Enviar al administrador
          </button>
        </form>

        {ultimoLink && (
          <div className="china-success" role="status">
            <strong>Última solicitud enviada</strong>
            <a href={ultimoLink} target="_blank" rel="noreferrer">{ultimoLink}</a>
          </div>
        )}
      </div>
    </section>
  );
}
