import React, { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import './ofertaTiempoLimitado.css';

// Este es el mismo bloque para la plantilla de producto y la ficha de combo.
export default function OfertaTiempoLimitado({ datos = {}, partes = {}, plantilla = false, documento = false, combo = false }) {
  const total = useMemo(() => Math.max(0, (Number(datos.urgencia_horas) || 0) * 3600 + (Number(datos.urgencia_minutos) || 0) * 60 + (Number(datos.urgencia_segundos) || 0)), [datos.urgencia_horas, datos.urgencia_minutos, datos.urgencia_segundos]);
  const [restante, setRestante] = useState(total);
  useEffect(() => {
    if (plantilla || documento) return undefined;
    const fin = Date.now() + total * 1000;
    setRestante(total);
    const timer = setInterval(() => setRestante(Math.max(0, Math.floor((fin - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [total, plantilla, documento]);
  const inicial = { urgencia_kicker: 'Oferta por tiempo limitado', urgencia_titulo: 'Reservá esta condición antes de que termine.', urgencia_texto: 'La fecha real se configura en Gesicomm; el contador se actualiza solo.' };
  const texto = clave => String(datos[clave] ?? (plantilla ? inicial[clave] : '')).trim();
  const valores = [Math.floor(restante / 3600), Math.floor((restante % 3600) / 60), restante % 60];
  return <div className="limited-offer pdp-limited-offer pdp-offer-card" data-gesicomm-ficha-bloque="oferta">
    <div className="limited-offer-card">
      {partes.oferta_encabezado !== false && texto('urgencia_kicker') && <p className={`limited-offer-kicker${combo ? ' cmb-contador-rotulo' : ''}`} data-gesicomm-bind={plantilla ? 'urgencia_kicker' : undefined} data-gesicomm-ficha-bloque="oferta_encabezado">{texto('urgencia_kicker')}</p>}
      {partes.oferta_nombre !== false && texto('urgencia_titulo') && <h2 data-gesicomm-bind={plantilla ? 'urgencia_titulo' : undefined} data-gesicomm-ficha-bloque="oferta_nombre">{texto('urgencia_titulo')}</h2>}
      {partes.oferta_texto !== false && texto('urgencia_texto') && <p data-gesicomm-bind={plantilla ? 'urgencia_texto' : undefined} data-gesicomm-ficha-bloque="oferta_texto">{texto('urgencia_texto')}</p>}
      {partes.oferta_duracion !== false && <div className={`countdown${combo ? ' cmb-contador cmb-contador-digitos' : ''}`} role="timer" aria-live="off" aria-label="Cuenta regresiva de la oferta" data-gesicomm-countdown="" data-gesicomm-countdown-duracion={plantilla ? undefined : total} data-gesicomm-ficha-bloque="oferta_duracion">
        {['horas', 'minutos', 'segundos'].map((unidad, i) => <span className="countdown-box" key={unidad}><b data-gesicomm-countdown-parte={unidad}>{plantilla ? '--' : String(valores[i]).padStart(2, '0')}</b><small>{['horas', 'min', 'seg'][i]}</small></span>)}
      </div>}
    </div>
  </div>;
}
export const HTML_OFERTA_PRODUCTO = renderToStaticMarkup(<OfertaTiempoLimitado plantilla />);
