import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
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
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-50 p-4 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={16} />
        <input
          type="text"
          placeholder="Buscar depósito..."
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-fg outline-none transition-colors focus:border-primary"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Departamento"
          value={departamento}
          onChange={e => setDepartamento(e.target.value)}
          className="h-10 w-full sm:w-36 rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-primary"
        />
        
        <input
          type="text"
          placeholder="Ciudad"
          value={ciudad}
          onChange={e => setCiudad(e.target.value)}
          className="h-10 w-full sm:w-36 rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-primary"
        />
        
        <input
          type="text"
          placeholder="Persona de contacto"
          value={personaContacto}
          onChange={e => setPersonaContacto(e.target.value)}
          className="h-10 w-full sm:w-40 rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-primary"
        />

        <select
          value={activo}
          onChange={e => setActivo(e.target.value)}
          className="h-10 w-full sm:w-32 rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-primary"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>
    </div>
  );
}
