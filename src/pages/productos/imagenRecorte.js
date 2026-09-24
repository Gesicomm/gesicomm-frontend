/**
 * Estimación client-side del recorte de márgenes vacíos, para mostrar en el
 * modal de carga "cómo va a quedar" ANTES de subir el archivo — el
 * procesamiento real (el que se guarda) lo hace sharp en el backend
 * (imagen.service.js `procesarBufferParaR2`); esto es solo una aproximación
 * visual con el mismo criterio (fondo = esquinas, umbral, piso del 35%)
 * para que la preview no prometa un recorte distinto del que se va a aplicar.
 */

function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = url;
  });
}

export async function calcularRecorteInteligente(url, { threshold = 26, maxSize = 480 } = {}) {
  const img = await cargarImagen(url);
  const escala = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight, 1));
  const w = Math.max(1, Math.round(img.naturalWidth * escala));
  const h = Math.max(1, Math.round(img.naturalHeight * escala));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const pixel = (x, y) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const muestraEsquina = (cx, cy) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const [pr, pg, pb] = pixel(Math.min(w - 1, cx + dx), Math.min(h - 1, cy + dy));
        r += pr; g += pg; b += pb; n++;
      }
    }
    return [r / n, g / n, b / n];
  };
  const esquinas = [muestraEsquina(0, 0), muestraEsquina(w - 3, 0), muestraEsquina(0, h - 3), muestraEsquina(w - 3, h - 3)];
  const bg = [0, 1, 2].map(c => esquinas.reduce((acc, e) => acc + e[c], 0) / esquinas.length);

  const difMax = (x, y) => {
    const [r, g, b] = pixel(x, y);
    return Math.max(Math.abs(r - bg[0]), Math.abs(g - bg[1]), Math.abs(b - bg[2]));
  };
  const filaTieneContenido = (y) => {
    for (let x = 0; x < w; x++) if (difMax(x, y) > threshold) return true;
    return false;
  };
  const colTieneContenido = (x) => {
    for (let y = 0; y < h; y++) if (difMax(x, y) > threshold) return true;
    return false;
  };

  let top = 0; while (top < h - 1 && !filaTieneContenido(top)) top++;
  let bottom = h - 1; while (bottom > top && !filaTieneContenido(bottom)) bottom--;
  let left = 0; while (left < w - 1 && !colTieneContenido(left)) left++;
  let right = w - 1; while (right > left && !colTieneContenido(right)) right--;

  // Mismo piso que el backend (nunca recorta más del 65%): si el recorte
  // detectado se pasa, el backend también lo va a descartar — la preview
  // debe mostrar lo mismo que va a pasar de verdad, no un recorte que no
  // se va a aplicar.
  const minAncho = w * 0.35;
  const minAlto = h * 0.35;
  let bx = left, by = top, bw = right - left + 1, bh = bottom - top + 1;
  const cumpleMinimos = bw >= minAncho && bh >= minAlto;
  if (!cumpleMinimos) { bx = 0; by = 0; bw = w; bh = h; }

  const crop = document.createElement('canvas');
  crop.width = bw;
  crop.height = bh;
  crop.getContext('2d').drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh);

  return {
    aplicado: cumpleMinimos && !(bx === 0 && by === 0 && bw === w && bh === h),
    recortadaUrl: crop.toDataURL('image/jpeg', 0.9),
  };
}
