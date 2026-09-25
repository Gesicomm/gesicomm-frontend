import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Loader, AlertCircle, Check, FileSpreadsheet } from 'lucide-react';
import { vitrinaService } from '../../services/vitrinaService';

/**
 * Importar precios de venta desde el Excel de "Exportar".
 *
 * Dos pasos: al elegir el archivo el backend lo valida sin escribir nada
 * (vista previa con cambios y errores); recién al confirmar se reenvía el
 * mismo archivo con aplicar=true. Las filas con error nunca se aplican.
 */

function formatGs(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 });
}

function mensajeError(err) {
  return err.response?.data?.message || err.message || 'No se pudo procesar el archivo.';
}

export default function ImportarPreciosModal({ abierto, onCerrar, onAplicado }) {
  const inputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [previa, setPrevia] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  if (!abierto) return null;

  function reiniciar() {
    setArchivo(null);
    setPrevia(null);
    setResultado(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function cerrar() {
    if (procesando) return;
    reiniciar();
    onCerrar();
  }

  async function elegirArchivo(e) {
    const file = e.target.files?.[0];
    // Se limpia para que volver a elegir el mismo archivo (corregido en
    // Excel) dispare onChange de nuevo. El File queda en el estado.
    e.target.value = '';
    if (!file) return;
    setPrevia(null);
    setResultado(null);
    setError(null);
    setProcesando(true);
    try {
      // Copia en memoria: lo que se aplica tiene que ser exactamente lo que
      // se previsualizó, aunque el usuario siga editando el Excel en disco.
      const copia = new File([await file.arrayBuffer()], file.name, { type: file.type });
      setArchivo(copia);
      setPrevia(await vitrinaService.importarPreciosExcel(copia));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setProcesando(false);
    }
  }

  async function aplicar() {
    if (!archivo || !previa?.a_actualizar) return;
    setProcesando(true);
    setError(null);
    try {
      const r = await vitrinaService.importarPreciosExcel(archivo, { aplicar: true });
      setResultado(r);
      onAplicado?.(r);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setProcesando(false);
    }
  }

  const datos = resultado || previa;

  return createPortal(
    <div className="vit-modal-overlay" onClick={cerrar}>
      <div className="vit-modal vit-import-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="vit-modal-header">
          <div>
            <h2>Importar precios de venta</h2>
            <p>Subí el Excel de "Exportar" con la columna "Precio nuevo" cargada. Antes de aplicar vas a ver qué cambia.</p>
          </div>
          <button className="vit-modal-close" onClick={cerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="vit-modal-body">
          {!resultado && (
            <label className={`vit-import-drop ${procesando ? 'is-busy' : ''}`}>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={elegirArchivo}
                disabled={procesando}
                hidden
              />
              {procesando && !previa
                ? <Loader size={22} className="spin-icon" />
                : <FileSpreadsheet size={22} />}
              <span className="vit-import-drop-title">
                {archivo ? archivo.name : 'Elegir archivo .xlsx'}
              </span>
              <span className="vit-import-drop-hint">
                {procesando && !previa
                  ? 'Validando…'
                  : archivo ? 'Hacé clic para elegir otro archivo' : 'Lo mínimo es una columna SKU (o Tipo + ID) y "Precio nuevo".'}
              </span>
            </label>
          )}

          {error && (
            <div className="vit-inline-error" role="alert">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {resultado && (
            <div className="vit-import-ok" role="status">
              <Check size={18} />
              {resultado.actualizados === 1
                ? 'Se actualizó 1 precio.'
                : `Se actualizaron ${formatGs(resultado.actualizados)} precios.`}
            </div>
          )}

          {datos && (
            <>
              <div className="vit-sensib-summary">
                <div className="vit-sensib-metric">
                  <span className="label">{resultado ? 'Actualizados' : 'A actualizar'}</span>
                  <span className="value">{formatGs(resultado ? resultado.actualizados : datos.a_actualizar)}</span>
                </div>
                <div className="vit-sensib-metric">
                  <span className="label">Sin cambios</span>
                  <span className="value">{formatGs(datos.sin_cambios)}</span>
                  <span className="hint">mismo precio que el actual</span>
                </div>
                <div className="vit-sensib-metric">
                  <span className="label">Sin precio nuevo</span>
                  <span className="value">{formatGs(datos.filas_sin_precio)}</span>
                  <span className="hint">se ignoran</span>
                </div>
                <div className="vit-sensib-metric">
                  <span className="label">Con error</span>
                  <span className={`value ${datos.total_errores ? 'vit-import-num-error' : ''}`}>{formatGs(datos.total_errores)}</span>
                  <span className="hint">no se aplican</span>
                </div>
              </div>

              {datos.total_errores > 0 && (
                <section>
                  <p className="vit-sensib-table-title">
                    Filas con error
                    {datos.total_errores > datos.errores.length && ` (se muestran ${datos.errores.length} de ${formatGs(datos.total_errores)})`}
                  </p>
                  <div className="vit-import-table-wrap">
                    <table className="vit-sensitivity-table vit-import-table">
                      <thead>
                        <tr><th>Fila</th><th>Producto</th><th>Motivo</th></tr>
                      </thead>
                      <tbody>
                        {datos.errores.map((e, i) => (
                          <tr key={`${e.fila}-${i}`}>
                            <td>{e.fila}</td>
                            <td>{e.nombre || e.sku || '—'}{e.nombre && e.sku ? <small> · {e.sku}</small> : null}</td>
                            <td className="vit-import-motivo">{e.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {!resultado && datos.cambios.length > 0 && (
                <section>
                  <p className="vit-sensib-table-title">
                    Cambios
                    {datos.a_actualizar > datos.cambios.length && ` (se muestran ${datos.cambios.length} de ${formatGs(datos.a_actualizar)})`}
                  </p>
                  <div className="vit-import-table-wrap">
                    <table className="vit-sensitivity-table vit-import-table">
                      <thead>
                        <tr><th>Producto</th><th className="num">Actual</th><th className="num">Nuevo</th></tr>
                      </thead>
                      <tbody>
                        {datos.cambios.map(c => (
                          <tr key={`${c.tipo}-${c.id}`}>
                            <td>{c.nombre}{c.sku ? <small> · {c.sku}</small> : c.tipo === 'combo' ? <small> · combo</small> : null}</td>
                            <td className="num">Gs {formatGs(c.precio_actual)}</td>
                            <td className="num">Gs {formatGs(c.precio_nuevo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}

          <div className="vit-import-actions">
            {resultado ? (
              <button type="button" className="btn-primary" onClick={cerrar}>Listo</button>
            ) : (
              <>
                <button type="button" className="btn-secondary" onClick={cerrar} disabled={procesando}>Cancelar</button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={aplicar}
                  disabled={procesando || !previa?.a_actualizar}
                >
                  {procesando && previa ? <Loader size={15} className="spin-icon" /> : <Upload size={15} />}
                  {previa?.a_actualizar
                    ? `Actualizar ${formatGs(previa.a_actualizar)} ${previa.a_actualizar === 1 ? 'precio' : 'precios'}`
                    : 'Actualizar precios'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
