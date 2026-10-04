import React, { useState, useEffect, useMemo } from 'react';
import { X, MapPin } from 'lucide-react';
import CreatableSelect from 'react-select/creatable';
import { getCourierGeografia } from '../../services/courierApi';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'var(--color-canvas, #ffffff)',
    borderColor: state.isFocused ? 'var(--color-primary, #3b82f6)' : 'color-mix(in srgb, var(--color-fg, #000) 15%, transparent)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--color-primary, #3b82f6)' : 'none',
    borderRadius: '0.375rem',
    minHeight: '38px',
    color: 'var(--color-fg)',
    '&:hover': {
      borderColor: 'var(--color-primary, #3b82f6)'
    }
  }),
  menu: (base) => ({
    ...base,
    background: 'var(--color-canvas, #ffffff)',
    border: '1px solid color-mix(in srgb, var(--color-fg, #000) 12%, transparent)',
    zIndex: 999
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected ? 'var(--color-primary, #3b82f6)' : state.isFocused ? 'color-mix(in srgb, var(--color-fg, #000) 8%, transparent)' : 'var(--color-canvas, #ffffff)',
    color: state.isSelected ? '#fff' : 'var(--color-fg, #000)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    '&:active': {
      background: 'var(--color-primary, #3b82f6)',
      color: '#fff'
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--color-fg, #000)',
    fontSize: '0.85rem'
  }),
  input: (base) => ({
    ...base,
    color: 'var(--color-fg, #000)',
    fontSize: '0.85rem'
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--color-fg-subtle, #6b7280)',
    fontSize: '0.85rem'
  })
};

const getErrorSelectStyles = (hasError) => {
  if (!hasError) return selectStyles;
  return {
    ...selectStyles,
    control: (base, state) => ({
      ...selectStyles.control(base, state),
      borderColor: 'var(--color-danger, #ef4444)',
      '&:hover': {
        borderColor: 'var(--color-danger, #ef4444)'
      }
    })
  };
};

const normalizarBusqueda = (valor = "") => String(valor)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const filterSelectOption = (option, inputValue) => {
  const q = normalizarBusqueda(inputValue);
  if (!q) return true;
  return normalizarBusqueda(`${option.label} ${option.data?.departamento || ""}`).includes(q);
};

