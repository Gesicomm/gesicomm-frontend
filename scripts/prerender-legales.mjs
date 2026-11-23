// Escribe dist/__legal/<ruta>.html con el texto completo de cada página legal.
// nginx.conf sirve esos archivos en /privacy, /terms, etc. Ver
// src/prerender/paginasLegales.jsx para el porqué.
//
// Uso (lo corre `npm run build`): después de `vite build` y de
// `vite build --ssr src/prerender/paginasLegales.jsx --outDir dist-ssr`.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');
const ssr = join(raiz, 'dist-ssr');

const escapar = (texto) =>
  String(texto).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function reemplazar(html, patron, nuevo, nombre) {
  if (!patron.test(html)) throw new Error(`index.html no tiene ${nombre}; revisar el prerender.`);
  return html.replace(patron, nuevo);
}

const { PAGINAS, render } = await import(pathToFileURL(join(ssr, 'paginasLegales.js')).href);
const plantilla = await readFile(join(dist, 'index.html'), 'utf8');
await mkdir(join(dist, '__legal'), { recursive: true });

for (const ruta of Object.keys(PAGINAS)) {
  const { html, titulo, descripcion, url } = render(ruta);
  if (!titulo || !descripcion || html.length < 2000) {
    throw new Error(`El prerender de ${ruta} salió incompleto.`);
  }
  let pagina = plantilla;
  pagina = reemplazar(pagina, /<title>[^<]*<\/title>/, `<title>${escapar(titulo)}</title>`, '<title>');
  pagina = reemplazar(
    pagina,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapar(descripcion)}" />`,
    'meta description'
  );
  pagina = pagina
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapar(titulo)}" />`)
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${escapar(descripcion)}" />`
    );
  pagina = reemplazar(pagina, /<div id="root"><\/div>/, `<div id="root">${html}</div>`, '<div id="root">');
  await writeFile(join(dist, '__legal', `${ruta.slice(1)}.html`), pagina);
  console.log(`prerender ${ruta}: ${Math.round(html.length / 1024)} KB`);
}

await rm(ssr, { recursive: true, force: true });
