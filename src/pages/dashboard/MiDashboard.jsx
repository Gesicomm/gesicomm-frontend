import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Eye, MessageCircle, CreditCard, ArrowRight, Loader, Table2, BarChart3, Store,
  FileText, Clock, CheckCircle2, PackageCheck, Wallet, Truck, ChevronDown, HelpCircle,
} from 'lucide-react';
import { landingService } from '../../services/landingService';
import { getMetricasDashboardPedidos } from '../../services/courierApi';
import './MiDashboard.css';

const MESES = [
  { id: 1, label: 'Enero' }, { id: 2, label: 'Febrero' }, { id: 3, label: 'Marzo' },
  { id: 4, label: 'Abril' }, { id: 5, label: 'Mayo' }, { id: 6, label: 'Junio' },
  { id: 7, label: 'Julio' }, { id: 8, label: 'Agosto' }, { id: 9, label: 'Septiembre' },
  { id: 10, label: 'Octubre' }, { id: 11, label: 'Noviembre' }, { id: 12, label: 'Diciembre' },
];

/** Estas ventanas de tiempo son vocabulario genérico de UI, no datos del
 * tenant — no hay nada que "descubrir" del backend acá. Lo que sí es
 * dinámico (años con pedidos reales, productos con actividad) viene de
 * `ventas.anios_disponibles` / `ventas.productos_disponibles`. */

const PRESETS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'este_mes', label: 'Este mes' },
  { id: 'mes_anterior', label: 'Mes anterior' },
  { id: 'este_anio', label: 'Este año' },
  { id: 'personalizado_mes', label: 'Por mes' },
];

/**
 * tiene que poder explicarse solo, sin manual y sin saber contabilidad.
 *
 * Es un <button> y no un <span> para que se pueda llegar con Tab y para que
 * el lector de pantalla lo anuncie; el texto vive en aria-label además de
 * en el tooltip visual, porque un tooltip en CSS no lo lee nadie.
 */
function Ayuda({ texto, ariaLabel }) {
  const etiquetaAccesible = ariaLabel || (typeof texto === 'string' ? texto : 'Ayuda contextual');
  const [posicion, setPosicion] = useState(null);
  const botonRef = useRef(null);

  const mostrar = useCallback(() => {
    const rect = botonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const ancho = Math.min(280, window.innerWidth - 32);
    const margen = 16;
    const topPreferido = rect.bottom + 10;
    const leftCentrado = rect.left + (rect.width / 2) - (ancho / 2);

    setPosicion({
      top: topPreferido,
      left: Math.max(margen, Math.min(leftCentrado, window.innerWidth - ancho - margen)),
      width: ancho,
    });
  }, []);

  const ocultar = useCallback(() => setPosicion(null), []);

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        className="md-ayuda"
        aria-label={etiquetaAccesible}
        onMouseEnter={mostrar}
        onMouseLeave={ocultar}
        onFocus={mostrar}
        onBlur={ocultar}
      >
        <HelpCircle size={13} aria-hidden="true" />
      </button>
      {posicion && createPortal(
        <span
          className="md-ayuda-burbuja-portal"
          role="tooltip"
          style={{
            position: 'fixed',
            top: posicion.top,
            left: posicion.left,
            width: posicion.width,
          }}
        >
          {texto}
        </span>,
        document.body
      )}
    </>
  );
}

/** Gs sin depender de que el valor ya venga como number — corta de raíz el
 * bug de "NaN%" en anchos de barra si algún día una API devuelve un
 * DECIMAL de Postgres como string. */
function gs(valor) {
  const n = Number(valor) || 0;
  return `Gs ${Math.round(n).toLocaleString('es-PY')}`;
}

