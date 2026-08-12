import React, { createContext, useContext } from 'react';

/**
 * Contexto de Renderizado (Data Binding & Design System)
 * @typedef {Object} ThemeTokens
 * @property {string} mode - 'oscuro' | 'claro'
 * @property {string} primaryColor
 * @property {string} backgroundColor
 * @property {string} textColor
 * @property {string} cardColor
 * @property {string} borderRadius
 * @property {string} fontFamily
 * 
 * @typedef {Object} RenderContextValue
 * @property {ThemeTokens} theme - Design tokens
 * @property {Object} data - Modelo de datos inyectado (ej: producto, coleccion)
 * @property {Object} page - Datos de la página (ej: landing meta)
 * @property {string} device - 'desktop' | 'tablet' | 'mobile'
 * @property {boolean} isEditor - Si se está renderizando dentro del builder
 */

const RenderContext = createContext(null);

export const RenderProvider = ({ context, children }) => {
  // Aseguramos que el contexto provisto respete la estructura base (theme, data, page)
  const normalizedContext = {
    theme: context.theme || {},
    data: context.data || {},
    page: context.page || {},
    device: context.device || 'desktop',
    isEditor: !!context.isEditor,
    ...context // para compatibilidad con código legacy que acceda directamente
  };

  return (
    <RenderContext.Provider value={normalizedContext}>
      {children}
    </RenderContext.Provider>
  );
};

export const useRenderContext = () => {
  const ctx = useContext(RenderContext);
  if (!ctx) throw new Error('useRenderContext must be used within RenderProvider');
  return ctx;
};
