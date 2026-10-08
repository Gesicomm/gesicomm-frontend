import React, { useState } from 'react';
import { Search, ShoppingCart, Menu, X } from 'lucide-react';

export default function LandingHeader({
  nombre,
  mostrarBuscador,
  seccionesActivas = [],
  cantidadCarrito,
  onAbrirCarrito,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Mapeo dinmico de secciones a enlaces
  const enlacesMap = {
    'categorias': { href: '#lp-categorias', label: 'Categoras' },
    'productos': { href: '#lp-productos', label: 'Productos' },
    'testimonios': { href: '#lp-opiniones', label: 'Opiniones' },
    'faq': { href: '#lp-faq', label: 'Preguntas' },
  };

  // Generar enlaces en base a las secciones activas (evita duplicados y mantiene un orden lgico base)
  const enlaces = [];
  const added = new Set();
  
  // Forzar orden estndar si estn presentes
  ['categorias', 'productos', 'testimonios', 'faq'].forEach(tipo => {
    if (seccionesActivas.includes(tipo) && enlacesMap[tipo]) {
      enlaces.push(enlacesMap[tipo]);
      added.add(tipo);
    }
  });

  // Contacto siempre al final si existe un footer o redes sociales, o simplemente forzarlo
  enlaces.push({ href: '#lp-contacto', label: 'Contacto' });

  function irA(href) {
    setMenuAbierto(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="truncate text-[1.05rem] font-extrabold tracking-tight text-[var(--l-text)]"
          style={{ letterSpacing: '-0.02em' }}
        >
          {nombre}
        </button>

        <nav className="hidden items-center gap-7 md:flex">
          {enlaces.map((e) => (
            <button
              key={e.href}
              type="button"
              onClick={() => irA(e.href)}
              className="text-sm font-semibold text-[var(--l-text-muted)] transition-colors hover:text-[var(--l-primary)]"
            >
              {e.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {mostrarBuscador && (
            <button
              type="button"
              onClick={irABuscar}
              aria-label="Buscar productos"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-[var(--l-text-muted)] transition-colors hover:bg-[var(--l-surface)] hover:text-[var(--l-text)] sm:flex"
            >
              <Search size={18} />
            </button>
          )}
          <button type="button" onClick={onAbrirCarrito} aria-label={`Ver carrito${cantidadCarrito ? `, ${cantidadCarrito} productos` : ''}`} className="flex h-9 items-center justify-center gap-2 rounded-full border px-3 text-[var(--l-text)] transition-all hover:bg-[var(--l-bg-muted)] hover:text-[var(--l-primary)]" style={{ borderColor: 'var(--l-card-border)' }}> <ShoppingCart size={16} /> <span className="text-xs font-bold">{cantidadCarrito || 0}</span> </button>
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--l-text-muted)] hover:bg-[var(--l-surface)] hover:text-[var(--l-text)] md:hidden"
          >
            {menuAbierto ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menuAbierto && (
        <nav
          className="flex flex-col gap-1 border-t px-[var(--l-gutter)] py-3 md:hidden"
          style={{ borderColor: 'var(--l-card-border)' }}
        >
          {enlaces.map((e) => (
            <button
              key={e.href}
              type="button"
              onClick={() => irA(e.href)}
              className="rounded-lg px-2 py-2.5 text-left text-sm font-semibold text-[var(--l-text)] transition-colors hover:bg-[var(--l-surface)]"
            >
              {e.label}
            </button>
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
          <button
            type="button"
            onClick={() => {
              setMenuAbierto(false);
              if (onAbrirCarrito) onAbrirCarrito();
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-semibold text-[var(--l-text)] transition-colors hover:bg-[var(--l-surface)]"
          >
            <ShoppingCart size={15} /> Carrito 
            {cantidadCarrito > 0 && <span className="ml-1 rounded-full bg-[var(--l-primary)] px-2 py-0.5 text-xs text-[var(--l-on-primary)]">{cantidadCarrito}</span>}
          </button>
        </nav>
      )}
    </header>
  );
}
