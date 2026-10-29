import { useEffect, useState } from 'react';
import { Check, Pause, Play } from 'lucide-react';
import './GesicomMascot.css';

const POSES = ['pensando', 'analizando', 'confirmando', 'alerta'];
const DEMO = [
  { label: 'Anotá', pose: 'pensando', title: 'Toda gran idea empieza con un trazo.', note: 'Mi próxima gran idea', detail: 'Un lugar para empezar a darle forma a tu negocio.' },
  { label: 'Organizá', pose: 'analizando', title: 'Cada cosa en su lugar.', note: 'Productos, pedidos y clientes', detail: 'Conectá lo que vendés con todo lo que pasa después.' },
  { label: 'Avanzá', pose: 'confirmando', title: 'Un paso más cerca de lo que querés.', note: 'Tu negocio, en marcha', detail: 'Más claridad para decidir. Más espacio para crecer.' },
];

/** Only receives presentation state, never credentials or field values. */
export default function GesicomMascot({ variant = 'landing', pose = 'pensando', message, note = 'Tu próximo capítulo empieza acá', autoCycle = variant === 'landing' }) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!autoCycle || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setStep(previous => (previous + 1) % DEMO.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [autoCycle, paused, reducedMotion]);

  const demo = variant === 'landing';
  const current = DEMO[step];
  const activePose = demo ? current.pose : autoCycle && !reducedMotion ? DEMO[(step + Math.max(0, DEMO.findIndex(item => item.pose === pose))) % DEMO.length].pose : pose;
  const activeMessage = demo ? current.title : message;

  return (
    <div className={`gc-mascot gc-mascot--${variant}${paused ? ' gc-mascot--paused' : ''}`} data-pose={activePose}>
      <div className="gc-mascot-toolbar">
        <span><span className="gc-mascot-dot" /> Tu compañero Gesicom</span>
        <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Activar animación de la mascota' : 'Pausar animación de la mascota'} aria-pressed={paused}>
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
      <div className="gc-mascot-scene">
        <div className="gc-mascot-orbit" aria-hidden="true" />
        <div className="gc-mascot-character">
          {POSES.map((name, index) => <img key={name} src={`/brand/mascot/${name}.png`} width={name === 'pensando' ? 475 : name === 'confirmando' ? 491 : 510} height={name === 'alerta' ? 519 : 505} alt={name === activePose ? 'La mascota de Gesicom, un bolígrafo con ojos verdes' : ''} aria-hidden={name !== activePose} className={name === activePose ? 'is-active' : ''} decoding="async" fetchpriority={index === 0 ? 'high' : 'auto'} draggable="false" />)}
        </div>
        <div className="gc-mascot-paper" key={`${activePose}-${note}`}>
          <span className="gc-mascot-paper-label">{demo ? 'Una idea. Un plan. Un nuevo paso.' : 'Vamos paso a paso'}</span>
          <strong>{demo ? current.note : note}</strong>
          <svg className="gc-mascot-ink" viewBox="0 0 260 28" fill="none" aria-hidden="true"><path pathLength="1" d="M4 18 C45 4 112 5 150 12 S210 19 252 9 M12 25 Q100 12 185 23" /></svg>
          <span className="gc-mascot-paper-check"><Check size={15} /> {activePose === 'confirmando' ? '¡Vamos con todo!' : activePose === 'alerta' ? 'Lo resolvemos juntos' : 'Dale forma a lo que viene'}</span>
        </div>
      </div>
      <div className="gc-mascot-caption" aria-live={demo ? 'off' : 'polite'} aria-atomic="true">
        <p>{activeMessage}</p>
        {demo && <span>{current.detail}</span>}
      </div>
      {demo && <ol className="gc-mascot-steps" aria-label="Recorrido automático de la mascota">
        {DEMO.map((item, index) => <li key={item.label} aria-current={step === index ? 'step' : undefined}><span>0{index + 1}</span>{item.label}</li>)}
      </ol>}
    </div>
  );
}
