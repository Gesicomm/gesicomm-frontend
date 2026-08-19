import React, { useState } from 'react';
import { useRenderContext } from '../../core/RenderContext';
import { Search, ShoppingCart, Menu, X, Link as LinkIcon } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';

const TikTokIcon = ({ size = 24, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const Facebook = ({ size = 24, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const Instagram = ({ size = 24, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export const HeaderBlock = ({ content, settings }) => {
  const { page, data, actions } = useRenderContext();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Configuración del Header
  const navLinks = settings.nav_links || []; // Formato: [{ label, type, href, target_id }]
  const logoImagen = settings.logo_imagen;
  const logoTexto = content.logo_texto || page.titulo;
  const mostrarBuscador = !!page.filtros?.buscador;
  const cantidadCarrito = data.cantidadCarrito || 0;
  const redes = settings.redes_sociales || {};

  // Si no hay navLinks configurados, creamos enlaces automáticos basados en las secciones
  let enlaces = navLinks;
  if (enlaces.length === 0) {
    const defaultNav = [
      { id: 'categorias', type: 'seccion', label: 'Categorías' },
      { id: 'productos', type: 'seccion', label: 'Productos' },
      { id: 'testimonios', type: 'seccion', label: 'Opiniones' },
      { id: 'faq', type: 'seccion', label: 'Preguntas' },
    ];
    // page.secciones contiene las secciones que vienen de la BBDD
    const seccionesActivas = page.secciones?.map(s => s.tipo) || [];
    defaultNav.forEach(item => {
      if (seccionesActivas.includes(item.id)) {
        enlaces.push({ label: item.label, type: 'url', href: `#lp-${item.id === 'testimonios' ? 'opiniones' : item.id}` });
      }
    });
    // Forzamos contacto
    enlaces.push({ label: 'Contacto', type: 'url', href: '#lp-contacto' });
  }

  function irA(e, link) {
    e.preventDefault();
    setMenuAbierto(false);
    
    // Si la URL es externa o otra página
    if (link.type === 'url' && link.href) {
      if (link.href.startsWith('#')) {
        // ancla suave
        document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // link externo
        if (link.target === '_blank') window.open(link.href, '_blank');
        else window.location.href = link.href;
      }
    } else if (link.type === 'producto' && actions.navigate) {
      actions.navigate(page.slug ? `/l/${page.slug}/${link.target_id}` : `/${link.target_id}`);
    } else if (link.type === 'categoria' && actions.setFiltroCategoria) {
      actions.setFiltroCategoria(link.target_id);
      document.querySelector('#lp-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (link.type === 'pagina' && actions.navigate) {
      const destino = page.paginas_hermanas?.find(p => p.tipo_pagina === link.target_id);
      if (destino) actions.navigate(destino.slug ? `/l/${destino.slug}` : '/');
    }
  }

  function irABuscar() {
    setMenuAbierto(false);
    document.querySelector('#lp-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.getElementById('lp-buscador-input')?.focus(), 350);
  }

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl transition-colors"
      style={{
        background: 'color-mix(in srgb, var(--l-bg) 72%, transparent)',
        borderColor: 'var(--l-card-border)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-[var(--l-max)] items-center justify-between gap-4 px-[var(--l-gutter)]">
        <button
          type="button"
          onClick={() => {
            if (actions.navigate) actions.navigate(page.slug ? `/l/${page.slug}` : '/');
            else window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 truncate"
        >
          {logoImagen ? (
            <img src={getMediaUrl(logoImagen)} alt={logoTexto} className="h-10 w-auto object-contain" />
          ) : (
            <span className="text-[1.05rem] font-extrabold tracking-tight text-[var(--l-text)]" style={{ letterSpacing: '-0.02em' }}>
              {logoTexto}
            </span>
          )}
        </button>

        <nav className="hidden items-center gap-7 md:flex">
          {enlaces.map((link, idx) => (
            <a
              key={idx}
              href={link.href || '#'}
              onClick={(e) => irA(e, link)}
              className="text-sm font-semibold text-[var(--l-text)] opacity-80 transition-all hover:opacity-100 hover:text-[var(--l-primary)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* Redes Sociales en Header */}
          <div className="hidden items-center gap-2 md:flex border-r pr-4 border-[var(--l-card-border)]">
             {redes.instagram && (
               <a href={redes.instagram} target="_blank" rel="noreferrer" className="text-[var(--l-text)] opacity-70 hover:opacity-100 hover:text-[var(--l-primary)] transition-all">
                 <Instagram size={18} />
               </a>
             )}
             {redes.facebook && (
               <a href={redes.facebook} target="_blank" rel="noreferrer" className="text-[var(--l-text)] opacity-70 hover:opacity-100 hover:text-[var(--l-primary)] transition-all">
                 <Facebook size={18} />
               </a>
             )}
             {redes.tiktok && (
               <a href={redes.tiktok} target="_blank" rel="noreferrer" className="text-[var(--l-text)] opacity-70 hover:opacity-100 hover:text-[var(--l-primary)] transition-all">
                 <TikTokIcon size={18} />
               </a>
             )}
          </div>

          <div className="flex items-center gap-2">
            {mostrarBuscador && (
              <button
                type="button"
                onClick={irABuscar}
                aria-label="Buscar productos"
                className="hidden h-10 w-10 items-center justify-center rounded-full text-[var(--l-text)] opacity-80 transition-all hover:bg-[var(--l-bg-muted)] hover:opacity-100 hover:text-[var(--l-primary)] sm:flex"
              >
                <Search size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={actions.abrirCarrito}
              aria-label={`Ver carrito`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--l-text)] opacity-80 transition-all hover:bg-[var(--l-bg-muted)] hover:opacity-100 hover:text-[var(--l-primary)]"
            >
              <ShoppingCart size={18} />
              {cantidadCarrito > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.62rem] font-bold text-[var(--l-on-primary)]"
                  style={{ background: 'var(--l-primary)' }}
                >
                  {cantidadCarrito}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--l-text-muted)] hover:bg-[var(--l-surface)] hover:text-[var(--l-text)] md:hidden"
            >
              {menuAbierto ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {menuAbierto && (
        <nav
          className="flex flex-col gap-1 border-t px-[var(--l-gutter)] py-3 md:hidden"
          style={{ borderColor: 'var(--l-card-border)' }}
        >
          {enlaces.map((link, idx) => (
            <a
              key={idx}
              href={link.href || '#'}
              onClick={(e) => irA(e, link)}
              className="rounded-lg px-2 py-2.5 text-left text-sm font-semibold text-[var(--l-text)] transition-colors hover:bg-[var(--l-surface)]"
            >
              {link.label}
            </a>
          ))}
          {mostrarBuscador && (
            <button
              type="button"
              onClick={irABuscar}
              className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-semibold text-[var(--l-text)] transition-colors hover:bg-[var(--l-surface)]"
            >
              <Search size={15} /> Buscar
            </button>
          )}
          
          <div className="mt-4 flex gap-4 px-2 pt-4 border-t border-[var(--l-card-border)]">
             {redes.instagram && <a href={redes.instagram} target="_blank" rel="noreferrer" className="text-[var(--l-text-muted)]"><Instagram size={20} /></a>}
             {redes.facebook && <a href={redes.facebook} target="_blank" rel="noreferrer" className="text-[var(--l-text-muted)]"><Facebook size={20} /></a>}
             {redes.tiktok && <a href={redes.tiktok} target="_blank" rel="noreferrer" className="text-[var(--l-text-muted)]"><TikTokIcon size={20} /></a>}
          </div>
        </nav>
      )}
    </header>
  );
};
