import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

// Default initial state matching the v1 schema
const DEFAULT_FOOTER_STATE = {
  schemaVersion: 1,
  type: 'footer',
  settings: {
    colorScheme: 'inherit',
    minHeight: {
      desktop: 300,
      tablet: 'auto',
      mobile: 'auto'
    },
    maxWidth: 1200
  },
  elements: [
    {
      id: 'brand-name-default',
      type: 'text',
      settings: { text: 'Mi Tienda' },
      layout: {
        desktop: { mode: 'free', x: 0.1, y: 0.2, width: 0.3 }
      }
    },
    {
      id: 'brand-desc-default',
      type: 'text',
      settings: { text: 'La mejor tienda de productos online.' },
      layout: {
        desktop: { mode: 'free', x: 0.1, y: 0.4, width: 0.4 }
      }
    },
    {
      id: 'social-default',
      type: 'social',
      settings: {},
      layout: {
        desktop: { mode: 'free', x: 0.1, y: 0.6, width: 0.2 }
      }
    }
  ]
};

// Actions
const SET_STATE = 'SET_STATE';
const UPDATE_SETTINGS = 'UPDATE_SETTINGS';
const UPDATE_ROOT = 'UPDATE_ROOT';
const ADD_ELEMENT = 'ADD_ELEMENT';
const UPDATE_ELEMENT = 'UPDATE_ELEMENT';
const DELETE_ELEMENT = 'DELETE_ELEMENT';
const REORDER_ELEMENTS = 'REORDER_ELEMENTS';
const DUPLICATE_ELEMENT = 'DUPLICATE_ELEMENT';

// Reducer for the actual data (which will be versioned for undo/redo)
function dataReducer(state, action) {
  switch (action.type) {
    case SET_STATE:
      return action.payload;

    case UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };

    // Campos sueltos a nivel raíz del footer (color_fondo/color_texto/
    // color_boton) — mismas claves que usa InspectorSeccion.jsx para el
    // resto de las secciones, así SectionRenderer.jsx las toma tal cual
    // para setear --l-bg/--l-text/--l-primary sin que el footer necesite
    // su propio mecanismo de theming.
    case UPDATE_ROOT:
      return { ...state, ...action.payload };

    case ADD_ELEMENT:
      return {
        ...state,
        elements: [...state.elements, action.payload]
      };

    case UPDATE_ELEMENT:
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.payload.id ? { ...el, ...action.payload.updates } : el
        )
      };

    case DELETE_ELEMENT:
      return {
        ...state,
        elements: state.elements.filter(el => el.id !== action.payload.id)
      };

    case REORDER_ELEMENTS:
      // Assuming payload has { sourceIndex, destinationIndex }
      const newElements = Array.from(state.elements);
      const [moved] = newElements.splice(action.payload.sourceIndex, 1);
      newElements.splice(action.payload.destinationIndex, 0, moved);
      return { ...state, elements: newElements };

    case DUPLICATE_ELEMENT:
      const elementToDup = state.elements.find(el => el.id === action.payload.id);
      if (!elementToDup) return state;
      const duplicate = {
        ...elementToDup,
        id: `${elementToDup.type}-${Date.now()}`,
        layout: {
          ...elementToDup.layout,
          desktop: {
            ...elementToDup.layout?.desktop,
            x: (elementToDup.layout?.desktop?.x || 0) + 0.02,
            y: (elementToDup.layout?.desktop?.y || 0) + 0.02,
          }
        }
      };
      return {
        ...state,
        elements: [...state.elements, duplicate]
      };

    default:
      return state;
  }
}

// Wrapper reducer to handle undo/redo stack
function historyReducer(state, action) {
  const { past, present, future, ephemeral } = state;

  switch (action.type) {
    case 'UNDO':
      if (past.length === 0) return state;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        ...state,
        past: newPast,
        present: previous,
        future: [present, ...future]
      };

    case 'REDO':
      if (future.length === 0) return state;
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        ...state,
        past: [...past, present],
        present: next,
        future: newFuture
      };

    // Actions that mutate ephemeral state (not tracked in undo/redo)
    case 'SET_SELECTED':
      return { ...state, ephemeral: { ...ephemeral, selectedId: action.payload } };
    case 'SET_BREAKPOINT':
      return { ...state, ephemeral: { ...ephemeral, activeBreakpoint: action.payload } };

    // All other actions modify the 'present' state and push to 'past'
    default:
      const newPresent = dataReducer(present, action);
      if (newPresent === present) return state; // No change

      return {
        ...state,
        past: [...past, present],
        present: newPresent,
        future: [] // Clear future on new action
      };
  }
}

const FooterContext = createContext(null);

// Completa un config parcial (o vacío) con la estructura por defecto. Lo
// usan tanto el editor como el render público: sin esto, un footer que
// nunca se abrió en el builder no tiene `elements` ni `schemaVersion`, y
// PublicFooterRenderer no dibujaba nada hasta que el usuario clickeaba la
// sección (recién ahí el provider montaba y persistía los defaults).
export function normalizeFooterData(initialData) {
  return {
    ...DEFAULT_FOOTER_STATE,
    ...initialData,
    settings: {
      ...DEFAULT_FOOTER_STATE.settings,
      ...(initialData?.settings || {})
    },
    elements: initialData?.elements || DEFAULT_FOOTER_STATE.elements
  };
}

