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
import DashboardLayout from './components/DashboardLayout';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardLayout><div><h1>Dashboard</h1><p>Bienvenido a Gesicomm.</p></div></DashboardLayout></ProtectedRoute>
        } />

        {/* Productos */}
        <Route path="/products" element={
          <ProtectedRoute><DashboardLayout><ProductList /></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/products/nuevo" element={
          <ProtectedRoute><DashboardLayout><ProductForm /></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/products/:id/editar" element={
          <ProtectedRoute><DashboardLayout><ProductForm /></DashboardLayout></ProtectedRoute>
        } />

        {/* Catálogo */}
        <Route path="/categorias" element={
          <ProtectedRoute><DashboardLayout><CategoriaList /></DashboardLayout></ProtectedRoute>
        } />

        {/* Otras secciones */}
        <Route path="/orders" element={
          <ProtectedRoute><DashboardLayout><div><h1>Pedidos</h1><p>En construcción</p></div></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/customers" element={
          <ProtectedRoute><DashboardLayout><div><h1>Clientes</h1><p>En construcción</p></div></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/ads" element={
          <ProtectedRoute><DashboardLayout><Ads /></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>
        } />

        {/* Combos */}
        <Route path="/combos" element={
          <ProtectedRoute><DashboardLayout><ComboList /></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/combos/nuevo" element={
          <ProtectedRoute><DashboardLayout><ComboEditor /></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/combos/:id/editar" element={
          <ProtectedRoute><DashboardLayout><ComboEditor /></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/combos/configuracion" element={
          <ProtectedRoute><DashboardLayout><ComboConfiguracion /></DashboardLayout></ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
