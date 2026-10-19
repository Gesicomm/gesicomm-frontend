import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import RahaEnviosPanel from './RahaEnviosPanel';

export default function MisEnviosRaha() {
  return <div className="mx-auto w-full min-w-0 max-w-[1500px] p-4 text-fg sm:p-6 lg:p-8"><Link to="/mi-tienda/depositos" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft size={16} /> Mis depósitos</Link><p className="mb-3 mt-0 text-xs font-bold uppercase tracking-widest text-primary-text">Mi mercadería / Destino RAHA</p><RahaEnviosPanel /></div>;
}