/**
 * `active` indica si el footer es la sección que se está editando ahora.
 *
 * El provider se monta SIEMPRE (ver LandingEditor.jsx), incluso con
 * active=false: si se montara/desmontara según la sección seleccionada, el
 * árbol cambiaría de forma y React desmontaría todo el contenido del editor
 * —incluido el <iframe> de la preview—, con lo que la vista previa se
 * recargaba entera y volvía al scroll inicial cada vez que se clickeaba el
 * footer.
 *
 * Como contrapartida, con el provider siempre montado hay que:
 *  - cargar el config guardado recién cuando el footer pasa a editarse
 *    (al montar la página las secciones todavía no llegaron del backend), y
 *  - no propagar cambios con onChange mientras está inactivo, para no
 *    pisar la sección equivocada con el estado por defecto.
 */
export function FooterProvider({ initialData, children, onChange, active = true, sectionId = null }) {
  const [state, dispatch] = useReducer(historyReducer, undefined, () => ({
    past: [],
    present: normalizeFooterData(initialData),
    future: [],
    ephemeral: {
      selectedId: null,
      activeBreakpoint: 'desktop' // desktop, tablet, mobile
    }
  }));

  // Se recarga el estado desde el config guardado cada vez que se empieza a
  // editar un footer (una sola vez por sección: el ref evita repetirlo en
  // cada render y pisar lo que el usuario está editando).
  const cargadoRef = React.useRef(null);
  React.useEffect(() => {
    if (!active) {
      cargadoRef.current = null;
      return;
    }
    if (cargadoRef.current === sectionId) return;
    cargadoRef.current = sectionId;
    dispatch({ type: SET_STATE, payload: normalizeFooterData(initialData) });
    dispatch({ type: 'SET_SELECTED', payload: null });
  }, [active, sectionId, initialData]);

  // Expose actions
  const actions = useMemo(() => ({
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    setSelectedId: (id) => dispatch({ type: 'SET_SELECTED', payload: id }),
    setBreakpoint: (bp) => dispatch({ type: 'SET_BREAKPOINT', payload: bp }),

    updateSettings: (settings) => dispatch({ type: UPDATE_SETTINGS, payload: settings }),
    updateRoot: (fields) => dispatch({ type: UPDATE_ROOT, payload: fields }),
    addElement: (element) => {
      dispatch({ type: ADD_ELEMENT, payload: element });
      dispatch({ type: 'SET_SELECTED', payload: element.id });
    },
    updateElement: (id, updates) => dispatch({ type: UPDATE_ELEMENT, payload: { id, updates } }),
    deleteElement: (id) => {
      dispatch({ type: DELETE_ELEMENT, payload: { id } });
      if (state.ephemeral.selectedId === id) {
        dispatch({ type: 'SET_SELECTED', payload: null });
      }
    },
    duplicateElement: (id) => dispatch({ type: DUPLICATE_ELEMENT, payload: { id } }),
    reorderElements: (sourceIndex, destinationIndex) => dispatch({ type: REORDER_ELEMENTS, payload: { sourceIndex, destinationIndex } })
  }), [state.ephemeral.selectedId]);

  // Sync back to parent when present state changes. `onChange` viene de un
  // arrow function inline en LandingEditor.jsx (nueva identidad en cada
  // render de ese componente) y llamarlo dispara justamente ese re-render
  // — si estuviera en las deps del efecto, cada re-render generaría un
  // onChange nuevo, que dispararía el efecto de nuevo, que llamaría a
  // onChange de nuevo... loop infinito ("Maximum update depth exceeded").
  // Guardamos la versión más reciente en un ref y solo re-disparamos el
  // efecto cuando el dato real (state.present) cambia.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });
  React.useEffect(() => {
    // Inactivo = el footer no se está editando: no se propaga nada, porque
    // el destino (la sección seleccionada) es otra sección.
    if (!active) return;
    onChangeRef.current?.(state.present);
  }, [state.present, active]);

  const value = {
    data: state.present,
    selectedId: state.ephemeral.selectedId,
    activeBreakpoint: state.ephemeral.activeBreakpoint,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    active,
    actions
  };

  return (
    <FooterContext.Provider value={value}>
      {children}
    </FooterContext.Provider>
  );
}

export function useFooterBuilder() {
  const context = useContext(FooterContext);
  if (!context) {
    throw new Error('useFooterBuilder must be used within a FooterProvider');
  }
  return context;
}

// Variante que no explota fuera de un FooterProvider — la usa FooterAdapter
// (legacyBlocks.jsx) para saber, sin acoplarse a ningún flag extra, si el
// footer se está mostrando dentro del editor con esta sección seleccionada
// (ahí sí hay un FooterProvider ancestro) o en el sitio público / con otra
// sección seleccionada (no lo hay, y debe verse el render estático).
export function useFooterBuilderOptional() {
  return useContext(FooterContext);
}
