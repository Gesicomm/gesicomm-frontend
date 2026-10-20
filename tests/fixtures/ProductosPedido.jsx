import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import '../../src/pages/courier/courier.css';
import { NuevoPedidoModal } from '../../src/pages/courier/NuevoPedidoModal';

const items = [
  { id: 1, producto_id: 1, nombre_producto: 'Adaptador Amoladora a Sierra Circular 125mm DV-1711 Corte Ajustable — Llevá esta increíble oferta, solo por hoy', oferta_id: 81, oferta_nombre: 'Llevá esta increíble oferta, solo por hoy', cantidad: 1, precio_unitario: 200000, Oferta: { componentes: [{ producto_id: 1, cantidad: 2 }] } },
  { id: 2, producto_id: 2, nombre_producto: 'Hidrolavadora DV180-1 2800W 180 Bar Alta Presión', cantidad: 2, precio_unitario: 615858 },
  { id: 3, producto_id: 3, nombre_producto: 'Combo de herramientas', oferta_id: 82, oferta_nombre: 'Kit de trabajo', cantidad: 2, precio_unitario: 150000, componentes_vendidos: [{ producto_id: 3, cantidad: 2, producto: { nombre: 'Taladro inalámbrico' } }, { producto_id: 4, cantidad: 4, producto: { nombre: 'Batería 20V' } }] },
  { id: 4, producto_id: 4, nombre_producto: 'Batería 20V', cantidad: 1, precio_unitario: 50000 },
];
createRoot(document.getElementById('root')).render(<NuevoPedidoModal open onClose={() => {}} onSubmit={async payload => { window.__pedidoGuardado = payload; }} envio={{ id: 1084, numero_pedido_visible: 'SOM-1047', estado: 'Pendiente', origen: 'WEB', nombre_cliente: 'Cliente de prueba', telefono: '0981000000', departamento: 'Central', ciudad: 'Luque', direccion: 'Dirección de prueba', monto: 1781716, costo_envio: 15000, items }} />);
