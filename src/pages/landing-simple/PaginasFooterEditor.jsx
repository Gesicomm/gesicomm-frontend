import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Undo2, Redo2, Pilcrow, ImagePlus, Loader } from 'lucide-react';
import { PAGINAS_LEGALES_CODIGO } from './plantillasLegalesCodigo';
import { limpiarTextoFooter } from './paginasFooter';
import './paginasFooter.css';

const ACCIONES = [
  ['bold', 'Negrita', Bold], ['italic', 'Cursiva', Italic], ['underline', 'Subrayado', Underline],
  ['insertUnorderedList', 'Viñetas', List], ['insertOrderedList', 'Lista numerada', ListOrdered],
  ['undo', 'Deshacer', Undo2], ['redo', 'Rehacer', Redo2],
];

export default function PaginasFooterEditor({ disabled, tipo, onTipo, contenido, onEditar, onSubirImagen, onEstadoSubida }) {
  const [activos, setActivos] = useState({});
  const [subiendo, setSubiendo] = useState(false);
  const [errorImagen, setErrorImagen] = useState('');
  const archivoInput = useRef(null);
  const seleccionImagen = useRef(null);
  const ocupado = useRef(false);
  const montado = useRef(true);
  const bloqueado = disabled || subiendo;
  const editor = useRef(null);
  const paginaMontada = useRef(null);
  const valor = contenido;
  const titulo = PAGINAS_LEGALES_CODIGO.find(p => p.key === tipo)?.label;
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  useEffect(() => {
    if (editor.current && (paginaMontada.current !== tipo || document.activeElement !== editor.current) && editor.current.innerHTML !== valor) editor.current.innerHTML = valor;
    paginaMontada.current = tipo;
  }, [valor, tipo]);

  function actualizarFormato() {
    setActivos(Object.fromEntries(ACCIONES.map(([cmd]) => [cmd, document.queryCommandState?.(cmd) || false])));
  }

  function guardarTexto() {
    const html = limpiarTextoFooter(editor.current.innerHTML);
    onEditar(html);
    actualizarFormato();
  }

  function ejecutar(cmd, valor) {
    editor.current.focus();
    document.execCommand(cmd, false, valor);
    guardarTexto();
  }

  function recordarSeleccion() {
    const seleccion = window.getSelection();
    seleccionImagen.current = seleccion?.rangeCount && editor.current.contains(seleccion.getRangeAt(0).commonAncestorContainer)
      ? seleccion.getRangeAt(0).cloneRange() : null;
  }

  async function subirArchivo(archivo) {
    if (!onSubirImagen) throw new Error('No se puede subir la imagen en este momento.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(archivo.type)) throw new Error('Usá una imagen PNG, JPG o WebP.');
    const url = await onSubirImagen(archivo);
    if (typeof url !== 'string' || !/^(https?:\/\/|\/(?!\/))/i.test(url)) throw new Error('No se recibió la imagen subida. Intentá de nuevo.');
    return url;
  }

  async function insertarConSubida(preparar) {
    if (ocupado.current || disabled) return;
    ocupado.current = true;
    onEstadoSubida?.(true);
    setSubiendo(true);
    setErrorImagen('');
    const rango = seleccionImagen.current;
    try {
      const html = await preparar();
      if (!montado.current) return;
      editor.current.contentEditable = 'true';
      editor.current.focus();
      const seleccion = window.getSelection();
      seleccion.removeAllRanges();
      if (rango && editor.current.contains(rango.commonAncestorContainer)) seleccion.addRange(rango);
      else {
        const final = document.createRange();
        final.selectNodeContents(editor.current); final.collapse(false); seleccion.addRange(final);
      }
      document.execCommand('insertHTML', false, limpiarTextoFooter(html));
      guardarTexto();
    } catch (err) {
      if (montado.current) setErrorImagen(err.response?.data?.message || err.message || 'No se pudo subir la imagen. Intentá de nuevo.');
    } finally {
      ocupado.current = false;
      onEstadoSubida?.(false);
      if (montado.current) setSubiendo(false);
    }
  }

  function subirImagenes(archivos) {
    return insertarConSubida(async () => {
      const contenedor = document.createElement('div');
      for (const archivo of archivos) {
        const imagen = document.createElement('img');
        imagen.src = await subirArchivo(archivo);
        imagen.alt = archivo.name === 'image.png' ? '' : archivo.name;
        contenedor.append(imagen, document.createElement('br'));
      }
      return contenedor.innerHTML;
    });
  }

  function pegar(event) {
    event.preventDefault();
    if (bloqueado || ocupado.current) return;
    recordarSeleccion();
    const archivos = [...event.clipboardData.files].filter(f => f.type.startsWith('image/'));
    if (archivos.length) { subirImagenes(archivos); return; }
    const html = event.clipboardData.getData('text/html');
    const texto = event.clipboardData.getData('text/plain');
    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const incrustadas = [...doc.querySelectorAll('img')].filter(img => /^(data:|blob:)/i.test(img.getAttribute('src') || ''));
      if (incrustadas.length) {
        insertarConSubida(async () => {
          for (const img of incrustadas) {
            const blob = await (await fetch(img.getAttribute('src'))).blob();
            img.src = await subirArchivo(new File([blob], 'imagen-pegada.png', { type: blob.type }));
          }
          return doc.body.innerHTML;
        });
        return;
      }
    }
    if (html) document.execCommand('insertHTML', false, limpiarTextoFooter(html));
    else document.execCommand('insertText', false, texto);
    guardarTexto();
  }

  return (
    <div className="tn-footer-pages">
      <p className="tn-field-hint">Escribí, pegá texto e imágenes o usá Subir imagen. Mirá el resultado en la vista previa y usá Guardar para publicar los cambios.</p>
      <label className="tn-field-label" htmlFor="footer-page-select">Página que querés editar</label>
      <select id="footer-page-select" className="tn-input" value={tipo} onChange={e => onTipo(e.target.value)} disabled={bloqueado}>
        {PAGINAS_LEGALES_CODIGO.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <div className="tn-rich-editor">
        <div className="tn-rich-toolbar" role="toolbar" aria-label="Formato del texto">
          <button type="button" title="Subir imagen" aria-label="Subir imagen" disabled={bloqueado || !onSubirImagen} onMouseDown={e => { e.preventDefault(); recordarSeleccion(); }} onClick={() => { recordarSeleccion(); archivoInput.current.click(); }}>
            {subiendo ? <Loader size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          </button>
          <input ref={archivoInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden aria-label="Archivo de imagen" onChange={e => { const archivos = [...e.target.files]; e.target.value = ''; if (archivos.length) subirImagenes(archivos); }} />
          <button type="button" title="Texto normal" aria-label="Texto normal" disabled={bloqueado} onMouseDown={e => e.preventDefault()} onClick={() => ejecutar('formatBlock', 'p')}><Pilcrow size={18} /></button>
          {ACCIONES.map(([cmd, label, Icon]) => <button key={cmd} type="button" title={label} aria-label={label}
            aria-pressed={['undo', 'redo'].includes(cmd) ? undefined : !!activos[cmd]} disabled={bloqueado}
            onMouseDown={e => e.preventDefault()} onClick={() => ejecutar(cmd)}><Icon size={18} /></button>)}
        </div>
        <div ref={editor} className="tn-rich-content" role="textbox" aria-label={`Contenido de ${titulo}`} aria-multiline="true"
          contentEditable={!bloqueado} suppressContentEditableWarning onInput={guardarTexto} onPaste={pegar}
          onDrop={e => e.preventDefault()} onKeyUp={actualizarFormato} onMouseUp={actualizarFormato} />
      </div>
      {subiendo && <p role="status" className="tn-field-hint">Subiendo imagen…</p>}
      {errorImagen && <p role="alert" className="text-sm text-danger">{errorImagen}</p>}
      <p className="tn-field-hint">Seleccioná un texto para darle formato. Podés editar varias páginas antes de guardar.</p>
    </div>
  );
}
