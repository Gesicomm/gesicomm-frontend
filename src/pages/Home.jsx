import { Link } from 'react-router-dom';
import { ArrowRight, LogIn } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-fg">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-base font-bold tracking-tight">
          GESICOMM<span className="text-primary">.</span>
        </span>
        <Link
          to="/login"
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-border-strong hover:bg-surface-2"
        >
          <LogIn size={16} />
          Entrar
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-5 inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wider text-fg-muted">
          Próximamente
        </span>
        <h1 className="m-0 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          El gestor definitivo para tu e-commerce
        </h1>
        <p className="mt-4 max-w-md text-base text-fg-muted">
          Productos, pedidos, combos y campañas en un solo panel. Estamos terminando de construirlo.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Ingresar al panel
          <ArrowRight size={16} />
        </Link>
      </main>
    </div>
  );
}
