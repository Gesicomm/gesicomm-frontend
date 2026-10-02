import FitnessTemplate from './FitnessTemplate';
import BeautyTemplate from './BeautyTemplate';
import TechTemplate from './TechTemplate';
import BasicTemplate from './BasicTemplate';
import BazarTemplate from './BazarTemplate';
import ModaTemplate from './ModaTemplate';

// slug ↔ componente fijo — templates rígidos que existen (ver
// scripts/migrate-landing-simple-rigida.js en el backend, que siembra
// estos mismos slugs). Agregar un template nuevo acá es la única forma de
// "crear una plantilla nueva" en esta v1 — no hay Template Builder, es
// código.
export const TEMPLATES_RIGIDOS = {
  'fitness-suplementos': FitnessTemplate,
  'beauty-skincare': BeautyTemplate,
  'tech-electronica': TechTemplate,
  'basico': BasicTemplate,
  'bazar-hogar': BazarTemplate,
  'moda-indumentaria': ModaTemplate,
};

export function getComponenteTemplate(slug) {
  return TEMPLATES_RIGIDOS[slug] || null;
}
