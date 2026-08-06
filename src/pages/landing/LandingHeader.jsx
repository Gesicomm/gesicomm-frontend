import React, { useState } from 'react';
import { Search, ShoppingCart, Menu, X } from 'lucide-react';

/**
 * Header sticky con blur — se agrega ARRIBA de todo lo que ya existía
 * (banner/filtros/grilla), no lo reemplaza. Los links de navegación son
 * anclas a secciones de esta misma página (no hay rutas separadas para
 * "Productos"/"Categorías": es una sola landing scrolleable), y solo se
 * listan las secciones que de verdad están presentes — no tiene sentido
 * un link a "Opiniones" en una tienda que todavía no cargó ninguna.
 *
 * Colores en sintaxis arbitraria de Tailwind apuntando a los --l-* que ya
 * calcula landingDiseno.js — nunca las clases semánticas institucionales
 * (bg-primary, text-fg, etc.), que son la marca propia de Gesicomm y
 * romperían el tema elegido por cada comercio.
 */
export default function LandingHeader({
  nombre,
  mostrarBuscador,
  mostrarCategorias,
  mostrarTestimonios,
  mostrarFaq,
  cantidadCarrito,
  onAbrirCarrito,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const enlaces = [
    mostrarCategorias && { href: '#lp-categorias', label: 'Categorías' },
    { href: '#lp-productos', label: 'Productos' },
    mostrarTestimonios && { href: '#lp-opiniones', label: 'Opiniones' },
    mostrarFaq && { href: '#lp-faq', label: 'Preguntas' },
    { href: '#lp-contacto', label: 'Contacto' },
  ].filter(Boolean);

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
          <button
            type="button"
            onClick={onAbrirCarrito}
            aria-label={`Ver carrito${cantidadCarrito ? `, ${cantidadCarrito} productos` : ''}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--l-text-muted)] transition-colors hover:bg-[var(--l-surface)] hover:text-[var(--l-text)]"
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
        </nav>
      )}
    </header>
  );
}
