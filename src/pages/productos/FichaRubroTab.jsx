import React from 'react';
import { Plus, Trash2, Cpu, Leaf, Package, Sparkles } from 'lucide-react';

/**
 * Tipo de ficha + campos propios del rubro.
 *
 * El selector y los campos editables viven en Vista del producto para que el
 * usuario pueda cambiar el tipo y ver al instante qué campos habilita.
 */

const RUBROS = [
  {
    value: 'basico',
    label: 'Genérico / ficha básica',
    Icon: Package,
    ayuda: 'Descripción, usos y comparación simple.',
  },
  {
    value: 'suplementos',
    label: 'Suplementos y fitness',
    Icon: Leaf,
    ayuda: 'Ingredientes, dosis, opiniones y pasos de uso.',
  },
  {
    value: 'tecnologia',
    label: 'Electrónica y tecnología',
    Icon: Cpu,
    ayuda: 'Especificaciones, contenido de la caja y comparación visual.',
  },
  {
    value: 'beauty',
    label: 'Beauty y Skin Care',
    Icon: Sparkles,
    ayuda: 'Ingredientes, resultados antes/después y rutina de uso.',
  },
];

const LIMITES = {
  basico_destacados: 4,
  basico_usos: 4,
  basico_comparacion: 8,
  ingredientes: 8,
  fitness_pasos: 5,
  fitness_opiniones: 9,
  especificaciones: 14,
  en_la_caja: 10,
  tech_multimedia: 6,
  comparativa: 8,
  tech_resenas: 9,
  beauty_ingredientes: 5,
  beauty_pasos: 4,
  beauty_resultados: 3,
};

