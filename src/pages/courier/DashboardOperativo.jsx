import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { CentroInteligenciaComercial } from "./CentroInteligenciaComercial";
import "./courier.css";
import "./DashboardOperativo.css";

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
              <p className="prod-subtitle">Cómo se mueven tus pedidos: confirmación, entregas, devoluciones y clientes</p>
            </div>
          </div>
          <Link className="do-volver-general" to="/mi-dashboard">Ver Dashboard General</Link>
        </div>
      </div>

      <CentroInteligenciaComercial />
    </div>
  );
}
