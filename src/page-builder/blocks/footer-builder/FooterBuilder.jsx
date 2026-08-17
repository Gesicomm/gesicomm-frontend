import React, { useState } from 'react';
import { FooterProvider, useFooterBuilder } from './FooterContext';
import FooterCanvas from './FooterCanvas';
import FooterInspector from './FooterInspector';
import FooterLayers from './FooterLayers';
import { Undo, Redo, LayoutTemplate, Layers, MousePointer2 } from 'lucide-react';
import './FooterBuilder.css';

function FooterBuilderUI() {
  const { canUndo, canRedo, actions, activeBreakpoint } = useFooterBuilder();
  const [activeTab, setActiveTab] = useState('inspector'); // inspector, layers, templates

  return (
    <div className="footer-builder-layout">
      {/* Topbar / Toolbar */}
      <div className="footer-builder-topbar">
        <div className="footer-builder-brand">
          <MousePointer2 size={16} />
          <span>Footer Visual Builder</span>
        </div>
        
        <div className="footer-builder-responsive">
          <button 
            className={activeBreakpoint === 'desktop' ? 'active' : ''} 
            onClick={() => actions.setBreakpoint('desktop')}
          >
            Desktop
          </button>
          <button 
            className={activeBreakpoint === 'tablet' ? 'active' : ''} 
            onClick={() => actions.setBreakpoint('tablet')}
          >
            Tablet
          </button>
          <button 
            className={activeBreakpoint === 'mobile' ? 'active' : ''} 
            onClick={() => actions.setBreakpoint('mobile')}
          >
            Mobile
          </button>
        </div>

        <div className="footer-builder-actions">
          <button disabled={!canUndo} onClick={actions.undo} title="Deshacer (Ctrl+Z)">
            <Undo size={16} />
          </button>
          <button disabled={!canRedo} onClick={actions.redo} title="Rehacer (Ctrl+Shift+Z)">
            <Redo size={16} />
          </button>
        </div>
      </div>

      <div className="footer-builder-main">
        {/* Workspace Canvas */}
        <div className="footer-builder-workspace">
          <FooterCanvas />
        </div>

        {/* Right Sidebar */}
        <div className="footer-builder-sidebar">
          <div className="footer-builder-tabs">
            <button 
              className={activeTab === 'inspector' ? 'active' : ''} 
              onClick={() => setActiveTab('inspector')}
            >
              Propiedades
            </button>
            <button 
              className={activeTab === 'layers' ? 'active' : ''} 
              onClick={() => setActiveTab('layers')}
            >
              <Layers size={14} />
              Capas
            </button>
            <button 
              className={activeTab === 'templates' ? 'active' : ''} 
              onClick={() => setActiveTab('templates')}
            >
              <LayoutTemplate size={14} />
              Plantillas
            </button>
          </div>

          <div className="footer-builder-panel">
            {activeTab === 'inspector' && <FooterInspector />}
            {activeTab === 'layers' && <FooterLayers />}
            {activeTab === 'templates' && <div>Templates list...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FooterBuilder({ initialData, onChange }) {
  return (
    <FooterProvider initialData={initialData} onChange={onChange}>
      <FooterBuilderUI />
    </FooterProvider>
  );
}
