import React from 'react';
import { Plus, Trash2, Cpu, Leaf, Package } from 'lucide-react';

/**
 * Pestaña "Ficha del rubro" de la carga de productos.
 *
 * Existe porque la página de producto de cada template rígido pide
 * información distinta: Suplementos necesita ingredientes con su dosis,
 * Electrónica necesita especificaciones técnicas, "en la caja" y una
 * comparativa. Pedir todos los campos a todos los productos sería un
 * formulario enorme lleno de secciones que no aplican, así que el rubro
 * (Producto.ficha_rubro) decide cuáles se muestran.
 *
 * Todo esto es DEL PRODUCTO, no de una landing: se carga una vez y lo usan
 * todas las landings donde ese producto aparezca (ver
 * templates/tech/fichaTech.js → fichaTechDesdeProducto).
 *
 * Lo genérico (beneficios, confianza, propuesta de valor, preguntas) sigue
 * viviendo en "Marketing & Embudo" porque sirve para cualquier rubro; acá
 * solo está lo que es propio de uno.
 */

const RUBROS = [
  {
    value: '',
    label: 'Genérico',
    Icon: Package,
    ayuda: 'Sin campos extra. La ficha usa lo de Marketing & Embudo.',
  },
  {
    value: 'suplementos',
    label: 'Suplementos y fitness',
    Icon: Leaf,
    ayuda: 'Ingredientes con su dosis y modo de uso.',
  },
  {
    value: 'tecnologia',
    label: 'Electrónica y tecnología',
    Icon: Cpu,
    ayuda: 'Especificaciones técnicas, qué trae la caja y comparativa.',
  },
];

const LIMITES = {
  ingredientes: 8,
  especificaciones: 14,
  en_la_caja: 10,
  comparativa: 8,
};

