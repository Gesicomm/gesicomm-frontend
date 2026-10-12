import React, { useState, useEffect, useMemo } from 'react';
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
  .replace(/[̀-ͯ]/g, "")
  .trim()
  .toLowerCase();

const filterSelectOption = (option, inputValue) => {
  const q = normalizarBusqueda(inputValue);
  if (!q) return true;
  return normalizarBusqueda(`${option.label} ${option.data?.departamento || ""}`).includes(q);
};

// Ya no se elige "salón o depósito": toda ubicación nueva es un depósito. Los
// salones que existían conservan su tipo (viene en initialValues al editar).
export const DEPOSITO_VACIO = {
  nombre: '',
  departamento: '',
  ciudad: '',
  direccion: '',
  referencia: '',
  personaContacto: '',
  telefonoContacto: '',
  googleMapsUrl: '',
  tipoUbicacion: 'DEPOSITO',
};

/** Errores por campo; objeto vacío si el depósito se puede guardar. */
export function validarDeposito(form) {
  const errores = {};
  if (!form.nombre?.trim()) errores.nombre = 'El nombre es obligatorio';
  if (!form.ciudad?.trim()) errores.ciudad = 'La ciudad es obligatoria';
  if (!form.direccion?.trim()) errores.direccion = 'La dirección es obligatoria';

  if (form.googleMapsUrl?.trim()) {
    try {
      new URL(form.googleMapsUrl);
    } catch {
      errores.googleMapsUrl = 'Debe ser una URL válida (ej: https://maps.google.com/...)';
    }
  }
  return errores;
}

/**
 * Los campos de un depósito, sin marco: los usan el modal de edición
 * (DepositoForm) y el primer paso del asistente de alta (CourierWizard), para
 * que el depósito se cargue igual en los dos lados.
 *
 * `onChange(cambios)` recibe un objeto parcial — elegir una ciudad puede
 * completar también el departamento, y limpiar un departamento vaciar la ciudad.
 */
export default function DepositoCampos({ form, errors = {}, onChange, autoFocus = false }) {
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
    const cambios = { departamento: deptoNombre };
    if (form.ciudad && deptoNombre && !ciudadExisteEnDepartamento(form.ciudad, deptoNombre)) {
      cambios.ciudad = '';
    }
    onChange(cambios);
  };

  const handleCiudadChange = (ciudadNombre, deptoNombreAsociado) => {
    const cambios = { ciudad: ciudadNombre };
    if (deptoNombreAsociado && (!form.departamento || form.departamento !== deptoNombreAsociado)) {
      cambios.departamento = deptoNombreAsociado;
    }
    onChange(cambios);
  };

  const handleChange = (e) => onChange({ [e.target.name]: e.target.value });

  const claseInput = (conError) => (
    `w-full rounded-md border ${conError ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'} bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors`
  );

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-fg">Nombre del depósito *</label>
        <input
          type="text"
          name="nombre"
          autoFocus={autoFocus}
          value={form.nombre}
          onChange={handleChange}
          placeholder="Ej: Depósito Central Luque"
          className={claseInput(errors.nombre)}
        />
        {errors.nombre && <p className="mt-1 text-[13px] text-danger">{errors.nombre}</p>}
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
          className={claseInput(errors.direccion)}
        />
        {errors.direccion && <p className="mt-1 text-[13px] text-danger">{errors.direccion}</p>}
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-fg">Referencia</label>
        <input
          type="text"
          name="referencia"
          value={form.referencia || ''}
          onChange={handleChange}
          placeholder="Ej: frente a la plaza, portón negro"
          className={claseInput(false)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-fg">Persona de contacto</label>
        <input
          type="text"
          name="personaContacto"
          value={form.personaContacto || ''}
          onChange={handleChange}
          placeholder="Quien recibe o entrega"
          className={claseInput(false)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-fg">Teléfono de contacto</label>
        <input
          type="text"
          name="telefonoContacto"
          value={form.telefonoContacto || ''}
          onChange={handleChange}
          placeholder="Ej: 0991234567"
          className={claseInput(false)}
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-fg">Link de Google Maps</label>
        <input
          type="text"
          name="googleMapsUrl"
          value={form.googleMapsUrl || ''}
          onChange={handleChange}
          placeholder="https://maps.google.com/..."
          className={claseInput(errors.googleMapsUrl)}
        />
        {errors.googleMapsUrl && <p className="mt-1 text-[13px] text-danger">{errors.googleMapsUrl}</p>}
      </div>
    </div>
  );
}
