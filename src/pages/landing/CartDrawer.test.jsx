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
