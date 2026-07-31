import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Ads from './pages/Ads';
import ProductList from './pages/productos/ProductList';
import ProductForm from './pages/productos/ProductForm';
import CategoriaList from './pages/categorias/CategoriaList';
import ComboList from './pages/combos/ComboList';
import ComboEditor from './pages/combos/ComboEditor';
import ComboConfiguracion from './pages/combos/ComboConfiguracion';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import DashboardLayout from './components/DashboardLayout';
import UserLayout from './components/UserLayout';
import VitrinaGrid from './pages/vitrina/VitrinaGrid';
import MisLandings from './pages/landing/MisLandings';
import LandingEditor from './pages/landing/LandingEditor';
import LandingPublica from './pages/landing/LandingPublica';
import ConfigurarTienda from './pages/tienda/ConfigurarTienda';
import { ControlCourier } from './pages/courier/control-courier';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas — panel admin */}
        <Route path="/dashboard" element={
          <AdminRoute><DashboardLayout><div><h1>Dashboard</h1><p>Bienvenido a Gesicomm.</p></div></DashboardLayout></AdminRoute>
        } />

        {/* Productos */}
        <Route path="/products" element={
          <AdminRoute><DashboardLayout><ProductList /></DashboardLayout></AdminRoute>
        } />
        <Route path="/products/nuevo" element={
          <AdminRoute><DashboardLayout><ProductForm /></DashboardLayout></AdminRoute>
        } />
        <Route path="/products/:id/editar" element={
          <AdminRoute><DashboardLayout><ProductForm /></DashboardLayout></AdminRoute>
        } />

        {/* Catálogo */}
        <Route path="/categorias" element={
          <AdminRoute><DashboardLayout><CategoriaList /></DashboardLayout></AdminRoute>
        } />

        {/* Otras secciones */}
        <Route path="/orders" element={
          <AdminRoute><DashboardLayout><ControlCourier /></DashboardLayout></AdminRoute>
        } />
        <Route path="/customers" element={
          <AdminRoute><DashboardLayout><div><h1>Clientes</h1><p>En construcción</p></div></DashboardLayout></AdminRoute>
        } />
        <Route path="/ads" element={
          <AdminRoute><DashboardLayout><Ads /></DashboardLayout></AdminRoute>
        } />
        <Route path="/settings" element={
          <AdminRoute><DashboardLayout><Settings /></DashboardLayout></AdminRoute>
        } />

        {/* Combos */}
        <Route path="/combos" element={
          <AdminRoute><DashboardLayout><ComboList /></DashboardLayout></AdminRoute>
        } />
        <Route path="/combos/nuevo" element={
          <AdminRoute><DashboardLayout><ComboEditor /></DashboardLayout></AdminRoute>
        } />
        <Route path="/combos/:id/editar" element={
          <AdminRoute><DashboardLayout><ComboEditor /></DashboardLayout></AdminRoute>
        } />
        <Route path="/configuracion-economica" element={
          <AdminRoute><DashboardLayout><ComboConfiguracion /></DashboardLayout></AdminRoute>
        } />

        {/* Rutas protegidas — vitrina y pedidos del rol 'usuario' */}
        <Route path="/mi-catalogo" element={
          <ProtectedRoute><UserLayout><VitrinaGrid /></UserLayout></ProtectedRoute>
        } />
        <Route path="/mis-pedidos" element={
          <ProtectedRoute><UserLayout><ControlCourier /></UserLayout></ProtectedRoute>
        } />
        <Route path="/mi-tienda" element={
          <ProtectedRoute><UserLayout><ConfigurarTienda /></UserLayout></ProtectedRoute>
        } />
        <Route path="/mis-landings" element={
          <ProtectedRoute><UserLayout><MisLandings /></UserLayout></ProtectedRoute>
        } />
        <Route path="/mis-landings/nuevo" element={
          <ProtectedRoute><UserLayout><LandingEditor /></UserLayout></ProtectedRoute>
        } />
        <Route path="/mis-landings/:id/editar" element={
          <ProtectedRoute><UserLayout><LandingEditor /></UserLayout></ProtectedRoute>
        } />

        {/* Rutas públicas — landing compartible, sin ningún guard */}
        <Route path="/l" element={<LandingPublica />} />
        <Route path="/l/:slug" element={<LandingPublica />} />
      </Routes>
    </Router>
  );
}

export default App;