export default function FichaRubroTab({ rubro, datos, onRubro, onDatos }) {
  const actual = RUBROS.find(r => r.value === (rubro || '')) || RUBROS[0];

  /** Escribe una clave de ficha_datos sin pisar las de otros rubros. */
  const set = (clave, valor) => onDatos({ ...(datos || {}), [clave]: valor });

  const listaDe = (clave) => (Array.isArray(datos?.[clave]) ? datos[clave] : []);

  return (
    <>
      <div className="form-group full">
        <label>Tipo de ficha</label>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
          {RUBROS.map(r => {
            const activo = (rubro || '') === r.value;
            return (
              <button
                key={r.value || 'generico'}
                type="button"
                onClick={() => onRubro(r.value || null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.7rem 0.95rem', borderRadius: '9px',
                  border: `1px solid ${activo ? 'var(--vit-accent, #7c5cff)' : 'color-mix(in srgb, currentColor 18%, transparent)'}`,
                  background: activo ? 'color-mix(in srgb, currentColor 8%, transparent)' : 'transparent',
                  color: 'inherit', font: 'inherit', fontSize: '0.82rem',
                  fontWeight: activo ? 700 : 500, cursor: 'pointer',
                }}
              >
                <r.Icon size={16} style={{ opacity: activo ? 1 : 0.6 }} />
                {r.label}
              </button>
            );
          })}
        </div>
        <p className="field-hint">{actual.ayuda}</p>
      </div>

      {actual.value === '' && (
        <div className="form-group full">
          <p className="field-hint">
            Elegí un tipo de ficha arriba para cargar los campos propios de ese rubro. Sin rubro, la página de
            producto usa solo lo genérico (propuesta de valor, beneficios, confianza y preguntas frecuentes).
          </p>
        </div>
      )}

      {/* ── Suplementos ────────────────────────────────────────────── */}
      {actual.value === 'suplementos' && (
        <>
          <ListaObjetos
            label="Ingredientes"
            ayuda="Aparecen en la sección de ingredientes de la página de producto, con su dosis."
            items={listaDe('ingredientes')}
            max={LIMITES.ingredientes}
            nuevo={() => ({ nombre: '', dosis: '', texto: '' })}
            onChange={l => set('ingredientes', l)}
            textoAgregar="Agregar ingrediente"
            campos={[
              { clave: 'nombre', placeholder: 'L-Teanina', ancho: '38%' },
              { clave: 'dosis', placeholder: '200mg', ancho: '90px' },
            ]}
            areaClave="texto"
            areaPlaceholder="Relaja la mente sin causar somnolencia."
          />

          <div className="form-group full">
            <label>Modo de uso</label>
            <textarea
              rows={2}
              value={datos?.modo_uso || ''}
              onChange={e => set('modo_uso', e.target.value)}
              placeholder="Ej: 2 cápsulas al día con el desayuno."
            />
            <p className="field-hint">Una línea corta. Se muestra junto a los ingredientes.</p>
          </div>
        </>
      )}

      {/* ── Tecnología ─────────────────────────────────────────────── */}
      {actual.value === 'tecnologia' && (
        <>
          <ListaObjetos
            label="Especificaciones técnicas"
            ayuda="La tabla de specs de la página de producto. Una fila por dato."
            items={listaDe('especificaciones')}
            max={LIMITES.especificaciones}
            nuevo={() => ({ clave: '', valor: '' })}
            onChange={l => set('especificaciones', l)}
            textoAgregar="Agregar especificación"
            campos={[
              { clave: 'clave', placeholder: 'Batería', ancho: '38%' },
              { clave: 'valor', placeholder: '50 horas de reproducción', ancho: '1' },
            ]}
          />

          <ListaTextos
            label="En la caja"
            ayuda="Qué recibe el cliente. Una línea por ítem."
            items={listaDe('en_la_caja')}
            max={LIMITES.en_la_caja}
            placeholder="1x Cable de carga USB-C"
            onChange={l => set('en_la_caja', l)}
            textoAgregar="Agregar ítem"
          />

          <div className="form-group full">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>Comparativa contra otras marcas</label>
              <button
                type="button"
                className="btn-secondary btn-small"
                disabled={listaDe('comparativa').length >= LIMITES.comparativa}
                onClick={() => set('comparativa', [...listaDe('comparativa'), { caracteristica: '', nosotros: true, otros: false }])}
              >
                <Plus size={14} /> Agregar característica
              </button>
            </div>
            {listaDe('comparativa').length === 0 ? (
              <p className="field-hint">Sin características cargadas, la página no muestra la comparativa.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {listaDe('comparativa').map((c, i) => {
                  const actualizar = (cambios) => set('comparativa', listaDe('comparativa').map((x, j) => (j === i ? { ...x, ...cambios } : x)));
                  return (
                    <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        style={{ flex: 1, minWidth: '180px' }}
                        value={c.caracteristica || ''}
                        placeholder="Cancelación de ruido ANC"
                        onChange={e => actualizar({ caracteristica: e.target.value })}
                      />
                      <label className="check-label" style={{ whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={c.nosotros !== false} onChange={e => actualizar({ nosotros: e.target.checked })} />
                        Nosotros
                      </label>
                      <label className="check-label" style={{ whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={c.otros === true} onChange={e => actualizar({ otros: e.target.checked })} />
                        Otras marcas
                      </label>
                      <button type="button" className="btn-icon" onClick={() => set('comparativa', listaDe('comparativa').filter((_, j) => j !== i))}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="field-hint">
              Compará con hechos verificables: afirmar algo falso sobre la competencia es publicidad engañosa.
            </p>
          </div>
        </>
      )}
    </>
  );
}

/* ── Piezas ───────────────────────────────────────────────────────── */

function ListaObjetos({ label, ayuda, items, max, nuevo, onChange, textoAgregar, campos, areaClave, areaPlaceholder }) {
  const actualizar = (i, cambios) => onChange(items.map((x, j) => (j === i ? { ...x, ...cambios } : x)));
  return (
    <div className="form-group full">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <label style={{ margin: 0 }}>{label}</label>
        <button type="button" className="btn-secondary btn-small" disabled={items.length >= max} onClick={() => onChange([...items, nuevo()])}>
          <Plus size={14} /> {items.length >= max ? `Máximo ${max}` : textoAgregar}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="field-hint">Sin datos cargados, la página de producto no muestra esta sección.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {campos.map(c => (
                    <input
                      key={c.clave}
                      style={c.ancho === '1' ? { flex: 1 } : { width: c.ancho, flexShrink: 0 }}
                      value={it[c.clave] || ''}
                      placeholder={c.placeholder}
                      onChange={e => actualizar(i, { [c.clave]: e.target.value })}
                    />
                  ))}
                </div>
                {areaClave && (
                  <textarea
                    rows={2}
                    value={it[areaClave] || ''}
                    placeholder={areaPlaceholder}
                    onChange={e => actualizar(i, { [areaClave]: e.target.value })}
                  />
                )}
              </div>
              <button type="button" className="btn-icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {ayuda && <p className="field-hint">{ayuda}</p>}
    </div>
  );
}

function ListaTextos({ label, ayuda, items, max, placeholder, onChange, textoAgregar }) {
  return (
    <div className="form-group full">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <label style={{ margin: 0 }}>{label}</label>
        <button type="button" className="btn-secondary btn-small" disabled={items.length >= max} onClick={() => onChange([...items, ''])}>
          <Plus size={14} /> {items.length >= max ? `Máximo ${max}` : textoAgregar}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="field-hint">Sin ítems cargados, la página de producto no muestra esta caja.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map((linea, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                style={{ flex: 1 }}
                value={linea}
                placeholder={placeholder}
                onChange={e => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button type="button" className="btn-icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {ayuda && <p className="field-hint">{ayuda}</p>}
    </div>
  );
}
