import React from 'react';
import DynamicLanding from '../../components/page-builder/DynamicRenderer';

const testSchema = {
  schema_version: '2.0',
  page_type: 'landing',
  theme: {
    palette: {
      primary: '#0F172A',
      secondary: '#334155',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#0F172A',
      textMuted: '#64748B',
      success: '#10B981'
    },
    typography: { heading: 'Inter', body: 'Inter' },
  },
  sections: [
    {
      id: 'hero-main',
      type: 'Hero',
      content: {
        eyebrow: 'EDICION EXCLUSIVA',
        title: 'Termo Stanley Clasico',
        description: 'El termo que ha acompaniado a generaciones. Calidad legendaria y rendimiento inigualable.'
      },
      layout: { variant: 'center', alignment: 'center' },
      style: { background: 'primary', textColor: 'background' }
    },
    {
      id: 'product-showcase',
      type: 'ProductShowcase',
      content: { title: 'Detalles del Producto' },
      layout: { alignment: 'left', show_description: true },
      product_id: 310,
      style: { background: 'surface', textColor: 'text' }
    },
    {
      id: 'faq',
      type: 'FAQ',
      content: {
        title: 'Preguntas Frecuentes',
        items: [
          { q: 'Cuanto tiempo mantiene la temperatura?', a: 'Hasta 24 horas.' },
          { q: 'Tiene garantia?', a: 'Si, garantia de por vida.' }
        ]
      },
      layout: { variant: 'grid' },
      style: { background: 'background', textColor: 'text' }
    }
  ]
};

export default function TestRenderer() {
  return (
    <div>
      <div className='bg-red-500 text-white p-2 text-center text-sm font-bold'>
        MODO PREVIEW - AI LANDING ENGINE V2
      </div>
      <DynamicLanding schema={testSchema} />
    </div>
  );
}