export default function FichaRubroTab({ rubro, datos, onRubro, onDatos, modo = 'completo' }) {
  const rubroActual = rubro || 'basico';
  const actual = RUBROS.find(r => r.value === rubroActual) || null;
  const mostrarSelector = modo === 'selector' || modo === 'completo';
  const mostrarCampos = modo === 'campos' || modo === 'completo';

  const set = (clave, valor) => onDatos({ ...(datos || {}), [clave]: valor });
  const listaDe = (clave) => (Array.isArray(datos?.[clave]) ? datos[clave] : []);

  return (
    <>
      {mostrarSelector && (
        <div className="form-group full rubro-selector">
          <div className="rubro-section-heading">
            <label>Seleccioná qué tipo de ficha muestra mejor tu producto</label>
          </div>
          <div className="rubro-options">
            {RUBROS.map(r => {
              const activo = rubroActual === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => onRubro(r.value)}
                  className={`rubro-option ${activo ? 'active' : ''}`}
                >
                  <r.Icon size={16} />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
          <p className="field-hint">
            {actual?.ayuda || 'Cambiá el tipo para ver los campos disponibles de cada ficha.'}
          </p>
        </div>
      )}

      {mostrarCampos && actual?.value === 'basico' && (
        <>
          <div className="rubro-field-card">
            <div className="rubro-card-header">
              <div>
                <label>Descripción del producto</label>
                <p>Titular y puntos destacados de la ficha básica. El texto principal se edita en “Sobre este producto”.</p>
              </div>
            </div>
            <div className="rubro-row-main">
              <CampoDato
                label="Titular"
                value={datos?.basico_descripcion_encabezado || ''}
                placeholder="Diseñado para funcionar, creado para durar"
                onChange={valor => set('basico_descripcion_encabezado', valor)}
              />
              <ListaTextos
                label="Puntos destacados"
                ayuda="Aparecen como checks debajo de la descripción."
                items={listaDe('basico_descripcion_destacados')}
                max={LIMITES.basico_destacados}
                placeholder="Diseño inteligente"
                onChange={l => set('basico_descripcion_destacados', l)}
                textoAgregar="Agregar punto"
              />
            </div>
          </div>

          <ListaObjetos
            label="Usos y aplicaciones"
            ayuda="Pasos o situaciones de uso, en el mismo orden de la página."
            items={listaDe('basico_usos')}
            max={LIMITES.basico_usos}
            nuevo={() => ({ paso: '', titulo: '', texto: '' })}
            onChange={l => set('basico_usos', l)}
            textoAgregar="Agregar uso"
            campos={[
              { clave: 'paso', label: 'Paso', placeholder: '1' },
              { clave: 'titulo', label: 'Título', placeholder: 'Elegí' },
            ]}
            areaClave="texto"
            areaLabel="Detalle"
            areaPlaceholder="Seleccioná la opción ideal para vos."
          />

          <div className="rubro-field-card">
            <div className="rubro-card-header">
              <div>
                <label>Comparación</label>
                <p>Tu producto frente a otras opciones.</p>
              </div>
              <button
                type="button"
                className="btn-secondary btn-small"
                disabled={listaDe('basico_comparacion').length >= LIMITES.basico_comparacion}
                onClick={() => set('basico_comparacion', [...listaDe('basico_comparacion'), { caracteristica: '', nosotros: true, otros: false }])}
              >
                <Plus size={14} /> Agregar característica
              </button>
            </div>

            <div className="rubro-image-grid">
              <CampoDato
                label="Imagen de mi producto"
                value={datos?.basico_comparacion_imagen_nosotros || ''}
                placeholder="Vacío = foto principal del producto"
                onChange={valor => set('basico_comparacion_imagen_nosotros', valor)}
              />
              <CampoDato
                label="Imagen de otras opciones"
                value={datos?.basico_comparacion_imagen_otros || ''}
                placeholder="URL de imagen de referencia"
                onChange={valor => set('basico_comparacion_imagen_otros', valor)}
              />
            </div>

            {listaDe('basico_comparacion').length === 0 ? (
              <p className="field-hint">Sin características cargadas, la página no muestra la comparación.</p>
            ) : (
              <div className="rubro-list">
                {listaDe('basico_comparacion').map((c, i) => {
                  const actualizar = (cambios) => set('basico_comparacion', listaDe('basico_comparacion').map((x, j) => (j === i ? { ...x, ...cambios } : x)));
                  return (
                    <div key={i} className="rubro-row">
                      <div className="rubro-row-main">
                        <CampoDato
                          label="Característica"
                          value={c.caracteristica || ''}
                          placeholder="Garantía incluida"
                          onChange={valor => actualizar({ caracteristica: valor })}
                        />
                        <div className="rubro-checks">
                          <label className="check-label">
                            <input type="checkbox" checked={c.nosotros !== false} onChange={e => actualizar({ nosotros: e.target.checked })} />
                            Mi producto
                          </label>
                          <label className="check-label">
                            <input type="checkbox" checked={c.otros === true} onChange={e => actualizar({ otros: e.target.checked })} />
                            Otras opciones
                          </label>
                        </div>
                      </div>
                      <button type="button" className="btn-icon" onClick={() => set('basico_comparacion', listaDe('basico_comparacion').filter((_, j) => j !== i))}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {mostrarCampos && actual?.value === 'suplementos' && (
        <>
          <ListaObjetos
            label="Ingredientes"
            ayuda="Se muestran en la sección de ingredientes de la página del producto."
            items={listaDe('ingredientes')}
            max={LIMITES.ingredientes}
            nuevo={() => ({ nombre: '', dosis: '', texto: '' })}
            onChange={l => set('ingredientes', l)}
            textoAgregar="Agregar ingrediente"
            campos={[
              { clave: 'nombre', label: 'Ingrediente', placeholder: 'L-Teanina' },
              { clave: 'dosis', label: 'Dosis', placeholder: '200mg' },
            ]}
            areaClave="texto"
            areaLabel="Beneficio"
            areaPlaceholder="Relaja la mente sin causar somnolencia."
          />

          <ListaObjetos
            label="Opiniones de clientes"
            ayuda="Testimonios con nombre, estrellas y foto opcional."
            items={listaDe('fitness_opiniones')}
            max={LIMITES.fitness_opiniones}
            nuevo={() => ({ nombre: '', comentario: '', calificacion: 5, foto: '' })}
            onChange={l => set('fitness_opiniones', l)}
            textoAgregar="Agregar opinión"
            campos={[
              { clave: 'nombre', label: 'Nombre', placeholder: 'Carlos M.' },
              { clave: 'calificacion', label: 'Estrellas', placeholder: '5', tipo: 'number', min: 1, max: 5 },
              { clave: 'foto', label: 'Foto', placeholder: 'URL de foto opcional' },
            ]}
            areaClave="comentario"
            areaLabel="Comentario"
            areaPlaceholder="Noté más energía y constancia desde la segunda semana."
          />

          <ListaObjetos
            label="Cómo funciona"
            ayuda="Pasos desde que lo toma hasta que ve resultados."
            items={listaDe('fitness_pasos')}
            max={LIMITES.fitness_pasos}
            nuevo={() => ({ paso: '', titulo: '', texto: '' })}
            onChange={l => set('fitness_pasos', l)}
            textoAgregar="Agregar paso"
            campos={[
              { clave: 'paso', label: 'Paso', placeholder: '1' },
              { clave: 'titulo', label: 'Título', placeholder: 'Tomalo con agua' },
            ]}
            areaClave="texto"
            areaLabel="Detalle"
            areaPlaceholder="Ej: Tomá 2 cápsulas con el desayuno."
          />
        </>
      )}

      {mostrarCampos && actual?.value === 'tecnologia' && (
        <>
          <ListaObjetos
            label="Especificaciones técnicas"
            ayuda="Tabla de specs de la página del producto."
            items={listaDe('especificaciones')}
            max={LIMITES.especificaciones}
            nuevo={() => ({ clave: '', valor: '' })}
            onChange={l => set('especificaciones', l)}
            textoAgregar="Agregar especificación"
            campos={[
              { clave: 'clave', label: 'Dato', placeholder: 'Batería' },
              { clave: 'valor', label: 'Valor', placeholder: '50 horas de reproducción' },
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

          <ListaObjetos
            label="Contenido visual"
            ayuda="Pegá links de YouTube, Vimeo, Drive, Loom, Wistia o MP4/WebM. Video recomendado: 16:9 en 1920x1080 o 1280x720; portada recomendada: 1200x675."
            items={listaDe('tech_multimedia')}
            max={LIMITES.tech_multimedia}
            nuevo={() => ({ titulo: '', url: '', imagen: '' })}
            onChange={l => set('tech_multimedia', l)}
            textoAgregar="Agregar contenido"
            campos={[
              { clave: 'titulo', label: 'Título', placeholder: 'Detalle del producto' },
              { clave: 'url', label: 'Link de video', placeholder: 'https://youtube.com/watch?v=...' },
              { clave: 'imagen', label: 'Portada opcional', placeholder: 'URL de imagen 16:9' },
            ]}
          />

          <div className="rubro-field-card">
            <div className="rubro-card-header">
              <div>
                <label>Comparativa contra otras marcas</label>
                <p>Imagen de tu producto, imagen del otro producto y hechos comparables.</p>
              </div>
              <button
                type="button"
                className="btn-secondary btn-small"
                disabled={listaDe('comparativa').length >= LIMITES.comparativa}
                onClick={() => set('comparativa', [...listaDe('comparativa'), { caracteristica: '', nosotros: true, otros: false }])}
              >
                <Plus size={14} /> Agregar característica
              </button>
            </div>

            <div className="rubro-image-grid">
              <CampoDato
                label="Imagen de mi producto"
                value={datos?.comparativa_imagen_nosotros || ''}
                placeholder="URL de imagen para la comparación"
                onChange={valor => set('comparativa_imagen_nosotros', valor)}
              />
              <CampoDato
                label="Imagen de otros productos"
                value={datos?.comparativa_imagen_otros || ''}
                placeholder="URL de imagen de referencia"
                onChange={valor => set('comparativa_imagen_otros', valor)}
              />
            </div>

            {listaDe('comparativa').length === 0 ? (
              <p className="field-hint">Sin características cargadas, la página no muestra la comparativa.</p>
            ) : (
              <div className="rubro-list">
                {listaDe('comparativa').map((c, i) => {
                  const actualizar = (cambios) => set('comparativa', listaDe('comparativa').map((x, j) => (j === i ? { ...x, ...cambios } : x)));
                  return (
                    <div key={i} className="rubro-row">
                      <div className="rubro-row-main">
                        <CampoDato
                          label="Característica"
                          value={c.caracteristica || ''}
                          placeholder="Cancelación de ruido ANC"
                          onChange={valor => actualizar({ caracteristica: valor })}
                        />
                        <div className="rubro-checks">
                          <label className="check-label">
                            <input type="checkbox" checked={c.nosotros !== false} onChange={e => actualizar({ nosotros: e.target.checked })} />
                            Mi producto
                          </label>
                          <label className="check-label">
                            <input type="checkbox" checked={c.otros === true} onChange={e => actualizar({ otros: e.target.checked })} />
                            Otros productos
                          </label>
                        </div>
                      </div>
                      <button type="button" className="btn-icon" onClick={() => set('comparativa', listaDe('comparativa').filter((_, j) => j !== i))}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="field-hint">Compará con hechos verificables para evitar publicidad engañosa.</p>
          </div>

          <ListaObjetos
            label="Reseñas y testimonios"
            ayuda="Opiniones reales de clientes para la ficha de tecnología."
            items={listaDe('tech_resenas')}
            max={LIMITES.tech_resenas}
            nuevo={() => ({ nombre: '', comentario: '', calificacion: 5, foto: '' })}
            onChange={l => set('tech_resenas', l)}
            textoAgregar="Agregar reseña"
            campos={[
              { clave: 'nombre', label: 'Nombre', placeholder: 'Laura P.' },
              { clave: 'calificacion', label: 'Estrellas', placeholder: '5', tipo: 'number', min: 1, max: 5 },
              { clave: 'foto', label: 'Foto', placeholder: 'URL de foto opcional' },
            ]}
            areaClave="comentario"
            areaLabel="Comentario"
            areaPlaceholder="La batería dura mucho más de lo que esperaba."
          />
        </>
      )}

      {mostrarCampos && actual?.value === 'beauty' && (
        <>
          <ListaObjetos
            label="Ingredientes premium"
            ayuda="Aparecen con su ícono y beneficio para la piel."
            items={listaDe('beauty_ingredientes')}
            max={LIMITES.beauty_ingredientes}
            nuevo={() => ({ icono: '💧', nombre: '', descripcion: '' })}
            onChange={l => set('beauty_ingredientes', l)}
            textoAgregar="Agregar ingrediente"
            campos={[
              { clave: 'icono', label: 'Ícono', placeholder: '💧' },
              { clave: 'nombre', label: 'Ingrediente', placeholder: 'Ácido hialurónico' },
              { clave: 'descripcion', label: 'Beneficio', placeholder: 'Hidratación profunda y rellena arrugas' },
            ]}
          />

          <ListaObjetos
            label="Resultados antes/después"
            ayuda="Testimonios reales con imágenes comparativas opcionales."
            items={listaDe('beauty_resultados')}
            max={LIMITES.beauty_resultados}
            nuevo={() => ({ nombre: '', testimonio: '', calificacion: 5, antes: '', despues: '' })}
            onChange={l => set('beauty_resultados', l)}
            textoAgregar="Agregar testimonio"
            campos={[
              { clave: 'nombre', label: 'Nombre', placeholder: 'Ana M.' },
              { clave: 'calificacion', label: 'Estrellas', placeholder: '5', tipo: 'number', min: 1, max: 5 },
            ]}
            extraCampos={[
              { clave: 'antes', label: 'Imagen antes', placeholder: 'URL de imagen antes' },
              { clave: 'despues', label: 'Imagen después', placeholder: 'URL de imagen después' },
            ]}
            areaClave="testimonio"
            areaLabel="Testimonio"
            areaPlaceholder="Mi piel se ve más luminosa, hidratada y suave."
          />

          <ListaObjetos
            label="Cómo funciona"
            ayuda="Guía paso a paso de uso o cómo actúa el producto en la piel."
            items={listaDe('beauty_pasos')}
            max={LIMITES.beauty_pasos}
            nuevo={() => ({ paso: '', titulo: '', descripcion: '' })}
            onChange={l => set('beauty_pasos', l)}
            textoAgregar="Agregar paso"
            campos={[
              { clave: 'paso', label: 'Paso', placeholder: '1' },
              { clave: 'titulo', label: 'Título', placeholder: 'Limpia' },
              { clave: 'descripcion', label: 'Detalle', placeholder: 'Limpia tu rostro completamente' },
            ]}
          />
        </>
      )}
    </>
  );
}

function CampoDato({ label, value, placeholder, onChange, type = 'text', min, max }) {
  return (
    <label className="rubro-field">
      <span>{label}</span>
      <input
        type={type}
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  );
}

function ListaObjetos({
  label,
  ayuda,
  items,
  max,
  nuevo,
  onChange,
  textoAgregar,
  campos,
  extraCampos,
  areaClave,
  areaLabel,
  areaPlaceholder,
}) {
  const actualizar = (i, cambios) => onChange(items.map((x, j) => (j === i ? { ...x, ...cambios } : x)));
  return (
    <div className="rubro-field-card">
      <div className="rubro-card-header">
        <div>
          <label>{label}</label>
          {ayuda && <p>{ayuda}</p>}
        </div>
        <button type="button" className="btn-secondary btn-small" disabled={items.length >= max} onClick={() => onChange([...items, nuevo()])}>
          <Plus size={14} /> {items.length >= max ? `Máximo ${max}` : textoAgregar}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="field-hint">Sin datos cargados, la página de producto no muestra esta sección.</p>
      ) : (
        <div className="rubro-list">
          {items.map((it, i) => (
            <div key={i} className="rubro-row">
              <div className="rubro-row-main">
                <div className="rubro-row-fields">
                  {campos.map(c => (
                    <CampoDato
                      key={c.clave}
                      label={c.label}
                      type={c.tipo || 'text'}
                      min={c.min}
                      max={c.max}
                      value={it[c.clave] || ''}
                      placeholder={c.placeholder}
                      onChange={valor => actualizar(i, { [c.clave]: valor })}
                    />
                  ))}
                </div>
                {extraCampos?.length > 0 && (
                  <div className="rubro-image-grid">
                    {extraCampos.map(c => (
                      <CampoDato
                        key={c.clave}
                        label={c.label}
                        value={it[c.clave] || ''}
                        placeholder={c.placeholder}
                        onChange={valor => actualizar(i, { [c.clave]: valor })}
                      />
                    ))}
                  </div>
                )}
                {areaClave && (
                  <label className="rubro-field">
                    <span>{areaLabel}</span>
                    <textarea
                      rows={2}
                      value={it[areaClave] || ''}
                      placeholder={areaPlaceholder}
                      onChange={e => actualizar(i, { [areaClave]: e.target.value })}
                    />
                  </label>
                )}
              </div>
              <button type="button" className="btn-icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListaTextos({ label, ayuda, items, max, placeholder, onChange, textoAgregar }) {
  return (
    <div className="rubro-field-card">
      <div className="rubro-card-header">
        <div>
          <label>{label}</label>
          {ayuda && <p>{ayuda}</p>}
        </div>
        <button type="button" className="btn-secondary btn-small" disabled={items.length >= max} onClick={() => onChange([...items, ''])}>
          <Plus size={14} /> {items.length >= max ? `Máximo ${max}` : textoAgregar}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="field-hint">Sin ítems cargados, la página de producto no muestra esta caja.</p>
      ) : (
        <div className="rubro-list">
          {items.map((linea, i) => (
            <div key={i} className="rubro-row rubro-row--line">
              <CampoDato
                label={`Ítem ${i + 1}`}
                value={linea}
                placeholder={placeholder}
                onChange={valor => onChange(items.map((x, j) => (j === i ? valor : x)))}
              />
              <button type="button" className="btn-icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
