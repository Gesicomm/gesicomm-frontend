import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// El mismo arrastre para producto y combo: cabecera anclada al punto de agarre,
// orden provisional con FLIP y persistencia únicamente al soltar dentro del grupo.
export default function useArrastreBloques({ orden, onGuardar, grupo, mover,
  atributo = 'data-bloque-ficha', selectorCabecera = 'summary', tipo = 'application/x-gesicomm-bloque', describirLimite }) {
  const selector = `[${atributo}]`;
  const listaBloquesRef = useRef(null);
  const arrastreRef = useRef(null);
  const posicionesRef = useRef(null);
  const punteroRef = useRef(null);
  const fantasmaRef = useRef(null);
  function limpiarPuntero() {
    fantasmaRef.current?.remove();
    fantasmaRef.current = null;
    const gesto = punteroRef.current;
    punteroRef.current = null;
    cancelAnimationFrame(gesto?.frame);
    if (gesto?.cursor !== undefined) {
      document.body.style.cursor = gesto.cursor;
      document.body.style.userSelect = gesto.seleccion;
    }
    if (gesto?.asa.hasPointerCapture?.(gesto.id)) gesto.asa.releasePointerCapture(gesto.id);
  }
  const [arrastre, setArrastre] = useState(null);
  const [recienMovido, setRecienMovido] = useState(null);
  const ordenVisible = arrastre?.orden || orden;
  function fijarArrastre(valor) {
    arrastreRef.current = valor;
    setArrastre(valor);
    actualizarAyuda(valor);
  }
  function actualizarAyuda(valor) {
    const fantasma = fantasmaRef.current;
    if (!fantasma || !valor) return;
    const bloqueado = !!valor.bloqueado;
    fantasma.dataset.arrastreBloqueado = String(bloqueado);
    fantasma.style.borderColor = 'var(--color-primary, #ff573f)';
    document.body.style.cursor = bloqueado ? 'not-allowed' : 'grabbing';
    const ayuda = fantasma.querySelector('[data-arrastre-limite]');
    const mensaje = describirLimite?.(valor.origen, valor.bloqueado);
    ayuda.hidden = !bloqueado;
    ayuda.textContent = '🔒';
    ayuda.title = mensaje || 'Este bloque pertenece a otro grupo.';
  }
  function medirBloques() {
    const lista = listaBloquesRef.current;
    if (!lista) return;
    posicionesRef.current = new Map(
      [...lista.querySelectorAll(selector)].map(el => [el, el.getBoundingClientRect().top]),
    );
  }
  // FLIP: cada bloque arranca donde estaba y se desliza hasta su lugar nuevo.
  useLayoutEffect(() => {
    const antes = posicionesRef.current;
    posicionesRef.current = null;
    const lista = listaBloquesRef.current;
    if (!antes || !lista) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    lista.querySelectorAll(selector).forEach(el => {
      const previo = antes.get(el);
      if (previo === undefined) return;
      el.style.transition = 'none';
      el.style.transform = '';
      const delta = previo - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) { el.style.transition = ''; return; }
      el.style.transform = `translateY(${delta}px)`;
      el.getBoundingClientRect();
      el.style.transition = 'transform 240ms cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
      clearTimeout(el.__finFlip);
      el.__finFlip = setTimeout(() => { el.style.transition = ''; }, 260);
    });
  }, [ordenVisible]);
  useEffect(() => {
    if (!recienMovido) return undefined;
    const t = setTimeout(() => setRecienMovido(null), 900);
    return () => clearTimeout(t);
  }, [recienMovido]);
  const controlArrastre = {
    arrastre,
    recienMovido,
    empezar(clave, e) {
      if (!grupo(clave)) { e.preventDefault(); return; }
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      // Tipo propio: un texto plano se pegaría en el input sobre el que pase.
      e.dataTransfer?.setData(tipo, clave);
      // La "foto" que acompaña al cursor es la cabecera entera del bloque,
      // levantada (fondo y sombra solo durante la captura), no el ícono.
      const cabecera = e.currentTarget.closest(selectorCabecera);
      if (cabecera && e.dataTransfer?.setDragImage) {
        const r = cabecera.getBoundingClientRect();
        const fondo = window.getComputedStyle(cabecera.parentElement).backgroundColor;
        Object.assign(cabecera.style, { background: fondo, boxShadow: '0 12px 28px rgba(0,0,0,.35)', borderRadius: '12px' });
        e.dataTransfer.setDragImage(cabecera, e.clientX - r.left, e.clientY - r.top);
        setTimeout(() => Object.assign(cabecera.style, { background: '', boxShadow: '', borderRadius: '' }), 0);
      }
      arrastreRef.current = { origen: clave, orden, bloqueado: null };
      actualizarAyuda(arrastreRef.current);
      if (!e.dataTransfer) { setArrastre(arrastreRef.current); return; }
      // El bloque se vuelve "hueco" recién después de la captura.
      setTimeout(() => { if (arrastreRef.current?.origen === clave) setArrastre(arrastreRef.current); }, 0);
    },
    sobre(destino, e) {
      const actual = arrastreRef.current;
      if (!actual) return;
      e.stopPropagation();
      if (grupo(destino) !== grupo(actual.origen)) {
        // Sin preventDefault: el cursor muestra que ahí no se puede soltar.
        if (actual.bloqueado !== destino) fijarArrastre({ ...actual, bloqueado: destino });
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const limpio = actual.bloqueado ? { ...actual, bloqueado: null } : actual;
      if (destino === actual.origen) {
        if (limpio !== actual) fijarArrastre(limpio);
        return;
      }
      // Arriba o abajo se decide por dónde están en pantalla los dos bloques,
      // no por el orden guardado: entre un dragover y el siguiente React
      // puede no haber repintado, y comparar contra un orden más nuevo que
      // la pantalla deshacía el movimiento. Se cambia de lugar cuando el
      // cursor entra en la zona que el bloque arrastrado va a ocupar: con
      // bloques de distinto alto (uno abierto) así no rebota.
      const r = e.currentTarget.getBoundingClientRect();
      const ro = listaBloquesRef.current?.querySelector(`[${atributo}="${actual.origen}"]`)?.getBoundingClientRect();
      let baja;
      if (ro && r.height > 0 && ro.height > 0) {
        baja = r.top > ro.top;
        const entra = baja ? e.clientY > r.bottom - ro.height : e.clientY < r.top + ro.height;
        if (!entra) {
          if (limpio !== actual) fijarArrastre(limpio);
          return;
        }
      }
      const siguiente = mover(actual.orden, actual.origen, destino, baja);
      if (!siguiente) {
        if (limpio !== actual) fijarArrastre(limpio);
        return;
      }
      medirBloques();
      fijarArrastre({ ...limpio, orden: siguiente });
    },
    soltar(e) {
      const actual = arrastreRef.current;
      if (!actual) return;
      e.preventDefault();
      e.stopPropagation();
      if (actual.bloqueado) { controlArrastre.terminar(); return; }
      if (actual.orden.join() !== orden.join()) onGuardar(actual.orden, actual.origen);
      setRecienMovido(actual.origen);
      limpiarPuntero();
      fijarArrastre(null);
    },
    terminar() {
      // Soltado afuera, en un bloque de otro grupo o con Escape: vuelve.
      limpiarPuntero();
      if (!arrastreRef.current) return;
      medirBloques();
      fijarArrastre(null);
    },
    puntero(clave) {
      return {
        onPointerDown(e) {
          if (e.button !== 0 || !grupo(clave)) return;
          e.preventDefault(); e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          punteroRef.current = { clave, asa: e.currentTarget, id: e.pointerId, x: e.clientX, y: e.clientY };
        },
        onPointerMove(e) {
          const gesto = punteroRef.current;
          if (!gesto || gesto.id !== e.pointerId) return;
          e.preventDefault(); e.stopPropagation();
          if (!arrastreRef.current) {
            if (Math.hypot(e.clientX - gesto.x, e.clientY - gesto.y) < 5) return;
            const cabecera = gesto.asa.closest(selectorCabecera);
            if (!cabecera) return;
            const r = cabecera.getBoundingClientRect();
            const fantasma = cabecera.cloneNode(true);
            fantasma.setAttribute('aria-hidden', 'true');
            fantasma.setAttribute('data-arrastre-cabecera', '');
            fantasma.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
            Object.assign(fantasma.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
              margin: '0', zIndex: '10000', pointerEvents: 'none', background: window.getComputedStyle(cabecera.parentElement).backgroundColor,
              color: window.getComputedStyle(cabecera).color, boxShadow: '0 12px 28px rgba(0,0,0,.35)', borderRadius: '12px', border: '1px solid var(--color-primary, #ff573f)',
              transform: 'none', transition: 'none', boxSizing: 'border-box' });
            document.body.appendChild(fantasma);
            const ayuda = document.createElement('div');
            ayuda.setAttribute('data-arrastre-limite', '');
            Object.assign(ayuda.style, { position: 'absolute', top: '-9px', right: '-9px', width: '26px', height: '26px',
              fontSize: '14px', lineHeight: '24px', textAlign: 'center', borderRadius: '50%', background: fantasma.style.background,
              boxShadow: '0 2px 6px rgba(0,0,0,.15)', border: '1px solid var(--color-border, #cbd5e1)' });
            fantasma.appendChild(ayuda);
            fantasmaRef.current = fantasma;
            gesto.cursor = document.body.style.cursor; gesto.seleccion = document.body.style.userSelect;
            document.body.style.cursor = 'grabbing'; document.body.style.userSelect = 'none';
            controlArrastre.empezar(clave, e);
            let scroll = gesto.asa.parentElement;
            while (scroll && !(scroll.scrollHeight > scroll.clientHeight && /auto|scroll/.test(window.getComputedStyle(scroll).overflowY))) scroll = scroll.parentElement;
            gesto.scroll = scroll;
            const desplazar = () => {
              if (punteroRef.current !== gesto) return;
              const contenedor = gesto.scroll;
              if (contenedor) {
                const limites = contenedor.getBoundingClientRect();
                const delta = gesto.py < limites.top + 40 ? -12 : gesto.py > limites.bottom - 40 ? 12 : 0;
                if (delta) { contenedor.scrollBy(0, delta); controlArrastre.situarPuntero(gesto.px, gesto.py); }
              }
              gesto.frame = requestAnimationFrame(desplazar);
            };
            gesto.frame = requestAnimationFrame(desplazar);
          }
          gesto.px = e.clientX; gesto.py = e.clientY;
          fantasmaRef.current.style.transform = `translate3d(${e.clientX - gesto.x}px, ${e.clientY - gesto.y}px, 0)`;
          controlArrastre.situarPuntero(e.clientX, e.clientY);
        },
        onPointerUp(e) {
          if (!punteroRef.current) return;
          e.preventDefault(); e.stopPropagation();
          const bajo = document.elementFromPoint(e.clientX, e.clientY);
          const fila = bajo?.closest(selector);
          if (arrastreRef.current && bajo && listaBloquesRef.current?.contains(bajo)
            && (!fila || grupo(fila.getAttribute(atributo)) === grupo(clave))) controlArrastre.soltar(e);
          else controlArrastre.terminar();
        },
        onPointerCancel: () => controlArrastre.terminar(),
        onLostPointerCapture: () => { if (punteroRef.current) controlArrastre.terminar(); },
      };
    },
    situarPuntero(x, y) {
      const fila = document.elementFromPoint(x, y)?.closest(selector);
      if (fila && listaBloquesRef.current?.contains(fila)) controlArrastre.sobre(fila.getAttribute(atributo), {
        clientY: y, currentTarget: fila, dataTransfer: { dropEffect: 'move' }, preventDefault() {}, stopPropagation() {},
      });
    },
  };
  function dentroDeLista(e) {
    const actual = arrastreRef.current;
    // Entre bloque y bloque (el espacio que los separa) también se puede soltar.
    if (actual && !actual.bloqueado && !e.target.closest?.(selector)) e.preventDefault();
  }
  useEffect(() => {
    if (!arrastre) return;
    const cancelar = e => { if (e.key === 'Escape') controlArrastre.terminar(); };
    window.addEventListener('keydown', cancelar);
    return () => window.removeEventListener('keydown', cancelar);
  }, [arrastre]);
  useEffect(() => () => {
    limpiarPuntero();
    listaBloquesRef.current?.querySelectorAll(selector).forEach(el => clearTimeout(el.__finFlip));
  }, []);
  return { listaBloquesRef, arrastre, recienMovido, ordenVisible, controlArrastre, dentroDeLista };
}

export function moverBloqueEnLista(orden, origen, destino, despues) {
  const desde = orden.indexOf(origen), hasta = orden.indexOf(destino);
  if (desde < 0 || hasta < 0 || desde === hasta) return null;
  const siguiente = orden.filter(k => k !== origen);
  siguiente.splice(siguiente.indexOf(destino) + ((despues ?? desde < hasta) ? 1 : 0), 0, origen);
  return siguiente.join() === orden.join() ? null : siguiente;
}
