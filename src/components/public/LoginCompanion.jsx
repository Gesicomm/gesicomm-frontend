import { useEffect, useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './LoginCompanion.css';

const POSES = ['pensando', 'analizando', 'confirmando'];

const COPY = {
  login: { title: '¡Qué bueno verte de nuevo!', message: 'Tu negocio te espera.' },
  register: { title: '¡Empecemos!', message: 'Te acompaño a crear tu espacio de trabajo.' },
  forgot: { title: 'Lo resolvemos juntos', message: 'Recuperemos el acceso a tu espacio.' },
  verify: { title: 'Un último paso', message: 'Revisá tu correo. Ya casi estás adentro.' },
};

/** La mascota acompaña desde el panel de marca; nunca tapa ni enfoca el formulario. */
export default function LoginCompanion({ form, busy, error, success }) {
  const [poseIndex, setPoseIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pose = POSES[poseIndex % POSES.length];
  const copy = useMemo(() => COPY[form] || COPY.login, [form]);
  const state = error ? 'error' : busy ? 'busy' : success ? 'success' : 'guide';

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    setPoseIndex(0);
  }, [form]);

  useEffect(() => {
    if (paused || reduced || state !== 'guide') return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) setPoseIndex(index => (index + 1) % POSES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [paused, reduced, state]);

  const title = error ? 'Revisemos este dato' : busy ? 'Un momento…' : success ? '¡Listo!' : copy.title;
  const message = error
    ? 'Revisemos este dato para poder continuar.'
    : busy
      ? 'Estoy preparando el siguiente paso.'
      : success
        ? 'Tu solicitud quedó lista. Seguí las indicaciones para continuar.'
        : copy.message;
  const activePose = state === 'error' ? 'alerta' : state === 'busy' ? 'analizando' : state === 'success' ? 'confirmando' : pose;

  return (
    <aside className={`login-companion${paused ? ' is-paused' : ''}`} data-state={state} data-pose={activePose} aria-label="Tu guía Gesicom">
      <div className="login-companion-art" aria-hidden="true">
        <span className="login-companion-orbit login-companion-orbit--outer" />
        <span className="login-companion-orbit login-companion-orbit--inner" />
        <img className="login-companion-avatar" src="/brand/mascot/guia-transparente.png" alt="" width="248" height="320" draggable="false" />
        <span className="login-companion-spark login-companion-spark--one" />
        <span className="login-companion-spark login-companion-spark--two" />
      </div>
      <div className="login-companion-bubble" aria-live={state === 'guide' ? 'off' : 'polite'}>
        <div className="login-companion-top">
          <span><i /> Tu guía Gesicom</span>
          <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? 'Reanudar animación' : 'Pausar animación'}>
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>
        <div key={`${form}-${state}`} className="login-companion-words">
          <strong>{title}</strong>
          <p>{message}</p>
        </div>
      </div>
    </aside>
  );
}
