import CodigosPrueba from './CodigosPrueba';
import './solicitudesWeb.css';

export default function CodigosPruebaPage() {
  return <main className="web-requests">
    <header className="web-requests-heading">
      <div>
        <h1>Códigos de acceso</h1>
        <p>Generá un código para dar acceso temporal a un plan. Elegís la duración antes de crearlo.</p>
      </div>
    </header>
    <CodigosPrueba />
  </main>;
}
