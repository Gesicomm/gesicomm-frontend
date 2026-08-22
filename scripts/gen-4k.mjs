import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const outDir = 'C:\\Users\\Martin\\.gemini\\antigravity\\brain\\7ad0f634-28ee-4de7-9c5e-d591b9b6c92f\\scratch\\4k-logos';
const brandDir = 'C:\\Proyectos\\Gesicom\\gesicomm-frontend\\public\\brand';

async function export4K(file) {
  const svgPath = join(brandDir, file);
  const outPath = join(outDir, file.replace('.svg', '-4k.png'));
  const svg = await readFile(svgPath);
  
  await sharp(svg, { density: 1200 })
    .resize({ width: 3840, fit: 'inside' })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
    
  console.log('Generated:', outPath);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await export4K('gesicomm-isotipo.svg');
  await export4K('gesicomm-horizontal.svg');
  await export4K('gesicomm-horizontal-oscuro.svg');
  await export4K('gesicomm-icono-cuadrado.svg');
  console.log('Done.');
}

main().catch(console.error);
