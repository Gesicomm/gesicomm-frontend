import React, { useEffect, useMemo, useState, useId } from 'react';
import CreatableSelect from 'react-select/creatable';
import { getCourierGeografia } from '../../services/courierApi';

const normalizar = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const styles = {
  container: base => ({ ...base, minWidth: 0, fontSize: 'var(--ui-text-body, 1rem)' }),
  control: (base, state) => ({ ...base, minHeight: 44, background: 'var(--vit-bg)', borderColor: state.isFocused ? 'var(--vit-accent)' : 'var(--vit-border)', borderRadius: 12, boxShadow: state.isFocused ? '0 0 0 2px var(--vit-accent-soft)' : 'none', '&:hover': { borderColor: 'var(--vit-accent)' } }),
  menu: base => ({ ...base, background: 'var(--vit-surface)', border: '1px solid var(--vit-border)', zIndex: 30 }),
  option: (base, state) => ({ ...base, whiteSpace: 'normal', overflowWrap: 'anywhere', background: state.isSelected || state.isFocused ? 'var(--vit-accent-soft)' : 'transparent', color: 'var(--vit-text)', cursor: 'pointer', '&:active': { background: 'var(--vit-accent-soft)' } }),
  singleValue: base => ({ ...base, color: 'var(--vit-text)' }),
  input: base => ({ ...base, color: 'var(--vit-text)' }),
  placeholder: base => ({ ...base, color: 'var(--vit-muted-2)' }),
  dropdownIndicator: base => ({ ...base, color: 'var(--vit-muted)' }),
  clearIndicator: base => ({ ...base, color: 'var(--vit-muted)' }),
};

export default function CiudadPublicaSelect({ value, onChange }) {
  const id = useId();
  const [geografia, setGeografia] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(false);
    getCourierGeografia({ conCiudades: true })
      .then(datos => {
        if (!activo) return;
        setGeografia(Array.isArray(datos) ? datos : []);
        setError(!Array.isArray(datos) || !datos.some(d => d.ciudades?.length));
      })
      .catch(() => { if (activo) setError(true); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [intento]);

  const opciones = useMemo(() => {
    const ciudades = new Map();
    for (const departamento of geografia) {
      for (const ciudad of departamento.ciudades || []) {
        if (!ciudad.nombre?.trim() || !departamento.nombre?.trim()) continue;
        const label = `${ciudad.nombre.trim()} - ${departamento.nombre.trim()}`;
        ciudades.set(normalizar(label), { value: label, label });
      }
    }
    return [...ciudades.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [geografia]);
  const seleccionada = value ? opciones.find(o => normalizar(o.value) === normalizar(value)) || { value, label: value } : null;

  return <div className="tn-field">
    <label htmlFor={id} className="tn-field-label">Ciudad / Departamento <em>(opcional)</em></label>
    <CreatableSelect
      inputId={id}
      instanceId={id}
      aria-describedby={`${id}-help`}
      styles={styles}
      options={opciones}
      value={seleccionada}
      onChange={opcion => onChange(opcion?.value || '')}
      onCreateOption={texto => onChange(texto.trim())}
      isClearable
      isLoading={cargando}
      placeholder="Buscar ciudad o departamento..."
      filterOption={(opcion, texto) => normalizar(opcion.label).includes(normalizar(texto))}
      isValidNewOption={texto => texto.trim().length >= 2 && texto.trim().length <= 203 && !opciones.some(o => normalizar(o.value) === normalizar(texto))}
      formatCreateLabel={texto => `Agregar "${texto.trim()}"`}
      loadingMessage={() => 'Cargando ciudades...'}
      noOptionsMessage={() => 'Sin coincidencias. Podés agregar tu ciudad.'}
      maxMenuHeight={240}
      menuPlacement="auto"
    />
    <span id={`${id}-help`} className="tn-field-hint">{error ? 'No pudimos cargar las ciudades. Podés escribir y agregar la tuya.' : 'Buscá entre las ciudades de Paraguay. Si no aparece, podés agregarla.'}</span>
    {error && <button type="button" className="btn-ghost" onClick={() => setIntento(n => n + 1)}>Volver a cargar ciudades</button>}
  </div>;
}
