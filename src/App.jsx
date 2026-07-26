import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * Rutas de la aplicación:
 *
 * PÚBLICAS:
 *   /       → Home (Landing page)
 *   /login  → Autenticación (login, registro, recuperar contraseña)
 *
 * PROTEGIDAS (requieren sesión activa verificada en backend):
 *   /dashboard  → Panel principal
 *   /products   → Gestión de productos
 *   /orders     → Gestión de pedidos
 *   /customers  → Gestión de clientes
 *   /settings   → Configuración
 *
 * ⚠️ Las rutas protegidas tienen protección visual con <ProtectedRoute>.
 *    La seguridad real está en el backend (validación del JWT en cada request).
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas — se añadirán los componentes reales a futuro */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div style={{ color: '#fff', padding: '2rem' }}>Dashboard (en construcción)</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <div style={{ color: '#fff', padding: '2rem' }}>Productos (en construcción)</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <div style={{ color: '#fff', padding: '2rem' }}>Pedidos (en construcción)</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <div style={{ color: '#fff', padding: '2rem' }}>Clientes (en construcción)</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <div style={{ color: '#fff', padding: '2rem' }}>Configuración (en construcción)</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