export default function DepositoForm({ initialValues, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({
    nombre: '',
    departamento: '',
    ciudad: '',
    direccion: '',
    referencia: '',
    personaContacto: '',
    telefonoContacto: '',
    googleMapsUrl: '',
    tipoUbicacion: 'DEPOSITO',
    ...initialValues
  });
  
  const [errors, setErrors] = useState({});
  const [geografia, setGeografia] = useState([]);
  const [geografiaLoading, setGeografiaLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setGeografiaLoading(true);
    getCourierGeografia({ conCiudades: true })
      .then(data => {
        if (isMounted && Array.isArray(data)) {
          setGeografia(data);
        }
      })
      .catch(err => {
        console.error('Error al cargar geografía:', err);
      })
      .finally(() => {
        if (isMounted) setGeografiaLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (initialValues) {
      setForm({ ...form, ...initialValues });
    }
  }, [initialValues]);

  const optionsDepartamentos = useMemo(() => {
    return geografia.map(d => ({
      value: d.nombre,
      label: d.nombre,
      id: d.id,
      ciudades: d.ciudades || []
    }));
  }, [geografia]);

  const optionsCiudades = useMemo(() => {
    const ciudadesMap = new Map();
    const deptoFiltro = normalizarBusqueda(form.departamento);

    geografia.forEach(depto => {
      const deptoNorm = normalizarBusqueda(depto.nombre);
      if (deptoFiltro && deptoNorm !== deptoFiltro) return;

      (depto.ciudades || []).forEach(ciudad => {
        const city = ciudad.nombre?.trim();
        if (!city) return;
        const key = `${depto.nombre.toLowerCase()}::${city.toLowerCase()}`;
        if (!ciudadesMap.has(key)) {
          ciudadesMap.set(key, {
            value: city,
            label: deptoFiltro ? city : `${city} - ${depto.nombre}`,
            departamento: depto.nombre
          });
        }
      });
    });

    return Array.from(ciudadesMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [geografia, form.departamento]);

  const ciudadExisteEnDepartamento = (ciudad, departamento) => {
    if (!ciudad || !departamento) return true;
    if (geografia.length === 0) return true;
    const deptoNorm = normalizarBusqueda(departamento);
    const ciudadNorm = normalizarBusqueda(ciudad);
    return geografia.some(d => (
      normalizarBusqueda(d.nombre) === deptoNorm &&
      (d.ciudades || []).some(c => normalizarBusqueda(c.nombre) === ciudadNorm)
    ));
  };

  const handleDepartamentoChange = (deptoNombre) => {
    setForm(prev => {
      const nextForm = { ...prev, departamento: deptoNombre };
      if (prev.ciudad && deptoNombre && !ciudadExisteEnDepartamento(prev.ciudad, deptoNombre)) {
        nextForm.ciudad = '';
      }
      return nextForm;
    });
    if (errors.ciudad) {
      setErrors(prev => ({ ...prev, ciudad: null }));
    }
  };

  const handleCiudadChange = (ciudadNombre, deptoNombreAsociado) => {
    setForm(prev => {
      const nextForm = { ...prev, ciudad: ciudadNombre };
      if (deptoNombreAsociado && (!prev.departamento || prev.departamento !== deptoNombreAsociado)) {
        nextForm.departamento = deptoNombreAsociado;
      }
      return nextForm;
    });
    if (errors.ciudad) {
      setErrors(prev => ({ ...prev, ciudad: null }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.nombre?.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!form.ciudad?.trim()) newErrors.ciudad = 'La ciudad es obligatoria';
    if (!form.direccion?.trim()) newErrors.direccion = 'La dirección es obligatoria';
    
    if (form.googleMapsUrl?.trim()) {
      try {
        new URL(form.googleMapsUrl);
      } catch (err) {
        newErrors.googleMapsUrl = 'Debe ser una URL válida (ej: https://maps.google.com/...)';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(form);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl overflow-hidden rounded-xl bg-surface shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin size={18} />
            </div>
            <h2 className="m-0 text-lg font-semibold text-fg">
              {initialValues?.id ? 'Editar ubicación' : 'Nueva ubicación'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-fg">Nombre de la ubicación *</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Salón Centro o Depósito Central Luque"
                  className={`w-full rounded-md border ${errors.nombre ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'} bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors`}
                />
                {errors.nombre && <p className="mt-1 text-[13px] text-danger">{errors.nombre}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-fg">Tipo de ubicación *</label>
                <select
                  name="tipoUbicacion"
                  value={form.tipoUbicacion || 'DEPOSITO'}
                  onChange={handleChange}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-primary"
                >
                  <option value="SALON">Salón / sucursal</option>
                  <option value="DEPOSITO">Depósito</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">Departamento</label>
                <CreatableSelect
                  isClearable
                  placeholder="Buscar departamento..."
                  styles={selectStyles}
                  options={optionsDepartamentos}
                  filterOption={filterSelectOption}
                  isLoading={geografiaLoading}
                  noOptionsMessage={() => "Sin coincidencias."}
                  formatCreateLabel={(inputValue) => `Usar "${inputValue}"`}
                  value={form.departamento ? (
                    optionsDepartamentos.find(o => normalizarBusqueda(o.value) === normalizarBusqueda(form.departamento))
                    || { value: form.departamento, label: form.departamento }
                  ) : null}
                  onChange={(newValue) => {
                    handleDepartamentoChange(newValue ? newValue.value : "");
                  }}
                  onCreateOption={(inputValue) => handleDepartamentoChange(inputValue)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">Ciudad *</label>
                <CreatableSelect
                  isClearable
                  placeholder={form.departamento ? "Buscar ciudad del departamento..." : "Primero elegí departamento o buscá ciudad..."}
                  styles={getErrorSelectStyles(Boolean(errors.ciudad))}
                  options={optionsCiudades}
                  filterOption={filterSelectOption}
                  isLoading={geografiaLoading}
                  noOptionsMessage={() => "No encontramos ciudades para ese filtro."}
                  formatCreateLabel={(inputValue) => `Usar "${inputValue}"`}
                  formatOptionLabel={(option, { context }) => (
                    context === "menu" ? (
                      <div className="flex items-center justify-between">
                        <span>{option.value}</span>
                        {option.departamento && (
                          <small className="text-fg-subtle text-xs ml-2">
                            {option.departamento}
                          </small>
                        )}
                      </div>
                    ) : option.label
                  )}
                  value={form.ciudad ? (
                    optionsCiudades.find(o => normalizarBusqueda(o.value) === normalizarBusqueda(form.ciudad) && (!form.departamento || normalizarBusqueda(o.departamento || "") === normalizarBusqueda(form.departamento)))
                    || { value: form.ciudad, label: form.departamento ? `${form.ciudad} - ${form.departamento}` : form.ciudad }
                  ) : null}
                  onChange={(newValue) => {
                    const val = newValue ? newValue.value : "";
                    handleCiudadChange(val, newValue?.departamento);
                  }}
                  onCreateOption={(inputValue) => {
                    handleCiudadChange(inputValue);
                  }}
                />
                {errors.ciudad && <p className="mt-1 text-[13px] text-danger">{errors.ciudad}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-fg">Dirección *</label>
                <input
                  type="text"
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  placeholder="Calle, número, barrio"
                  className={`w-full rounded-md border ${errors.direccion ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'} bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors`}
                />
                {errors.direccion && <p className="mt-1 text-[13px] text-danger">{errors.direccion}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-fg">Referencia</label>
                <input
                  type="text"
                  name="referencia"
                  value={form.referencia}
                  onChange={handleChange}
                  placeholder="Ej: frente a la plaza, portón negro"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">Persona de contacto</label>
                <input
                  type="text"
                  name="personaContacto"
                  value={form.personaContacto}
                  onChange={handleChange}
                  placeholder="Quien recibe o entrega"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">Teléfono de contacto</label>
                <input
                  type="text"
                  name="telefonoContacto"
                  value={form.telefonoContacto}
                  onChange={handleChange}
                  placeholder="Ej: 0991234567"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-fg">Link de Google Maps</label>
                <input
                  type="text"
                  name="googleMapsUrl"
                  value={form.googleMapsUrl}
                  onChange={handleChange}
                  placeholder="https://maps.google.com/..."
                  className={`w-full rounded-md border ${errors.googleMapsUrl ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'} bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors`}
                />
                {errors.googleMapsUrl && <p className="mt-1 text-[13px] text-danger">{errors.googleMapsUrl}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border bg-surface-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-70 flex items-center gap-2"
            >
              {loading && <span className="loader loader-sm border-white" />}
              Guardar ubicación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
