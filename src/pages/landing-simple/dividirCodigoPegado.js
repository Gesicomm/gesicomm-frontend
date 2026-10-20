export function dividirCodigoPegado(texto) {
  const fuente = String(texto || '');
  const salida = {};
  const bloques = /```(html|htm|xml|css|js|javascript)?[^\n]*\n([\s\S]*?)```/gi;
  let match;
  while ((match = bloques.exec(fuente))) {
    const lang = String(match[1] || '').toLowerCase();
    const cuerpo = match[2].replace(/\s+$/, '');
    if (['html', 'htm', 'xml', ''].includes(lang) && salida.html === undefined) salida.html = cuerpo;
    if (lang === 'css' && salida.css === undefined) salida.css = cuerpo;
    if (['js', 'javascript'].includes(lang) && salida.js === undefined) salida.js = cuerpo;
  }
  const tieneBloques = Object.keys(salida).length > 0;
  if (tieneBloques && salida.html === undefined) return salida;

  let html = (tieneBloques ? salida.html : fuente).trim();
  const estilos = [];
  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    estilos.push(css.trim());
    return '';
  });
  const scripts = [];
  html = html.replace(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (_, js) => {
    scripts.push(js.trim());
    return '';
  });
  if (estilos.length) salida.css = [...estilos, salida.css].filter(Boolean).join('\n\n');
  if (scripts.length) salida.js = [...scripts, salida.js].filter(Boolean).join('\n\n');
  if (/<[a-z!][\s\S]*>/i.test(html)) salida.html = html.trim();
  return salida;
}
