import React, { useState } from 'react';
import ProductoPanel from '../../panels/ProductoPanel';
import { fichaBeautyDesdeProducto, resolverFichaBeauty } from './fichaBeauty';

/**
 * Monta el ProductoPanel REAL (no solo FichaBeautyPanel) con el mismo
 * cableado de nombres de props que usa LandingSimpleEditor.jsx en
 * producción. El test anterior montaba FichaBeautyPanel directo y no
 * hubiera detectado un desajuste de props entre ProductoPanel y
 * FichaBeautyPanel — este sí.
 */
const PRODUCTO_CATALOGO = {
  id: 501,
  nombre: 'Hair Cepillo P/Pelo 5 en 1 220V WINNINGSTAR',
  categoria: { nombre: 'Cuidado del cabello' },
  precio_efectivo: 259000,
  imagen: null,
};

const PRODUCTO_DETALLE = {
  ...PRODUCTO_CATALOGO,
  beneficios: [],
  confianza: [],
  propuesta_valor: '',
  ficha_datos: {},
};

const FICHA_LANDING = null;

export default function DevProductoPanel() {
  const [productoFichaBeauty, setProductoFichaBeauty] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [faq, setFaq] = useState([]);

  // Mismo criterio que LandingSimpleEditor: se resuelve con lo que ya cargó
  // el producto (acá vacío) y lo que el comercio escribió para él en esta
  // landing (`productoFichaBeauty`).
  const fichaBeautyDelProducto = fichaBeautyDesdeProducto(PRODUCTO_DETALLE);
  const fichaBeautyResuelta = resolverFichaBeauty(productoFichaBeauty, FICHA_LANDING, fichaBeautyDelProducto);

  return (
    <div style={{ width: 380, height: '100vh', overflow: 'hidden', background: '#0b0f19' }}>
      <ProductoPanel
        producto={PRODUCTO_CATALOGO}
        editable
        cargando={false}
        fichaBeautyActiva
        fichaBeauty={productoFichaBeauty}
        fichaBeautyResuelta={fichaBeautyResuelta}
        fichaBeautyLanding={FICHA_LANDING}
        fichaBeautyDelProducto={fichaBeautyDelProducto}
        onFichaBeauty={setProductoFichaBeauty}
        descripcion={descripcion}
        onDescripcion={setDescripcion}
        imagenes={[]}
        imagenesEditables
        subiendoImg={false}
        onSubirImagen={() => {}}
        onEliminarImagen={() => {}}
        onMarcarPrincipal={() => {}}
        faqTitulo=""
        onFaqTitulo={() => {}}
        faq={faq}
        onFaqChange={setFaq}
        relacionadosTitulo=""
        onRelacionadosTitulo={() => {}}
        relacionados={[]}
        relacionadosAutomatico={false}
        onAgregarRelacionado={() => {}}
        onQuitarRelacionado={() => {}}
        catalogo={{ productos: [], combos: [] }}
        guardando={false}
        onGuardar={() => {}}
        aviso=""
        error=""
        onVolver={() => {}}
        config={{}}
        onChange={() => {}}
        onOfertasChange={() => {}}
        packs={[]}
      />
    </div>
  );
}
