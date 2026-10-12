import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader, UploadCloud, X } from 'lucide-react';
import { productService } from '../../services/productService';
import './productos.css';

/**
 * Pop-up "Importar mis productos": la plantilla de Gesicom (con el
 * paso a paso y el formato del archivo) y la importación desde Shopify.
 * Lo usan el listado de Productos del admin y Productos del panel de
 * usuario (vitrina): un solo pop-up para las dos pantallas.
 *
 * @param onCerrar se llama al cerrar.
 * @param onImportado se llama cuando se crearon productos, para que la
 *   pantalla que lo abrió recargue su lista.
 */
export default function CargaMasivaProductosModal({ onCerrar, onImportado }) {
  const [archivoImportacion, setArchivoImportacion] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacion, setResultadoImportacion] = useState(null);
  const [errorImportacion, setErrorImportacion] = useState('');
  const [origenImportacion, setOrigenImportacion] = useState('gesicom'); // 'gesicom' | 'shopify'
  const [revisionImportacion, setRevisionImportacion] = useState(null); // vista previa de la plantilla
  // Columnas y límites de la plantilla: los da el backend, que es quien
  // arma el Excel y lo valida, para que el paso a paso nunca diga otra cosa.
  const [formatoImportacion, setFormatoImportacion] = useState(null);
  const inputImportacionRef = useRef(null);

  useEffect(() => {
    productService.formatoImportacion().then(setFormatoImportacion).catch(() => {});
  }, []);

  const limpiarImportacion = () => {
    setArchivoImportacion(null);
    setResultadoImportacion(null);
    setRevisionImportacion(null);
    setErrorImportacion('');
  };

  const elegirArchivoImportacion = (archivo) => {
    limpiarImportacion();
    setArchivoImportacion(archivo || null);
  };

  const descargarPlantilla = async () => {
    setErrorImportacion('');
    try {
      await productService.descargarPlantillaImportacion();
    } catch {
      setErrorImportacion('No se pudo descargar la plantilla. Probá de nuevo.');
    }
  };

  // Plantilla de Gesicom, en dos pasos: primero se revisa el archivo (no
  // crea nada) y recién al confirmar se importan las filas sin errores.
  const importarPlantilla = async (aplicar) => {
    if (!archivoImportacion) {
      setErrorImportacion('Elegí la plantilla de Gesicom completa (.xlsx).');
      return;
    }
    setImportando(true);
    setErrorImportacion('');
    try {
      const resultado = await productService.importarMasivo(archivoImportacion, { aplicar });
      if (aplicar) {
        setRevisionImportacion(null);
        setResultadoImportacion(resultado);
        await onImportado?.();
      } else {
        setRevisionImportacion(resultado);
      }
    } catch (err) {
      setErrorImportacion(err.response?.data?.message || 'No se pudo leer el archivo.');
    } finally {
      setImportando(false);
    }
  };

  const cerrarImportacion = () => {
    if (importando) return;
    onCerrar();
  };

  const importarArchivoShopify = async () => {
    if (!archivoImportacion) {
      setErrorImportacion('Elegí un archivo CSV o Excel exportado desde Shopify.');
      return;
    }
    setImportando(true);
    setErrorImportacion('');
    setResultadoImportacion(null);
    try {
      const formData = new FormData();
      formData.append('archivo', archivoImportacion);
      const resultado = await productService.importarShopify(formData);
      setResultadoImportacion(resultado);
      await onImportado?.();
    } catch (err) {
      setErrorImportacion(err.response?.data?.message || 'No se pudo importar el archivo.');
    } finally {
      setImportando(false);
    }
  };

  const esPlantilla = origenImportacion === 'gesicom';
  const titulo = esPlantilla ? 'Importar mis productos' : 'Importar productos desde Shopify';
  const erroresDe = (r) => (r?.errores_total > 0 ? (
    <div className="import-errors">
      <strong>
        {esPlantilla
          ? `${r.errores_total} fila(s) con errores${r.aplicado ? ' no se importaron' : ': corregilas en el Excel o importá el resto'}`
          : `${r.errores_total} producto(s) no se importaron`}
      </strong>
      <ul>
        {r.errores.map((err, idx) => (
          <li key={idx}>
            <span>{esPlantilla ? `Fila ${err.fila}${err.sku ? ` · ${err.sku}` : ''}` : (err.handle || `Fila ${err.fila}`)}</span>
            <small>{err.error}</small>
          </li>
        ))}
      </ul>
      {r.errores_total > r.errores.length && <small>Se muestran los primeros {r.errores.length} errores.</small>}
    </div>
  ) : null);

  return (
  <div className="import-modal-overlay" role="dialog" aria-modal="true" aria-label={titulo}>
    <div className={`import-modal ${esPlantilla ? 'import-modal--amplio' : ''}`}>
      <div className="import-modal-header">
        <div>
          <h2>{titulo}</h2>
          <p>
            {esPlantilla
              ? 'Cargá muchos productos de una vez con un Excel: un producto por fila, solo con los datos básicos. Seguí estos pasos.'
              : 'Subí el CSV o Excel exportado desde Shopify. Gesicom crea productos, variantes básicas e imágenes por URL.'}
          </p>
        </div>
        <button type="button" className="btn-icon" onClick={cerrarImportacion} aria-label="Cerrar" disabled={importando}>
          <X size={17} />
        </button>
      </div>

      <div className="rubro-options import-origen" role="radiogroup" aria-label="Origen del archivo">
        {[['gesicom', 'Plantilla de Gesicom'], ['shopify', 'Exportación de Shopify']].map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={origenImportacion === valor}
            className={`rubro-option ${origenImportacion === valor ? 'active' : ''}`}
            onClick={() => { limpiarImportacion(); setOrigenImportacion(valor); }}
            disabled={importando}
          >
            <span>{etiqueta}</span>
          </button>
        ))}
      </div>

      {esPlantilla && (
        <ol className="import-pasos" aria-label="Pasos para cargar productos masivamente">
          <li>
            <strong>Descargá la plantilla.</strong> Es un Excel con las columnas ya armadas. Usá siempre ese archivo: no cambies el nombre de la hoja ni el de los encabezados.
            <button type="button" className="btn-secondary btn-small" onClick={descargarPlantilla}>
              <FileSpreadsheet size={14} /> Descargar plantilla (.xlsx)
            </button>
          </li>
          <li>
            <strong>Completá una fila por producto</strong> en la hoja “{formatoImportacion?.hoja || 'Productos'}”. Las columnas con * son obligatorias: si falta alguna, esa fila no se importa.
            {formatoImportacion ? (
              <div className="import-columnas-wrap">
                <table className="import-columnas">
                  <thead>
                    <tr><th>Columna</th><th>Qué va</th><th>Ejemplo</th></tr>
                  </thead>
                  <tbody>
                    {formatoImportacion.columnas.map(c => (
                      <tr key={c.titulo}>
                        <th scope="row">
                          {c.titulo}{c.obligatoria ? ' *' : ''}
                          <small>{c.obligatoria ? 'Obligatoria' : 'Opcional'}</small>
                        </th>
                        <td>{c.ayuda}</td>
                        <td className="import-columnas-ejemplo">{c.ejemplo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="field-hint">El detalle de cada columna también está en la hoja “Instrucciones” de la plantilla.</p>
            )}
          </li>
          <li>
            <strong>Antes de subirlo, revisá esto:</strong>
            <ul>
              <li>El archivo tiene que ser Excel (.xlsx), con hasta {formatoImportacion?.max_productos || 500} productos.</li>
              <li>Los precios, el costo y el stock van como número, sin “Gs” ni texto. Ej: 89000.</li>
              <li>Cada SKU va una sola vez y no puede existir ya en tu catálogo: la carga masiva crea productos nuevos, no modifica los que ya tenés.</li>
              <li>Las fotos van como links públicos que empiecen con https:// (hasta {formatoImportacion?.max_imagenes || 6} por producto). Para poner varias en una celda: una por renglón con Alt+Enter, o separadas con |.</li>
              <li>Con stock 0 el producto se crea, pero la tienda lo muestra sin stock y no deja comprarlo.</li>
            </ul>
          </li>
          <li>
            <strong>Subí el archivo acá abajo y tocá “Revisar archivo”.</strong> Todavía no se crea nada: te mostramos cuántos productos están listos y, fila por fila, qué hay que corregir.
          </li>
          <li>
            <strong>Confirmá con “Importar productos”.</strong> Se crean las filas sin errores. Las que tengan errores quedan afuera: corregilas en el Excel y volvé a subir solo esas.
          </li>
          <li>
            <strong>Después de importar,</strong> las variantes, preguntas frecuentes, opiniones y ofertas se completan dentro de cada producto.
          </li>
        </ol>
      )}

      <button
        type="button"
        className={`import-dropzone ${archivoImportacion ? 'has-file' : ''}`}
        onClick={() => inputImportacionRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) elegirArchivoImportacion(file);
        }}
        disabled={importando}
      >
        <UploadCloud size={24} />
        <span>{archivoImportacion ? archivoImportacion.name : (esPlantilla ? 'Elegir la plantilla completa (.xlsx)' : 'Elegir archivo CSV, XLS o XLSX')}</span>
        <small>{esPlantilla ? 'Primero se revisa el archivo: no se crea nada hasta que confirmes.' : 'Usá el archivo de exportación de productos de Shopify.'}</small>
      </button>
      <input
        ref={inputImportacionRef}
        type="file"
        aria-label="Archivo a importar"
        accept={esPlantilla
          ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : '.csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'}
        hidden
        onChange={(e) => {
          elegirArchivoImportacion(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {errorImportacion && (
        <div className="import-alert error">
          <AlertTriangle size={15} />
          <span>{errorImportacion}</span>
        </div>
      )}

      {revisionImportacion && (
        <div className="import-result">
          <div className={`import-alert ${revisionImportacion.listos > 0 ? 'success' : 'error'}`}>
            {revisionImportacion.listos > 0 ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span>
              {revisionImportacion.listos} de {revisionImportacion.total_leidos} productos listos para importar.
              {revisionImportacion.listos === 0 && ' Corregí los errores y volvé a subir el archivo.'}
            </span>
          </div>
          {erroresDe(revisionImportacion)}
        </div>
      )}

      {resultadoImportacion && (
        <div className="import-result">
          <div className="import-alert success">
            <CheckCircle2 size={15} />
            <span>
              {resultadoImportacion.creados} de {resultadoImportacion.total_leidos} productos importados.
              {' '}{esPlantilla
                ? `${resultadoImportacion.imagenes} imágenes agregadas.`
                : `${resultadoImportacion.imagenes} imágenes y ${resultadoImportacion.variantes} variantes agregadas.`}
            </span>
          </div>
          {erroresDe(resultadoImportacion)}
        </div>
      )}

      <div className="import-modal-actions">
        <button type="button" className="btn-secondary" onClick={cerrarImportacion} disabled={importando}>
          {resultadoImportacion ? 'Cerrar' : 'Cancelar'}
        </button>
        {!esPlantilla && (
          <button type="button" className="btn-primary" onClick={importarArchivoShopify} disabled={importando || !archivoImportacion}>
            {importando ? <Loader size={15} className="spin-icon" /> : <UploadCloud size={15} />}
            {importando ? 'Importando...' : 'Importar productos'}
          </button>
        )}
        {esPlantilla && !resultadoImportacion && (revisionImportacion?.listos > 0 ? (
          <button type="button" className="btn-primary" onClick={() => importarPlantilla(true)} disabled={importando}>
            {importando ? <Loader size={15} className="spin-icon" /> : <UploadCloud size={15} />}
            {importando ? 'Importando...' : `Importar ${revisionImportacion.listos} producto${revisionImportacion.listos === 1 ? '' : 's'}`}
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => importarPlantilla(false)} disabled={importando || !archivoImportacion}>
            {importando ? <Loader size={15} className="spin-icon" /> : <FileSpreadsheet size={15} />}
            {importando ? 'Revisando...' : 'Revisar archivo'}
          </button>
        ))}
      </div>
    </div>
  </div>
  );
}
