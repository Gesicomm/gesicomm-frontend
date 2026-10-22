import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

export default function DepositoFilters({ onChange }) {
  const [buscar, setBuscar] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [personaContacto, setPersonaContacto] = useState('');
  const [activo, setActivo] = useState('todos'); // 'todos' | 'activos' | 'inactivos'

  const debouncedBuscar = useDebounce(buscar, 400);
  const debouncedDepartamento = useDebounce(departamento, 400);
  const debouncedCiudad = useDebounce(ciudad, 400);
  const debouncedPersonaContacto = useDebounce(personaContacto, 400);

  useEffect(() => {
    const filtros = {
      buscar: debouncedBuscar || undefined,
      departamento: debouncedDepartamento || undefined,
      ciudad: debouncedCiudad || undefined,
      personaContacto: debouncedPersonaContacto || undefined,
      activo: activo === 'todos' ? undefined : activo === 'activos' ? true : false
    };
    
    // Limpiar undefined
    Object.keys(filtros).forEach(key => filtros[key] === undefined && delete filtros[key]);
    
    onChange(filtros);
  }, [debouncedBuscar, debouncedDepartamento, debouncedCiudad, debouncedPersonaContacto, activo]);

  return (
    <section className="dep-filters" aria-label="Buscar y filtrar depósitos">
      <div className="dep-filter-main">
        <label className="dep-filter-search"><span>Buscar depósito</span><div><Search size={16} aria-hidden="true" /><input type="search" placeholder="Nombre o dirección..." value={buscar} onChange={e => setBuscar(e.target.value)} /></div></label>
        <label><span>Estado</span><select value={activo} onChange={e => setActivo(e.target.value)}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></label>
      </div>
      <details className="dep-more-filters"><summary><SlidersHorizontal size={16} />Más filtros{(departamento || ciudad || personaContacto) && <span className="dep-filter-count">Aplicados</span>}</summary>
        <div className="dep-filter-extra">
          <label><span>Departamento</span><input placeholder="Ej: Central" value={departamento} onChange={e => setDepartamento(e.target.value)} /></label>
          <label><span>Ciudad</span><input placeholder="Ej: Luque" value={ciudad} onChange={e => setCiudad(e.target.value)} /></label>
          <label><span>Persona de contacto</span><input placeholder="Nombre del contacto" value={personaContacto} onChange={e => setPersonaContacto(e.target.value)} /></label>
        </div>
      </details>
      {(buscar || departamento || ciudad || personaContacto || activo !== 'todos') && <button type="button" className="dep-clear-filters" onClick={() => { setBuscar(''); setDepartamento(''); setCiudad(''); setPersonaContacto(''); setActivo('todos'); }}>Limpiar filtros</button>}
    </section>
  );
}
