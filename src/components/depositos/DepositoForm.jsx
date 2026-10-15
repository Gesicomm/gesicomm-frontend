import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import DepositoCampos, { DEPOSITO_VACIO, validarDeposito } from './DepositoCampos';

// Edición de un depósito existente (y alta rápida desde el selector de
// abastecimiento). El alta completa — depósito + courier + ciudades — va por el
// asistente de CourierWizard; los campos son los mismos (DepositoCampos).
export default function DepositoForm({ initialValues, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({ ...DEPOSITO_VACIO, ...initialValues });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm(prev => ({ ...prev, ...initialValues }));
    }
  }, [initialValues]);

  const handleCambio = (cambios) => {
    setForm(prev => ({ ...prev, ...cambios }));
    setErrors(prev => {
      const siguiente = { ...prev };
      Object.keys(cambios).forEach(campo => { delete siguiente[campo]; });
      return siguiente;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errores = validarDeposito(form);
    setErrors(errores);
    if (Object.keys(errores).length === 0) onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-brand-ink/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl bg-surface shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
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
            <DepositoCampos form={form} errors={errors} onChange={handleCambio} />
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
              className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-70 flex items-center gap-2"
            >
              {loading && <span className="loader loader-sm border-border" />}
              Guardar depósito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
