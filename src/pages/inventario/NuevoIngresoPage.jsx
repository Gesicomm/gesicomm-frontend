import React, { useState, useEffect } from 'react';
import { Package, Truck, ArrowRight, ArrowLeft, CheckCircle2, Warehouse, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function NuevoIngresoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Paso 1: Seleccion
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState([]); // { producto_id, variante_id, producto, variante, cantidad_declarada }

  // Paso 2: Destino
  const [centros, setCentros] = useState([]);
  const [centroSeleccionado, setCentroSeleccionado] = useState(null);

  useEffect(() => {
    cargarProductos();
    cargarCentros();
    if (location.state?.preseleccionarProducto) {
      const p = location.state.preseleccionarProducto;
      setSeleccionados([{
        producto_id: p.id,
        variante_id: null,
        producto: p,
        variante: null,
        cantidad_declarada: 1
      }]);
    }
  }, [location]);

  const cargarProductos = async () => {
    try {
      const token = localStorage.getItem('gesicom_token') || localStorage.getItem('token');
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/productos/listado`, { limit: 100 }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      setProductos(data.filas || []);
    } catch (error) {
      console.error(error);
    }
  };

  const cargarCentros = async () => {
    try {
      const token = localStorage.getItem('gesicom_token') || localStorage.getItem('token');
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/depositos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      // Filtrar solo los de alcance GESICOMM
      const centrosFulfillment = data.filter(d => d.alcance === 'GESICOMM');
      setCentros(centrosFulfillment);
      if (centrosFulfillment.length === 1) {
        setCentroSeleccionado(centrosFulfillment[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleSeleccion = (prod, vari = null) => {
    const idx = seleccionados.findIndex(s => s.producto_id === prod.id && (vari ? s.variante_id === vari.id : true));
    if (idx >= 0) {
      const copy = [...seleccionados];
      copy.splice(idx, 1);
      setSeleccionados(copy);
    } else {
      setSeleccionados([...seleccionados, {
        producto_id: prod.id,
        variante_id: vari ? vari.id : null,
        producto: prod,
        variante: vari,
        cantidad_declarada: 1
      }]);
    }
  };

  const updateCantidad = (idx, qty) => {
    const val = parseInt(qty, 10);
    const copy = [...seleccionados];
    copy[idx].cantidad_declarada = isNaN(val) || val < 1 ? 1 : val;
    setSeleccionados(copy);
  };

  const handleGenerarIngreso = async () => {
    if (!centroSeleccionado) {
      toast.error('Debe seleccionar un Centro de Destino.');
      return;
    }
    if (seleccionados.length === 0) {
      toast.error('Debe agregar al menos un producto.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('gesicom_token');
      const payload = {
        centro_gesicomm_id: centroSeleccionado,
        items: seleccionados.map(s => ({
          producto_id: s.producto_id,
          variante_id: s.variante_id,
          cantidad_declarada: s.cantidad_declarada
        }))
      };

      // Crear borrador
      const { data: borrador } = await axios.post(`${import.meta.env.VITE_API_URL}/api/inventario/ingresos`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Pasar a pendiente de envio directo, porque el wizard ya confirma la intencion
      await axios.post(`${import.meta.env.VITE_API_URL}/api/inventario/ingresos/${borrador.id}/confirmar-envio`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('¡Aviso de envío generado correctamente!');
      navigate('/inventario');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al generar el ingreso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 overflow-hidden">
      <div className="px-6 py-5 bg-surface border-b border-surface-border">
        <h1 className="text-xl font-bold text-fg mb-1">Nuevo Ingreso a Fulfillment</h1>
        <p className="text-sm text-fg-muted">Enviá tu stock a los centros de Gesicomm para que nos encarguemos del picking y empaquetado.</p>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
        {/* Stepper Header */}
        <div className="flex items-center justify-between mb-8">
          <div className={`flex flex-col items-center ${paso >= 1 ? 'text-primary' : 'text-fg-muted'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${paso >= 1 ? 'border-primary bg-primary/10' : 'border-surface-border'}`}>
              <Package size={20} />
            </div>
            <span className="text-sm font-medium">1. Productos</span>
          </div>
          <div className={`flex-1 h-px mx-4 ${paso >= 2 ? 'bg-primary' : 'bg-surface-border'}`}></div>
          <div className={`flex flex-col items-center ${paso >= 2 ? 'text-primary' : 'text-fg-muted'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${paso >= 2 ? 'border-primary bg-primary/10' : 'border-surface-border'}`}>
              <Warehouse size={20} />
            </div>
            <span className="text-sm font-medium">2. Destino</span>
          </div>
          <div className={`flex-1 h-px mx-4 ${paso >= 3 ? 'bg-primary' : 'bg-surface-border'}`}></div>
          <div className={`flex flex-col items-center ${paso >= 3 ? 'text-primary' : 'text-fg-muted'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${paso >= 3 ? 'border-primary bg-primary/10' : 'border-surface-border'}`}>
              <CheckCircle2 size={20} />
            </div>
            <span className="text-sm font-medium">3. Revisión</span>
          </div>
        </div>

        {/* CONTENIDO DE LOS PASOS */}
        <div className="bg-surface border border-surface-border rounded-xl shadow-sm p-6 mb-6">
          
          {paso === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-fg mb-4">Seleccioná los productos a enviar</h2>
              
              <div className="flex gap-6">
                {/* Buscador */}
                <div className="w-1/2 border-r border-surface-border pr-6">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o SKU..."
                      className="w-full pl-10 pr-4 py-2 bg-surface border border-surface-border rounded-lg text-sm focus:outline-none focus:border-primary"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-auto pr-2">
                    {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.sku || '').toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                      <div key={p.id} className="border border-surface-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => p.Variantes?.length ? null : toggleSeleccion(p)}>
                        <div className="flex gap-3 items-center">
                          {p.imagen_principal ? (
                            <img src={p.imagen_principal} className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 bg-surface-2 rounded flex items-center justify-center text-fg-muted"><Package size={20}/></div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{p.nombre}</p>
                            <p className="text-xs text-fg-muted">{p.sku || 'Sin SKU'}</p>
                          </div>
                        </div>
                        {/* Variantes */}
                        {p.Variantes && p.Variantes.length > 0 && (
                          <div className="mt-3 pl-15 space-y-2 border-t border-surface-border pt-2">
                            {p.Variantes.map(v => (
                              <div key={v.id} className="flex items-center justify-between" onClick={(e) => { e.stopPropagation(); toggleSeleccion(p, v); }}>
                                <span className="text-xs text-fg-muted">{v.atributos || v.sku || `Variante ${v.id}`}</span>
                                <input type="checkbox" checked={seleccionados.some(s => s.variante_id === v.id)} readOnly className="rounded border-surface-border text-primary focus:ring-primary" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seleccionados y Cantidades */}
                <div className="w-1/2 pl-6">
                  <h3 className="font-medium text-sm mb-4">Productos a incluir ({seleccionados.length})</h3>
                  {seleccionados.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-fg-muted bg-surface-50 rounded-lg border border-dashed border-surface-border">
                      <p className="text-sm">No has seleccionado ningún producto.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {seleccionados.map((sel, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-surface-50 p-3 rounded-lg border border-surface-border">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{sel.producto.nombre}</p>
                            {sel.variante && <p className="text-xs text-fg-muted">{sel.variante.atributos}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-fg-muted">Cant:</label>
                            <input
                              type="number"
                              min="1"
                              className="w-20 px-2 py-1 text-sm border border-surface-border rounded bg-surface"
                              value={sel.cantidad_declarada}
                              onChange={(e) => updateCantidad(idx, e.target.value)}
                            />
                            <button onClick={() => toggleSeleccion(sel.producto, sel.variante)} className="text-danger-text hover:bg-danger/10 p-1 rounded transition-colors ml-2">
                              <Search size={16} className="opacity-0" /> {/* Solo por espaciado, deberia ser una X */}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="max-w-xl mx-auto py-8">
              <h2 className="text-lg font-semibold text-fg mb-2">Seleccioná el Centro de Destino</h2>
              <p className="text-sm text-fg-muted mb-6">Elegí a cuál de nuestros centros enviarás la mercadería.</p>
              
              <div className="space-y-4">
                {centros.map(c => (
                  <div 
                    key={c.id} 
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${centroSeleccionado === c.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-surface-border hover:border-primary/50'}`}
                    onClick={() => setCentroSeleccionado(c.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${centroSeleccionado === c.id ? 'bg-primary text-primary-text' : 'bg-surface-2 text-fg-muted'}`}>
                        <Warehouse size={20} />
                      </div>
                      <div>
                        <h3 className="font-medium">{c.nombre}</h3>
                        <p className="text-sm text-fg-muted">{c.ciudad}{c.departamento ? `, ${c.departamento}` : ''}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paso === 3 && (
            <div className="max-w-2xl mx-auto py-8">
              <h2 className="text-lg font-semibold text-fg mb-6 text-center">Resumen del Ingreso</h2>
              
              <div className="bg-surface-50 border border-surface-border rounded-xl p-6 mb-6">
                <div className="flex justify-between items-start mb-6 pb-6 border-b border-surface-border">
                  <div>
                    <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Destino</p>
                    <p className="font-medium flex items-center gap-2"><Warehouse size={16} className="text-primary"/> {centros.find(c => c.id === centroSeleccionado)?.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">Total Unidades</p>
                    <p className="font-medium text-lg text-primary">{seleccionados.reduce((acc, s) => acc + s.cantidad_declarada, 0)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Detalle de mercadería</p>
                  <div className="space-y-2">
                    {seleccionados.map((sel, i) => (
                      <div key={i} className="flex justify-between text-sm py-1">
                        <span className="text-fg">{sel.producto.nombre} {sel.variante ? `(${sel.variante.atributos})` : ''}</span>
                        <span className="font-medium">x{sel.cantidad_declarada}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-info/10 border border-info/20 rounded-lg p-4 text-sm text-info-text flex items-start gap-3">
                <Truck size={20} className="shrink-0 mt-0.5" />
                <p>Al confirmar, se generará un aviso de envío con estado <strong>Pendiente de envío</strong>. Gesicomm esperará recibir estas cantidades en el centro seleccionado para ingresarlas a tu stock disponible.</p>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER WIZARD */}
        <div className="flex justify-between">
          <button
            onClick={() => paso === 1 ? navigate('/inventario') : setPaso(p => p - 1)}
            className="px-6 py-2 border border-surface-border rounded-lg font-medium hover:bg-surface-2 transition-colors text-fg"
          >
            {paso === 1 ? 'Cancelar' : 'Atrás'}
          </button>
          
          {paso < 3 ? (
            <button
              onClick={() => setPaso(p => p + 1)}
              disabled={paso === 1 && seleccionados.length === 0}
              className="px-6 py-2 bg-primary text-primary-text rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Siguiente <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleGenerarIngreso}
              disabled={loading}
              className="px-6 py-2 bg-success text-success-text rounded-lg font-medium hover:bg-success/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Procesando...' : 'Confirmar e Informar Envío'} <CheckCircle2 size={18} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
