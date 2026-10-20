// Exportar productos a CSV (Catálogo de Productos → "Exportar productos").
// Reutiliza /vitrina/precios/buscar (la misma consulta liviana de Cambiar
// precios) pidiendo descripción + galería completa con `detalle: true`.
// Todo el trabajo pesado es red, no CPU: armar el CSV de unos pocos miles
// de filas es instantáneo en el navegador, así que no hace falta un worker.
import { vitrinaService } from '../../services/vitrinaService';

// El backend admite hasta 500 filas por página cuando se pide `detalle`
// (ver precioUsuarioMasivo.service.js) — con 100 el catálogo de 3400+
// productos tardaba ~35 ida-y-vueltas secuenciales y se sentía colgado.
const LIMITE_POR_PAGINA = 500;
// Páginas en simultáneo además de la primera. La consulta es liviana (SQL
// plano, sin el ORM pesado de catalogoPaginado), pero el VPS es CPU-bound
// con un solo core útil (ver gesicomm_capacidad_vps_cpu_bound): 3 a la vez
// es un término medio, no una ráfaga.
const CONCURRENCIA = 3;

// Misma correspondencia que CambiarPrecios.jsx (secciones): el filtro de
// tipo de la vitrina no es el mismo vocabulario que usa /precios/buscar.
const SECCION_POR_FILTRO = {
  producto: { tipo: 'producto', origen: 'gesicomm' },
  combo: { tipo: 'combo', origen: 'gesicomm' },
  mios: { tipo: 'producto', origen: 'propios' },
  'mis-combos': { tipo: 'combo', origen: 'propios' },
  landing: { tipo: 'landing', origen: '' },
  todos: { tipo: '', origen: '' },
};

function construirFiltros({ filtro, busqueda, categoria, proveedor, orden, seleccionados }) {
  if (seleccionados && seleccionados.length > 0) {
    return { items: seleccionados, orden: 'nombre' };
  }
  const seccion = SECCION_POR_FILTRO[filtro] || SECCION_POR_FILTRO.todos;
  return {
    busqueda: busqueda || '',
    categoria: categoria || '',
    proveedor: proveedor || '',
    tipo: seccion.tipo,
    origen: seccion.origen,
    orden: orden || 'nombre',
  };
}

// Trae TODAS las filas que matchean el filtro. La primera página da el
// total (y categorías/proveedores, que el export ignora); con eso ya
// sabemos cuántas páginas más pedir, y las pedimos con un pool chico de
// pedidos en simultáneo en vez de una por una.
async function traerTodasLasFilas(filtros, onProgreso) {
  const primera = await vitrinaService.buscarPrecios({ ...filtros, page: 1, limit: LIMITE_POR_PAGINA, detalle: true });
  const total = primera.total || 0;
  const paginas = [primera.items || []];
  let cargado = paginas[0].length;
  onProgreso?.(cargado, total);

  const totalPaginas = Math.ceil(total / LIMITE_POR_PAGINA);
  let siguiente = 2;
  async function trabajador() {
    while (siguiente <= totalPaginas) {
      const pagina = siguiente++;
      const data = await vitrinaService.buscarPrecios({ ...filtros, page: pagina, limit: LIMITE_POR_PAGINA, detalle: true });
      paginas[pagina - 1] = data.items || [];
      cargado += data.items?.length || 0;
      onProgreso?.(cargado, total);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, Math.max(totalPaginas - 1, 0)) }, trabajador));
  return paginas.flat();
}

const CABECERAS = ['SKU', 'Nombre', 'Proveedor', 'Costo de compra', 'Precio de venta', 'Descripción', 'Imágenes'];

function celdaCsv(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function filaACsv(item) {
  return [
    item.sku || '',
    item.nombre || '',
    item.proveedor || '',
    item.costo ?? '',
    item.precio_actual ?? '',
    item.descripcion || '',
    (item.imagenes || []).join(' | '),
  ].map(celdaCsv).join(',');
}

function armarCsv(items) {
  const lineas = [CABECERAS.join(','), ...items.map(filaACsv)];
  return '﻿' + lineas.join('\r\n'); // BOM: para que Excel respete tildes y Gs/guaraníes
}

function descargarArchivo(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {object} filtrosActuales filtro, busqueda, categoria, proveedor, orden de la vitrina
 * @param {{tipo:string,id:number}[]} seleccionados vacío/null = exportar todo lo filtrado
 * @param {(cargado:number, total:number) => void} onProgreso
 */
export async function exportarProductosCsv(filtrosActuales, seleccionados, onProgreso) {
  const filtros = construirFiltros({ ...filtrosActuales, seleccionados });
  const filas = await traerTodasLasFilas(filtros, onProgreso);
  const fecha = new Date().toISOString().slice(0, 10);
  descargarArchivo(armarCsv(filas), `productos-gesicomm-${fecha}.csv`);
  return filas.length;
}
