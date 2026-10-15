export async function convertirImagenAPng(blob) {
  if (blob.type === 'image/png') return blob;
  if (!blob.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  const url = URL.createObjectURL(blob);
  try {
    const imagen = new Image();
    await new Promise((resolve, reject) => {
      imagen.onload = resolve;
      imagen.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      imagen.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = imagen.naturalWidth;
    canvas.height = imagen.naturalHeight;
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('No se pudo preparar la imagen.');
    contexto.drawImage(imagen, 0, 0);
    return await new Promise((resolve, reject) => canvas.toBlob(
      png => png ? resolve(png) : reject(new Error('No se pudo preparar la imagen.')), 'image/png',
    ));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function copiarImagen(cargarImagen) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Este navegador no permite copiar imágenes. Abrí la imagen y copiala desde allí.');
  }
  // La escritura empieza dentro del clic, antes de esperar la descarga.
  // ClipboardItem acepta la promesa del PNG y conserva el gesto del usuario.
  const png = Promise.resolve().then(cargarImagen).then(convertirImagenAPng);
  png.catch(() => {});
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
