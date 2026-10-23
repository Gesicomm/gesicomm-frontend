// Las decisiones compartidas se guardan una sola vez, incluso con miles de
// productos. Las excepciones de una ficha se resuelven por encima de ellas.
export function cambiosContadorFichas({ horas, minutos, segundos }) {
  const valores = [horas, minutos, segundos];
  const limites = [99, 59, 59];
  if (valores.some((v, i) => v === '' || !Number.isInteger(Number(v)) || Number(v) < 0 || Number(v) > limites[i])) return null;
  const [h, m, s] = valores.map(Number);
  if (h * 3600 + m * 60 + s <= 0) return null;
  return { urgencia_horas: h, urgencia_minutos: m, urgencia_segundos: s,
    ficha_bloques: { oferta: true, urgencia: true, oferta_duracion: true } };
}

export function combinarFichaCompartida(compartida, propia = {}) {
  if (!compartida || !Object.keys(compartida).length) return propia;
  const normalizada = propia.v === 2 ? propia
    : Object.fromEntries(Object.entries(propia).filter(([, valor]) => valor !== ''));
  return {
    ...compartida, ...normalizada, v: 2,
    ficha_bloques: { ...compartida.ficha_bloques, ...normalizada.ficha_bloques },
  };
}

export function aplicarCambiosFichas({ compartida, presentaciones, cambios, todos = true, claves = [] }) {
  const siguientes = { ...presentaciones };
  if (!todos) {
    for (const clave of new Set(claves)) {
      const propia = siguientes[clave] || {};
      siguientes[clave] = { ...propia, ...cambios, v: 2,
        ...(cambios.ficha_bloques ? { ficha_bloques: { ...propia.ficha_bloques, ...cambios.ficha_bloques } } : {}),
      };
    }
    return { compartida, presentaciones: siguientes };
  }
  const comun = { ...compartida, ficha_bloques: { ...compartida?.ficha_bloques } };
  for (const [campo, valor] of Object.entries(cambios)) {
    if (campo !== 'ficha_bloques') {
      if (valor === null) delete comun[campo]; else comun[campo] = valor;
    }
  }
  for (const [campo, visible] of Object.entries(cambios.ficha_bloques || {})) {
    if (typeof visible === 'boolean') comun.ficha_bloques[campo] = visible;
    else delete comun.ficha_bloques[campo];
  }
  if (Object.hasOwn(cambios, 'confianza')) {
    if (Array.isArray(cambios.confianza)) comun.confianza = cambios.confianza;
    else delete comun.confianza;
  }
  // Reaplicar a todos también reemplaza las excepciones anteriores de los
  // campos elegidos. El resto de cada ficha permanece intacto.
  for (const [clave, propia] of Object.entries(siguientes)) {
    if (!clave.startsWith('producto:')) continue;
    const siguiente = { ...propia };
    if (cambios.ficha_bloques && propia.ficha_bloques) {
      siguiente.ficha_bloques = { ...propia.ficha_bloques };
      Object.entries(cambios.ficha_bloques).forEach(([campo, visible]) => {
        if (typeof visible === 'boolean') delete siguiente.ficha_bloques[campo];
      });
      if (!Object.keys(siguiente.ficha_bloques).length) delete siguiente.ficha_bloques;
    }
    for (const [campo, valor] of Object.entries(cambios)) {
      if (campo !== 'ficha_bloques' && valor !== null) delete siguiente[campo];
    }
    siguientes[clave] = siguiente;
  }
  if (!Object.keys(comun.ficha_bloques).length) delete comun.ficha_bloques;
  return { compartida: comun, presentaciones: siguientes };
}
