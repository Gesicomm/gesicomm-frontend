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
          border: '1px solid #e2e8f0',
          padding: '8px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          background: '#fff'
        }}
      >
        <Calendar size={16} style={{ color: '#6b7280' }} />
        <span style={{ flex: 1, color: value ? '#000' : '#9ca3af', fontSize: '14px' }}>
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
              color: '#9ca3af'
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
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            width: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#4b5563' }}>
              Días de atención
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select 
                value={diaInicio} 
                onChange={e => setDiaInicio(e.target.value)}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
              >
                {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>a</span>
              <select 
                value={diaFin} 
                onChange={e => setDiaFin(e.target.value)}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
              >
                {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#4b5563' }}>
              <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />
              Horario
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="time" 
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
              />
              <span style={{ color: '#6b7280', fontSize: '14px' }}>a</span>
              <input 
                type="time" 
                value={horaFin}
                onChange={e => setHoraFin(e.target.value)}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
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
                border: '1px solid #d1d5db',
                background: '#fff',
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
                background: '#10b981',
                color: '#fff',
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