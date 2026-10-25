import api from './api';

// La lista de clientes es el reporte de clientes (reportesService); acá solo
// la ficha de uno: sus pedidos, por la misma clave que agrupa el reporte.
export const clientesService = {
  pedidos: async (clienteKey) => {
    const res = await api.post('/clientes/pedidos', { cliente_key: clienteKey });
    return res.data;
  },
};