function pct(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1).replace(/\.0$/, '')}%`;
}

function claseValor(valor) {
  const n = Number(valor) || 0;
  if (n > 0) return 'md-valor-positivo';
  if (n < 0) return 'md-valor-negativo';
  return 'md-valor-neutro';
}

/**
 * Variación contra el mismo número del período anterior (`ventas.comparativo`,
 * que el backend calcula sobre un rango de la misma duración justo antes del
 * elegido). Un importe solo no dice si el negocio va bien: Gs 335.138 puede
 * ser un récord o la mitad de lo de la semana pasada.
 *
 * Sin base con la que comparar (período anterior en cero) no se inventa un
 * "+100%": se muestra "sin dato antes", que es lo que realmente pasó.
 */
function Variacion({ actual, previo, invertirColor = false }) {
  const a = Number(actual) || 0;
  const p = Number(previo) || 0;
  if (p === 0) {
    if (a === 0) return null;
    return <span className="md-var md-var-neutro">sin dato antes</span>;
  }
  const pct = ((a - p) / Math.abs(p)) * 100;
  const sube = pct >= 0;
  // `invertirColor` para los renglones donde subir es malo (un costo).
  const bueno = invertirColor ? !sube : sube;
  const signo = sube ? '+' : '';
  return (
    <span className={`md-var ${bueno ? 'md-var-bien' : 'md-var-mal'}`}>
      {signo}{pct.toFixed(1).replace(/\.0$/, '')}% vs. período anterior
    </span>
  );
}

/**
 * Fila de detalle que se abre debajo de un producto y muestra de qué está
 * hecho su Costo.
 *
 * Va como FILA de la tabla y no como burbuja flotante por dos razones duras:
 *  - `.md-table-wrap` tiene `overflow-x: auto` para poder scrollear la tabla
 *    en pantallas chicas, y eso hace que `overflow-y` compute a `auto`: una
 *    burbuja posicionada se recorta contra el borde de la tabla y encima le
 *    inventa scroll vertical (medido: la burbuja terminaba 187px por debajo
 *    del contenedor).
 *  - en celular no hay mouse: un desglose que solo existe al pasar el cursor
 *    no existe para la mitad de la gente.
 *
 * Los conceptos en cero no se listan: un desglose de cuatro renglones donde
 * tres dicen Gs 0 esconde el que importa.
 */
function DetalleCosto({ producto, columnas }) {
  const d = producto.costo_detalle || {};
  // Mismo orden que el estado de resultados de la tarjeta de Rentabilidad:
  // primero lo que costó la mercadería, después lo que costó venderla y
  // entregarla, y al final la parte de los gastos generales. Si las dos
  // vistas ordenaran distinto, el comerciante tendría que traducir.
  const costosVenta = [
    { label: 'Envío', valor: d.envio, ayuda: 'lo que se le pagó al courier' },
    { label: 'Comisión de pago', valor: d.comision, ayuda: 'lo que se queda la pasarela' },
    { label: 'IVA', valor: d.iva, ayuda: 'de los pedidos con factura' },
  ].filter(r => Number(r.valor) > 0);

  // Los gastos del negocio llegan al producto por cuatro caminos distintos,
  // y cada uno se explica distinto: dos los eligió el usuario o su campaña
  // de Meta (van enteros, sin repartir) y dos son plata del período
  // repartida por unidades vendidas (fijos y variables, cada uno en su
  // línea — solo el fijo entra al punto de equilibrio). Juntarlos en un
  // solo renglón "Gastos operativos" escondía de dónde salía el número y
  // era lo que hacía desconfiar de la tabla. Lo único que no aparece acá es
  // la publicidad de Meta SIN campaña propia asignada — resta de la
  // Ganancia Neta de arriba, no del costo de este producto en particular
  // (ver la leyenda debajo de la tabla).
  const gastosGenerales = [
    { label: 'Gastos de este producto', valor: d.gastos_directos, ayuda: 'cargados en Finanzas y atados a este producto' },
    { label: 'Publicidad de este producto', valor: d.publicidad_directa, ayuda: 'de una campaña de Meta Ads asignada a este producto en Ads & Campañas' },
    { label: 'Gastos fijos', valor: d.fijos, ayuda: 'la parte que le toca de alquiler, sueldos y servicios' },
    { label: 'Gastos variables', valor: d.variables, ayuda: 'la parte que le toca de comisiones y otros gastos variables sin producto asociado' },
  ].filter(r => Number(r.valor) > 0);

  return (
    <tr className="md-detalle-fila">
      <td colSpan={columnas}>
        <div className="md-detalle-caja">
          <div className="md-detalle-cuenta">
            <span className="md-detalle-titulo">Costos de venta</span>
            <div className="md-detalle-linea">
              <span className="md-detalle-label">Costo de productos<small>lo que pagaste por la mercadería</small></span>
              <span className="md-detalle-valor">{gs(d.mercaderia)}</span>
            </div>
            {costosVenta.map(r => (
              <div key={r.label} className="md-detalle-linea">
                <span className="md-detalle-label">{r.label}<small>{r.ayuda}</small></span>
                <span className="md-detalle-valor">{gs(r.valor)}</span>
              </div>
            ))}
            {gastosGenerales.map(r => (
              <div key={r.label} className="md-detalle-linea">
                <span className="md-detalle-label">{r.label}<small>{r.ayuda}</small></span>
                <span className="md-detalle-valor">{gs(r.valor)}</span>
              </div>
            ))}
            <div className="md-detalle-linea md-detalle-total">
              <span className="md-detalle-label">Costo total</span>
              <span className="md-detalle-valor">{gs(producto.costo)}</span>
            </div>
          </div>

          <div className="md-detalle-cuenta">
            <span className="md-detalle-titulo">Cómo se llega a la ganancia</span>
            <div className="md-detalle-linea">
              <span className="md-detalle-label">Venta<small>lo que se cobró en estos pedidos</small></span>
              <span className="md-detalle-valor">{gs(producto.venta)}</span>
            </div>
            <div className="md-detalle-linea">
              <span className="md-detalle-label">− Costo total</span>
              <span className="md-detalle-valor">{gs(producto.costo)}</span>
            </div>
            <div className="md-detalle-linea md-detalle-total">
              <span className="md-detalle-label">= Ganancia</span>
              <span className={`md-detalle-valor ${claseValor(producto.ganancia)}`}>{gs(producto.ganancia)}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function formatFechaCorta(iso) {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

function pathBarraRedondeada(x, yTop, ancho, alto, radio) {
  const r = Math.max(0, Math.min(radio, ancho / 2, alto));
  const yBase = yTop + alto;
  if (alto <= 0) return '';
  if (r <= 0.5) return `M ${x} ${yBase} L ${x} ${yTop} L ${x + ancho} ${yTop} L ${x + ancho} ${yBase} Z`;
  return `M ${x} ${yBase}
          L ${x} ${yTop + r}
          Q ${x} ${yTop} ${x + r} ${yTop}
          L ${x + ancho - r} ${yTop}
          Q ${x + ancho} ${yTop} ${x + ancho} ${yTop + r}
          L ${x + ancho} ${yBase} Z`;
}

function pathLineaSuave(puntos) {
  if (puntos.length === 0) return '';
  if (puntos.length === 1) return `M ${puntos[0].x} ${puntos[0].y}`;
  return puntos.reduce((path, punto, i) => {
    if (i === 0) return `M ${punto.x} ${punto.y}`;
    const previo = puntos[i - 1];
    const medioX = (previo.x + punto.x) / 2;
    return `${path} C ${medioX} ${previo.y}, ${medioX} ${punto.y}, ${punto.x} ${punto.y}`;
  }, '');
}

function pathAreaSuave(puntos, yBase) {
  if (puntos.length === 0) return '';
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  return `${pathLineaSuave(puntos)} L ${ultimo.x} ${yBase} L ${primero.x} ${yBase} Z`;
}

/** Fila de ranking con barra proporcional — nunca divide por un máximo de
 * 0 (esa división es lo que rompía el ancho de las barras antes: NaN% cae
 * al ancho por defecto del navegador, que en un bloque es "ocupar todo"). */
function FilaRanking({ posicion, nombre, valor, valorLabel, max, tono }) {
  const pct = max > 0 ? Math.max(2, (valor / max) * 100) : 0;
  return (
    <div className="md-rank-fila">
      <span className="md-rank-num">{posicion}</span>
      <div className="md-rank-cuerpo">
        <div className="md-rank-linea">
          <span className="md-rank-nombre">{nombre}</span>
          <span className="md-rank-valor">{valorLabel}</span>
        </div>
        <div className="md-rank-track">
          <div className={`md-rank-barra md-rank-barra-${tono}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function GraficoTendencia({ serie, className = '' }) {
  const [vistaTabla, setVistaTabla] = useState(false);
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const ANCHO = 800;
  const ALTO = 168;
  const PAD_INF = 22;
  const max = Math.max(1, ...serie.map(d => Math.max(d.visitas, d.contactos)));
  const grupoAncho = ANCHO / (serie.length || 1);
  const barAncho = Math.max(1.5, (grupoAncho - 4) / 2);
  const lineasGrid = [0.25, 0.5, 0.75, 1];

  const indicesEtiquetados = useMemo(() => {
    const n = serie.length;
    if (n <= 1) return new Set([0]);
    return new Set([0, Math.floor((n - 1) / 2), n - 1]);
  }, [serie.length]);

  const sinDatos = serie.every(d => d.visitas === 0 && d.contactos === 0);

  const handleMouseMove = useCallback((e) => {
    if (!wrapRef.current || !serie.length) return;
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < 0 || x > rect.width) {
      setHover(null);
      return;
    }
    const idx = Math.floor((x / rect.width) * serie.length);
    const clamped = Math.max(0, Math.min(serie.length - 1, idx));
    setHover(clamped);
  }, [serie.length]);

  const handleMouseLeave = useCallback(() => {
    setHover(null);
  }, []);

  const tooltipStyle = useMemo(() => {
    if (hover === null || !serie.length) return {};
    const pct = ((hover + 0.5) / serie.length) * 100;
    const transform = pct < 18 ? 'translateX(0%)' : pct > 82 ? 'translateX(-100%)' : 'translateX(-50%)';
    return {
      left: `${pct}%`,
      transform,
    };
  }, [hover, serie.length]);

  return (
    <section className={`md-card md-chart-card ${className}`}>
      <div className="md-chart-head">
        <div>
          <h3 className="md-card-title">Visitas vs. contactos por día</h3>
          <div className="md-legend">
            <span className="md-legend-item"><i className="md-dot-visitas" /> Visitas</span>
            <span className="md-legend-item"><i className="md-dot-contactos" /> Contactos WhatsApp</span>
          </div>
        </div>
        <button type="button" className="md-btn-ghost" onClick={() => setVistaTabla(v => !v)}>
          {vistaTabla ? <BarChart3 size={13} /> : <Table2 size={13} />}
          {vistaTabla ? 'Gráfico' : 'Tabla'}
        </button>
      </div>

      {sinDatos ? (
        <div className="md-empty">
          <BarChart3 size={22} opacity={0.35} />
          <p>Sin visitas ni contactos registrados en este período.</p>
        </div>
      ) : vistaTabla ? (
        <div className="md-table-wrap">
          <table className="md-table">
            <thead><tr><th>Fecha</th><th>Visitas</th><th>Contactos</th><th>Valor en carrito</th></tr></thead>
            <tbody>
              {serie.map(d => (
                <tr key={d.fecha}>
                  <td>{formatFechaCorta(d.fecha)}</td>
                  <td>{d.visitas}</td>
                  <td>{d.contactos}</td>
                  <td>{gs(d.valor_carritos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={wrapRef}
          className="md-chart-svg-wrap"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseMove}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseLeave}
        >
          <svg viewBox={`0 0 ${ANCHO} ${ALTO + PAD_INF}`} preserveAspectRatio="none" className="md-chart-svg">
            {lineasGrid.map(f => (
              <line key={f} x1="0" y1={ALTO * (1 - f)} x2={ANCHO} y2={ALTO * (1 - f)} className="md-chart-grid" />
            ))}
            <line x1="0" y1={ALTO} x2={ANCHO} y2={ALTO} className="md-chart-baseline" />

            {hover !== null && (
              <rect
                x={hover * grupoAncho}
                y={0}
                width={grupoAncho}
                height={ALTO}
                fill="color-mix(in srgb, var(--color-fg) 6%, transparent)"
                rx={3}
                style={{ pointerEvents: 'none' }}
              />
            )}

            {serie.map((d, i) => {
              const xGrupo = i * grupoAncho;
              const altoV = (d.visitas / max) * (ALTO - 6);
              const altoC = (d.contactos / max) * (ALTO - 6);
              const activo = hover === i;
              return (
                <g key={d.fecha} style={{ pointerEvents: 'none' }}>
                  <path
                    d={pathBarraRedondeada(xGrupo + 1, ALTO - altoV, barAncho, altoV, 2.5)}
                    className={`md-bar md-bar-visitas ${activo ? 'activa' : ''}`}
                  />
                  <path
                    d={pathBarraRedondeada(xGrupo + barAncho + 3, ALTO - altoC, barAncho, altoC, 2.5)}
                    className={`md-bar md-bar-contactos ${activo ? 'activa' : ''}`}
                  />
                  {indicesEtiquetados.has(i) && (
                    <text x={xGrupo + grupoAncho / 2} y={ALTO + 16} className="md-chart-label" textAnchor="middle">
                      {formatFechaCorta(d.fecha)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hover !== null && serie[hover] && (
            <div className="md-chart-tooltip" style={tooltipStyle}>
              <strong>{formatFechaCorta(serie[hover].fecha)}</strong>
              <span className="md-tt-fila"><i className="md-dot-visitas" /><span className="md-tt-nombre">Visitas</span><span className="md-tt-valor">{serie[hover].visitas}</span></span>
              <span className="md-tt-fila"><i className="md-dot-contactos" /><span className="md-tt-nombre">Contactos WhatsApp</span><span className="md-tt-valor">{serie[hover].contactos}</span></span>
              {serie[hover].valor_carritos > 0 && <small>{gs(serie[hover].valor_carritos)} en carritos</small>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Cruza dos rankings que hoy viven en fuentes separadas: el interés en la
 * landing (LandingEvento, vía pixel.productos_mas_consultados) y las ventas
 * cargadas a mano (Envio/EnvioItem, vía ventas.ranking_productos). No hay un
 * ID compartido entre ambos — se cruza por nombre normalizado. Funciona en la
 * práctica porque el nombre que llega por el Pixel ya es el nombre canónico
 * del catálogo (ver nombreCanonico() en landingPublica.controller.js), y
 * nombre_producto de un pedido se carga desde el mismo selector de productos.
 * Si alguna vendedora tipeara un nombre distinto a mano, esa fila no cruza y
 * aparece como dos entradas separadas — más seguro que ocultar el dato.
 */
function useEmbudoPorProducto(ventas, pixel) {
  return useMemo(() => {
    const normalizar = (s) => (s || '').trim().toLowerCase();
    const mapa = new Map();

    (pixel?.productos_mas_consultados || []).forEach(p => {
      const clave = normalizar(p.nombre);
      if (!clave) return;
      mapa.set(clave, { nombre: p.nombre, leads: p.consultas, confirmados: 0, compras: 0 });
    });

    // Confirmado y comprado NO son lo mismo, y mezclarlos escondía justo el
    // paso donde se cae la plata: un pedido confirmado que nunca se entrega
    // no es una venta. Por eso son dos columnas separadas:
    //   confirmados = el cliente dijo que sí (pedido confirmado)
    //   compras     = el pedido llegó a sus manos (entregado)
    (ventas?.ranking_productos || []).forEach(p => {
      const clave = normalizar(p.nombre);
      if (!clave) return;
      // Solo se completan productos que YA están en el mapa, o sea que
      // tuvieron interés en la landing. Un producto vendido a mano o por
      // WhatsApp no entra: esta tabla compara el interés del pixel contra la
      // venta, y sin interés no hay nada que comparar. Peor todavía, aparecía
      // con "0 leads" y se leía como que la landing no supo venderlo, cuando
      // en realidad nunca estuvo publicado ahí.
      const previo = mapa.get(clave);
      if (previo) {
        previo.confirmados = p.confirmados;
        previo.compras = p.entregados;
      }
    });

    return [...mapa.values()]
      .filter(p => p.leads > 0)
      // La conversión de esta tabla mide el tramo comercial real:
      // pedidos confirmados -> compras entregadas. Los leads quedan como
      // contexto de demanda, pero no son el denominador porque una compra
      // puede venir de una conversación ya abierta o de otro camino.
      .map(p => ({ ...p, conversion: p.confirmados > 0 ? (p.compras / p.confirmados) * 100 : null }))
      .sort((a, b) => b.leads - a.leads || b.compras - a.compras);
  }, [ventas, pixel]);
}

function TablaEmbudoProductos({ filas }) {
  if (filas.length === 0) {
    return (
      <p className="md-empty-hint">
        Todavía nadie consultó productos en tu landing en este período. Acá aparecen
        solo los productos que despertaron interés ahí; los que vendés a mano o por
        WhatsApp se ven en "Más Vendidos".
      </p>
    );
  }
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Leads <Ayuda texto="Cuánta gente mostró interés en este producto en tu landing: cuanta gente llego a whatsapp con ese producto." /></th>
            <th>Confirmados <Ayuda texto="De esos interesados, a cuántos les tomaste el pedido y lo confirmaron. Todavía no es una venta cobrada." /></th>
            <th>Compras <Ayuda texto="De esos pedidos confirmados, cuántos llegaron a manos del cliente. Esta sí es la venta concretada." /></th>
            <th>Conversión <Ayuda texto="De cada 100 pedidos confirmados de este producto, cuántos terminaron entregados. Es Compras dividido Confirmados." /></th>
          </tr>
        </thead>
        <tbody>
          {filas.map(p => (
            <tr key={p.nombre}>
              <td>{p.nombre}</td>
              <td>{p.leads}</td>
              <td>{p.confirmados}</td>
              <td>{p.compras}</td>
              <td>{p.conversion === null ? '—' : `${p.conversion.toFixed(1).replace(/\.0$/, '')}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Contenido de un embudo — pasos lineales con ícono + valor + flecha de
 * conversión entre consecutivos. Sin tarjeta propia: los 4 embudos (Meta/
 * CAPI, WhatsApp, Formularios Web, Pago Web) viven ahora dentro de UNA sola
 * tarjeta "Embudo de Conversión" con tabs — esto es solo el contenido que
 * cambia al cambiar de tab. Mismo patrón visual que ya tenía cada embudo
 * por separado, ningún cálculo cambia.
 */
function EmbudoPasos({ pasos, nota, pieFinal }) {
  return (
    <>
      <div className="md-funnel">
        {pasos.map((paso, i) => (
          <React.Fragment key={paso.label}>
            {i > 0 && (
              <div className="md-funnel-arrow">
                {/* Un paso con valor null es un dato que no se pudo traer, no
                    un cero. Calcular un porcentaje contra eso daría "0%", que
                    se lee como "no convirtió nadie" cuando en realidad no
                    sabemos cuánta gente entró. */}
                <span className="md-funnel-pct">
                  {paso.valor == null || pasos[i - 1].valor == null
                    ? '—'
                    : `${pasos[i - 1].valor > 0 ? ((paso.valor / pasos[i - 1].valor) * 100).toFixed(1) : '0'}%`}
                </span>
                <div className="md-funnel-line" />
              </div>
            )}
            <div className={`md-funnel-step ${i === pasos.length - 1 ? 'md-funnel-step-final' : ''}`}>
              <div className={`md-funnel-icon md-icon-${paso.tono || 'visitas'}`}>{paso.icono}</div>
              <div className="md-funnel-info">
                <span className="md-funnel-val">{paso.valorLabel ?? paso.valor}</span>
                <span className="md-funnel-label">{paso.label}</span>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
      {pieFinal && (
        <div className="md-funnel-footer">
          <span>{pieFinal}</span>
        </div>
      )}
      {nota && <p className="md-empty-hint md-funnel-nota">{nota}</p>}
    </>
  );
}

/**
 * Evolución de Ventas/Costos/Ganancia por día — mismo mecanismo de SVG que
 * GraficoTendencia (grid, baseline, hover, tooltip), pero con líneas en vez
 * de barras porque son 3 series continuas, no 2 conteos discretos. Los
 * valores (monto/costo/ganancia) vienen tal cual de `ventas.tendencias`
 * (pedidosAnalyticsService.getTimelineTendencias) — ganancia puede ser
 * negativa en un día con pérdida, por eso la escala usa un mínimo real en
 * vez de asumir que todo arranca en cero.
 */
function GraficoEvolucionFinanciera({ serie, className = '' }) {
  const [vistaTabla, setVistaTabla] = useState(false);
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const ANCHO = 800;
  const ALTO = 168;
  const PAD_INF = 22;
  const lineasGrid = [0.25, 0.5, 0.75, 1];
  const CAMPOS = [
    { campo: 'monto', clase: 'ventas', label: 'Ventas' },
    { campo: 'costo', clase: 'costos', label: 'Costos' },
    { campo: 'ganancia', clase: 'ganancia', label: 'Ganancia' },
  ];

  // Number(x) || 0 en vez de leer el campo crudo: alcanza UN valor undefined
  // (ej. un backend que todavía no devuelve costo/ganancia por día) para que
  // max/min queden en NaN, y con la escala en NaN las tres polilíneas se
  // dibujan sin coordenadas válidas y el gráfico aparece vacío sin ningún
  // error visible. Mismo criterio que gs() más arriba.
  const valorDe = (d, campo) => Number(d?.[campo]) || 0;
  const valores = serie.flatMap(d => [valorDe(d, 'monto'), valorDe(d, 'costo'), valorDe(d, 'ganancia')]);
  const max = Math.max(1, 0, ...valores);
  const min = Math.min(0, ...valores);
  const rango = Math.max(1, max - min);
  const grupoAncho = ANCHO / (serie.length || 1);

  const indicesEtiquetados = useMemo(() => {
    const n = serie.length;
    if (n <= 1) return new Set([0]);
    return new Set([0, Math.floor((n - 1) / 2), n - 1]);
  }, [serie.length]);

  const sinDatos = serie.every(d => valorDe(d, 'monto') === 0 && valorDe(d, 'costo') === 0 && valorDe(d, 'ganancia') === 0);
  const hayPerdida = serie.some(d => valorDe(d, 'ganancia') < 0);

  const yFor = useCallback((v) => ALTO - ((v - min) / rango) * ALTO, [min, rango]);
  const xFor = useCallback((i) => i * grupoAncho + grupoAncho / 2, [grupoAncho]);

  const handleMouseMove = useCallback((e) => {
    if (!wrapRef.current || !serie.length) return;
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < 0 || x > rect.width) {
      setHover(null);
      return;
    }
    const idx = Math.floor((x / rect.width) * serie.length);
    setHover(Math.max(0, Math.min(serie.length - 1, idx)));
  }, [serie.length]);

  const handleMouseLeave = useCallback(() => setHover(null), []);

  const tooltipStyle = useMemo(() => {
    if (hover === null || !serie.length) return {};
    const pct = ((hover + 0.5) / serie.length) * 100;
    const transform = pct < 18 ? 'translateX(0%)' : pct > 82 ? 'translateX(-100%)' : 'translateX(-50%)';
    return { left: `${pct}%`, transform };
  }, [hover, serie.length]);

  return (
    <section className={`md-card md-chart-card ${className}`}>
      <div className="md-chart-head">
        <div>
          <h3 className="md-card-title">Evolución de Ventas</h3>
          <div className="md-legend">
            {CAMPOS.map(c => (
              <span key={c.campo} className="md-legend-item"><i className={`md-dot-${c.clase}`} /> {c.label}</span>
            ))}
          </div>
        </div>
        <button type="button" className="md-btn-ghost" onClick={() => setVistaTabla(v => !v)}>
          {vistaTabla ? <BarChart3 size={13} /> : <Table2 size={13} />}
          {vistaTabla ? 'Gráfico' : 'Tabla'}
        </button>
      </div>

      {sinDatos ? (
        <div className="md-empty">
          <BarChart3 size={22} opacity={0.35} />
          <p>Sin ventas registradas en este período.</p>
        </div>
      ) : vistaTabla ? (
        <div className="md-table-wrap">
          <table className="md-table">
            <thead><tr><th>Fecha</th><th>Ventas</th><th>Costos</th><th>Ganancia</th></tr></thead>
            <tbody>
              {serie.map(d => (
                <tr key={d.fecha}>
                  <td>{formatFechaCorta(d.fecha)}</td>
                  <td>{gs(d.monto)}</td>
                  <td>{gs(d.costo)}</td>
                  <td className={claseValor(d.ganancia)}>{gs(d.ganancia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={wrapRef}
          className="md-chart-svg-wrap"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseMove}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseLeave}
        >
          <svg viewBox={`0 0 ${ANCHO} ${ALTO + PAD_INF}`} preserveAspectRatio="none" className="md-chart-svg">
            <defs>
              <linearGradient id="md-area-ventas" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--md-visitas)" stopOpacity="0.2" />
                <stop offset="72%" stopColor="var(--md-visitas)" stopOpacity="0.03" />
                <stop offset="100%" stopColor="var(--md-visitas)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="md-area-ganancia" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--md-positivo)" stopOpacity="0.18" />
                <stop offset="72%" stopColor="var(--md-positivo)" stopOpacity="0.03" />
                <stop offset="100%" stopColor="var(--md-positivo)" stopOpacity="0" />
              </linearGradient>
              {/* La pérdida se pinta al revés que la ganancia: más fuerte
                  abajo, porque crece hacia abajo. Con el mismo degradado
                  dorado para los dos lados, un día de pérdida se veía igual
                  que uno de poca ganancia. */}
              <linearGradient id="md-area-perdida" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--md-negativo)" stopOpacity="0" />
                <stop offset="28%" stopColor="var(--md-negativo)" stopOpacity="0.06" />
                <stop offset="100%" stopColor="var(--md-negativo)" stopOpacity="0.22" />
              </linearGradient>
              {/* Cortan el dibujo en dos: lo que está por encima del cero y
                  lo que está por debajo. Así la MISMA curva se pinta dorada
                  arriba y roja abajo, sin tener que calcular dónde cruza. */}
              <clipPath id="md-clip-ganancia">
                <rect x="0" y="0" width={ANCHO} height={Math.max(0, yFor(0))} />
              </clipPath>
              <clipPath id="md-clip-perdida">
                <rect x="0" y={yFor(0)} width={ANCHO} height={Math.max(0, ALTO - yFor(0))} />
              </clipPath>
              <filter id="md-line-glow" x="-8%" y="-18%" width="116%" height="136%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x="0" y="0" width={ANCHO} height={ALTO} rx="10" className="md-chart-plot-bg" />

            {lineasGrid.map(f => (
              <line key={f} x1="0" y1={ALTO * (1 - f)} x2={ANCHO} y2={ALTO * (1 - f)} className="md-chart-grid" />
            ))}
            {/* Con valores negativos, la línea del cero deja de ser
                decorativa: es la referencia que separa ganar de perder. Se
                marca y se rotula solo en ese caso, para no ensuciar el
                gráfico cuando todo está en positivo. */}
            <line
              x1="0"
              y1={yFor(0)}
              x2={ANCHO}
              y2={yFor(0)}
              className={hayPerdida ? 'md-chart-cero' : 'md-chart-baseline'}
            />
            {hayPerdida && (
              <text x="4" y={yFor(0) - 4} className="md-chart-label md-chart-cero-label">0</text>
            )}

            {hover !== null && (
              <line x1={xFor(hover)} y1={0} x2={xFor(hover)} y2={ALTO} className="md-chart-grid" style={{ pointerEvents: 'none' }} />
            )}

            {CAMPOS.filter(c => c.campo !== 'costo').map(c => {
              const puntos = serie.map((d, i) => ({ x: xFor(i), y: yFor(valorDe(d, c.campo)) }));
              const d = pathAreaSuave(puntos, yFor(0));
              // La ganancia se dibuja dos veces con el mismo trazo: la parte
              // de arriba del cero en dorado y la de abajo en rojo. Cada una
              // recortada a su mitad, así el cruce se resuelve solo.
              if (c.campo === 'ganancia') {
                return (
                  <g key="area-ganancia">
                    <path d={d} className="md-area md-area-ganancia" clipPath="url(#md-clip-ganancia)" />
                    <path d={d} className="md-area md-area-perdida" clipPath="url(#md-clip-perdida)" />
                  </g>
                );
              }
              return (
                <path
                  key={`area-${c.campo}`}
                  d={d}
                  className={`md-area md-area-${c.clase}`}
                />
              );
            })}

            {CAMPOS.map(c => {
              const puntos = serie.map((d, i) => ({ x: xFor(i), y: yFor(valorDe(d, c.campo)) }));
              const d = pathLineaSuave(puntos);
              // Mismo criterio para el trazo: el tramo bajo cero va en rojo,
              // para que la caída se lea como pérdida y no como "ganó menos".
              if (c.campo === 'ganancia') {
                return (
                  <g key="linea-ganancia">
                    <path fill="none" d={d} className="md-line md-line-ganancia" clipPath="url(#md-clip-ganancia)" />
                    <path fill="none" d={d} className="md-line md-line-perdida" clipPath="url(#md-clip-perdida)" />
                  </g>
                );
              }
              return (
                <path
                  key={c.campo}
                  fill="none"
                  d={d}
                  className={`md-line md-line-${c.clase}`}
                />
              );
            })}

            {hover !== null && serie[hover] && CAMPOS.map(c => (
              <circle key={c.campo} cx={xFor(hover)} cy={yFor(valorDe(serie[hover], c.campo))} r={3.5} className={`md-line-punto md-line-punto-${c.clase}`} />
            ))}

            {serie.map((d, i) => indicesEtiquetados.has(i) && (
              <text key={d.fecha} x={xFor(i)} y={ALTO + 16} className="md-chart-label" textAnchor="middle">
                {formatFechaCorta(d.fecha)}
              </text>
            ))}
          </svg>
          {/* Se recorre CAMPOS en vez de escribir las tres filas a mano: así el
              color, el nombre y el orden del tooltip son SIEMPRE los mismos que
              los de la leyenda y los de las líneas. Escritas a mano, alcanzaba
              con cambiar un color en la leyenda para que el tooltip mintiera. */}
          {hover !== null && serie[hover] && (
            <div className="md-chart-tooltip" style={tooltipStyle}>
              <strong>{formatFechaCorta(serie[hover].fecha)}</strong>
              {CAMPOS.map(c => {
                const valor = valorDe(serie[hover], c.campo);
                return (
                  <span key={c.campo} className="md-tt-fila">
                    <i className={`md-dot-${c.clase}`} />
                    <span className="md-tt-nombre">{c.label}</span>
                    <span className={`md-tt-valor ${c.campo === 'ganancia' ? claseValor(valor) : (valor < 0 ? 'md-valor-negativo' : '')}`}>{gs(valor)}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Comparación compacta entre canales de origen de pedido — reusa las mismas
 * cifras ya calculadas para cada embudo, solo las tabula lado a lado. Los
 * `?? '—'` no son decorativos: si el backend todavía no expone un campo
 * (ej. una versión anterior sin `entregados`/`efectividad` por canal), la
 * celda dice "—" en vez de quedar en blanco y parecer un cero real. */
function TablaRendimientoCanal({ filas }) {
  if (filas.length === 0) {
    return <p className="md-empty-hint">Todavía no hay pedidos en este período por ningún canal.</p>;
  }
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            <th>Canal</th>
            <th>Ventas <Ayuda texto="Venta neta de productos entregados por este canal, sin contar delivery/flete." /></th>
            <th>Costos totales <Ayuda texto="Mercadería, publicidad, comisiones, logística, IVA y gastos operativos atribuibles a este canal." /></th>
            <th>Utilidad neta <Ayuda texto="Ventas menos todos los costos atribuibles del canal." /></th>
            <th>Margen neto <Ayuda texto="De cada Gs 100 vendidos por este canal, cuántos quedan como utilidad." /></th>
            <th>ROI canal <Ayuda texto="Utilidad neta dividida por costo total del canal. Mide cuánta utilidad genera cada guaraní invertido." /></th>
          </tr>
        </thead>
        <tbody>
          {filas.map(f => (
            <tr key={f.canal}>
              <td>{f.canal}</td>
              <td>{gs(f.ventas)}</td>
              <td>{gs(f.costos_totales)}</td>
              <td className={claseValor(f.utilidad_neta)}>{gs(f.utilidad_neta)}</td>
              <td className={claseValor(f.margen_neto)}>{pct(f.margen_neto)}</td>
              <td className={f.roi_canal == null ? 'md-valor-neutro' : claseValor(f.roi_canal)}>{pct(f.roi_canal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Ranking de landings: qué página vende más, con su tráfico al lado para que
 * se pueda ver POR QUÉ (una landing puede facturar poco porque no le llega
 * gente, o porque le llega y no convierte — son dos problemas distintos).
 *
 * Esta tabla NO obedece al selector de landing del header, a propósito:
 * comparar páginas entre sí con una sola seleccionada no compara nada. Sí
 * respeta el período y el filtro de producto.
 */
function TablaRankingLandings({ ranking }) {
  const filas = ranking?.top || [];
  if (filas.length === 0) {
    return (
      <p className="md-empty-hint">
        Todavía no hay actividad en tus landings en este período. Los pedidos cargados a mano
        o que entraron por WhatsApp no aparecen acá, porque no vienen de ninguna página.
      </p>
    );
  }
  const t = ranking.totales;
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            <th>Landing</th>
            <th>Visitas <Ayuda texto="Cuánta gente entró a esa página en el período." /></th>
            <th>Pedidos <Ayuda texto="Cuántos pedidos salieron de esa página, sin importar cómo terminaron." /></th>
            <th>Entregados <Ayuda texto="De esos pedidos, cuántos llegaron a manos del cliente. Es lo único que factura." /></th>
            <th>Facturación <Ayuda texto="La plata que entró por esa página: la suma de sus pedidos entregados, sin contar el delivery." /></th>
            <th>Ganancia <Ayuda texto="Lo que dejó esa página: su facturación menos la mercadería, la comisión y el IVA. No le descuenta los costos fijos del negocio (alquiler, sueldos, publicidad) porque esos no son de una landing en particular, ni el delivery porque lo paga el cliente." /></th>
            <th>Conversión <Ayuda texto="De cada 100 personas que entraron a esa página, cuántas terminaron comprando y recibiendo el pedido." /></th>
          </tr>
        </thead>
        <tbody>
          {filas.map(l => (
            <tr key={l.landing_id}>
              <td>{l.nombre}</td>
              <td>{l.visitas}</td>
              <td>{l.pedidos}</td>
              <td>{l.entregados}</td>
              <td>{gs(l.facturacion)}</td>
              <td className={claseValor(l.ganancia)}>{gs(l.ganancia)}</td>
              {/* Sin visitas registradas no hay 0% de conversión: no hay con
                  qué calcularla. Un guion dice eso; un 0% mentiría. */}
              <td>{l.visitas > 0 ? `${l.conversion}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="md-table-total">
            <td>
              Total
              {ranking.total_landings > filas.length && (
                <span className="md-table-total-nota"> · {ranking.total_landings} landings con actividad</span>
              )}
            </td>
            <td>{t.visitas}</td>
            <td>{t.pedidos}</td>
            <td>{t.entregados}</td>
            <td>{gs(t.facturacion)}</td>
            <td className={claseValor(t.ganancia)}>{gs(t.ganancia)}</td>
            <td>{t.visitas > 0 ? `${t.conversion}%` : '—'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Más Vendidos: Producto / Unidades / Venta / Costo / Ganancia / Pérdida /
 * Rentabilidad — la pregunta que se hace el comerciante, en ese orden.
 *
 * El prorrateo de los costos comunes ya viene absorbido dentro de `costo`
 * desde el backend: acá no aparece ni como columna ni como concepto, porque
 * es mecanismo de cálculo, no información de negocio.
 *
 * `perdida` va aparte y NO se descuenta de la ganancia — descontarla otra
 * vez sería contar dos veces la misma plata.
 */
/** Margen bruto con red: si el backend todavía no lo manda, se reconstruye
 * con el desglose de costo en vez de mostrar "Gs NaN". Mismo criterio que
 * los `??` del ranking de productos. */
const margenBruto = (p) => Number(
  p.margen_bruto ?? ((Number(p.venta) || 0) - (Number(p.costo_detalle?.mercaderia) || 0)),
) || 0;
const pctMargenBruto = (p) => {
  if (p.pct_margen_bruto != null) return p.pct_margen_bruto;
  const venta = Number(p.venta) || 0;
  return venta > 0 ? Number(((margenBruto(p) / venta) * 100).toFixed(1)) : 0;
};

function TablaMasVendidos({ filas }) {
  // Qué producto tiene el desglose abierto. Uno solo a la vez: la tabla es
  // para comparar productos, no para leer cuatro detalles apilados.
  const [abierto, setAbierto] = useState(null);
  const COLUMNAS = 8;

  if (filas.length === 0) {
    return <p className="md-empty-hint">Todavía no hay pedidos entregados en este período — en cuanto confirmes uno, aparece acá.</p>;
  }
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Unidades Vendidas<Ayuda texto="Cuántas unidades de este producto entregaste al cliente." /></th>
            <th>Venta <Ayuda texto="El precio del producto en los pedidos entregados. El delivery no está acá: lo paga el cliente aparte." /></th>
            <th>Margen Bruto <Ayuda texto="La Venta menos lo que te costó la mercadería, sin contar nada más. Te dice si el producto está bien pescado: si acá ya estás en cero, ningún gasto que recortes lo va a salvar." /></th>
            <th>Costo <Ayuda texto="Todo lo que te costó este producto. Tocá el número para abrir el desglose renglón por renglón." /></th>
            <th>Ganancia <Ayuda texto="La Venta menos el Costo. Es la plata que te dejó este producto." /></th>
            <th>Pérdida <Ayuda texto="Mercadería que se perdió o volvió rota, contada a lo que te costó. Lo que se devolvió en buen estado no cuenta porque vuelve al stock. No se resta de la Ganancia para no descontarla dos veces." /></th>
            <th>Rentabilidad <Ayuda texto="De cada Gs 100 que vendiste, cuántos te quedaron de ganancia." /></th>
          </tr>
        </thead>
        <tbody>
          {filas.map(p => {
            const clave = p.producto_id || p.nombre;
            const estaAbierto = abierto === clave;
            return (
            <React.Fragment key={clave}>
            <tr className={estaAbierto ? 'md-fila-abierta' : ''}>
              <td>
                {p.nombre}
                {/* La alerta va pegada al nombre, no en una columna aparte:
                    un producto que se vende sin margen bruto hay que verlo
                    de una, no encontrarlo comparando dos celdas. */}
                {p.alerta === 'sin_margen' && (
                  <span className="md-badge-alerta">
                    sin margen
                    <Ayuda texto="Lo estás vendiendo a lo que te cuesta, o menos. No es un problema de gastos: es el precio de venta o el costo cargado del producto." />
                  </span>
                )}
              </td>
              <td>{p.unidades ?? '—'}</td>
              <td>{gs(p.venta)}</td>
              <td className={claseValor(margenBruto(p))}>
                {gs(margenBruto(p))} <small className="md-valor-pct">{pctMargenBruto(p)}%</small>
              </td>
              <td>
                <button
                  type="button"
                  className="md-btn-desglose"
                  aria-expanded={estaAbierto}
                  onClick={() => setAbierto(estaAbierto ? null : clave)}
                >
                  {gs(p.costo)}
                  <ChevronDown size={12} className={estaAbierto ? 'md-chevron-abierto' : ''} aria-hidden="true" />
                </button>
              </td>
              <td className={claseValor(p.ganancia)}>{gs(p.ganancia)}</td>
              {/* La pérdida solo grita cuando hay algo que mirar: en la
                  mayoría de las filas es cero y no debe robar atención. */}
              <td className={p.perdida > 0 ? 'md-valor-negativo' : 'md-valor-neutro'}>{gs(p.perdida)}</td>
              <td className={claseValor(p.rentabilidad)}>{p.rentabilidad}%</td>
            </tr>
            {estaAbierto && <DetalleCosto producto={p} columnas={COLUMNAS} />}
            </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Courier/Pedidos Asignados/Pedidos Entregados/Efectividad — directo de
 * `ventas.couriers` (ya lo calculaba el backend, esta tabla es puro wire-up). */
function TablaCouriers({ filas }) {
  if (filas.length === 0) {
    return <p className="md-empty-hint">Todavía no hay pedidos asignados a un courier en este período.</p>;
  }
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            <th>Courier</th>
            <th>Pedidos Asignados <Ayuda texto="Cuántos pedidos se le dieron a este courier para repartir." /></th>
            <th>Pedidos Entregados <Ayuda texto="De esos, cuántos entregó efectivamente." /></th>
            <th>Efectividad <Ayuda texto="De cada 100 pedidos que le diste, cuántos entregó. Cuanto más bajo, más problemas de reparto." /></th>
            <th>Cobró <Ayuda texto="La plata total de los pedidos que entregó, incluido el delivery que le cobró al cliente." /></th>
            <th>Fletes <Ayuda texto="Lo que le corresponde cobrar a él por los viajes de este período." /></th>
            <th>Rendición <Ayuda texto="Lo que queda entre ustedes dos: si es positivo, él te tiene que transferir esa plata; si es negativo, vos le tenés que pagar. Solo cuenta como suya la plata que quedó en su mano (efectivo contra entrega); si el cliente pagó por POS o transferencia, ese dinero ya entró a tu cuenta." /></th>
          </tr>
        </thead>
        <tbody>
          {filas.map(c => (
            <tr key={c.courier_id ?? 'sin-asignar'}>
              <td>{c.nombre}</td>
              <td>{c.total_asignados}</td>
              <td>{c.entregados}</td>
              <td>{c.tasa_entrega}%</td>
              <td>{gs(c.monto_recaudado)}</td>
              <td>{gs(c.costo_fletes)}</td>
              {/* El saldo se lee solo: el signo no alcanza, hay que decir
                  quién le paga a quién o cada rendición arranca con una
                  discusión sobre qué significa el número. */}
              <td className={c.saldo_rendicion < 0 ? 'md-valor-negativo' : ''}>
                {gs(Math.abs(c.saldo_rendicion ?? 0))}
                <small className="md-rendicion-quien">
                  {(c.saldo_rendicion ?? 0) > 0 ? 'te transfiere' : (c.saldo_rendicion ?? 0) < 0 ? 'le pagás' : 'sin saldo'}
                </small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** No hay un embudo "Meta / CAPI" separado a propósito: el Pixel y la CAPI
 * se configuran PARA la landing, así que sus eventos (visitas, carrito,
 * checkout) son las primeras etapas del embudo de Formularios Web, no un
 * canal aparte. Tenerlo como tab propio duplicaba las mismas visitas en dos
 * lugares y hacía parecer que eran dos fuentes de tráfico distintas. */
/**
 * Selector de producto con búsqueda. Reemplaza al <select> nativo: con
 * cuatro productos era usable, pero con el catálogo real (puede pasar de
 * 100) el desplegable nativo se vuelve una lista infinita sin forma de
 * filtrar. Acá el panel tiene alto fijo con scroll propio y un buscador
 * arriba — nunca tapa la pantalla entera.
 */
function SelectorProducto({ productos, value, onChange, disabled }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrarSiAfuera = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false);
    };
    const cerrarConEscape = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', cerrarSiAfuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarSiAfuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [abierto]);

  useEffect(() => {
    if (abierto) {
      setBusqueda('');
      // Esperar el render del panel antes de enfocar, si no el foco no agarra.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [abierto]);

  const normalizar = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return productos;
    return productos.filter(p => normalizar(p.nombre).includes(q));
  }, [productos, busqueda]);

  const seleccionado = value === 'TODOS' ? null : productos.find(p => String(p.producto_id) === String(value));
  const etiqueta = seleccionado ? seleccionado.nombre : 'Todos los productos';

  const elegir = (id) => {
    onChange(id);
    setAbierto(false);
  };

  return (
    <div className="md-combo" ref={wrapRef}>
      <button
        type="button"
        className="md-select md-combo-btn"
        onClick={() => setAbierto(o => !o)}
        disabled={disabled}
        aria-expanded={abierto}
      >
        <span className="md-combo-btn-texto">{etiqueta}</span>
        <ChevronDown size={14} className={abierto ? 'md-chevron-abierto' : ''} aria-hidden="true" />
      </button>
      {abierto && (
        <div className="md-combo-panel">
          <input
            ref={inputRef}
            type="text"
            className="md-combo-buscar"
            placeholder="Buscar producto…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <div className="md-combo-lista">
            <button
              type="button"
              className={`md-combo-opcion ${value === 'TODOS' ? 'activa' : ''}`}
              onClick={() => elegir('TODOS')}
            >
              <span className="md-combo-opcion-main">Todos los productos</span>
            </button>
            {filtrados.map(p => (
              <button
                key={p.producto_id}
                type="button"
                className={`md-combo-opcion ${String(value) === String(p.producto_id) ? 'activa' : ''}`}
                onClick={() => elegir(p.producto_id)}
              >
                <span className="md-combo-opcion-main">{p.nombre}</span>
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="md-combo-vacio">Sin coincidencias.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SelectorLanding({ landings, value, onChange, disabled }) {
  const etiquetaTipo = (tipo) => {
    if (tipo === 'inicio') return 'inicio';
    if (tipo === 'catalogo') return 'catálogo';
    if (tipo === 'contacto') return 'contacto';
    if (tipo === 'funnel') return 'funnel';
    return tipo || 'landing';
  };

  return (
    <select
      className="md-select md-select-landing"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Landing"
    >
      <option value="TODAS">Todas las landings</option>
      {landings.map(l => (
        <option
          key={l.landing_id}
          value={l.landing_id}
        >
          {l.nombre} ({etiquetaTipo(l.tipo_pagina)}{!l.publicada ? ' - sin publicar' : ''})
        </option>
      ))}
    </select>
  );
}

const EMBUDOS_TABS = [
  { id: 'formularios', label: 'Formularios Web' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'pago', label: 'Pago Web' },
];

export default function MiDashboard() {
  const [periodo, setPeriodo] = useState('este_mes');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [productoId, setProductoId] = useState('TODOS');
  const [embudoTab, setEmbudoTab] = useState('formularios');
  const [verTodosProductos, setVerTodosProductos] = useState(false);

  // Qué landing se está mirando. 'TODAS' = toda la tienda (sin filtrar), que
  // es el total del negocio; un id = solo esa página.
  //
  // Antes esto era una heurística que elegía UNA landing sola (es_home →
  // 'inicio' → la primera) y no se podía cambiar. Con varias tiendas
  // publicadas eso apuntaba a cualquier página — en un caso real, a una
  // recién creada y ni siquiera publicada, con cero eventos: el embudo
  // mostraba "0 visitas → 3 formularios" porque las visitas eran de esa
  // página vacía y los pedidos, de todo el negocio. Elegir a mano es la
  // única forma de que las dos mitades del embudo hablen de lo mismo.
  const [landingId, setLandingId] = useState('TODAS');
  const [ventas, setVentas] = useState(null);
  const [pixel, setPixel] = useState(null);
  // "No se pudo traer el tráfico" ≠ "hubo 0 visitas". Sin esta distinción, un
  // error de la consulta del pixel se dibujaba como un embudo de 0 visitas →
  // 4 formularios: una lectura imposible que parece un bug de negocio.
  const [pixelFallo, setPixelFallo] = useState(false);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const filtros = {
      periodo,
      mes: periodo === 'personalizado_mes' ? mes : undefined,
      anio,
      producto_id: productoId !== 'TODOS' ? productoId : undefined,
      landing_id: landingId !== 'TODAS' ? landingId : undefined,
    };
    try {
      const [ventasRes, pixelRes] = await Promise.all([
        getMetricasDashboardPedidos(filtros),
        // 'todas' suma el tráfico de todas las páginas de la tienda. Va con
        // catch propio para que un problema del pixel no deje sin ventas al
        // dashboard entero: el lado de la plata tiene que verse igual.
        landingService.estadisticasRango(landingId === 'TODAS' ? 'todas' : landingId, filtros)
          .catch(err => { console.error('Error cargando el tráfico de la landing:', err); return null; }),
      ]);
      setVentas(ventasRes);
      // Se pisa siempre, incluso con null: dejar el pixel anterior al cambiar
      // de tab mostraría las visitas de OTRA landing junto a estos pedidos.
      setPixel(pixelRes);
      setPixelFallo(pixelRes === null);
    } catch (err) {
      console.error('Error cargando el dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [periodo, mes, anio, productoId, landingId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Años y productos disponibles son 100% dinámicos: el backend los calcula
  // sobre la actividad real del inquilino (ver anios_disponibles /
  // productos_disponibles en pedidosAnalyticsService.getAnalyticsCompleto) —
  // el front nunca hardcodea esas listas.
  const aniosDisponibles = ventas?.anios_disponibles?.length ? ventas.anios_disponibles : [new Date().getFullYear()];
  const productosDisponibles = ventas?.productos_disponibles || [];
  const landingsDisponibles = ventas?.landings_disponibles || [];
  const ranking = ventas?.ranking_landings || null;
  const landingActiva = landingsDisponibles.find(l => String(l.landing_id) === String(landingId));

  const kpis = ventas?.kpis || { facturacion_entregada: 0, ticket_promedio: 0 };
  const funnel = ventas?.funnel || { entregados: 0 };
  // Mismos KPIs del período inmediatamente anterior y de la misma duración.
  // Puede no venir (backend viejo): todo lo que lo usa tolera undefined.
  const comparativo = ventas?.comparativo || null;

  const rangoLabel = ventas?.rango_fechas
    ? `${formatFechaCorta(ventas.rango_fechas.desde)} — ${formatFechaCorta(ventas.rango_fechas.hasta)}`
    : '';

  // Lo que realmente se resta para llegar a ganancia_neta_estimada son las
  // DOS mitades del módulo Finanzas: los de tipo 'gasto' y los de tipo
  // 'costo' (ver getGastosOperativos en pedidosAnalyticsService). Mostrar
  // solo `gastos_operativos` hacía que la tarjeta no cerrara: se veía la
  // mitad del importe que la Ganancia Neta descontaba.
  // El gasto de Meta se suma acá porque el backend también lo resta para
  // llegar a ganancia_neta_estimada: si el total de pantalla no lo incluye,
  // la tarjeta deja de cerrar contra la Ganancia Neta.
  const gastosOperativosTotal = Number(kpis.gastos_operativos || 0)
    + Number(kpis.costos_operativos_adicionales || 0)
    + Number(kpis.gasto_meta_ads || 0);

  // Los gastos del negocio son del PERÍODO y no se acotan al producto que
  // estés mirando: el alquiler se paga igual. Con un producto filtrado, la
  // tarjeta compara la facturación de ese producto contra el gasto de todo
  // el mes, así que hay que decirlo en pantalla — si no, el usuario lee
  // "este producto me cuesta 3.000.000 de fijos" y no es eso.
  const filtrandoProducto = productoId !== 'TODOS';

  // "META" de la planilla = plata gastada en ads. Sale de los CSV importados
  // en Ads & Campañas, que es donde el usuario efectivamente lo carga. Se
  // separa del resto para que la tarjeta lea igual que la planilla
  // (Facturación − Ads − Producto − Envíos − Fijos − Variables).
  const gastoMetaAds = Number(kpis.gasto_meta_ads || 0);

  // Fijos y Variables van en dos renglones, no uno: antes "Costos Fijos"
  // sumaba TODO el CostoGasto que no fuera Meta (fijo, variable y hasta lo
  // atado a un producto puntual), así que un gasto de Marketing cargado
  // como variable se leía como si fuera alquiler. Los dos vienen puros del
  // backend, ya listos para mostrar: sin filtro son el total del período;
  // con un producto filtrado, la parte que le toca a ESE producto (misma
  // cuenta que costo_detalle.fijos/.variables en la tabla de abajo — ver
  // `productoFiltrado` en getAnalyticsCompleto).
  const costosFijos = Number(kpis.gastos_fijos_generales || 0);
  const costosVariables = Number(kpis.gastos_variables_generales || 0);
  const utilidadBruta = Number(kpis.margen_bruto_estimado || 0);

  const canalVacio = { total: 0, cancelados: 0, confirmados: 0, entregados: 0, efectividad: 0 };
  // Los embudos de WhatsApp y de la Web se leen por slug del catálogo.
  const canalWhatsapp = ventas?.funnel?.canales?.whatsapp || canalVacio;
  const canalLanding = ventas?.funnel?.canales?.web || canalVacio;
  const pagosOnline = ventas?.pagos_online || { pagos_realizados: 0, monto_pagado: 0 };
  const couriers = ventas?.couriers || [];
  const tendenciasFinancieras = ventas?.tendencias || [];

  // "Más vendidos" se ordena por unidades entregadas — que es lo que el
  // título promete. La facturación desempata, para que dos productos con
  // las mismas unidades queden ordenados por lo que dejaron.
  // Los `??` a los nombres viejos no son decoración: si el backend queda un
  // paso atrás del frontend, filtrar por un campo que todavía no existe
  // descarta TODAS las filas y el reporte desaparece como si el comercio no
  // hubiera vendido nada — un vacío que miente en vez de avisar.
  const productosVendidos = useMemo(() => {
    const venta = (p) => Number(p.venta ?? p.facturacion_total) || 0;
    const unidades = (p) => Number(p.unidades ?? p.unidades_entregadas) || 0;
    return (ventas?.ranking_productos || [])
      .filter(p => venta(p) > 0)
      .sort((a, b) => unidades(b) - unidades(a) || venta(b) - venta(a))
      .slice(0, 5);
  }, [ventas]);

  const embudoProductos = useEmbudoPorProducto(ventas, pixel);
  const productosConsultados = pixel?.productos_mas_consultados || [];
  const maxConsultados = productosConsultados[0]?.consultas || 0;

  const visitasPixel = Number(pixel?.visitas || 0);
  const formulariosWeb = Number(canalLanding.total || 0);
  const checkoutsIniciados = Number(pixel?.checkouts_iniciados || 0);
  const pagosRealizados = Number(pagosOnline.pagos_realizados || 0);
  const visitasFormularios = pixelFallo ? null : Math.max(visitasPixel, formulariosWeb);
  const visitasPago = pixelFallo ? null : Math.max(visitasPixel, checkoutsIniciados, pagosRealizados);
  const visitasFormulariosCompletadas = !pixelFallo && formulariosWeb > 0 && visitasPixel < formulariosWeb;
  const visitasPagoCompletadas = !pixelFallo && Math.max(checkoutsIniciados, pagosRealizados) > 0 && visitasPixel < Math.max(checkoutsIniciados, pagosRealizados);
  const contactosWhatsapp = Number(pixel?.contactos_whatsapp || 0);
  const ctrPct = !pixelFallo && visitasFormularios > 0
    ? ((contactosWhatsapp / visitasFormularios) * 100).toFixed(1).replace(/\.0$/, '')
    : '0';

  // Datos de cada embudo — MISMOS cálculos que antes. Lo que cambió es que
  // las etapas del Pixel/CAPI (visitas → carrito → checkout) ahora abren el
  // embudo de Formularios Web en vez de vivir en un tab "Meta / CAPI"
  // aparte: es el mismo tráfico de la misma landing, no dos canales.
  const embudosPorTab = {
    // Al llegar a la tienda y tocar "pagar", la persona se bifurca: o paga
    // con Pagopar (embudo Pago en Web) o llena el formulario que la manda a
    // WhatsApp (este embudo). Por eso acá no van "Al carrito" ni "Checkout":
    // son etapas previas a la bifurcación y viven en el embudo de pago.
    formularios: {
      pasos: [
        { label: 'Visitas', valor: visitasFormularios, valorLabel: pixelFallo ? '—' : undefined, icono: <Eye size={18} />, tono: 'visitas' },
        { label: 'Formulario', valor: canalLanding.total, icono: <FileText size={18} />, tono: 'carrito' },
        { label: 'Pedidos por Confirmar', valor: canalLanding.total - canalLanding.cancelados, icono: <Clock size={18} />, tono: 'checkout' },
        { label: 'Pedidos Confirmados', valor: canalLanding.confirmados, icono: <CheckCircle2 size={18} />, tono: 'checkout' },
        { label: 'Entregados', valor: canalLanding.entregados, icono: <PackageCheck size={18} />, tono: 'contactos' },
      ],
      pieFinal: (
        <>
          % conversión del embudo (Visitas a Entregados): <strong>{pixelFallo ? '—' : `${visitasFormularios > 0 ? ((canalLanding.entregados / visitasFormularios) * 100).toFixed(1) : 0}%`}</strong>
          <span className="md-funnel-div" />
          Contactos a WhatsApp: <strong>{contactosWhatsapp}</strong> ({ctrPct}% de las visitas)
          <span className="md-funnel-div" />
          Valor total en carritos: <strong>{gs(pixel?.valor_carritos || 0)}</strong>
        </>
      ),
      // El embudo pega dos fuentes distintas (visitas del pixel arriba,
      // pedidos abajo). La nota dice a qué alcance corresponde cada mitad,
      // que es justo lo que faltaba cuando esto mostraba "0 visitas → 3
      // formularios" sin explicar que eran de páginas distintas.
      nota: [
        pixelFallo
          ? 'No pudimos traer las visitas de esta página, por eso ese paso muestra un guion en vez de un número. Los pedidos de abajo sí son reales.'
          : null,
        visitasFormulariosCompletadas
          ? 'Las visitas se muestran como mínimo igual a los formularios porque hay pedidos web en el período pero el tracking histórico de visitas no dejó filas de PageView/visita.'
          : null,
        landingActiva
          ? `Solo "${landingActiva.nombre}". Los pedidos que se cargaron antes de que el sistema empezara a guardar la landing de origen no entran acá: se ven en "Todas".`
          : 'Sumando todas tus páginas. Los pedidos por WhatsApp y los cargados a mano también cuentan acá, aunque no vengan de ninguna landing.',
        pixel?.visitas_sin_filtrar ? 'Visitas totales de la landing — un pageview no queda asociado a un producto, así que este número no se filtra por producto.' : null,
      ].filter(Boolean).join(' '),
    },
    whatsapp: {
      pasos: [
        { label: 'Leads', valor: canalWhatsapp.total, icono: <MessageCircle size={18} />, tono: 'contactos' },
        { label: 'Pedidos Confirmados', valor: canalWhatsapp.confirmados, icono: <CheckCircle2 size={18} />, tono: 'carrito' },
        { label: 'Pedidos Entregados', valor: canalWhatsapp.entregados, icono: <PackageCheck size={18} />, tono: 'checkout' },
      ],
      pieFinal: <>Efectividad (Leads a Entregados): <strong>{canalWhatsapp.efectividad}%</strong></>,
    },
    // Sin "Al carrito": desde la ficha de producto se puede ir derecho a
    // pagar sin pasar por el carrito, y ese camino no dispara AddToCart. El
    // paso mostraba 0 al carrito y 1 checkout — imposible de leer y falso:
    // el carrito no es una etapa obligatoria de este embudo.
    pago: {
      pasos: [
        { label: 'Visitas', valor: visitasPago, valorLabel: pixelFallo ? '—' : undefined, icono: <Eye size={18} />, tono: 'visitas' },
        { label: 'Checkout', valor: pixelFallo ? null : (pixel?.checkouts_iniciados ?? 0), valorLabel: pixelFallo ? '—' : undefined, icono: <CreditCard size={18} />, tono: 'checkout' },
        { label: 'Pagos Realizados', valor: pagosOnline.pagos_realizados, icono: <Wallet size={18} />, tono: 'contactos' },
      ],
      pieFinal: (
        <>
          % conversión (Visitas a Pagos): <strong>{pixelFallo ? '—' : `${visitasPago > 0 ? ((pagosOnline.pagos_realizados / visitasPago) * 100).toFixed(1) : 0}%`}</strong>
          <span className="md-funnel-div" />
          {/* El carrito no se pierde: deja de ser una etapa obligatoria del
              embudo y pasa acá, donde es un dato más y no rompe la lectura. */}
          Agregados al carrito: <strong>{pixel?.añadidos_carrito ?? 0}</strong>
          <span className="md-funnel-div" />
          Monto cobrado: <strong>{gs(pagosOnline.monto_pagado)}</strong>
        </>
      ),
      nota: visitasPagoCompletadas
        ? 'Las visitas se muestran como mínimo igual a las acciones de pago detectadas para evitar embudos imposibles cuando falta el PageView histórico.'
        : undefined,
    },
  };

  // Rendimiento por canal: compara SOLO canales de origen de pedido, todos
  // con la misma forma (total -> confirmados -> entregados). Meta/CAPI no va
  // como fila propia porque no es un canal de pedidos: es el tracking de la
  // landing, o sea el tráfico que alimenta la fila "Formularios Web".
  const canalesFunnel = ventas?.funnel?.canales || {};
  const rentabilidadCanales = ventas?.rentabilidad_canales || {};
  const rendimientoCanales = [
    ...(ventas?.canales_disponibles || []).map(c => ({
      canal: c.nombre,
      ...(canalesFunnel[c.slug] || canalVacio),
      ...(rentabilidadCanales[c.slug] || {}),
    })),
    { canal: 'Sin canal', ...(canalesFunnel.sin_canal || canalVacio), ...(rentabilidadCanales.sin_canal || {}) },
  ].filter(c => c.total > 0 || Number(c.ventas) > 0 || Number(c.costos_totales) > 0);

  const embudoProductosVisibles = verTodosProductos ? embudoProductos : embudoProductos.slice(0, 5);

  if (loading && !ventas) {
    return (
      <div className="md-page">
        <div className="md-loading">
          <Loader size={22} className="md-spin" />
          <span>Calculando tus métricas…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="md-page">
      <header className="md-header">
        <div>
          <span className="md-eyebrow">Mi Dashboard</span>
          <h1 className="md-h1">Cómo le está yendo a tu tienda</h1>
        </div>

        <div className="md-filtros">
          {/* Selector de landing. Se muestra siempre que haya al menos una
              tienda publicada: aun con una sola, "Todas" no es lo mismo que
              esa página (suma catálogo, contacto, funnels y los pedidos
              cargados a mano, que no vienen de ninguna landing). */}
          {landingsDisponibles.length > 0 && (
            <div className="md-landing-filter">
              <span className="md-tabs-label">
                Landing
                <Ayuda texto="Elegí de qué página querés ver los números. Cada tienda tiene su propio tráfico y sus propios pedidos. 'Todas' suma el negocio completo, incluidos los pedidos por WhatsApp y los cargados a mano, que no vienen de ninguna landing — por eso 'Todas' siempre da más que la suma de las páginas." />
              </span>
              <SelectorLanding
                landings={landingsDisponibles}
                value={landingId}
                onChange={setLandingId}
                disabled={loading}
              />
            </div>
          )}
          <div className="md-tabs">
            {PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                className={`md-tab ${periodo === p.id ? 'activo' : ''}`}
                onClick={() => setPeriodo(p.id)}
                disabled={loading}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="md-selects">
            {periodo === 'personalizado_mes' && (
              <select className="md-select" value={mes} onChange={e => setMes(Number(e.target.value))} disabled={loading}>
                {MESES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            )}
            <select className="md-select" value={anio} onChange={e => setAnio(Number(e.target.value))} disabled={loading}>
              {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <SelectorProducto
              productos={productosDisponibles}
              value={productoId}
              onChange={setProductoId}
              disabled={loading}
            />
          </div>
        </div>
      </header>

      <div className={`md-bento ${loading ? 'md-updating' : ''}`}>
        {loading && ventas && (
          <div className="md-updating-overlay">
            <Loader size={20} className="md-spin" />
            <span>Actualizando datos...</span>
          </div>
        )}
        
        {/* ── Resumen Ejecutivo: plata confirmada + los 5 indicadores que
            antes vivían dispersos (pedidos/ticket ya no se repiten abajo) ── */}
        <section className="md-hero md-span-8">
          <div className="md-hero-top">
            <span className="md-eyebrow">Ventas netas · {rangoLabel}</span>
            <span className="md-confirmado-tag"><i className="md-pulse" /> confirmado a mano</span>
          </div>
          <div className="md-hero-numero">{gs(kpis.facturacion_entregada)}</div>
          <Variacion actual={kpis.facturacion_entregada} previo={comparativo?.facturacion_entregada} />
        </section>

        <section className="md-card md-summary-card md-span-4">
          <h3 className="md-card-title">
            Resumen Ejecutivo
            <Ayuda texto="Los números principales del período que elegiste arriba. Todo lo demás del dashboard explica de dónde salen estos." />
          </h3>
          <div className="md-rentabilidad-grid">
            <div className="md-rent-item">
              <span className="md-rent-label">Pedidos <Ayuda texto="Cuántos pedidos llegaron a manos del cliente en este período." /></span>
              <span className="md-rent-valor">{funnel.entregados}</span>
            </div>
            <div className="md-rent-item">
              <span className="md-rent-label">
                Ticket Promedio
                <Ayuda
                  ariaLabel="Promedio vendido por cada pedido entregado. Fórmula: ventas netas divididas por pedidos entregados."
                  texto={(
                    <>
                      <strong>Promedio por pedido entregado.</strong>
                      <span>Es cuánto vendiste, en promedio, por cada pedido que llegó al cliente.</span>
                      <small>Ventas netas ÷ pedidos entregados</small>
                    </>
                  )}
                />
              </span>
              <span className="md-rent-valor">{gs(kpis.ticket_promedio)}</span>
            </div>
            <div className="md-rent-item md-rent-destacado">
              <span className="md-rent-label">Utilidad Neta <Ayuda texto="Lo que te quedó limpio: las ventas netas menos todos los costos y gastos del período." /></span>
              <span className={`md-rent-valor ${claseValor(kpis.ganancia_neta_estimada)}`}>
                {gs(kpis.ganancia_neta_estimada)}
                <Variacion actual={kpis.ganancia_neta_estimada} previo={comparativo?.ganancia_neta_estimada} />
              </span>
            </div>
            <div className="md-rent-item">
              <span className="md-rent-label">Margen <Ayuda texto="De cada 100 guaraníes de ventas netas, cuántos te quedaron limpios." /></span>
              <span className="md-rent-valor">{kpis.pct_margen_neto}%</span>
            </div>
            <div className="md-rent-item">
              <span className="md-rent-label">Conversión <Ayuda texto="De cada 100 pedidos que entraron, cuántos lograste confirmar." /></span>
              <span className="md-rent-valor">{funnel.tasa_confirmacion}%</span>
            </div>
          </div>
        </section>

      {/* ── Evolución de Ventas: la sección con más protagonismo ───────── */}
      <GraficoEvolucionFinanciera serie={tendenciasFinancieras} className="md-chart-primary md-span-8" />

      {/* ── Rentabilidad: agregado del período + detalle por producto ──── */}
      <section className="md-card md-rentabilidad-card md-span-4">
        <h3 className="md-card-title">
          Rentabilidad
          <Ayuda texto="Se arranca con toda la plata que cobraste y se le va restando cada gasto, uno por uno. Lo que sobra abajo de todo es tu ganancia." />
        </h3>
        {/* La cuenta del período, de arriba hacia abajo y en el orden en que
            el comercio la lee: arrancás con lo que facturaste y le vas
            restando cada gasto hasta llegar a lo que te quedó.

              Ventas netas
              - Meta (ads)
              - Producto
              - Envíos
              - Costos fijos
              (- Costos variables, si hubo)
              (- Comisión, si hubo)
              = Utilidad Bruta
              - IVA

            "Envíos" es SIEMPRE el costo real pagado al courier, tildado o
            no "Incluye delivery" — al courier se le paga igual. Cuando el
            cliente cubre el flete, esa plata se ve como cobro total, pero no
            dentro de Ventas netas. El renglón de Envíos muestra el costo real
            pagado al courier para que no se confunda venta de producto con caja. */}
        <div className="md-rentabilidad-grid">
          <div className="md-rent-item md-rent-destacado">
            <span className="md-rent-label">Ventas netas <Ayuda texto="Venta de productos entregados, sin delivery/flete. Los pedidos pendientes o cancelados no entran." /></span>
            <span className="md-rent-valor">{gs(kpis.facturacion_entregada)}</span>
          </div>
          <div className="md-rent-item">
            <span className="md-rent-label">Meta <small>(ads)</small> <Ayuda texto="Lo que gastaste en Meta Ads en este período. Sale de los reportes que importaste en Ads & Campañas, con IVA. Si un reporte abarca más días que el período que estás viendo, se toma solo la parte proporcional. La publicidad que cargues a mano en Control financiero no entra acá: va en Costos Fijos o Variables, según cómo la hayas clasificado." /></span>
            <span className="md-rent-valor">{gs(gastoMetaAds)}</span>
          </div>
          <div className="md-rent-item">
            <span className="md-rent-label">Producto <Ayuda texto="Lo que pagaste por la mercadería que entregaste. Se usa el costo que tenía el producto el día de la venta, no el de hoy." /></span>
            <span className="md-rent-valor">{gs(kpis.costo_mercaderia_entregada)}</span>
          </div>
          <div className="md-rent-item">
            <span className="md-rent-label">
              Envíos
              <Ayuda texto="La suma de lo que se le pagó al courier por los pedidos entregados de este período." />
            </span>
            <span className="md-rent-valor">{gs(kpis.costo_logistico_entregados)}</span>
          </div>
          <div className="md-rent-item">
            <span className="md-rent-label">Costos Fijos <Ayuda texto="Los gastos que pagás vendas o no: alquiler, sueldos, servicios. Se cargan en Finanzas → Control financiero con clasificación 'Fijo' (o sin clasificar: por defecto cuentan como fijos)." /></span>
            <span className="md-rent-valor">{gs(costosFijos)}</span>
          </div>
          <div className="md-rent-item">
            <span className="md-rent-label">Costos Variables <Ayuda texto="Gastos que se mueven con la venta: comisiones bancarias, marketing sin producto puntual, etc. Se cargan en Finanzas → Control financiero con clasificación 'Variable'." /></span>
            <span className="md-rent-valor">{gs(costosVariables)}</span>
          </div>
          <div className="md-rent-item md-rent-destacado">
            <span className="md-rent-label">
              Utilidad Bruta <small>({kpis.pct_margen_bruto}%)</small>
              <Ayuda texto="Ventas netas menos producto, envíos, comisiones e IVA. Todavía no descuenta Meta ni costos fijos." />
            </span>
            <span className={`md-rent-valor ${claseValor(utilidadBruta)}`}>{gs(utilidadBruta)}</span>
          </div>
          <div className="md-rent-item">
            <span className="md-rent-label">IVA <Ayuda texto="El impuesto de los pedidos que pidieron factura. Esa plata no es tuya: la cobrás al cliente y se la pagás a Hacienda." /></span>
            <span className="md-rent-valor">{gs(kpis.iva_facturado_total)}</span>
          </div>
        </div>

        {/* Ya no hace falta aclarar "esto es del período completo, no de
            este producto": Fijos, Variables, Meta y Utilidad ahora SÍ
            prorratean cuando hay un producto filtrado (ver
            getAnalyticsCompleto en pedidosAnalyticsService — usa
            costo_detalle del producto filtrado, misma cuenta que la tabla
            de abajo). Sin filtro, siguen siendo el total del negocio. */}

        {/* Punto de equilibrio: solo aparece si hay gastos FIJOS cargados.
            Sin gastos que cubrir no hay equilibrio del que hablar, y un
            renglón que siempre dice Gs 0 es ruido. Se mira
            `gastos_fijos_generales` y no el total: los variables se mueven
            con las ventas y ya están adentro del margen de contribución, así
            que un período con solo gastos variables no tiene punto de
            equilibrio del que hablar. */}
        {kpis.punto_equilibrio !== undefined && kpis.gastos_fijos_generales > 0 && (
          <div className={`md-equilibrio ${kpis.punto_equilibrio === null ? 'md-equilibrio-alerta' : (kpis.falta_para_equilibrio > 0 ? 'md-equilibrio-falta' : 'md-equilibrio-ok')}`}>
            {kpis.punto_equilibrio === null ? (
              <>
                <strong>No hay punto de equilibrio</strong>
                <span>
                  Estás vendiendo por debajo de lo que te cuesta la mercadería, así que vender
                  más no cubre los gastos fijos: los agranda. Hay que corregir precios o costos.
                </span>
              </>
            ) : kpis.falta_para_equilibrio > 0 ? (
              <>
                <strong>Te faltan {gs(kpis.falta_para_equilibrio)} para cubrir los gastos fijos</strong>
                <span>
                  Con este margen ({kpis.pct_contribucion}% de cada venta queda para gastos),
                  el equilibrio está en {gs(kpis.punto_equilibrio)} de facturación.
                </span>
              </>
            ) : (
              <>
                <strong>Gastos fijos cubiertos</strong>
                <span>
                  Pasaste el punto de equilibrio ({gs(kpis.punto_equilibrio)}). De acá en
                  adelante, {kpis.pct_contribucion}% de cada venta es ganancia.
                </span>
              </>
            )}
          </div>
        )}
        {kpis.gastos_por_categoria?.length > 0 && (
          <details className="md-rent-desglose">
            <summary>Ver gastos operativos por categoría <ChevronDown size={13} /></summary>
            <ul>
              {kpis.gastos_por_categoria.map(c => (
                <li key={c.categoria}><span>{c.categoria}</span><span>{gs(c.total)}</span></li>
              ))}
            </ul>
          </details>
        )}

      </section>

      <section className="md-card md-products-card md-span-12">
        <h3 className="md-card-title">Más Vendidos</h3>
        <p className="md-empty-hint md-subsection-ayuda">
          Cuánto vendiste, cuánto te costó, cuánto ganaste y cuánto perdiste con
          cada producto. Pasá el mouse por el signo de pregunta de cada columna
          para ver qué significa.
        </p>
        <TablaMasVendidos filas={productosVendidos} />
        {/* Transparencia del reparto: si la suma de "Ganancia" de esta tabla
            no cierra exacto contra la Utilidad Neta de arriba, es por esto
            — plata real del período que resta de la Utilidad Neta pero no
            se le carga a ningún producto en particular, porque no hay forma
            honesta de saber a cuál corresponde: SOLO el gasto de Meta de
            campañas sin vincular (los gastos variables generales SÍ se
            reparten por unidades y ya están en la columna Costo de cada
            producto). Mostrarlo acá evita que la diferencia se lea como un
            error de la tabla. */}
        {Number(kpis.gastos_sin_atribuir_a_producto) > 0 && (
          <p className="md-empty-hint md-subsection-ayuda" style={{ marginTop: '0.5rem' }}>
            No incluye {gs(kpis.gastos_sin_atribuir_a_producto)} en publicidad de Meta sin campaña propia asignada
            — esa plata sí está descontada de la Utilidad Neta de arriba.
          </p>
        )}
      </section>

      {/* ── Embudo de Conversión: los 4 embudos, uno a la vez por tab ──── */}
      <section className="md-card md-funnel-card md-span-12">
        <h3 className="md-card-title">
          Embudo de Conversión
          <Ayuda texto="El camino que recorre una persona hasta comprarte. En cada paso se pierde gente: el porcentaje entre paso y paso te muestra dónde se te caen más." />
        </h3>
        <div className="md-tabs md-tabs-embudo">
          {EMBUDOS_TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`md-tab ${embudoTab === t.id ? 'activo' : ''}`}
              onClick={() => setEmbudoTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <EmbudoPasos {...embudosPorTab[embudoTab]} />
      </section>

      {/* ── Rendimiento por canal + Couriers: comparación, no detalle ──── */}
      <div className="md-cols-2 md-span-12">
        <section className="md-card">
          <h3 className="md-card-title">
            Rendimiento por canal
            <Ayuda texto="Por dónde te entran los pedidos y cuál de esos caminos te funciona mejor." />
          </h3>
          <TablaRendimientoCanal filas={rendimientoCanales} />
        </section>

        <section className="md-card">
          <h3 className="md-card-title">
            <Truck size={15} /> Desempeño Couriers
            <Ayuda texto="Qué tan bien está entregando cada repartidor los pedidos que le asignaste." />
          </h3>
          <TablaCouriers filas={couriers} />
        </section>
      </div>

      {/* ── Productos: leads vs confirmados ─────────────────────────────── */}
      <section className="md-card md-span-12">
        <h3 className="md-card-title">
          Leads vs. Confirmados por producto
          <span className="md-card-title-sub">pixel + confirmado a mano</span>
          <Ayuda texto="Compara la intención de compra en la landing (clics en consultar, carrito o pago) con las ventas reales entregadas de cada producto. Solo aparecen los productos que tuvieron interés en la landing: lo que vendés a mano o por WhatsApp no pasa por acá, se ve en Más Vendidos." />
        </h3>
        <TablaEmbudoProductos filas={embudoProductosVisibles} />
        {embudoProductos.length > 5 && (
          <button type="button" className="md-btn-ghost md-ver-todos" onClick={() => setVerTodosProductos(v => !v)}>
            {verTodosProductos ? 'Ver menos' : `Ver todos (${embudoProductos.length})`}
          </button>
        )}
      </section>

      <div className="md-footer-link md-span-12">
        <Link to="/mis-pedidos" state={{ tab: "analitica" }} className="md-btn-ghost">
          Ver Centro de Inteligencia Comercial completo <ArrowRight size={14} />
        </Link>
      </div>

      </div>
    </div>
  );
}
