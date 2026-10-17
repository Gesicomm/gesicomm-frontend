import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, X } from 'lucide-react';

const DIAS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

export default function HorarioPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const [diaInicio, setDiaInicio] = useState('Lunes');
  const [diaFin, setDiaFin] = useState('Viernes');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('18:00');

  useEffect(() => {
    if (value) {
      const regex = /(.+) a (.+) de (\d{2}:\d{2}) a (\d{2}:\d{2})/i;
      const match = value.match(regex);
      if (match) {
        if (DIAS.includes(match[1])) setDiaInicio(match[1]);
        if (DIAS.includes(match[2])) setDiaFin(match[2]);
        setHoraInicio(match[3]);
        setHoraFin(match[4]);
      }
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const aplicar = () => {
    const format = `${diaInicio} a ${diaFin} de ${horaInicio} a ${horaFin}`;
    onChange(format);
    setIsOpen(false);
  };

  const limpiar = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className="horario-picker-container" ref={containerRef} style={{ position: 'relative' }}>
      <div 
        className="tn-input-like" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: "1px solid var(--color-border)",
          padding: '8px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          background: "var(--color-surface)"
        }}
      >
        <Calendar size={16} style={{ color: "var(--color-fg-muted)" }} />
        <span style={{ flex: 1, color: value ? "var(--color-fg)" : "var(--color-fg-muted)", fontSize: '14px' }}>
          {value || 'Seleccionar horario...'}
        </span>
        {value && (
          <button
            type="button"
            onClick={limpiar}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: "var(--color-fg-muted)"
            }}
            title="Limpiar horario"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          className="horario-picker-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            width: 'min(320px, 100%)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: "var(--color-fg-muted)" }}>
              Días de atención
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select 
                value={diaInicio} 
                onChange={e => setDiaInicio(e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: '6px 8px', border: "1px solid var(--color-border)", borderRadius: '4px' }}
              >
                {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span style={{ color: "var(--color-fg-muted)", fontSize: '14px' }}>a</span>
              <select 
                value={diaFin} 
                onChange={e => setDiaFin(e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: '6px 8px', border: "1px solid var(--color-border)", borderRadius: '4px' }}
              >
                {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: "var(--color-fg-muted)" }}>
              <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />
              Horario
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="time" 
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
                style={{ flex: 1, minWidth: 0, width: '100%', padding: '6px 8px', border: "1px solid var(--color-border)", borderRadius: '4px' }}
              />
              <span style={{ color: "var(--color-fg-muted)", fontSize: '14px' }}>a</span>
              <input 
                type="time" 
                value={horaFin}
                onChange={e => setHoraFin(e.target.value)}
                style={{ flex: 1, minWidth: 0, width: '100%', padding: '6px 8px', border: "1px solid var(--color-border)", borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={aplicar}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                border: 'none',
                background: "var(--color-primary)",
                color: "var(--color-primary-fg)",
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
