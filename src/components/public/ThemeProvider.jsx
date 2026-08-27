import { createContext, useContext, useEffect, useState } from 'react';

const CLAVE_ALMACENAMIENTO = 'gesicomm-tema-publico';

const TemaContexto = createContext({ tema: 'dark', alternarTema: () => {} });

export const useTema = () => useContext(TemaContexto);

function temaInicial() {
  if (typeof window === 'undefined') return 'dark';

  // El script inline de index.html ya resolvió y aplicó el tema antes del
  // primer pintado. Leerlo de ahí (y no recalcularlo) garantiza que React
  // arranque con exactamente el mismo valor que ya está en el DOM: si
  // difirieran, el cambio posterior volvería a congelar los elementos que
  // tienen `transition: all`.
  const yaAplicado = document.documentElement.getAttribute('data-theme');
  if (yaAplicado === 'light' || yaAplicado === 'dark') return yaAplicado;

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

  // Sin cleanup que borre el atributo: antes este provider envolvía solo al
  // sitio público y quitarlo al desmontar devolvía el panel a su tema fijo.
  // Ahora envuelve toda la app, así que borrarlo dejaría la interfaz sin
  // ningún tema aplicado.
  useEffect(() => {
    if (document.documentElement.getAttribute('data-theme') !== tema) {
      document.documentElement.setAttribute('data-theme', tema);
    }
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
