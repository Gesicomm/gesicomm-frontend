import React from 'react';
import HeroBlock from './blocks/HeroBlock';
import ProductGridBlock from './blocks/ProductGridBlock';
import ProductShowcaseBlock from './blocks/ProductShowcaseBlock';
import TestimonialsBlock from './blocks/TestimonialsBlock';
import FAQBlock from './blocks/FAQBlock';
import CategoryGridBlock from './blocks/CategoryGridBlock';

const COMPONENT_REGISTRY = {
  Hero: HeroBlock,
  ProductGrid: ProductGridBlock,
  ProductShowcase: ProductShowcaseBlock,
  CategoryGrid: CategoryGridBlock,
  Testimonials: TestimonialsBlock,
  FAQ: FAQBlock,
};

function SectionErrorBoundary({ children, sectionId }) {
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
    render() {
      if (this.state.hasError) {
        return (
          <div className='p-4 m-4 bg-red-900/50 border border-red-500 rounded text-red-200'>
            <p className='font-bold'>Error renderizando secci\u00f3n {sectionId}</p>
            <p className='text-sm'>{this.state.error.message}</p>
          </div>
        );
      }
      return this.props.children;
    }
  }
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

export default function DynamicLanding({ schema }) {
  if (!schema) return <div className="p-4 text-red-500">No hay schema</div>;
  if (!schema.sections) return <div className="p-4 text-red-500">El schema no tiene sections. Raw: {JSON.stringify(schema)}</div>;

  return (
    <div className='dynamic-landing' style={{ 
      '--color-primary': schema.theme?.palette?.primary || '#2563eb',
      '--color-surface': schema.theme?.palette?.surface || '#1e293b',
      '--color-background': schema.theme?.palette?.background || '#0f172a',
      '--color-text': schema.theme?.palette?.text || '#f8fafc',
      '--color-text-muted': schema.theme?.palette?.textMuted || '#94a3b8',
      background: 'var(--color-background)',
      color: 'var(--color-text)',
      fontFamily: schema.theme?.typography?.body || 'sans-serif'
    }}>
      {schema.sections.map((section) => {
        const Component = COMPONENT_REGISTRY[section.type];
        if (!Component) {
          console.warn('Componente no encontrado en el registry:', section.type);
          return null;
        }

        return (
          <SectionErrorBoundary key={section.id} sectionId={section.id}>
            <Component section={section} />
          </SectionErrorBoundary>
        );
      })}
    </div>
  );
}
