import React, { useMemo, useState } from 'react';
import { FileCode2 } from 'lucide-react';
import { armarPromptBloqueFicha, validarRespuestaBloque } from './codigoBloquesFicha';

export default function EditorCodigoBloqueFicha({ clave, titulo, tipo, base, propio, contexto, onGuardar }) {
  const [abierto, setAbierto] = useState(false), [pegado, setPegado] = useState('');
  const [error, setError] = useState(''), [estado, setEstado] = useState('');
  const resuelta = useMemo(() => abierto ? (typeof base === 'function' ? base() : base) : {}, [abierto, base]);
  const actual = propio ? { ...resuelta, ...propio, css: `${resuelta.css || ''}\n${propio.css || ''}` } : resuelta;
  async function copiar() {
    try {
      await navigator.clipboard.writeText(armarPromptBloqueFicha({ clave, titulo, tipo, base: actual, contexto }));
      setEstado('Prompt copiado'); setError('');
    } catch { setError('No pudimos copiar. Podés copiar las instrucciones desde Ver prompt completo.'); }
  }
  function aplicar() {
    try { const codigo = validarRespuestaBloque(pegado, clave, resuelta, tipo === 'combo'); onGuardar(codigo); setPegado(''); setError(''); setEstado('Diseño aplicado a este bloque'); }
    catch (e) { setError(e.message); setEstado(''); }
  }
  return <section className="rounded-lg border border-border bg-surface-2/50 p-3 space-y-3" aria-label={`Código de ${titulo}`}>
    <button type="button" aria-expanded={abierto} onClick={() => setAbierto(!abierto)} className="inline-flex items-center gap-2 text-xs font-semibold text-fg"><FileCode2 size={14} />Diseño (código) de este bloque</button>
    {abierto && <>
      <p className="text-xs leading-relaxed text-fg-muted">Copiá las instrucciones, contale a la IA qué querés cambiar y pegá su respuesta completa con HTML, CSS y JavaScript. Se aplica solo a este bloque.</p>
      <button type="button" disabled={!actual?.html} onClick={copiar} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-fg disabled:opacity-40">Copiar prompt para IA</button>
      {!actual?.html && <p className="text-xs text-fg-muted">Este bloque todavía no tiene contenido visible. Activá sus campos o cargá sus datos para obtener el HTML actual.</p>}
      <details><summary className="cursor-pointer text-xs text-fg-muted">Ver prompt completo</summary><textarea readOnly aria-label="Prompt completo del bloque" rows={8} className="mt-2 w-full rounded-lg border border-border bg-surface p-2 font-mono text-xs text-fg" value={armarPromptBloqueFicha({ clave, titulo, tipo, base: actual || {}, contexto })} /></details>
      <label className="block text-xs font-semibold text-fg-muted">Respuesta completa de la IA<textarea aria-label={`Respuesta de IA para ${titulo}`} rows={6} spellCheck={false} className="mt-2 w-full rounded-lg border border-border bg-surface p-2 font-mono text-xs text-fg" placeholder="Pegá el HTML con <style> y <script>, o los tres bloques de código." value={pegado} onChange={e => setPegado(e.target.value)} /></label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!pegado.trim() || !resuelta?.html} onClick={aplicar} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-fg disabled:opacity-40">Aplicar a este bloque</button>
      {propio && <button type="button" onClick={() => { onGuardar(null); setError(''); setEstado('Diseño original restaurado'); }} className="rounded-lg border border-border px-3 py-2 text-xs text-fg-muted">Restaurar diseño del bloque</button>}</div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}{estado && <p role="status" className="text-xs text-fg-muted">{estado}</p>}
      <details><summary className="cursor-pointer text-xs text-fg-muted">Ver HTML, CSS y JavaScript actuales</summary>{['html', 'css', 'js'].map(campo => <label key={campo} className="mt-2 block text-xs text-fg-muted">{campo.toUpperCase()}<textarea aria-label={`${campo.toUpperCase()} actual del bloque`} readOnly rows={6} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 font-mono text-xs text-fg" value={actual?.[campo] || ''} /></label>)}</details>
    </>}
  </section>;
}
