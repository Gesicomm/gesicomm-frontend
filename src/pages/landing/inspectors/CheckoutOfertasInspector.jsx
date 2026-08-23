import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, ShoppingCart, Tag, ImageOff, X } from 'lucide-react';
import { ofertaService } from '../../../services/ofertaService';
import { getMediaUrl } from '../../../services/api';
import { formatPrecio } from '../../../lib/mensajeWhatsapp';

export default function CheckoutOfertasInspector({ form, onChange, landingItems }) {
  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);

  // Todo: we need to fetch ALL offers for ALL items in the landing.
  // Because `landingItems` only has items inside it.
  
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--vit-muted)]">Configurá las ofertas comerciales (Order Bumps y Upsells) para el carrito y la compra rápida.</p>
    </div>
  );
}
