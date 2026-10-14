import { TrendingUp } from "lucide-react";
import { CentroInteligenciaComercial } from "./CentroInteligenciaComercial";
import "./courier.css";

// Antes era la pestaña "Analítica" de Gestión Comercial / Logística: al
// mezclar pedidos (ambos tienen su propio estado, comercial y logístico) con
// reportes transversales (ventas, clientes, finanzas) no pertenecía a
// ninguna de las dos etapas, así que pasó a ser su propio menú (pedido del
// usuario, 2026-10-14).
export function DashboardOperativo() {
  return (
    <div className="prod-page courier-page" style={{ minHeight: "100vh", maxWidth: "100%" }}>
      <div className="courier-header">
        <div className="courier-header-main">
          <div className="prod-header-left">
            <div className="prod-icon-wrap" style={{ background: "var(--vit-accent-soft)", color: "var(--color-primary-text)" }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 className="prod-title">Dashboard Operativo</h1>
              <p className="prod-subtitle">Reportes e insights de ventas, logística y finanzas</p>
            </div>
          </div>
        </div>
      </div>

      <CentroInteligenciaComercial />
    </div>
  );
}
