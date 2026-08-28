/**
 * Auditor de contraste para pegar en la CONSOLA del navegador.
 *
 * Sirve para las pantallas que necesitan sesión (Control de Pedidos,
 * Academia, Productos…), que no se pueden revisar desde afuera.
 *
 * Uso:
 *   1. Abrí la pantalla con el tema que querés revisar.
 *   2. F12 → Console → pegá TODO este archivo → Enter.
 *   3. Devuelve una tabla con cada texto que no llega al mínimo WCAG AA
 *      (4,5:1 normal / 3:1 en títulos grandes), con su clase para ubicarlo.
 *
 * Lo que NO detecta: texto sobre gradientes o sobre imágenes (no hay un
 * color de fondo único contra el cual medir) — esos quedan fuera y hay que
 * mirarlos a ojo.
 */
(function auditarContraste() {
  const px = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const sobre = (fg, bg) => { const a = fg[3] ?? 1; return [0, 1, 2].map((i) => Math.round(bg[i] + (fg[i] - bg[i]) * a)); };
  const razon = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  function fondoReal(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null; // gradiente/imagen: no medible
      const c = px(s.backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.85)) return c.slice(0, 3);
      n = n.parentElement;
    }
    const b = px(getComputedStyle(document.body).backgroundColor);
    return b.length >= 3 ? b.slice(0, 3) : [255, 255, 255];
  }

  const fallos = [];
  document.querySelectorAll('body *').forEach((el) => {
    const texto = [...el.childNodes]
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim()).join(' ');
    if (!texto) return;

    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return;

    const bg = fondoReal(el);
    if (!bg) return;

    const r = razon(sobre(px(s.color), bg), bg);
    const grande = parseFloat(s.fontSize) >= 24
      || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
    const minimo = grande ? 3 : 4.5;

    if (r < minimo) {
      fallos.push({
        texto: texto.slice(0, 40),
        clase: (el.className || '').toString().slice(0, 40) || `<${el.tagName.toLowerCase()}>`,
        color: s.color,
        contraste: +r.toFixed(2),
        minimo,
      });
    }
  });

  const tema = document.documentElement.getAttribute('data-theme');
  if (!fallos.length) {
    console.log(`%c✓ Sin fallos de contraste (tema: ${tema})`, 'color:#16a34a;font-weight:bold');
  } else {
    console.log(`%c${fallos.length} textos por debajo de AA (tema: ${tema})`, 'color:#dc2626;font-weight:bold');
    console.table(fallos.sort((a, b) => a.contraste - b.contraste));
  }
  return fallos;
})();
