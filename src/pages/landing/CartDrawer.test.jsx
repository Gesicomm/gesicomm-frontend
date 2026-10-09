import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CartDrawer from './CartDrawer';

const productoBase = {
  clave: 'producto:adel:base',
  contentId: 'adel',
  nombre: 'AdelFit',
  cantidad: 1,
  precio: 169000,
  imagen: 'https://cdn.test/adelfit.jpg',
};

const ofertaUpsell = {
  id: 77,
  nombre: 'Sumá Articumina con descuento',
  estrategia: 'upsell',
  precio_normal: 170000,
  precio_order_bump: 120000,
  producto_complementario: {
    nombre: 'Articumina',
    imagen: 'https://cdn.test/articumina.jpg',
  },
  beneficios: ['Llega en el mismo pedido'],
};

function DrawerConEstado({ onConfirmarPedido }) {
  const [items, setItems] = useState([productoBase]);

  function agregarSugerencia(_item, oferta) {
    setItems(prev => [
      ...prev,
      {
        clave: `producto:adel:oferta:${oferta.id}`,
        contentId: 'adel',
        nombre: oferta.producto_complementario.nombre,
        ofertaNombre: oferta.nombre,
        ofertaId: oferta.id,
        cantidad: 1,
        precio: oferta.precio_order_bump,
        imagen: oferta.producto_complementario.imagen,
      },
    ]);
  }

  return (
    <CartDrawer
      abierto
      items={items}
      sugerencias={[{ item: productoBase, oferta: ofertaUpsell }]}
      onAgregarSugerencia={agregarSugerencia}
      onConfirmarPedido={form => onConfirmarPedido({ form, items })}
      onCerrar={vi.fn()}
      onCantidad={vi.fn()}
      onQuitar={vi.fn()}
    />
  );
}

describe('CartDrawer upsell', () => {
  it('muestra el upsell como pop-up y confirma recién cuando la línea aceptada ya está en el carrito', async () => {
    const confirmar = vi.fn().mockResolvedValue({ pedido_id: 1, numero_pedido: 101 });
    render(<DrawerConEstado onConfirmarPedido={confirmar} />);

    fireEvent.click(screen.getByRole('button', { name: /Finalizar compra/i }));
    fireEvent.change(screen.getByPlaceholderText('Nombre y Apellido'), { target: { value: 'Ana Cliente' } });
    fireEvent.change(screen.getByPlaceholderText('9XX XXXXXX'), { target: { value: '981123456' } });
    fireEvent.change(screen.getByPlaceholderText('Ciudad'), { target: { value: 'Asunción' } });
    fireEvent.change(screen.getByPlaceholderText('Nombre de la calle y número de casa'), { target: { value: 'Calle 123' } });
    fireEvent.click(screen.getByLabelText(/Acepto que mis datos/i));

    fireEvent.click(screen.getByRole('button', { name: /Completar compra/i }));

    expect(await screen.findByText(/Esperá, tenemos una oferta para vos/i)).toBeInTheDocument();
    expect(confirmar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Sí, agregar por 120\.000 Gs/i }));

    await waitFor(() => expect(confirmar).toHaveBeenCalledTimes(1));
    const pedido = confirmar.mock.calls[0][0];
    expect(pedido.items.map(i => i.ofertaId)).toEqual([undefined, 77]);
    expect(pedido.form).toMatchObject({
      nombre_cliente: 'Ana Cliente',
      telefono: '981123456',
      ciudad: 'Asunción',
      direccion: 'Calle 123',
    });
    expect(await screen.findByText(/Pedido recibido/i)).toBeInTheDocument();
  });
});

// Lienzo en blanco: el formulario es la página /checkout (iframe), no este
// drawer. Al confirmar allá, el contenedor pide el upsell con solicitudUpsell.
function DrawerDesdeCheckout({ solicitud, sugerencias, onResuelto }) {
  const [items, setItems] = useState([productoBase]);
  return (
    <CartDrawer
      abierto={false}
      items={items}
      sugerencias={sugerencias}
      onAgregarSugerencia={(_item, oferta) => setItems(prev => [...prev, { clave: `oferta:${oferta.id}`, contentId: 'adel', nombre: 'Articumina', ofertaId: oferta.id, cantidad: 1, precio: 120000 }])}
      onConfirmarPedido={vi.fn()}
      onCerrar={vi.fn()}
      onCantidad={vi.fn()}
      onQuitar={vi.fn()}
      onIrACheckout={vi.fn()}
      solicitudUpsell={solicitud}
      onUpsellResuelto={() => onResuelto(items)}
    />
  );
}

describe('CartDrawer upsell pedido por la página de checkout', () => {
  it('muestra el pop-up aunque el drawer esté cerrado y avisa recién con el upsell ya en el carrito', async () => {
    const resuelto = vi.fn();
    render(<DrawerDesdeCheckout solicitud={{ pedidoEn: 1 }} sugerencias={[{ item: productoBase, oferta: ofertaUpsell }]} onResuelto={resuelto} />);

    expect(await screen.findByText(/Esperá, tenemos una oferta para vos/i)).toBeInTheDocument();
    expect(resuelto).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Sí, agregar por 120\.000 Gs/i }));

    await waitFor(() => expect(resuelto).toHaveBeenCalledTimes(1));
    expect(resuelto.mock.calls[0][0].map(i => i.ofertaId)).toEqual([undefined, 77]);
  });

  it('"No gracias" sigue con el pedido sin agregar nada', async () => {
    const resuelto = vi.fn();
    render(<DrawerDesdeCheckout solicitud={{ pedidoEn: 1 }} sugerencias={[{ item: productoBase, oferta: ofertaUpsell }]} onResuelto={resuelto} />);
    fireEvent.click(await screen.findByRole('button', { name: /No gracias/i }));
    expect(resuelto).toHaveBeenCalledTimes(1);
    expect(resuelto.mock.calls[0][0].map(i => i.ofertaId)).toEqual([undefined]);
  });

  it('sin upsells el pedido sigue de inmediato', async () => {
    const resuelto = vi.fn();
    render(<DrawerDesdeCheckout solicitud={{ pedidoEn: 1 }} sugerencias={[]} onResuelto={resuelto} />);
    await waitFor(() => expect(resuelto).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Esperá, tenemos una oferta para vos/i)).not.toBeInTheDocument();
  });
});
