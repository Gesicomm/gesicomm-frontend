import { useState } from 'react';
import { PackageCheck } from 'lucide-react';
import { AbastecimientoPanel } from '../courier/AbastecimientoPanel';
import AbastecimientoTimelineModal from '../../components/abastecimiento/AbastecimientoTimelineModal';
import '../productos/productos.css';
import '../courier/courier.css';

/**
 * Sección propia de Abastecimiento (solo admin). Vive fuera de Pedidos a
 * propósito: es un flujo operativo distinto —validar pagos por transferencia
 * y mover la mercadería del proveedor hasta el destino final— y como pestaña
 * dentro de Pedidos quedaba escondida.
 */
export default function AbastecimientoAdmin() {
  const [timelineEnvio, setTimelineEnvio] = useState(null);

  return (
    <div className="prod-page" style={{ minHeight: '100vh', maxWidth: '100%' }}>
      <div className="courier-header">
        <div className="courier-header-main">
          <div className="prod-header-left">
            <div className="prod-icon-wrap" style={{ background: 'var(--vit-accent-soft)', color: 'var(--color-primary-text)' }}>
              <PackageCheck size={22} />
            </div>
            <div>
              <h1 className="prod-title">Abastecimiento</h1>
              <p className="prod-subtitle">Validación de pagos por transferencia y seguimiento de la mercadería</p>
            </div>
          </div>
        </div>
      </div>

      <main className="courier-container" style={{ marginTop: '1.25rem' }}>
        <AbastecimientoPanel onAbrirTimeline={(envio) => setTimelineEnvio(envio)} />
      </main>

      <AbastecimientoTimelineModal
        open={!!timelineEnvio}
        envio={timelineEnvio}
        onClose={() => setTimelineEnvio(null)}
        esAdmin
      />
    </div>
  );
}
