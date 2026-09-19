import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';

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
    ...initialValues
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm({ ...form, ...initialValues });
    }
  }, [initialValues]);

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
              {initialValues?.id ? 'Editar depósito' : 'Nuevo depósito'}
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
                <label className="mb-1 block text-sm font-medium text-fg">Nombre del depósito *</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Depósito Central Luque"
                  className={`w-full rounded-md border ${errors.nombre ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'} bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors`}
                />
                {errors.nombre && <p className="mt-1 text-[13px] text-danger">{errors.nombre}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">Departamento</label>
                <input
                  type="text"
                  name="departamento"
                  value={form.departamento}
                  onChange={handleChange}
                  placeholder="Ej: Central"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">Ciudad *</label>
                <input
                  type="text"
                  name="ciudad"
                  value={form.ciudad}
                  onChange={handleChange}
                  placeholder="Ej: Luque"
                  className={`w-full rounded-md border ${errors.ciudad ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'} bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors`}
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
              Guardar depósito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
