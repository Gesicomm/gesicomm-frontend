import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import HorarioPicker from '../../src/pages/tienda/HorarioPicker';

function Fixture() {
  const [value, setValue] = useState('');
  return <HorarioPicker value={value} onChange={setValue} />;
}

export function mount(container) {
  createRoot(container).render(<Fixture />);
}
