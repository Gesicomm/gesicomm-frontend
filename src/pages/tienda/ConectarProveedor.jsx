import { useEffect, useState } from 'react';
import { ArrowLeft, Loader } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { tiendaService } from '../../services/tiendaService';
import ConexionLogistica from './ConexionLogistica';
import './tienda.css';
import './conectarProveedor.css';

const PROVEEDORES_CON_CONEXION = {
  raha: { nombre: 'RAHA', componente: ConexionLogistica },
};

export default function ConectarProveedor() {
  const { proveedorId } = useParams();
  const proveedor = PROVEEDORES_CON_CONEXION[proveedorId];
  const [tienda, setTienda] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const Conexion = proveedor?.componente;

  useEffect(() => {
    let vigente = true;
    tiendaService.obtener()
      .then(data => { if (vigente) setTienda(data); })
      .catch(() => { if (vigente) setError('No pudimos cargar los datos de tu negocio. Volvé a intentar.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  return <main className="tn-page">
    <header className="tn-page-head">
      <Link to={`/mi-tienda/buscar-servicios/${proveedorId}`} className="tn-provider-back"><ArrowLeft size={18} /> Volver a {proveedor?.nombre || 'proveedores'}</Link>
      <div><h1>{proveedor ? `Afiliar mi negocio a ${proveedor.nombre}` : 'Afiliar mi negocio'}</h1><p>Iniciá el proceso de afiliación. El proveedor revisará tu solicitud antes de habilitar la conexión.</p></div>
    </header>
    {!proveedor ? <section className="tn-panel"><p>Este proveedor todavía no tiene un flujo de conexión configurado.</p><Link to="/mi-tienda/buscar-servicios">Volver a buscar proveedores</Link></section>
      : cargando ? <div className="tn-loading" role="status"><Loader size={22} className="spin-icon" /><p>Cargando la conexión…</p></div>
        : error ? <p className="land-alert-error tn-alert" role="alert">{error}</p>
          : <Conexion tienda={tienda} />}
  </main>;
}
