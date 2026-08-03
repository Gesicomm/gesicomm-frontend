import { createContext, useContext, useEffect, useState } from 'react';

const CLAVE_ALMACENAMIENTO = 'gesicomm-tema-publico';

const TemaContexto = createContext({ tema: 'dark', alternarTema: () => {} });

export const useTema = () => useContext(TemaContexto);

function temaInicial() {
  if (typeof window === 'undefined') return 'dark';

  const guardado = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
  if (guardado === 'light' || guardado === 'dark') return guardado;

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Tema del sitio público.
 *
 * Escribe data-theme en <html> mientras está montado y lo BORRA al
 * desmontarse. Eso es deliberado: el panel de la aplicación no tiene
 * selector de tema y su CSS asume fondo oscuro, así que si alguien elige
 * claro en la landing y después entra al panel, el panel tiene que volver a
 * su tema propio en vez de quedar a medio camino.
 *
 * La preferencia sí queda guardada en localStorage, así que al volver al
 * sitio público se respeta la elección.
 */
export default function ThemeProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    return () => document.documentElement.removeAttribute('data-theme');
  }, [tema]);

  // Si la persona nunca eligió explícitamente, seguimos los cambios del
  // sistema en vivo (por ejemplo el modo oscuro automático al anochecer).
  useEffect(() => {
    if (window.localStorage.getItem(CLAVE_ALMACENAMIENTO)) return;

    const consulta = window.matchMedia('(prefers-color-scheme: light)');
    const alCambiar = (evento) => setTema(evento.matches ? 'light' : 'dark');
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  const alternarTema = () => {
    setTema((actual) => {
      const siguiente = actual === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(CLAVE_ALMACENAMIENTO, siguiente);
      return siguiente;
    });
  };

  return (
    <TemaContexto.Provider value={{ tema, alternarTema }}>
      {children}
    </TemaContexto.Provider>
  );
}
