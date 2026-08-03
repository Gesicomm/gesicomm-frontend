/**
 * Rasteriza los SVG de marca a los PNG que piden Meta, iOS, Android y el
 * preview de enlaces.
 *
 *   npm run brand
 *
 * Los SVG de public/brand/ son la fuente de verdad: si cambia el logo, se
 * edita el SVG y se vuelve a correr este script. Los PNG generados se
 * commitean igual, porque el build de producción no ejecuta este paso.
 *
 * Tamaños y por qué:
 *   1024  Meta App Icon (el App Dashboard pide exactamente 1024x1024).
 *    512  PWA / manifest, y respaldo de 512 que también acepta Meta.
 *    256  Windows y escritorio.
 *    192  Android (manifest, icono de inicio).
 *    180  apple-touch-icon (iOS lo redimensiona solo a partir de este).
 *    128  Chrome Web Store / extensiones y usos chicos.
 *     32  favicon clásico de pestaña.
 *     16  favicon de barra de direcciones.
 */
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const marca = join(raiz, 'public', 'brand');
const publico = join(raiz, 'public');

const TAMANOS_ICONO = [1024, 512, 256, 192, 128];

async function png(svgPath, destino, ancho, alto = ancho) {
  const svg = await readFile(svgPath);
  await sharp(svg, { density: 384 })
    .resize(ancho, alto, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(destino);
  console.log(`  ✓ ${destino.replace(raiz, '.')} (${ancho}x${alto})`);
}

async function main() {
  await mkdir(join(publico, 'icons'), { recursive: true });

  const cuadrado = join(marca, 'gesicomm-icono-cuadrado.svg');
  const favicon = join(publico, 'favicon.svg');
  const og = join(marca, 'gesicomm-og.svg');

  console.log('App icons (fondo sólido, sin texto — requisito de Meta):');
  for (const tam of TAMANOS_ICONO) {
    await png(cuadrado, join(publico, 'icons', `icon-${tam}.png`), tam);
  }
  await png(cuadrado, join(publico, 'apple-touch-icon.png'), 180);

  console.log('Favicons (fondo transparente):');
  await png(favicon, join(publico, 'favicon-32.png'), 32);
  await png(favicon, join(publico, 'favicon-16.png'), 16);

  console.log('Open Graph:');
  await png(og, join(publico, 'og-image.png'), 1200, 630);

  console.log('\nListo.');
}

main().catch((err) => {
  console.error('Falló la generación de assets de marca:', err);
  process.exit(1);
});
