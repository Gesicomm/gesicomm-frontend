import React from 'react';
import { getMediaUrl } from '../../services/api';
import { CATALOGO_ICONOS_BENEFICIOS } from './templates/iconosBeneficios';

export const esImagenIcono = valor => /^(https?:\/\/|\/|data:image\/)/i.test(String(valor || '').trim());

export default function IconoLibreCombo({ valor }) {
  const texto = String(valor || '').trim();
  if (!texto) return null;
  if (esImagenIcono(texto)) return <span className="cmb-icono-libre"><img className="cmb-icono-imagen" src={getMediaUrl(texto)} alt="" loading="lazy" /></span>;
  const legado = CATALOGO_ICONOS_BENEFICIOS.find(icono => icono.key === texto);
  if (legado) { const Icono = legado.Icon; return <span className="cmb-icono-libre"><Icono size={24} aria-hidden="true" /></span>; }
  const clase = /^(fa[srbld]?\s|fa-)/i.test(texto) && /^[a-z0-9_\-\s]+$/i.test(texto);
  return <span className="cmb-icono-libre"><span className="cmb-trust-icono" aria-hidden="true">{clase ? <i className={texto} /> : texto}</span></span>;
}
