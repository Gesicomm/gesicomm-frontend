import { Moon, Sun } from 'lucide-react';
import { useTema } from './ThemeProvider';

export default function ThemeToggle({ className = '' }) {
  const { tema, alternarTema } = useTema();
  const esOscuro = tema === 'dark';

  return (
    <button
      type="button"
      onClick={alternarTema}
      className={`flex h-9 w-9 items-center justify-center rounded-md border border-border text-fg-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-fg ${className}`}
      aria-label={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={esOscuro ? 'Tema claro' : 'Tema oscuro'}
    >
      {esOscuro ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}
