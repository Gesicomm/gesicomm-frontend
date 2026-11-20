import { formatPYG, formatFecha } from './adsShared';

/**
 * Prompt de la skill de Meta con los datos del comercio ya completos.
 *
 * Se copia y se pega como mensaje en la IA: así no pregunta lo que Gesicom
 * ya sabe (dirección del panel, tienda, web pública, negocio de Meta
 * conectado y campañas existentes). La plantilla vive en
 * public/skills/gesicom-meta-ads.md.
 */

export const RUTA_PLANTILLA_SKILL = '/skills/gesicom-meta-ads.md';

const ESTADOS = { borrador: 'borrador', activa: 'activa', pausada: 'pausada', archivada: 'archivada' };

export function webPublicaTienda(tienda) {
  if (!tienda) return null;
  if (tienda.dominio_propio && tienda.dominio_propio_verificado && tienda.dominio_propio_habilitado !== false) {
    return `https://${tienda.dominio_propio}`;
  }
  return tienda.subdominio ? `https://${tienda.subdominio}.gesicomm.com` : null;
}

export function armarDatosComercio({ panelUrl, tienda, conexionesMeta = [], campanas = [] }) {
  const lineas = ['## Datos de mi comercio (los copió Gesicom)', ''];
  lineas.push(`- **Panel de Gesicom:** ${panelUrl} (sección Publicidad)`);
  if (tienda?.nombre) {
    lineas.push(`- **Tienda:** ${tienda.nombre}`);
    const web = webPublicaTienda(tienda);
    if (web) lineas.push(`- **Web pública de la tienda:** ${web}`);
  } else {
    lineas.push('- **Tienda:** no se pudo leer; preguntame cuál uso.');
  }
  lineas.push('- **Moneda del gasto en Gesicom:** guaraníes (Gs.)');

  const conectadas = conexionesMeta.filter((c) => c.estado !== 'desconectado');
  if (conectadas.length) {
    const nombres = conectadas.map((c) => c.business_name || c.nombre).filter(Boolean);
    lineas.push(`- **Negocio de Meta conectado en Gesicom:** ${nombres.join(', ') || 'sí, sin nombre visible'}. Confirmá conmigo la cuenta publicitaria antes de usarla.`);
  } else {
    lineas.push('- **Negocio de Meta conectado en Gesicom:** ninguno. Preguntame qué cuenta publicitaria usar.');
  }

  const vigentes = campanas.filter((c) => c.estado !== 'archivada');
  if (vigentes.length) {
    lineas.push('', '**Campañas que ya existen en Gesicom** (no las dupliques):');
    vigentes.slice(0, 40).forEach((c) => {
      const partes = [ESTADOS[c.estado] || c.estado];
      partes.push(Number(c.gasto_total) > 0 ? `gasto cargado ${formatPYG(c.gasto_total)} hasta el ${formatFecha(c.gasto_ultimo_dia)}` : 'sin gasto cargado');
      if (c.meta_campaign_id) partes.push(`ID en Meta ${c.meta_campaign_id}`);
      lineas.push(`- ${c.nombre_display || c.nombre_interno} (${partes.join(' · ')})`);
    });
    if (vigentes.length > 40) lineas.push(`- …y ${vigentes.length - 40} más en Publicidad → Mis campañas.`);
  } else {
    lineas.push('', '**Campañas que ya existen en Gesicom:** ninguna todavía.');
  }
  return lineas.join('\n');
}

export function armarPromptSkill(plantilla, datos) {
  return `${plantilla.trim()}\n\n${armarDatosComercio(datos)}\n`;
}
